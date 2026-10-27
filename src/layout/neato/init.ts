// SPDX-License-Identifier: EPL-2.0
/**
 * Neato layout initialisation helpers.
 *
 * Ports lib/neatogen/neatoinit.c: neato_init_node, user_pos, setSeed,
 * solveModel, neatoTranslate, neatoSetAspect, neatoCleanup.
 *
 * @see lib/neatogen/neatoinit.c
 * @see lib/neatogen/neatoprocs.h
 */

import type { ShapeDesc } from '../../common/types.js';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { VtxData } from './dijkstra.js';
import {
  DFLT_ITERATIONS,
  OPT_SMART_INIT as STRESS_OPT_SMART_INIT,
  MODEL_MDS as STRESS_MODEL_MDS,
  MODEL_CIRCUIT as STRESS_MODEL_CIRCUIT,
  MODEL_SUBSET as STRESS_MODEL_SUBSET,
} from './stress.js';
import { sgdLayout } from './sgd.js';
import { kkNeato } from './kk.js';
import {
  checkStart, assertSupported, parseStart, INIT_RANDOM, INIT_REGULAR, INIT_SELF,
} from './start.js';
import { setEdgeLen } from './edge-len.js';
import { makeGraphDataC, graphHasLen } from './make-graph-data.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import { stressMajorizationWithHierarchy } from './constrained-majorization.js';
import { agerr } from '../../common/agerr.js';

export { makeGraphDataC, graphHasLen, checkStart };
import { mapbool } from '../dot/rank.js';
import {
  computeApspPacked,
  computeWeightedApspPacked,
  stressMajorizationKDMkernel,
  OPT_EXP_FLAG,
} from './stress-kernel.js';
import { lateDouble } from '../../common/nodeinit.js';
import { inputscaleDivisor } from '../../common/utils-inputscale.js';
import { parseNeatoDrawing, neatoSetAspectRatio } from './set-aspect.js';

// ---------------------------------------------------------------------------
// Mode constants — @see lib/neatogen/neatoprocs.h
// ---------------------------------------------------------------------------

/** Kamada-Kawai energy minimization. @see lib/neatogen/neatoprocs.h */
export const MODE_KK = 0;
/** Stress majorization (default). @see lib/neatogen/neatoprocs.h */
export const MODE_MAJOR = 1;
/** Hierarchical stress majorization (digcola). @see lib/neatogen/neatoprocs.h */
export const MODE_HIER = 2;
/** IPSEP-cola constraint solver. @see lib/neatogen/neatoprocs.h */
export const MODE_IPSEP = 3;
/** Stochastic gradient descent. @see lib/neatogen/neatoprocs.h */
export const MODE_SGD = 4;
/** `MaxIter` under MODE_SGD. @see neatoinit.c:1285 */ const SGD_ITERATIONS = 30;

// ---------------------------------------------------------------------------
// Model constants — @see lib/neatogen/defs.h
// ---------------------------------------------------------------------------

/** Shortest-path distance model. @see lib/neatogen/defs.h */
export const MODEL_SHORTPATH = 0;
/** Circuit resistance distance model. @see lib/neatogen/defs.h */
export const MODEL_CIRCUIT = 1;
/** Subset / Jaccard distance model. @see lib/neatogen/defs.h */
export const MODEL_SUBSET = 2;
/** MDS distance model. @see lib/neatogen/defs.h */
export const MODEL_MDS = 3;

/** Default layout dimension (2D). */
const DFLT_DIM = 2;

/** Points per inch conversion factor. */
const POINTS_PER_INCH = 72;

// ---------------------------------------------------------------------------
// neatoInitNode
// ---------------------------------------------------------------------------

/**
 * Initialise a node for neato layout.
 *
 * Ensures pos is a number[] of length dim, sets default UF_size, width,
 * and height.
 *
 * @see lib/neatogen/neatoinit.c:neato_init_node
 */
