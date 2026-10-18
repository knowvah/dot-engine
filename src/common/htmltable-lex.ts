// SPDX-License-Identifier: EPL-2.0
/**
 * HTML-like label tokenizer — lib/common/htmllex.c port.
 *
 * Lizard 1.22 misparses TS when a pipe character appears inside a regex
 * literal between function declarations. All regexes in this file avoid
 * pipe alternation. Functions are ordered so that any function Lizard
 * miscounts as spanning to EOF stays within the 30-line limit.
 *
 * @see lib/common/htmllex.c:startElement
 * @see lib/common/htmllex.c:findNext
 */

import { HtmlParseError } from './htmltable-types.js';
import type { Token } from './htmltable-types.js';
import { HTML_ENTITIES, htmlEntityUTF8 } from './html-entities.js';

export type { Token } from './htmltable-types.js';

type Attrs = { [k: string]: string };

const KNOWN_TAGS = new Set([
  'TABLE', 'TR', 'TD', 'TH', 'FONT', 'BR', 'IMG',
  'B', 'I', 'U', 'O', 'S', 'SUB', 'SUP', 'HR', 'VR', 'HTML',
]);

/** @see lib/common/htmllex.c:lexerror */
function checkTag(tag: string) {
  if (!KNOWN_TAGS.has(tag.toUpperCase())) {
    throw new HtmlParseError(tag);
  }
}

const isWs = (c: string | undefined): boolean =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r';

/**
 * Parse key="value" attribute pairs. Values are consumed, never
 * re-scanned (the old scanner re-matched words inside quoted values as
 * phantom attributes). Bare or unquoted attributes are not well-formed
 * XML — expat rejects the document and the label falls back to plain
 * text; throwing here reproduces that.
 * @see lib/common/htmllex.c (XML_Parse "not well-formed" error path)
 */
function parseAttrs(raw: string) {
  const out: Attrs = {};
  let i = 0;
  while (i < raw.length) {
    while (isWs(raw[i])) i++;
    if (i >= raw.length) break;
    const m = /^[\w-]+/.exec(raw.slice(i));
    if (m === null) throw new HtmlParseError(raw.slice(i, i + 10));
    const name = m[0].toLowerCase();
    i += m[0].length;
    while (isWs(raw[i])) i++;
    if (raw[i] !== '=') throw new HtmlParseError(name);
    i++;
    while (isWs(raw[i])) i++;
    const q = raw[i];
    if (q !== '"' && q !== "'") throw new HtmlParseError(name);
    const end = raw.indexOf(q, i + 1);
    if (end < 0) throw new HtmlParseError(name);
    out[name] = raw.slice(i + 1, end);
    i = end + 1;
  }
  return out;
}

/**
 * TH is a row-boundary synonym for TR, not a cell tag: the C lexer
 * dispatches both open and close TH identically to TR (T_row/T_end_row).
 * Normalizing here — the single point where tags become tokens — means
 * every downstream consumer (parser) sees TH and TR as structurally
 * identical, mirroring the C lexer's dispatch exactly.
 * @see lib/common/htmllex.c:614,669 (startElement/endElement)
 */
function normalizeTag(tag: string): string {
  return tag === 'TH' ? 'TR' : tag;
}

/** Parse close tag. @see lib/common/htmllex.c:endElement */
function parseCloseToken(inner: string) {
  const body = inner.slice(1).trim();
  const sp = body.search(/\s/);
  const tag = (sp === -1 ? body : body.slice(0, sp)).toUpperCase();
  checkTag(tag);
  return { type: 'close' as const, tag: normalizeTag(tag) };
}

/** @see lib/common/htmllex.c:characterData */
function cleanText(raw: string) {
  const isKeep = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
  return raw.replace(/[\x00-\x1f\x7f]/g, (c) => isKeep(c) ? c : '');
}

