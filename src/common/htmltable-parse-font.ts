// SPDX-License-Identifier: EPL-2.0
/**
 * Font stack of the HTML-like label parser: `pushFont` merging, the inline
 * tags' fonts, and the font a `fonttable` wrapper gives its table.
 *
 * @see lib/common/htmlparse.y:pushFont
 * @see lib/common/htmlparse.y:fonttable
 */

import type { HtmlTableFont, HtmlTextItem, OpenToken } from './htmltable-types.js';
import { num } from './htmltable-parse-attrs.js';

export interface FontState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  overline?: boolean;
  strikethrough?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  fontColor?: string;
  fontFace?: string;
  fontSize?: number;
}

const definedOf = (s: FontState): Partial<FontState> =>
  Object.fromEntries(
    Object.entries(s).filter(([, v]) => v !== undefined),
  ) as Partial<FontState>;

export const mergeFontState = (parent: FontState, child: FontState): FontState =>
  ({ ...parent, ...definedOf(child) }) as FontState;

const BOOL_FONT_KEYS = [
  'bold', 'italic', 'underline', 'overline',
  'strikethrough', 'subscript', 'superscript',
] as const;
type BoolFontKey = typeof BOOL_FONT_KEYS[number];

export const fontItemProps = (f: FontState): Partial<HtmlTextItem> => {
  const out: Partial<HtmlTextItem> = {};
  for (const k of BOOL_FONT_KEYS) {
    if (f[k]) out[k as BoolFontKey] = true;
  }
  if (f.fontColor) out.fontColor = f.fontColor;
  if (f.fontFace) out.fontFace = f.fontFace;
  if (f.fontSize !== undefined) out.fontSize = f.fontSize;
  return out;
};


export const isInlineTag = (tag: string): boolean =>
  ['B', 'I', 'U', 'O', 'S', 'SUB', 'SUP'].includes(tag);

export const inlineFontState = (tag: string, _attrs: Record<string, string>): FontState => {
  const fs: FontState = {};
  if (tag === 'B') fs.bold = true;
  if (tag === 'I') fs.italic = true;
  if (tag === 'U') fs.underline = true;
  if (tag === 'O') fs.overline = true;
  if (tag === 'S') fs.strikethrough = true;
  if (tag === 'SUB') fs.subscript = true;
  if (tag === 'SUP') fs.superscript = true;
  return fs;
};

/** The font `pushFont` pushes for a wrapper tag, merged over the enclosing one. */
export const wrapperFont = (t: OpenToken, fontStack: FontState[]): FontState => {
  const font = fontStack[fontStack.length - 1] ?? {};
  if (t.tag !== 'FONT') return mergeFontState(font, inlineFontState(t.tag, t.attrs));
  return mergeFontState(font, {
    fontColor: t.attrs['color'],
    fontFace: t.attrs['face'],
    fontSize: num(t.attrs['point-size']),
  });
};

/**
 * `$2->font = *LIST_BACK(fontstack)`: set only while a `fonttable` wrapper's
 * font is on the stack (the base entry stands for C's NULL).
 * @see lib/common/htmlparse.y:294
 */
export const tableFont = (fontStack: FontState[]): HtmlTableFont | undefined => {
  if (fontStack.length < 2) return undefined;
  const { fontColor, fontFace, fontSize } = fontStack[fontStack.length - 1]!;
  const font: HtmlTableFont = {};
  if (fontColor !== undefined) font.fontColor = fontColor;
  if (fontFace !== undefined) font.fontFace = fontFace;
  if (fontSize !== undefined) font.fontSize = fontSize;
  return font;
};

