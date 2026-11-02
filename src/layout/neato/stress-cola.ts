// SPDX-License-Identifier: EPL-2.0

/**
 * IPSep-CoLa stress majorization subject to separation constraints
 * (mode=ipsep) — a float32-faithful port of
 * `constrained_majorization_ipsep.c:stress_majorization_cola`.
 *
 * Kernels, as the 16.1 arm64 `-O3 -flto=thin` build runs them: both inlined
 * `right_mult_with_vector_ff` copies are the kD copy's instructions
 * (`rightMultWithVectorFFFused`); `conjugate_gradient_mkernel` is the one
 * out-of-line fused body the kD kernel also calls
 * (`conjugateGradientMkernelFused`); the squared distances are `square_vec`
 * then `vectors_additionf`, two loops, so each product is rounded before its
 * add (313-316, unlike stress.c's fused `+= tmp * tmp`).
 *
 * The complexity limits force the C body into helpers, each kept in C order
 * and named with its C line range: {@link maxEdgeLength} (112-116),
 * {@link modelDistances} (128-151), {@link diameterOf} (158-164),
 * {@link colaScaleLayout} (166-191), {@link clusterLaplacian} (205-236),
 * {@link laplacianDiagonal} (237-253), {@link floatCoords} (255-262),
 * {@link optimize} (282-293, 434-444), {@link iterate} (295-433) with
 * {@link pairDistances} / {@link buildLap1} (298-336), {@link computeStress}
 * (338-357), {@link scaleUpNodes} (377-385), {@link solveHorizontal} /
 * {@link solveVertical} (400-432), and {@link writeBack} (446-455).
 *
 * `Verbose` output and the timers are not ported (the port has no Verbose);
 * {@link stressMajorizationColaTraced} reports each iteration's stress, the
 * value C prints under `-v`, for tests. C's `Epsilon` global is the
 * `epsilon` option.
 *
 * @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
 */

import type { Node } from '../../model/node.js';
import { agerr, agwarningf } from '../../common/agerr.js';
import { conjugateGradientMkernelFused, rightMultWithVectorFFFused } from './conjgrad-mkernel.js';
import {
  invertSqrtVec, invertVec, orthog1, sqrtVecF, squareVec, vectorsInnerProductF, vectorsMultAdditionF,
} from './matrix-ops.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import {
  constrainedMajorizationVpsc, deleteCMajEnvVPSC, initCMajVPSC, type CMajEnvVPSC, type IpsepOptions,
} from './quad-prog-vpsc.js';
import { generateNonoverlapConstraints, removeoverlaps } from './quad-prog-vpsc-overlap.js';
import { computeApspPacked, initLayout } from './stress-kernel.js';
import { circuitModel, computeApspArtificialWeightsPacked } from './stress-models.js';
// C defs.h MODEL_* values (init.ts), as constrained-majorization.ts takes them.
import { MODEL_CIRCUIT, MODEL_MDS, MODEL_SUBSET } from './init.js';
import { TOLERANCE_CG, mdsModel } from './stress.js';

const fr = Math.fround;

/** `#define localConstrMajorIterations` @see constrained_majorization_ipsep.c:59 */
const LOCAL_CONSTR_MAJOR_ITERATIONS = 1000;
/** C `FLT_MAX`. */
const FLT_MAX = 3.4028234663852886e38;
/** The `0.01f` floor of a cluster boundary weight. */
const CLUSTER_WEIGHT_FLOOR = fr(0.01);
/** Guard added to `old_stress` in the convergence ratio. */
const STRESS_GUARD = 1e-10;
/** Node sizes grow by this much per non-overlap stage ... */
const NSIZE_SCALE_STEP = 0.1;
/** ... until they pass this. */
const NSIZE_SCALE_LIMIT = 0.999;
/** Non-overlap constraints are generated once the scale exceeds this. */
const NSIZE_SCALE_ACTIVE = 0.001;
/** Horizontal constraints take the transitive closure from this scale. */
const TRANSITIVE_CLOSURE_SCALE = 0.5;
/** `opt->noverlap`: non-overlap constraints during layout. */
const NOVERLAP_CONSTRAINTS = 1;
/** `opt->noverlap`: remove overlaps after layout. */
const NOVERLAP_POSTPROCESS = 2;

/** `stress_majorization_cola`'s scalar arguments after `nodes` (C `Epsilon` included). */
export interface ColaOptions {
  /** Dimensionality of the layout. */
  dim: number;
  /** Distance model: C `defs.h` `MODEL_*` (the `init.ts` constants). */
  model: number;
  /** Maximum iterations. */
  maxi: number;
  /** C's global `Epsilon` (graph `epsilon`, default `DFLT_TOLERANCE`). */
  epsilon: number;
  opt: IpsepOptions;
}

