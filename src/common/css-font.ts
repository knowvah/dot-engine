// SPDX-License-Identifier: EPL-2.0
//
// CSS `font` shorthand for canvas text measurement. C graphviz has no canvas
// measurer; its text-layout plugin measures through the PostScript alias
// (plugin/pango/gvtextlayout_pango.c:112), and the SVG emitter renders through
// the same alias (svg_textspan). This builder yields the face the SVG renders
// with, so browser measurement and rendering agree. Selection follows the
// NATIVEFONTS branch of svg_textspan (plans/canvas-font-mapping ADR-1).

import { translatePostscriptFontname, type PostscriptAlias } from './ps-fontalias.js';
import type { TextVariantFlags } from './textmeasure.js';

/** svg_textspan's family when a span has no font name. */
const DEFAULT_FAMILIES: readonly string[] = ['Times', 'serif'];

const CSS_GENERIC_FAMILIES: ReadonlySet<string> = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
]);

const CSS_WEIGHT_KEYWORDS: ReadonlySet<string> = new Set([
  'normal', 'bold', 'bolder', 'lighter',
]);

const DQ = '\u0022';
const SQ = '\u0027';
const BACKSLASH = '\\';

/**
 * True when `w` is a value CSS accepts for font-weight (ADR-2). Alias weights
 * are a fixed keyword set (ps_font_equiv.h), never numeric, so only the
 * keywords are checked.
 */
function isCssWeight(w: string): boolean {
  return CSS_WEIGHT_KEYWORDS.has(w.toLowerCase());
}

/** Remove one pair of matching surrounding quotes. */
function stripQuotes(f: string): string {
  const q = f.charAt(0);
  if (f.length >= 2 && (q === DQ || q === SQ) && f.endsWith(q)) return f.slice(1, -1);
  return f;
}

/** Quote a family name unless it is a CSS generic family (ADR-4). */
function quoteFamily(f: string): string {
  if (CSS_GENERIC_FAMILIES.has(f.toLowerCase())) return f;
  const escaped = f.split(BACKSLASH).join(BACKSLASH + BACKSLASH)
    .split(DQ).join(BACKSLASH + DQ);
  return DQ + escaped + DQ;
}

/** Split a non-alias fontname into its family entries (ADR-4). */
function splitFamilies(fontname: string | null): readonly string[] {
  const entries = (fontname ?? '').split(',')
    .map((f) => stripQuotes(f.trim()).trim())
    .filter((f) => f !== '');
  return entries.length > 0 ? entries : DEFAULT_FAMILIES;
}

/**
 * NATIVEFONTS family list: family, plus svg_font_family when it differs.
 * @see plugin/core/gvrender_core_svg.c:487-489
 */
function aliasFamilies(a: PostscriptAlias): readonly string[] {
  return a.svgFontFamily !== a.family ? [a.family, a.svgFontFamily] : [a.family];
}

/** Style token: the alias style, else italic from the HTML_IF flag. */
function styleToken(a: PostscriptAlias | null, flags?: TextVariantFlags): string | null {
  if (a?.style != null) return a.style;
  return flags?.italic === true ? 'italic' : null;
}

/**
 * Weight token. The bold flag applies only when the alias set no weight —
 * tested on the alias value BEFORE the ADR-2 drop, as C's HTML_BF guard tests
 * the raw alias weight (so `demi` + bold renders, and measures, normal).
 */
function weightToken(a: PostscriptAlias | null, flags?: TextVariantFlags): string | null {
  if (a?.weight != null) return isCssWeight(a.weight) ? a.weight : null;
  return flags?.bold === true ? 'bold' : null;
}

/**
 * style/weight/stretch tokens in shorthand order.
 * @see plugin/core/gvrender_core_svg.c:490-500
 */
function variantTokens(a: PostscriptAlias | null, flags?: TextVariantFlags): string[] {
  const tokens = [styleToken(a, flags), weightToken(a, flags), a?.stretch ?? null];
  return tokens.filter((t): t is string => t !== null);
}

/**
 * CSS `font` shorthand (`[style] [weight] [stretch] <size>px <families>`)
 * naming the face svg_textspan renders `fontname` with. Pure; always
 * syntactically valid CSS.
 * @see plugin/core/gvrender_core_svg.c:462-500 svg_textspan (family/weight/style selection)
 */
export function canvasFont(
  fontname: string | null,
  fontsize: number,
  flags?: TextVariantFlags,
): string {
  // C translate_postscript_fontname matches the whole name only.
  const a = fontname !== null ? translatePostscriptFontname(fontname) : null;
  const families = a !== null ? aliasFamilies(a) : splitFamilies(fontname);
  const tokens = [...variantTokens(a, flags), `${fontsize}px`];
  return `${tokens.join(' ')} ${families.map(quoteFamily).join(', ')}`;
}
