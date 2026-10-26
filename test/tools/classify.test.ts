// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  CLASS_DUP_BASELINE_SHIFT,
  classes,
  classifyLine,
  parseFuzzRow,
  tallyRows,
  unmatchedLines,
  type FuzzRow,
} from './lib/classify.js';

const row = (p: Partial<FuzzRow>): FuzzRow => ({ lbl: 'x', svgOk: true, nErr: [], pErr: [], ...p });
const DUP = '<svg><text baseline-shift="super" baseline-shift="sub">a</text></svg>';

describe('classes: SVG mismatch', () => {
  it('assigns dup-baseline-shift when native repeats the attribute (item 65)', () => {
    expect(classes(row({ svgOk: false, lbl: '<sup>a<sub>b</sub></sup>', nSvg: DUP }))).toEqual([CLASS_DUP_BASELINE_SHIFT]);
  });
  it('dup-baseline-shift wins over the br-in-style heuristic', () => {
    expect(classes(row({ svgOk: false, lbl: '<b>a<br/></b>', nSvg: DUP }))).toEqual([CLASS_DUP_BASELINE_SHIFT]);
  });
  it('keeps the compare-throw class alongside', () => {
    expect(classes(row({ svgOk: false, nSvg: DUP, pErr: ['COMPARE THREW x'] }))).toEqual(['compare-throw', CLASS_DUP_BASELINE_SHIFT]);
  });
  it('falls back to 35 and svg-other without a duplicate', () => {
    expect(classes(row({ svgOk: false, lbl: '<b>a<br/></b>', nSvg: '<svg/>' }))).toEqual(['svg(35-br-in-style?)']);
    expect(classes(row({ svgOk: false }))).toEqual(['svg-other']);
  });
  it('no class for a passing row', () => {
    expect(classes(row({}))).toEqual([]);
  });
});

describe('stderr classes', () => {
  it.each([
    ['COMPARE THREW q', 'compare-throw'],
    ['Warning: x is not a known color', '37-unknown-color'],
    ['no value for width', '41-width'],
    ['not well-formed (invalid token)', '40-invalid-token'],
    ['bad sides é', 'A5-sides-nonascii'],
    ['something else entirely', 'stderr:something else entirely'],
  ])('%s -> %s', (line, cls) => {
    expect(classifyLine(line)).toBe(cls);
  });
  it('unmatchedLines is a multiset difference in both directions', () => {
    expect(unmatchedLines(['a', 'a', 'b'], ['a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('tallyRows / parseFuzzRow', () => {
  it('tallies classes over JSONL', () => {
    const jsonl = [row({ svgOk: false }), row({ svgOk: false, nSvg: DUP })].map((r) => JSON.stringify(r)).join('\n') + '\n';
    expect(tallyRows(jsonl)).toEqual({ bad: 2, classes: { 'svg-other': 1, [CLASS_DUP_BASELINE_SHIFT]: 1 } });
  });
  it('rejects a malformed row', () => {
    expect(() => parseFuzzRow('{"lbl":1}')).toThrow(/not a fuzz row/);
    expect(() => parseFuzzRow('null')).toThrow(/not a fuzz row/);
  });
});
