// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  closeValue,
  extractNodeShapes,
  extractTextSpans,
  hasDuplicateBaselineShift,
  nodeShapesMatch,
  textSpansMatch,
} from './lib/svg-extract.js';

const node = (shape: string, text: string): string =>
  `<g id="node1" class="node"><title>a</title>${shape}${text}</g>`;
const ELL = (rx: string, ry: string): string => `<ellipse fill="none" cx="27" cy="-18" rx="${rx}" ry="${ry}"/>`;
const TXT = (x: string, y: string, t: string): string => `<text text-anchor="middle" x="${x}" y="${y}" font-size="14.00">${t}</text>`;

describe('extractTextSpans', () => {
  it('returns content with x and y', () => {
    expect(extractTextSpans(node(ELL('27', '18'), TXT('27', '-14.3', 'a')))).toEqual([{ text: 'a', x: '27', y: '-14.3' }]);
  });
  it('does not mistake text-anchor or font-size for x', () => {
    expect(extractTextSpans('<text text-anchor="start" font-size="1">q</text>')).toEqual([{ text: 'q', x: null, y: null }]);
  });
});

describe('extractNodeShapes', () => {
  it('reads ellipse cx with rx/ry', () => {
    expect(extractNodeShapes(node(ELL('27', '18'), ''))).toEqual([{ key: '27', rx: '27', ry: '18' }]);
  });
  it('reads polygon points', () => {
    const poly = '<polygon points="0,0 1,1" fill="none"/>';
    expect(extractNodeShapes(node(poly, ''))).toEqual([{ key: '0,0 1,1', rx: null, ry: null }]);
  });
});

describe('closeValue', () => {
  it('accepts numeric differences within tolerance', () => {
    expect(closeValue('1.000', '1.009', 0.01)).toBe(true);
    expect(closeValue('1', '1.02', 0.01)).toBe(false);
  });
  it('treats absent and present as different, non-numbers as strings', () => {
    expect(closeValue(null, '1', 0.01)).toBe(false);
    expect(closeValue(null, null, 0.01)).toBe(true);
    expect(closeValue('a', 'b', 0.01)).toBe(false);
    expect(closeValue('', '0', 0.01)).toBe(false);
  });
});

describe('textSpansMatch (item 66: x/y compared)', () => {
  const a = extractTextSpans(node(ELL('27', '18'), TXT('27', '-14.30', 'k')));
  it('differs on y beyond tolerance although the text is equal', () => {
    const b = extractTextSpans(node(ELL('27', '18'), TXT('27', '-21.06', 'k')));
    expect(textSpansMatch(a, b)).toBe(false);
  });
  it('differs on x', () => {
    expect(textSpansMatch(a, extractTextSpans(node(ELL('27', '18'), TXT('30', '-14.30', 'k'))))).toBe(false);
  });
  it('matches within 0.01', () => {
    expect(textSpansMatch(a, extractTextSpans(node(ELL('27', '18'), TXT('27.005', '-14.305', 'k'))))).toBe(true);
  });
  it('differs on text or count', () => {
    expect(textSpansMatch(a, [])).toBe(false);
    expect(textSpansMatch(a, extractTextSpans(node(ELL('27', '18'), TXT('27', '-14.30', 'j'))))).toBe(false);
  });
});

describe('nodeShapesMatch (item 66: rx/ry compared)', () => {
  const a = extractNodeShapes(node(ELL('27', '18'), ''));
  it('differs on ry', () => {
    expect(nodeShapesMatch(a, extractNodeShapes(node(ELL('27', '25.9'), '')))).toBe(false);
  });
  it('differs on rx and matches within tolerance', () => {
    expect(nodeShapesMatch(a, extractNodeShapes(node(ELL('30', '18'), '')))).toBe(false);
    expect(nodeShapesMatch(a, extractNodeShapes(node(ELL('27.004', '18.004'), '')))).toBe(true);
  });
  it('differs on key', () => {
    expect(nodeShapesMatch(a, [{ key: '28', rx: '27', ry: '18' }])).toBe(false);
  });
});

describe('hasDuplicateBaselineShift (item 65)', () => {
  it('flags an element with two baseline-shift attributes', () => {
    expect(hasDuplicateBaselineShift('<text baseline-shift="super" x="1" baseline-shift="sub">a</text>')).toBe(true);
  });
  it('does not flag one per element, even across elements', () => {
    expect(hasDuplicateBaselineShift('<text baseline-shift="super">a</text><text baseline-shift="sub">b</text>')).toBe(false);
    expect(hasDuplicateBaselineShift('<svg></svg>')).toBe(false);
  });
});
