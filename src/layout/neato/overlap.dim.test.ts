// SPDX-License-Identifier: EPL-2.0
//
// `overlap` removal under `dim`/`dimen`=3 against native graphviz 16.1.0: every
// coordinate, z included, matches the committed fixtures (part-10 AD-3).
// @see lib/neatogen/adjust.c:getSizes, fdpAdjust, vpscAdjust, removeOverlapWith
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';

const FIXTURES = new URL('./__fixtures__/dim/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const CASES = ['overlap-false-dim3', 'overlap-scale-dim3', 'overlap-vpsc-dim3'] as const;
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

function nodePos(text: string): string[] {
  return [...text.matchAll(/\bpos="([^"]+)",\s*\n?\s*(?:width|z)/g)].map((m) => m[1]!);
}

describe('overlap under dim=3 matches native', () => {
  it.each(CASES)('%s xdot', (id) => {
    const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'neato' }));
    expect(compareXdot(xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  });
  it.each(CASES)('%s keeps native z in dot pos', (id) => {
    const dot = String(render(parse(read(`${id}.gv`)), 'dot', { engine: 'neato' }));
    const zs = (t: string): number[] => nodePos(t).map((p) => Number(p.split(',')[2]));
    const want = zs(read(`${id}.dot`));
    expect(want.length).toBe(6);
    zs(dot).forEach((z, i) => expect(Math.abs(z - want[i]!)).toBeLessThanOrEqual(POSITION_TOLERANCE));
  });
});
