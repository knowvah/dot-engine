// SPDX-License-Identifier: EPL-2.0
import type { Graph } from '../model/graph.js';
import { lateDouble } from './nodeinit.js';

/** C's POINTS_PER_INCH, the value `inputscale=0` resolves to. */
const POINTS_PER_INCH = 72;

/**
 * Effective inputscale for a layout run (C's PSinputscale as set by
 * get_inputscale). The library has no CLI `-s` flag, so the "command line
 * flag prevails" branch (`PSinputscale > 0`) is absent. Absent/unparseable
 * gives -1 (no scaling); 0 and negatives (clamped to 0 by late_double's
 * minimum) give 72. Callers scale only when the result is > 0.
 * @see lib/common/utils.c:get_inputscale
 */
export function getInputscale(g: Graph): number {
  const d = lateDouble(g.root.attrs.get('inputscale'), -1, 0);
  return d === 0 ? POINTS_PER_INCH : d;
}

/**
 * Divisor for `x /= PSinputscale` guarded by `if (PSinputscale > 0)`:
 * the inputscale when positive, else 1 (no scaling).
 * @see lib/neatogen/neatoinit.c:user_pos
 * @see lib/fdpgen/fdpinit.c:initialPositions
 * @see lib/fdpgen/layout.c:chkPos
 */
export function inputscaleDivisor(g: Graph): number {
  const sc = getInputscale(g);
  return sc > 0 ? sc : 1;
}
