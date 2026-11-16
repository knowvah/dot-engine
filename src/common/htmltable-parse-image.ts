// SPDX-License-Identifier: EPL-2.0
/**
 * The `image` rule of an HTML-like label's cell. Strings may stand before and
 * after `<IMG>`: blank ones are ignored, and one with a non-space character is
 * reported through `htmlerror` without `YYABORT`, so the parse goes on and the
 * label keeps its image (parseHTML's rv is 3 with a label).
 *
 * @see lib/common/htmlparse.y:338-356
 * @see lib/common/htmllex.c:52-59
 */

import type { HtmlCellContent, HtmlImage, OpenToken, Token } from './htmltable-types.js';
import type { ParseState } from './htmltable-parse-state.js';
import { consume, consumedTag, emitWarnings, peek } from './htmltable-parse-state.js';
import { htmlErrorAtToken } from './htmltable-lex.js';
import type { CellScan } from './htmltable-parse.js';
import { MSG_SYNTAX_ERROR, consumeClose, parseError, skipStrings } from './htmltable-parse.js';

/** @see lib/common/htmlparse.y:340 (image rule, mid-rule action) */
const MSG_TEXT_BEFORE_IMG = 'Syntax error: non-space string used before <IMG>';
/** @see lib/common/htmlparse.y:343 (image rule, final action) */
const MSG_TEXT_AFTER_IMG = 'Syntax error: non-space string used after <IMG>';

/**
 * `htmlerror` called from a rule action that does not abort: with `tok` the
 * lookahead the lexer last returned, print the message and its context unless
 * an error was printed before, and set `ctx->error`. The lexer ran for `tok`
 * first, so that token's warnings come out ahead of the message. Without a
 * lookahead the lexer failed fetching it and set `ctx->error` itself, so its
 * own error is the one reported.
 * @see lib/common/htmllex.c:htmlerror
 */
const softError = (s: ParseState, tok: Token | undefined, message: string): void => {
  if (tok === undefined) throw parseError(s, tok, message);
  emitWarnings(s, tok);
  if (s.error === true) return;
  s.error = true;
  for (const line of htmlErrorAtToken(message, tok)?.diagnostics ?? []) s.stderr?.write(`${line}\n`);
};

/** `T_img T_end_img` or `T_IMG`: the element itself. */
const parseImgContent = (s: ParseState, t: OpenToken): HtmlImage => {
  consume(s);
  const img: HtmlImage = {
    kind: 'image',
    src: t.attrs['src'] ?? '',
    scale: t.attrs['scale'],
  };
  consumeClose(s, 'IMG');
  return img;
};

/**
 * `image : opt_space T_IMG opt_space` as the cell's only child, entered at the
 * IMG token. The leading `opt_space` is strings alone, so an IMG that follows
 * a tag is a syntax error. Its nonSpace check runs with the IMG as lookahead.
 * The trailing `opt_space` reduces at whatever token follows the strings, and
 * the rule's final action runs there by default reduction: its check is
 * reported at that token even when the token then fails the cell rule.
 * @see lib/common/htmlparse.y:338-356
 */
export const scanCellImage = (s: ParseState, t: OpenToken, st: CellScan): HtmlCellContent[] => {
  if (consumedTag(s, st.start)) throw parseError(s, t, MSG_SYNTAX_ERROR);
  if (st.textNonSpace) softError(s, t, MSG_TEXT_BEFORE_IMG);
  st.kind = 'image';
  const img = parseImgContent(s, t);
  if (skipStrings(s)) softError(s, peek(s), MSG_TEXT_AFTER_IMG);
  return [img];
};
