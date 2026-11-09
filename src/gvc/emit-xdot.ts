// SPDX-License-Identifier: EPL-2.0

/**
 * Replays the graph's own draw ops (see init-xdot.ts) over the canvas fill. This
 * is why a second xdot render's graph `_draw_` holds the first one's.
 *
 * @see lib/common/emit.c:1362 emit_xdot
 */

import { agwarningf } from '../common/agerr.js';
import { lateInt } from '../common/nodeinit.js';
import { findStopColor, parseStyleFlags, resolvePenWidth, styleName, styleTokens } from '../common/style-resolve.js';
import type { Box, Point } from '../model/geom.js';
import type { Graph } from '../model/graph.js';
import { resolveFillColorName, resolveRenderColor } from '../render/color-resolve.js';
import type { XdotColor, XdotOp, XdotPoint } from '../xdot/types.js';
import { FillType, PenType, type RendererPlugin } from './context.js';
import { transformPoint } from './device-transform.js';
import { graphXdots } from './init-xdot.js';
import { gvrenderSetStyle } from './gvrender-set-style.js';
import type { ObjState, RenderJob } from './job.js';
import { initJobViewportZoom, parseDrawingSize, parseGraphPad, setupPageClip } from './viewport.js';

/** @see lib/common/const.h:48 */
const DEFAULT_COLOR = 'black';
/** @see lib/common/const.h:69 */
const DEFAULT_FILL = 'lightgrey';

/** C's defaultlinestyle. @see lib/gvc/gvcjob.h */
const DEFAULT_LINE_STYLE: readonly string[] = ['solid', 'setlinewidth(1)'];

/**
 * job->clip for this device. `job.clip` carries the SVG default pad of 4; the
 * xdot device's default is 0, so with no `pad` its clip is the bb, computed in
 * C's order, rounding included.
 * @see plugin/core/gvrender_core_dot.c:739 render_features_dot
 * @see lib/common/emit.c:1558
 */
export function deviceClip(g: Graph, renderer: RendererPlugin, job: RenderJob): Box {
  if (renderer.type === 'svg') return job.clip;
  const attr = g.attrs.get('pad');
  const pad = attr ? parseGraphPad(attr) : { x: 0, y: 0 };
  const size = parseDrawingSize(g.attrs.get('size'));
  return setupPageClip(job.bb, size, pad, initJobViewportZoom(job.bb, size, pad));
}

/**
 * C's `boxf_overlap(op->bb, job->clip)`. Only xdotBB fills `op->bb`, and only
 * neato's `-n` path calls that, so here it is still calloc's zero box: every op
 * draws when the clip holds the origin, and none does otherwise. Rounding can
 * put a sized drawing's clip just past the origin, and then nothing replays.
 * @see lib/common/emit.c:1373
 * @see lib/neatogen/neatoinit.c:560
 */
function zeroBoxInClip(clip: Box): boolean {
  return clip.ll.x <= 0 && clip.ll.y <= 0 && clip.ur.x >= 0 && clip.ur.y >= 0;
}

/**
 * The state emit_background leaves on the job's object, which emit_xdot then draws with: a transparent
 * pen and a `bgcolor` fill. A truecolor device paints nothing for `transparent`, so the state stays at C's
 * defaults; any other device maps it to white. The port's renderers paint the box without touching
 * `job.obj`, so this applies only when there are ops to replay, which leaves every other graph as it was.
 *
 * DEVIATION: after a gradient `bgcolor`, C frees `clrs[0]` while svg's fill state still points at it
 * (gvrender_resolve_color keeps `color->u.string = name`; emit.c:1518 frees it), so native prints the freed
 * bytes, `fill=""` in every run measured. The port keeps the colour C meant. xdot, which resolves to RGBA, agrees.
 * @see lib/common/emit.c:1476 emit_background
 */
function applyBackgroundState(g: Graph, renderer: RendererPlugin, obj: ObjState): void {
  const attr = g.attrs.get('bgcolor');
  const color = attr !== undefined && attr !== '' ? attr : 'white';
  const trueColor = renderer.type === 'svg';
  if (trueColor && color === 'transparent') {
    obj.penColor = resolveRenderColor(DEFAULT_COLOR);
    obj.fillColor = resolveFillColorName(DEFAULT_FILL);
    return;
  }
  const str = color === 'transparent' ? 'white' : color;
  obj.penColor = resolveRenderColor('transparent');
  const stop = str.includes(':') ? findStopColor(str) : null;
  if (stop === null) {
    obj.fillColor = resolveFillColorName(str);
    return;
  }
  obj.fillColor = resolveFillColorName(stop.fillColor);
  obj.stopColor = resolveFillColorName(stop.stopColor);
  obj.gradientAngle = lateInt(g.attrs.get('gradientangle'), 0, 0);
  obj.gradientFrac = stop.frac;
}

/** Sets the gradient fill state. @see lib/common/emit.c:1421-1444 */
function setGradientFill(obj: ObjState, color: XdotColor): void {
  if (color.type === 'none') return;
  const ramp = color.type === 'radial' ? color.ring : color.ling;
  obj.fillColor = resolveFillColorName(ramp.stops[0]!.color);
  obj.stopColor = resolveFillColorName(ramp.stops[1]!.color);
  obj.gradientFrac = ramp.stops[1]!.frac;
  if (color.type === 'radial') {
    const r = color.ring;
    // `|| 0`: a zero r0 gives acos(-inf), NaN, and C's (int) cast on arm64, the oracle, makes that 0.
    obj.gradientAngle = r.x1 === r.x0 && r.y1 === r.y0
      ? 0
      : Math.trunc(180 * Math.acos((r.x0 - r.x1) / r.r0) / Math.PI) || 0;
    obj.fill = FillType.Radial;
  } else {
    const l = color.ling;
    obj.gradientAngle = Math.trunc(180 * Math.atan2(l.y1 - l.y0, l.x1 - l.x0) / Math.PI);
    obj.fill = FillType.Linear;
  }
}

