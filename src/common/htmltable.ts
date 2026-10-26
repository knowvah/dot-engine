// SPDX-License-Identifier: EPL-2.0
/**
 * Public API: HTML-like label parsing and layout sizing.
 * Sizing algorithm ported from lib/common/htmltable.c.
 *
 * @see lib/common/htmltable.c:size_html_tbl
 * @see lib/common/htmltable.c:set_cell_widths
 * @see lib/common/htmltable.c:set_cell_heights
 */

export { HtmlParseError } from './htmltable-types.js';
export type {
  HtmlAlign, HtmlVAlign,
  HtmlHR, HtmlImage, HtmlTextItem, HtmlText,
  HtmlCellContent, HtmlCell, HtmlRow, HtmlTable, HtmlTableFont, HtmlLabel,
  ImageSizer,
} from './htmltable-types.js';
export { parseHtmlLabel, parseHtmlLabelRv } from './htmltable-parse.js';
export type { TextMeasurer } from './textmeasure.js';

import type {
  HtmlCell, HtmlCellContent, HtmlImage, HtmlLabel, HtmlTable, HtmlText,
  ImageSizer,
} from './htmltable-types.js';
import { findImageSize, imageIsSupplied, imageOpenWarning } from '../gvc/usershape.js';
import { registerRenderState } from './render-state.js';
import { PointSet } from './pointset.js';
import type { TextMeasurer } from './textmeasure.js';
import { buildLineRuns, runsAreSimple } from './htmltable-pos-runs.js';
import { withTableFont } from './htmltable-fontinfo.js';
import { agerrLine, type StderrLines } from './htmltable-attr-warn.js';

export { withTableFont } from './htmltable-fontinfo.js';

const DEFAULT_BORDER = 1;
const DEFAULT_CELLPADDING = 2;
const DEFAULT_CELLSPACING = 2;
const DEFAULT_FONTSIZE = 14;

interface CellEntry {
  cell: HtmlCell; row: number; col: number;
  colspan: number; rowspan: number;
  w: number; h: number;
}

interface TableDimArgs {
  widths: number[]; heights: number[];
  ncols: number; nrows: number;
  spacing: number; border: number;
}

/** @see lib/common/htmltable.c:findCol */
const findCol = (
  ps: PointSet,
  row: number,
  startCol: number,
  colspan: number,
  rowspan: number,
): number => {
  let col = startCol;
  let notFound = true;
  const end = colspan - 1;
  while (notFound) {
    const lastc = col + end;
    let c: number;
    for (c = lastc; c >= col; c--) {
      if (ps.isInPS(c, row)) break;
    }
    if (c >= col) col = c + 1; // conflict: try column after
    else notFound = false;
  }
  for (let j = col; j < col + colspan; j++) {
    for (let i = row; i < row + rowspan; i++) {
      ps.addPS(j, i);
    }
  }
  return col;
};

/**
 * Sizing environment: label-level font defaults + image resolution.
 * Ports htmlenv_t.finfo — C threads lp->fontname/fontsize through
 * make_html_label's env into size_html_txt.
 * @see lib/common/htmltable.c:make_html_label (env.finfo)
 */
export interface HtmlSizeEnv {
  fontsize: number;
  fontname: string;
  imageSizer?: ImageSizer;
  stderr?: StderrLines; // the label's stderr; none: straight to the console
}

const defaultSizeEnv = (): HtmlSizeEnv => ({ fontsize: DEFAULT_FONTSIZE, fontname: '' });

/**
 * Size a text block. C: per line lsize = mxysize when simple, else the
 * raw max font size (mxfsize); a single-line block always uses mxysize.
 * @see lib/common/htmltable.c:size_html_txt (lines 1045-1075)
 */
const sizeTextContent = (
  texts: HtmlText[],
  measurer: TextMeasurer,
  env: HtmlSizeEnv = defaultSizeEnv(),
): { w: number; h: number } => {
  // The one line builder, shared with placement (htmltable-pos-runs.ts).
  const lines = buildLineRuns(texts, env, measurer);
  const simple = runsAreSimple(lines, env);
  let w = 0;
  let h = 0;
  for (const ln of lines) {
    w = Math.max(w, ln.width);
    const lsize = simple ? ln.height : ln.fontSize;
    h += ln.items.length > 0 ? lsize : DEFAULT_FONTSIZE;
  }
  if (lines.length === 1) h = lines[0]!.items.length > 0 ? lines[0]!.height : DEFAULT_FONTSIZE;
  return { w, h };
};

