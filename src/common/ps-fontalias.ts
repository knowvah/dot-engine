// SPDX-License-Identifier: EPL-2.0
//
// PostScript font-name → SVG font-family translation, ported from C graphviz
// (lib/common/ps_font_equiv.h table + lib/common/textspan.c:66
// translate_postscript_fontname). Native dot maps a standard PostScript font
// name (e.g. "Times-Roman") to a renderer family with a generic SVG fallback
// (e.g. font-family="Times,serif"); the SVG emitter consumes the alias's
// family/weight/stretch/style. Without this the port emitted the name verbatim.
//
// The C lookup is a bsearch with strcasecmp — a case-insensitive EXACT match on
// the name (NOT the fuzzy separator-insensitive normalization used by the
// separate text-metrics table). A lower-cased Map reproduces that exactly.
//
// Platform: ps_font_equiv.h uses "Times"/"Palatino Linotype" on non-Windows and
// "Times New Roman" on _WIN32. The oracle and goldens are non-Windows, so the
// non-Windows family strings are used here.

import { FontnameKind } from '../model/layoutParams.js';

/**
 * One PostScript-font alias entry. `xfig_code` is omitted (xfig output is a
 * non-goal); every other field is carried, because the `fontnames` graph
 * attribute selects WHICH of them the SVG emitter uses.
 * @see lib/common/textspan.h _PostscriptAlias
 */
export interface PostscriptAlias {
  /** The PostScript name itself — the family under PSFONTS. */
  name: string;
  family: string;
  weight: string | null;
  stretch: string | null;
  style: string | null;
  svgFontFamily: string;
  svgFontWeight: string | null;
  svgFontStyle: string | null;
}

// Rows ported verbatim from ps_font_equiv.h (macros resolved, non-Windows):
// [name, family, weight, stretch, style, svgFontFamily, svgFontWeight,
//  svgFontStyle].
const ALIAS_ROWS: readonly (readonly [
  string, string, string | null, string | null, string | null, string,
  string | null, string | null,
])[] = [
  ['AvantGarde-Book', 'URW Gothic L', 'book', null, null, 'sans-Serif', null, null],
  ['AvantGarde-BookOblique', 'URW Gothic L', 'book', null, 'oblique', 'sans-Serif', null, 'italic'],
  ['AvantGarde-Demi', 'URW Gothic L', 'demi', null, null, 'sans-Serif', 'bold', null],
  ['AvantGarde-DemiOblique', 'URW Gothic L', 'demi', null, 'oblique', 'sans-Serif', 'bold', 'italic'],
  ['Bookman-Demi', 'URW Bookman L', 'demi', null, null, 'serif', 'bold', null],
  ['Bookman-DemiItalic', 'URW Bookman L', 'demi', null, 'italic', 'serif', 'bold', 'italic'],
  ['Bookman-Light', 'URW Bookman L', 'light', null, null, 'serif', null, null],
  ['Bookman-LightItalic', 'URW Bookman L', 'light', null, 'italic', 'serif', null, 'italic'],
  ['Courier', 'Courier', null, null, null, 'monospace', null, null],
  ['Courier-Bold', 'Courier', 'bold', null, null, 'monospace', 'bold', null],
  ['Courier-BoldOblique', 'Courier', 'bold', null, 'oblique', 'monospace', 'bold', 'italic'],
  ['Courier-Oblique', 'Courier', null, null, 'oblique', 'monospace', null, 'italic'],
  ['Helvetica', 'Helvetica', null, null, null, 'sans-Serif', null, null],
  ['Helvetica-Bold', 'Helvetica', 'bold', null, null, 'sans-Serif', 'bold', null],
  ['Helvetica-BoldOblique', 'Helvetica', 'bold', null, 'oblique', 'sans-Serif', 'bold', 'italic'],
  ['Helvetica-Narrow', 'Helvetica', null, 'condensed', null, 'sans-Serif', null, null],
  ['Helvetica-Narrow-Bold', 'Helvetica', 'bold', 'condensed', null, 'sans-Serif', 'bold', null],
  ['Helvetica-Narrow-BoldOblique', 'Helvetica', 'bold', 'condensed', 'oblique', 'sans-Serif', 'bold', 'italic'],
  ['Helvetica-Narrow-Oblique', 'Helvetica', null, 'condensed', 'oblique', 'sans-Serif', null, 'italic'],
  ['Helvetica-Oblique', 'Helvetica', null, null, 'oblique', 'sans-Serif', null, 'italic'],
  ['NewCenturySchlbk-Bold', 'Century Schoolbook L', 'bold', null, null, 'serif', 'bold', null],
  ['NewCenturySchlbk-BoldItalic', 'Century Schoolbook L', 'bold', null, 'italic', 'serif', 'bold', 'italic'],
  ['NewCenturySchlbk-Italic', 'Century Schoolbook L', null, null, 'italic', 'serif', null, 'italic'],
  ['NewCenturySchlbk-Roman', 'Century Schoolbook L', 'roman', null, null, 'serif', null, null],
  ['Palatino-Bold', 'Palatino Linotype', 'bold', null, null, 'serif', 'bold', null],
  ['Palatino-BoldItalic', 'Palatino Linotype', 'bold', null, 'italic', 'serif', 'bold', 'italic'],
  ['Palatino-Italic', 'Palatino Linotype', null, null, 'italic', 'serif', null, 'italic'],
  ['Palatino-Roman', 'Palatino Linotype', 'roman', null, null, 'serif', null, null],
  ['Symbol', 'Symbol', null, null, null, 'fantasy', null, null],
  ['Times-Bold', 'Times', 'bold', null, null, 'serif', 'bold', null],
  ['Times-BoldItalic', 'Times', 'bold', null, 'italic', 'serif', 'bold', 'italic'],
  ['Times-Italic', 'Times', null, null, 'italic', 'serif', null, 'italic'],
  ['Times-Roman', 'Times', null, null, null, 'serif', null, null],
  ['ZapfChancery-MediumItalic', 'URW Chancery L', 'medium', null, 'italic', 'serif', null, 'italic'],
  ['ZapfDingbats', 'Dingbats', null, null, null, 'fantasy', null, null],
];