/** Scan text run up to next tag; push non-empty token; return new index. */
function scanText(src: string, start: number, tokens: Token[]) {
  let j = start;
  while (j < src.length && src[j] !== '<') j++;
  // Decode XML/HTML entities in the text run. C's HTML lexer resolves entities
  // via expat during tokenization (htmllex.c), so both sizing and emit see the
  // decoded UTF-8 text. Skipping this measured the raw "&#91;el..." (9-10 chars)
  // instead of "[el..." (6 chars), inflating edge-label vnodes and shifting
  // layout (corpus 1949: +18.7px). Plain-string labels already decode via the
  // make_label path, so only HTML-delimited labels diverged.
  const clean = htmlEntityUTF8(cleanText(src.slice(start, j)));
  if (clean.length > 0) tokens.push({ type: 'text', value: clean });
  return j;
}

/** Scan one tag; push token; return index after closing bracket. */
function scanTag(src: string, start: number, tokens: Token[]) {
  let j = start + 1;
  while (j < src.length && src[j] !== '>') j++;
  const inner = src.slice(start + 1, j).trim();
  const next = j + 1;
  if (inner.startsWith('!--')) return next;
  if (inner.startsWith('/')) { tokens.push(parseCloseToken(inner)); return next; }
  // Self-closing <X/>: expat reports startElement then endElement.
  // @see lib/common/htmllex.c (XML_SetElementHandler callbacks)
  if (inner.endsWith('/')) {
    const open = parseOpenToken(inner.slice(0, -1).trim());
    tokens.push(open, { type: 'close', tag: open.tag });
    return next;
  }
  tokens.push(parseOpenToken(inner));
  return next;
}

/** Parse open tag — placed last so Lizard length-to-EOF stays within 30. */
function parseOpenToken(inner: string) {
  const sp = inner.search(/\s/);
  if (sp === -1) {
    const tag = inner.toUpperCase();
    checkTag(tag);
    return { type: 'open' as const, tag: normalizeTag(tag), attrs: parseAttrs('') };
  }
  const tag = inner.slice(0, sp).toUpperCase();
  checkTag(tag);
  return { type: 'open' as const, tag: normalizeTag(tag), attrs: parseAttrs(inner.slice(sp + 1)) };
}

/**
 * expat `XML_ErrorString` texts for the two errors the port detects. Taken
 * from native dot's stderr (graphviz 16.1.0): expat's xmlparse.c is not
 * vendored with the graphviz sources.
 * @see lib/common/htmllex.c:htmllex (XML_ErrorString at the XML_Parse failure)
 */
const XML_ERROR_UNDEFINED_ENTITY = 'undefined entity';
const XML_ERROR_TAG_MISMATCH = 'mismatched tag';
const XML_ERROR_INVALID_TOKEN = 'not well-formed (invalid token)';
const XML_ERROR_DUPLICATE_ATTRIBUTE = 'duplicate attribute';

/** Entities expat knows without a DTD; `scanEntity` leaves them as written. */
const XML_PREDEFINED_ENTITIES = new Set(['lt', 'gt', 'amp', 'quot', 'apos']);

const XML_NAME = /^[A-Za-z_:][\w.:-]*$/;

/**
 * A label failure C reports on stderr before dropping the HTML label
 * (`ctx->error`, parseHTML rv 3). `diagnostics` holds the lines in print
 * order, each already carrying its `Error: ` prefix where C's agerrorf adds
 * one; the caller prints them (one `console.error` each) and then C's
 * `in label of ...` continuation (labels.c:make_label).
 * @see lib/common/htmllex.c:htmllex
 */
export class HtmlLexError extends HtmlParseError {
  readonly diagnostics: readonly string[];

  constructor(tag: string, message: string, diagnostics: readonly string[]) {
    super(tag);
    this.message = message;
    this.diagnostics = diagnostics;
  }
}

/**
 * `agerrorf("%s in line %lu \n", msg, lineno)` followed by `error_context`.
 * @see lib/common/htmllex.c:htmlerror
 * @see lib/common/htmllex.c:error_context
 */
export function htmlErrorInLine(message: string, line: number, context: string): HtmlLexError {
  const text = `${message} in line ${line} `;
  return new HtmlLexError(message, text, [`Error: ${text}`, `... ${context} ...`]);
}

/** The C lexer's current and previous "token" (raw chunk) plus open elements. */
interface ChunkState {
  stack: string[];
  prev: string;
  curr: string;
}

/** Where a token came from: the raw chunk and the C `error_context` pair. */
interface ChunkInfo {
  src: string;
  pos: number;
  end: number;
  context: string;
}