/** Receives each iteration's stress, the value C prints under `-v` (360-364). */
export type ColaStressObserver = (stress: number) => void;

/** Working storage of the optimisation; `n` includes the cluster boundary variables. */
interface ColaState {
  n: number;
  origN: number;
  dim: number;
  lap2: Float32Array;
  lapLength: number;
  lap1: Float32Array;
  degrees: Float64Array;
  coords: Float32Array[];
  b: Float32Array[];
  tmpCoords: Float32Array;
  distAccumulator: Float32Array;
  constantTerm: number;
}

/** The two constraint environments. */
interface ColaEnvs {
  hor: CMajEnvVPSC;
  vrt: CMajEnvVPSC;
}

/** The loop variables C keeps across iterations. */
interface LoopState {
  iterations: number;
  converged: boolean;
  oldStress: number;
  nsizeScale: number;
}

/** Largest edge weight (C `float`). @see constrained_majorization_ipsep.c:112-116 */
function maxEdgeLength(graph: readonly DirectedVtxData[], n: number): number {
  let maxEdgeLen = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 1; j < graph[i]!.nedges; j++) {
      maxEdgeLen = fr(Math.max(graph[i]!.ewgts[j]!, maxEdgeLen));
    }
  }
  return maxEdgeLen;
}

/**
 * The packed distance matrix of the model; the circuit model warns and the
 * shortest-path model stands in when it is undefined.
 * @see constrained_majorization_ipsep.c:128-151
 */
function modelDistances(graph: DirectedVtxData[], n: number, model: number): Float32Array {
  let Dij: Float32Array | null = null;
  if (model === MODEL_SUBSET) {
    /* weight graph to separate high-degree nodes */
    /* and perform slower Dijkstra-based computation */
    Dij = computeApspArtificialWeightsPacked(graph, n);
  } else if (model === MODEL_CIRCUIT) {
    Dij = circuitModel(graph, n);
    if (!Dij) {
      agwarningf('graph is disconnected. Hence, the circuit model');
      agerr('prev', 'is undefined. Reverting to the shortest path model.');
    }
  } else if (model === MODEL_MDS) {
    Dij = mdsModel(graph, n);
  }
  Dij ??= computeApspPacked(graph, n);
  return Dij;
}

/**
 * The graph diameter (C `DistType`, an `int`). C computes it and never reads
 * it; kept so the port does the same work.
 * @see constrained_majorization_ipsep.c:158-164
 */
function diameterOf(Dij: Float32Array, n: number): number {
  let diameter = -1;
  const length = n + (n * (n - 1)) / 2;
  for (let i = 0; i < length; i++) {
    if (Dij[i]! > diameter) diameter = Math.trunc(Dij[i]!);
  }
  return diameter;
}

/**
 * Scale the layout down so its largest coordinate is 10 (no jiggling, which
 * might conflict with constraints), centre each axis, then translate y so
 * y[0] = 0.
 * @see constrained_majorization_ipsep.c:166-191
 */
function colaScaleLayout(n: number, dim: number, dCoords: Float64Array[]): void {
  let max = 1;
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) max = Math.max(max, Math.abs(dCoords[i]![j]!));
  }
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) dCoords[i]![j] = dCoords[i]![j]! * (10 / max);
  }
  for (let i = 0; i < dim; i++) orthog1(n, dCoords[i]!);
  /* for the y-coords, don't center them, but translate them so y[0]=0 */
  const y0 = dCoords[1]![0]!;
  for (let i = 0; i < n; i++) dCoords[1]![i] = dCoords[1]![i]! - y0;
}

/**
 * Extend the packed Laplacian by two boundary variables per cluster; odd
 * rows' first off-diagonal entry is `1/maxEdgeLen²` (when above 0.01).
 * @see constrained_majorization_ipsep.c:205-236
 */
function clusterLaplacian(lap2: Float32Array, n: number, nclusters: number, maxEdgeLen: number): Float32Array {
  const nn = n + nclusters * 2;
  const clap = new Float32Array(nn + (nn * (nn - 1)) / 2);
  let c0 = 0;
  let c1 = 0;
  for (let i = 0; i < nn; i++) {
    for (let j = 0; j < nn - i; j++) {
      let v: number;
      if (i < n && j < n - i) {
        v = lap2[c0++]!;
      } else if (j === 1 && i % 2 === 1) {
        /* v=j==1?i%2:0; */
        v = fr(maxEdgeLen * maxEdgeLen);
        if (v > CLUSTER_WEIGHT_FLOOR) v = fr(1.0 / v);
      } else {
        v = 0;
      }
      clap[c1++] = v;
    }
  }
  return clap;
}

