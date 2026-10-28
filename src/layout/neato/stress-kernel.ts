// SPDX-License-Identifier: EPL-2.0

/**
 * Dense k-D stress majorization — a float32-faithful port of
 * stress_majorization_kD_mkernel and conjugate_gradient_mkernel.
 * Replicates C numerics exactly (decision D3): float storage and
 * chained-operation rounding via Math.fround, double accumulators
 * where C uses double/long double (long double == double on AArch64
 * macOS, where the reference SVGs were generated).
 *
 * smart_init (sparse subspace estimation) is not ported — no `start`
 * attr in the suite, so checkStart always yields INIT_RANDOM.
 *
 * @see lib/neatogen/stress.c:stress_majorization_kD_mkernel
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */

import type { Node } from '../../model/node.js';
import { drand48 } from '../../common/random.js';
import { bfs } from './bfs.js';
import { dijkstra, type VtxData } from './dijkstra.js';
import {
  conjugateGradientMkernelFused, rightMultWithVectorFFFused, type CgMkernelOptions,
} from './conjgrad-mkernel.js';
import {
  copyVectorF,
  invertSqrtVec,
  invertVec,
  orthog1,
  rightMultWithVectorFF,
  sqrtVecF,
  squareVec,
  vectorsInnerProductF,
} from './matrix-ops.js';
import { fmaf } from './quad-prog-solve.js';
import { OPT_EXP_FLAG, TOLERANCE_CG } from './stress.js';

const fr = Math.fround;

/**
 * Packed all-pairs shortest paths over unit weights (BFS hops).
 * @see lib/neatogen/stress.c:compute_apsp_packed
 */
export function computeApspPacked(graph: VtxData[], n: number): Float32Array {
  const Dij = new Float32Array((n * (n + 1)) / 2);
  const Di = new Int32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    bfs(i, graph, n, Di);
    for (let j = i; j < n; j++) Dij[count++] = Di[j]!;
  }
  return Dij;
}

/**
 * Packed all-pairs shortest paths over float edge lengths.
 * @see lib/neatogen/stress.c:compute_weighted_apsp_packed
 */
export function computeWeightedApspPacked(graph: VtxData[], n: number): Float32Array {
  const Dij = new Float32Array((n * (n + 1)) / 2);
  const Di = new Float32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    dijkstra(i, graph, n, Di);
    for (let j = i; j < n; j++) Dij[count++] = Di[j]!;
  }
  return Dij;
}

/**
 * Has the node a user-supplied position? The TS model tracks pinned
 * as a boolean (C distinguishes P_SET/P_PIN; no suite input pins).
 * @see lib/neatogen/stress.c:hasPos
 */
function hasPos(n: Node): boolean {
  // C hasPos = ND_pinned > 0 = P_SET (user pos=) OR P_PIN (pinned). posSet
  // covers both (userPos sets it for every pos=; pinned is the P_PIN subset).
  return n.info.posSet === true || n.info.pinned === true;
}

/** Is the node pinned? @see lib/neatogen/stress.c:isFixed (P_PIN) */
function isFixed(n: Node): boolean {
  return n.info.pinned === true;
}

/**
 * Random (drand48) or user-position layout initialisation; centers
 * each axis. Returns true if some node is pinned.
 * @see lib/neatogen/stress.c:initLayout
 */
export function initLayout(
  n: number, dim: number, coords: Float64Array[], nodes: Node[],
): boolean {
  let pinned = false;
  for (let i = 0; i < n; i++) {
    const np = nodes[i]!;
    if (hasPos(np)) {
      coords[0]![i] = np.info.pos?.[0] ?? 0;
      coords[1]![i] = np.info.pos?.[1] ?? 0;
      if (isFixed(np)) pinned = true;
    } else {
      coords[0]![i] = drand48();
      coords[1]![i] = drand48();
      for (let d = 2; d < dim; d++) coords[d]![i] = drand48();
    }
  }
  for (let d = 0; d < dim; d++) orthog1(n, coords[d]!);
  return pinned;
}

/** The right-multiply and conjugate-gradient kernels one caller runs. */
interface KernelOps {
  /** `acc + tmp*tmp`, the distance accumulation of the Laplacian build. */
  squareAdd(tmp: number, acc: number): number;
  rightMult(m: Float32Array, n: number, vector: Float32Array, result: Float32Array): void;
  /** Returns nonzero on an unexpected zero residual. */
  cg(A: Float32Array, x: Float32Array, b: Float32Array, n: number, o: CgMkernelOptions): number;
}

