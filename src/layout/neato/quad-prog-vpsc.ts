// SPDX-License-Identifier: EPL-2.0

/**
 * Quadratic programming with separation constraints (IPSep-CoLa): minimise
 * `X' A X + b X` subject to VPSC separation constraints by gradient
 * projection — a float32-faithful port of `lib/neatogen/quad_prog_vpsc.c`.
 * The C works on `float`; arrays are `Float32Array` and every float result is
 * rounded with `Math.fround`.
 *
 * Fused multiply-adds follow the 16.1 arm64 `-O3 -flto=thin` build
 * (`libgvplugin_neato_layout.8.0.15.dylib`, `_constrained_majorization_vpsc`):
 * each `A`-row reduction is vectorised in 16- and 4-wide blocks whose
 * products are rounded before strictly in-order adds, and its scalar tail is
 * `fmadd`; the per-`i` accumulations, the descent step and the beta step are
 * `fmadd`/`fmsub`/`fmla` in every shape. See {@link rowReduce}.
 *
 * `Verbose` stderr lines and the `CONMAJ_LOGGING` trace are not ported (the
 * port has no Verbose). `generateNonoverlapConstraints`, `removeoverlaps`,
 * `assign_digcola_levels` and `get_num_digcola_constraints` live in
 * `quad-prog-vpsc-overlap.ts` only because of the file-length limit.
 *
 * @see lib/neatogen/quad_prog_vpsc.c
 * @see lib/neatogen/quad_prog_vpsc.h
 */

import type { Box, Point } from '../../model/geom.js';
import {
  newVariable,
  newConstraint,
  newIncVPSC,
  deleteVPSC,
  deleteConstraints,
  deleteVariable,
  satisfyVPSC,
  setVariableDesiredPos,
  getVariablePos,
  type Constraint,
  type IncVPSC,
  type Variable,
} from '../../vpsc/index.js';
import { InternalError } from '../../errors.js';
import { computeHierarchy } from './compute-hierarchy.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import { fmaf, unpackMatrix } from './quad-prog-solve.js';
import { assignDigcolaLevels, getNumDigcolaConstraints } from './quad-prog-vpsc-overlap.js';

const fr = Math.fround;

/** `#define quad_prog_tol` @see lib/neatogen/quad_prog_vpsc.c */
const QUAD_PROG_TOL = 1e-4;
/** Weight of a DiG-CoLa boundary dummy variable. @see quad_prog_vpsc.c:initCMajVPSC */
const DUMMY_WEIGHT = 0.000001;
/**
 * Width of the oracle's smallest vector block: a row reduction rounds the
 * products of its first `n - n % 4` terms (16- then 4-wide blocks, in-order
 * adds) and fuses the rest. Below 4 terms the whole loop is scalar.
 */
const VECTOR_BLOCK = 4;

/**
 * Cluster membership for the containment and cluster non-overlap constraints.
 * C counts are `size_t`; `bb` is written by `generateNonoverlapConstraints`.
 * @see lib/neatogen/defs.h:cluster_data
 */
export interface ClusterData {
  /** Total count of vars in clusters. */
  nvars: number;
  /** Number of clusters. */
  nclusters: number;
  /** Number of vars in each cluster. */
  clustersizes: Int32Array;
  /** Var indices of the constituents of each cluster. */
  clusters: Int32Array[];
  /** Number of nodes not in any cluster. */
  ntoplevel: number;
  /** Nodes not in any cluster. */
  toplevel: Int32Array;
  /** Bounding box of each cluster. */
  bb: Box[];
}

/** @see lib/neatogen/digcola.h:ipsep_options */
export interface IpsepOptions {
  /** 1 = directed edge constraints, 2 = DiG-CoLa hierarchy level constraints. */
  diredges: 0 | 1 | 2;
  /** Vertical separation forced between the ends of a directed edge. */
  edgeGap: number;
  /** 1 = non-overlap constraints, 2 = remove overlaps after layout. */
  noverlap: 0 | 1 | 2;
  /** Horizontal and vertical gap enforced when removing overlap. */
  gap: Point;
  /** Node widths and heights. */
  nsize: Point[];
  clusters: ClusterData;
}

/** @see lib/neatogen/quad_prog_vpsc.h:DigColaLevel */
export interface DigColaLevel {
  nodes: Int32Array;
  numNodes: number;
}

