// SPDX-License-Identifier: EPL-2.0

/**
 * Exact port of the POSIX drand48/srand48 48-bit linear congruential
 * generator used by the C layout engines (decision D3: iterative
 * engines must replicate C numerics bit-for-bit; Math.random is
 * forbidden in layout code).
 *
 * X(n+1) = (a * X(n) + c) mod 2^48, a = 0x5DEECE66D, c = 0xB.
 * drand48() returns X(n+1) / 2^48 as a double.
 * srand48(seed) sets X = (seed << 16) | 0x330E.
 *
 * @see POSIX drand48(3)
 * @see lib/neatogen/neatoinit.c:checkStart (srand48 call)
 */

import { registerRenderState } from './render-state.js';

const A = BigInt('0x5deece66d');
const C = BigInt('0xb');
const MASK48 = (1n << 48n) - 1n;
const TWO48 = 2 ** 48;
/**
 * Unseeded generator state: libc's X0 = 0x1234ABCD330E (rand48 seed words
 * 0x1234, 0xABCD, 0x330E); verified on the reference machine — an unseeded
 * drand48() returns 0.39646477376027534.
 * @see POSIX drand48(3)
 */
const UNSEEDED_STATE = 0x1234abcd330en;

let state = UNSEEDED_STATE;
registerRenderState(() => { state = UNSEEDED_STATE; });

/**
 * Seed the generator: X = (seed << 16) | 0x330E (low 32 bits of seed).
 * @see POSIX srand48(3)
 */
export function srand48(seed: number): void {
  const s = BigInt(Math.trunc(seed)) & 0xffffffffn;
  state = ((s << 16n) | 0x330en) & MASK48;
}

/** Next double in [0, 1). @see POSIX drand48(3) */
export function drand48(): number {
  state = (A * state + C) & MASK48;
  return Number(state) / TWO48;
}