/**
 * Size one IMG element, writing dimensions onto HtmlImage.width/height.
 *
 * C behavior (htmltable.c:1080-1097):
 *   - Call gvusershape_size(g, img->src) — returns (-1,-1) on failure.
 *   - On failure: emit agerrorf warning, set box to zero.
 *   - On success: store box.UR = size, set GD_has_images=true.
 *
 * AD3 (locked): absent / null ImageSizer ≡ C-with-missing-file.
 * Warning text matches C's agerrorf format string exactly.
 *
 * @see lib/common/htmltable.c:size_html_img (line 1080)
 */
/** Images whose sizing failed: size_html_img's rv = 1 on every later call. */
const missingImages = { set: new WeakSet<HtmlImage>() };

const sizeHtmlImg = (img: HtmlImage, { imageSizer, stderr }: HtmlSizeEnv): number => {
  // C sizes each image once (processTbl); the port's size and pos passes
  // share layoutHtmlTable, so guard against re-sizing (and re-warning). The
  // returned rv still follows C on every call.
  if (img.width !== undefined && img.height !== undefined) return missingImages.set.has(img) ? 1 : 0;
  const sz = imageSizer !== undefined ? imageSizer(img.src) : findImageSize(img.src);
  if (sz !== null) {
    img.width = sz.w; img.height = sz.h;
    return 0;
  }
  // Missing-image: gvusershape_open's warning (unless bytes are supplied),
  // then zero size + the Error.
  // @see lib/gvc/gvusershape.c:gvusershape_file_access
  if (!imageIsSupplied(img.src, imageSizer)) agerrLine(stderr, `Warning: ${imageOpenWarning(img.src)}`);
  // C: agerrorf("No or improper image file=\"%s\"\n", img->src) — agerr
  // prefixes "Error: " on stderr.
  agerrLine(stderr, `Error: No or improper image file="${img.src}"`);
  img.width = 0;
  img.height = 0;
  missingImages.set.add(img);
  return 1;
};

const sizeContentItem = (
  item: HtmlCellContent,
  measurer: TextMeasurer,
  env: HtmlSizeEnv,
): { w: number; h: number; rv: number } => {
  if (item.kind === 'text') return { ...sizeTextContent([item], measurer, env), rv: 0 };
  if (item.kind === 'table') {
    const rv = sizeTableInner(item, measurer, env);
    return { ...(item.dimen !== undefined ? item.dimen : { w: 0, h: 0 }), rv };
  }
  if (item.kind === 'image') {
    const rv = sizeHtmlImg(item, env);
    return { w: item.width ?? 0, h: item.height ?? 0, rv };
  }
  return { w: 0, h: 0, rv: 0 };
};

export const cellPad = (cell: HtmlCell, tbl: HtmlTable): number =>
  cell.cellpadding !== undefined ? cell.cellpadding
    : (tbl.cellpadding !== undefined ? tbl.cellpadding : DEFAULT_CELLPADDING);

/**
 * A cell with no BORDER of its own defaults, in order: the table's CELLBORDER
 * (if >= 0), else the table's own BORDER value (when BORDER was set — including
 * BORDER="0"), else DEFAULT_BORDER. The middle case is why a cell in a
 * `<TABLE BORDER="0">` with no CELLBORDER draws no border, not a 1px one.
 * @see lib/common/htmltable.c:1115 size_html_tbl (cp->data.border default)
 */
export const cellBorder = (cell: HtmlCell, tbl: HtmlTable): number => {
  if (cell.border !== undefined) return cell.border;
  const cb = tbl.cellborder;
  if (cb !== undefined && cb >= 0) return cb;
  if (tbl.border !== undefined) return tbl.border;
  return DEFAULT_BORDER;
};

/**
 * Propagate pen (border) color down the table tree. A table with no explicit
 * COLOR inherits `parentColor`; each cell inherits the (possibly inherited)
 * table color; each nested table inherits its enclosing cell's color. Mirrors
 * C, which defaults the top table's pencolor to getPenColor(obj) then copies
 * parent->child during processTbl.
 * @see lib/common/htmltable.c:1911 (top table), :1406-1407 (cell), :1556-1557
 */
