// SPDX-License-Identifier: EPL-2.0
//
// Render-time color resolution, faithfully mirroring C's
// gvrender_resolve_color (lib/gvc/gvrender.c:188-213) for the SVG renderer.
//
// Every raw color string (a `color`/`fillcolor`/`pencolor`/`bgcolor` attribute,
// a gradient stop, a multicolor segment) is gated through the SVG renderer's
// `knowncolors` list (plugin/core/gvrender_core_svg.c:724-767):
//   - a name in the list is kept VERBATIM (C keeps `name` unchanged), so
//     `red`/`lightgrey`/`transparent` round-trip as written;
//   - any other spec (#hex, "H,S,V" HSV, "r,g,b[,a]", "/scheme/name") is run
//     through colorxlate() into canonical RGBA, which the SVG layer then emits
//     as lowercase `#rrggbb` (+ fill/stroke-opacity for partial alpha).
//
// This is the single chokepoint the render path was missing: the port had
// colorxlate() but never called it on the emission path, so colors were echoed
// verbatim (`#FF0000`, raw HSV `0.2,0.8,0.8`, unresolved scheme names).

import {
  colorxlate,
  ColorxlateResult,
  getColorScheme,
  setColorScheme,
  type GVColor,
} from '../common/color.js';
import type { Edge } from '../model/edge.js';
import { registerRenderState } from '../common/render-state.js';
import { agerrorf, agwarningf } from '../common/agerr.js';
import { parseSegs } from '../common/multicolor.js';
import { findStopColor, styleTokens } from '../common/style-resolve.js';
import { emitOnce } from '../common/emit-once.js';

/**
 * The SVG renderer's known color names, ported verbatim from
 * plugin/core/gvrender_core_svg.c:726-767 (svg_knowncolors[]). A name found
 * here is emitted as-is; anything else is canonicalized via colorxlate.
 *
 * Includes `transparent` (mapped to `none` at emission). Does NOT include
 * `none`, which is the literal output token, handled in resolveRenderColor.
 */
// prettier-ignore
const SVG_KNOWN_COLORS: readonly string[] = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure',
  'beige', 'bisque', 'black', 'blanchedalmond', 'blue',
  'blueviolet', 'brown', 'burlywood',
  'cadetblue', 'chartreuse', 'chocolate', 'coral',
  'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
  'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
  'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
  'firebrick', 'floralwhite', 'forestgreen', 'fuchsia',
  'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray',
  'green', 'greenyellow', 'grey',
  'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki',
  'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
  'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
  'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue',
  'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue',
  'mediumorchid', 'mediumpurple', 'mediumseagreen',
  'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin',
  'navajowhite', 'navy', 'oldlace',
  'olive', 'olivedrab', 'orange', 'orangered', 'orchid',
  'palegoldenrod', 'palegreen', 'paleturquoise',
  'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink',
  'plum', 'powderblue', 'purple',
  'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray',
  'slategrey', 'snow', 'springgreen', 'steelblue',
  'tan', 'teal', 'thistle', 'tomato', 'transparent', 'turquoise',
  'violet',
  'wheat', 'white', 'whitesmoke',
  'yellow', 'yellowgreen',
];

/** Lower-cased lookup set for the SVG known colors (case-insensitive, as C). */
export const KNOWN_COLORS: ReadonlySet<string> = new Set(SVG_KNOWN_COLORS);

/**
 * Whether the active renderer has the SVG known-colors list (svg). Only then
 * does a known name skip colorxlate; every other renderer runs colorxlate on
 * every name, which under a colorscheme can reject a name the list accepts.
 * Per render (AD-4); a render that sets nothing is svg.
 * @see lib/gvc/gvrender.c:195-199 gvrender_resolve_color (knowncolors)
 */
const rendererColors = { hasKnownList: true };
registerRenderState(() => {
  rendererColors.hasKnownList = true;
});

/** Select the active renderer's known-colors behaviour; svg is the only list. */
export function setRendererKnownColors(hasList: boolean): void {
  rendererColors.hasKnownList = hasList;
}

/**
 * The first color of a `c1:c2` list: gvrender_set_pencolor cuts the name at the
 * first ':' before resolving it.
 * @see lib/gvc/gvrender.c:gvrender_set_pencolor
 */
export function firstColor(name: string): string {
  const i = name.indexOf(':');
  return i < 0 ? name : name.slice(0, i);
}

/**
 * Resolve a raw color string to a canonical {@link GVColor} for rendering.
 *
 * `report` false resolves without the unknown-color warning, for a caller that
 * resolves earlier than C does (the warning belongs to C's own call order).
 *
 * @see lib/gvc/gvrender.c:188-213 gvrender_resolve_color
 */
