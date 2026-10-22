// SPDX-License-Identifier: EPL-2.0
/**
 * Attribute interpretation for the HTML-like label parser: the values
 * mkTbl/mkCell/mkBR/mkFont read off a tag, and the table/cell records built
 * from them.
 *
 * @see lib/common/htmllex.c:mkTbl
 * @see lib/common/htmllex.c:mkCell
 */

import type {
  HtmlAlign,
  HtmlCell,
  HtmlCellAlign,
  HtmlCellContent,
  HtmlRow,
  HtmlTable,
  HtmlVAlign,
} from './htmltable-types.js';
import {
  BORDER_LEFT,
  BORDER_TOP,
  BORDER_RIGHT,
  BORDER_BOTTOM,
  BORDER_MASK,
} from './htmltable-types.js';

// ---------------------------------------------------------------------------
// Attribute helpers
// ---------------------------------------------------------------------------

export const parseAlign = (v: string): HtmlAlign | undefined => {
  const u = v.toUpperCase();
  if (u === 'LEFT') return 'left';
  if (u === 'RIGHT') return 'right';
  if (u === 'CENTER') return 'center';
  return undefined;
};

/** @see lib/common/htmllex.c:cell_halignfn */
export const parseCellAlign = (v: string): HtmlCellAlign | undefined =>
  v.toUpperCase() === 'TEXT' ? 'text' : parseAlign(v);

export const parseVAlign = (v: string): HtmlVAlign | undefined => {
  const u = v.toUpperCase();
  if (u === 'TOP') return 'top';
  if (u === 'BOTTOM') return 'bottom';
  if (u === 'MIDDLE') return 'middle';
  return undefined;
};

export const num = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
};

export const parseFixedSize = (a: Record<string, string>): true | undefined =>
  a['fixedsize']?.toUpperCase() === 'TRUE' ? true : undefined;

export const parseTitle = (a: Record<string, string>): string | undefined =>
  a['title'] !== undefined ? a['title'] : a['tooltip'];

/**
 * Parse SIDES attribute into a bitmask matching C sidesfn().
 * Unrecognised chars are skipped (the lexer has already warned, as C does).
 * C guard: if (flags != BORDER_MASK) p->flags |= flags — the full-mask case
 * is a no-op (means "all sides", the default), so we return undefined for it.
 * @see lib/common/htmllex.c:sidesfn
 */
export const parseSides = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  let flags = 0;
  for (const c of v.toLowerCase()) {
    if (c === 'l') flags |= BORDER_LEFT;
    else if (c === 't') flags |= BORDER_TOP;
    else if (c === 'r') flags |= BORDER_RIGHT;
    else if (c === 'b') flags |= BORDER_BOTTOM;
  }
  // C: if (flags != BORDER_MASK) p->flags |= flags
  if (flags === 0 || flags === BORDER_MASK) return undefined;
  return flags;
};

/**
 * Parse GRADIENTANGLE attribute — `strtol` prefix, as `num`. The lexer has
 * already dropped values outside [0, 360] (doInt).
 * @see lib/common/htmllex.c:gradientanglefn
 */
export const parseGradientAngle = (v: string | undefined): number | undefined => num(v);

/**
 * Parse COLUMNS attribute — a value starting with "*" sets vrule=true
 * (C tests `*v != '*'`; anything else was already ignored by the lexer).
 * @see lib/common/htmllex.c:columnsfn
 */
export const parseColumns = (v: string | undefined): true | undefined =>
  v?.startsWith('*') === true ? true : undefined;

/**
 * Parse ROWS attribute — a value starting with "*" sets hrule=true
 * (C tests `*v != '*'`; anything else was already ignored by the lexer).
 * @see lib/common/htmllex.c:rowsfn
 */
export const parseRows = (v: string | undefined): true | undefined =>
  v?.startsWith('*') === true ? true : undefined;

export const buildCell = (content: HtmlCellContent[], a: Record<string, string>): HtmlCell => ({
  kind: 'cell',
  content,
  port: a['port'],
  align: parseCellAlign(a['align'] !== undefined ? a['align'] : ''),
  valign: parseVAlign(a['valign'] !== undefined ? a['valign'] : ''),
  balign: parseAlign(a['balign'] !== undefined ? a['balign'] : ''),
  bgcolor: a['bgcolor'],
  color: a['color'],
  border: num(a['border']),
  cellpadding: num(a['cellpadding']),
  cellspacing: num(a['cellspacing']),
  sides: parseSides(a['sides']),
  gradientangle: parseGradientAngle(a['gradientangle']),
  style: a['style'],
  width: num(a['width']),
  height: num(a['height']),
  fixedsize: parseFixedSize(a),
  colspan: num(a['colspan']),
  rowspan: num(a['rowspan']),
  href: a['href'],
  title: parseTitle(a),
  target: a['target'],
  id: a['id'],
});

export const buildTable = (rows: HtmlRow[], a: Record<string, string>): HtmlTable => ({
  kind: 'table' as const,
  rows,
  border: num(a['border']),
  cellborder: num(a['cellborder']),
  cellspacing: num(a['cellspacing']),
  cellpadding: num(a['cellpadding']),
  bgcolor: a['bgcolor'],
  color: a['color'],
  style: a['style'],
  align: parseAlign(a['align'] !== undefined ? a['align'] : ''),
  valign: parseVAlign(a['valign'] !== undefined ? a['valign'] : ''),
  fixedsize: parseFixedSize(a),
  width: num(a['width']),
  height: num(a['height']),
  href: a['href'],
  title: parseTitle(a),
  target: a['target'],
  id: a['id'],
  port: a['port'],
  sides: parseSides(a['sides']),
  gradientangle: parseGradientAngle(a['gradientangle']),
  vrule: parseColumns(a['columns']),
  hrule: parseRows(a['rows']),
});

