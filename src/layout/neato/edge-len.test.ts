// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../../index.js';
import { lenattr, setEdgeLen } from './edge-len.js';
import { makeGraphDataC } from './make-graph-data.js';
import { assignNodeIds } from './init.js';

afterEach(() => vi.restoreAllMocks());

function distsOf(src: string): { dists: number[]; warns: string[]; total: number } {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const g = parse(src);
  const total = setEdgeLen(g);
  return { dists: g.edges.map((e) => e.info.dist!), warns: warn.mock.calls.map((c) => String(c[0])), total };
}

describe('setEdgeLen / lenattr (stuff.c)', () => {
  it('warns once with the anonymous root name and falls back to 1.0 for non-numeric len', () => {
    const r = distsOf('graph{a--b[len=x]}');
    expect(r.dists).toEqual([1]);
    expect(r.warns).toEqual(['Warning: bad edge len "x" in %1 - setting to 1.00']);
  });

  it.each(['-2', '0', ' -0.5'])('rejects len=%s', (v) => {
    const r = distsOf(`graph{a--b[len="${v}"]}`);
    expect(r.dists).toEqual([1]);
    expect(r.warns).toHaveLength(1);
  });

  it('accepts a sscanf %lf prefix, hex, inf, nan without warning', () => {
    const r = distsOf('graph{a--b[len="2.5abc"]; b--c[len="0x10"]; c--d[len="inf"]; d--e[len="NaN"]}');
    expect(r.dists.slice(0, 3)).toEqual([2.5, 16, Infinity]);
    expect(r.dists[3]).toBeNaN();
    expect(r.warns).toEqual([]);
  });

  it('defaults an absent or empty len to 1.0 silently and totals in node order', () => {
    const r = distsOf('graph{a--b; b--c[len=""]; c--d[len=3]}');
    expect(r.dists).toEqual([1, 1, 3]);
    expect(r.total).toBe(5);
    expect(r.warns).toEqual([]);
  });

  it('warns in node order, each node visiting its out-edges', () => {
    const r = distsOf('graph{a--b[len=p]; c--d[len=q]; a--c[len=r]}');
    expect(r.warns.map((w) => /"(.)"/.exec(w)![1])).toEqual(['p', 'r', 'q']);
  });

  it('lenattr on an edge without the attribute returns the default', () => {
    const g = parse('graph{a--b}');
    expect(lenattr(g.edges[0]!, g)).toBe(1);
  });
});

describe('makeGraphDataC reads ED_dist', () => {
  it('uses the sanitised distance, not the raw attribute', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse('graph{a--b[len=-2]; b--c[len=4]}');
    const nodes = assignNodeIds(g);
    setEdgeLen(g);
    const v = makeGraphDataC(g, nodes, true, false);
    expect(v.map((r) => r.ewgts)).toEqual([[0, 1], [0, 4, 1], [0, 4]]);
  });
});
