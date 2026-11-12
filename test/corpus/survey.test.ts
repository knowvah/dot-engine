// SPDX-License-Identifier: EPL-2.0
//
// Unit tests for the survey harness oracle-usability guard (mission fix-1472).
//
// `isWellFormedSvg` decides whether a native-oracle SVG is parseable by the same
// normalizer `compareSvg` uses. A non-well-formed oracle (e.g. tests/1472.dot,
// where native dot leaks invalid UTF-8 into its output) must classify as
// `oracle-error`, NOT as a port `diverged` — the port render is fine; the oracle
// is the unusable side. See plans/fix-1472-oracle-classification/decisions.md AD-1.

import { describe, it, expect } from 'vitest';
import { isWellFormedSvg, diffVerdict, PORT_HEAP_MB, portEnv } from './survey.js';

/** Minimal well-formed SVG wrapper with a single <g> of children. */
function svg(children: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"><g>${children}</g></svg>`;
}
const ell = (cx: number, cy: number): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="5" ry="5"/>`;

// maxDeltaPath is the location signal the structural-match dashboard bucket
// clusters on; diffVerdict records the path of the WORST numeric diff (T1).
describe('diffVerdict maxDeltaPath', () => {
  it('records the path of the worst numeric diff on a structural-match', () => {
    // ellipse[1] cx Δ2, ellipse[2] cx Δ50 — the worst is ellipse[2]/@cx.
    const port = svg(ell(10, 20) + ell(100, 200));
    const oracle = svg(ell(12, 20) + ell(150, 200));
    const r = diffVerdict(port, oracle);
    expect(r.verdict).toBe('structural-match');
    expect(r.maxDelta).toBeCloseTo(50, 5);
    expect(r.maxDeltaPath).toBeDefined();
    expect(r.maxDeltaPath).toContain('ellipse[2]');
    expect(r.maxDeltaPath).toContain('@cx');
  });

  it('breaks ties by first-encountered (document order) diff', () => {
    // Both ellipses differ in cx by exactly 5 — the FIRST (ellipse[1]) wins.
    const port = svg(ell(10, 20) + ell(10, 20));
    const oracle = svg(ell(15, 20) + ell(15, 20));
    const r = diffVerdict(port, oracle);
    expect(r.verdict).toBe('structural-match');
    expect(r.maxDelta).toBeCloseTo(5, 5);
    expect(r.maxDeltaPath).toContain('ellipse[1]');
    expect(r.maxDeltaPath).not.toContain('ellipse[2]');
  });

  it('leaves maxDeltaPath undefined for a conformant pair', () => {
    const same = svg(ell(10, 20));
    const r = diffVerdict(same, same);
    expect(r.verdict).toBe('conformant');
    expect(r.maxDeltaPath).toBeUndefined();
  });
});

describe('isWellFormedSvg', () => {
  it('returns true for a minimal well-formed SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>';
    expect(isWellFormedSvg(svg)).toBe(true);
  });

  it('returns false for an unbalanced/malformed SVG (svg != g mismatch)', () => {
    // The 1472 signature: native dot emits an opening <g> closed by </svg>.
    expect(isWellFormedSvg('<svg><g></svg>')).toBe(false);
  });

  it('returns false for an empty string (no root element)', () => {
    expect(isWellFormedSvg('')).toBe(false);
  });
});

// Per-id heap cap (issue #145): one id's port render needs more than V8's
// default heap because native itself peaks above it; every other id must keep
// the default so a real heap regression still fails.
describe('portEnv — per-id heap cap for the port render', () => {
  const HEAP_FLAG = '--max-old-space-size';

  it('caps exactly one id, 2475_1, with a whole number of GB', () => {
    expect(Object.keys(PORT_HEAP_MB)).toEqual(['2475_1']);
    expect(PORT_HEAP_MB['2475_1']).toBeGreaterThan(8410);
    expect(PORT_HEAP_MB['2475_1']).toBeLessThanOrEqual(48 * 1024);
    expect(PORT_HEAP_MB['2475_1'] % 1024).toBe(0);
  });

  it('gives a capped id NODE_OPTIONS with its heap size', () => {
    const env = portEnv('2475_1', { PATH: '/bin' });
    expect(env).toEqual({ PATH: '/bin', NODE_OPTIONS: `${HEAP_FLAG}=${PORT_HEAP_MB['2475_1']}` });
  });

  it('keeps existing NODE_OPTIONS and appends the heap size after them', () => {
    const env = portEnv('2475_1', { NODE_OPTIONS: '--stack-size=65500' });
    expect(env.NODE_OPTIONS).toBe(`--stack-size=65500 ${HEAP_FLAG}=${PORT_HEAP_MB['2475_1']}`);
  });

  it('returns the input env itself for any other id', () => {
    const input = { PATH: '/bin', NODE_OPTIONS: '--stack-size=65500' };
    expect(portEnv('2108', input)).toBe(input);
    expect(portEnv('2475', input)).toBe(input);
    expect(portEnv('toString', input)).toBe(input);
  });

  it('does not mutate the input env', () => {
    const input = { PATH: '/bin', NODE_OPTIONS: '--stack-size=65500' };
    portEnv('2475_1', input);
    expect(input).toEqual({ PATH: '/bin', NODE_OPTIONS: '--stack-size=65500' });
  });
});
