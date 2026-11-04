// SPDX-License-Identifier: EPL-2.0
//
// circo root lookup (find_blocks) against the T0 native fixtures in
// __fixtures__/root/ (graphviz 16.1.0, -Kcirco -Txdot). The xdot is held to 0.01.
// @see lib/circogen/blocktree.c:find_blocks
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';

const DIR = new URL('./__fixtures__/root/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const EXPECTED_CASES = 13;
const read = (name: string): string => readFileSync(new URL(name, DIR), 'utf8');

const CASES: readonly string[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.gv'))
  .map((f) => f.slice(0, -'.gv'.length))
  .sort();

afterEach(() => { vi.restoreAllMocks(); });

describe('circo root lookup against native', () => {
  it('covers all T0 cases', () => {
    expect(CASES).toHaveLength(EXPECTED_CASES);
  });

  it.each(CASES)('%s: xdot and stderr match native', (id) => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
    const out = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'circo' }));
    expect(lines.map((l) => `${l}\n`).join('')).toBe(read(`${id}.xdot.stderr`));
    expect(compareXdot(out, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  }, 60_000);

  it('a graph root in another component does not throw', () => {
    const out = String(render(parse('graph G {root=a; a--b--c; d--e--f}'), 'xdot', { engine: 'circo' }));
    expect(out.startsWith('graph G {')).toBe(true);
  });
});