const ALIAS_BY_NAME: ReadonlyMap<string, PostscriptAlias> = new Map(
  ALIAS_ROWS.map((r) => [
    r[0].toLowerCase(),
    {
      name: r[0], family: r[1], weight: r[2], stretch: r[3], style: r[4],
      svgFontFamily: r[5], svgFontWeight: r[6], svgFontStyle: r[7],
    },
  ]),
);

/**
 * Resolve a PostScript font name to its alias, or null when unknown.
 * Case-insensitive exact match (mirrors C's strcasecmp bsearch).
 * @see lib/common/textspan.c:66 translate_postscript_fontname
 */
export function translatePostscriptFontname(name: string): PostscriptAlias | null {
  return ALIAS_BY_NAME.get(name.toLowerCase()) ?? null;
}

/**
 * Build the SVG font attribute string for a span's font name when it resolves
 * to a PostScript alias, honouring the graph's `fontnames` mode. Returns null
 * when there is no alias (the caller emits the name verbatim).
 * `weight`/`style` report whether the alias set them, so the HTML-flag block
 * can avoid duplicating bold/italic.
 *
 * C selects family/weight/style as a THREE-WAY switch on GD_fontnames, and the
 * SVGFONTS branch reads different struct fields (svg_font_weight /
 * svg_font_style) rather than reusing the native ones — so the mode changes
 * more than the family string. The `,svgFontFamily` suffix is appended by the
 * same rule in every mode: only when it differs from the chosen family, which
 * is exactly why SVGFONTS emits a bare `sans-Serif` and NATIVEFONTS emits
 * `Helvetica,sans-Serif`.
 *
 * Family strings contain no XML-special characters, so (like C's raw `%s`) no
 * escaping is applied here.
 * @see plugin/core/gvrender_core_svg.c:462-495 svg_textspan
 */
export function fontFamilyAttrs(
  fontName: string | null,
  mode: FontnameKind = FontnameKind.NativeFonts,
): { attrs: string; weight: boolean; style: boolean } | null {
  const a = fontName !== null ? translatePostscriptFontname(fontName) : null;
  if (a === null) return null;
  let family: string;
  let weight: string | null;
  let style: string | null;
  switch (mode) {
    case FontnameKind.PsFonts:
      family = a.name; weight = a.weight; style = a.style; break;
    case FontnameKind.SvgFonts:
      family = a.svgFontFamily; weight = a.svgFontWeight; style = a.svgFontStyle; break;
    default:
      family = a.family; weight = a.weight; style = a.style; break;
  }
  const fam = a.svgFontFamily !== family ? family + ',' + a.svgFontFamily : family;
  let attrs = ' font-family="' + fam + '"';
  if (weight !== null) attrs += ' font-weight="' + weight + '"';
  if (a.stretch !== null) attrs += ' font-stretch="' + a.stretch + '"';
  if (style !== null) attrs += ' font-style="' + style + '"';
  return { attrs, weight: weight !== null, style: style !== null };
}
