// SPDX-License-Identifier: EPL-2.0

/**
 * HTML label rendering: emits a positioned HTML label (cell borders,
 * text runs, table border) through the renderer plugin.
 *
 * emitHtmlLabel is the port of emit_html_tbl.
 * emitHtmlCell  is the port of emit_html_cell.
 *
 * Decoration (bgcolor fill, per-side borders, anchors, rules) fires
 * only when the corresponding metadata fields are present on the
 * PlacedCell / PlacedHtml — mirroring C's conditional structure.
 * Undecorated tables emit identically to before T6.
 *
 * @see lib/common/htmltable.c:emit_html_tbl
 * @see lib/common/htmltable.c:emit_html_cell
 * @see lib/common/htmltable.c:emit_htextspans
 * @see lib/common/htmltable.c:setFill
 * @see lib/common/htmltable.c:initAnchor
 * @see lib/common/htmltable.c:endAnchor
 * @see lib/common/htmltable.c:doBorder
 * @see lib/common/htmltable.c:emit_html_rules
 */

import type { Point, Box } from '../model/geom.js';
import type { RenderJob } from '../gvc/job.js';
import { EMIT_CLUSTERS_LAST } from '../gvc/job.js';
import type { RendererPlugin } from '../gvc/context.js';
import type { TextSpan } from './emit-types.js';
import type { PlacedHtml, PlacedCell, PlacedLine, PlacedImage } from './htmltable-pos.js';
import { transformPoint } from '../gvc/device.js';
import { gvrenderUsershape } from '../gvc/render-usershape.js';
import { gvrenderTextspan } from '../gvc/textspan-emit.js';
import {
  withHtmlPaint, findHtmlStopColor, doBorder, mkPts,
  htmlFillPenWidth, resetHtmlFillPenWidth, type HtmlPaint,
} from './htmltable-emit-fill.js';
import { emitRoundedBezier } from './poly-shapes.js';
import { htmlStyle } from './htmltable-style.js';
import { emitHtmlRules, initHtmlAnchor, endHtmlAnchor, htmlObjImgscale } from './htmltable-emit-rules.js';

export type { PlacedHtml, PlacedCell, PlacedLine, PlacedImage };

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** Absolute (graph-frame) box for a cell/table: local box offset by `pos`.
 *  Mirrors the `box + pos` used by the fill/border/rule helpers — the box C
 *  passes to initAnchor's emit_map_rect. */
function absBox(box: Box, pos: Point): Box {
  return {
    ll: { x: box.ll.x + pos.x, y: box.ll.y + pos.y },
    ur: { x: box.ur.x + pos.x, y: box.ur.y + pos.y },
  };
}

/** Box outline polygon: LL, (LL.x,UR.y), UR, (UR.x,LL.y). */
export function emitHtmlBox(
  box: Box,
  pos: Point,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  const pts = [
    { x: box.ll.x + pos.x, y: box.ll.y + pos.y },
    { x: box.ll.x + pos.x, y: box.ur.y + pos.y },
    { x: box.ur.x + pos.x, y: box.ur.y + pos.y },
    { x: box.ur.x + pos.x, y: box.ll.y + pos.y },
  ].map((p) => transformPoint(p, job));
  renderer.polygon(pts, false, job);
}

/** Build a TextSpan from a PlacedLine. */
function lineToSpan(line: PlacedLine): TextSpan {
  return {
    str: line.text,
    fontName: line.fontName,
    fontSize: line.fontSize,
    fontColor: line.fontColor,
    fontFlags: line.fontFlags,
    yoffset_layout: 0,
    // simple blocks: 0 (cancelled in the lfsize math); non-simple: 1.
    // @see lib/common/htmltable.c:emit_htextspans (lines 177-180)
    yoffset_centerline: line.yoffsetCenterline ?? 0,
    size: { x: line.width, y: line.fontSize },
    just: 'l',
  };
}

/** Emit one text run. @see lib/common/htmltable.c:emit_htextspans */
export function emitHtmlLine(
  line: PlacedLine, pos: Point, renderer: RendererPlugin, job: RenderJob,
): void {
  gvrenderTextspan(renderer, { x: line.x + pos.x, y: line.baseline + pos.y }, lineToSpan(line), job);
}

// ---------------------------------------------------------------------------
// Shared decoration helpers
// ---------------------------------------------------------------------------

/** bgcolor fill context: border insets the rounded ring (mkPts); style
 * "rounded"→Bézier path, "radial"→radial gradient; gradientangle in deg. */
