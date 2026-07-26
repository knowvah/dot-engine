// SPDX-License-Identifier: EPL-2.0

/**
 * DOT and XDOT renderer plugins.
 *
 * Ports gvrender_core_dot.c — FORMAT_DOT and FORMAT_XDOT branches.
 * FORMAT_CANON, FORMAT_XDOT12, FORMAT_XDOT14 are out of scope (AD-12).
 *
 * @see plugin/core/gvrender_core_dot.c
 * @see plugin/core/gvplugin_core.c
 */

import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';
import type { Edge } from '../model/edge.js';
import type { Point } from '../model/geom.js';
import type { TextSpan } from '../common/emit-types.js';
import type { ArrowDrawOp } from '../common/arrows-types.js';
import type { GVColor } from '../common/color.js';
import { resolveRenderColor } from './color-resolve.js';
import { edgeIsTapered } from './svg-tapered-edge.js';
import { taper, taperfun } from '../common/taper.js';
import { orthoRoundedRadius } from './svg-helpers.js';
import { orthoRoundedPolylines } from './svg-edge-ortho-radius.js';
import { findStopColor, parseStyleFlags } from '../common/style-resolve.js';
import { parseGraphPad } from '../gvc/viewport.js';
import { parseSegs } from '../common/multicolor.js';
import { splitSplineByColor } from './svg-edge-split.js';
import { buildOffsetLists, advanceTmpList } from '../common/edge-offset.js';
import { edgeHasDrawableContent } from './svg.js';
import type { Bezier } from '../model/geom.js';
import type { RendererPlugin } from '../gvc/context.js';
import { EdgeDrawBase } from './dot/edge-draw.js';
export * from './dot/types.js';
export type { XdotDraws, SerCtx } from './dot/types.js';
import type { XdotDraws } from './dot/types.js';
import { PenType, FillType } from '../gvc/context.js';
import type { RenderJob } from '../gvc/job.js';
import { EmitState } from '../gvc/job.js';
import { renderEdgeLabels } from '../gvc/edge-labels.js';
export * from './dot/xdot-ops.js';
export * from './dot/attrs.js';
import {
  NON_LINE_STYLES, XDOT_VERSION, agcanonEscape, escBackslash, gfmt5, linearGradientOp,
  lpStr, makeXbufs, radialGradientOp, trimFixed3, utf8Len, xdotFillColor, xdotFont,
  xdotId, xdotNum, xdotPenColor, xdotPoint, xdotPoints, xdotStrOp,
} from './dot/xdot-ops.js';
import { isDirected } from './dot/attrs.js';


// ---------------------------------------------------------------------------
// XdotRenderer
// ---------------------------------------------------------------------------



/**
 * XDOT format renderer — mirrors plugin/core/gvrender_core_dot.c's xdot engine.
 *
 * Draw ops accumulate in per-emit-state xbufs during the shared emit pass; at
 * the end of each object they are attached as `_draw_`/`_ldraw_`/`_hdraw_`/
 * `_tdraw_` strings (a side-table here, `agset` in C), and the whole graph is
 * serialized at `endGraph` — the model-attribute + agwrite-at-end model that
 * lets the graph-level `_draw_` (canvas background, cluster boxes) precede `bb`
 * even though it is only known after the body has been drawn.
 *
 * xdot is y-up (no coordinate inversion); colors come from the resolved
 * graphics state (`job.obj.penColor`/`fillColor`), not hardcoded black.
 *
 * @see plugin/core/gvrender_core_dot.c xdot_begin_graph / xdot_end_graph
 */
export class XdotRenderer extends EdgeDrawBase implements RendererPlugin {
  readonly type: string = 'xdot';
  /** @see plugin/core/gvplugin_core.c registration table */
  readonly quality = 0;

  /**
   * Whether this format attaches the xdot draw attributes before agwrite.
   * Mirrors C's `job->render.id` switch: FORMAT_DOT runs `attach_attrs(g)` then
   * `agwrite`, while FORMAT_XDOT runs `attach_attrs_and_arrows` +
   * `xdot_begin_graph`/`xdot_end_graph` and *then* the same `agwrite`. The
   * serializer below is that shared `agwrite`; this flag is the only difference.
   * @see plugin/core/gvrender_core_dot.c:404,418,475,482
   */
  protected override readonly emitDraws: boolean = true;

