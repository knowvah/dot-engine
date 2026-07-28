// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { translatePostscriptFontname, fontFamilyAttrs } from './ps-fontalias.js';
import { FontnameKind } from '../model/layoutParams.js';

describe('ps-fontalias — translatePostscriptFontname', () => {
  it('resolves a standard name to family + generic SVG fallback', () => {
    expect(translatePostscriptFontname('Times-Roman')).toEqual({
      name: 'Times-Roman', family: 'Times', weight: null, stretch: null,
      style: null, svgFontFamily: 'serif', svgFontWeight: null, svgFontStyle: null,
    });
  });

  it('matches case-insensitively (strcasecmp)', () => {
    expect(translatePostscriptFontname('times-roman')?.family).toBe('Times');
    expect(translatePostscriptFontname('HELVETICA-BOLD')?.weight).toBe('bold');
  });

  it('carries weight/stretch/style for a narrow bold face', () => {
    expect(translatePostscriptFontname('Helvetica-Narrow-Bold')).toEqual({
      name: 'Helvetica-Narrow-Bold', family: 'Helvetica', weight: 'bold',
      stretch: 'condensed', style: null, svgFontFamily: 'sans-Serif',
      svgFontWeight: 'bold', svgFontStyle: null,
    });
  });

  it('returns null for the pre-cooked default and unknown names', () => {
    expect(translatePostscriptFontname('Times,serif')).toBeNull();
    expect(translatePostscriptFontname('NotAFont')).toBeNull();
  });
});

describe('ps-fontalias — fontFamilyAttrs (svg_textspan shape)', () => {
  it('emits family,svgFontFamily for Times-Roman', () => {
    expect(fontFamilyAttrs('Times-Roman')).toEqual({
      attrs: ' font-family="Times,serif"', weight: false, style: false,
    });
  });

  it('appends alias style for Palatino-Italic', () => {
    expect(fontFamilyAttrs('Palatino-Italic')).toEqual({
      attrs: ' font-family="Palatino Linotype,serif" font-style="italic"',
      weight: false, style: true,
    });
  });

  it('emits non-CSS weight + stretch verbatim (faithful to C)', () => {
    expect(fontFamilyAttrs('Bookman-Light')?.attrs)
      .toBe(' font-family="URW Bookman L,serif" font-weight="light"');
    expect(fontFamilyAttrs('Helvetica-Narrow')?.attrs)
      .toBe(' font-family="Helvetica,sans-Serif" font-stretch="condensed"');
  });

  it('returns null when there is no alias (caller emits verbatim)', () => {
    expect(fontFamilyAttrs('Times,serif')).toBeNull();
    expect(fontFamilyAttrs(null)).toBeNull();
  });
});

describe('ps-fontalias — fontnames modes (GD_fontnames switch)', () => {
  it('NATIVEFONTS (default) uses the native family, keeping the SVG fallback', () => {
    expect(fontFamilyAttrs('Helvetica-Bold')?.attrs)
      .toBe(' font-family="Helvetica,sans-Serif" font-weight="bold"');
  });

  it('PSFONTS uses the PostScript name itself as the family', () => {
    expect(fontFamilyAttrs('Helvetica-Bold', FontnameKind.PsFonts)?.attrs)
      .toBe(' font-family="Helvetica-Bold,sans-Serif" font-weight="bold"');
  });

  it('SVGFONTS collapses to the generic family and drops the duplicate suffix', () => {
    // family === svgFontFamily here, so C's `pA->svg_font_family != family`
    // guard suppresses the `,sans-Serif` suffix — a bare generic name.
    expect(fontFamilyAttrs('Helvetica-Bold', FontnameKind.SvgFonts)?.attrs)
      .toBe(' font-family="sans-Serif" font-weight="bold"');
  });

  it('SVGFONTS reads the svg_font_* fields, not the native weight/style', () => {
    // Times-Italic: style "italic" natively, svgFontStyle "italic" too, but the
    // fields are distinct in C and the SVG branch must read its own.
    expect(fontFamilyAttrs('Courier-Oblique', FontnameKind.SvgFonts)?.attrs)
      .toBe(' font-family="monospace" font-style="italic"');
    // NATIVEFONTS reports the PostScript spelling "oblique" instead.
    expect(fontFamilyAttrs('Courier-Oblique')?.attrs)
      .toBe(' font-family="Courier,monospace" font-style="oblique"');
  });
});