export function resolveRenderColor(raw: string, report = true): GVColor {
  if (raw === '' || raw === 'none') return { type: 'none' };
  // C keeps a known name verbatim (case preserved); only the compare is
  // case-insensitive (bsearch over a lowercase table).
  const known = KNOWN_COLORS.has(raw.toLowerCase());
  if (known && (rendererColors.hasKnownList || !report)) return { type: 'string', s: raw };
  const color: GVColor = { type: 'rgba', r: 0, g: 0, b: 0, a: 0 };
  const rc = colorxlate(raw, color, 'rgba');
  if (report) reportColorxlate(raw, rc);
  return known ? { type: 'string', s: raw } : color;
}

/**
 * The non-OK branch of gvrender_resolve_color: an unknown name warns once per
 * render (emit_once "color <name>"), any other failure is an error.
 *
 * The result is renderer independent: every renderer's known-colors list is
 * either absent (dot, xdot, json, cmapx, ...) or the SVG list, whose names all
 * colorxlate to COLOR_OK, so only the xlate result decides whether C warns.
 *
 * @see lib/gvc/gvrender.c:201-209 gvrender_resolve_color
 */
function reportColorxlate(name: string, rc: ColorxlateResult): void {
  if (rc === ColorxlateResult.ColorOk) return;
  if (rc === ColorxlateResult.ColorUnknown) {
    if (emitOnce(`color ${name}`)) agwarningf(`${name} is not a known color.`);
  } else {
    agerrorf('error in colorxlate()');
  }
}

/**
 * Run `fn` with the active color scheme set to `scheme`, restoring the previous
 * scheme afterwards (try/finally so it cannot leak across objects on throw).
 * Mirrors C's setColorScheme begin/end windows around each object's color block
 * (e.g. lib/common/emit.c:1781/1789 for nodes).
 */
export function withColorScheme<T>(scheme: string | undefined, fn: () => T): T {
  const prev = getColorScheme();
  setColorScheme(scheme ?? '');
  try {
    return fn();
  } finally {
    setColorScheme(prev);
  }
}

// ---------------------------------------------------------------------------
// SVG paint formatting (mirrors svg_print_paint / svg_grstyle opacity)
// ---------------------------------------------------------------------------

/** Lowercase `#rrggbb` from normalized [0,1] channels (round-to-byte). */
export function rgbaStr(r: number, g: number, b: number): string {
  const rh = Math.round(r * 255).toString(16).padStart(2, '0');
  const gh = Math.round(g * 255).toString(16).padStart(2, '0');
  const bh = Math.round(b * 255).toString(16).padStart(2, '0');
  return '#' + rh + gh + bh;
}

/**
 * Format a resolved color as an SVG paint string.
 * @see plugin/core/gvrender_core_svg.c:119-138 svg_print_paint
 */
export function colorPaint(color: GVColor): string {
  if (color.type === 'none') return 'none';
  if (color.type === 'string') {
    return color.s === 'transparent' ? 'none' : color.s;
  }
  if (color.type === 'rgba') {
    if (color.a === 0) return 'none';
    return rgbaStr(color.r, color.g, color.b);
  }
  return 'black';
}

/**
 * The `fill-opacity`/`stroke-opacity` value for a color, or null when none is
 * emitted (C emits it only for an RGBA_BYTE paint with alpha in (0,255)).
 * @see plugin/core/gvrender_core_svg.c:186-190, 207-210 ((float)rgba[3]/255.0)
 */
export function colorOpacity(color: GVColor): string | null {
  if (color.type !== 'rgba') return null;
  const byte = Math.round(color.a * 255);
  if (byte <= 0 || byte >= 255) return null;
  return (byte / 255).toFixed(6);
}

/**
 * The text-fill attribute string for a span's font color, mirroring the color
 * switch in svg_textspan (plugin/core/gvrender_core_svg.c:494-505). A known
 * name is emitted verbatim and SKIPPED when it is "black"; any other spec is
 * canonicalized to lowercase `#rrggbb` (always emitted, even if black) with
 * `fill-opacity` when alpha < 255. Returns '' when nothing is emitted.
 */
export function textFillAttrs(fontColor: string | null): string {
  if (fontColor === null) return '';
  const c = resolveRenderColor(fontColor);
  if (c.type === 'none') return '';
  if (c.type === 'string') {
    return c.s.toLowerCase() === 'black' ? '' : ' fill="' + c.s + '"';
  }
  if (c.type !== 'rgba') return '';
  let out = ' fill="' + rgbaStr(c.r, c.g, c.b) + '"';
  const byte = Math.round(c.a * 255);
  if (byte < 255) out += ' fill-opacity="' + (byte / 255).toFixed(6) + '"';
  return out;
}

// ---------------------------------------------------------------------------
// Unknown-color reporting in C's call order
//
// Which names C hands to gvrender_resolve_color, and in what order, is fixed by
// the emit code (emit_edge_graphics, emit_background, emit_label, ...), not by
// the renderer. The port's renderers resolve in their own order and not at all
// for the non-drawing ones (plain, imap, cmapx), so each pass below lists the
// names in C's order and resolves them once, before any renderer code runs;
// emit_once then makes every later resolve of the same name silent.
// ---------------------------------------------------------------------------