export function neatoInitNode(n: Node, dim = DFLT_DIM): void {
  if (!n.info.pos || n.info.pos.length < dim) {
    const pos: number[] = [];
    for (let i = 0; i < dim; i++) pos.push(0);
    n.info.pos = pos;
  }
  if (n.info.UF_size === undefined) n.info.UF_size = 1;
  // C neato_init_node has no size defaulting (neatoinit.c:60-66); the port's
  // zero-initialised width/height need a fallback on two port-only paths
  // (no-measurer initNodeDefaults, poly-null custom/epsf shapes). The one
  // legitimate post-init 0 is shape=plain (poly_init IS_PLAIN) — never clobber it.
  const plainShaped = (n.info.shape as ShapeDesc | undefined)?.name === 'plain';
  if (!n.info.width && !plainShaped) n.info.width = 0.75;
  if (!n.info.height && !plainShaped) n.info.height = 0.5;
}

// ---------------------------------------------------------------------------
// userPos
// ---------------------------------------------------------------------------

/**
 * Seed a node's initial position from its `pos=` attribute (C's P_SET),
 * mirroring user_pos. Sets info.pos + info.posSet so hasPos is true and neato
 * majorization starts from the input layout instead of a random init; a `!`
 * suffix or `pin=true` additionally sets info.pinned (P_PIN → isFixed).
 *
 * `pos` is divided by PSinputscale when > 0 (neatoinit.c:90-95). Must run
 * AFTER neatoInitNode, which zeroes info.pos.
 * @see lib/neatogen/neatoinit.c:user_pos
 */
export function userPos(n: Node): boolean {
  const p = n.attrs.get('pos');
  if (p === undefined || p.length === 0) return false;
  // 2-D "x,y" with an optional trailing '!' (3-D is absent from the 2-D suite).
  const num = '(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)';
  const m = new RegExp(`^\\s*${num}\\s*,\\s*${num}(.?)`).exec(p);
  if (m === null) return false; // C agerrorf: malformed pos, non-fatal
  const div = inputscaleDivisor(n.root);
  n.info.pos = [Number(m[1]) / div, Number(m[2]) / div];
  n.info.posSet = true;
  const pin = n.attrs.get('pin');
  if (m[3] === '!' || (pin !== undefined && mapbool(pin))) n.info.pinned = true;
  return true;
}

// ---------------------------------------------------------------------------
// setSeed helpers
// ---------------------------------------------------------------------------

/**
 * Classify the first character of `p` as 'alpha', 'digit', or 'other'.
 *
 * @see lib/neatogen/neatoinit.c:setSeed (gv_isalpha / gv_isdigit checks)
 */
export function classifyFirstChar(p: string): 'alpha' | 'digit' | 'other' {
  const c = p.charCodeAt(0);
  if (c >= 48 && c <= 57) return 'digit';
  if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) return 'alpha';
  return 'other';
}

/**
 * Detect a recognised alpha keyword prefix in `p`.
 * Returns `{ rest, matched }` where `matched` is 'random' | null.
 * 'self' and 'regular' are treated as non-random (seed stays 0).
 *
 * @see lib/neatogen/neatoinit.c:setSeed (keyword detection block)
 */
export function parseSeedPrefix(p: string): { rest: string; matched: string | null } {
  if (p.startsWith('random')) return { rest: p.slice('random'.length), matched: 'random' };
  return { rest: '', matched: null };
}

/**
 * Parse `rest` as an integer seed; returns 0 if not parseable.
 *
 * @see lib/neatogen/neatoinit.c:setSeed (seed numeric suffix)
 */