  /** Draw strings for `obj`, or undefined in a format that emits none (`-Tdot`).
   *  Single gate so the xdot path cannot drift from the dot path. */
  protected drawsOf(obj: Node | Edge | Graph): XdotDraws | undefined {
    return this.emitDraws ? this.draws.get(obj) : undefined;
  }

  /** Per-render draw buffers. Indices 8/9 alias 1; 10/11 alias 5. */
  private bufs: string[][] = makeXbufs();
  /** text-flag state per emit_state. @see gvrender_core_dot.c textflags[] */
  private textflags: number[] = new Array(12).fill(0);
  /** Accumulated draw strings keyed by model object (C: agset on the object). */
  private draws = new Map<Node | Edge | Graph, XdotDraws>();
  /** edge_in_box gate for the current edge: emit_edge draws nothing (spline OR
   *  label) for an edge whose content is outside job->clip. Mirrors svg.ts's
   *  edgeGroupOpen. @see lib/common/emit.c:emit_edge (3039) */
  private edgeDrawable = true;

  beginGraph(_g: Graph, _job: RenderJob): void {
    this.bufs = makeXbufs();
    this.penwidth = new Array(12).fill(1);
    this.textflags = new Array(12).fill(0);
    this.draws = new Map();
    this.clusters = [];
  }

  /** The per-object draw strings accumulated during the last render, keyed by
   *  the ORIGINAL model object. These are the pre-serialization values C's
   *  `-Tjson` reads directly (via agxget) — feeding them to parseXDot avoids the
   *  DOT-text round-trip, which cannot represent draw text containing `"` and so
   *  drops a preceding backslash (a cluster label's `\"` → `"`, id 2239). */
  drawStringsByObject(): ReadonlyMap<Node | Edge | Graph, XdotDraws> {
    return this.draws;
  }

  endGraph(g: Graph, job: RenderJob): void {
    // Flush the graph-level GDRAW/GLABEL buffers (canvas background + graph
    // label) onto the root graph, then serialize the whole graph.
    // @see gvrender_core_dot.c:427 xdot_end_graph
    const gd = this.flush(EmitState.GDraw);
    const gl = this.flush(EmitState.GLabel);
    if (this.emitDraws && (gd || gl)) {
      const set = this.drawsFor(g);
      if (gd) set.draw = gd;
      if (gl) set.ldraw = escBackslash(gl);
    }
    job.write(this.serialize(g));
  }

  /** Emit the canvas background polygon into the GDRAW buffer.
   *  @see lib/common/emit.c:1476 emit_background */
  pageBackground(g: Graph, job: RenderJob): void {
    const bg = g.attrs.get('bgcolor');
    let fillSpec = bg !== undefined && bg !== '' ? bg : 'white';
    // The xdot device is not GVDEVICE_DOES_TRUECOLOR, so emit_background maps an
    // explicit `bgcolor=transparent` to white (a filled white canvas), unlike a
    // truecolor device that paints nothing. @see lib/common/emit.c:1490
    if (fillSpec === 'transparent') fillSpec = 'white';
    // The canvas fill covers job->clip = gvc->bb ± job->pad. The dot/xdot device
    // default pad is 0 (SVG's is 4), so only an explicit `pad` attr expands the
    // background box (e.g. pad=2.0 → ±144). @see gvrender_core_dot.c:739
    // (render_features_dot default_pad 0) · emit.c:3367 (job->bb = bb ± pad)
    const padAttr = g.attrs.get('pad');
    const pad = padAttr !== undefined && padAttr !== '' ? parseGraphPad(padAttr) : { x: 0, y: 0 };
    const bb = job.bb;
    const corners: Point[] = [
      { x: bb.ll.x - pad.x, y: bb.ll.y - pad.y },
      { x: bb.ll.x - pad.x, y: bb.ur.y + pad.y },
      { x: bb.ur.x + pad.x, y: bb.ur.y + pad.y },
      { x: bb.ur.x + pad.x, y: bb.ll.y - pad.y },
    ];
    const buf = this.bufs[EmitState.GDraw]!;
    buf.push(xdotPenColor(resolveRenderColor('transparent')));
    buf.push(this.backgroundFillOp(g, fillSpec, corners));
    buf.push(xdotPoints('P', corners));
  }

