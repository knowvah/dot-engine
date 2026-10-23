// SPDX-License-Identifier: EPL-2.0

/**
 * Once-per-process message gate. C keeps the seen strings in a file static
 * dictionary that is cleared only by `emit_once_reset` in `gvFreeContext`; one
 * native run is one process, so the port clears it per render (AD-4).
 *
 * @see lib/common/emit.c:emit_once
 */

import { registerRenderState } from './render-state.js';

const seen = new Set<string>();

registerRenderState(() => {
  seen.clear();
});

/**
 * True the first time `str` is offered since the last reset, false after.
 * @see lib/common/emit.c:emit_once
 */
export function emitOnce(str: string): boolean {
  if (seen.has(str)) return false;
  seen.add(str);
  return true;
}
