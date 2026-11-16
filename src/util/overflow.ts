// SPDX-License-Identifier: EPL-2.0
/**
 * Overflow-checked arithmetic helpers.
 *
 * @see lib/util/overflow.h
 */

// C's INT_MAX / INT_MIN for a 32-bit int.
const INT_MAX = 2_147_483_647;
const INT_MIN = -2_147_483_648;

/**
 * Add two integers, clamping to lower and upper type bounds.
 *
 * Returns the sum `a + b`, or `INT_MAX`/`INT_MIN` on overflow/underflow. C's
 * operands are `int`; the port applies the same three branches to its numbers
 * as they are, with no int32 wrap of the inputs.
 * @see lib/util/overflow.h:sadd_saturate
 */
export function saddSaturate(a: number, b: number): number {
  // overflow?
  if (b > 0 && INT_MAX - b < a) {
    return INT_MAX;
  }

  // underflow?
  if (b < 0 && INT_MIN - b > a) {
    return INT_MIN;
  }

  return a + b;
}

/**
 * Divide two double floating-point values, checking for overflow.
 *
 * Returns the quotient `n / d`, or `null` where C returns `true` and leaves
 * `*res` as it was: the quotient is not finite (a zero or subnormal divisor,
 * a non-finite operand, or a result past `DBL_MAX`). A call site writes C's
 * "assign the fallback, then overwrite on success" as `fdivOverflow(n, d) ??
 * fallback`; a zero quotient is a result, and `??` keeps it.
 * @see lib/util/overflow.h:fdiv_overflow
 */
export function fdivOverflow(n: number, d: number): number | null {
  const r = n / d;

  // did we overflow?
  if (!Number.isFinite(r)) {
    return null;
  }

  return r;
}

/**
 * Divide two floating-point values, checking for overflow.
 *
 * The `float` twin of {@link fdivOverflow}. C's parameters and quotient are
 * `float`, so the operands and the quotient are rounded to float32: a
 * quotient past `FLT_MAX` is an overflow here though it is finite as a
 * double. Dividing two float32 values in double and rounding once gives
 * IEEE single division's result (53 >= 2 * 24 + 2 bits).
 * @see lib/util/overflow.h:fdivf_overflow
 */
export function fdivfOverflow(n: number, d: number): number | null {
  const r = Math.fround(Math.fround(n) / Math.fround(d));

  // did we overflow?
  if (!Number.isFinite(r)) {
    return null;
  }

  return r;
}