  /** The canvas fill op: a two-colour `bgcolor` is a gradient (emit_background →
   *  findStopColor), linear or radial per style; anything else is a flat fill.
   *  @see lib/common/emit.c:1476 emit_background */
  private backgroundFillOp(g: Graph, fillSpec: string, corners: Point[]): string {
    const stop = fillSpec.includes(':') ? findStopColor(fillSpec) : null;
    if (stop === null) return xdotFillColor(resolveRenderColor(fillSpec));
    const angle = Number(g.attrs.get('gradientangle') ?? 0) || 0;
    const op = parseStyleFlags(g.attrs.get('style')).radial ? radialGradientOp : linearGradientOp;
    return op(
      corners, resolveRenderColor(stop.fillColor), resolveRenderColor(stop.stopColor), stop.frac, angle,
    );
  }

  beginNode(_n: Node, _job: RenderJob): void { /* no-op */ }

  endNode(n: Node, _job: RenderJob): void {
    const draw = this.flush(EmitState.NDraw);
    const ldraw = this.flush(EmitState.NLabel);
    if (draw || ldraw) {
      const set = this.drawsFor(n);
      if (draw) set.draw = draw;
      if (ldraw) set.ldraw = escBackslash(ldraw);
    }
    this.resetState(EmitState.NDraw, EmitState.NLabel);
  }

  /**
   * Emit the edge spline beziers (EDRAW) and arrowhead ops (TDRAW/HDRAW),
   * reading the already-routed geometry from `e.info`. Mirrors
   * emit_edge_graphics: each bezier under the edge pen, then tail/head arrows
   * under the default solid line style. The port draws SVG edges directly in
   * svg.ts (not via shared bezier/polygon callbacks), so the xdot edge draw is
   * self-contained here — the same per-renderer split the port already uses.
   * @see lib/common/emit.c:emit_edge_graphics
   */
  beginEdge(e: Edge, job: RenderJob): void {
    // emit_edge gates ALL edge drawing (spline + labels) on edge_in_box: an edge
    // whose only content is a label placed outside job->clip draws nothing. The
    // SVG renderer applies the same gate via edgeGroupOpen; the xdot renderer
    // must too, else concentrate-merged edges (no spline, stale off-box label
    // position) emit a spurious _ldraw_. @see lib/common/emit.c:emit_edge (3039)
    this.edgeDrawable = edgeHasDrawableContent(e, job.bb);
    const spl = e.info.spl;
    if (!this.edgeDrawable || spl === undefined) return;
    const edraw = this.bufs[EmitState.EDraw]!;
    const colorAttr = e.attrs.get('color') ?? '';
    const numc = (colorAttr.match(/:/g) ?? []).length;
    const numsemi = (colorAttr.match(/;/g) ?? []).length;
    // Tapered edge (style=tapered) → the first bezier as a filled taper polygon
    // with transparent pen + edge-color fill; else plain `:` multicolor → N
    // parallel offset beziers; else the single-color spline. @see emit.c:2422/2443
    // Split-multicolor arrow colors: tail = first color, head = end color
    // (inverse of the parallel branch). Undefined for all other edge kinds.
    // @see lib/common/emit.c:2400 (multicolor arrow rule)
    let tailArrowColor: string | undefined;
    let headArrowColor: string | undefined;
    if (numsemi > 0 && numc > 0) {
      // Split-along-length `;` multicolor (e.g. `red;0.5:blue`): one bezier per
      // color segment, split along the spline's arc length. Takes precedence
      // over tapered / `:` parallel, matching C's `if (numsemi && numc)` order.
      // @see lib/common/emit.c:2389 multicolor
      const c = this.emitSplitSpline(spl.list as (Bezier | undefined)[], colorAttr, edraw, job);
      tailArrowColor = c.firstColor;
      headArrowColor = c.endColor;
    } else if (edgeIsTapered(e)) {
      this.emitTaperedSpline(e, spl.list[0], edraw, job);
    } else if (numc > 0) {
      this.emitParallelSpline(spl.list as (Bezier | undefined)[], colorAttr, numc, edraw, job);
    } else {
      this.emitPlainSpline(e, spl.list, edraw, job);
    }
    // Arrows: y-up ops already computed for the shared render path. C sets the
    // default line style ("solid") + penwidth before each arrow primitive.
    this.emitArrows(this.bufs[EmitState.TDraw]!, e.info.tailArrowOps, job, EmitState.TDraw, tailArrowColor);
    this.emitArrows(this.bufs[EmitState.HDraw]!, e.info.headArrowOps, job, EmitState.HDraw, headArrowColor);
  }

