// SPDX-License-Identifier: EPL-2.0
/**
 * The htmllex state characterData reads: `ctx->inCell`, which the element
 * handlers set, and `ctx->xb`, the buffer it appends to. Every handler assigns
 * `ctx->tok`, so when one `XML_Parse` call fires several events only the last
 * token reaches the parser, but characters an earlier event appended stay in
 * xb: they lead the next string the parser reduces, or count in the table
 * rule's nonSpace check.
 *
 * @see lib/common/htmllex.c:startElement
 * @see lib/common/htmllex.c:endElement
 * @see lib/common/htmllex.c:characterData
 */

import { HTML_ENTITIES } from './html-entities.js';
import { charRefNumber } from './htmltable-lex-attvalue.js';
import type { TagChunk } from './htmltable-lex-expat.js';
import type { Token } from './htmltable-types.js';

/** `ctx->inCell`, and the text in `ctx->xb` that no token carried to the parser. */
export interface CharDataState {
  inCell: boolean;
  xb: string;
}

/** initHTMLlexer: text is kept until the first TABLE or TR. @see lib/common/htmllex.c:initHTMLlexer */
export const initialCharData = (): CharDataState => ({ inCell: true, xb: '' });

/** startElement's assignment to inCell for element `name` (upper case). */
function startInCell(name: string, inCell: boolean): boolean {
  if (name === 'TABLE' || name === 'TR' || name === 'TH') return false;
  return name === 'TD' ? true : inCell;
}

/** endElement's assignment to inCell for element `name` (upper case). */
function endInCell(name: string, inCell: boolean): boolean {
  if (name === 'TABLE') return true;
  return name === 'TD' ? false : inCell;
}

/** Run a tag's element handlers on inCell; `<X/>` runs startElement, then endElement. */
export function tagInCell(st: CharDataState, tag: TagChunk): void {
  const name = tag.name.toUpperCase();
  if (tag.close) {
    st.inCell = endInCell(name, st.inCell);
    return;
  }
  st.inCell = startInCell(name, st.inCell);
  if (tag.selfClose) st.inCell = endInCell(name, st.inCell);
}

/** Keep the text of tokens a later event in the same call overwrote. */
export function keepLostText(st: CharDataState, lost: readonly Token[]): void {
  for (const t of lost) if (t.type === 'text') st.xb += t.value;
}

/**
 * Hand xb's kept text to the token the parser is about to get: a string
 * starts with it, and a TABLE carries it for the table rule's nonSpace check.
 * Any other token leaves it in xb for the next of those.
 * @see lib/common/htmlparse.y:table
 */
export function releaseXb(st: CharDataState, first: Token): void {
  if (st.xb === '') return;
  if (first.type === 'text') first.value = st.xb + first.value;
  else if (first.type === 'open' && first.tag === 'TABLE') first.heldText = st.xb;
  else return;
  st.xb = '';
}

/**
 * characterData keeps each byte `>= ' '` of the text expat decoded: anything
 * below 0x20 goes (tab, LF and CR too, from the source or a character
 * reference); DEL and non-ASCII stay.
 * @see lib/common/htmllex.c:characterData
 */
function cleanText(decoded: string) {
  return decoded.replace(/[\x00-\x1f]/g, '');
}

/** expat's predefined entities: no DTD declares others. */
const XML_PREDEFINED: Readonly<Record<string, string>> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

/** Shortest and longest name scanEntity looks up. @see lib/common/utils.c:scanEntity */
const SCAN_ENTITY_MIN = 2;
const SCAN_ENTITY_MAX = 8;

const TEXT_REF = /&(#x[0-9A-Fa-f]+|#[0-9]+|[^&;]+);/g;

/** One reference of a text run, as scanEntity then expat leave it. */
function textRefValue(ref: string, body: string): string {
  if (body[0] === '#') {
    const v = charRefNumber(ref);
    return v < 0 ? ref : String.fromCodePoint(v);
  }
  const n = body.length;
  if (n >= SCAN_ENTITY_MIN && n <= SCAN_ENTITY_MAX && Object.hasOwn(HTML_ENTITIES, body)) {
    return String.fromCodePoint(HTML_ENTITIES[body]!);
  }
  return Object.hasOwn(XML_PREDEFINED, body) ? XML_PREDEFINED[body]! : ref;
}

/**
 * The characters expat hands characterData for a text run: scanEntity first
 * rewrites each entities.h name to `&#N;` (its `&` only when no `#` follows),
 * then expat decodes character references, of any length, and its five
 * predefined entities. Runs expat rejects never get here (textRefError).
 * @see lib/common/htmllex.c:findNext
 * @see lib/common/utils.c:scanEntity
 */
export function decodeTextRefs(raw: string): string {
  return raw.indexOf('&') < 0 ? raw : raw.replace(TEXT_REF, textRefValue);
}

/** The text token of a text run, if anything is left after cleaning. */
export function textTokens(raw: string): Token[] {
  // C's HTML lexer resolves entities via scanEntity and expat during
  // tokenization (htmllex.c), so both sizing and emit see the decoded text.
  // Skipping this measured the raw "&#91;el..." (9-10 chars) instead of
  // "[el..." (6 chars), inflating edge-label vnodes and shifting layout
  // (corpus 1949: +18.7px).
  return charDataTokens(decodeTextRefs(raw));
}

/** characterData on what expat decoded: a T_string when any character survives. */
export function charDataTokens(decoded: string): Token[] {
  const clean = cleanText(decoded);
  return clean.length > 0 ? [{ type: 'text', value: clean }] : [];
}
