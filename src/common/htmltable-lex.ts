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
import type { LexerOutput, OpenToken, TextToken, Token } from './htmltable-types.js';
import { checkAttrs } from './htmltable-attr-warn.js';
import type { AttrEntry } from './htmltable-attr-warn.js';
import { ExpatFeed, findUndefinedEntity, parseTagChunk } from './htmltable-lex-expat.js';
import { charDataTokens, initialCharData, keepLostText, releaseXb, tagInCell, textTokens } from './htmltable-lex-chardata.js';
import type { CharDataState } from './htmltable-lex-chardata.js';
import type { ExpatResult, ExpatToken } from './htmltable-lex-expat.js';
import { findNext } from './htmltable-lex-units.js';
import type { Unit } from './htmltable-lex-units.js';

export type { Token } from './htmltable-types.js';

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
 * Names keep their source case (doAttrs prints them as written) and pairs
 * keep document order.
 * @see lib/common/htmllex.c (XML_Parse "not well-formed" error path)
 */
function parseAttrPairs(raw: string): AttrEntry[] {
  const out: AttrEntry[] = [];
  let i = 0;
  while (i < raw.length) {
    while (isWs(raw[i])) i++;
    if (i >= raw.length) break;
    const m = /^[\w-]+/.exec(raw.slice(i));
    if (m === null) throw new HtmlParseError(raw.slice(i, i + 10));
    const name = m[0];
    i += m[0].length;
    while (isWs(raw[i])) i++;
    if (raw[i] !== '=') throw new HtmlParseError(name);
    i++;
    while (isWs(raw[i])) i++;
    const q = raw[i];
    if (q !== '"' && q !== "'") throw new HtmlParseError(name);
    const end = raw.indexOf(q, i + 1);
    if (end < 0) throw new HtmlParseError(name);
    out.push([name, raw.slice(i + 1, end)]);
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

/** Elements whose `<X/>` endElement folds into one token. @see lib/common/htmllex.c:endElement */
const EMPTY_ELEMENTS: ReadonlySet<string> = new Set(['BR', 'HR', 'VR', 'IMG']);

/** The tokens of one complete `<..>` tag. */
function tagTokens(text: string): Token[] {
  const inner = text.slice(1, -1).trim();
  if (inner.startsWith('/')) return [parseCloseToken(inner)];
  // Self-closing <X/>: expat reports startElement then endElement in one call,
  // and endElement's `ctx->tok` overwrites startElement's. Only BR, HR, VR and
  // IMG turn the pair into one token (T_BR etc.); any other element reaches the
  // parser as its close tag alone, with what startElement printed.
  // @see lib/common/htmllex.c:endElement
  if (inner.endsWith('/')) {
    const open = parseOpenToken(inner.slice(0, -1).trim());
    if (EMPTY_ELEMENTS.has(open.tag)) return [open, { type: 'close', tag: open.tag }];
    const close: Token = { type: 'close', tag: open.tag };
    if (open.warnings !== undefined) close.warnings = open.warnings;
    if (open.warn === true) close.warn = true;
    return [close];
  }
  return [parseOpenToken(inner)];
}

/**
 * The open token for `tag` and its raw attribute text: `doAttrs` runs the
 * attributes through the element's table, and the stderr it would write rides
 * on the token for the parser to print.
 * @see lib/common/htmllex.c:doAttrs
 */
function openToken(tag: string, raw: string): OpenToken {
  const { attrs, warnings, warn } = checkAttrs(tag, parseAttrPairs(raw));
  const tok: OpenToken = { type: 'open', tag, attrs };
  if (warnings.length > 0) tok.warnings = warnings;
  if (warn) tok.warn = true;
  return tok;
}

/** Parse open tag — placed last so Lizard length-to-EOF stays within 30. */
function parseOpenToken(inner: string) {
  const sp = inner.search(/\s/);
  const tag = (sp === -1 ? inner : inner.slice(0, sp)).toUpperCase();
  checkTag(tag);
  return openToken(normalizeTag(tag), sp === -1 ? '' : inner.slice(sp + 1));
}

/**
 * expat `XML_ErrorString` texts for the errors the port detects. Taken from
 * native dot's stderr (graphviz 16.1.0): expat's xmlparse.c is not vendored
 * with the graphviz sources.
 * @see lib/common/htmllex.c:htmllex (XML_ErrorString at the XML_Parse failure)
 */
const XML_ERROR_UNDEFINED_ENTITY = 'undefined entity';
const XML_ERROR_TAG_MISMATCH = 'mismatched tag';
const XML_ERROR_DUPLICATE_ATTRIBUTE = 'duplicate attribute';
/** yacc's message when the token stream ends inside an unfinished construct. */
const SYNTAX_ERROR = 'syntax error';

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

/** Where an expat token sits in the label and the units C had lexed when it ran. */
interface TokenSite {
  src: string;
  tok: ExpatToken;
  st: ChunkState;
}

/**
 * Raise the error C hits for this tag: expat's duplicate attribute and
 * mismatched tag first (detected before the end handler runs), then
 * `lexerror`'s unknown element.
 * @see lib/common/htmllex.c:lexerror
 */
function checkTagToken(site: TokenSite): void {
  const { src, tok, st } = site;
  const tag = parseTagChunk(src.slice(tok.start, tok.end));
  if (tag === undefined) return;
  const context = st.prev + st.curr;
  if (tag.close) {
    if (st.stack.length > 0 && st.stack.pop() !== tag.name) {
      throw htmlErrorInLine(XML_ERROR_TAG_MISMATCH, lineAt(src, tok.start), context);
    }
  } else {
    if (tok.dup !== undefined) throw htmlErrorInLine(XML_ERROR_DUPLICATE_ATTRIBUTE, lineAt(src, tok.dup), context);
    if (!tag.selfClose) st.stack.push(tag.name);
  }
  if (KNOWN_TAGS.has(tag.name.toUpperCase())) return;
  const text = `Unknown HTML element <${tag.name}> on line ${lineAt(src, tok.start)} `;
  throw new HtmlLexError(tag.name.toUpperCase(), text, [`Error: ${text}`]);
}

/** The tokens one expat event gives the parser, after the errors C would hit. */
function eventTokens(site: TokenSite): Token[] {
  const { src, tok, st } = site;
  const text = src.slice(tok.start, tok.end);
  if (tok.kind === 'comment' || tok.kind === 'pi') return [];
  // CDATA content is character data as is: no markup, no entity decoding.
  if (tok.kind === 'cdata') return charDataTokens(tok.data ?? '');
  if (tok.kind === 'tag') {
    checkTagToken(site);
    return tagTokens(text);
  }
  const off = findUndefinedEntity(text);
  if (off >= 0) {
    throw htmlErrorInLine(XML_ERROR_UNDEFINED_ENTITY, lineAt(src, tok.start + off), st.prev + st.curr);
  }
  return textTokens(text);
}

/** What the lexer wrote since it last returned a token. */
interface Carry {
  warnings: string[];
  warn: boolean;
}

/** A label's lexing so far (the state `htmllex` keeps between calls). */
interface LexRun {
  src: string;
  tokens: Token[];
  st: ChunkState;
  expat: ExpatFeed;
  carry: Carry;
  /** `ctx->inCell` and `ctx->xb`. */
  cd: CharDataState;
}

/** Move what `carry` holds onto `first`, the token the parser is about to get. */
function attachCarry(carry: Carry, first: Token): void {
  if (carry.warnings.length > 0) first.warnings = [...carry.warnings, ...(first.warnings ?? [])];
  if (carry.warn) first.warn = true;
  carry.warnings = [];
  carry.warn = false;
}

/** Fold the output of a token the parser will never see into `carry`. */
function absorb(carry: Carry, lost: Token[]): void {
  for (const t of lost) {
    carry.warnings.push(...(t.warnings ?? []));
    if (t.warn === true) carry.warn = true;
  }
}

/** One event's tokens and where it came from. */
interface EventGroup {
  tokens: Token[];
  tok: ExpatToken;
}

/** The events of a call that gave the parser something, in order; the first error aborts. */
function eventGroups(run: LexRun, res: ExpatResult): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const tok of res.tokens) {
    let tokens = eventTokens({ src: run.src, tok, st: run.st });
    if (tok.kind === 'tag') {
      const tag = parseTagChunk(run.src.slice(tok.start, tok.end));
      if (tag !== undefined) tagInCell(run.cd, tag);
    } else if (!run.cd.inCell) {
      tokens = []; // characterData appends only inside a cell
    }
    if (tokens.length > 0) groups.push({ tokens, tok });
  }
  if (res.invalid !== undefined) {
    const { message, offset } = res.invalid;
    throw htmlErrorInLine(message, lineAt(run.src, offset), run.st.prev + run.st.curr);
  }
  return groups;
}

