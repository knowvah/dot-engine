// SPDX-License-Identifier: EPL-2.0
import { fma } from '../../src/common/fma.js';

/**
 * x^1.5 for finite x > 0, in double-double arithmetic: the same bits on every
 * platform, because it uses only IEEE +, *, / and sqrt. On 5M samples it never
 * missed the BigInt-checked correct rounding.
 *
 * A test uses it as the base of a replayed libm pow; see kk-large.pow.json.
 */
export function exactPow15(x: number): number {
  const s = Math.sqrt(x);
  const e = fma(-s, s, x) / (2 * s);
  const p = x * s;
  return p + (fma(x, s, -p) + x * e);
}
