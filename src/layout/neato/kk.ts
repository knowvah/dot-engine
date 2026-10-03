// SPDX-License-Identifier: EPL-2.0
/**
 * Kamada-Kawai layout (`mode=KK`): the gradient-descent solver of
 * `kkNeato` and the `stuff.c` code it drives — `scan_graph_mode` (KK
 * branch), `initial_positions`, `diffeq_model`, `solve_model`,
 * `choose_node`, `move_node`, `update_arrays`, `D2E` and `solve`.
 *
 * C's `GD_dist`/`GD_spring`/`GD_sum_t`/`GD_t` (arrays of row pointers) are flat
 * typed arrays here; the file-statics (`Epsilon`, `Damping`, `MaxIter`,
 * `Initial_dist`) are fields of one {@link KkState} per run.
 *
 * Not ported: `Verbose` output (`total_e`, timers), `test_toggle` tracing,
 * and `Reduce` (`-x`, a command-line flag this library has no counterpart for).
 *
 * @see lib/neatogen/neatoinit.c:kkNeato
 * @see lib/neatogen/stuff.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { buildOutEdgeIndex } from '../../model/node.js';
import { drand48 } from '../../common/random.js';
import { lateDouble } from '../../common/nodeinit.js';
import { checkStart, INIT_RANDOM, INIT_REGULAR } from './start.js';
import { MODEL_MDS } from './init.js';
import { solve } from './kk-solve.js';
import { lenattr } from './edge-len.js';
import { newPathState, shortestPath, mdsModel, type Neighbour } from './kk-paths.js';

/** `Ndim`: layout dimension (this port lays out in 2-D only). */
const NDIM = 2;
/** `Damping` when the root has no `Damping` attribute. @see stuff.c:scan_graph_mode */
const DEFAULT_DAMPING = 0.99;
/** `Epsilon` is this times nV unless `epsilon` is set. @see stuff.c:scan_graph_mode */
const EPSILON_PER_NODE = 0.0001;
/** `MaxIter` is this times nV unless `maxiter` is set. @see neatoinit.c:neatoLayout */
const ITERATIONS_PER_NODE = 100;
/** @see lib/common/const.h:Spring_coeff */
const SPRING_COEFF = 1.0;

/** Per-run solver state. @see lib/neatogen/stuff.c (GD_*, Epsilon2, Damping) */
export interface KkState {
  readonly n: number;
  readonly nodes: readonly Node[];
  /** `GD_dist`, n*n. */
  readonly dist: Float64Array;
  /** `GD_spring`, n*n. */
  readonly spring: Float64Array;
  /** `GD_sum_t`, n*NDIM. */
  readonly sumT: Float64Array;
  /** `GD_t`, n*n*NDIM. */
  readonly t: Float64Array;
  readonly damping: number;
  readonly epsilon: number;
  readonly maxIter: number;
  /** `GD_move`. */
  move: number;
}

/** C `atoi` on an attribute value (0 when it has no leading integer). */
function atoi(s: string): number {
  const v = parseInt(s, 10);
  return Number.isNaN(v) ? 0 : v;
}

/**
 * Set `ED_dist` for every out-edge of every node; returns the total length.
 * @see lib/neatogen/stuff.c:setEdgeLen
 */
function setEdgeLens(g: Graph, nodes: readonly Node[]): { total: number; lens: Map<Edge, number> } {
  const out = buildOutEdgeIndex(g);
  const lens = new Map<Edge, number>();
  let total = 0;
  for (const np of nodes) {
    for (const ep of out.get(np) ?? []) {
      const len = lenattr(ep, g);
      lens.set(ep, len);
      total += len;
    }
  }
  return { total, lens };
}

/** `agget(G, "defaultdist")` or the mean edge length scaled by sqrt(nV). */
function initialDist(g: Graph, total: number, epsilon: number): number {
  const str = g.attrs.get('defaultdist');
  if (str !== undefined && str !== '') return Math.max(epsilon, parseFloat(str) || 0);
  const nE = g.edges.length;
  return (total / (nE > 0 ? nE : 1)) * Math.sqrt(g.nodes.size) + 1;
}

/** `getdouble(G, "epsilon", &Epsilon)`. @see lib/common/utils.c:getdouble */
function epsilonOf(g: Graph, nV: number): number {
  const v = parseFloat(g.attrs.get('epsilon') ?? '');
  return Number.isNaN(v) ? EPSILON_PER_NODE * nV : v;
}

/** `agfstedge` neighbours of every node: out-edges then in-edges, loops skipped. */
function neighbours(g: Graph, nodes: readonly Node[], lens: Map<Edge, number>): Neighbour[][] {
  const out = buildOutEdgeIndex(g);
  const inn = new Map<Node, Edge[]>();
  for (const e of g.edges) {
    if (e.head === e.tail) continue;
    const l = inn.get(e.head);
    if (l === undefined) inn.set(e.head, [e]);
    else l.push(e);
  }
  return nodes.map((np) => {
    const ins = (inn.get(np) ?? []).sort((a, b) => (a.tail.id - b.tail.id) || (a.seq - b.seq));
    const outs = (out.get(np) ?? []).filter((e) => e.head !== e.tail);
    return [...outs, ...ins].map((e) => ({
      id: (e.tail === np ? e.head : e.tail).info.id!,
      len: lens.get(e)!,
    }));
  });
}

