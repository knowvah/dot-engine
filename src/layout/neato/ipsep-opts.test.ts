// SPDX-License-Identifier: EPL-2.0
//
// neatoinit.c's ipsep option block (1121-1170) and cluster_map (198-245),
// against values worked by hand from the C.
// @see lib/neatogen/neatoinit.c:majorization
// @see lib/neatogen/neatoinit.c:cluster_map
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import { AM_IPSEP, AM_NONE, AM_VPSC, getAdjustMode, type AdjustData } from './fdp-adjust.js';
import { clusterMap, ipsepOptions } from './ipsep-opts.js';

const NONE: AdjustData = { mode: AM_NONE, print: 'none', value: 0 };

/** The graph's nodes in creation (`ND_id`) order, sized as `neato_init_node` would. */
function nodesOf(g: Graph): Node[] {
  const nodes = [...g.nodes.values()];
  nodes.forEach((n, i) => { n.info.width = 0.75 + i; n.info.height = 0.5 + i / 4; });
  return nodes;
}

function optsOf(src: string, am: AdjustData = NONE): ReturnType<typeof ipsepOptions> {
  const g = parse(src);
  return ipsepOptions(g, g, nodesOf(g), am);
}

describe('ipsepOptions: diredges (mapbool, then strncasecmp "hier")', () => {
  it.each([
    ['Hierarchy', 2], ['hier', 2], ['HIERx', 2], ['true', 1], ['yes', 1], ['1', 1],
    ['no', 0], ['false', 0], ['0', 0], ['hie', 0], ['other', 0],
  ] as const)('diredgeconstraints=%s -> %i', (value, expected) => {
    expect(optsOf(`digraph{diredgeconstraints="${value}"; a->b}`).diredges).toBe(expected);
  });

  it('is 0 when the attribute is absent', () => {
    expect(optsOf('digraph{a->b}').diredges).toBe(0);
  });
});

describe('ipsepOptions: noverlap from am->mode', () => {
  it.each([
    [AM_IPSEP, 1], [AM_VPSC, 2], [AM_NONE, 0],
  ] as const)('mode %i -> %i', (mode, expected) => {
    expect(optsOf('graph{a--b}', { mode, print: '', value: 0 }).noverlap).toBe(expected);
  });

  it('takes the mode getAdjustMode parses from overlap', () => {
    expect(optsOf('graph{a--b}', getAdjustMode('ipsep')).noverlap).toBe(1);
    expect(optsOf('graph{a--b}', getAdjustMode('vpsc')).noverlap).toBe(2);
  });
});

describe('ipsepOptions: gap = 2*PS2INCH(sepFactor)', () => {
  it('defaults to the +4pt additive margin: 8/72', () => {
    expect(optsOf('graph{a--b}').gap).toEqual({ x: 8 / 72, y: 8 / 72 });
  });

  it('uses an additive sep: +12 -> 24/72, +6,9 -> 12/72, 18/72', () => {
    expect(optsOf('graph{sep="+12"; a--b}').gap).toEqual({ x: 24 / 72, y: 24 / 72 });
    expect(optsOf('graph{sep="+6,9"; a--b}').gap).toEqual({ x: 12 / 72, y: 18 / 72 });
  });

  it('falls back to 2*PS2INCH(DFLT_MARGIN) for a scaling sep', () => {
    expect(optsOf('graph{sep="0.5"; a--b}').gap).toEqual({ x: 8 / 72, y: 8 / 72 });
  });

  it('divides by 72 rather than multiplying by 1/72 (C PS2INCH)', () => {
    expect(optsOf('graph{sep="+5"; a--b}').gap.x).toBe(2.0 * (5 / 72));
  });
});

describe('ipsepOptions: edge_gap = late_double(levelsgap, 0.0, -DBL_MAX)', () => {
  it.each([
    ['', 0], ['levelsgap=0.5;', 0.5], ['levelsgap=-3;', -3], ['levelsgap=abc;', 0],
  ] as const)('%s -> %d', (attr, expected) => {
    expect(optsOf(`digraph{${attr} a->b}`).edgeGap).toBe(expected);
  });
});

describe('ipsepOptions: nsize from ND_width / ND_height', () => {
  it('lists each node in ND_id order', () => {
    expect(optsOf('graph{a--b; c}').nsize).toEqual([
      { x: 0.75, y: 0.5 }, { x: 1.75, y: 0.75 }, { x: 2.75, y: 1 },
    ]);
  });
});

describe('clusterMap', () => {
  it('has no clusters without cluster subgraphs', () => {
    const g = parse('graph{subgraph s{a; b} a--c}');
    const cd = clusterMap(g, g, nodesOf(g));
    expect(cd.nclusters).toBe(0);
    expect(cd.nvars).toBe(0);
    expect(cd.ntoplevel).toBe(3);
    expect(Array.from(cd.toplevel)).toEqual([0, 1, 2]);
    expect(cd.bb).toEqual([]);
  });

  it('maps top-level clusters in subgraph order, members in AGSEQ order', () => {
    const g = parse('graph{x; b; subgraph cluster_1{b; a; x} c; subgraph cluster_0{c; d}}');
    const cd = clusterMap(g, g, nodesOf(g));
    expect(cd.nclusters).toBe(2);
    expect(Array.from(cd.clustersizes)).toEqual([3, 2]);
    expect(cd.clusters.map((c) => Array.from(c))).toEqual([[0, 1, 2], [3, 4]]);
    expect(cd.nvars).toBe(5);
    expect(cd.ntoplevel).toBe(0);
    expect(Array.from(cd.toplevel)).toEqual([]);
    expect(cd.bb).toEqual([
      { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } }, { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } },
    ]);
  });

  it('counts cluster=true subgraphs and leaves nested clusters to their parent', () => {
    const g = parse('graph{a; subgraph s{cluster=true; b; subgraph cluster_in{c}} d}');
    const cd = clusterMap(g, g, nodesOf(g));
    expect(cd.nclusters).toBe(1);
    expect(cd.clusters.map((c) => Array.from(c))).toEqual([[1, 2]]);
    expect(cd.ntoplevel).toBe(2);
    expect(Array.from(cd.toplevel)).toEqual([0, 3]);
  });

  it('is what ipsepOptions stores in opt.clusters', () => {
    const opt = optsOf('graph{subgraph cluster_0{a; b} c}');
    expect(opt.clusters.clusters.map((c) => Array.from(c))).toEqual([[0, 1]]);
    expect(Array.from(opt.clusters.toplevel)).toEqual([2]);
  });
});
