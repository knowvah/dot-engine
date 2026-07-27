// SPDX-License-Identifier: EPL-2.0

/**
 * xdot output primitives — number, string, colour and geometry formatting for
 * the xdot draw-string language, plus the shared `%.5g`/`%.2f` helpers.
 *
 * @see plugin/core/gvrender_core_dot.c
 */

import type { Point } from '../../model/geom.js';
import type { GVColor } from '../../common/color.js';
import { colorxlate } from '../../common/color.js';
import { getGradientPoints } from '../svg-gradient.js';
import { EmitState, toFixed2HalfEven } from '../../gvc/job.js';
import { printfSig, printfFixed } from '../../util/printf-round.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const XDOT_VERSION = '1.7';

/** Max magnitude cap — matches maxnegnum in C source. */
export const MAX_NEGNUM = 999999999999999.99;

/** Near-zero suppression threshold (same as gvprintdouble). */
export const NEAR_ZERO = 0.005;

/** Indices 8/9 alias 1; 10/11 alias 5. NUM_XBUFS covers 0–7. */
export const NUM_XBUFS = 8;

/**
 * Style tokens that never become an xdot `S` op: `filled`/`bold`/`setlinewidth`
 * are filtered by xdot_style itself; the polygon/fill styles are consumed by the
 * shape/fill code before gvrender_set_style, so they never reach the render
 * style. Only line styles (solid/dashed/dotted + unknown) emit an `S` op.
 * @see plugin/core/gvrender_core_dot.c:184 xdot_style · lib/common/shapes.c
 */
export const NON_LINE_STYLES: ReadonlySet<string> = new Set([
  'filled', 'bold', 'rounded', 'diagonals', 'striped', 'wedged',
  'invis', 'invisible', 'radial',
]);

// ---------------------------------------------------------------------------
// printNum — @see lib/gvc/gvdevice.c:gvprintnum
// ---------------------------------------------------------------------------

/**
 * Strip trailing zeros (and the decimal point) from a toFixed(3) string,
 * then collapse a leading "0." or "-0." prefix.
 */
export function trimAndStrip(s: string): string {
  const dot = s.indexOf('.');
  if (dot < 0) return s;
  let end = s.length;
  while (end > dot + 1 && s[end - 1] === '0') end--;
  if (s[end - 1] === '.') end--;
  const t = s.slice(0, end);
  if (t.startsWith('0.')) return t.slice(1);
  if (t.startsWith('-0.')) return '-' + t.slice(2);
  return t;
}

/**
 * Convert a double to compact string form for DOT/XDOT output.
 *
 * Rules (porting gvprintnum from lib/gvc/gvdevice.c):
 * - |n| > MAX_NEGNUM → clamped to ±MAX_NEGNUM
 * - |n| < NEAR_ZERO → "0" (suppresses -0)
 * - 3 decimal places, trailing zeros and point stripped
 * - Leading "0." collapsed to "." (e.g. 0.5 → ".5")
 *
 * Exported for json.ts (T30) and map.ts (T31).
 *
 * @see lib/gvc/gvdevice.c:gvprintnum
 */
export function printNum(n: number): string {
  if (Math.abs(n) > MAX_NEGNUM) {
    return n < 0 ? String(-MAX_NEGNUM) : String(MAX_NEGNUM);
  }
  if (Math.abs(n) < NEAR_ZERO) return '0';
  return trimAndStrip(n.toFixed(3));
}

// ---------------------------------------------------------------------------
// XDot buffer management
// ---------------------------------------------------------------------------

/**
 * Create a 12-slot xbufs array with the canonical aliasing.
 *
 * Indices 8–9 (NDraw, EDraw) alias index 1 (CDraw).
 * Indices 10–11 (NLabel, ELabel) alias index 5 (CLabel).
 *
 * @see plugin/core/gvrender_core_dot.c:xbufs
 */
export function makeXbufs(): string[][] {
  const bufs: string[][] = Array.from({ length: NUM_XBUFS + 4 }, () => []);
  bufs[EmitState.NDraw] = bufs[EmitState.CDraw]!;
  bufs[EmitState.EDraw] = bufs[EmitState.CDraw]!;
  bufs[EmitState.NLabel] = bufs[EmitState.CLabel]!;
  bufs[EmitState.ELabel] = bufs[EmitState.CLabel]!;
  return bufs;
}