/**
 * The pen each pen token sets. `filled` and `unfilled` are absent: they write
 * C's `obj->fill`, which emit_xdot does not read (it passes a local `filled`).
 * The port's `obj.fill` stands in for that local, so they must not write it.
 * @see lib/gvc/gvrender.c:480 gvrender_set_style
 */
const PEN_OF_STYLE: ReadonlyMap<string, PenType> = new Map([
  ['solid', PenType.Solid],
  ['dashed', PenType.Dashed],
  ['dotted', PenType.Dotted],
  ['invis', PenType.None],
  ['invisible', PenType.None],
]);

/**
 * Tokens apply in order, and each changes only the field it names: `bold` leaves
 * a dashed pen dashed, and `dashed` leaves the width.
 * @see lib/gvc/gvrender.c:480 gvrender_set_style
 */
function setStyle(obj: ObjState, tokens: readonly string[]): void {
  gvrenderSetStyle(tokens);
  obj.rawStyle = [...tokens];
  for (const token of tokens) {
    const pen = PEN_OF_STYLE.get(styleName(token));
    if (pen !== undefined) obj.pen = pen;
    const flags = parseStyleFlags(token);
    if (flags.bold || flags.setLineWidth !== null) obj.penWidth = resolvePenWidth(flags, undefined);
  }
}

/** What a drawing op passes to the renderer, in device coordinates. */
function devicePoints(pts: readonly XdotPoint[], job: RenderJob): Point[] {
  return pts.map((p) => transformPoint({ x: p.x, y: p.y }, job));
}

/** The drawing ops of emit_xdot; true when `op` was one. */
function drawOp(op: XdotOp, renderer: RendererPlugin, job: RenderJob): boolean {
  switch (op.kind) {
    case 'filled_ellipse':
    case 'unfilled_ellipse': {
      const { x, y, w, h } = op.ellipse;
      const c = transformPoint({ x, y }, job);
      renderer.ellipse(c, w, h, op.kind === 'filled_ellipse', job);
      return true;
    }
    case 'filled_polygon':
    case 'unfilled_polygon':
      renderer.polygon(devicePoints(op.polygon.pts, job), op.kind === 'filled_polygon', job);
      return true;
    case 'filled_bezier':
    case 'unfilled_bezier':
      renderer.bezier(devicePoints(op.bezier.pts, job), op.kind === 'filled_bezier', job);
      return true;
    case 'polyline':
      renderer.polyline(devicePoints(op.polyline.pts, job), job);
      return true;
    default:
      return false;
  }
}

/** The state ops of emit_xdot. Fonts need no handling here, as in C. */
function stateOp(op: XdotOp, obj: ObjState, warned: { image: boolean }): void {
  switch (op.kind) {
    case 'fill_color':
      obj.fillColor = resolveFillColorName(op.color);
      obj.fill = FillType.Solid;
      break;
    case 'pen_color':
      obj.penColor = resolveRenderColor(op.color);
      obj.fill = FillType.Solid;
      break;
    case 'grad_fill_color':
      setGradientFill(obj, op.gradColor);
      break;
    case 'grad_pen_color':
      agwarningf('gradient pen colors not yet supported.');
      break;
    case 'style':
      setStyle(obj, styleTokens(op.style));
      break;
    case 'image':
      if (!warned.image) agwarningf('Images unsupported in "background" attribute');
      warned.image = true;
      break;
    default:
      break;
  }
}

/**
 * Replays the graph's draw ops, inside emit_background. A text op is skipped:
 * only xdotBB builds its span, so C dereferences a null span here and a `_draw_`
 * with text crashes native.
 * @see lib/common/emit.c:1362 emit_xdot
 */
export function emitXdot(g: Graph, renderer: RendererPlugin, job: RenderJob): void {
  const xd = graphXdots(g);
  const obj = job.obj;
  if (xd === undefined || obj === null) return;
  applyBackgroundState(g, renderer, obj);
  const inClip = zeroBoxInClip(deviceClip(g, renderer, job));
  const warned = { image: false };
  let styled = false;
  for (const op of xd.ops) {
    styled ||= op.kind === 'style';
    if (op.kind === 'text') continue;
    if (isDrawing(op) && !drawsNow(obj, inClip)) continue;
    if (!drawOp(op, renderer, job)) stateOp(op, obj, warned);
  }
  if (styled) setStyle(obj, DEFAULT_LINE_STYLE);
}

/**
 * A drawing op's clip test, and gvrender's own: its ellipse, polygon, beziercurve
 * and polyline all draw only if `pen != PEN_NONE`.
 * @see lib/gvc/gvrender.c:524,543,583,600
 */
function drawsNow(obj: ObjState, inClip: boolean): boolean {
  return inClip && obj.pen !== PenType.None;
}

function isDrawing(op: XdotOp): boolean {
  return op.kind.endsWith('ellipse') || op.kind.endsWith('polygon') || op.kind.endsWith('bezier')
    || op.kind === 'polyline';
}
