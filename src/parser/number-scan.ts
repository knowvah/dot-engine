// SPDX-License-Identifier: EPL-2.0

/**
 * scan.l's chkNum diagnostics. The NUMBER regexp allows one trailing '.' or
 * LETTER so the lexer can catch a number run into a name (`00splines`) or a
 * second dot (`1.2.3`); chkNum then warns and yyless() hands the last
 * character back, splitting the text into two tokens. The PEG grammar already
 * yields the split tokens; this pass reproduces the warnings, which a
 * backtracking PEG action would emit unreliably (an alternative that fails
 * after matching a number would re-run it).
 *
 * The walk runs over Stripper output (comments and string interiors blanked,
 * same length, newlines kept), lexing the INITIAL-state tokens that can
 * contain or abut a number: NAME, NUMBER, and the `--` / `->` edge operators.
 *
 * @see lib/cgraph/scan.l:106-110 (LETTER, DIGIT, NAME, NUMBER), :135, chkNum
 */

/** One chkNum warning: the matched NUMBER text and its line. */
export interface NumberAmbiguity {
  text: string;
  line: number;
  offset: number;
}

const ASCII_DEL = 0x7f;

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

/** scan.l twoDots: the first '.' is not the last character. */
function twoDots(text: string): boolean {
  const dot = text.indexOf('.');
  return dot !== -1 && dot !== text.length - 1;
}

/** scan.l chkNum: the last character is a letter, or a second '.'. */
function chkNum(text: string): boolean {
  const c = text[text.length - 1]!;
  return (!isDigit(c) && c !== '.') || (c === '.' && twoDots(text));
}

/**
 * Lex one INITIAL token at i; returns the next index and, for a badly
 * delimited NUMBER, its text (the next index is then yyless'd back by one).
 */
function lexToken(s: string, i: number): { next: number; bad: string | null } {
  if (isLetter(s[i])) {
    let j = i + 1;
    while (isLetter(s[j]) || isDigit(s[j])) j++;
    return { next: j, bad: null };
  }
  if (s[i] === '-' && (s[i + 1] === '-' || s[i + 1] === '>')) return { next: i + 2, bad: null };
  if (!startsNumber(s, i)) return { next: i + 1, bad: null };
  const j = matchNumber(s, i);
  const text = s.slice(i, j);
  return chkNum(text) ? { next: j - 1, bad: text } : { next: j, bad: null };
}

/**
 * Every badly delimited NUMBER in `src`, in lexing order. `stripped` is
 * Stripper.strip(src) (same length); tokens are lexed from it, lines are
 * counted in `src` (the stripper blanks newlines inside comments and strings,
 * which scan.l still counts). @see lib/cgraph/scan.l:chkNum
 */
export function scanNumberAmbiguities(src: string, stripped: string): NumberAmbiguity[] {
  const out: NumberAmbiguity[] = [];
  let line = 1;
  let lineAt = 0;
  for (let i = 0; i < stripped.length;) {
    const { next, bad } = lexToken(stripped, i);
    if (bad !== null) {
      for (; lineAt < i; lineAt++) if (src[lineAt] === '\n') line++;
      out.push({ text: bad, line, offset: i });
    }
    i = next;
  }
  return out;
}

/** agwarningf text for one chkNum ambiguity; a parsed string is "input". */
export function numberAmbiguityMessage(a: NumberAmbiguity): string {
  return `Warning: syntax ambiguity - badly delimited number '${a.text}' in line ${a.line} of input splits into two tokens`;
}
