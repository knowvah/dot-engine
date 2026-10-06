// SPDX-License-Identifier: EPL-2.0

/**
 * `hypot(a, b)` as the native build host's libm computes it, bit for bit.
 *
 * Graphviz calls libm `hypot`; V8's `Math.hypot` and `sqrt(a*a + b*b)` each
 * round differently in the last bit for some inputs, and fdp's force loop
 * amplifies one-ulp differences into visibly different layouts. The reference
 * build's libm (macOS arm64 libSystem) matches this model exactly on 400k
 * sampled inputs, including subnormal, near-overflow, zero, inf and NaN
 * operands: order the magnitudes, rescale by 2^∓600 outside [2^-500, 2^500],
 * then `sqrt(fma(small, small, big*big))`. It is within one ulp of the
 * correctly rounded result (glibc's hypot can differ in that last bit).
 *
 * @see docs/known-divergences.md (host libm)
 */

import { fma } from './fma.js';

/** Rescale thresholds and factor of the reference libm. */
const BIG = 2 ** 500;
const SMALL = 2 ** -500;
const SCALE_UP = 2 ** 600;
const SCALE_DOWN = 2 ** -600;

/** libm `hypot(a, b)` of the native build host. */
export function libmHypot(a: number, b: number): number {
  if (a === Infinity || a === -Infinity || b === Infinity || b === -Infinity) return Infinity;
  let x = Math.abs(a);
  let y = Math.abs(b);
  if (x < y) [x, y] = [y, x];
  if (x > BIG) return core(x * SCALE_DOWN, y * SCALE_DOWN) * SCALE_UP;
  if (x < SMALL) return core(x * SCALE_UP, y * SCALE_UP) * SCALE_DOWN;
  return core(x, y);
}

/** sqrt(y·y + x·x) with the y·y product fused (x ≥ y ≥ 0). */
function core(x: number, y: number): number {
  return Math.sqrt(fma(y, y, x * x));
}