const chunkInfo = new WeakMap<Token, ChunkInfo>();

/**
 * expat's line number at `pos`: `\n`, `\r\n` and a lone `\r` each end a line.
 * @see lib/common/htmllex.c:htmllineno
 */
function lineAt(src: string, pos: number): number {
  let line = 1;
  for (let k = 0; k < pos; k++) {
    if (src[k] === '\n' || (src[k] === '\r' && src[k + 1] !== '\n')) line++;
  }
  return line;
}

/**
 * `XML_GetCurrentLineNumber` after the chunk that produced `tok`: a tag's own
 * line, or for character data the line of expat's last data piece (pieces
 * split at each newline).
 */
function chunkLine(info: ChunkInfo): number {
  if (info.src[info.pos] === '<') return lineAt(info.src, info.pos);
  const last = info.src.lastIndexOf('\n', info.end - 1);
  if (last < info.pos) return lineAt(info.src, info.pos);
  return lineAt(info.src, last === info.end - 1 ? last : last + 1);
}

/**
 * C's `htmlerror` (yacc error) as it reads when the lexer last returned
 * `tok`; undefined when the token has no recorded chunk.
 * @see lib/common/htmllex.c:htmlerror
 */
export function htmlErrorAtToken(message: string, tok: Token | undefined): HtmlLexError | undefined {
  const info = tok === undefined ? undefined : chunkInfo.get(tok);
  if (info === undefined) return undefined;
  return htmlErrorInLine(message, chunkLine(info), info.context);
}

/** Extent of the next chunk: `<..>` or the characters up to the next `<`. */
function chunkEnd(src: string, i: number): number {
  const j = src[i] === '<' ? src.indexOf('>', i + 1) : src.indexOf('<', i);
  if (j < 0) return src.length;
  return src[i] === '<' ? j + 1 : j;
}

/** Offset of the first `&name;` that scanEntity leaves for expat to reject. */
function findUndefinedEntity(text: string): number {
  for (let t = text.indexOf('&'); t >= 0; t = text.indexOf('&', t + 1)) {
    if (text[t + 1] === '#') continue;
    const semi = text.indexOf(';', t + 1);
    if (semi < 0) continue;
    const key = text.slice(t + 1, semi);
    if (XML_NAME.test(key) && !Object.hasOwn(HTML_ENTITIES, key) && !XML_PREDEFINED_ENTITIES.has(key)) {
      return t;
    }
  }
  return -1;
}

interface TagChunk {
  close: boolean;
  selfClose: boolean;
  name: string;
}

/** Element name of a complete `<..>` chunk; undefined for comments etc. */
function parseTagChunk(chunk: string): TagChunk | undefined {
  if (!chunk.endsWith('>')) return undefined;
  const body = chunk.slice(1, -1);
  if (body.startsWith('!')) return undefined;
  const close = body.startsWith('/');
  const name = /^[^\s/>]*/.exec(close ? body.slice(1) : body)?.[0] ?? '';
  return { close, selfClose: !close && body.endsWith('/'), name };
}

interface AttrError {
  message: string;
  offset: number;
}

const ATTR_NAME = /^[A-Za-z_:][\w.:-]*/;
const isSpace = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);

const invalidToken = (offset: number): AttrError => ({ message: XML_ERROR_INVALID_TOKEN, offset });

function skipSpace(chunk: string, i: number): number {
  let j = i;
  while (isSpace(chunk[j])) j++;
  return j;
}

interface AttrPair {
  name: string;
  next: number;
}

/**
 * The `name = "value"` pair at `i`, or the error expat raises there;
 * undefined for an unterminated quote, which is not modelled.
 */
function readAttrPair(chunk: string, i: number): AttrPair | AttrError | undefined {
  const name = ATTR_NAME.exec(chunk.slice(i))?.[0];
  if (name === undefined) return invalidToken(i);
  let j = skipSpace(chunk, i + name.length);
  if (chunk[j] !== '=') return invalidToken(j);
  j = skipSpace(chunk, j + 1);
  const q = chunk[j];
  if (q !== '"' && q !== "'") return invalidToken(j);
  const end = chunk.indexOf(q, j + 1);
  return end < 0 ? undefined : { name, next: end + 1 };
}