/** @see lib/neatogen/quad_prog_vpsc.h:CMajEnvVPSC */
export interface CMajEnvVPSC {
  /** Unpacked matrix, or null when none was given. */
  A: Float32Array[] | null;
  /** Number of actual vars. */
  nv: number;
  /** Number of dummy nodes included in the Laplacian matrix. */
  nldv: number;
  /** Number of dummy nodes not included in the Laplacian matrix. */
  ndv: number;
  vs: Variable[];
  /** Total number of constraints for the next iteration. */
  m: number;
  /** Number of global constraints. */
  gm: number;
  cs: Constraint[] | null;
  /** Global constraints, persistent throughout the optimisation. */
  gcs: Constraint[] | null;
  vpsc: IncVPSC | null;
  /** Utility arrays (reusable memory). */
  fArray1: Float32Array;
  fArray2: Float32Array;
  fArray3: Float32Array;
}

/**
 * `acc + Σ_j (factor·row[j])·v[j]` as the oracle's vectorised copy of the
 * loop computes it: `factor·row[j]` is exact (±2), the first `n - n % 4`
 * products are rounded and added in order, the tail is `fmadd`.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc
 */
function rowReduce(row: Float32Array, factor: number, v: Float32Array, n: number, acc: number): number {
  const blocked = n - (n % VECTOR_BLOCK);
  let j = 0;
  for (; j < blocked; j++) acc = fr(acc + fr(fr(factor * row[j]!) * v[j]!));
  for (; j < n; j++) acc = fmaf(fr(factor * row[j]!), v[j]!, acc);
  return acc;
}

/**
 * Project `place` onto the constraint boundary.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc (71-79, 118-126)
 */
function project(e: CMajEnvVPSC, place: Float32Array, n: number): void {
  for (let i = 0; i < n; i++) {
    setVariableDesiredPos(e.vs[i]!, place[i]!);
  }
  satisfyVPSC(e.vpsc!);
  for (let i = 0; i < n; i++) {
    place[i] = getVariablePos(e.vs[i]!);
  }
}

/**
 * Steepest-descent direction `g = 2b - 2A·place` (saving `old_place`), then
 * the exact step `alpha` along it; returns `-alpha` as the build forms it.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc (96-115)
 */
function descentStep(e: CMajEnvVPSC, b: Float32Array, place: Float32Array, n: number): number {
  const A = e.A!;
  const g = e.fArray1;
  const oldPlace = e.fArray2;
  for (let i = 0; i < n; i++) {
    oldPlace[i] = place[i]!;
    g[i] = rowReduce(A[i]!, -2, place, n, fr(2 * b[i]!));
  }
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator = fmaf(g[i]!, g[i]!, numerator);
    const r = rowReduce(A[i]!, 2, g, n, 0);
    denominator = fmaf(-r, g[i]!, denominator);
  }
  return denominator !== 0 ? -fr(numerator / denominator) : -1.0;
}

/**
 * `d = place - old_place` and the line-search factor `beta` along it.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc (130-147)
 */
function lineSearchBeta(e: CMajEnvVPSC, place: Float32Array, n: number): number {
  const A = e.A!;
  const g = e.fArray1;
  const oldPlace = e.fArray2;
  const d = e.fArray3;
  for (let i = 0; i < n; i++) {
    d[i] = fr(place[i]! - oldPlace[i]!);
  }
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator = fmaf(g[i]!, d[i]!, numerator);
    const r = rowReduce(A[i]!, 2, d, n, 0);
    denominator = fmaf(r, d[i]!, denominator);
  }
  // C: !is_exactly_zero(denominator) && !is_exactly_equal(denominator, -0.0)
  if (!Object.is(denominator, 0) && !Object.is(denominator, -0)) return fr(numerator / denominator);
  return 1.0;
}

/**
 * Take the `beta` step where it stays feasible; returns the sum of moves.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc (149-157)
 */
function applyBeta(e: CMajEnvVPSC, place: Float32Array, n: number, beta: number): number {
  const oldPlace = e.fArray2;
  const d = e.fArray3;
  let test = 0;
  for (let i = 0; i < n; i++) {
    /* beta > 1.0 takes us back outside the feasible region
     * beta < 0 clearly not useful and may happen due to numerical imp.
     */
    if (beta > 0 && beta < 1.0) {
      place[i] = fmaf(beta, d[i]!, oldPlace[i]!);
    }
    test = fr(test + fr(Math.abs(place[i]! - oldPlace[i]!)));
  }
  return test;
}