// ---------------------------------------------------------------------------
// XDOT op helpers — @see plugin/core/gvrender_core_dot.c
// ---------------------------------------------------------------------------

/**
 * Format one xdot draw-op number: 2 decimals, trailing zeros and point trimmed
 * — mirroring xdot_fmt_num ("%.02f" + agxbuf_trim_zeros). Distinct from
 * `printNum` (used for the DOT `pos`/`bb`/`width`/`height` attributes), which
 * keeps more precision; xdot's DRAW ops are emitted at 2 dp by the C engine.
 * @see plugin/core/gvrender_core_dot.c:126 xdot_fmt_num
 */
export function xdotNum(v: number): string {
  // Round half-to-even like C's printf %.02f (FE_TONEAREST); JS toFixed rounds
  // half-away-from-zero, which diverges at exact .xx5 ties (2323.125 → native
  // 2323.12, not 2323.13). @see lib/gvc/gvdevice.c gvprintdouble
  let s = toFixed2HalfEven(v);
  if (s.indexOf('.') >= 0) {
    let end = s.length;
    while (end > 0 && s[end - 1] === '0') end--;
    if (s[end - 1] === '.') end--;
    s = s.slice(0, end);
  }
  return s === '-0' ? '0' : s;
}

/**
 * Format a single xdot point "x y ". xdot is y-up: `Y_invert` defaults false, so
 * `yDir(y, yOff)` returns `y` unchanged for xdot (only `-Ty` plain/dot invert).
 * The layout coordinate passes through with NO inversion — unlike the SVG path.
 * @see lib/common/output.c:36 yDir · plugin/core/gvrender_core_dot.c:132 xdot_point
 */
export function xdotPoint(p: Point): string {
  return xdotNum(p.x) + ' ' + xdotNum(p.y) + ' ';
}

/** Format N points preceded by opcode and count: "<c> <n> x0 y0 x1 y1 …". */
export function xdotPoints(c: string, pts: Point[]): string {
  let s = c + ' ' + String(pts.length) + ' ';
  for (const p of pts) s += xdotPoint(p);
  return s;
}

/**
 * UTF-8 byte length of a string — the value C's `xdot_str` writes as the length
 * prefix (`strlen(s)` over the UTF-8 bytes), NOT the JS UTF-16 code-unit count.
 * A label like `ÿ` (U+00FF) is 2 UTF-8 bytes, so its `T`/`F` op prefix is 2.
 * @see plugin/core/gvrender_core_dot.c:83 xdot_str_xbuf (`%zu`, strlen)
 */
export function utf8Len(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } // surrogate pair → 4 bytes
    else n += 3;
  }
  return n;
}