/** Diagonal entries: the negated row sums. @see constrained_majorization_ipsep.c:237-253 */
function laplacianDiagonal(lap2: Float32Array, n: number, degrees: Float64Array): void {
  let count = 0;
  for (let i = 0; i < n - 1; i++) {
    let degree = 0;
    count++; /* skip main diag entry */
    for (let j = 1; j < n - i; j++, count++) {
      const val = lap2[count]!;
      degree += val;
      degrees[i + j] = degrees[i + j]! - val;
    }
    degrees[i] = degrees[i]! - degree;
  }
  for (let step = n, i = 0, c = 0; i < n; i++, c += step, step--) {
    lap2[c] = degrees[i]!;
  }
}

/** Float copies of the coordinates, zero for the cluster variables. @see constrained_majorization_ipsep.c:255-262 */
function floatCoords(dCoords: Float64Array[], dim: number, n: number, origN: number): Float32Array[] {
  const coords: Float32Array[] = [];
  for (let i = 0; i < dim; i++) {
    const c = new Float32Array(n);
    for (let j = 0; j < n; j++) c[j] = j < origN ? dCoords[i]![j]! : 0;
    coords.push(c);
  }
  return coords;
}

/**
 * Laplacian computation and the storage the optimisation needs.
 * @see constrained_majorization_ipsep.c:199-280
 */
function colaState(Dij: Float32Array, origN: number, dCoords: Float64Array[], o: ColaOptions, maxEdgeLen: number): ColaState {
  let lap2 = Dij;
  let n = origN;
  let lapLength = n + (n * (n - 1)) / 2;
  squareVec(lapLength, lap2);
  /* compute off-diagonal entries */
  invertVec(lapLength, lap2);
  const { nclusters } = o.opt.clusters;
  if (nclusters > 0) {
    lap2 = clusterLaplacian(lap2, n, nclusters, maxEdgeLen);
    n += nclusters * 2;
    lapLength = lap2.length;
  }
  /* compute diagonal entries */
  const degrees = new Float64Array(n);
  laplacianDiagonal(lap2, n, degrees);
  return {
    n, origN, dim: o.dim, lap2, lapLength, lap1: new Float32Array(0), degrees,
    coords: floatCoords(dCoords, o.dim, n, origN),
    /* compute constant term in stress sum which is \sum_{i<j} w_{ij}d_{ij}^2 */
    constantTerm: fr((n * (n - 1)) / 2),
    b: Array.from({ length: o.dim }, () => new Float32Array(n)),
    tmpCoords: new Float32Array(n),
    distAccumulator: new Float32Array(n),
  };
}

/**
 * `1/|p_i - p_j|` for j = i+1..n-1 in `distAccumulator`, overflows zeroed.
 * @see constrained_majorization_ipsep.c:303-323
 */
function pairDistances(st: ColaState, i: number, len: number): void {
  const { distAccumulator: dist, tmpCoords: tmp } = st;
  /* init 'dist_accumulator' with zeros */
  dist.fill(0, 0, st.n);
  /* put into 'dist_accumulator' all squared distances between 'i' and 'i'+1,...,'n'-1 */
  for (let k = 0; k < st.dim; k++) {
    const ck = st.coords[k]!;
    tmp.fill(ck[i]!, 0, len);
    vectorsMultAdditionF(len, tmp, -1, ck.subarray(i + 1));
    squareVec(len, tmp);
    for (let x = 0; x < len; x++) dist[x] = tmp[x]! + dist[x]!; // vectors_additionf
  }
  /* convert to 1/d_{ij} */
  invertSqrtVec(len, dist);
  /* detect overflows */
  for (let j = 0; j < len; j++) {
    if (dist[j]! >= FLT_MAX || dist[j]! < 0) dist[j] = 0;
  }
}

/** The Laplacian of `1/(d_ij*|p_i-p_j|)`. @see constrained_majorization_ipsep.c:298-336 */
function buildLap1(st: ColaState): void {
  const { n, lap1, degrees } = st;
  degrees.fill(0);
  sqrtVecF(st.lapLength, st.lap2, lap1);
  let count = 0;
  for (let i = 0; i < n - 1; i++) {
    const len = n - i - 1;
    pairDistances(st, i, len);
    count++; /* save place for the main diagonal entry */
    let degree = 0;
    for (let j = 0; j < len; j++, count++) {
      // C `val = lap1[count] *= ...` is the stored float; a JS assignment yields the double.
      const val = (lap1[count] = fr(lap1[count]! * st.distAccumulator[j]!));
      degree += val;
      degrees[i + j + 1] = degrees[i + j + 1]! - val;
    }
    degrees[i] = degrees[i]! - degree;
  }
  for (let step = n, i = 0, c = 0; i < n; i++, c += step, step--) {
    lap1[c] = degrees[i]!;
  }
}