export function inheritTablePenColor(tbl: HtmlTable, parentColor: string | undefined): void {
  if (tbl.color === undefined) tbl.color = parentColor;
  const tblColor = tbl.color;
  for (const row of tbl.rows) {
    for (const cell of row.cells) {
      if (cell.color === undefined) cell.color = tblColor;
      for (const item of cell.content) {
        if (item.kind === 'table') inheritTablePenColor(item, cell.color);
      }
    }
  }
}

/** C `agwarningf` text as rendered on stderr ("Warning: " prefix, no newline). */
const WARN_CELL_TOO_SMALL = 'Warning: cell size too small for content';
const WARN_CELL_UNSPECIFIED = 'Warning: fixed cell size with unspecified width or height';
const WARN_TABLE_TOO_SMALL = 'Warning: table size too small for content';
const WARN_TABLE_UNSPECIFIED = 'Warning: fixed table size with unspecified width or height';

/**
 * C sizes each cell/table exactly once; the port's size and pos passes both
 * run layoutHtmlTable, so the size warnings are emitted on first sight only.
 */
const sizeWarned = { set: new WeakSet<object>() };

// Native re-parses per run, so each render starts with both sets empty (AD-7);
// a WeakSet cannot be cleared, so the holder's field is swapped.
registerRenderState(() => {
  missingImages.set = new WeakSet<HtmlImage>();
  sizeWarned.set = new WeakSet<object>();
});

/**
 * FIXED_FLAG branch of size_html_cell: C's rv (set at the warning sites; the
 * warning itself is printed once per cell) and whether the content size is
 * zeroed.
 * @see lib/common/htmltable.c:1141 (size_html_cell FIXED_FLAG)
 */
const fixedCellCheck = (
  cell: HtmlCell, sz: { w: number; h: number }, warn: boolean, out: StderrLines | undefined,
): { rv: number; zero: boolean } => {
  if (!cell.fixedsize) return { rv: 0, zero: false };
  if (cell.width && cell.height) {
    const small = (cell.width < sz.w || cell.height < sz.h) && cell.content[0]?.kind !== 'image';
    if (small && warn) agerrLine(out, WARN_CELL_TOO_SMALL);
    return { rv: small ? 1 : 0, zero: true };
  }
  if (warn) agerrLine(out, WARN_CELL_UNSPECIFIED);
  return { rv: 1, zero: false };
};

/** @see lib/common/htmltable.c:size_html_cell */
const getCellSize = (
  cell: HtmlCell,
  tbl: HtmlTable,
  measurer: TextMeasurer,
  env: HtmlSizeEnv,
): { w: number; h: number; rv: number } => {
  const margin = 2 * (cellPad(cell, tbl) + cellBorder(cell, tbl));
  let cw = 0, ch = 0, rv = 0;
  for (const item of cell.content) {
    const s = sizeContentItem(item, measurer, env);
    cw = Math.max(cw, s.w); ch += s.h; rv |= s.rv;
  }
  // C: sz = content + margin; FIXED_FLAG with both width and height set zeroes
  // sz (content size is ignored), then the box clamps UP to width/height via
  // MAX below — so a fixed cell ends up exactly width x height, NOT 0 x 0.
  // @see lib/common/htmltable.c:size_html_cell (FIXED_FLAG branch + box.UR MAX)
  let szx = cw + margin;
  let szy = ch + margin;
  const warn = !sizeWarned.set.has(cell);
  sizeWarned.set.add(cell);
  const fixed = fixedCellCheck(cell, { w: szx, h: szy }, warn, env.stderr);
  rv |= fixed.rv;
  if (fixed.zero) { szx = 0; szy = 0; }
  const bw = cell.width !== undefined ? cell.width : 0;
  const bh = cell.height !== undefined ? cell.height : 0;
  return { w: Math.max(szx, bw), h: Math.max(szy, bh), rv };
};

/** @see lib/common/htmltable.c:processTbl */
const buildLayouts = (
  tbl: HtmlTable,
  measurer: TextMeasurer,
  env: HtmlSizeEnv,
): { entries: CellEntry[]; rv: number } => {
  const entries: CellEntry[] = [];
  let rv = 0;
  const ps = new PointSet();
  let rowIdx = 0;
  for (const row of tbl.rows) {
    let col = 0;
    for (const c of row.cells) {
      if (c.kind !== 'cell') { continue; }
      const colspan = c.colspan !== undefined ? c.colspan : 1;
      const rowspan = c.rowspan !== undefined ? c.rowspan : 1;
      const { w, h, rv: cellRv } = getCellSize(c, tbl, measurer, env);
      rv |= cellRv;
      col = findCol(ps, rowIdx, col, colspan, rowspan);
      entries.push({ cell: c, row: rowIdx, col, colspan, rowspan, w, h });
      col += colspan;
    }
    rowIdx++;
  }
  return { entries, rv };
};

