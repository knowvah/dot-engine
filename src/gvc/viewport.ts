// SPDX-License-Identifier: EPL-2.0
//
// Drawing-scale (viewport fit) for the `size=` graph attribute. Ports the parse
// (getdoubles2ptf) and the zoom factor Z (init_job_viewport) so SVG output is
// fitted to the requested size, exactly as native `dot` does. The zoom is
// carried by the SVG group transform, never by the coordinates (decisions D4).
//
// Also ports the `pad=` graph-attribute parse (init_gvc's attr read +
// init_job_pad's fallback), threaded into the fit computation exactly as C's
// init_job_viewport does (job->bb = graph bb expanded by job->pad on every
// side before the size= fit is computed).
//
// Also ports the `margin=` graph-attribute parse (init_gvc's attr read +
// init_job_margin's fallback). Unlike pad, margin does NOT feed the size=
// fit; it only affects job.width/job.height and the page group translate
// (device.ts render() / svg-graph.ts emitSvgTag+svgBeginPage), applied AFTER
// the size= zoom Z (matching C's init_job_margin -> ... -> init_job_pagination
// call order, emit.c:4290-4294).
//
// @see lib/common/input.c:476 getdoubles2ptf
// @see lib/common/emit.c:3356 init_job_viewport
// @see lib/common/emit.c:3230-3251 init_gvc (pad attr read)
// @see lib/common/emit.c:3290-3304 init_job_pad
// @see lib/common/emit.c:3229-3239 init_gvc (margin attr read)
// @see lib/common/emit.c:3309-3331 init_job_margin

import type { Box, Point } from '../model/geom.js';
import { POINTS_PER_INCH } from '../model/geom.js';
import { SVG_MARGIN } from '../render/svg-helpers.js';
import type { Graph } from '../model/graph.js';
import { cround } from '../common/arith.js';
import { scanStrtod } from '../xdot/strtod.js';

/** Parsed `size=` drawing size in points, plus the *filled* flag. */
export interface DrawingSize {
  x: number;
  y: number;
  filled: boolean;
}

/** A C-`sscanf("%lf")`-style float token (sign, digits, optional exponent). */
const FLOAT = '[-+]?[0-9.]+(?:[eE][-+]?[0-9]+)?';
/** sscanf("%lf,%lf%c"): two floats (whitespace-tolerant) then the next char. */
const SIZE_XY_RE = new RegExp(`^\\s*(${FLOAT})\\s*,\\s*(${FLOAT})(.?)`);
/** sscanf("%lf%c"): a lone float (square box) then the next char. */
const SIZE_X_RE = new RegExp(`^\\s*(${FLOAT})(.?)`);
/** sscanf("%lf,%lf") without the trailing-char capture used by `pad=`. */
const PAD_XY_RE = new RegExp(`^\\s*(${FLOAT})\\s*,\\s*(${FLOAT})`);
/** sscanf("%lf") without the trailing-char capture used by `pad=`. */
const PAD_X_RE = new RegExp(`^\\s*(${FLOAT})`);

/** Inches→points exactly as C's POINTS macro: ROUND(in * 72). @see geom.h:62 */
function toPoints(inches: number): number {
  return cround(inches * POINTS_PER_INCH);
}

/**
 * Port of getdoubles2ptf(g, "size", …) for the `size=` attribute: parse
 * `"x,y"` (or a lone `"x"` meaning square), convert inches→points, and treat a
 * trailing `!` as the *filled* flag. Returns null when `size` is absent or
 * non-positive (Z stays 1 — D5).
 * @see lib/common/input.c:476 getdoubles2ptf
 */