/**
 * `b = lap1 * X`, then the stress (the Laplacians are negated, so subtract
 * instead of add and vice versa).
 * @see constrained_majorization_ipsep.c:338-357
 */
function computeStress(st: ColaState): number {
  for (let k = 0; k < st.dim; k++) {
    /* b[k] := lap1*coords[k] */
    rightMultWithVectorFFFused(st.lap1, st.n, st.coords[k]!, st.b[k]!);
  }
  let newStress = 0;
  for (let k = 0; k < st.dim; k++) newStress += vectorsInnerProductF(st.n, st.coords[k]!, st.b[k]!);
  newStress *= 2;
  newStress += st.constantTerm; /* only after mult by 2 */
  for (let k = 0; k < st.dim; k++) {
    rightMultWithVectorFFFused(st.lap2, st.n, st.coords[k]!, st.tmpCoords);
    newStress -= vectorsInnerProductF(st.n, st.coords[k]!, st.tmpCoords);
  }
  return newStress;
}

/**
 * In determining non-overlap constraints, gradually scale up the size of
 * nodes to avoid local minima: each stage restarts the iteration count.
 * @see constrained_majorization_ipsep.c:374-385
 */
function scaleUpNodes(s: LoopState, maxi: number, opt: IpsepOptions): void {
  if ((s.iterations >= maxi - 1 || s.converged) && opt.noverlap === NOVERLAP_CONSTRAINTS
    && s.nsizeScale < NSIZE_SCALE_LIMIT) {
    s.nsizeScale += NSIZE_SCALE_STEP;
    s.iterations = 0;
    s.converged = false;
  }
}

/** Is a non-overlap pass due? (`noverlap == 1 && nsizeScale > 0.001`) */
const overlapDue = (opt: IpsepOptions, nsizeScale: number): boolean =>
  opt.noverlap === NOVERLAP_CONSTRAINTS && nsizeScale > NSIZE_SCALE_ACTIVE;

/**
 * The new x: VPSC with constraints, else (considerably faster) conjugate
 * gradient. Returns -1 where C jumps to `finish`.
 * @see constrained_majorization_ipsep.c:400-418
 */
function solveHorizontal(st: ColaState, e: CMajEnvVPSC, nsizeScale: number, opt: IpsepOptions): number {
  if (overlapDue(opt, nsizeScale)) {
    generateNonoverlapConstraints(e, {
      nsizeScale: fr(nsizeScale), coords: st.coords, k: 0,
      transitiveClosure: nsizeScale >= TRANSITIVE_CLOSURE_SCALE, opt,
    });
  }
  if (e.m > 0) {
    constrainedMajorizationVpsc(e, st.b[0]!, st.coords[0]!, LOCAL_CONSTR_MAJOR_ITERATIONS);
  } else if (conjugateGradientMkernelFused(st.lap2, st.coords[0]!, st.b[0]!, st.n, {
    tol: TOLERANCE_CG, maxIterations: st.n,
  }) < 0) {
    // conjugate_gradient_mkernel returns 0 or 1, so C never takes this jump.
    /* v8 ignore next -- @preserve */
    return -1;
  }
  return 0;
}

/**
 * The new y, as {@link solveHorizontal} (no transitive closure).
 * @see constrained_majorization_ipsep.c:419-432
 */
function solveVertical(st: ColaState, e: CMajEnvVPSC, nsizeScale: number, opt: IpsepOptions): number {
  if (overlapDue(opt, nsizeScale)) {
    generateNonoverlapConstraints(e, { nsizeScale: fr(nsizeScale), coords: st.coords, k: 1, transitiveClosure: false, opt });
  }
  if (e.m > 0) {
    // constrained_majorization_vpsc returns its iteration count, so C never takes this jump.
    /* v8 ignore next -- @preserve */
    if (constrainedMajorizationVpsc(e, st.b[1]!, st.coords[1]!, LOCAL_CONSTR_MAJOR_ITERATIONS) < 0) return -1;
  } else {
    conjugateGradientMkernelFused(st.lap2, st.coords[1]!, st.b[1]!, st.n, { tol: TOLERANCE_CG, maxIterations: st.n });
  }
  return 0;
}

