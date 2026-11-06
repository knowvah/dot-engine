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
 * The oracle's clang contracts `a + b*c` within one statement
 * (`-ffp-contract=on`), so those sites go through `fma`/`fms`. The Newton step's
 * iteration count depends on these last bits.
 *
 * Not ported: `Verbose` output (`total_e`, timers), `test_toggle` tracing,
 * and `Reduce` (`-x`, a command-line flag this library has no counterpart for).
 *
 * @see lib/neatogen/neatoinit.c:kkNeato
 * @see lib/neatogen/stuff.c
 */

import type { Graph } from '../../model/graph.js';
import { agNameOf } from '../../model/cgraph-ops.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { buildOutEdgeIndex } from '../../model/node.js';
import { drand48 } from '../../common/random.js';
import { lateDouble } from '../../common/nodeinit.js';
import { checkStart, INIT_RANDOM, INIT_REGULAR, INIT_SELF, warnStartSelfOnce } from './start.js';
import { MODEL_CIRCUIT, MODEL_MDS, MODEL_SUBSET } from './init.js';
import { circuitModel } from './circuit.js';
import { solve } from './kk-solve.js';
import { lenattr } from './edge-len.js';
import { newPathState, shortestPath, mdsModel, subsetModel, type Neighbour } from './kk-paths.js';
import { agerr, agwarningf } from '../../common/agerr.js';
import { fma, fms } from '../../common/fma.js';
import { jitter3d, ndimOf } from './init-dim.js';

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
  /** `Ndim`, the root's layout dimension. */
  readonly ndim: number;
  readonly nodes: readonly Node[];
  /** `GD_dist`, n*n. */
  readonly dist: Float64Array;
  /** `GD_spring`, n*n. */
  readonly spring: Float64Array;
  /** `GD_sum_t`, n*ndim. */
  readonly sumT: Float64Array;
  /** `GD_t`, n*n*ndim. */
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
  return fma(total / (nE > 0 ? nE : 1), Math.sqrt(g.nodes.size), 1);
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
  const ndim = ndimOf(g);
  const st: KkState = {
    n, ndim, nodes, dist: new Float64Array(n * n).fill(ini), spring: new Float64Array(n * n).fill(1),
    sumT: new Float64Array(n * ndim).fill(1), t: new Float64Array(n * n * ndim),
    damping: damp === undefined ? DEFAULT_DAMPING : parseFloat(damp) || 0,
    epsilon, maxIter, move: 0,
  };
  return { st, adj: neighbours(g, nodes, lens), ini, lens };
}

/** @see lib/neatogen/stuff.c:randompos (called with nG = 1 by initial_positions) */
function randompos(np: Node, ndim: number): void {
  np.info.pos![0] = drand48();
  np.info.pos![1] = drand48();
  if (ndim > 2) jitter3d(np, 1, ndim);
}

/** @see lib/neatogen/stuff.c:initial_positions */
function initialPositions(g: Graph, st: KkState): void {
  const init = checkStart(g, st.n, INIT_RANDOM);
  if (init === INIT_REGULAR) return;
  if (init === INIT_SELF) warnStartSelfOnce();
  for (const np of st.nodes) {
    if (np.info.posSet === true || np.info.pinned === true) continue;
    randompos(np, st.ndim);
  }
}