export function parseDrawingSize(raw: string | undefined): DrawingSize | null {
  if (raw === undefined) return null;
  const xy = SIZE_XY_RE.exec(raw);
  if (xy) {
    const xf = Number(xy[1]);
    const yf = Number(xy[2]);
    if (xf > 0 && yf > 0) return { x: toPoints(xf), y: toPoints(yf), filled: xy[3] === '!' };
  }
  const x = SIZE_X_RE.exec(raw);
  if (x) {
    const xf = Number(x[1]);
    if (xf > 0) return { x: toPoints(xf), y: toPoints(xf), filled: x[2] === '!' };
  }
  return null;
}

/**
 * The pad init_job_pad gives an output language that is not a render plugin,
 * in points. Here it is the pad of a renderer that states no `defaultPad`.
 * @see lib/common/const.h:96
 */
export const DEFAULT_GRAPH_PAD = 4;

/**
 * Port of the `pad=` graph-attribute parse: init_gvc reads it via
 * `sscanf(p, "%lf,%lf", &xf, &yf)` (2 values matched → both axes
 * independently; 1 value → y = x; 0 matched — attr absent or unparsable —
 * leaves `graph_sets_pad` false) and init_job_pad then takes `fallback` on
 * both axes: the render plugin's `default_pad` (`RendererPlugin.defaultPad`),
 * or `DEFAULT_GRAPH_PAD` where there is none.
 *
 * Unlike `size=`, pad values are NOT rounded (`xf * POINTS_PER_INCH`
 * directly — no `POINTS()` macro) and are not required to be positive.
 *
 * @see lib/common/emit.c:3241-3251 init_gvc (pad attr read)
 * @see lib/common/emit.c:3290-3304 init_job_pad (fallback)
 */
export function parseGraphPad(raw: string | undefined, fallback: number): Point {
  if (raw !== undefined) {
    const xy = PAD_XY_RE.exec(raw);
    if (xy) {
      return { x: Number(xy[1]) * POINTS_PER_INCH, y: Number(xy[2]) * POINTS_PER_INCH };
    }
    const x = PAD_X_RE.exec(raw);
    if (x) {
      const v = Number(x[1]) * POINTS_PER_INCH;
      return { x: v, y: v };
    }
  }
  return { x: fallback, y: fallback };
}

/**
 * Port of the `margin=` graph-attribute parse: init_gvc reads it via the same
 * `sscanf(p, "%lf,%lf", &xf, &yf)` shape as `pad=` (2 values matched → both
 * axes independently; 1 value → y = x; 0 matched leaves `graph_sets_margin`
 * false) and init_job_margin falls back to the SVG plugin's
 * `device_features_svg.default_margin` ({0,0}) when unset — the
 * `GVRENDER_PLUGIN` branch of init_job_margin's fallback switch (the
 * PCL/MIF/etc. print-margin and generic embed-margin branches never apply to
 * this port's only renderer).
 *
 * This is a distinct attribute/mechanism from the already-ported per-node and
 * per-cluster `margin=` (shape internal label margin) — do not conflate.
 * Unlike `size=`, margin values are NOT rounded (`xf * POINTS_PER_INCH`
 * directly) and are not required to be positive, matching `pad=`.
 *
 * @see lib/common/emit.c:3229-3239 init_gvc (margin attr read)
 * @see lib/common/emit.c:3309-3331 init_job_margin (fallback)
 */
export function parseGraphMargin(raw: string | undefined): Point {
  if (raw !== undefined) {
    const xy = PAD_XY_RE.exec(raw);
    if (xy) {
      return { x: Number(xy[1]) * POINTS_PER_INCH, y: Number(xy[2]) * POINTS_PER_INCH };
    }
    const x = PAD_X_RE.exec(raw);
    if (x) {
      const v = Number(x[1]) * POINTS_PER_INCH;
      return { x: v, y: v };
    }
  }
  return { x: SVG_MARGIN, y: SVG_MARGIN };
}

export { parseLandscape } from './landscape.js';

/**
 * Whether the drawing needs scaling to fit `size`: too big in either axis, or
 * (when *filled*) too small in both. @see lib/common/emit.c:3380-3382
 */