/**
 * Use gradient projection to solve Variable Placement with Separation
 * Constraints. Returns the iteration count.
 * @see lib/neatogen/quad_prog_vpsc.c:constrained_majorization_vpsc
 */
export function constrainedMajorizationVpsc(
  e: CMajEnvVPSC, b: Float32Array, place: Float32Array, maxIterations: number,
): number {
  /* for laplacian computation need number of real vars and those
   * dummy vars included in lap
   */
  const n = e.nv + e.nldv;
  let converged = false;
  if (maxIterations === 0) return 0;
  if (e.m > 0) project(e, place, n);
  let counter: number;
  for (counter = 0; counter < maxIterations && !converged; counter++) {
    converged = true;
    /* find steepest descent direction */
    const negAlpha = descentStep(e, b, place, n);
    for (let i = 0; i < n; i++) {
      place[i] = fmaf(negAlpha, e.fArray1[i]!, place[i]!);
    }
    /* project to constraint boundary */
    if (e.m > 0) project(e, place, n);
    const beta = lineSearchBeta(e, place, n);
    const test = applyBeta(e, place, n, beta);
    if (test > QUAD_PROG_TOL) {
      converged = false;
    }
  }
  return counter;
}

/**
 * One separation constraint per directed edge of the acyclic subgraph.
 * @see lib/neatogen/quad_prog_vpsc.c:initCMajVPSC (215-235)
 */
function directedEdgeConstraints(e: CMajEnvVPSC, graph: DirectedVtxData[], opt: IpsepOptions): void {
  for (let i = 0; i < e.nv; i++) {
    for (let j = 1; j < graph[i]!.nedges; j++) {
      if (graph[i]!.edists![j]! > 0) {
        e.gm++;
      }
    }
  }
  e.gcs = [];
  e.gm = 0;
  for (let i = 0; i < e.nv; i++) {
    for (let j = 1; j < graph[i]!.nedges; j++) {
      const u = i;
      const v = graph[i]!.edges[j]!;
      if (graph[i]!.edists![j]! > 0) {
        e.gcs[e.gm++] = newConstraint(e.vs[u]!, e.vs[v]!, opt.edgeGap);
      }
    }
  }
}

/**
 * DiG-CoLa level constraints through one dummy variable per level boundary.
 * Returns false where C returns NULL (`compute_hierarchy` failed).
 * @see lib/neatogen/quad_prog_vpsc.c:initCMajVPSC (236-282)
 */
function digcolaConstraints(
  e: CMajEnvVPSC, n: number, graph: DirectedVtxData[], opt: IpsepOptions,
): boolean {
  /* e->ndv is the number of dummy variables required, one for each boundary */
  const h = computeHierarchy(graph, e.nv, 1e-2, 1e-1, null);
  // Unreachable: compute_y_coords tests `conjugate_gradient(...) < 0`, which
  // never holds (it returns 0 or 1); kept because C has the branch.
  /* v8 ignore next -- @preserve */
  if (h === null) return false;
  e.ndv = h.numLevels;
  const levels = assignDigcolaLevels(h.ordering, e.nv, h.levels, e.ndv);
  if (e.ndv === 0) {
    // C's `e->ndv - 1` is a size_t: it wraps, and the boundary loop reads
    // e->vs[n] past the array — native 16.1 segfaults here.
    throw new InternalError('initCMajVPSC: DiG-CoLa found 0 boundaries');
  }
  e.gm = getNumDigcolaConstraints(levels, e.ndv + 1) + e.ndv - 1;
  e.gcs = [];
  e.gm = 0;
  /* create dummy vars */
  for (let i = 0; i < e.ndv; i++) {
    /* dummy vars should have 0 weight */
    const cvar = n + i;
    e.vs[cvar] = newVariable(cvar, 1.0, DUMMY_WEIGHT);
  }
  const halfgap = opt.edgeGap;
  for (let i = 0; i < e.ndv; i++) {
    const cvar = n + i;
    /* outgoing constraints for each var in level below boundary */
    for (let j = 0; j < levels[i]!.numNodes; j++) {
      e.gcs[e.gm++] = newConstraint(e.vs[levels[i]!.nodes[j]!]!, e.vs[cvar]!, halfgap);
    }
    /* incoming constraints for each var in level above boundary */
    for (let j = 0; j < levels[i + 1]!.numNodes; j++) {
      e.gcs[e.gm++] = newConstraint(e.vs[cvar]!, e.vs[levels[i + 1]!.nodes[j]!]!, halfgap);
    }
  }
  /* constraints between adjacent boundary dummy vars */
  for (let i = 0; i < e.ndv - 1; i++) {
    e.gcs[e.gm++] = newConstraint(e.vs[n + i]!, e.vs[n + i + 1]!, 0);
  }
  return true;
}

