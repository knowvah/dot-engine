// SPDX-License-Identifier: EPL-2.0
/**
 * The HTML label environment's font swap: C's `pushFontInfo` / `popFontInfo`
 * and the function-static `savef` slots they share across table recursion.
 *
 * @see lib/common/htmltable.c:pushFontInfo
 */

import type { HtmlTableFont } from './htmltable-types.js';

/** Font fields `pushFontInfo` swaps; `fontcolor` exists only in the position env. */
export interface FontEnv {
  fontsize: number;
  fontname: string;
  fontcolor?: string;
}

/**
 * C's `static textfont_t savef`: `pushFontInfo` writes it, `popFontInfo` reads
 * it back. One instance serves every (nested) table of a pass, so an inner
 * table's push overwrites the outer's save. Zero-initialised like C
 * (size 0.0, name and color null).
 */
export interface SavedFont {
  fontname?: string;
  fontcolor?: string;
  fontsize: number;
}

/** @see lib/common/htmltable.c:size_html_tbl (function-static savef) */
const SIZE_SAVEF: SavedFont = { fontsize: 0 };
/** Emit-side slot; the port's position pass plays emit_html_tbl's role. @see lib/common/htmltable.c:emit_html_tbl */
const EMIT_SAVEF: SavedFont = { fontsize: 0 };

/**
 * Replace the environment's font attributes with `fp`'s, saving the old ones
 * in `savp`. Only attributes set in the environment are dealt with.
 * @see lib/common/htmltable.c:pushFontInfo
 */
export const pushFontInfo = (env: FontEnv, fp: HtmlTableFont, savp: SavedFont): void => {
  if (fp.fontFace !== undefined) {
    savp.fontname = env.fontname;
    env.fontname = fp.fontFace;
  } else savp.fontname = undefined;
  if (env.fontcolor !== undefined) {
    if (fp.fontColor !== undefined) {
      savp.fontcolor = env.fontcolor;
      env.fontcolor = fp.fontColor;
    } else savp.fontcolor = undefined;
  }
  if (env.fontsize >= 0) {
    if (fp.fontSize !== undefined && fp.fontSize >= 0) {
      savp.fontsize = env.fontsize;
      env.fontsize = fp.fontSize;
    } else savp.fontsize = -1;
  }
};

/**
 * Restore saved font attributes, copying only set values.
 * @see lib/common/htmltable.c:popFontInfo
 */
export const popFontInfo = (env: FontEnv, savp: SavedFont): void => {
  if (savp.fontname !== undefined) env.fontname = savp.fontname;
  if (savp.fontcolor !== undefined) env.fontcolor = savp.fontcolor;
  if (savp.fontsize >= 0) env.fontsize = savp.fontsize;
};

/**
 * Run `fn` with the table's font pushed into `env` (`if (tbl->font)` push ...
 * pop), using the size or emit-side saved-font slot.
 * @see lib/common/htmltable.c:size_html_tbl, emit_html_tbl
 */
export const withTableFont = <R>(
  env: FontEnv, font: HtmlTableFont | undefined, slot: 'size' | 'emit', fn: () => R,
): R => {
  if (font === undefined) return fn();
  const savp = slot === 'size' ? SIZE_SAVEF : EMIT_SAVEF;
  pushFontInfo(env, font, savp);
  const r = fn();
  popFontInfo(env, savp);
  return r;
};
