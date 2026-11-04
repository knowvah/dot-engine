// SPDX-License-Identifier: EPL-2.0

import type { Graph } from '../model/graph.js';

/**
 * Port of `mapbool` for the `landscape=` branch only: falsy spellings →
 * false, truthy spellings → true, else `atoi(s) != 0`. Kept local (not imported
 * from layout/dot) to avoid pulling the layout engine into this leaf module.
 * @see lib/common/utils.c:mapbool
 */
function landscapeMapbool(s: string): boolean {
  const v = s.toLowerCase();
  if (v === '' || v === 'false' || v === 'no') return false;
  if (v === 'true' || v === 'yes') return true;
  return Number.parseInt(s, 10) !== 0;
}

/**
 * Port of the landscape detection in `input.c`: `rotate=90`, or
 * `orientation` starting with `l`/`L`, or a truthy `landscape`. Each branch is
 * mutually exclusive in the same precedence as C (rotate wins over orientation
 * wins over landscape). Returns false when no rotation attribute is present.
 * This flag is **emit-only** — it drives `job.rotation`, never layout (ADR-1).
 * @see lib/common/input.c:699-704
 */
export function parseLandscape(g: Graph): boolean {
  const rotate = g.attrs.get('rotate');
  if (rotate !== undefined) return Number.parseInt(rotate, 10) === 90;
  const orientation = g.attrs.get('orientation');
  if (orientation !== undefined) {
    return orientation[0] === 'l' || orientation[0] === 'L';
  }
  const landscape = g.attrs.get('landscape');
  if (landscape !== undefined) return landscapeMapbool(landscape);
  return false;
}
