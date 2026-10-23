// SPDX-License-Identifier: EPL-2.0
/**
 * The slice of libexpat the html lexer's diagnostics depend on. C hands expat
 * one lexer unit per `XML_Parse` call, and expat does not always act on a
 * unit at once: a token that is still incomplete (an unterminated comment or
 * attribute quote, a tag cut off by the end of the label) stays in expat's
 * buffer, and since expat 2.6 it is not re-read until the buffered bytes have
 * doubled (the quadratic-reparse guard). Where an error surfaces, and which
 * events a single call delivers, follow from that, so this models the buffer
 * and the token grammar well enough to report both. The deferral rule and
 * buffer growth are taken from expat's xmlparse.c (`callProcessor`,
 * `XML_GetBuffer`) and checked against native dot 16.1.0's output.
 *
 * @see lib/common/htmllex.c:htmllex
 */

import { HTML_ENTITIES } from './html-entities.js';
import {
  attValueError, charRefNumber, scanAttValue, XML_ERROR_BAD_CHAR_REF, XML_ERROR_UNDEFINED_ENTITY, type AttValueError,
} from './htmltable-lex-attvalue.js';

/** expat `XML_ErrorString(XML_ERROR_INVALID_TOKEN)`. */
export const XML_ERROR_INVALID_TOKEN = 'not well-formed (invalid token)';

/** xmlparse.c `XML_CONTEXT_BYTES`: input kept behind the read pointer. */
const XML_CONTEXT_BYTES = 1024;
/** xmlparse.c `INIT_BUFFER_SIZE`. */
const INIT_BUFFER_SIZE = 1024;

/** One complete expat token of the content: its extent in the label source. */
export interface ExpatToken {
  kind: 'text' | 'tag' | 'comment' | 'pi' | 'cdata';
  start: number;
  end: number;
  /** A `cdata` token's character data, as expat reports it (no entity decoding). */
  data?: string;
  /** A start tag's first storeAtts error: a duplicate name or a bad value. */
  attError?: AttValueError & { offset: number };
}

/** The first well-formedness error of a parse call. */
export interface ExpatInvalid {
  message: string;
  offset: number;
}

/** What one `XML_Parse` call did: the tokens it completed, then maybe an error. */
export interface ExpatResult {
  tokens: ExpatToken[];
  invalid?: ExpatInvalid;
}

/** expat `XML_ErrorString(XML_ERROR_DUPLICATE_ATTRIBUTE)`. */
const XML_ERROR_DUPLICATE_ATTRIBUTE = 'duplicate attribute';

type AttError = AttValueError & { offset: number };

type Scan =
  | { kind: 'complete'; end: number; attError?: AttError }
  | { kind: 'partial' }
  | { kind: 'invalid'; offset: number };

const COMPLETE_END = (end: number, attError?: AttError): Scan =>
  attError === undefined ? { kind: 'complete', end } : { kind: 'complete', end, attError };
const PARTIAL: Scan = { kind: 'partial' };
const INVALID = (offset: number): Scan => ({ kind: 'invalid', offset });

/** XML names: a start character, then name characters (non-ASCII counts as either). */
const XML_NAME = /^[A-Za-z_:\u0080-\uFFFF][\w.:\u0080-\uFFFF-]*/;
const isSpace = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);

function skipSpace(text: string, i: number): number {
  let j = i;
  while (isSpace(text[j])) j++;
  return j;
}

/** UTF-8 length: XML_Parse takes bytes. */
const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * What C passes to `XML_Parse` for (a piece of) a text unit: the buffer
 * `findNext` filled (named entities rewritten as `&#N;`, see `scanEntity`),
 * with a `]` that ends the unit escaped (`protect_rsqb`). Outside a CDATA
 * section expat decodes both back to the characters written; inside one they
 * stay as rewritten.
 * @see lib/common/htmllex.c:findNext
 * @see lib/common/htmllex.c:protect_rsqb
 */