/** The oracle's fused kernels, as `stress_majorization_kD_mkernel` runs them. */
const FUSED_OPS: KernelOps = {
  squareAdd: (tmp, acc) => fmaf(tmp, tmp, acc),
  rightMult: rightMultWithVectorFFFused, cg: conjugateGradientMkernelFused,
};
/**
 * The kernels as `stress_majorization_cola` (mode=ipsep) runs them: its squared
 * distances are `square_vec` then `vectors_additionf` (two loops, so the product
 * is rounded before the add), its inlined `right_mult_with_vector_ff` copy is not
 * read from the disassembly (kept unfused), and its conjugate gradient is the same
 * out-of-line `conjugate_gradient_mkernel` the kD kernel calls.
 * @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
 */
const COLA_OPS: KernelOps = {
  squareAdd: (tmp, acc) => acc + fr(tmp * tmp),
  rightMult: rightMultWithVectorFF, cg: conjugateGradientMkernelFused,
};

/** Laplacian off-diagonal prep + diagonal degrees. @see stress.c (Laplacian computation) */
function buildLap2(lap2: Float32Array, n: number, exp: number): void {
  const lapLength = (n * (n + 1)) / 2;
  if (exp === 2) squareVec(lapLength, lap2);
  invertVec(lapLength, lap2);
  const degrees = new Float64Array(n);
  let count = 0;
  for (let i = 0; i < n - 1; i++) {
    let degree = 0;
    count++; // skip main diag entry
    for (let j = 1; j < n - i; j++, count++) {
      const val = lap2[count]!;
      degree += val;
      degrees[i + j] = degrees[i + j]! - val;
    }
    degrees[i] = degrees[i]! - degree;
  }
  count = 0;
  for (let i = 0, step = n; i < n; i++, count += step, step--) {
    lap2[count] = degrees[i]!;
  }
}

/** Per-iteration Laplacian of 1/(d_ij*|p_i-p_j|). @see stress.c (main loop head) */
function buildLap1(
  lap1: Float32Array, lap2: Float32Array, coords: Float32Array[],
  shape: { n: number; dim: number; exp: number; ops: KernelOps },
): void {
  const { n, dim, exp, ops } = shape;
  const lapLength = (n * (n + 1)) / 2;
  const degrees = new Float64Array(n);
  const distAccumulator = new Float32Array(n);
  if (exp === 2) sqrtVecF(lapLength, lap2, lap1);
  let count = 0;
  for (let i = 0; i < n - 1; i++) {
    const len = n - i - 1;
    for (let x = 0; x < len; x++) distAccumulator[x] = 0;
    for (let k = 0; k < dim; k++) {
      const ck = coords[k]!;
      for (let x = 0; x < len; x++) {
        const tmp = fr(ck[i]! + fr(-1 * ck[i + 1 + x]!));
        distAccumulator[x] = ops.squareAdd(tmp, distAccumulator[x]!);
      }
    }
    invertSqrtVec(len, distAccumulator);
    for (let j = 0; j < len; j++) {
      const da = distAccumulator[j]!;
      if (da >= 3.4028234663852886e38 || da < 0) distAccumulator[j] = 0;
    }
    count++; // main diagonal entry placeholder
    let degree = 0;
    if (exp === 2) {
      for (let j = 0; j < len; j++, count++) {
        const val = (lap1[count] = fr(lap1[count]! * distAccumulator[j]!));
        degree += val;
        degrees[i + j + 1] = degrees[i + j + 1]! - val;
      }
    } else {
      for (let j = 0; j < len; j++, count++) {
        const val = (lap1[count] = distAccumulator[j]!);
        degree += val;
        degrees[i + j + 1] = degrees[i + j + 1]! - val;
      }
    }
    degrees[i] = degrees[i]! - degree;
  }
  count = 0;
  for (let i = 0, step = n; i < n; i++, count += step, step--) {
    lap1[count] = degrees[i]!;
  }
}

/** Inputs for the kernel main loop. */
interface KernelState {
  n: number;
  dim: number;
  exp: number;
  lap1: Float32Array;
  lap2: Float32Array;
  coords: Float32Array[];
  b: Float32Array[];
  tmpCoords: Float32Array;
  constantTerm: number;
  ops: KernelOps;
}