/** Seed the matrices and return the state. @see lib/neatogen/stuff.c:scan_graph_mode */
function scanGraphMode(g: Graph, maxIter: number): { st: KkState; adj: Neighbour[][]; ini: number; lens: Map<Edge, number> } {
  const nodes = [...g.nodes.values()];
  const n = nodes.length;
  nodes.forEach((np, i) => { np.info.id = i; np.info.heapindex = -1; });
  const epsilon = epsilonOf(g, n);
  const damp = g.root.attrs.get('Damping');
  const { total, lens } = setEdgeLens(g, nodes);
  const ini = initialDist(g, total, epsilon);
  const st: KkState = {
    n, nodes, dist: new Float64Array(n * n).fill(ini), spring: new Float64Array(n * n).fill(1),
    sumT: new Float64Array(n * NDIM).fill(1), t: new Float64Array(n * n * NDIM),
    damping: damp === undefined ? DEFAULT_DAMPING : parseFloat(damp) || 0,
    epsilon, maxIter, move: 0,
  };
  return { st, adj: neighbours(g, nodes, lens), ini, lens };
}

/** @see lib/neatogen/stuff.c:randompos (called with nG = 1 by initial_positions) */
function randompos(np: Node): void {
  np.info.pos![0] = drand48();
  np.info.pos![1] = drand48();
}

/** @see lib/neatogen/stuff.c:initial_positions */
function initialPositions(g: Graph, st: KkState): void {
  const init = checkStart(g, st.n, INIT_RANDOM);
  if (init === INIT_REGULAR) return;
  // C: start=self warns once per process; start.ts:checkStartAttr already did.
  for (const np of st.nodes) {
    if (np.info.posSet === true || np.info.pinned === true) continue;
    randompos(np);
  }
}

/** `distvec`: returns |p0-p1| and leaves p0-p1 in `del`. @see stuff.c:distvec */
function distvec(p0: number[], p1: number[], del: Float64Array): number {
  let dist = 0.0;
  for (let k = 0; k < NDIM; k++) {
    del[k] = p0[k]! - p1[k]!;
    dist += del[k]! * del[k]!;
  }
  return Math.sqrt(dist);
}

/** `ED_factor` of the first edge `agfindedge(G, a, b)` finds, else 1. */
function springFactors(g: Graph): (a: Node, b: Node) => number | undefined {
  const byEnds = new Map<string, number>();
  const undirected = g.kind.endsWith('undirected');
  for (const e of g.edges) {
    const key = `${e.tail.info.id}:${e.head.info.id}`;
    if (!byEnds.has(key)) {
      byEnds.set(key, e.info.factor ?? lateDouble(e.attrs.get('weight'), 1.0, 1.0));
    }
  }
  return (a, b) => byEnds.get(`${a.info.id}:${b.info.id}`)
    ?? (undirected ? byEnds.get(`${b.info.id}:${a.info.id}`) : undefined);
}

/** Row `i` of `GD_t`/`GD_sum_t` for node `i`. @see lib/neatogen/stuff.c:diffeq_model */
function fillRow(st: KkState, i: number, del: Float64Array): void {
  const vi = st.nodes[i]!;
  for (let j = 0; j < st.n; j++) {
    if (i === j) continue;
    const dist = distvec(vi.info.pos!, st.nodes[j]!.info.pos!, del);
    for (let k = 0; k < NDIM; k++) {
      const v = st.spring[i * st.n + j]! * (del[k]! - (st.dist[i * st.n + j]! * del[k]!) / dist);
      st.t[(i * st.n + j) * NDIM + k] = v;
      st.sumT[i * NDIM + k]! += v;
    }
  }
}

/** @see lib/neatogen/stuff.c:diffeq_model */
function diffeqModel(g: Graph, st: KkState): void {
  const { n } = st;
  const factor = springFactors(g);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      let f = SPRING_COEFF / (st.dist[i * n + j]! * st.dist[i * n + j]!);
      const w = factor(st.nodes[i]!, st.nodes[j]!);
      if (w !== undefined) f *= w;
      st.spring[i * n + j] = f;
      st.spring[j * n + i] = f;
    }
  }
  st.sumT.fill(0);
  const del = new Float64Array(NDIM);
  for (let i = 0; i < n; i++) fillRow(st, i, del);
}

