// SPDX-License-Identifier: EPL-2.0

/**
 * Golden inputs for init_xdot's replay of a graph's `_background` and `_draw_`
 * (122). No corpus input carries either attribute, so the survey and bytediff
 * never reach the replay. The inputs are hand-written: generated `_draw_`
 * opens with its own pen and fill and can never observe the state
 * emit_background leaves behind. Refs are native graphviz 16.1.0 captures
 * (`refs/draw-replay-*.svg`, `refs-xdot/draw-replay-*.xdot`).
 *
 * `draw-replay-both` holds both attributes: init_xdot reads `_background` first
 * and ignores `_draw_` when it is non-empty, so the ref replays `_background` only.
 * `draw-replay-a13` is known divergence A13: after a gradient `bgcolor` native
 * prints freed memory (`fill=""`) for the first op that has no fill of its own.
 * `draw-replay-style-order` walks gvrender_set_style's accumulation (follow-up 125).
 * Text ops (`T`) have no ref: native segfaults, because xdotBB (neatoinit.c, `-n` only)
 * is the sole place that builds an op's text span; one test pins the port's output.
 *
 * @see lib/common/emit.c:init_xdot
 * @see lib/common/emit.c:emit_background
 * @see lib/common/emit.c:emit_xdot
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, render, renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';
import { compareXdot } from './compare-xdot.js';

const read = (p: string): string => readFileSync(new URL(p, import.meta.url), 'utf8');
const input = (id: string): string => read(`./inputs/${id}.dot`);
const svgRef = (id: string): string => read(`./refs/${id}.svg`);
const xdotRef = (id: string): string => read(`./refs-xdot/${id}.xdot`);

/** Native prints `fill=""` here (A13); the port prints the gradient's first stop. */
const FREED_FILL = '<polygon fill=""';
const MEANT_FILL = '<polygon fill="red"';

const EXACT_CASES = ['draw-replay-background', 'draw-replay-graph-draw', 'draw-replay-both', 'draw-replay-style-order'];
const A13_CASE = 'draw-replay-a13';

describe('init_xdot replay golden inputs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(EXACT_CASES)('%s svg matches native', (id) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { pass, diffs } = compareSvg(renderSvg(input(id), 'dot'), svgRef(id), 'deterministic');
    expect(diffs.slice(0, 4)).toEqual([]);
    expect(pass).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([...EXACT_CASES, A13_CASE])('%s xdot matches native', (id) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(compareXdot(render(parse(input(id)), 'xdot'), xdotRef(id)).diffs).toEqual([]);
  });

  it('a13 svg: the colour C meant, where native prints freed memory', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ref = svgRef(A13_CASE);
    // The ref must hold the freed read, or this case proves nothing.
    expect(ref).toContain(FREED_FILL);
    const { pass, diffs } = compareSvg(
      renderSvg(input(A13_CASE), 'dot'),
      ref.replaceAll(FREED_FILL, MEANT_FILL),
      'deterministic',
    );
    expect(diffs.slice(0, 4)).toEqual([]);
    expect(pass).toBe(true);
  });

  it('style ops change only the field a token names', () => {
    const svg = renderSvg(input('draw-replay-style-order'), 'dot');
    expect(svg).toContain('stroke-width="2" stroke-dasharray="5,2" points="0,-10 10,-20"');
    expect(svg).toContain('stroke="#0000ff" stroke-width="2" points="0,-20 10,-30"');
    expect(svg).toContain('stroke-width="3" stroke-dasharray="1,5" points="0,-40 10,-50"');
    // The invis pen draws nothing, and the next op's `dashed` keeps the width.
    expect(svg).not.toContain('points="0,-70 10,-80"');
    expect(svg).toContain('stroke-width="4" stroke-dasharray="5,2" points="0,-80 10,-90"');
    // Within one op, tokens apply in order: `bold` after `setlinewidth(3)` wins.
    expect(svg).toContain('stroke-width="2" stroke-dasharray="5,2" points="0,-90 10,-100"');
    expect(svg).toContain('stroke-width="5" stroke-dasharray="1,5" points="0,-100 10,-110"');
  });

  // Native segfaults (rc 139) on a `T` op in `_draw_`: op->span is NULL outside neato -n, so no ref exists.
  // This pins the port's current output: the op draws nothing and warns of nothing.
  it('a `T` op in a graph _draw_ draws no text (native segfaults)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const svg = renderSvg('digraph G { _draw_="c 7 -#00aa00 T 25 25 0 20 3 -run "; a }', 'dot');
    expect(svg).not.toContain('>run<');
    expect(svg.match(/<text /g)).toHaveLength(1);
    expect(svg).toContain('>a</text>');
    expect(warn).not.toHaveBeenCalled();
  });

  it('both: `_background` wins over `_draw_`', () => {
    const svg = renderSvg(input('draw-replay-both'), 'dot');
    expect(svg).toContain('stroke-dasharray="1,5" points="0,0 70,-70"');
    expect(svg).not.toContain('points="5,-5');
  });
});