export function parseSeedInt(rest: string): number {
  const parsed = parseInt(rest, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse the `g.info.start` string attribute to set the RNG seed.
 *
 * Returns defaultMode in all cases (the C function also returns init mode,
 * but for the neato pipeline mode is resolved separately).
 * Sets `seed.value` as a side-effect.
 *
 * @see lib/neatogen/neatoinit.c:setSeed
 */
export function setSeed(
  g: Graph,
  defaultMode: number,
  seed: { value: number },
): number {
  const p = g.info.start;
  if (!p || p.length === 0) { seed.value = 0; return defaultMode; }

  const kind = classifyFirstChar(p);
  if (kind === 'other') { seed.value = 0; return defaultMode; }

  if (kind === 'digit') { seed.value = parseSeedInt(p); return defaultMode; }

  const { rest, matched } = parseSeedPrefix(p);
  if (matched !== 'random') { seed.value = 0; return defaultMode; }
  seed.value = parseSeedInt(rest);
  return defaultMode;
}

// ---------------------------------------------------------------------------
// buildVtxData helpers
// ---------------------------------------------------------------------------

/**
 * Assign sequential IDs to all nodes and return them in insertion order.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData (node ID assignment pass)
 */
export function assignNodeIds(g: Graph): Node[] {
  const nodeList: Node[] = [];
  let idx = 0;
  for (const [, n] of g.nodes) { n.info.id = idx++; nodeList.push(n); }
  return nodeList;
}

/**
 * Allocate one self-loop VtxData entry per node.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData (graph[] init)
 */
export function initVtxEntries(nodeList: Node[]): VtxData[] {
  return nodeList.map((_, i) => ({ nedges: 1, edges: [i], ewgts: [0] }));
}

/**
 * Resolve edge weight: factor takes priority, then weight, then 1.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData (ED_factor usage)
 */
export function edgeWeight(e: Edge): number {
  if (e.info.factor !== undefined) return e.info.factor;
  if (e.info.weight !== undefined) return e.info.weight;
  return 1;
}

/**
 * Add a bidirectional edge between two VtxData entries with weight w.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData (edge insertion loop)
 */
export function addEdgeToVtx(vtx: VtxData[], ti: number, hi: number, w: number): void {
  vtx[ti].edges.push(hi);
  vtx[ti].ewgts.push(w);
  vtx[ti].nedges++;
  vtx[hi].edges.push(ti);
  vtx[hi].ewgts.push(w);
  vtx[hi].nedges++;
}

/**
 * Insert all non-self-loop edges from `g` into `vtx`.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData (edge loop)
 */
export function addGraphEdges(g: Graph, vtx: VtxData[]): void {
  for (const e of g.edges) {
    if (e.tail === e.head) continue;
    const ti = e.tail.info.id ?? 0;
    const hi = e.head.info.id ?? 0;
    addEdgeToVtx(vtx, ti, hi, edgeWeight(e));
  }
}

/**
 * Assign sequential node IDs and build VtxData sparse graph.
 *
 * @see lib/neatogen/neatoinit.c:makeGraphData
 */
export function buildVtxData(g: Graph): VtxData[] {
  const nodeList = assignNodeIds(g);
  const vtx = initVtxEntries(nodeList);
  addGraphEdges(g, vtx);
  return vtx;
}

// ---------------------------------------------------------------------------
// buildDCoords / writeBackCoords
// ---------------------------------------------------------------------------

/**
 * Copy node positions from `n.info.pos` into per-axis Float64Array.
 *
 * @see lib/neatogen/neatoinit.c:majorization (coords allocation)
 */
export function buildDCoords(nodeList: Node[], dim: number): Float64Array[] {
  const n = nodeList.length;
  const dCoords: Float64Array[] = [];
  for (let d = 0; d < dim; d++) {
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) arr[i] = nodeList[i].info.pos?.[d] ?? 0;
    dCoords.push(arr);
  }
  return dCoords;
}

/**
 * Write per-axis Float64Array results back into `n.info.pos`.
 *
 * @see lib/neatogen/neatoinit.c:majorization (write-back loop)
 */
export function writeBackCoords(nodeList: Node[], dCoords: Float64Array[], dim: number): void {
  for (let i = 0; i < nodeList.length; i++) {
    const pos: number[] = nodeList[i].info.pos ?? [];
    for (let d = 0; d < dim; d++) pos[d] = dCoords[d][i];
    nodeList[i].info.pos = pos;
  }
}

// ---------------------------------------------------------------------------
// mapModelToStress
// ---------------------------------------------------------------------------

/**
 * Map init.ts model constants to stress.ts model constants.
 * Both use the same numeric values but are distinct exports.
 */
export function mapModelToStress(model: number): number {
  if (model === MODEL_MDS) return STRESS_MODEL_MDS;
  if (model === MODEL_CIRCUIT) return STRESS_MODEL_CIRCUIT;
  if (model === MODEL_SUBSET) return STRESS_MODEL_SUBSET;
  return 0;
}

// ---------------------------------------------------------------------------
// solveModel helpers
// ---------------------------------------------------------------------------

/** `MaxIter` per mode; `maxiter` goes through C `atoi` (no digits -> 0). @see neatoinit.c:1280-1287 */
export function neatoMaxIter(maxiter: string | undefined, mode: number, n: number): number {
  if (maxiter !== undefined) return parseInt(maxiter, 10) || 0;
  if (mode === MODE_MAJOR) return DFLT_ITERATIONS;
  return mode === MODE_SGD ? SGD_ITERATIONS : 100 * n;
}

/** `late_double(g, "levelsgap", 0.0, -DBL_MAX)`. @see lib/neatogen/neatoinit.c:majorization */
const levelsGapOf = (g: Graph): number =>
  lateDouble(g.root.attrs.get('levelsgap'), 0.0, -Number.MAX_VALUE);

/** What `majorization` was called with, plus the options derived from it. */
interface MajorizationCtx {
  readonly g: Graph;
  readonly mode: number;
  readonly model: number;
  readonly haveLen: boolean;
  /** `opt_*` bits from `checkExp` and `checkStart`. */
  readonly opts: number;
}

/**
 * The solver step of `majorization`: `stress_majorization_with_hierarchy` for
 * MODE_HIER, else the kD_mkernel (MODE_IPSEP without constraints runs it too).
 * Returns C's `rv`; the coordinates are left in `dCoords`.
 * @see lib/neatogen/neatoinit.c:majorization
 */
function solveStress(
  c: MajorizationCtx, vtx: DirectedVtxData[], dCoords: Float64Array[], nodeList: Node[],
): number {
  const { g, mode, model, haveLen, opts } = c;
  const n = nodeList.length;
  const maxi = neatoMaxIter(g.attrs.get('maxiter'), mode, n);
  const epsilon = lateDouble(g.attrs.get('epsilon'), 1e-4, 0); // DFLT_TOLERANCE
  if (mode === MODE_HIER) {
    return stressMajorizationWithHierarchy(vtx, n, dCoords, nodeList, {
      dim: DFLT_DIM, opts, model, maxi, epsilon, levelsGap: levelsGapOf(g),
    });
  }
  // C ipsep (stress_majorization_cola, constrained_majorization_ipsep.c:150) always uses
  // compute_apsp_packed; kD_mkernel uses the weighted APSP iff graph->ewgts (stress.c:855).
  const weighted = haveLen && mode !== MODE_IPSEP;
  const Dij = weighted ? computeWeightedApspPacked(vtx, n) : computeApspPacked(vtx, n);
  return stressMajorizationKDMkernel(Dij, n, dCoords, nodeList, {
    dim: DFLT_DIM, opts, maxi, epsilon,
  });
}

/** Run stress majorization and write positions back. @see lib/neatogen/neatoinit.c:majorization */
export function runMajorization(g: Graph, mode: number, model: number): void {
  const nodeList = assignNodeIds(g);
  setEdgeLen(g); // scan_graph_mode else-branch: ED_dist for major/hier/ipsep
  const n = nodeList.length;
  const haveLen = graphHasLen(g);
  // C: srand48(seed) immediately before initLayout draws; hier starts from self
  const init = checkStart(g, n, mode === MODE_HIER ? INIT_SELF : INIT_RANDOM);
  const opts = init === INIT_SELF ? OPT_EXP_FLAG | STRESS_OPT_SMART_INIT : OPT_EXP_FLAG;
  const haveDir = mode === MODE_HIER || mode === MODE_IPSEP;
  const vtx = makeGraphDataC(g, nodeList, haveLen, haveDir, mode);
  const dCoords = [new Float64Array(n), new Float64Array(n)];
  if (solveStress({ g, mode, model, haveLen, opts }, vtx, dCoords, nodeList) < 0) {
    agerr('prev', 'layout aborted');
    return;
  }
  for (let i = 0; i < n; i++) {
    nodeList[i]!.info.pos = [dCoords[0]![i]!, dCoords[1]![i]!];
  }
}

/** Dispatch to the layout solver for the mode. @see lib/neatogen/neatoinit.c:neatoLayout */
export function solveModel(g: Graph, mode: number, model: number): void {
  if (g.nodes.size < 2) return;
  assertSupported(g, mode, model);
  if (mode === MODE_KK) return kkNeato(g, g.nodes.size, model);
  if (mode === MODE_SGD) {
    // C initial_positions -> checkStart: regular positions are kept
    if (parseStart(g.root.attrs.get('start'), INIT_RANDOM).init === INIT_REGULAR) checkStart(g);
    sgdLayout(g, model);
    return;
  }
  runMajorization(g, mode, model);
}

// ---------------------------------------------------------------------------
// neatoTranslate helpers
// ---------------------------------------------------------------------------

/** Minimum X and Y across all node positions. @see lib/neatogen/neatoinit.c (translate logic) */
export function findMinPos(g: Graph): { minX: number; minY: number } {
  let minX = Infinity;
  let minY = Infinity;
  for (const [, n] of g.nodes) {
    const pos = n.info.pos;
    if (!pos) continue;
    if (pos[0] < minX) minX = pos[0];
    if ((pos[1] ?? 0) < minY) minY = pos[1] ?? 0;
  }
  return { minX, minY };
}

/**
 * Subtract (dx, dy) from every node position in place.
 *
 * @see lib/neatogen/neatoinit.c (translate loop)
 */
export function shiftPositions(g: Graph, dx: number, dy: number): void {
  for (const [, n] of g.nodes) {
    const pos = n.info.pos;
    if (!pos) continue;
    pos[0] -= dx;
    if (pos.length > 1) pos[1] -= dy;
  }
}

/**
 * Shift all node positions so the minimum is at (0, 0).
 *
 * @see lib/neatogen/neatoinit.c (translate logic inside neato_layout /
 *      gv_postprocess)
 */
export function neatoTranslate(g: Graph): void {
  const { minX, minY } = findMinPos(g);
  if (!isFinite(minX)) return;
  shiftPositions(g, minX, minY);
}

// ---------------------------------------------------------------------------
// neatoSetAspect
// ---------------------------------------------------------------------------

/**
 * Copy position (inches) to coord (points, multiply by 72).
 *
 * @see lib/neatogen/neatoinit.c (position-to-coord conversion)
 */
export function neatoSetAspect(g: Graph): void {
  // C neato_set_aspect: reshape per ratio/size FIRST (fill/expand/value),
  // then copy internal ND_pos (inches) to ND_coord (points).
  // @see lib/neatogen/neatosplines.c:1105
  parseNeatoDrawing(g);
  neatoSetAspectRatio(g);
  for (const [, n] of g.nodes) {
    const pos = n.info.pos;
    if (!pos) continue;
    n.info.coord = {
      x: (pos[0] ?? 0) * POINTS_PER_INCH,
      y: (pos[1] ?? 0) * POINTS_PER_INCH,
    };
  }
}

// ---------------------------------------------------------------------------
// neatoCleanup
// ---------------------------------------------------------------------------

/**
 * Clear neato-specific state on nodes.
 *
 * @see lib/neatogen/neatoinit.c:neato_cleanup
 */
export function neatoCleanup(g: Graph): void {
  for (const [, n] of g.nodes) {
    n.info.pos = undefined;
    n.info.pinned = undefined;
    n.info.id = undefined;
    n.info.heapindex = undefined;
    n.info.hops = undefined;
    n.info.UF_size = undefined;
  }
}