/**
 * Hand the tokens of the event that won to the parser, joining a run of
 * strings into one.
 * @see lib/common/htmlparse.y:string
 */
function deliver(run: LexRun, last: EventGroup): void {
  const first = last.tokens[0]!;
  releaseXb(run.cd, first);
  attachCarry(run.carry, first);
  const info: ChunkInfo = { src: run.src, pos: last.tok.start, end: last.tok.end, context: run.st.prev + run.st.curr };
  const prev = run.tokens.at(-1);
  if (prev?.type === 'text' && first.type === 'text') {
    appendString(prev, first);
    chunkInfo.set(prev, { ...info, pos: chunkInfo.get(prev)?.pos ?? info.pos });
    return;
  }
  for (const t of last.tokens) chunkInfo.set(t, info);
  run.tokens.push(...last.tokens);
}

/**
 * Run the events of one `XML_Parse` call. Each handler assigns `ctx->tok`, so
 * only the last event's tokens reach the parser; what the others wrote still
 * went to stderr. Then the call's error, if any.
 * @see lib/common/htmllex.c:htmllex
 */
function runEvents(run: LexRun, res: ExpatResult): void {
  const groups = eventGroups(run, res);
  const last = groups.pop();
  for (const g of groups) {
    absorb(run.carry, g.tokens);
    keepLostText(run.cd, g.tokens);
  }
  if (last !== undefined) deliver(run, last);
}