/**
 * The majorization loop with cola's convergence test (a decrease below
 * `Epsilon`, relative). Returns the iteration count, -1 on a `finish` jump.
 * @see constrained_majorization_ipsep.c:295-433
 */
function iterate(st: ColaState, envs: ColaEnvs, o: ColaOptions, observe: ColaStressObserver | null): number {
  const s: LoopState = { iterations: 0, converged: false, oldStress: Number.MAX_VALUE, nsizeScale: 0 };
  for (; s.iterations < o.maxi && !s.converged; s.iterations++) {
    buildLap1(st);
    const newStress = computeStress(st);
    observe?.(newStress);
    s.converged = newStress < s.oldStress
      && Math.abs(newStress - s.oldStress) / Math.abs(s.oldStress + STRESS_GUARD) < o.epsilon;
    /* in first iteration we allowed stress increase, which might result ny imposing constraints */
    s.oldStress = newStress;
    scaleUpNodes(s, o.maxi, o.opt);
    if (solveHorizontal(st, envs.hor, s.nsizeScale, o.opt) < 0) return -1;
    if (solveVertical(st, envs.vrt, s.nsizeScale, o.opt) < 0) return -1;
  }
  return s.iterations;
}

/**
 * The constraint environments, the loop, and the overlap post-process.
 * `initCMajVPSC` failing jumps to `finish` (-1) as in C, skipping the deletes.
 * @see constrained_majorization_ipsep.c:282-293, 434-444
 */
function optimize(st: ColaState, graph: DirectedVtxData[], o: ColaOptions, observe: ColaStressObserver | null): number {
  const hor = initCMajVPSC(st.n, st.lap2, graph, o.opt, 0);
  // diredges 0 never reaches compute_hierarchy, so this is never NULL.
  /* v8 ignore next -- @preserve */
  if (hor === null) return -1;
  const vrt = initCMajVPSC(st.n, st.lap2, graph, o.opt, o.opt.diredges);
  // initCMajVPSC's digcola NULL is unreachable (quad-prog-vpsc.ts).
  /* v8 ignore next -- @preserve */
  if (vrt === null) return -1;
  st.lap1 = new Float32Array(st.lapLength);
  const iterations = iterate(st, { hor, vrt }, o, observe);
  /* v8 ignore next -- @preserve */
  if (iterations < 0) return iterations;
  deleteCMajEnvVPSC(hor);
  deleteCMajEnvVPSC(vrt);
  if (o.opt.noverlap === NOVERLAP_POSTPROCESS) {
    removeoverlaps(st.origN, st.coords, o.opt);
  }
  return iterations;
}

/** Copy the real nodes' coordinates back. @see constrained_majorization_ipsep.c:446-455 */
function writeBack(st: ColaState, dCoords: Float64Array[]): void {
  for (let i = 0; i < st.dim; i++) {
    for (let j = 0; j < st.origN; j++) dCoords[i]![j] = st.coords[i]![j]!;
  }
}

/**
 * {@link stressMajorizationCola} reporting each iteration's stress to
 * `observe`. Internal: for tests, not exported from the package.
 * @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
 */
export function stressMajorizationColaTraced(
  graph: DirectedVtxData[], n: number, dCoords: Float64Array[], nodes: Node[],
  o: ColaOptions & { observe: ColaStressObserver | null },
): number {
  // C ignores initLayout's pinned result: cola has no pinned-node branch.
  initLayout(n, o.dim, dCoords, nodes);
  if (n === 1) return 0;
  const maxEdgeLen = maxEdgeLength(graph, n);
  /* Compute the all-pairs-shortest-distances matrix */
  if (o.maxi === 0) return 0;
  const Dij = modelDistances(graph, n, o.model);
  diameterOf(Dij, n);
  colaScaleLayout(n, o.dim, dCoords);
  const st = colaState(Dij, n, dCoords, o, maxEdgeLen);
  const iterations = optimize(st, graph, o, o.observe);
  writeBack(st, dCoords);
  return iterations;
}

/**
 * Stress majorization subject to separation constraints: directed-edge
 * (`diredges` 1) or DiG-CoLa level (2) constraints, cluster containment, and
 * node non-overlap during (`noverlap` 1) or after (2) layout. Mutates
 * `dCoords`; returns C's value (iterations, -1 on error, 0 for n == 1 or
 * maxi == 0). C has no `maxi < 0` return here: `neatoLayout` returns before.
 * @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
 */
export function stressMajorizationCola(
  graph: DirectedVtxData[], n: number, dCoords: Float64Array[], nodes: Node[], o: ColaOptions,
): number {
  return stressMajorizationColaTraced(graph, n, dCoords, nodes, { ...o, observe: null });
}