/** @see lib/common/const.h DEFAULT_COLOR */
const DEFAULT_COLOR = 'black';
/** @see lib/common/emit.c:452 AEQ0 (EPS) */
const SEG_EPS = 1e-5;

/**
 * Resolve each name as gvrender_set_pencolor/_fillcolor/_gradient_vals would
 * (cut at the first ':'), reporting unknown colors.
 */
export function reportColorNames(names: readonly string[]): void {
  for (const name of names) resolveRenderColor(firstColor(name));
}

/** The per-bezier arrow flags emit_edge_graphics consults. */
export interface EdgeArrowFlags {
  sflag: boolean;
  eflag: boolean;
}

/** The inputs of emit_edge_graphics' colour decisions. */
export interface EdgeColorSpec {
  /** late_string(e, E_color, ""). */
  color: string;
  /** E_fillcolor when set and non-empty, else "". */
  fillcolor: string;
  tapered: boolean;
  arrows: readonly EdgeArrowFlags[];
}

/** Count occurrences of one character. */
function countChar(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

/**
 * The colours C's multicolor() sets, or null when the colour spec is rejected
 * (parseSegs rv 1 or 2) and emit_edge_graphics falls back to DEFAULT_COLOR.
 * @see lib/common/emit.c:1975 multicolor
 */
function multicolorNames(
  color: string,
  arrows: readonly EdgeArrowFlags[],
): string[] | null {
  const { segs, error } = parseSegs(color);
  if (error === 1 || error === 2) return null;
  const out: string[] = [];
  const front = segs[0]?.color ?? null;
  for (const bz of arrows) {
    let endcolor: string | null = null;
    for (const seg of segs) {
      if (seg.color === null) break;
      if (Math.abs(seg.t) < SEG_EPS) continue;
      out.push(seg.color);
      endcolor = seg.color;
    }
    if (bz.sflag && front !== null) out.push(front);
    if (bz.eflag && endcolor !== null) out.push(endcolor);
  }
  return out;
}

/** The tapered branch: transparent pen, colour as fill, then pen and fill. */
function taperedNames(color: string, fillcolor: string, hasFill: boolean): string[] {
  const pen = color === '' ? DEFAULT_COLOR : color;
  return hasFill ? [pen, fillcolor === '' ? DEFAULT_COLOR : fillcolor] : [pen];
}

/**
 * The names emit_edge_graphics resolves for an edge with a spline, in order.
 * @see lib/common/emit.c:2350 emit_edge_graphics
 */
export function edgeGraphicsColors(spec: EdgeColorSpec): string[] {
  const numc = countChar(spec.color, ':');
  let color = spec.color;
  if (countChar(color, ';') > 0 && numc > 0) {
    const multi = multicolorNames(color, spec.arrows);
    if (multi !== null) return multi;
    color = DEFAULT_COLOR;
  }
  const hasFill = spec.fillcolor !== '';
  const early = hasFill ? [spec.fillcolor] : [];
  if (spec.tapered) return [...early, ...taperedNames(color, spec.fillcolor, hasFill)];
  if (numc > 0) return [...early, ...color.split(':').filter((c) => c !== '')];
  const fill = hasFill ? spec.fillcolor : color;
  if (color !== '') return [...early, color, fill];
  return [...early, DEFAULT_COLOR, fill !== '' ? fill : DEFAULT_COLOR];
}

/**
 * Report the unknown colours of an edge's graphics in C's order.
 * @see lib/common/emit.c:2350 emit_edge_graphics
 */
export function reportEdgeColors(e: Edge): void {
  const spl = e.info.spl;
  if (!spl) return;
  const color = e.attrs.get('color') ?? '';
  reportColorNames(edgeGraphicsColors({
    color,
    fillcolor: e.attrs.get('fillcolor') ?? '',
    tapered: styleTokens(e.attrs.get('style')).includes('tapered'),
    arrows: spl.list.map((bz) => ({ sflag: bz.sflag !== 0, eflag: bz.eflag !== 0 })),
  }));
}

/**
 * The names emit_background resolves: the fill (a gradient's first colour, the
 * transparent pen, then the stop). Only a truecolor device (svg) keeps a
 * transparent background unpainted; elsewhere it becomes white.
 * @see lib/common/emit.c:1476 emit_background
 */
export function backgroundColors(bgcolor: string | undefined, truecolor: boolean): string[] {
  let str = bgcolor !== undefined && bgcolor !== '' ? bgcolor : 'white';
  if (str === 'transparent') {
    if (truecolor) return [];
    str = 'white';
  }
  const stop = findStopColor(str);
  return stop === null ? [str, 'transparent'] : [stop.fillColor, 'transparent', stop.stopColor];
}
