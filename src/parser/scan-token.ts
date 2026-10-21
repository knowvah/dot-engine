// SPDX-License-Identifier: EPL-2.0

/**
 * What scan.l's flex scanner holds when bison reports a syntax error: the
 * start condition, `yytext`, `line_num` and the string buffer. `aagerror`
 * prints these, so a Peggy syntax error (which knows only an offset) is
 * re-lexed here with scan.l's rules up to the offending token.
 *
 * The walk lexes the whole source from the start, the way flex does, because
 * `line_num` depends on every newline consumed (comments, strings, `#line`
 * directives) and an unterminated string or comment swallows the rest of the
 * input. It stops at the first token that ends after the error offset.
 *
 * @see lib/cgraph/scan.l:aagerror, :118-146 (rules)
 */

/** flex start conditions of scan.l (`%x comment qstring hstring`). */
export type ScanState = 'INITIAL' | 'qstring' | 'hstring' | 'comment';

/** The scanner state `aagerror` reads. */
export interface ScanAtError {
  state: ScanState;
  /** `yytext` of the last token scanned; empty at EOF. */
  text: string;
  /** `yyextra->line_num`. */
  line: number;
  /** `yyextra->Sbuf`: processed string text pending in qstring/hstring. */
  buffer: string;
}

/** scan.l's YY_BUF_SIZE as printed by aagerror. @see lib/cgraph/scan.l:aagerror */
const YY_BUF_SIZE = 16384;
/** `%.80s` in aagerror's "String starting:" line. */
const STRING_STARTING_BYTES = 80;
const ASCII_DEL = 0x7f;

/** One flex match: `end` is the next scan position. */
type Step =
  | { kind: 'skip'; end: number; line?: number }
  | { kind: 'token'; end: number; text: string }
  | { kind: 'open'; state: ScanState; buffer: string };

/** scan.l LETTER `[A-Za-z_\200-\377]`: any non-ASCII character counts. */
function isLetter(c: string | undefined): boolean {
  if (c === undefined) return false;
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_'
    || c.charCodeAt(0) > ASCII_DEL;
}

function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= '0' && c <= '9';
}

/** True when a NUMBER starts at i (sign, digits, or a dot before a digit). */
function startsNumber(s: string, i: number): boolean {
  const c = s[i];
  if (isDigit(c)) return true;
  if (c === '.') return isDigit(s[i + 1]);
  if (c !== '-') return false;
  return isDigit(s[i + 1]) || (s[i + 1] === '.' && isDigit(s[i + 2]));
}

/** End index of the longest NUMBER match starting at i (scan.l:109). */
function matchNumber(s: string, i: number): number {
  let j = s[i] === '-' ? i + 1 : i;
  if (s[j] === '.') {
    j++;
    while (isDigit(s[j])) j++;
  } else {
    while (isDigit(s[j])) j++;
    if (s[j] === '.') {
      j++;
      while (isDigit(s[j])) j++;
    }
  }
  if (s[j] === '.' || isLetter(s[j])) j++;
  return j;
}

/** scan.l chkNum: the last character is a letter, or a second '.'. */
function badlyDelimited(text: string): boolean {
  const c = text[text.length - 1]!;
  const dot = text.indexOf('.');
  return (!isDigit(c) && c !== '.') || (c === '.' && dot !== text.length - 1);
}

/** End of the line holding i (the position of its '\n', or the length). */
function lineEnd(s: string, i: number): number {
  const nl = s.indexOf('\n', i);
  return nl === -1 ? s.length : nl;
}

/**
 * scan.l ppDirective on `#.*`: `#line N "file"` / `# N` resets line_num to
 * N-1 (the line's own '\n' then counts), ignoring N <= 0.
 * @see lib/cgraph/scan.l:ppDirective
 */
function directiveLine(text: string): number | undefined {
  const rest = text.slice(1).replace(/^line/, '');
  const m = /^\s*([+-]?\d+)/.exec(rest);
  if (m === null) return undefined;
  const lineno = Number.parseInt(m[1]!, 10);
  return lineno <= 0 ? undefined : lineno - 1;
}