/** One stress evaluation. @see stress.c (compute new stress block) */
function computeStress(st: KernelState): number {
  let stress = 0;
  for (let k = 0; k < st.dim; k++) {
    st.ops.rightMult(st.lap1, st.n, st.coords[k]!, st.b[k]!);
    stress += vectorsInnerProductF(st.n, st.coords[k]!, st.b[k]!);
  }
  stress *= 2;
  stress += st.constantTerm;
  for (let k = 0; k < st.dim; k++) {
    st.ops.rightMult(st.lap2, st.n, st.coords[k]!, st.tmpCoords);
    stress -= vectorsInnerProductF(st.n, st.coords[k]!, st.tmpCoords);
  }
  return stress;
}

/** Solve one axis, respecting pinned nodes; nonzero on a CG error. @see stress.c (CG block) */
function solveAxis(st: KernelState, k: number, havePinned: boolean, nodes: Node[]): number {
  const cg = { tol: TOLERANCE_CG, maxIterations: st.n };
  if (!havePinned) {
    return st.ops.cg(st.lap2, st.coords[k]!, st.b[k]!, st.n, cg);
  }
  copyVectorF(st.n, st.coords[k]!, st.tmpCoords);
  const rc = st.ops.cg(st.lap2, st.tmpCoords, st.b[k]!, st.n, cg);
  if (rc !== 0) return rc;
  for (let i = 0; i < st.n; i++) {
    if (!isFixed(nodes[i]!)) st.coords[k]![i] = st.tmpCoords[i]!;
  }
  return 0;
}

/** Options for stressMajorizationKDMkernel. */
export interface StressOpts {
  dim: number;
  /** opt_exp_flag (2 = squared weights, default) | opt_smart_init. */
  opts: number;
  /** MODEL_* — only the resulting Dij matters here; pass it in. */
  maxi: number;
  epsilon: number;
  /** Run the kernels as `stress_majorization_cola` does (mode=ipsep). */
  cola?: boolean;
}

/**
 * Dense stress majorization. Mutates dCoords in place; returns the
 * iteration count (negative on error).
 * @see lib/neatogen/stress.c:stress_majorization_kD_mkernel
 */
export function stressMajorizationKDMkernel(
  Dij: Float32Array, n: number, dCoords: Float64Array[], nodes: Node[], o: StressOpts,
): number {
  const { dim, maxi } = o;
  const exp = o.opts & OPT_EXP_FLAG;
  if (maxi < 0) return 0;
  const havePinned = initLayout(n, dim, dCoords, nodes);
  if (n === 1 || maxi === 0) return 0;

  const coords: Float32Array[] = [];
  for (let i = 0; i < dim; i++) {
    const c = new Float32Array(n);
    for (let j = 0; j < n; j++) c[j] = fr(dCoords[i]![j]!);
    coords.push(c);
  }
  const constantTerm = fr((n * (n - 1)) / 2);
  const lap2 = Dij;
  buildLap2(lap2, n, exp);

  const lapLength = (n * (n + 1)) / 2;
  const st: KernelState = {
    n, dim, exp, lap2,
    lap1: new Float32Array(lapLength),
    coords,
    b: Array.from({ length: dim }, () => new Float32Array(n)),
    tmpCoords: new Float32Array(n),
    constantTerm,
    ops: o.cola === true ? COLA_OPS : FUSED_OPS,
  };

  let oldStress = Number.MAX_VALUE;
  let converged = false;
  let iterations = 0;
  for (; iterations < maxi && !converged; iterations++) {
    buildLap1(st.lap1, lap2, coords, { n, dim, exp, ops: st.ops });
    const newStress = computeStress(st);
    if (typeof process !== 'undefined' && process.env['STRESS_DEBUG'] && iterations % 5 === 0) console.error(newStress.toFixed(3));
    const change = Math.abs(oldStress - newStress);
    converged = change / oldStress < o.epsilon || newStress < o.epsilon;
    oldStress = newStress;
    for (let k = 0; k < dim; k++) {
      if (solveAxis(st, k, havePinned, nodes) !== 0) return -1;
    }
  }

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) dCoords[i]![j] = coords[i]![j]!;
  }
  return iterations;
}
