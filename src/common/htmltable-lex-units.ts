// SPDX-License-Identifier: EPL-2.0
/**
 * The unit scanner of the html lexer: how C's `findNext` cuts the label string
 * into the chunks it hands to expat one at a time, and the two warnings it
 * prints on the way. Positions are indices into the label string; its end
 * stands for C's terminating NUL.
 *
 * @see lib/common/htmllex.c:eatComment
 * @see lib/common/htmllex.c:findNext
 */

const UNCLOSED_COMMENT = 'Warning: Unclosed comment\n';
const LABEL_CLOSED = 'Warning: Label closed before end of HTML element\n';

/** One lexer unit: it ends before `end`, and `warnings`/`warn` are what C did finding it. */
export interface Unit {
  end: number;
  warnings: string[];
  warn: boolean;
}

/**
 * Given the index after `<!--`, eat characters up to the comment close,
 * returning the index of the closing `>` if it exists, or the label's end
 * otherwise. It relies on HTML strings having matched nested `<>`.
 * @see lib/common/htmllex.c:eatComment
 */
export function eatComment(label: string, p: number): { at: number; warnings: string[] } {
  let depth = 1;
  let s = p;
  while (depth > 0 && s < label.length) {
    const c = label[s++];
    if (c === '<') depth++;
    else if (c === '>') depth--;
  }
  // C's `s--` moves back to the NUL or the '>'; reading the NUL advanced past it.
  if (depth === 0) s--;
  const warnings: string[] = [];
  if (s < label.length) {
    const t = s - 2;
    if (t < p || !label.startsWith('--', t)) warnings.push(UNCLOSED_COMMENT);
  }
  return { at: s, warnings };
}

/**
 * The next XML unit starting at `s`: `<..>`, an HTML comment `<!-- ... -->`,
 * or the characters up to the next `<`.
 * @see lib/common/htmllex.c:findNext
 */
export function findNext(label: string, s: number): Unit {
  let t = s + 1;
  const warnings: string[] = [];
  let warn = false;
  if (label[s] === '<') {
    if (label.startsWith('!--', t)) {
      const eaten = eatComment(label, t + 3);
      t = eaten.at;
      warnings.push(...eaten.warnings);
      warn = eaten.warnings.length > 0;
    } else {
      while (t < label.length && label[t] !== '>') t++;
    }
    if (label[t] !== '>') {
      warnings.push(LABEL_CLOSED);
      warn = true;
    } else {
      t++;
    }
  } else {
    t = s;
    while (t < label.length && label[t] !== '<') t++;
  }
  return { end: t, warnings, warn };
}
