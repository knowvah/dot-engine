// SPDX-License-Identifier: EPL-2.0

/**
 * agwrite's `linelength` handling: the root's `linelength` sets C's static
 * `Max_outputline` for the duration of one write, and 128 is restored after.
 *
 * @see lib/cgraph/write.c:agwrite (670-677, 692)
 */

import type { Graph } from '../../model/graph.js';
import { MAX_OUTPUTLINE, MIN_OUTPUTLINE, setMaxOutputline } from '../map.js';

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