/**
 * Walk the `name="value"` pairs of an open tag as expat does and return the
 * first well-formedness error with its offset in the chunk. A duplicate is
 * only reported when no invalid token follows it, as expat checks duplicates
 * after tokenizing the whole tag.
 */
function findAttrError(chunk: string, from: number): AttrError | undefined {
  const seen = new Set<string>();
  let dup: AttrError | undefined;
  let i = skipSpace(chunk, from);
  while (chunk[i] !== '>' && !(chunk[i] === '/' && chunk[i + 1] === '>')) {
    const pair = readAttrPair(chunk, i);
    if (pair === undefined) return undefined;
    if ('message' in pair) return pair;
    if (seen.has(pair.name) && dup === undefined) dup = { message: XML_ERROR_DUPLICATE_ATTRIBUTE, offset: i };
    seen.add(pair.name);
    i = skipSpace(chunk, pair.next);
  }
  return dup;
}

/**
 * Raise the error C hits for this tag chunk: expat's mismatched tag first
 * (it is detected before the end handler runs), then `lexerror`'s unknown
 * element.
 * @see lib/common/htmllex.c:lexerror
 */
function checkTagChunk(src: string, start: number, st: ChunkState): void {
  const tag = parseTagChunk(st.curr);
  if (tag === undefined) return;
  if (tag.close) {
    if (st.stack.length > 0 && st.stack.pop() !== tag.name) {
      throw htmlErrorInLine(XML_ERROR_TAG_MISMATCH, lineAt(src, start), st.prev + st.curr);
    }
  } else {
    const bad = findAttrError(st.curr, 1 + tag.name.length);
    if (bad !== undefined) {
      throw htmlErrorInLine(bad.message, lineAt(src, start + bad.offset), st.prev + st.curr);
    }
    if (!tag.selfClose) st.stack.push(tag.name);
  }
  if (KNOWN_TAGS.has(tag.name.toUpperCase())) return;
  const text = `Unknown HTML element <${tag.name}> on line ${lineAt(src, start)} `;
  throw new HtmlLexError(tag.name.toUpperCase(), text, [`Error: ${text}`]);
}

/** Raise the expat or lexer error C would hit while parsing this chunk. */
function checkChunk(src: string, start: number, st: ChunkState): void {
  if (st.curr.startsWith('<')) {
    checkTagChunk(src, start, st);
    return;
  }
  const off = findUndefinedEntity(st.curr);
  if (off >= 0) {
    throw htmlErrorInLine(XML_ERROR_UNDEFINED_ENTITY, lineAt(src, start + off), st.prev + st.curr);
  }
}

/** Tokens produced before the first lexical error, plus that error. */
export interface TokenizeResult {
  tokens: Token[];
  error?: HtmlParseError;
}

/**
 * Tokenize until the first lexical error and return both. C interleaves
 * lexing with the yacc parse, so a syntax error in the tokens before the
 * failing chunk is reported in preference to the lexical error; callers that
 * parse the partial stream get that precedence.
 * @see lib/common/htmllex.c:findNext
 */
export function tokenizeDeferred(src: string): TokenizeResult {
  const tokens: Token[] = [];
  const st: ChunkState = { stack: [], prev: '', curr: '' };
  let i = 0;
  try {
    while (i < src.length) {
      const first = tokens.length;
      const start = i;
      st.prev = st.curr;
      st.curr = src.slice(i, chunkEnd(src, i));
      checkChunk(src, i, st);
      i = src[i] === '<' ? scanTag(src, i, tokens) : scanText(src, i, tokens);
      const info: ChunkInfo = { src, pos: start, end: i, context: st.prev + st.curr };
      for (let k = first; k < tokens.length; k++) chunkInfo.set(tokens[k]!, info);
    }
  } catch (e) {
    if (e instanceof HtmlParseError) return { tokens, error: e };
    throw e;
  }
  return { tokens };
}

/** @see lib/common/htmllex.c:findNext */
export function tokenize(src: string): Token[] {
  const { tokens, error } = tokenizeDeferred(src);
  if (error !== undefined) throw error;
  return tokens;
}