  /**
   * Emit a tapered edge's first bezier as a filled taper polygon: `S <n>
   * -tapered` (the style), a transparent pen, the edge-color fill, then the
   * polygon vertices from `taper()` (y-up). @see lib/common/emit.c:2422
   */

  endEdge(e: Edge, job: RenderJob): void {
    // edge_in_box gate (set in beginEdge): a content-less / off-box edge draws
    // nothing, matching native's emit_edge early return. @see emit.c:emit_edge
    if (!this.edgeDrawable) {
      this.resetEdgeState();
      return;
    }
    // Emit the edge's labels (center/xlabel/head/tail) — the port draws these
    // in svg.ts endEdge, not the shared path, so the xdot renderer runs them
    // itself, mirroring emit_edge's emit_edge_label. gvrenderTextspan routes
    // each span to the edge's ELABEL buffer → _ldraw_. @see emit.c:3010
    renderEdgeLabels(e, this, job);
    this.attachEdgeDraws(e);
    this.resetEdgeState();
    this.textflags[EmitState.HLabel] = 0;
    this.textflags[EmitState.TLabel] = 0;
  }

  /** Flush the six edge buffers and attach the non-empty ones. Label buffers get
   *  put_escaping_backslashes; shape buffers do not.
   *  @see plugin/core/gvrender_core_dot.c:218 */
  private attachEdgeDraws(e: Edge): void {
    // (buffer, target field, is-a-label) in C's flush order. Label buffers get
    // put_escaping_backslashes; shape buffers do not.
    const spec: [EmitState, keyof XdotDraws, boolean][] = [
      [EmitState.EDraw, 'draw', false],
      [EmitState.HDraw, 'hdraw', false],
      [EmitState.TDraw, 'tdraw', false],
      [EmitState.ELabel, 'ldraw', true],
      [EmitState.HLabel, 'hldraw', true],
      [EmitState.TLabel, 'tldraw', true],
    ];
    const flushed = spec.map(([state, field, isLabel]) =>
      [field, this.flush(state), isLabel] as const);
    if (!flushed.some(([, s]) => s)) return;
    const set = this.drawsFor(e);
    for (const [field, s, isLabel] of flushed) {
      if (s) set[field] = isLabel ? escBackslash(s) : s;
    }
  }

  /** Per-edge emit-state reset, run on both the drawable and the early-return
   *  path — identical in C, so it is one helper here rather than two copies. */
  private resetEdgeState(): void {
    this.resetState(EmitState.EDraw, EmitState.ELabel);
    this.resetState(EmitState.HDraw, EmitState.TDraw);
    this.penwidth[EmitState.HLabel] = 1;
    this.penwidth[EmitState.TLabel] = 1;
  }

  beginCluster(_sg: Graph, _job: RenderJob): void { /* no-op */ }

  endCluster(sg: Graph, _job: RenderJob): void {
        const draw = this.flush(EmitState.CDraw);
    const ldraw = this.flush(EmitState.CLabel);
    if (draw || ldraw) {
      const set = this.drawsFor(sg);
      if (draw) set.draw = draw;
      // Cluster labels are stored via plain agxset (xdot_end_cluster:286), NOT
      // put_escaping_backslashes like node/edge/graph labels — so NO escBackslash.
      // The source `\"`/`\\` in the label survive as-is through agcanonEscape on
      // serialize (drawAttr). @see gvrender_core_dot.c:286
      if (ldraw) set.ldraw = ldraw;
    }
    this.clusters.push(sg);
    this.resetState(EmitState.CDraw, EmitState.CLabel);
  }