/** Clamp a normalized [0,1] float channel to a 0-255 byte (round-to-nearest). */
export function chanByte(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

/**
 * Resolve a GVColor to RGBA bytes — the value the C xdot callbacks read from
 * `job->obj->pencolor.u.rgba` (already resolved by gvrender_set_pencolor). A
 * plain `rgba` passes through; named/hex/HSV specs run through colorxlate; a
 * `none` color is fully transparent black (callers gate on PEN_NONE).
 */
export function gvColorRgba(c: GVColor): [number, number, number, number] {
  if (c.type === 'rgba') return [chanByte(c.r), chanByte(c.g), chanByte(c.b), chanByte(c.a)];
  // A `none`/transparent paint emits graphviz's "transparent" bytes (ff ff fe 00),
  // matching native's `#fffffe00` — not fully-zero black. @see colxlate.c transparent
  if (c.type === 'none') return [0xff, 0xff, 0xfe, 0x00];
  const out: GVColor = { type: 'rgba', r: 0, g: 0, b: 0, a: 0 };
  colorxlate(c.type === 'string' ? c.s : '', out, 'rgba');
  return out.type === 'rgba'
    ? [chanByte(out.r), chanByte(out.g), chanByte(out.b), chanByte(out.a)]
    : [0, 0, 0, 255];
}

/**
 * Bare xdot color body (no `c `/`C ` prefix): the CONSTANT length prefix
 * (7 for `#rrggbb`, 9 for `#rrggbbaa`) plus `-#hex`, the alpha byte present only
 * when not fully opaque. Used both by the color ops and by gradient color stops.
 * @see plugin/core/gvrender_core_dot.c:99 xdot_str_color_xbuf
 */
export function xdotColorBody(rgba: [number, number, number, number]): string {
  const hx = (n: number): string => n.toString(16).padStart(2, '0');
  const body = '#' + hx(rgba[0]) + hx(rgba[1]) + hx(rgba[2]);
  return rgba[3] === 0xff ? '7 -' + body : '9 -' + body + hx(rgba[3]);
}

/**
 * Format an xdot color op ("c "/"C ") from RGBA bytes.
 * @see plugin/core/gvrender_core_dot.c:99 xdot_str_color_xbuf
 */
export function xdotColorOp(prefix: 'c ' | 'C ', rgba: [number, number, number, number]): string {
  return prefix + xdotColorBody(rgba) + ' ';
}

/**
 * Build the linear-gradient `C len -[x0 y0 x1 y1 2 <stops>]` fill op. Endpoints
 * come from getGradientPoints (the same geometry the SVG gradient uses); stops
 * are (frac,fill)/(frac,stop) when frac>0, else (0,fill)/(1,stop). Shared by
 * node/cluster gradient fills and the graph-background gradient.
 * @see plugin/core/gvrender_core_dot.c:544-598 xdot_gradient_fillcolor
 */
export function linearGradientOp(
  pts: Point[],
  fillColor: GVColor,
  stopColor: GVColor,
  frac: number,
  angleDeg: number,
): string {
  // isRHS=true: native y-up coords, matching C's get_gradient_points(A,G,n,angle,2)
  // for the xdot device path (the SVG path uses isRHS=false + a container flip).
  const { g0, g1 } = getGradientPoints(pts, (angleDeg * Math.PI) / 180, false, true);
  const inner =
    '[' + xdotNum(g0.x) + ' ' + xdotNum(g0.y) + ' ' + xdotNum(g1.x) + ' ' + xdotNum(g1.y) +
    ' 2 ' + gradientStops(fillColor, stopColor, frac) + ']';
  return 'C ' + String(utf8Len(inner)) + ' -' + inner + ' ';
}

/** The `<frac> <colorbody>` stop pairs for a gradient (frac>0 vs the 0/1 form). */
export function gradientStops(fillColor: GVColor, stopColor: GVColor, frac: number): string {
  const fill = gvColorRgba(fillColor);
  const stop = gvColorRgba(stopColor);
  const stops: Array<[number, [number, number, number, number]]> =
    frac > 0 ? [[frac, fill], [frac, stop]] : [[0, fill], [1, stop]];
  return stops.map(([f, c]) => trimFixed3(f) + ' ' + xdotColorBody(c)).join(' ');
}

/**
 * Build the radial-gradient `C len -(c1x c1y r1 c2x c2y r2 2 <stops>)` fill op.
 * Reuses getGradientPoints (radial) for the center/radii, un-negating its SVG
 * y. r1 = outerR/4, r2 = outerR; c2 is the center, c1 the center offset by r1
 * along the gradient angle (== center when angle 0).
 * @see plugin/core/gvrender_core_dot.c:562-585 xdot_gradient_fillcolor (radial)
 */
export function radialGradientOp(
  pts: Point[],
  fillColor: GVColor,
  stopColor: GVColor,
  frac: number,
  angleDeg: number,
): string {
  const rad = (angleDeg * Math.PI) / 180;
  // isRHS=true: native y-up coords, matching C's get_gradient_points(A,G,n,0,3).
  const gp = getGradientPoints(pts, rad, true, true);
  const cx = gp.g0.x;
  const cy = gp.g0.y;
  const r1 = gp.g1.x;
  const r2 = gp.g1.y;
  const c1x = angleDeg === 0 ? cx : cx + r1 * Math.cos(rad);
  const c1y = angleDeg === 0 ? cy : cy + r1 * Math.sin(rad);
  const inner =
    '(' + xdotNum(c1x) + ' ' + xdotNum(c1y) + ' ' + xdotNum(r1) + ' ' +
    xdotNum(cx) + ' ' + xdotNum(cy) + ' ' + xdotNum(r2) + ' 2 ' +
    gradientStops(fillColor, stopColor, frac) + ')';
  return 'C ' + String(utf8Len(inner)) + ' -' + inner + ' ';
}

/** Pen ("c ") color op from a resolved GVColor. */
export function xdotPenColor(c: GVColor): string {
  return xdotColorOp('c ', gvColorRgba(c));
}

/** Fill ("C ") color op from a resolved GVColor. */
export function xdotFillColor(c: GVColor): string {
  return xdotColorOp('C ', gvColorRgba(c));
}

/**
 * Build the xdot "F size len -name " font op. Mirrors xdot_textspan's `F` +
 * `xdot_str(job, "", font->name)` — the length prefix is the byte length of the
 * face name. @see plugin/core/gvrender_core_dot.c:498 xdot_textspan
 */
export function xdotFont(size: number, name: string): string {
  return 'F ' + xdotNum(size > 0 ? size : 0) + ' ' + String(utf8Len(name)) + ' -' + name + ' ';
}

/**
 * Build an xdot length-prefixed string op ("S "/"" prefix): "<pfx><len> -<s> ".
 * @see plugin/core/gvrender_core_dot.c:83 xdot_str_xbuf
 */
export function xdotStrOp(prefix: string, s: string): string {
  return prefix + String(utf8Len(s)) + ' -' + s + ' ';
}

/**
 * Quote a DOT identifier unless it is a bare id or numeral, mirroring agwrite's
 * agcanonStr so the serialized graph reparses (the comparator reparses both
 * sides). Only `"` is escaped (→ `\"`); a `\` is left as-is — it is already the
 * start of a stored escape like `\n`/`\l` that agcanonStr keeps verbatim, so
 * doubling it (`\\n`) would change the name (`a\n(b\n"c")` must stay `a\n…`, not
 * `a\\n…`). Over-quoting a value native leaves bare is harmless: both parse to
 * the same name. @see lib/cgraph/write.c:_agstrcanon (escapes '"', keeps '\')
 *
 * ONE DELIBERATE DIVERGENCE from _agstrcanon: an ODD trailing backslash run is
 * padded to even. C copies it verbatim and appends the closing quote, so a name
 * ending in a single `\` serializes as `"a\"` — the backslash escapes the quote
 * and the output does not reparse. The DOT lexer cannot produce such a name
 * (source `"a\"` never terminates), so this is unreachable from any file and no
 * corpus id changes; it is reachable only through the programmatic API, where a
 * caller supplies the string directly. Padding costs a name that round-trips to
 * `a\\` instead of `a\`, which beats emitting a document that cannot be parsed.
 * @see CodeQL "Incomplete string escaping or encoding" — the alert's own remedy
 *      (escape every `\`) is wrong here and breaks `\n`/`\l` parity.
 */
export function xdotId(s: string): string {
  if (/^[A-Za-z_][A-Za-z_0-9]*$/.test(s)) return s;
  if (/^-?(\.[0-9]+|[0-9]+(\.[0-9]*)?)$/.test(s)) return s;
  const body = s.replace(/"/g, '\\"');
  const trailingBackslashes = /\\*$/.exec(body)![0].length;
  return '"' + body + (trailingBackslashes % 2 === 1 ? '\\' : '') + '"';
}

/**
 * Format a number as C's `%.5g` — 5 significant figures, trailing zeros and
 * point trimmed, switching to `e±NN` (min 2 exponent digits) when the exponent
 * is < -4 or ≥ 5. Native writes the DOT `pos`/`bb`/`width`/`height` attributes
 * with `%.5g` (output.c:71/294/302), so large coordinates round to 5 sig figs
 * (`2219962` → `2.2201e+06`); `printNum`'s fixed 3 dp keeps too much precision.
 *
 * Uses {@link printfSig} rather than `Number.prototype.toPrecision(5)` so
 * exact-halfway values (e.g. 1399.25) round half-to-even like C's snprintf,
 * not half-away-from-zero like `toPrecision`. @see docs proven case
 * graphs-b786 (circo): pos coordinate 1399.25 → native "1399.2", `toPrecision`
 * gave "1399.3".
 * @see lib/common/output.c:71 (agxbprint "%.5g")
 */
export function gfmt5(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  let s = printfSig(v, 5);
  const e = s.indexOf('e');
  if (e >= 0) {
    let mant = s.slice(0, e);
    if (mant.indexOf('.') >= 0) mant = mant.replace(/0+$/, '').replace(/\.$/, '');
    const ei = parseInt(s.slice(e + 1), 10);
    return mant + 'e' + (ei < 0 ? '-' : '+') + String(Math.abs(ei)).padStart(2, '0');
  }
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/**
 * Format a number as C's `%.2f` — fixed 2 decimals, half-to-even on exact ties.
 * `attach_attrs` writes the graph-label size attributes `lwidth`/`lheight` in
 * INCHES with `%.2f`, unlike every other computed attribute (which uses `%.5g`).
 * @see lib/common/output.c:244-247 (agxbprint "%.2f", PS2INCH)
 */
export function gfmt2(v: number): string {
  return printfFixed(v, 2);
}

/**
 * Format a label position as the `x,y` pair every computed `*_lp` attribute
 * uses: both coordinates at `%.5g`. C passes y through `yDir()`, which is the
 * identity unless `Y_invert` — and `Y_invert` is only set by `-Ty` (plain/dot),
 * never for xdot — so no inversion is applied here, exactly as the existing
 * `pos`/`bb` emission does.
 * @see lib/common/output.c:35 yDir · lib/common/output.c:241 (agxbprint "%.5g,%.5g")
 */
export function lpStr(p: Point): string {
  return gfmt5(p.x) + ',' + gfmt5(p.y);
}

/**
 * Escape backslashes in a LABEL draw string — C's put_escaping_backslashes,
 * applied to the `_ldraw_`/`_hldraw_`/`_tldraw_` buffers (not the shape draws)
 * before agset. A literal `\` in a label's text (e.g. `WXYZ\nabc`) becomes `\\`
 * so it survives the DOT string round-trip; the T-op byte-length prefix stays on
 * the UNescaped text. @see plugin/core/gvrender_core_dot.c:218 put_escaping_backslashes
 */
export function escBackslash(s: string): string {
  return s.replace(/\\/g, '\\\\');
}

/** True if s[i..] starts an escape sequence agcanonStr keeps verbatim: a `\`
 *  followed by one of E G H L N T l n r \ ". @see lib/cgraph/write.c:is_escape */
export function isEscapeSeq(s: string, i: number): boolean {
  if (s[i] !== '\\') return false;
  const n = s[i + 1];
  return n === 'E' || n === 'G' || n === 'H' || n === 'L' || n === 'N' || n === 'T'
    || n === 'l' || n === 'n' || n === 'r' || n === '\\' || n === '"';
}

/**
 * Escape a value for a DOT attribute exactly as agwrite's agcanonStr does: a `"`
 * becomes `\"` ONLY when it is not already part of an escape sequence, so an
 * existing `\"` or `\\` in the value is passed through verbatim rather than
 * double-escaped. For an already-backslash-doubled value (node/edge/graph labels,
 * post put_escaping_backslashes) this is identical to a naive `"`→`\"` — every
 * `"` follows a doubled `\\`, so none are ever part_of_escape. For raw cluster
 * labels (agset, no put_escaping) it preserves the source `\"`/`\\` unchanged.
 * @see lib/cgraph/write.c:_agstrcanon (135-167)
 */
export function agcanonEscape(s: string): string {
  let out = '';
  let partOfEscape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"' && !partOfEscape) {
      out += '\\';
    } else if (!partOfEscape && isEscapeSeq(s, i)) {
      partOfEscape = true;
    } else {
      partOfEscape = false;
    }
    out += c;
  }
  return out;
}

/** Trim a "%.3f" fixed string like C's agxbuf_trim_zeros (trailing 0s + dot). */
export function trimFixed3(v: number): string {
  let s = v.toFixed(3);
  if (s.indexOf('.') < 0) return s;
  let end = s.length;
  while (end > 0 && s[end - 1] === '0') end--;
  if (s[end - 1] === '.') end--;
  return s.slice(0, end);
}