/** `<qstring>` rules: `\"` adds `"`, an escaped newline vanishes. */
function qstringBuffer(body: string): string {
  return body.replace(/\\\\|\\"|\\\n/g, (m) => (m === '\\"' ? '"' : m === '\\\n' ? '' : m));
}

/** Lex a `"` string opened at i: closes, or runs to EOF still open. */
function lexQuoted(s: string, i: number): Step {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\' && j + 1 < s.length) j++;
    else if (s[j] === '"') return { kind: 'token', end: j + 1, text: '"' };
  }
  return { kind: 'open', state: 'qstring', buffer: qstringBuffer(s.slice(i + 1)) };
}

/** Lex a `<...>` HTML string opened at i, tracking nesting (scan.l:143-145). */
function lexHtml(s: string, i: number): Step {
  let nest = 1;
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '<') nest++;
    else if (s[j] === '>' && --nest === 0) return { kind: 'token', end: j + 1, text: '>' };
  }
  return { kind: 'open', state: 'hstring', buffer: s.slice(i + 1) };
}

/** Lex a `/*` comment opened at i. */
function lexComment(s: string, i: number): Step {
  const close = s.indexOf('*/', i + 2);
  if (close === -1) return { kind: 'open', state: 'comment', buffer: '' };
  return { kind: 'skip', end: close + 2 };
}

/** Lex `#...`: a line directive at the start of a line, else a comment. */
function lexHash(s: string, i: number): Step {
  const end = lineEnd(s, i);
  const atLineStart = i === 0 || s[i - 1] === '\n';
  const line = atLineStart ? directiveLine(s.slice(i, end)) : undefined;
  return line === undefined ? { kind: 'skip', end } : { kind: 'skip', end, line };
}

/** Lex NAME / NUMBER / edge operator / single character at i. */
function lexAtom(s: string, i: number): Step {
  if (isLetter(s[i])) {
    let j = i + 1;
    while (isLetter(s[j]) || isDigit(s[j])) j++;
    const text = s.slice(i, j);
    // "\xEF\xBB\xBF" (a BOM) is ignored, not a NAME.
    return text === '﻿' ? { kind: 'skip', end: j } : { kind: 'token', end: j, text };
  }
  if (s[i] === '-' && (s[i + 1] === '-' || s[i + 1] === '>')) {
    return { kind: 'token', end: i + 2, text: s.slice(i, i + 2) };
  }
  if (!startsNumber(s, i)) return { kind: 'token', end: i + 1, text: s[i]! };
  const j = matchNumber(s, i);
  const end = badlyDelimited(s.slice(i, j)) ? j - 1 : j; // yyless(leng-1)
  return { kind: 'token', end, text: s.slice(i, end) };
}

/** Whitespace, comments and `#` lines at i; undefined for any other start. */
function lexTrivia(s: string, i: number): Step | undefined {
  const c = s[i]!;
  if (c === '\n' || c === ' ' || c === '\t' || c === '\r') return { kind: 'skip', end: i + 1 };
  if (c === '#') return lexHash(s, i);
  if (c !== '/') return undefined;
  if (s[i + 1] === '*') return lexComment(s, i);
  if (s[i + 1] === '/') return { kind: 'skip', end: lineEnd(s, i) };
  return undefined;
}

/** One INITIAL-state flex match at i. */
function lexStep(s: string, i: number): Step {
  const trivia = lexTrivia(s, i);
  if (trivia !== undefined) return trivia;
  if (s[i] === '"') return lexQuoted(s, i);
  if (s[i] === '<') return lexHtml(s, i);
  return lexAtom(s, i);
}

/** Number of '\n' in s[from, to). */
function countNewlines(s: string, from: number, to: number): number {
  let n = 0;
  for (let i = s.indexOf('\n', from); i !== -1 && i < to; i = s.indexOf('\n', i + 1)) n++;
  return n;
}

const HEADER_KEYWORDS = ['strict', 'graph', 'digraph'];