function drawingNeedsFit(size: DrawingSize, szx: number, szy: number): boolean {
  const tooBig = size.x < szx || size.y < szy;
  const fillsUp = size.filled && size.x > szx && size.y > szy;
  return tooBig || fillsUp;
}

/**
 * What init_job_viewport leaves on the job: the port's size in points, scaled
 * but not rotated (`view`), the scaling factor (`zoom`), and the point of the
 * graph at the port's centre (`focus`).
 * @see lib/common/emit.c:init_job_viewport (job->view, job->zoom, job->focus)
 */
export interface JobViewport {
  view: Point;
  zoom: number;
  focus: Point;
}

/**
 * init_job_viewport up to the user override: sz is the bb padded by `pad`
 * (job->bb = bb ± pad, sz = job->bb.UR - job->bb.LL), a `size=` substitutes a
 * degenerate sz axis and fits the drawing into it (Z), the focus is the centre
 * of the UNPADDED bb and the view is Z * sz. Split from applyViewportAttr only
 * for the function-size limit; C runs the two in one body.
 * @see lib/common/emit.c:init_job_viewport
 */
export function initJobViewport(bb: Box, size: DrawingSize | null, pad: Point): JobViewport {
  const jbLL = { x: bb.ll.x - pad.x, y: bb.ll.y - pad.y };
  const jbUR = { x: bb.ur.x + pad.x, y: bb.ur.y + pad.y };
  const sz = { x: jbUR.x - jbLL.x, y: jbUR.y - jbLL.y };
  let z = 1.0;
  if (size !== null && size.x > 0.001 && size.y > 0.001) {
    if (sz.x <= 0.001) sz.x = size.x;
    if (sz.y <= 0.001) sz.y = size.y;
    if (drawingNeedsFit(size, sz.x, sz.y)) z = Math.min(size.x / sz.x, size.y / sz.y);
  }
  const focus = { x: 0.5 * (bb.ll.x + bb.ur.x), y: 0.5 * (bb.ll.y + bb.ur.y) };
  return { view: { x: z * sz.x, y: z * sz.y }, zoom: z, focus };
}

/**
 * sscanf's `%lf` conversions joined by the literal `,`, from the start of `s`:
 * the values read, in order, and the offset after the last one. A conversion
 * that fails ends the scan, as sscanf returns at the first mismatch.
 * @see lib/common/emit.c:init_job_viewport (the three sscanf formats)
 */
function scanCommaDoubles(s: string, max: number): { vals: number[]; pos: number } {
  const vals: number[] = [];
  let pos = 0;
  while (vals.length < max) {
    if (vals.length > 0) {
      if (s[pos] !== ',') break;
      pos++;
    }
    const r = scanStrtod(s, pos);
    if (r === null) break;
    vals.push(r.val);
    pos = r.pos;
  }
  return { vals, pos };
}

/**
 * The node name `%[^<stop>]` reads at `pos` after the literal `lead`, or null
 * when the literal does not match or the set matches no character.
 */
function scanSet(s: string, pos: number, lead: string, stop: string): { name: string; pos: number } | null {
  if (!s.startsWith(lead, pos)) return null;
  const from = pos + lead.length;
  let end = from;
  while (end < s.length && s[end] !== stop) end++;
  return end === from ? null : { name: s.slice(from, end), pos: end };
}

/**
 * The node name the viewport names, as init_job_viewport's first two sscanf
 * formats read it: `W,H,Z,'name'` (rv == 4: the closing quote is not needed),
 * else `W,H,Z,name` with nothing after the name (rv == 4: `%c` finds no
 * character). Null when neither returns 4.
 */
function viewportNodeName(s: string): string | null {
  const head = scanCommaDoubles(s, 3);
  if (head.vals.length < 3) return null;
  const quoted = scanSet(s, head.pos, ",'", "'");
  if (quoted !== null) return quoted.name;
  const bare = scanSet(s, head.pos, ',', ',');
  return bare !== null && bare.pos === s.length ? bare.name : null;
}