interface BgFillCtx {
  bgcolor: string;
  box: Box;
  pos: Point;
  border: number;
  renderer: RendererPlugin;
  job: RenderJob;
  gradientangle?: number;
  style?: string;
}

/**
 * Build the paint for a bgcolor: a gradient for "c1:c2" specs (linear, or
 * radial when style includes "radial"), else a solid fill. Mirrors C setFill:
 * clrs[0] = fill, clrs[1] = gradient stop, angle from gradientangle.
 * @see lib/common/htmltable.c:setFill
 */
function bgFillPaint(ctx: BgFillCtx): HtmlPaint {
  // penWidth = the leaked gvrender pen width (prior doBorder); a bordered cell's
  // fill carries it as stroke-width even with stroke="none". @see htmltable.c:setFill
  const penWidth = htmlFillPenWidth();
  const spec = findHtmlStopColor(ctx.bgcolor);
  if (spec === null) return { fill: ctx.bgcolor, penWidth };
  return {
    fill: spec.fill, stop: spec.stop ?? 'black', gradientFrac: spec.frac,
    gradientAngle: ctx.gradientangle ?? 0,
    radial: htmlStyle(ctx.style).radial, penWidth,
  };
}

/**
 * Emit a filled bgcolor shape. A `style.rounded` table/cell fills a rounded
 * Bézier path over the border/2-inset mkPts ring (emitRoundedBezier transforms
 * internally, so pass the untransformed SW,SE,NE,NW ring with coord {0,0}, as
 * record.ts/device.ts do); otherwise a raw box.
 * @see lib/common/htmltable.c:emit_html_tbl (:543), emit_html_cell (:644)
 */
function emitBgFill(ctx: BgFillCtx): void {
  const { box, pos, border, renderer, job } = ctx;
  withHtmlPaint(bgFillPaint(ctx), job, () => {
    if (htmlStyle(ctx.style).rounded) {
      emitRoundedBezier(mkPts(box, border, pos), { x: 0, y: 0 }, true, { renderer, job });
      return;
    }
    const pts = [
      { x: box.ll.x + pos.x, y: box.ll.y + pos.y },
      { x: box.ll.x + pos.x, y: box.ur.y + pos.y },
      { x: box.ur.x + pos.x, y: box.ur.y + pos.y },
      { x: box.ur.x + pos.x, y: box.ll.y + pos.y },
    ].map((p) => transformPoint(p, job));
    renderer.polygon(pts, true, job);
  });
}

/** Decoration fields shared by PlacedCell and PlacedHtml for border emission. */
interface BorderDecor {
  box: Box;
  pos: Point;
  border: number;
  color?: string;
  sides?: number;
  style?: string;
}

/** Emit a border via doBorder (penwidth=border, box inset by border/2 when
 * border>1); default border=1 matches a plain box outline. @see htmltable.c:emit_html_cell */
function emitBorder(
  d: BorderDecor,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  doBorder({ box: d.box, pos: d.pos, border: d.border, color: d.color ?? 'black', sides: d.sides, style: d.style }, renderer, job);
}

// ---------------------------------------------------------------------------
// emitHtmlCell — port of emit_html_cell
// ---------------------------------------------------------------------------

/** Emit fill + border for a cell. */
function emitCellDecoration(
  cell: PlacedCell,
  pos: Point,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  if (cell.bgcolor !== undefined) {
    emitBgFill({ bgcolor: cell.bgcolor, box: cell.box, pos, border: cell.border,
      renderer, job, gradientangle: cell.gradientangle, style: cell.style });
  }
  if (cell.border > 0) {
    emitBorder({ box: cell.box, pos, border: cell.border, color: cell.color, sides: cell.sides, style: cell.style }, renderer, job);
  }
}

/**
 * Emit a placed HTML IMG through the shared gvrender_usershape: the cell's
 * content box is the polygon, imagepos is the fixed "mc", and the scale is the
 * IMG's own SCALE, else the object's imagescale (C env->imgscale).
 *
 * @see lib/common/htmltable.c:emit_html_img
 * @see lib/gvc/gvrender.c:gvrender_usershape
 */
export function emitHtmlImg(
  img: PlacedImage,
  pos: Point,
  _renderer: RendererPlugin,
  job: RenderJob,
): void {
  const ll = { x: img.box.ll.x + pos.x, y: img.box.ll.y + pos.y };
  const ur = { x: img.box.ur.x + pos.x, y: img.box.ur.y + pos.y };
  const a: Point[] = [ur, { x: ll.x, y: ur.y }, ll, { x: ur.x, y: ll.y }];
  const scale = img.scale !== undefined ? img.scale : htmlObjImgscale();
  gvrenderUsershape(job, img.src, a, true, scale, 'mc');
}

