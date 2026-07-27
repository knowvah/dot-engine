// SPDX-License-Identifier: EPL-2.0
//
// The graph `phase` attribute — how many dot pipeline phases run.
//
// Found by the corpus attribute blind-spot scan (test/corpus/attr-frequency.ts):
// no corpus graph declares this attribute, so no parity track could see that
// the port was reading the WRONG NAME. `maxphase` is only the name of C's local
// variable; the attribute C looks up is `phase`.
//
// Value handling is late_int(g, sym, -1, 1), whose two failure exits return the
// default UNCLAMPED while a parsed value is clamped up to the minimum. That
// asymmetry is the whole reason `phase=abc` draws edges and `phase=0` does not.
//
// @see lib/dotgen/dotinit.c:297 dotLayout · lib/common/utils.c:40 late_int

import { describe, it, expect } from 'vitest';
import { parse } from '../../index.js';
import { renderSvg } from '../../index.js';

const GRAPH = 'a -> b -> c; a -> c; b -> d;';

/** Number of edge splines drawn — 0 when dot_splines never ran. */
function edgeCount(attr: string): number {
  const src = `digraph G { ${attr} ${GRAPH} }`;
  return (renderSvg(src, 'dot').match(/<path/g) ?? []).length;
}

describe('graph `phase` attribute', () => {
  it('draws every edge when absent', () => {
    expect(edgeCount('')).toBe(4);
  });

  it('stops before dot_splines for phases 1-3, so no edge is drawn', () => {
    expect(edgeCount('phase=1;')).toBe(0);
    expect(edgeCount('phase=2;')).toBe(0);
    expect(edgeCount('phase=3;')).toBe(0);
  });

  it('runs the whole pipeline for a phase past the last one', () => {
    expect(edgeCount('phase=99;')).toBe(4);
  });

  it('clamps a parsed value below the minimum up to 1', () => {
    // late_int: `if (rv < minimum) return minimum` — so these behave as phase=1.
    expect(edgeCount('phase=0;')).toBe(0);
    expect(edgeCount('phase="-5";')).toBe(0);
  });

  it('falls back to the UNCLAMPED default when the value does not parse', () => {
    // late_int returns defaultValue (-1) before reaching the clamp, so an
    // unparseable value runs everything rather than collapsing to phase=1.
    expect(edgeCount('phase=abc;')).toBe(4);
    expect(edgeCount('phase="";')).toBe(4);
  });

  it('parses a numeric prefix, as strtol does', () => {
    expect(edgeCount('phase="3abc";')).toBe(0);
  });

  it('ignores `maxphase`, which is a C local and not an attribute', () => {
    expect(edgeCount('maxphase=1;')).toBe(4);
  });

  it('still runs the postprocess translate on a phase stop', () => {
    // C's phase stop returns 0, and dot_layout skips dotneato_postprocess only
    // on an ERROR return, so the drawing is still translated to the origin.
    // Without it the graph keeps raw layout coordinates.
    const svg = renderSvg(`digraph G { phase=3; ${GRAPH} }`, 'dot');
    const bg = /points="([-\d.,\s]+)"/.exec(svg);
    expect(bg).not.toBeNull();
    expect(bg![1]!.startsWith('-4,4')).toBe(true);
  });

  it('leaves the parsed attribute on the graph', () => {
    expect(parse('digraph G { phase=3; a->b; }').attrs.get('phase')).toBe('3');
  });
});
