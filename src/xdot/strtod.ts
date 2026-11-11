// SPDX-License-Identifier: EPL-2.0
/**
 * The number scan C's xdot parser gets from libc strtod. parseReal, parseRect
 * and parsePolyline all read their doubles with strtod, so an xdot string may
 * hold anything strtod accepts: a decimal, a hexadecimal float, `inf` or
 * `infinity`, and `nan` or `nan(...)`. The grammar is the oracle platform's
 * (macOS libc), which takes any characters between `nan(` and the first `)`.
 * @see lib/xdot/xdot.c:parseReal
 */

/** A scanned number and the offset just past it, or null when none starts here. */
export type Scan = { val: number; pos: number } | null;

const INF_WORD = "inf";
const INF_TAIL = "inity";
const NAN_WORD = "nan";

/** Bits in a double's significand, the smallest and largest binary exponents. */
const SIGNIFICAND_BITS = 53;
const MIN_SUBNORMAL_EXP = -1074;
const MAX_BINARY_EXP = 1023;
const MIN_NORMAL_EXP = -1022;
const EXP_BIAS = 1023;
/** 2^52: an exponent field sits above the 52 fraction bits. */
const FRACTION_SCALE = 2n ** 52n;
const HEX_DIGIT_BITS = 4n;

/** @see lib/util/gv_ctype.h:gv_isspace */
export function isSpace(c: string): boolean {
  return c === " " || (c >= "\t" && c <= "\r");
}

function isDecDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isHexDigit(c: string): boolean {
  return isDecDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
}

function skipWhile(s: string, i: number, pred: (c: string) => boolean): number {
  while (i < s.length && pred(s[i])) i++;
  return i;
}

function matchesWord(s: string, i: number, word: string): boolean {
  return s.slice(i, i + word.length).toLowerCase() === word;
}

/**
 * The end of an exponent starting at `i`, or `i` when the marker is missing
 * or no digit follows it: strtod("1e+") is 1 and stops at the `e`.
 */
function exponentEnd(s: string, i: number, marker: string): number {
  if (i >= s.length || s[i].toLowerCase() !== marker) return i;
  let j = i + 1;
  if (s[j] === "+" || s[j] === "-") j++;
  const end = skipWhile(s, j, isDecDigit);
  return end === j ? i : end;
}

/** 2^q as a double, exact for every q a double can hold (-1074..1023). */
function pow2(q: number): number {
  let bits = BigInt(q + EXP_BIAS) * FRACTION_SCALE;
  if (q < MIN_NORMAL_EXP) bits = 2n ** BigInt(q - MIN_SUBNORMAL_EXP);
  return new Float64Array(new BigUint64Array([bits]).buffer)[0];
}

/** m / 2^shift rounded to nearest, ties to even; exact when shift <= 0. */
function shiftRoundHalfEven(m: bigint, shift: bigint): bigint {
  if (shift <= 0n) return m << -shift;
  const kept = m >> shift;
  const rem = m - (kept << shift);
  const half = 1n << (shift - 1n);
  const roundUp = rem > half || (rem === half && (kept & 1n) === 1n);
  return roundUp ? kept + 1n : kept;
}

/**
 * m * 2^e2 as the nearest double, ties to even, as strtod rounds a hex float:
 * 53 bits for a normal result, fewer in the subnormal range, infinity above
 * the largest double and zero below half the smallest.
 */
function hexToDouble(m: bigint, e2: bigint): number {
  if (m === 0n) return 0;
  // The exponent of the leading bit; bigint, since the text may carry an
  // exponent of any length.
  const top = BigInt(m.toString(2).length - 1) + e2;
  if (top > BigInt(MAX_BINARY_EXP)) return Infinity;
  if (top < BigInt(MIN_SUBNORMAL_EXP - 1)) return 0;
  const q = Math.max(Number(top) - (SIGNIFICAND_BITS - 1), MIN_SUBNORMAL_EXP);
  // A significand rounded up to 2^53 at the top exponent overflows to
  // infinity in the multiplication, as strtod does.
  return Number(shiftRoundHalfEven(m, BigInt(q) - e2)) * pow2(q);
}

/**
 * A hexadecimal float whose "0x" starts at `i`: hex digits, an optional `.`
 * and hex digits, an optional `p[sign]digits`. Null when no hex digit follows
 * the prefix; strtod then reads the leading "0" as a decimal.
 */
function scanHex(s: string, i: number): Scan {
  const intStart = i + 2;
  const intEnd = skipWhile(s, intStart, isHexDigit);
  const hasDot = s[intEnd] === ".";
  const end = hasDot ? skipWhile(s, intEnd + 1, isHexDigit) : intEnd;
  const digits = s.slice(intStart, intEnd) + (hasDot ? s.slice(intEnd + 1, end) : "");
  if (digits.length === 0) return null;
  const fracDigits = BigInt(hasDot ? end - intEnd - 1 : 0);
  const expEnd = exponentEnd(s, end, "p");
  const exp = expEnd > end ? BigInt(s.slice(end + 1, expEnd)) : 0n;
  const val = hexToDouble(BigInt(`0x${digits}`), exp - HEX_DIGIT_BITS * fracDigits);
  return { val, pos: expEnd };
}

/**
 * A decimal: digits with an optional `.`, at least one digit in all, and an
 * optional `e[sign]digits`. parseFloat rounds the scanned text correctly, as
 * strtod does, and overflows to infinity.
 */
function scanDecimal(s: string, i: number): Scan {
  const intEnd = skipWhile(s, i, isDecDigit);
  const hasDot = s[intEnd] === ".";
  const mantEnd = hasDot ? skipWhile(s, intEnd + 1, isDecDigit) : intEnd;
  const digitCount = mantEnd - i - (hasDot ? 1 : 0);
  if (digitCount === 0) return null;
  const end = exponentEnd(s, mantEnd, "e");
  return { val: parseFloat(s.slice(i, end)), pos: end };
}

/**
 * `inf` or `infinity`, and `nan` or `nan(...)`, case-insensitive. The
 * parenthesized part is taken only when a `)` closes it.
 */
function scanSpecial(s: string, i: number): Scan {
  if (matchesWord(s, i, INF_WORD)) {
    const tail = i + INF_WORD.length;
    return { val: Infinity, pos: matchesWord(s, tail, INF_TAIL) ? tail + INF_TAIL.length : tail };
  }
  if (!matchesWord(s, i, NAN_WORD)) return null;
  const end = i + NAN_WORD.length;
  const close = s[end] === "(" ? s.indexOf(")", end) : -1;
  return { val: NaN, pos: close === -1 ? end : close + 1 };
}

function scanMagnitude(s: string, i: number): Scan {
  if (s[i] === "0" && (s[i + 1] === "x" || s[i + 1] === "X")) {
    const hex = scanHex(s, i);
    if (hex !== null) return hex;
  }
  return scanDecimal(s, i) ?? scanSpecial(s, i);
}

/**
 * strtod(s + pos, &end): skips whitespace, takes an optional sign, then the
 * longest number strtod accepts. Null when no conversion is possible, which
 * is C's `end == s`.
 * @see lib/xdot/xdot.c:parseReal
 */
export function scanStrtod(s: string, pos: number): Scan {
  let i = skipWhile(s, pos, isSpace);
  const negative = s[i] === "-";
  if (negative || s[i] === "+") i++;
  const mag = scanMagnitude(s, i);
  if (mag === null) return null;
  return { val: negative ? -mag.val : mag.val, pos: mag.pos };
}