function fedText(piece: string, endsUnit: boolean): string {
  const text = piece.replace(/&([^;&<]*);/g, (m, name: string) => {
    return name.length >= 2 && Object.hasOwn(HTML_ENTITIES, name) ? `&#${HTML_ENTITIES[name]};` : m;
  });
  return endsUnit && text.endsWith(']') ? `${text.slice(0, -1)}&#93;` : text;
}

/** The number of bytes C passes to `XML_Parse` for a unit; other than text units go as written. */
export function fedBytes(unit: string, isText: boolean): number {
  return byteLength(isText ? fedText(unit, true) : unit);
}

interface Pair {
  name: string;
  next: number;
  /** The value between its quotes. */
  value: { start: number; end: number };
}

/** The quoted value opening at `j`: its closing quote, or how scanning stops. */
function scanValue(text: string, j: number): number | Scan {
  const q = text[j];
  if (q !== '"' && q !== "'") return INVALID(j);
  const v = scanAttValue(text, j);
  if ('partial' in v) return PARTIAL;
  if ('invalid' in v) return INVALID(v.invalid);
  const close = v.close;
  const next = skipSpace(text, close + 1);
  // Attributes are separated by white space.
  if (next === close + 1 && !'>/'.includes(text[next] ?? '>')) return INVALID(next);
  return close;
}

/** The `name = "value"` pair at `i`, or how expat's tokenizer stops there. */
function scanPair(text: string, i: number): Pair | Scan {
  const name = XML_NAME.exec(text.slice(i))?.[0];
  if (name === undefined) return INVALID(i);
  const eq = skipSpace(text, i + name.length);
  if (eq >= text.length) return PARTIAL;
  if (text[eq] !== '=') return INVALID(eq);
  const j = skipSpace(text, eq + 1);
  if (j >= text.length) return PARTIAL;
  const close = scanValue(text, j);
  if (typeof close !== 'number') return close;
  return { name, next: skipSpace(text, close + 1), value: { start: j + 1, end: close } };
}

/** `>` or `/>` at `i` ends the tag; end of data leaves it partial; otherwise more attributes. */
function tagEdge(text: string, i: number): Scan | undefined {
  const c = text[i];
  if (c === undefined) return PARTIAL;
  if (c === '>') return COMPLETE_END(i + 1);
  if (c !== '/') return undefined;
  if (i + 1 >= text.length) return PARTIAL;
  return text[i + 1] === '>' ? COMPLETE_END(i + 2) : undefined;
}

/**
 * storeAtts on one attribute: a repeated name, else its value's error. Its
 * undefined-entity error leaves the event pointer at the tag (`p`).
 * @see expat lib/xmlparse.c:storeAtts
 */
function storeAttError(text: string, p: number, at: number, pair: Pair, seen: Set<string>): AttError | undefined {
  if (seen.has(pair.name)) return { message: XML_ERROR_DUPLICATE_ATTRIBUTE, offset: at };
  seen.add(pair.name);
  const err = attValueError(text.slice(pair.value.start, pair.value.end), pair.value.start);
  return err === undefined ? undefined : { message: err.message, offset: err.offset ?? p };
}

/** The pairs of the start tag at `p` from `from`; storeAtts' errors only count once the tag tokenizes whole. */
function scanAttributes(text: string, p: number, from: number): Scan {
  const seen = new Set<string>();
  let attError: AttError | undefined;
  let i = skipSpace(text, from);
  for (;;) {
    const edge = tagEdge(text, i);
    if (edge?.kind === 'complete') return COMPLETE_END(edge.end, attError);
    if (edge !== undefined) return edge;
    const pair = scanPair(text, i);
    if ('kind' in pair) return pair;
    attError ??= storeAttError(text, p, i, pair, seen);
    i = pair.next;
  }
}

/** The name at `at` and the index after it, or the scan that stops there. */
function scanName(text: string, at: number): { next: number } | Scan {
  const name = XML_NAME.exec(text.slice(at))?.[0];
  if (name === undefined) return at >= text.length ? PARTIAL : INVALID(at);
  return { next: at + name.length };
}