/**
 * The user override of init_job_viewport: `viewport="W,H,Z,x,y"` or
 * `"W,H,Z,node"` (the node quoted or bare). Each sscanf assigns the values it
 * reads before a mismatch, so a short value overrides only its leading fields
 * (`"W,H"` keeps the size= fit's Z). A named node found in the root graph
 * moves the focus to its coord; a name that is not a node keeps the default
 * focus, a fourth number included (`"W,H,Z,x"` reads x as a name).
 * @see lib/common/emit.c:init_job_viewport
 */
export function applyViewportAttr(vp: JobViewport, g: Graph): JobViewport {
  const str = g.attrs.get('viewport');
  if (str === undefined) return vp;
  const name = viewportNodeName(str);
  // XY.x, XY.y, Z, xy.x, xy.y: each keeps its value when sscanf stops before it.
  const v = [vp.view.x, vp.view.y, vp.zoom, vp.focus.x, vp.focus.y];
  scanCommaDoubles(str, name === null ? 5 : 3).vals.forEach((d, i) => { v[i] = d; });
  let focus = { x: v[3], y: v[4] };
  if (name !== null) {
    const n = g.root.nodes.get(name);
    if (n !== undefined) focus = { x: n.info.coord.x, y: n.info.coord.y };
  }
  return { view: { x: v[0], y: v[1] }, zoom: v[2], focus };
}

/**
 * init_job_viewport for the job's graph: the default viewport, then the
 * graph's `viewport=` override.
 * @see lib/common/emit.c:init_job_viewport
 */
export function jobViewport(g: Graph, bb: Box, size: DrawingSize | null, pad: Point): JobViewport {
  return applyViewportAttr(initJobViewport(bb, size, pad), g);
}

/**
 * job->clip for the single-page devices this port drives: init_job_pagination
 * sets pageSize = imageSize / zoom (imageSize = view, rotated to page
 * orientation and back) and setup_page sets clip.LL = focus + pageSize *
 * (elem - size / 2.) with pagesArrayElem 0 / pagesArraySize 1 and clip.UR =
 * clip.LL + pageSize. With no viewport= this is the bb ± pad, but not in
 * floating point: where the pad is below the double spacing (corpus 2784,
 * y = 2.16e18) clip.LL.y is 0, not -pad.
 * @see lib/common/emit.c:init_job_pagination, setup_page
 */
export function setupPageClip(vp: JobViewport): Box {
  const pageSize = setupPageSize(vp);
  const ll = {
    x: vp.focus.x + pageSize.x * (0 - 1 / 2.0),
    y: vp.focus.y + pageSize.y * (0 - 1 / 2.0),
  };
  return { ll, ur: { x: ll.x + pageSize.x, y: ll.y + pageSize.y } };
}

/**
 * job->pageSize, the size of one page in graph units: imageSize / zoom, where
 * imageSize is the view. Not always sz: (Z * sz) / Z can round one ulp away
 * from it.
 * @see lib/common/emit.c:init_job_pagination
 */
export function setupPageSize(vp: JobViewport): Point {
  return { x: vp.view.x / vp.zoom, y: vp.view.y / vp.zoom };
}

/**
 * job->pageBox for the single page (pagesArrayElem 0): LL = elem * pageSize -
 * pad, UR = LL + pageSize. Its origin is -pad whatever the bb's is, and it is
 * derived apart from job->clip, so the two can differ in their last bits.
 * @see lib/common/emit.c:setup_page (1515-1518)
 */
export function setupPageBox(pageSize: Point, pad: Point): Box {
  const ll = { x: 0 * pageSize.x - pad.x, y: 0 * pageSize.y - pad.y };
  return { ll, ur: { x: ll.x + pageSize.x, y: ll.y + pageSize.y } };
}