/**
 * Emit one positioned HTML cell.
 *
 * Draw order mirrors C emit_html_cell:
 *   1. Open anchor   2. BGCOLOR fill   3. Border   4. Content   5. Close anchor
 *
 * @see lib/common/htmltable.c:emit_html_cell
 */
export function emitHtmlCell(
  cell: PlacedCell,
  pos: Point,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  const inAnchor = initHtmlAnchor(
    { href: cell.href, title: cell.title, target: cell.target, id: cell.id },
    absBox(cell.box, pos), renderer, job,
  );
  // An invisible cell emits no fill, no border and no content — only the
  // anchor, which C opens before the gate. @see htmltable.c:emit_html_cell:643
  if (htmlStyle(cell.style).invisible) {
    if (inAnchor) endHtmlAnchor(renderer, job);
    return;
  }
  emitCellDecoration(cell, pos, renderer, job);
  if (cell.nested !== undefined) {
    // C: emit_html_cell recurses emit_html_tbl for an HTML_TBL child.
    // @see lib/common/htmltable.c:emit_html_cell
    emitHtmlLabel(cell.nested, pos, renderer, job);
  } else if (cell.image !== undefined) {
    emitHtmlImg(cell.image, pos, renderer, job);
  } else {
    for (const line of cell.lines) emitHtmlLine(line, pos, renderer, job);
  }
  if (inAnchor) endHtmlAnchor(renderer, job);
}

// ---------------------------------------------------------------------------
// emitHtmlLabel — port of emit_html_tbl
// ---------------------------------------------------------------------------

/** Emit vrule/hrule rules for all ruled cells. */
function emitTableRules(
  placed: PlacedHtml,
  pos: Point,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  const color = placed.color ?? 'black';
  placed.cells.forEach((cell, i) => {
    if (cell.vruled === true || cell.hruled === true) {
      emitHtmlRules({
        cell, tbl: placed, pos, color,
        nextCell: placed.cells[i + 1], renderer, job,
      });
    }
  });
}

/**
 * Emit a fully positioned HTML table label.
 *
 * Draw order mirrors C emit_html_tbl:
 *   1. Open anchor   2. Table BGCOLOR   3. Rules   4. Border   5. Cells   6. Close anchor
 *
 * @see lib/common/htmltable.c:emit_html_tbl
 */
export function emitHtmlLabel(
  placed: PlacedHtml,
  pos: Point,
  renderer: RendererPlugin,
  job: RenderJob,
): void {
  // C never resets the gvrender penwidth before a table fill; the prior node/
  // cluster shape drew at pen width 1, so the first table/cell fill carries no
  // stroke-width. Reset here so the leak starts clean per top-level table.
  resetHtmlFillPenWidth();
  const anchorData = { href: placed.href, title: placed.title, target: placed.target, id: placed.id };
  const tblBox = absBox(placed.box, pos);
  // EMIT_CLUSTERS_LAST (map device): the table anchor is NOT opened before the
  // cells — it is emitted as its own area AFTER them, so a cell's <area>
  // precedes the enclosing table's. Non-map devices wrap the cells.
  // @see lib/common/htmltable.c:emit_html_tbl (537, 583-588)
  const clustersLast = (job.flags & EMIT_CLUSTERS_LAST) !== 0;
  const inAnchor = clustersLast ? false : initHtmlAnchor(anchorData, tblBox, renderer, job);
  // An invisible TABLE suppresses its fill, ALL its cells, and its rules and
  // border — the whole block C guards at emit_html_tbl:542.
  const tblInvisible = htmlStyle(placed.style).invisible;
  if (!tblInvisible) {
    if (placed.bgcolor !== undefined) {
      emitBgFill({ bgcolor: placed.bgcolor, box: placed.box, pos, border: placed.border,
        renderer, job, gradientangle: placed.gradientangle, style: placed.style });
    }
    // Graphviz 16.1 (f0d07786b): rules and border precede the cells so cell
    // text is painted above table-level shapes.
    emitTableRules(placed, pos, renderer, job);
    if (placed.border > 0) {
      emitBorder({ box: placed.box, pos, border: placed.border, color: placed.color, sides: placed.sides, style: placed.style }, renderer, job);
    }
    for (const cell of placed.cells) emitHtmlCell(cell, pos, renderer, job);
  }
  if (inAnchor) endHtmlAnchor(renderer, job);
  if (clustersLast && initHtmlAnchor(anchorData, tblBox, renderer, job)) {
    endHtmlAnchor(renderer, job);
  }
}