/** A start tag at `p`: a name, then white space, `>` or `/>`, then the attributes. */
function scanStartTag(text: string, p: number): Scan {
  const name = scanName(text, p + 1);
  if ('kind' in name) return name;
  const c = text[name.next];
  if (c === undefined) return PARTIAL;
  if (!isSpace(c) && c !== '>' && c !== '/') return INVALID(name.next);
  return scanAttributes(text, p, name.next);
}

/** An end tag at `p`: a name, optional white space, `>`. */
function scanEndTag(text: string, p: number): Scan {
  const name = scanName(text, p + 2);
  if ('kind' in name) return name;
  const i = skipSpace(text, name.next);
  if (i >= text.length) return PARTIAL;
  return text[i] === '>' ? COMPLETE_END(i + 1) : INVALID(i);
}

/** A processing instruction at `p`, up to `?>`. */
function scanPi(text: string, p: number): Scan {
  const e = text.indexOf('?>', p + 2);
  return e < 0 ? PARTIAL : COMPLETE_END(e + 2);
}

/** `<!...>` other than a comment: CDATA stays with the tag path, any other declaration is invalid here. */
function scanDeclaration(text: string, p: number): Scan {
  const cdata = '<![CDATA['.startsWith(text.slice(p, p + 9));
  if (!cdata && text.length - p >= 3) return INVALID(p + 2);
  for (let i = p + 1; i < text.length; i++) {
    if (text[i] === '>') return COMPLETE_END(i + 1);
    if (text[i] === '<') return INVALID(i);
  }
  return PARTIAL;
}

/**
 * A comment at `p` (`<!--` already seen): `--` must be followed by `>`.
 * @see expat xmltok_impl.c:PREFIX(scanComment)
 */
function scanComment(text: string, p: number): Scan {
  for (let i = p + 4; i < text.length; i++) {
    if (text[i] !== '-') continue;
    if (i + 1 >= text.length) return PARTIAL;
    if (text[i + 1] !== '-') continue;
    if (i + 2 >= text.length) return PARTIAL;
    return text[i + 2] === '>' ? COMPLETE_END(i + 3) : INVALID(i + 2);
  }
  return PARTIAL;
}

/** The markup token at `p`, which holds a `<`. */
function scanMarkup(text: string, p: number): { scan: Scan; kind: 'tag' | 'comment' | 'pi' } {
  const rest = text.slice(p, p + 4);
  if (rest === '<!--') return { scan: scanComment(text, p), kind: 'comment' };
  if (text.length - p < 4 && '<!--'.startsWith(rest)) return { scan: PARTIAL, kind: 'comment' };
  if (rest.startsWith('<!-')) return { scan: INVALID(p + 3), kind: 'comment' };
  const c = text[p + 1];
  if (c === '/') return { scan: scanEndTag(text, p), kind: 'tag' };
  if (c === '?') return { scan: scanPi(text, p), kind: 'pi' };
  if (c === '!') return { scan: scanDeclaration(text, p), kind: 'tag' };
  return { scan: scanStartTag(text, p), kind: 'tag' };
}

interface ContentScan {
  tokens: ExpatToken[];
  /** Offset where the unconsumed (partial) token starts. */
  consumed: number;
  invalid?: number;
  /** Whether the scan ended inside a CDATA section. */
  inCdata: boolean;
}

const CDATA_OPEN = '<![CDATA[';
const CDATA_CLOSE = ']]>';

/**
 * Character data of a CDATA section from `p` up to its `]]>` (or the end of
 * what was fed): one `cdata` token, then the index after the section, or -1
 * while it is still open. Markup and `&` are data here. The fed bytes never
 * end in a `]` (text units go through protect_rsqb, other units end in `>`),
 * so expat holds no partial `]]>` back.
 * @see expat xmltok_impl.c:PREFIX(cdataSectionTok)
 */