/** @see lib/common/htmltable.c:set_cell_widths */
const setColWidths = (
  entries: CellEntry[],
  ncols: number,
  spacing: number,
): number[] => {
  const widths = new Array<number>(ncols + 1).fill(0);
  for (const e of entries)
    if (e.colspan === 1) widths[e.col] = Math.max(widths[e.col], e.w);
  for (const e of entries) {
    if (e.colspan === 1) continue;
    const spanW = widths.slice(e.col, e.col + e.colspan).reduce((a, v) => a + v, 0);
    const need = e.w - spanW - (e.colspan - 1) * spacing;
    if (need > 0) {
      const add = need / e.colspan;
      for (let j = 0; j < e.colspan; j++) widths[e.col + j] += add;
    }
  }
  for (const e of entries) {
    const spanW = widths.slice(e.col, e.col + e.colspan).reduce((a, v) => a + v, 0);
    e.w = Math.max(e.w, spanW + (e.colspan - 1) * spacing);
  }
  return widths;
};

/** @see lib/common/htmltable.c:set_cell_heights */
const setRowHeights = (
  entries: CellEntry[],
  nrows: number,
  spacing: number,
): number[] => {
  const heights = new Array<number>(nrows + 1).fill(0);
  for (const e of entries)
    if (e.rowspan === 1) heights[e.row] = Math.max(heights[e.row], e.h);
  for (const e of entries) {
    if (e.rowspan === 1) continue;
    const spanH = heights.slice(e.row, e.row + e.rowspan).reduce((a, v) => a + v, 0);
    const need = e.h - spanH - (e.rowspan - 1) * spacing;
    if (need > 0) {
      const add = need / e.rowspan;
      for (let j = 0; j < e.rowspan; j++) heights[e.row + j] += add;
    }
  }
  for (const e of entries) {
    const spanH = heights.slice(e.row, e.row + e.rowspan).reduce((a, v) => a + v, 0);
    e.h = Math.max(e.h, spanH + (e.rowspan - 1) * spacing);
  }
  return heights;
};

const getSpacing = (tbl: HtmlTable): number =>
  tbl.cellspacing !== undefined ? tbl.cellspacing : DEFAULT_CELLSPACING;

const getBorder = (tbl: HtmlTable): number =>
  tbl.border !== undefined ? tbl.border : DEFAULT_BORDER;

const isTblFixed = (tbl: HtmlTable): boolean =>
  tbl.fixedsize === true && tbl.width !== undefined && tbl.height !== undefined;

const sumTableDims = (a: TableDimArgs): { wd: number; ht: number } => {
  let wd = (a.ncols + 1) * a.spacing + 2 * a.border;
  let ht = (a.nrows + 1) * a.spacing + 2 * a.border;
  for (let i = 0; i < a.ncols; i++) wd += a.widths[i];
  for (let i = 0; i < a.nrows; i++) ht += a.heights[i];
  return { wd, ht };
};

/** Full table layout: per-cell sizes plus column/row dimensions. */
export interface HtmlTableLayout {
  entries: {
    cell: HtmlCell; row: number; col: number;
    colspan: number; rowspan: number; w: number; h: number;
  }[];
  widths: number[];
  heights: number[];
  spacing: number;
  border: number;
  /** processTbl's return: nonzero when sizing any cell had a problem. */
  rv: number;
}

/**
 * Lay out a table: per-cell sizes and column/row dimension arrays.
 * Shared by the size pass and the position pass.
 * @see lib/common/htmltable.c:size_html_tbl
 */