/**
 * `string : string T_string`. A run of T_string tokens (a comment between two
 * strings yields no token) is one string: the characters accumulate in the
 * shared buffer until the parser reduces them.
 * @see lib/common/htmlparse.y:string
 */
function appendString(into: TextToken, more: TextToken): void {
  into.value += more.value;
  if (more.warnings !== undefined) into.warnings = [...(into.warnings ?? []), ...more.warnings];
  if (more.warn === true) into.warn = true;
}

/** The label string as C holds it: `start` and `end` bound the part `findNext` scans. */
export interface LabelRange {
  start: number;
  end: number;
}

interface LexUnit extends Unit {
  start: number;
}

/**
 * C's units: `<HTML>` first, the label cut by `findNext`, then `</HTML>`. A
 * source without the wrapper has empty ends.
 * @see lib/common/htmllex.c:htmllex
 */
function* lexUnits(src: string, label: LabelRange): Generator<LexUnit> {
  if (label.start > 0) yield { start: 0, end: label.start, warnings: [], warn: false };
  const text = src.slice(label.start, label.end);
  for (let at = 0; at < text.length;) {
    const u = findNext(text, at);
    yield { start: label.start + at, end: label.start + u.end, warnings: u.warnings, warn: u.warn };
    at = u.end;
  }
  if (label.end < src.length) yield { start: label.end, end: src.length, warnings: [], warn: false };
}

/**
 * The syntax error yacc reports when the stream ends while expat still holds
 * an unfinished token (the held bytes swallowed the closing `</HTML>`).
 * @see lib/common/htmllex.c:htmlerror
 */
function unfinishedError(run: LexRun, held: number): HtmlParseError {
  return htmlErrorInLine(SYNTAX_ERROR, lineAt(run.src, held), run.st.prev + run.st.curr);
}

/** Tokens produced before the first lexical error, plus that error. */
export interface TokenizeResult {
  tokens: Token[];
  error?: HtmlParseError;
  /** Output of the lexer after its last token: printed when the parser asks for more. */
  eof?: LexerOutput;
}

const eofOutput = (carry: Carry): LexerOutput | undefined => {
  if (carry.warnings.length === 0 && !carry.warn) return undefined;
  return carry.warn ? { warnings: carry.warnings, warn: true } : { warnings: carry.warnings };
};

/**
 * Tokenize until the first lexical error and return both. C interleaves
 * lexing with the yacc parse, so a syntax error in the tokens before the
 * failing chunk is reported in preference to the lexical error; callers that
 * parse the partial stream get that precedence.
 * @see lib/common/htmllex.c:htmllex
 * @see lib/common/htmllex.c:findNext
 */
export function tokenizeDeferred(src: string, label: LabelRange = { start: 0, end: src.length }): TokenizeResult {
  const run: LexRun = {
    src, tokens: [], st: { stack: [], prev: '', curr: '' }, expat: new ExpatFeed(src),
    carry: { warnings: [], warn: false }, cd: initialCharData(),
  };
  let error: HtmlParseError | undefined;
  try {
    for (const u of lexUnits(src, label)) {
      run.st.prev = run.st.curr;
      run.st.curr = src.slice(u.start, u.end);
      run.carry.warnings.push(...u.warnings);
      if (u.warn) run.carry.warn = true;
      runEvents(run, run.expat.feed(u.start, u.end, !run.st.curr.startsWith('<')));
    }
    const held = run.expat.held;
    if (held !== undefined) error = unfinishedError(run, held);
  } catch (e) {
    if (!(e instanceof HtmlParseError)) throw e;
    error = e;
  }
  const result: TokenizeResult = { tokens: run.tokens };
  if (error !== undefined) result.error = error;
  const eof = eofOutput(run.carry);
  if (eof !== undefined) result.eof = eof;
  return result;
}

/** @see lib/common/htmllex.c:findNext */
export function tokenize(src: string): Token[] {
  const { tokens, error } = tokenizeDeferred(src);
  if (error !== undefined) throw error;
  return tokens;
}
