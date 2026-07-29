// SPDX-License-Identifier: EPL-2.0
//
// Branch-coverage tests for xdot-ops.ts primitives not exercised by
// xdot-ops.test.ts (which only covers xdotId). Targets the remaining
// uncovered branches from the T4d coverage digest: trimAndStrip,
// printNum/xdotNum edge cases, utf8Len surrogate/3-byte paths,
// gvColorRgba none/hsva paths, radialGradientOp angle branch, xdotFont
// non-positive size, gfmt5 scientific-notation branches, isEscapeSeq,
// agcanonEscape, trimFixed3.

import { describe, it, expect } from 'vitest';
import {
  trimAndStrip, printNum, xdotNum, utf8Len, gvColorRgba, radialGradientOp,
  xdotFont, gfmt5, gfmt2, isEscapeSeq, agcanonEscape, trimFixed3,
} from './xdot-ops.js';

describe('trimAndStrip', () => {
  it('returns the string unchanged when it has no decimal point', () => {
    // L54: dot < 0 branch.
    expect(trimAndStrip('5')).toBe('5');
    expect(trimAndStrip('-3')).toBe('-3');
  });

  it('strips trailing zeros and collapses leading 0.', () => {
    expect(trimAndStrip('0.500')).toBe('.5');
    expect(trimAndStrip('-0.500')).toBe('-.5');
  });
});

describe('printNum clamping', () => {
  it('clamps a large magnitude to +/-MAX_NEGNUM', () => {
    // MAX_NEGNUM (999999999999999.99) rounds to this float64 String() form.
    expect(printNum(1e18)).toBe('1000000000000000');
    expect(printNum(-1e18)).toBe('-1000000000000000');
  });

  it('suppresses near-zero to "0"', () => {
    expect(printNum(0.001)).toBe('0');
    expect(printNum(-0.001)).toBe('0');
  });
});

describe('xdotNum', () => {
  it('collapses a half-to-even "-0.00" result to "0"', () => {
    // L128: `s === '-0' ? '0' : s` true branch.
    expect(xdotNum(-0.001)).toBe('0');
  });

  it('leaves a non-zero value as-is', () => {
    expect(xdotNum(2.5)).toBe('2.5');
  });
});

describe('utf8Len', () => {
  it('counts a surrogate-pair character as 4 UTF-8 bytes', () => {
    // L160: c >= 0xd800 && c <= 0xdbff branch (emoji outside the BMP).
    expect(utf8Len('\u{1F600}')).toBe(4); // 😀
  });

  it('counts a 3-byte BMP character (e.g. €) correctly', () => {
    // L161: else n += 3 branch.
    expect(utf8Len('€')).toBe(3); // €
  });

  it('counts ASCII (1 byte) and Latin-1 supplement (2 bytes)', () => {
    expect(utf8Len('a')).toBe(1);
    expect(utf8Len('ÿ')).toBe(2); // ÿ
  });
});

describe('gvColorRgba', () => {
  it('maps a "none" color to transparent-black sentinel bytes', () => {
    // L181: c.type === 'none' branch.
    expect(gvColorRgba({ type: 'none' })).toEqual([0xff, 0xff, 0xfe, 0x00]);
  });

  it('resolves an rgba color directly', () => {
    expect(gvColorRgba({ type: 'rgba', r: 1, g: 0, b: 0, a: 1 })).toEqual([255, 0, 0, 255]);
  });

  it('routes a non-string color (hsva) through colorxlate with an empty string', () => {
    // L183: cond-expr false branch — c.type !== 'string' passes '' to colorxlate,
    // which fails to parse and falls back to opaque black.
    expect(gvColorRgba({ type: 'hsva', h: 0, s: 0, v: 0, a: 1 })).toEqual([0, 0, 0, 255]);
  });

  it('resolves a named string color via colorxlate', () => {
    expect(gvColorRgba({ type: 'string', s: 'red' })).toEqual([255, 0, 0, 255]);
  });
});