/** `distvec`: returns |p0-p1| and leaves p0-p1 in `del`. @see stuff.c:distvec */
function distvec(p0: number[], p1: number[], del: Float64Array, ndim: number): number {
  let dist = 0.0;
  for (let k = 0; k < ndim; k++) {
    del[k] = p0[k]! - p1[k]!;
    dist = fma(del[k]!, del[k]!, dist);
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
  const { ndim } = st;
  const vi = st.nodes[i]!;
  for (let j = 0; j < st.n; j++) {
    if (i === j) continue;
    const dist = distvec(vi.info.pos!, st.nodes[j]!.info.pos!, del, ndim);
    for (let k = 0; k < ndim; k++) {
      const v = st.spring[i * st.n + j]! * (del[k]! - (st.dist[i * st.n + j]! * del[k]!) / dist);
      st.t[(i * st.n + j) * ndim + k] = v;
      st.sumT[i * ndim + k]! += v;
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
  const del = new Float64Array(st.ndim);
  for (let i = 0; i < n; i++) fillRow(st, i, del);
}

/** Recompute node `i`'s row and the mirrored column. @see stuff.c:update_arrays */
function updateArrays(st: KkState, i: number): void {
  const { n, ndim } = st;
  const del = new Float64Array(ndim);
  const vi = st.nodes[i]!;
  for (let k = 0; k < ndim; k++) st.sumT[i * ndim + k] = 0.0;
  for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const dist = distvec(vi.info.pos!, st.nodes[j]!.info.pos!, del, ndim);
    for (let k = 0; k < ndim; k++) {
      const tij = st.spring[i * n + j]! * (del[k]! - (st.dist[i * n + j]! * del[k]!) / dist);
      st.t[(i * n + j) * ndim + k] = tij;
      st.sumT[i * ndim + k]! += tij;
      const old = st.t[(j * n + i) * ndim + k]!;
      st.t[(j * n + i) * ndim + k] = -tij;
      st.sumT[j * ndim + k]! += -tij - old;
    }
  }
}

/** Hessian of node `m`'s energy into `M` (ndim x ndim). @see stuff.c:D2E */
function d2e(st: KkState, m: number, M: Float64Array): void {
  const { n, ndim } = st;
  const vn = st.nodes[m]!;
  const t = new Float64Array(ndim);
  M.fill(0);
  for (let i = 0; i < n; i++) {
    if (m === i) continue;
    const vi = st.nodes[i]!;
    let sq = 0.0;
    for (let k = 0; k < ndim; k++) {
      t[k] = vn.info.pos![k]! - vi.info.pos![k]!;
      sq = fma(t[k]!, t[k]!, sq);
    }
    const scale = 1 / Math.pow(sq, 1.5);
    const K = st.spring[m * n + i]!;
    const D = st.dist[m * n + i]!;
    for (let k = 0; k < ndim; k++) {
      for (let l = 0; l < k; l++) M[l * ndim + k] = fma(K * D * t[k]! * t[l]!, scale, M[l * ndim + k]!);
      const inner = fms(D * fms(t[k]!, t[k]!, sq), scale, 1.0);
      M[k * ndim + k] = fma(K, inner, M[k * ndim + k]!);
    }
  }
  for (let k = 1; k < ndim; k++) {
    for (let l = 0; l < k; l++) M[k * ndim + l] = M[l * ndim + k]!;
  }
}

/** Index of the unpinned node with the largest gradient, or -1. @see stuff.c:choose_node */
function chooseNode(st: KkState): number {
  if (st.move >= st.maxIter) return -1;
  const { ndim } = st;
  let max = 0.0;
  let choice = -1;
  for (let i = 0; i < st.n; i++) {
    if (st.nodes[i]!.info.pinned === true) continue;
    let m = 0.0;
    for (let k = 0; k < ndim; k++) m = fma(st.sumT[i * ndim + k]!, st.sumT[i * ndim + k]!, m);
    if (m > max) { choice = i; max = m; }
  }
  return max < st.epsilon * st.epsilon ? -1 : choice;
}

/** Newton step for node `m`. @see lib/neatogen/stuff.c:move_node */
function moveNode(st: KkState, m: number): void {
  const { ndim } = st;
  const a = new Float64Array(ndim * ndim);
  const b = new Float64Array(ndim);
  const c = new Float64Array(ndim);
  d2e(st, m, a);
  for (let i = 0; i < ndim; i++) c[i] = -st.sumT[m * ndim + i]!;
  solve(a, b, c, ndim);
  const pos = st.nodes[m]!.info.pos!;
  for (let i = 0; i < ndim; i++) {
    b[i] = fma(2 * (1 - st.damping), drand48(), st.damping) * b[i]!;
    pos[i]! += b[i]!;
  }
  st.move++;
  updateArrays(st, m);
}

/** @see lib/neatogen/stuff.c:solve_model */
function solveModel(g: Graph, st: KkState): void {
  for (let m = chooseNode(st); m >= 0; m = chooseNode(st)) moveNode(st, m);
  if (st.move === st.maxIter) {
    agwarningf(`Max. iterations (${st.maxIter}) reached on graph ${agNameOf(g)}`);
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
 * The distance-model dispatch at the head of `kkNeato`. The warning comes from
 * `circuit_model`'s failure, which on the 1-based `AGSEQ` is every graph (see
 * `circuit.ts`), so a connected graph prints "is disconnected" too; and under
 * `pack` it prints once per component, under the component's own name.
 * @see lib/neatogen/neatoinit.c:kkNeato (neatoinit.c:1243-1261)
 */
function kkModel(g: Graph, nG: number, model: number, run: ReturnType<typeof scanGraphMode>): void {
  const { st, adj, ini, lens } = run;
  const shortest = (): void => shortestPath(newPathState(st.n, st.dist, adj, ini));
  if (model === MODEL_SUBSET) {
    subsetModel(g, nG, st.dist);
  } else if (model === MODEL_CIRCUIT) {
    if (!circuitModel(g, nG, st.dist, lens)) {
      agwarningf(`graph ${agNameOf(g)} is disconnected. Hence, the circuit model`);
      agerr('prev', 'is undefined. Reverting to the shortest path model.');
      agerr('prev', 'Alternatively, consider running neato using -Gpack=true or decomposing');
      agerr('prev', 'the graph into connected components.');
      shortest();
    }
  } else if (model === MODEL_MDS) {
    shortest();
    mdsModel(st.dist, st.n, mdsEdges(g, st.nodes, lens));
  } else {
    shortest();
  }
}

/**
 * Solve the layout with Kamada-Kawai gradient descent.
 * @see lib/neatogen/neatoinit.c:kkNeato
 */
export function kkNeato(g: Graph, nG: number, model: number): void {
  const maxiter = g.attrs.get('maxiter');
  const maxIter = maxiter !== undefined ? atoi(maxiter) : ITERATIONS_PER_NODE * g.nodes.size;
  if (nG < 2 || maxIter < 0) return;
  const run = scanGraphMode(g, maxIter);
  kkModel(g, nG, model, run);
  initialPositions(g, run.st);
  diffeqModel(g, run.st);
  solveModel(g, run.st);
}