export const layoutHtmlTable = (
  tbl: HtmlTable,
  measurer: TextMeasurer,
  env: HtmlSizeEnv = defaultSizeEnv(),
): HtmlTableLayout => {
  const spacing = getSpacing(tbl);
  const border = getBorder(tbl);
  const { entries, rv } = buildLayouts(tbl, measurer, env);
  if (entries.length === 0) {
    return { entries, widths: [], heights: [], spacing, border, rv };
  }
  const ncols = Math.max(...entries.map(e => e.col + e.colspan));
  const nrows = Math.max(...entries.map(e => e.row + e.rowspan));
  const widths = setColWidths(entries, ncols, spacing);
  const heights = setRowHeights(entries, nrows, spacing);
  return { entries, widths, heights, spacing, border, rv };
};

/**
 * FIXED_FLAG diagnostics of size_html_tbl: the warning is emitted once per
 * table, the returned `rv = 1` follows C on every call.
 * @see lib/common/htmltable.c:size_html_tbl (:1683, :1689)
 */
const warnFixedTable = (tbl: HtmlTable, dims: { wd: number; ht: number }, out: StderrLines | undefined): number => {
  const warn = !sizeWarned.set.has(tbl);
  sizeWarned.set.add(tbl);
  if (tbl.fixedsize !== true) return 0;
  if (tbl.width && tbl.height) {
    if (tbl.width >= dims.wd && tbl.height >= dims.ht) return 0;
    if (warn) agerrLine(out, WARN_TABLE_TOO_SMALL);
    return 1;
  }
  if (warn) agerrLine(out, WARN_TABLE_UNSPECIFIED);
  return 1;
};

/** @see lib/common/htmltable.c:size_html_tbl */
const sizeTableBody = (
  tbl: HtmlTable,
  measurer: TextMeasurer,
  env: HtmlSizeEnv,
): number => {
  const { entries, widths, heights, spacing, border, rv } = layoutHtmlTable(tbl, measurer, env);
  if (entries.length === 0) {
    const fixed = warnFixedTable(tbl, sumTableDims({ widths, heights, ncols: 0, nrows: 0, spacing, border }), env.stderr);
    tbl.dimen = { w: 0, h: 0 };
    return rv | fixed;
  }
  const ncols = Math.max(...entries.map(e => e.col + e.colspan));
  const nrows = Math.max(...entries.map(e => e.row + e.rowspan));
  for (const e of entries) e.cell.dimen = { w: e.w, h: e.h };
  const { wd, ht } = sumTableDims({ widths, heights, ncols, nrows, spacing, border });
  const baseWd = tbl.width !== undefined ? tbl.width : 0;
  const baseHt = tbl.height !== undefined ? tbl.height : 0;
  const fixed = warnFixedTable(tbl, { wd, ht }, env.stderr);
  // C zeroes only the CONTENT-derived term for a FIXEDSIZE table that has BOTH
  // width and height, so the box becomes fmax(0, width)=width / fmax(0,height)=
  // height (the explicit size). A fixed table missing a dimension warns and
  // keeps the content size. The port previously set dimen to 0 outright,
  // discarding the explicit size. @see lib/common/htmltable.c:1678-1693
  const zeroContent = isTblFixed(tbl) && baseWd !== 0 && baseHt !== 0;
  tbl.dimen = {
    w: Math.max(zeroContent ? 0 : wd, baseWd),
    h: Math.max(zeroContent ? 0 : ht, baseHt),
  };
  return rv | fixed;
};

/** @see lib/common/htmltable.c:size_html_tbl (pushFontInfo ... popFontInfo around the body) */
const sizeTableInner = (tbl: HtmlTable, measurer: TextMeasurer, env: HtmlSizeEnv): number =>
  withTableFont(env, tbl.font, 'size', () => sizeTableBody(tbl, measurer, env));

/**
 * Compute and write `dimen` onto all cells and the label.
 *
 * The optional `imageSizer` resolves `<IMG SRC="..."/>` dimensions.
 * When absent or when the sizer returns null, images get zero size and a
 * warning is emitted, matching C's missing-image behavior exactly.
 *
 * @returns make_html_label's `rv |= size_html_*`: nonzero on a sizing problem.
 * @see lib/common/htmltable.c:make_html_label
 */
export const sizeHtmlLabel = (
  label: HtmlLabel,
  measurer: TextMeasurer,
  env: HtmlSizeEnv = defaultSizeEnv(),
): number => {
  if (label.kind === 'table') {
    const rv = sizeTableInner(label.table, measurer, env);
    label.dimen = label.table.dimen;
    return rv;
  }
  label.dimen = sizeTextContent(label.texts, measurer, env);
  return 0; // size_html_txt always returns 0
};