/**
 * Two containment constraints for each var in a cluster, after the global
 * constraints generated so far.
 * @see lib/neatogen/quad_prog_vpsc.c:initCMajVPSC (283-300)
 */
function clusterContainment(e: CMajEnvVPSC, opt: IpsepOptions): void {
  const ecs = e.gcs;
  e.gcs = [];
  for (let i = 0; i < e.gm; i++) {
    e.gcs[i] = ecs![i]!;
  }
  // C deleteConstraints(0, ecs) frees the array only.
  for (let i = 0; i < opt.clusters.nclusters; i++) {
    for (let j = 0; j < opt.clusters.clustersizes[i]!; j++) {
      const v = e.vs[opt.clusters.clusters[i]![j]!]!;
      const cl = e.vs[e.nv + 2 * i]!;
      const cr = e.vs[e.nv + 2 * i + 1]!;
      e.gcs[e.gm++] = newConstraint(cl, v, 0);
      e.gcs[e.gm++] = newConstraint(v, cr, 0);
    }
  }
}

/**
 * Set up the environment and the global constraints (directed-edge and
 * cluster containment constraints). `diredges`: 0 = none, 1 = one separation
 * constraint per edge (in the acyclic subgraph), 2 = DiG-CoLa level
 * constraints. Returns null where C returns NULL.
 * @see lib/neatogen/quad_prog_vpsc.c:initCMajVPSC
 */
export function initCMajVPSC(
  n: number, packedMat: Float32Array | null, graph: DirectedVtxData[] | null,
  opt: IpsepOptions, diredges: 0 | 1 | 2,
): CMajEnvVPSC | null {
  /* if we have clusters then we'll need two constraints for each var in
   * a cluster */
  const nldv = 2 * opt.clusters.nclusters;
  const e: CMajEnvVPSC = {
    A: null, nv: n - nldv, nldv, ndv: 0, vs: [], m: 0, gm: 0, cs: null, gcs: null,
    vpsc: null, fArray1: new Float32Array(0), fArray2: new Float32Array(0), fArray3: new Float32Array(0),
  };
  for (let i = 0; i < n; i++) {
    e.vs[i] = newVariable(i, 1.0, 1.0);
  }
  if (diredges === 1) {
    directedEdgeConstraints(e, graph!, opt);
  } else if (diredges === 2) {
    const ok = digcolaConstraints(e, n, graph!, opt);
    // Unreachable for the same reason; kept because C returns NULL here.
    /* v8 ignore next -- @preserve */
    if (!ok) return null;
  }
  if (opt.clusters.nclusters > 0) clusterContainment(e, opt);
  e.m = 0;
  e.cs = null;
  if (e.gm > 0) {
    e.vpsc = newIncVPSC(e.vs, e.gcs!);
    e.m = e.gm;
    e.cs = e.gcs;
  }
  if (packedMat !== null) {
    e.A = unpackMatrix(packedMat, n);
  }
  e.fArray1 = new Float32Array(n);
  e.fArray2 = new Float32Array(n);
  e.fArray3 = new Float32Array(n);
  return e;
}

/**
 * Release the environment: the solver, its constraints (global ones only
 * when the array is separate) and variables.
 * @see lib/neatogen/quad_prog_vpsc.c:deleteCMajEnvVPSC
 */
export function deleteCMajEnvVPSC(e: CMajEnvVPSC): void {
  e.A = null;
  if (e.m > 0) {
    deleteVPSC(e.vpsc!);
    // C deleteConstraints(0, e->gcs) when e->cs != e->gcs frees the array only.
    deleteConstraints(e.cs!.slice(0, e.m));
    for (let i = 0; i < e.nv + e.nldv + e.ndv; i++) {
      deleteVariable(e.vs[i]!);
    }
    e.vs = [];
  }
}