/**
 * The PEG matches the header keywords letter by letter, so a source ending in
 * a proper prefix of one (`digra`) fails at EOF, past the NAME flex returned;
 * C's parser rejects that NAME itself. Only the first token, or the one after
 * `strict`, is a header position.
 */
function isTruncatedHeaderKeyword(
  src: string,
  step: { end: number; text: string },
  offset: number,
  seen: readonly string[],
): boolean {
  if (offset !== src.length || step.end !== offset || seen.length > 1) return false;
  if (seen.length === 1 && seen[0]!.toLowerCase() !== 'strict') return false;
  const word = step.text.toLowerCase();
  return HEADER_KEYWORDS.some((k) => k.length > word.length && k.startsWith(word));
}

/**
 * True when the parser's rejection at `offset` belongs to this token: the
 * offset falls inside it or at its start. A stray '-' or '.' is the exception:
 * the PEG's failed NUMBER attempt consumed it (and a following '.' after '-')
 * before failing, so its offset lies just past the token flex returned.
 */
function reachesOffset(
  src: string,
  step: { end: number; text: string },
  offset: number,
  seen: readonly string[],
): boolean {
  if (step.end > offset) return true;
  if (isTruncatedHeaderKeyword(src, step, offset, seen)) return true;
  if (step.text !== '-' && step.text !== '.') return false;
  return offset <= step.end + (step.text === '-' && src[step.end] === '.' ? 1 : 0);
}

/**
 * Scanner state when the parser rejects the token at `offset`: lex from the
 * start and stop at the first token ending after `offset` (or at an
 * unterminated string/comment, which runs to EOF). Past the last token the
 * scanner is at EOF with an empty `yytext`.
 * @see lib/cgraph/scan.l:aagerror
 */
export function scanAtError(src: string, offset: number): ScanAtError {
  let line = 1;
  let i = 0;
  const seen: string[] = [];
  while (i < src.length) {
    const step = lexStep(src, i);
    if (step.kind === 'open') {
      line += countNewlines(src, i, src.length);
      return { state: step.state, text: '', line, buffer: step.buffer };
    }
    if (step.kind === 'skip' && step.line !== undefined) line = step.line;
    line += countNewlines(src, i, step.end);
    if (step.kind === 'token' && reachesOffset(src, step, offset, seen)) {
      return { state: 'INITIAL', text: step.text, line, buffer: '' };
    }
    if (step.kind === 'token') seen.push(step.text);
    i = step.end;
  }
  return { state: 'INITIAL', text: '', line, buffer: '' };
}

/** `%.80s`: the first 80 bytes (UTF-8) of the string buffer. */
function firstBytes(s: string): string {
  const bytes = new TextEncoder().encode(s);
  if (bytes.length <= STRING_STARTING_BYTES) return s;
  return new TextDecoder().decode(bytes.subarray(0, STRING_STARTING_BYTES));
}

/** The tail aagerror adds for an empty `yytext`, by start condition. */
function stateNote(at: ScanAtError): string {
  const start = at.buffer.length > 0 ? firstBytes(at.buffer) : '';
  switch (at.state) {
    case 'qstring':
      return ` scanning a quoted string (missing endquote? longer than ${YY_BUF_SIZE}?)`
        + (start === '' ? '' : `\nString starting:"${start}`);
    case 'hstring':
      return ` scanning a HTML string (missing '>'? bad nesting? longer than ${YY_BUF_SIZE}?)`
        + (start === '' ? '' : `\nString starting:<${start}`);
    case 'comment':
      return ` scanning a /*...*/ comment (missing '*/? longer than ${YY_BUF_SIZE}?)`;
    case 'INITIAL':
      return '';
  }
}

/**
 * The line `aagerror` hands to agerrorf for a syntax error at `offset`, as
 * stderr shows it without the trailing newline and without the `<file>: `
 * prefix. @see lib/cgraph/scan.l:aagerror
 */
export function syntaxErrorMessage(src: string, offset: number): string {
  const at = scanAtError(src, offset);
  const where = `Error: syntax error in line ${at.line}`;
  return at.text === '' ? where + stateNote(at) : `${where} near '${at.text}'`;
}
