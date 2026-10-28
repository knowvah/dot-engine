// SPDX-License-Identifier: EPL-2.0

/**
 * `conjugate_gradient_mkernel` and `right_mult_with_vector_ff` as the 16.1
 * oracle executes them. The oracle is built `-O3 -flto=thin` for arm64, so a
 * C statement `a += b * c` on floats is one `fmadd`/`fmla` (clang's default
 * contraction), and a reduction the vectoriser took in blocks of 16 rounds
 * the products of those leading elements before its in-order adds (strict FP
 * forbids reassociation) while the scalar remainder is fused. These kernels run
 * `stress_majorization_kD_mkernel` and the constrained-majorization driver.
 *
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_ff
 */

import { agerrorf } from '../../common/agerr.js';
import {
  copyVectorF, maxAbsF, orthog1f, vectorsInnerProductF, vectorsSubtractionF,
} from './matrix-ops.js';
import { fmaf } from './quad-prog-solve.js';

const fr = Math.fround;

/** Width of the vectorised reduction block of `right_mult_with_vector_ff`. */
const RIGHT_MULT_BLOCK = 16;

/** The unexpected-zero-residual diagnostic. @see lib/neatogen/conjgrad.c */
const ZERO_LENGTH_MESSAGE = 'conjugate_gradient: unexpected length 0 vector\n';

/**
 * `result = packed_matrix * vector` for the packed upper triangle of a
 * symmetric matrix: per row the first `16*floor(len/16)` products of the
 * reduction are rounded before their adds, the rest fused; the scatter into
 * `result[j]` is fused throughout.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_ff
 */
export function rightMultWithVectorFFFused(
  m: Float32Array, n: number, vector: Float32Array, result: Float32Array,
): void {
  for (let i = 0; i < n; i++) result[i] = 0;
  let index = 0;
  for (let i = 0; i < n; i++) {
    const vi = vector[i]!;
    let res = fmaf(m[index++]!, vi, 0); // deal with main diag
    const len = n - i - 1;
    const blockEnd = i + 1 + (len - (len % RIGHT_MULT_BLOCK));
    for (let j = i + 1; j < n; j++, index++) {
      const mij = m[index]!;
      res = j < blockEnd ? fr(res + fr(mij * vector[j]!)) : fmaf(mij, vector[j]!, res);
      result[j] = fmaf(mij, vi, result[j]!);
    }
    result[i] = result[i]! + res;
  }
}

/** `vector1 += alpha * vector2`, fused. @see lib/neatogen/matrix_ops.c:vectors_mult_additionf */
function vectorsMultAdditionFused(n: number, v1: Float32Array, alpha: number, v2: Float32Array): void {
  for (let i = 0; i < n; i++) v1[i] = fmaf(alpha, v2[i]!, v1[i]!);
}

/** Conjugate-gradient working vectors and the running `r.r`. */
interface CgState {
  n: number;
  r: Float32Array;
  p: Float32Array;
  Ap: Float32Array;
  rR: number;
}

/** What one conjugate-gradient iteration decided. */
const CgStep = { CONTINUE: 0, STOP: 1, ERROR: 2 } as const;

/** Options of {@link conjugateGradientMkernelFused} (C's trailing `tol`, `max_iterations`). */
export interface CgMkernelOptions {
  tol: number;
  maxIterations: number;
}

/**
 * The residual `r = b - A*x` of the centred inputs, and `p = r`.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
function initialState(A: Float32Array, x: Float32Array, b: Float32Array, n: number): CgState {
  const Ax = new Float32Array(n);
  const st: CgState = { n, r: new Float32Array(n), p: new Float32Array(n), Ap: new Float32Array(n), rR: 0 };
  orthog1f(n, x); // centering x and b
  orthog1f(n, b);
  rightMultWithVectorFFFused(A, n, x, Ax);
  orthog1f(n, Ax); // centering Ax
  vectorsSubtractionF(n, b, Ax, st.r);
  copyVectorF(n, st.r, st.p);
  st.rR = vectorsInnerProductF(n, st.r, st.r);
  return st;
}

/**
 * One iteration: the step along `p`, then (unless last) the new residual and
 * search direction.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
function cgIteration(A: Float32Array, x: Float32Array, st: CgState, last: boolean): number {
  const { n, r, p, Ap } = st;
  orthog1f(n, p);
  orthog1f(n, x);
  orthog1f(n, r);
  rightMultWithVectorFFFused(A, n, p, Ap);
  orthog1f(n, Ap); // centering Ap
  const pAp = vectorsInnerProductF(n, p, Ap);
  if (pAp === 0) return CgStep.STOP;
  const alpha = st.rR / pAp;
  vectorsMultAdditionFused(n, x, fr(alpha), p); // derive new x
  if (last) return CgStep.CONTINUE;
  vectorsMultAdditionFused(n, r, fr(-alpha), Ap);
  const rRNew = vectorsInnerProductF(n, r, r);
  if (st.rR === 0) {
    agerrorf(ZERO_LENGTH_MESSAGE);
    return CgStep.ERROR;
  }
  const beta = fr(rRNew / st.rR);
  st.rR = rRNew;
  for (let j = 0; j < n; j++) p[j] = fmaf(beta, p[j]!, r[j]!);
  return CgStep.CONTINUE;
}

/**
 * Solve `A*x = b` by conjugate gradients, `A` packed symmetric; `x` and `b` are
 * centred. Returns 1 on an unexpected zero residual, else 0.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
export function conjugateGradientMkernelFused(
  A: Float32Array, x: Float32Array, b: Float32Array, n: number, o: CgMkernelOptions,
): number {
  const st = initialState(A, x, b, n);
  for (let i = 0; i < o.maxIterations && maxAbsF(n, st.r) > o.tol; i++) {
    const step = cgIteration(A, x, st, i >= o.maxIterations - 1);
    if (step === CgStep.STOP) break;
    if (step === CgStep.ERROR) return 1;
  }
  return 0;
}
