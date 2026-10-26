// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { compareProbe, formatVerdict } from './lib/probe-compare.js';
import { normalizeStderrLines, stripStdinPrefix } from './lib/stderr.js';

const SVG = '<g id="node1" class="node"><ellipse cx="27" rx="27" ry="18"/><text x="27" y="-14">a</text></g>';

describe('stderr normalisation (AD-10)', () => {
  it('strips only a leading <stdin>: prefix', () => {
    expect(stripStdinPrefix("<stdin>: syntax error in line 1 near '}'")).toBe("syntax error in line 1 near '}'");
    expect(stripStdinPrefix("x <stdin>: y")).toBe('x <stdin>: y');
  });
  it('drops empty lines and strips each line', () => {
    expect(normalizeStderrLines('<stdin>: a\n\nb\n')).toEqual(['a', 'b']);
  });
});

describe('compareProbe', () => {
  it('is SAME when native has <stdin>: and the port does not', () => {
    const v = compareProbe(SVG, SVG, "<stdin>: syntax error in line 1 near '}'\n", "syntax error in line 1 near '}'");
    expect(v).toEqual({ text: true, poly: true, stderr: true, same: true });
  });
  it('is DIFF on stderr when a line differs', () => {
    expect(compareProbe(SVG, SVG, 'Warning: a', 'Warning: b').stderr).toBe(false);
  });
  it('is DIFF on text for a y-only difference (item 35 shape)', () => {
    const moved = SVG.replace('y="-14"', 'y="-20.76"');
    const v = compareProbe(SVG, moved, '', '');
    expect(v).toMatchObject({ text: false, poly: true, stderr: true, same: false });
  });
  it('is DIFF on poly for an ellipse ry-only difference', () => {
    const v = compareProbe(SVG, SVG.replace('ry="18"', 'ry="25"'), '', '');
    expect(v).toMatchObject({ text: true, poly: false, same: false });
  });
});

describe('formatVerdict', () => {
  const v = compareProbe(SVG, SVG, '', '');
  it('keeps the part-3 line format', () => {
    expect(formatVerdict(v, 'digraph{a}')).toBe('SAME text:ok poly:ok stderr:ok | digraph{a}');
  });
  it('truncates labels over 70 chars to 67 + ...', () => {
    expect(formatVerdict(v, 'x'.repeat(100)).endsWith(`| ${'x'.repeat(67)}...`)).toBe(true);
  });
  it('marks failing parts with X', () => {
    expect(formatVerdict(compareProbe(SVG, SVG, 'e', ''), 'c')).toBe('DIFF text:ok poly:ok stderr:X | c');
  });
});