  textspan(pos: Point, span: TextSpan, job: RenderJob): void {
    const buf = this.getBuf(job);
    const st = job.obj !== null ? job.obj.emitState : EmitState.GDraw;
    const j = span.just === 'l' ? -1 : span.just === 'r' ? 1 : 0;
    const p = { x: pos.x, y: pos.y + span.yoffset_centerline };
    buf.push(xdotFont(span.fontSize, span.fontName ?? ''));
    buf.push(xdotPenColor(resolveRenderColor(span.fontColor ?? 'black')));
    // Text flags (xdot version >= 15): emit `t <bits>` only when they change.
    // @see gvrender_core_dot.c:520 xdot_textspan
    const bits = (span.fontFlags ?? 0) & 0x7f;
    if (this.textflags[st] !== bits) {
      buf.push('t ' + String(bits) + ' ');
      this.textflags[st] = bits;
    }
    buf.push(
      'T ' + xdotPoint(p) + String(j) + ' ' + xdotNum(span.size.x) + ' ' +
        String(utf8Len(span.str)) + ' -' + span.str + ' ',
    );
  }

  ellipse(center: Point, rx: number, ry: number, filled: boolean, job: RenderJob): void {
    const buf = this.getBuf(job);
    buf.push(this.styleOp(job), this.penOp(job));
    // C passes A=[center, corner] to the gradient; corner = center + (rx,ry).
    if (filled) buf.push(this.fillOp(job, [center, { x: center.x + rx, y: center.y + ry }]));
    buf.push(filled ? 'E ' : 'e ', xdotPoint(center), xdotNum(rx) + ' ' + xdotNum(ry) + ' ');
  }

  polygon(pts: Point[], filled: boolean, job: RenderJob): void {
    const buf = this.getBuf(job);
    buf.push(this.styleOp(job), this.penOp(job));
    if (filled) buf.push(this.fillOp(job, pts));
    buf.push(xdotPoints(filled ? 'P' : 'p', pts));
  }

  bezier(pts: Point[], filled: boolean, job: RenderJob): void {
    const buf = this.getBuf(job);
    buf.push(this.styleOp(job), this.penOp(job));
    if (filled) buf.push(this.fillOp(job, pts));
    // NB 'b'/'B' are reversed vs the other ops. @see gvrender_core_dot.c:632
    buf.push(xdotPoints(filled ? 'b' : 'B', pts));
  }

  polyline(pts: Point[], job: RenderJob): void {
    const buf = this.getBuf(job);
    buf.push(this.styleOp(job), this.penOp(job), xdotPoints('L', pts));
  }

  // --- graphics-state ops ------------------------------------------------

  /** Pen color op from the resolved graphics state (default black). */
  protected penOp(job: RenderJob): string {
    return xdotPenColor(job.obj?.penColor ?? { type: 'string', s: 'black' });
  }

  /**
   * Fill op from the resolved graphics state. A linear gradient emits the
   * bracketed `C len -[G0 G1 2 <stops>]` form (xdot_gradient_fillcolor); a plain
   * fill emits `C len -#hex`. `pts` are the shape points the gradient endpoints
   * derive from. Radial gradients are deferred (emit the base fill).
   * @see plugin/core/gvrender_core_dot.c:544 xdot_gradient_fillcolor
   */
  private fillOp(job: RenderJob, pts: Point[]): string {
    const obj = job.obj;
    if (obj && obj.fill === FillType.Linear) {
      return linearGradientOp(pts, obj.fillColor, obj.stopColor, obj.gradientFrac, obj.gradientAngle);
    }
    if (obj && obj.fill === FillType.Radial) {
      return radialGradientOp(pts, obj.fillColor, obj.stopColor, obj.gradientFrac, obj.gradientAngle);
    }
    return xdotFillColor(obj?.fillColor ?? { type: 'string', s: 'black' });
  }

