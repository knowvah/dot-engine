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
