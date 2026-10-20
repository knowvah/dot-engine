// SPDX-License-Identifier: EPL-2.0
/**
 * Cursor state of the HTML-like label parser and the consume step that prints
 * a token's lexer warnings. C lexes a token when the parser reaches it, so the
 * warnings of a token the parser never gets to print nothing; T9's lexer
 * warnings ride on the same `warnings` array.
 *
 * @see lib/common/htmllex.c:doAttrs
 * @see lib/common/htmllex.c:clearHTMLlexer
 */

import type { HtmlParseError, LexerOutput, Token } from './htmltable-types.js';
import type { StderrLines } from './htmltable-attr-warn.js';

export interface ParseState {
  tokens: Token[];
  pos: number;
  /** Lexical error found after the last token: C reports it when the parser asks for more. */
  pending?: HtmlParseError;
  /** Where lexer warnings go as tokens are reached (C's stderr, line by line); none: silent. */
  stderr?: StderrLines;
  /** Tokens whose warnings are already out (a token is lexed once). */
  emitted?: WeakSet<Token>;
  /** `ctx->warn`: a reached token's warning made the label's rv 1. */
  warn?: boolean;
  /** What the lexer wrote after its last token, printed when the parser asks for more. */
  eof?: LexerOutput;
}

export const peek = (s: ParseState): Token | undefined => s.tokens[s.pos];

/**
 * Print what the C lexer wrote while lexing `tok`, once, and fold its `warn`
 * into the label's rv.
 */
export const emitWarnings = (s: ParseState, tok: Token): void => {
  if (s.stderr === undefined || s.emitted?.has(tok) === true) return;
  s.emitted?.add(tok);
  emitOutput(s, tok);
};

const emitOutput = (s: ParseState, out: LexerOutput): void => {
  for (const text of out.warnings ?? []) s.stderr?.write(text);
  if (out.warn === true) s.warn = true;
};

/**
 * The parser ran off the last token: C lexes the rest now, so what it wrote
 * after that token (warnings of units that produced none) prints once.
 */
export const emitEof = (s: ParseState): void => {
  if (s.stderr === undefined || s.eof === undefined) return;
  const out = s.eof;
  delete s.eof;
  emitOutput(s, out);
};

/** Take the token at the cursor; its warnings print now. */
export const consume = (s: ParseState): Token => {
  const t = s.tokens[s.pos];
  s.pos++;
  if (t !== undefined) emitWarnings(s, t);
  return t;
};