function scanCdata(text: string, p: number, base: number, dataOf: CdataText, tokens: ExpatToken[]): number {
  const close = text.indexOf(CDATA_CLOSE, p);
  const end = close < 0 ? text.length : close;
  if (end > p) tokens.push({ kind: 'cdata', start: base + p, end: base + end, data: dataOf(base + p, base + end) });
  return close < 0 ? -1 : close + CDATA_CLOSE.length;
}

/**
 * A character expat's tokenizer rejects in character data (BT_NONXML in the
 * UTF-8 table): controls other than tab, LF and CR, U+FFFE and U+FFFF, and a
 * lone surrogate (the UTF-8 form of one is invalid). DEL is BT_OTHER, valid.
 * @see expat lib/asciitab.h
 * @see expat lib/xmltok_impl.c:PREFIX(contentTok) (BT_NONXML)
 */
const CONTENT_NON_XML = /[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

/**
 * Character data at `p` up to the next `<`: one `text` token, then the index it
 * ends at. A reference cut off by the end of the data is not part of the token
 * (`held`): expat waits for the characters that settle it. A BT_NONXML character
 * ends the data token; the next call finds it an invalid token (`invalid`).
 * @see expat lib/xmltok_impl.c:PREFIX(contentTok) (XML_TOK_PARTIAL, BT_NONXML)
 */
function scanText(
  text: string, p: number, base: number, tokens: ExpatToken[],
): { at: number; held: boolean; invalid?: number } {
  const e = text.indexOf('<', p);
  const slice = text.slice(p, e < 0 ? text.length : e);
  const bad = CONTENT_NON_XML.exec(slice)?.index;
  if (bad !== undefined) {
    if (bad > 0) tokens.push({ kind: 'text', start: base + p, end: base + p + bad });
    return { at: p + bad, held: false, invalid: p + bad };
  }
  const from = e < 0 ? heldRefStart(slice) : undefined;
  const end = from === undefined ? p + slice.length : p + from;
  if (end > p) tokens.push({ kind: 'text', start: base + p, end: base + end });
  return { at: end, held: from !== undefined };
}

/** The fed text of the label source between two offsets. */
type CdataText = (start: number, end: number) => string;

/** Tokenize `text` (a label slice at `base`) as far as expat can: tokens, then partial or invalid. */
function scanContent(text: string, base: number, inCdata: boolean, dataOf: CdataText): ContentScan {
  const tokens: ExpatToken[] = [];
  let p = 0;
  let inSection = inCdata;
  while (p < text.length) {
    if (inSection || text.startsWith(CDATA_OPEN, p)) {
      const after = scanCdata(text, inSection ? p : p + CDATA_OPEN.length, base, dataOf, tokens);
      if (after < 0) return { tokens, consumed: text.length, inCdata: true };
      inSection = false;
      p = after;
      continue;
    }
    if (text[p] !== '<') {
      const scanned = scanText(text, p, base, tokens);
      if (scanned.invalid !== undefined) return { tokens, consumed: scanned.at, invalid: base + scanned.invalid, inCdata: false };
      if (scanned.held) return { tokens, consumed: scanned.at, inCdata: false };
      p = scanned.at;
      continue;
    }
    const { scan, kind } = scanMarkup(text, p);
    if (scan.kind === 'invalid') return { tokens, consumed: p, invalid: base + scan.offset, inCdata: false };
    if (scan.kind === 'partial') return { tokens, consumed: p, inCdata: false };
    const tok: ExpatToken = { kind, start: base + p, end: base + scan.end };
    if (scan.attError !== undefined) tok.attError = { ...scan.attError, offset: base + scan.attError.offset };
    tokens.push(tok);
    p = scan.end;
  }
  return { tokens, consumed: p, inCdata: inSection };
}

/**
 * expat's input buffer: `XML_GetBuffer` sizing and the read pointer, kept only
 * as far as `callProcessor`'s reparse deferral depends on them.
 */
class InputBuffer {
  private size = 0;
  private ptr = 0;
  private end = 0;
  private lastRequest = 0;
  /** Bytes the last attempt could not consume; 0 once something was. */
  hadBefore = 0;

  /** `XML_GetBuffer(len)` then the append of `len` bytes. */
  append(len: number): void {
    this.lastRequest = len;
    if (len > this.size - this.end) {
      const keep = Math.min(this.ptr, XML_CONTEXT_BYTES);
      const needed = len + (this.end - this.ptr) + keep;
      if (needed > this.size) {
        let grown = this.size;
        if (grown === 0) grown = INIT_BUFFER_SIZE;
        do grown *= 2; while (grown < needed);
        this.size = grown;
      }
      this.end = this.end - this.ptr + keep;
      this.ptr = keep;
    }
    this.end += len;
  }

  /** Bytes between the read pointer and the end of the data. */
  get have(): number {
    return this.end - this.ptr;
  }

  /** `callProcessor`: is it worth re-reading the partial token now? */
  get enough(): boolean {
    const available = this.ptr - Math.min(this.ptr, XML_CONTEXT_BYTES) + (this.size - this.end);
    return this.have >= 2 * this.hadBefore || this.lastRequest > available;
  }

  /** After an attempt that left `remaining` bytes unconsumed. */
  consumedTo(remaining: number, madeProgress: boolean): void {
    this.hadBefore = madeProgress ? 0 : this.have;
    this.ptr = this.end - remaining;
  }
}

/** The parser state across `XML_Parse` calls on one label. */
export class ExpatFeed {
  private readonly buffer = new InputBuffer();
  private heldStart = 0;
  private fedEnd = 0;
  private inCdata = false;
  /** Source ranges of the text units fed so far: their bytes went through findNext's rewrite. */
  private readonly textUnits: Array<readonly [number, number]> = [];

  constructor(private readonly src: string) {}

  /** Start of the token expat still holds, or undefined when it holds nothing. */
  get held(): number | undefined {
    return this.heldStart < this.fedEnd ? this.heldStart : undefined;
  }

  /** One `XML_Parse(parser, src[start, end), nbytes, 0)`; `isText` for a text unit. */
  feed(start: number, end: number, isText: boolean): ExpatResult {
    if (isText) this.textUnits.push([start, end]);
    this.buffer.append(fedBytes(this.src.slice(start, end), isText));
    this.fedEnd = end;
    if (!this.buffer.enough) return { tokens: [] };
    const text = this.src.slice(this.heldStart, end);
    const scan = scanContent(text, this.heldStart, this.inCdata, (a, b) => this.fedBetween(a, b));
    if (scan.invalid !== undefined) {
      return { tokens: scan.tokens, invalid: { message: XML_ERROR_INVALID_TOKEN, offset: scan.invalid } };
    }
    this.inCdata = scan.inCdata;
    this.heldStart += scan.consumed;
    this.buffer.consumedTo(byteLength(this.src.slice(this.heldStart, end)), scan.consumed > 0);
    return { tokens: scan.tokens };
  }

  /** What expat read for source offsets [start, end): text-unit pieces as findNext rewrote them. */
  private fedBetween(start: number, end: number): string {
    let out = '';
    let p = start;
    for (const [us, ue] of this.textUnits) {
      if (ue <= p || us >= end) continue;
      if (us > p) out += this.src.slice(p, us);
      const e = Math.min(ue, end);
      out += fedText(this.src.slice(Math.max(us, p), e), e === ue);
      p = e;
    }
    return out + this.src.slice(p, end);
  }
}

/** Entities expat knows without a DTD; `scanEntity` leaves them as written. */
const XML_PREDEFINED_ENTITIES = new Set(['lt', 'gt', 'amp', 'quot', 'apos']);

/** An `&name;` that `scanEntity` rewrites: 2 to 8 characters (alphanumeric) that name an HTML entity. */
const SCANNED_ENTITY = /^&([^;&<]*);/;

/**
 * The reference the content tokenizer reads at the `&` at `t`: the index after
 * its `;`, or the index of the character that makes it an invalid token (the
 * end of `text` when the reference runs out: `</HTML>` or another tag follows).
 * Runs the attribute value scanner over the reference alone, closed by a quote,
 * which is scanRef on the same bytes.
 * @see expat lib/xmltok_impl.c:PREFIX(contentTok) (BT_AMP)
 * @see expat lib/xmltok_impl.c:PREFIX(scanRef)
 * @see expat lib/xmltok_impl.c:PREFIX(scanCharRef)
 * @see expat lib/xmltok_impl.c:PREFIX(scanHexCharRef)
 */
function contentRef(text: string, t: number): { end: number } | { invalid: number } {
  const semi = text.indexOf(';', t);
  const ref = text.slice(t, semi < 0 ? text.length : semi + 1);
  const scan = scanAttValue(`"${ref}"`, 0);
  if ('close' in scan) return { end: t + scan.close - 1 };
  return { invalid: 'invalid' in scan ? t + scan.invalid - 1 : text.length };
}

/** A reference problem of character data: expat's error, where its event pointer is, and the `&` it began at. */
interface RefProblem {
  message: string;
  offset: number;
  from: number;
}

/**
 * The first reference of character data that expat rejects: an invalid token
 * (a bare `&`, `&#;`, `&#X41;`, `&#65q`, ..), a `&name;` scanEntity leaves
 * alone (neither an HTML entity nor predefined), or a character reference XML
 * does not allow. An invalid token at the very end of `text` is a reference
 * expat is still waiting on.
 * @see lib/common/utils.c:scanEntity
 * @see expat lib/xmlparse.c:doContent (XML_TOK_INVALID, XML_TOK_ENTITY_REF, XML_TOK_CHAR_REF)
 */
function firstRefProblem(text: string): RefProblem | undefined {
  let t = text.indexOf('&');
  while (t >= 0) {
    if (text[t + 1] !== '#') {
      const name = SCANNED_ENTITY.exec(text.slice(t))?.[1];
      if (name !== undefined && name.length >= 2 && Object.hasOwn(HTML_ENTITIES, name)) {
        t = text.indexOf('&', t + name.length + 2);
        continue;
      }
    }
    const ref = contentRef(text, t);
    if ('invalid' in ref) return { message: XML_ERROR_INVALID_TOKEN, offset: ref.invalid, from: t };
    const key = text.slice(t + 1, ref.end - 1);
    if (text[t + 1] === '#') {
      if (charRefNumber(`&${key};`) < 0) return { message: XML_ERROR_BAD_CHAR_REF, offset: t, from: t };
    } else if (!XML_PREDEFINED_ENTITIES.has(key)) {
      return { message: XML_ERROR_UNDEFINED_ENTITY, offset: t, from: t };
    }
    t = text.indexOf('&', ref.end);
  }
  return undefined;
}

/** The first reference of character data that expat rejects, and the offset of its event pointer. */
export function textRefError(text: string): { message: string; offset: number } | undefined {
  const problem = firstRefProblem(text);
  return problem === undefined ? undefined : { message: problem.message, offset: problem.offset };
}

/** Where a reference that runs to the end of `text` begins: expat holds it until more data arrives. */
function heldRefStart(text: string): number | undefined {
  const problem = firstRefProblem(text);
  return problem?.message === XML_ERROR_INVALID_TOKEN && problem.offset === text.length ? problem.from : undefined;
}

export interface TagChunk {
  close: boolean;
  selfClose: boolean;
  name: string;
}

/** Element name of a complete `<..>` chunk; undefined for comments etc. */
export function parseTagChunk(chunk: string): TagChunk | undefined {
  if (!chunk.endsWith('>')) return undefined;
  const body = chunk.slice(1, -1);
  if (body.startsWith('!')) return undefined;
  const close = body.startsWith('/');
  const name = /^[^\s/>]*/.exec(close ? body.slice(1) : body)?.[0] ?? '';
  return { close, selfClose: !close && body.endsWith('/'), name };
}
