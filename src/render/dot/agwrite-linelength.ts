// SPDX-License-Identifier: EPL-2.0

/**
 * agwrite's `linelength` handling: the root's `linelength` sets C's static
 * `Max_outputline` for the duration of one write, and 128 is restored after.
 *
 * @see lib/cgraph/write.c:agwrite (670-677, 692)
 */

import type { Graph } from '../../model/graph.js';

/** Default line-break threshold. @see lib/cgraph/write.c:MAX_OUTPUTLINE */
export const MAX_OUTPUTLINE = 128;

/** Smallest nonzero `linelength` agwrite accepts. @see lib/cgraph/write.c:MIN_OUTPUTLINE */
export const MIN_OUTPUTLINE = 60;

/** C's static `Max_outputline` (write.c): agwrite sets it from the root's
 * `linelength` and restores {@link MAX_OUTPUTLINE} after, so the plain path
 * (direct agstrcanon, no agwrite) observes the default. 0 disables breaking.
 * Single-threaded, set and restored synchronously around one serialize.
 * @see lib/cgraph/write.c:44,676,692 */
let maxOutputlineValue = MAX_OUTPUTLINE;

/** `Max_outputline`, as `_write_canonstr` reads it. @see lib/cgraph/write.c:_write_canonstr */
export function maxOutputline(): number { return maxOutputlineValue; }

/** Set `Max_outputline`. @see lib/cgraph/write.c:agwrite */
function setMaxOutputline(n: number): void { maxOutputlineValue = n; }

/** `INT_MAX`, the upper bound agwrite accepts for `linelength`. */
const INT_MAX = 2147483647;

/**
 * The `Max_outputline` agwrite would set for `s` (the root's `linelength`), or
 * `undefined` when C leaves it unchanged: C needs a leading digit, then
 * `strtoul` (which stops at the first non-digit), and accepts 0 or
 * ≥ MIN_OUTPUTLINE up to INT_MAX.
 * @see lib/cgraph/write.c:agwrite (670-677)
 */
export function linelengthOf(s: string | undefined): number | undefined {
  if (s === undefined || !/^[0-9]/.test(s)) return undefined;
  const len = Number(/^[0-9]+/.exec(s)![0]);
  if ((len === 0 || len >= MIN_OUTPUTLINE) && len <= INT_MAX) return len;
  return undefined;
}

/** Run `write` with `Max_outputline` set from `g`'s `linelength`, restoring 128
 * after. @see lib/cgraph/write.c:agwrite */
export function withLinelength(g: Graph, write: () => string): string {
  const len = linelengthOf(g.attrs.get('linelength'));
  if (len !== undefined) setMaxOutputline(len);
  try {
    return write();
  } finally {
    setMaxOutputline(MAX_OUTPUTLINE);
  }
}