  /** Style ops (`S`): setlinewidth on a penwidth change, plus dash/dot pen.
   *  @see gvrender_core_dot.c:161 xdot_style */
  protected styleOp(job: RenderJob): string {
    const obj = job.obj;
    if (obj === null) return '';
    let s = '';
    const st = obj.emitState;
    if (Math.abs(obj.penWidth - this.penwidth[st]!) >= 0.0005) {
      this.penwidth[st] = obj.penWidth;
      s += xdotStrOp('S ', 'setlinewidth(' + trimFixed3(obj.penWidth) + ')');
    }
    // Named styles carried in obj.rawStyle (the parsed style tokens, e.g. an
    // explicit `style="solid"`/`"dashed"`) emit an `S` op — but only the LINE
    // styles. xdot_style filters filled/bold/setlinewidth; the polygon/fill
    // styles (rounded/diagonals/striped/wedged/invis/radial/tapered) are
    // consumed by the shape/fill code before gvrender_set_style, so native
    // never emits them as `S` ops either. @see gvrender_core_dot.c:184
    if (obj.rawStyle.length > 0) {
      for (const p of obj.rawStyle) {
        if (NON_LINE_STYLES.has(p) || p.startsWith('setlinewidth')) continue;
        s += xdotStrOp('S ', p);
      }
    } else {
      // Fallback for paths that set only a PenType (no rawStyle): reconstruct
      // the dash/dot token C would emit from the pen.
      if (obj.pen === PenType.Dashed) s += xdotStrOp('S ', 'dashed');
      else if (obj.pen === PenType.Dotted) s += xdotStrOp('S ', 'dotted');
    }
    return s;
  }

  // --- buffer + side-table plumbing --------------------------------------

  /** Active xdot buffer for the current emit state. */
  private getBuf(job: RenderJob): string[] {
    const obj = job.obj;
    return this.bufs[obj !== null ? obj.emitState : EmitState.GDraw]!;
  }

  /** Join and clear the buffer for `state`; returns '' when empty. */
  private flush(state: EmitState): string {
    const buf = this.bufs[state]!;
    const s = buf.join('');
    buf.length = 0;
    return s;
  }

  /** Reset per-emit-state penwidth/textflags after an object (C's reset). */
  private resetState(draw: EmitState, label: EmitState): void {
    this.penwidth[draw] = 1;
    this.penwidth[label] = 1;
    this.textflags[draw] = 0;
    this.textflags[label] = 0;
  }

  private drawsFor(o: Node | Edge | Graph): XdotDraws {
    let d = this.draws.get(o);
    if (d === undefined) {
      d = {};
      this.draws.set(o, d);
    }
    return d;
  }

  // --- serialization (agwrite-at-end) ------------------------------------

}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * DOT format renderer (`-Tdot`) — the same engine as {@link XdotRenderer} with
 * the xdot draw-attribute step switched off, mirroring C's one renderer with a
 * `job->render.id` switch: FORMAT_DOT is `attach_attrs(g)` then `agwrite(g)`,
 * FORMAT_XDOT is `attach_attrs_and_arrows` + the `xdot_*` draw attributes then
 * *the same* `agwrite(g)`. Sharing the serializer is what makes `-Tdot` emit the
 * subgraph tree, per-scope node/edge scoping, and the `node [label="\N"]`
 * default line, none of which a streaming emitter can produce (the whole graph
 * must be walked before the first byte).
 *
 * The drawing callbacks are overridden to no-ops: `-Tdot` renders no draw ops,
 * so accumulating them would be dead work.
 *
 * @see plugin/core/gvrender_core_dot.c:398 dot_begin_graph / :464 dot_end_graph
 */
export class DotRenderer extends XdotRenderer {
  override readonly type: string = 'dot';
  protected override readonly emitDraws: boolean = false;

  override textspan(_pos: Point, _span: TextSpan, _job: RenderJob): void { /* no-op */ }
  override ellipse(_c: Point, _rx: number, _ry: number, _f: boolean, _j: RenderJob): void { /* no-op */ }
  override polygon(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  override bezier(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  override polyline(_pts: Point[], _job: RenderJob): void { /* no-op */ }
}

/** @see plugin/core/gvrender_core_dot.c FORMAT_DOT */
export function createDotRenderer(): RendererPlugin {
  return new DotRenderer();
}

/** @see plugin/core/gvrender_core_dot.c FORMAT_XDOT */
export function createXdotRenderer(): RendererPlugin {
  return new XdotRenderer();
}