describe('radialGradientOp angle branch', () => {
  const pts = [{ x: 0, y: 0 }, { x: 54, y: -36 }];
  const fill: Parameters<typeof radialGradientOp>[1] = { type: 'string', s: 'red' };
  const stop: Parameters<typeof radialGradientOp>[2] = { type: 'string', s: 'blue' };

  it('uses the plain center when angleDeg is 0', () => {
    // L262/L263: angleDeg === 0 true branch.
    const op = radialGradientOp(pts, fill, stop, 0, 0);
    expect(op.startsWith('C ')).toBe(true);
    expect(op).toContain('(');
  });

  it('offsets c1 by r1 along the angle when angleDeg is non-zero', () => {
    // L262/L263: angleDeg === 0 false branch.
    const op0 = radialGradientOp(pts, fill, stop, 0, 0);
    const op90 = radialGradientOp(pts, fill, stop, 0, 90);
    expect(op90).not.toBe(op0);
  });
});

describe('xdotFont non-positive size', () => {
  it('clamps a non-positive size to 0', () => {
    // L287: size > 0 ? size : 0 — false branch.
    expect(xdotFont(0, 'Times')).toBe('F 0 5 -Times ');
    expect(xdotFont(-3, 'Times')).toBe('F 0 5 -Times ');
  });

  it('keeps a positive size', () => {
    expect(xdotFont(14, 'Times')).toBe('F 14 5 -Times ');
  });
});

describe('gfmt5 — %.5g formatting', () => {
  it('returns "NaN"/"Infinity" for non-finite input', () => {
    // L341: !Number.isFinite(v) branch.
    expect(gfmt5(NaN)).toBe('NaN');
    expect(gfmt5(Infinity)).toBe('Infinity');
  });

  it('switches to scientific notation with a "+" exponent for a large magnitude', () => {
    // L345: e >= 0 branch true. L347: mant has a "." to trim (idx0).
    // L349 idx1: (ei < 0 ? '-' : '+') — the '+' branch.
    expect(gfmt5(2219962)).toBe('2.22e+06');
  });

  it('switches to scientific notation with a "-" exponent for a tiny magnitude', () => {
    // L349 idx0: (ei < 0 ? '-' : '+') — the '-' branch.
    expect(gfmt5(0.0000001)).toBe('1e-07');
  });

  it('trims trailing zeros in scientific-notation mantissa', () => {
    expect(gfmt5(1.5e21)).not.toContain('.00');
  });

  it('trims trailing zeros in fixed notation', () => {
    expect(gfmt5(1.5)).toBe('1.5');
  });
});

describe('gfmt2 — %.2f formatting (sanity)', () => {
  it('formats with 2 fixed decimals', () => {
    expect(gfmt2(1)).toBe('1.00');
  });
});

describe('isEscapeSeq', () => {
  it('returns false when the char at i is not a backslash', () => {
    expect(isEscapeSeq('abc', 0)).toBe(false);
  });

  it.each(['E', 'G', 'H', 'L', 'N', 'T', 'l', 'n', 'r', '\\', '"'])(
    'recognizes \\%s as an escape sequence',
    (letter) => {
      expect(isEscapeSeq('\\' + letter, 0)).toBe(true);
    },
  );

  it('returns false for an unrecognized escape letter', () => {
    expect(isEscapeSeq('\\x', 0)).toBe(false);
  });
});

describe('agcanonEscape', () => {
  it('escapes a bare quote not part of an existing escape', () => {
    expect(agcanonEscape('a"b')).toBe('a\\"b');
  });

  it('passes through an existing escape sequence verbatim, resetting after', () => {
    // L414 (isEscapeSeq true) then L417 (partOfEscape reset false) on the
    // character following the escape letter.
    expect(agcanonEscape('a\\nb')).toBe('a\\nb');
  });
});

describe('trimFixed3', () => {
  it('returns the string unchanged when toFixed(3) has no decimal point', () => {
    // L427: exponential notation for a huge magnitude has no '.'.
    expect(trimFixed3(1e21)).toBe('1e+21');
  });

  it('trims trailing zeros for a normal value (no leading-zero collapse)', () => {
    expect(trimFixed3(0.5)).toBe('0.5');
  });
});
