// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { canvasFont } from './css-font.js';
import { fontFamilyAttrs, translatePostscriptFontname } from './ps-fontalias.js';

const ALIAS_NAMES = [
  'AvantGarde-Book', 'AvantGarde-BookOblique', 'AvantGarde-Demi',
  'AvantGarde-DemiOblique', 'Bookman-Demi', 'Bookman-DemiItalic',
  'Bookman-Light', 'Bookman-LightItalic', 'Courier', 'Courier-Bold',
  'Courier-BoldOblique', 'Courier-Oblique', 'Helvetica', 'Helvetica-Bold',
  'Helvetica-BoldOblique', 'Helvetica-Narrow', 'Helvetica-Narrow-Bold',
  'Helvetica-Narrow-BoldOblique', 'Helvetica-Narrow-Oblique',
  'Helvetica-Oblique', 'NewCenturySchlbk-Bold', 'NewCenturySchlbk-BoldItalic',
  'NewCenturySchlbk-Italic', 'NewCenturySchlbk-Roman', 'Palatino-Bold',
  'Palatino-BoldItalic', 'Palatino-Italic', 'Palatino-Roman', 'Symbol',
  'Times-Bold', 'Times-BoldItalic', 'Times-Italic', 'Times-Roman',
  'ZapfChancery-MediumItalic', 'ZapfDingbats',
];

const DQ = String.fromCharCode(34);

function unquote(f: string): string {
  return f.startsWith(DQ) && f.endsWith(DQ) ? f.slice(1, -1) : f;
}

const SIZE_RE = new RegExp('(\\d+(?:\\.\\d+)?px) ');

/** Split a shorthand into the tokens before `<n>px` and the family list after. */
function parse(font: string): { pre: string[]; size: string; families: string[] } {
  const m = SIZE_RE.exec(font);
  if (m === null) throw new Error(`not a font shorthand: ${font}`);
  const head = font.slice(0, m.index).trim();
  const pre = head === '' ? [] : head.split(' ');
  const tail = font.slice(m.index + m[0].length);
  const families = tail.split(',').map((f) => unquote(f.trim()));
  return { pre, size: m[1], families };
}

/** Extract `name="value"` pairs from fontFamilyAttrs output. */
function attrMap(attrs: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = attrs.split(DQ);
  for (let i = 0; i + 1 < parts.length; i += 2) {
    out.set(parts[i].trim().replace('=', ''), parts[i + 1]);
  }
  return out;
}

describe('canvasFont — alias names', () => {
  it('Times-Roman 14 → 14px Times, serif with no weight/style', () => {
    expect(canvasFont('Times-Roman', 14)).toBe('14px "Times", serif');
  });

  it('Helvetica-Narrow-BoldOblique carries style, weight, stretch', () => {
    const p = parse(canvasFont('Helvetica-Narrow-BoldOblique', 10));
    expect(p.pre).toEqual(['oblique', 'bold', 'condensed']);
    expect(p.families).toEqual(['Helvetica', 'sans-Serif']);
    expect(p.size).toBe('10px');
  });

  it('AvantGarde-Demi drops the CSS-invalid weight, even with bold flag', () => {
    expect(parse(canvasFont('AvantGarde-Demi', 12)).pre).toEqual([]);
    expect(parse(canvasFont('AvantGarde-Demi', 12, { bold: true })).pre).toEqual([]);
  });

  it('Courier with bold flag adds bold (alias weight null)', () => {
    expect(canvasFont('Courier', 9, { bold: true })).toBe('bold 9px "Courier", monospace');
  });

  it('italic flag yields to an alias style', () => {
    expect(parse(canvasFont('Times-Italic', 9, { italic: true })).pre).toEqual(['italic']);
    expect(parse(canvasFont('Helvetica-Oblique', 9, { italic: true })).pre).toEqual(['oblique']);
    expect(parse(canvasFont('Times-Roman', 9, { italic: true })).pre).toEqual(['italic']);
  });

  it('alias lookup is case-insensitive and quotes spaced families', () => {
    expect(canvasFont('palatino-roman', 11)).toBe('11px "Palatino Linotype", serif');
  });

  it.each(ALIAS_NAMES)('%s agrees with fontFamilyAttrs (NativeFonts)', (name) => {
    const ff = fontFamilyAttrs(name);
    const a = translatePostscriptFontname(name);
    if (ff === null || a === null) throw new Error(`no alias for ${name}`);
    const attrs = attrMap(ff.attrs);
    const p = parse(canvasFont(name, 14));
    expect(p.families.join(',')).toBe(attrs.get('font-family'));
    const style = attrs.get('font-style');
    const stretch = attrs.get('font-stretch');
    const weight = attrs.get('font-weight');
    const expected = [
      ...(style !== undefined ? [style] : []),
      ...(weight === 'bold' ? [weight] : []), // ADR-2: only CSS-valid weights survive
      ...(stretch !== undefined ? [stretch] : []),
    ];
    expect(p.pre).toEqual(expected);
  });
});

describe('canvasFont — non-alias names (ADR-4)', () => {
  it('splits, quotes non-generic families, leaves generics bare', () => {
    expect(canvasFont('My Font, Arial, sans-serif', 14))
      .toBe('14px "My Font", "Arial", sans-serif');
  });

  it('strips existing quotes and escapes quote/backslash', () => {
    expect(canvasFont(`'Odd"Name', "A\\B"`, 8)).toBe('8px "Odd\\"Name", "A\\\\B"');
  });

  it('keeps generic families case-insensitively unquoted', () => {
    expect(canvasFont('MONOSPACE,System-UI,Cursive,Fantasy,Serif', 8))
      .toBe('8px MONOSPACE, System-UI, Cursive, Fantasy, Serif');
  });

  it('drops empty list entries', () => {
    expect(canvasFont('Arial,,  ,serif', 8)).toBe('8px "Arial", serif');
  });

  it('null or empty name → Times,serif default', () => {
    expect(canvasFont(null, 14)).toBe('14px "Times", serif');
    expect(canvasFont('', 14)).toBe('14px "Times", serif');
    expect(canvasFont(' , ', 14)).toBe('14px "Times", serif');
  });

  it('applies bold and italic flags', () => {
    expect(canvasFont('Arial', 14, { bold: true, italic: true }))
      .toBe('italic bold 14px "Arial"');
  });

  it('alias lookup uses the whole name only', () => {
    expect(canvasFont('Times-Roman, serif', 14)).toBe('14px "Times-Roman", serif');
  });

  it('keeps fractional sizes', () => {
    expect(canvasFont('Arial', 10.5)).toBe('10.5px "Arial"');
  });
});
