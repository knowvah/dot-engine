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
import { htmlEntityUTF8 } from './html-entities.js';

/** Decode XML/HTML entities in an anchor attribute value (href/target), as C's
 *  HTML parser does. The stored value is the real character (`&amp;` → `&`), so
 *  imap emits it raw and cmapx re-escapes it. Undefined passes through. */
function anchorAttr(v: string | undefined): string | undefined {
  return v === undefined ? undefined : htmlEntityUTF8(v);
}

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
 * Unrecognised chars are silently skipped (C issues a warning but continues).
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
 * Parse GRADIENTANGLE attribute — integer in [0, 360].
 * Out-of-range or non-integer values are ignored (C issues a warning).
 * @see lib/common/htmllex.c:gradientanglefn
 */
export const parseGradientAngle = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = parseInt(v, 10);
  if (isNaN(n) || String(n) !== v.trim()) return undefined;
  if (n < 0 || n > 360) return undefined;
  return n;
};

/**
 * Parse COLUMNS attribute — only "*" is valid (sets vrule=true).
 * @see lib/common/htmllex.c:columnsfn
 */
export const parseColumns = (v: string | undefined): true | undefined =>
  v === '*' ? true : undefined;

/**
 * Parse ROWS attribute — only "*" is valid (sets hrule=true).
 * @see lib/common/htmllex.c:rowsfn
 */
export const parseRows = (v: string | undefined): true | undefined =>
  v === '*' ? true : undefined;

export const buildCell = (content: HtmlCellContent[], a: Record<string, string>): HtmlCell => ({
  kind: 'cell',
  content,
  port: a['port'],
  align: parseAlign(a['align'] !== undefined ? a['align'] : ''),
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
  href: anchorAttr(a['href']),
  title: parseTitle(a),
  target: anchorAttr(a['target']),
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
  href: anchorAttr(a['href']),
  title: parseTitle(a),
  target: anchorAttr(a['target']),
  id: a['id'],
  port: a['port'],
  sides: parseSides(a['sides']),
  gradientangle: parseGradientAngle(a['gradientangle']),
  vrule: parseColumns(a['columns']),
  hrule: parseRows(a['rows']),
});