/** Recompute node `i`'s row and the mirrored column. @see stuff.c:update_arrays */
function updateArrays(st: KkState, i: number): void {
  const { n } = st;
  const del = new Float64Array(NDIM);
  const vi = st.nodes[i]!;
  for (let k = 0; k < NDIM; k++) st.sumT[i * NDIM + k] = 0.0;
  for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const dist = distvec(vi.info.pos!, st.nodes[j]!.info.pos!, del);
    for (let k = 0; k < NDIM; k++) {
      const tij = st.spring[i * n + j]! * (del[k]! - (st.dist[i * n + j]! * del[k]!) / dist);
      st.t[(i * n + j) * NDIM + k] = tij;
      st.sumT[i * NDIM + k]! += tij;
      const old = st.t[(j * n + i) * NDIM + k]!;
      st.t[(j * n + i) * NDIM + k] = -tij;
      st.sumT[j * NDIM + k]! += -tij - old;
    }
  }
}

/** Hessian of node `m`'s energy into `M` (NDIM x NDIM). @see stuff.c:D2E */
function d2e(st: KkState, m: number, M: Float64Array): void {
  const { n } = st;
  const vn = st.nodes[m]!;
  const t = new Float64Array(NDIM);
  M.fill(0);
  for (let i = 0; i < n; i++) {
    if (m === i) continue;
    const vi = st.nodes[i]!;
    let sq = 0.0;
    for (let k = 0; k < NDIM; k++) {
      t[k] = vn.info.pos![k]! - vi.info.pos![k]!;
      sq += t[k]! * t[k]!;
    }
    const scale = 1 / Math.pow(sq, 1.5);
    const K = st.spring[m * n + i]!;
    const D = st.dist[m * n + i]!;
    for (let k = 0; k < NDIM; k++) {
      for (let l = 0; l < k; l++) M[l * NDIM + k]! += K * D * t[k]! * t[l]! * scale;
      M[k * NDIM + k]! += K * (1.0 - D * (sq - t[k]! * t[k]!) * scale);
    }
  }
  for (let k = 1; k < NDIM; k++) {
    for (let l = 0; l < k; l++) M[k * NDIM + l] = M[l * NDIM + k]!;
  }
}

/** Index of the unpinned node with the largest gradient, or -1. @see stuff.c:choose_node */
function chooseNode(st: KkState): number {
  if (st.move >= st.maxIter) return -1;
  let max = 0.0;
  let choice = -1;
  for (let i = 0; i < st.n; i++) {
    if (st.nodes[i]!.info.pinned === true) continue;
    let m = 0.0;
    for (let k = 0; k < NDIM; k++) m += st.sumT[i * NDIM + k]! * st.sumT[i * NDIM + k]!;
    if (m > max) { choice = i; max = m; }
  }
  return max < st.epsilon * st.epsilon ? -1 : choice;
}

/** Newton step for node `m`. @see lib/neatogen/stuff.c:move_node */
function moveNode(st: KkState, m: number): void {
  const a = new Float64Array(NDIM * NDIM);
  const b = new Float64Array(NDIM);
  const c = new Float64Array(NDIM);
  d2e(st, m, a);
  for (let i = 0; i < NDIM; i++) c[i] = -st.sumT[m * NDIM + i]!;
  solve(a, b, c, NDIM);
  const pos = st.nodes[m]!.info.pos!;
  for (let i = 0; i < NDIM; i++) {
    b[i] = (st.damping + 2 * (1 - st.damping) * drand48()) * b[i]!;
    pos[i]! += b[i]!;
  }
  st.move++;
  updateArrays(st, m);
}

/** @see lib/neatogen/stuff.c:solve_model */
function solveModel(g: Graph, st: KkState): void {
  for (let m = chooseNode(st); m >= 0; m = chooseNode(st)) moveNode(st, m);
  if (st.move === st.maxIter) {
    console.warn(`Max. iterations (${st.maxIter}) reached on graph ${g.name}`);
  }
}

/** `mds_model` inputs: out-edges with their 1-based `AGSEQ` ends and length. */
function mdsEdges(
  g: Graph, nodes: readonly Node[], lens: Map<Edge, number>,
): { tailSeq: number; headSeq: number; len: number }[] {
  const out = buildOutEdgeIndex(g);
  return nodes.flatMap((v) => (out.get(v) ?? []).map((e) => (
    { tailSeq: e.tail.id + 1, headSeq: e.head.id + 1, len: lens.get(e)! }
  )));
}

/**
 * Solve the layout with Kamada-Kawai gradient descent. The subset and (connected)
 * circuit distance models stay loud in `start.ts:assertSupported`; a
 * disconnected circuit falls back to shortest paths there too.
 * @see lib/neatogen/neatoinit.c:kkNeato
 */
export function kkNeato(g: Graph, nG: number, model: number): void {
  const maxiter = g.attrs.get('maxiter');
  const maxIter = maxiter !== undefined ? atoi(maxiter) : ITERATIONS_PER_NODE * g.nodes.size;
  if (nG < 2 || maxIter < 0) return;
  const { st, adj, ini, lens } = scanGraphMode(g, maxIter);
  shortestPath(newPathState(st.n, st.dist, adj, ini));
  if (model === MODEL_MDS) mdsModel(st.dist, st.n, mdsEdges(g, st.nodes, lens));
  initialPositions(g, st);
  diffeqModel(g, st);
  solveModel(g, st);
}
