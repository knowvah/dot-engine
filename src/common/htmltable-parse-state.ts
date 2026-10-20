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

import type { HtmlParseError, Token } from './htmltable-types.js';
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
}

export const peek = (s: ParseState): Token | undefined => s.tokens[s.pos];

/**
 * Print what the C lexer wrote while lexing `tok`, once, and fold its `warn`
 * into the label's rv.
 */
export const emitWarnings = (s: ParseState, tok: Token): void => {
  if (tok.type !== 'open' || s.stderr === undefined || s.emitted?.has(tok) === true) return;
  s.emitted?.add(tok);
  for (const text of tok.warnings ?? []) s.stderr.write(text);
  if (tok.warn === true) s.warn = true;
};

/** Take the token at the cursor; its warnings print now. */
export const consume = (s: ParseState): Token => {
  const t = s.tokens[s.pos];
  s.pos++;
  if (t !== undefined) emitWarnings(s, t);
  return t;
};
