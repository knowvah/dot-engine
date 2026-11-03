// SPDX-License-Identifier: EPL-2.0
//
// The replay of a graph's own draw ops against native graphviz 16.1.0, on hand-written
// `_background` values across bgcolor forms. Generated `_draw_` always opens with its own pen and
// fill, so only these reach the state emit_background leaves behind.
// Inputs and refs: plans/post-16-1-followups-9/harness/T10/gen-replay.mjs.
// @see lib/common/emit.c:emit_background
// @see lib/common/emit.c:emit_xdot
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compareXdot, XDOT_TOLERANCE } from '../../test/golden/compare-xdot.js';
import { parse, render } from '../index.js';

interface NativeCase {
  readonly src: string;
  readonly svg: string;
  readonly xdot: string;
  readonly stderr: string;
}

const CASES = JSON.parse(
  readFileSync(new URL('./__fixtures__/replay-native.json', import.meta.url), 'utf8'),
) as Record<string, NativeCase>;

/** The SVG from the first group on: the header legitimately differs. */
const body = (svg: string): string => svg.slice(svg.indexOf('<g id=')).trim();

/** compareXdot's test is strict; a one-printed-unit difference is 0.01 + ~1e-11. */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

/**
 * Cases where native's svg prints `fill=""`: a gradient `bgcolor`, then a filled op with no fill of its own.
 * C frees `clrs[0]` (emit.c:1518) while svg's fill state still points at it, so that is freed memory, not a
 * colour. The port keeps the colour C meant, recorded in docs/known-divergences.md.
 */
const FREED_FILL = ['bare-poly', 'image', 'pen-only', 'style-after', 'label'].flatMap((op) => [
  `${op}.grad`,
  `${op}.radial`,
]);

describe('emit_xdot starts from the state emit_background leaves', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers every op and bgcolor form', () => {
    expect(Object.keys(CASES)).toHaveLength(70);
  });

  it.each(Object.keys(CASES).filter((n) => !FREED_FILL.includes(n)))('%s svg', (name) => {
    const c = CASES[name]!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(body(render(parse(c.src), 'svg'))).toBe(body(c.svg));
    expect(warn.mock.calls.map((a) => a.join(' ')).join('\n')).toBe(c.stderr.trim());
  });

  it.each(FREED_FILL)('%s svg: the colour C meant, where native prints freed memory', (name) => {
    const c = CASES[name]!;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The ref must hold the freed read, or this case proves nothing.
    expect(c.svg).toContain('<polygon fill=""');
    expect(body(render(parse(c.src), 'svg'))).toBe(body(c.svg.replaceAll('<polygon fill=""', '<polygon fill="red"')));
  });

  it.each(Object.keys(CASES))('%s xdot', (name) => {
    const c = CASES[name]!;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = compareXdot(render(parse(c.src), 'xdot'), c.xdot, POSITION_TOLERANCE);
    expect(r.diffs).toEqual([]);
  });
});
