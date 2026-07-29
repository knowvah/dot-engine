// SPDX-License-Identifier: EPL-2.0

/**
 * T4a — branch-coverage tests for layout/dot/pack-components.ts.
 *
 * Mixed mode (D1): `ratioIsNone` and the `mapClust`/`copyClusterInfo` guard
 * are pure/near-pure data functions, tested directly against hand-built
 * fixtures. The pack-dispatch branches inside `packComponentsClusterAware`
 * (mode dispatch, PK_USER_VALS sortv parsing, the `pts` placer-result guard)
 * and the cluster-inclusive-bbox union are private to the module and only
 * reachable through the exported `layoutAndPack` entry point, so those are
 * driven end-to-end from a real parsed graph (parse + GvcContext), then
 * `layoutAndPack` is called directly with a hand-built `pinfo` to select the
 * specific dispatch arm under test — mirroring exactly what `doDot` does
 * internally (index.ts:274), just with the pack mode pinned per test.
 *
 * @see lib/dotgen/dotinit.c:doDot
 * @see lib/pack/pack.c:putGraphs / packSubgraphs
 *
 * Unreachable-by-design (not exercised here): pack-components.ts:341 `!cb`
 * true arm — `recBb` (position-bbox.ts:90) unconditionally sets every
 * cluster's `info.bb` before `unionWithClusterBBs` can observe it missing.
 * pack-components.ts:357 `if (root.info.bb)` false arm — L390
 * (`root.info.bb = computeSubgraphBB(...)`) runs unconditionally just before
 * `expandRootBbForClusters`, so `root.info.bb` is always defined by then.
 * Both are defensive guards for a state the calling contract cannot produce.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { GvcContext } from '../../gvc/context.js';
import { createMeasurer } from '../../common/textmeasure-factory.js';
import { Graph } from '../../model/graph.js';
import type { Graph as GraphType } from '../../model/graph.js';
import {
  ratioIsNone, cccompsWithClusters, copyClusterInfo, layoutAndPack,
} from './pack-components.js';
import { DOT_LAYOUT_ENGINE } from './index.js';
import { PackMode, PK_USER_VALS } from '../pack/index.js';
import type { PackInfo } from '../pack/index.js';

/** Parse `src` and attach a GvcContext (dotPhaseInit reads `root.info.gvc`
 * for text measurement), exactly as `renderSvg` does before calling `doDot`. */
function makeContextGraph(src: string): GraphType {
  const g = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  if (g.info) g.info.gvc = ctx;
  return g;
}

function basePinfo(mode: PackMode, flags = 0): PackInfo {
  return {
    aspect: 1, sz: 0, margin: 8, doSplines: true, mode, fixed: null, vals: null, flags,
  };
}

// ---------------------------------------------------------------------------
// ratioIsNone  @see lib/common/input.c:576 setRatio
// ---------------------------------------------------------------------------

function graphWithRatio(ratio?: string): GraphType {
  const g = new Graph('g', 'directed');
  if (ratio !== undefined) g.attrs.set('ratio', ratio);
  return g;
}

describe('ratioIsNone', () => {
  it('is true when the ratio attr is absent (L63 !p branch)', () => {
    expect(ratioIsNone(graphWithRatio())).toBe(true);
  });
  it('is true when the ratio attr is the empty string (L63 p==="" branch)', () => {
    expect(ratioIsNone(graphWithRatio(''))).toBe(true);
  });
  it.each(['auto', 'compress', 'expand', 'fill'])(
    'is false for the named ratio kind %s (L64 OR alternatives)',
    (r) => { expect(ratioIsNone(graphWithRatio(r))).toBe(false); },
  );
  it('is false for a positive numeric ratio value (R_VALUE, L65 false)', () => {
    expect(ratioIsNone(graphWithRatio('2.5'))).toBe(false);
  });
  it('is true for a non-positive numeric ratio value (L65 true)', () => {
    expect(ratioIsNone(graphWithRatio('0'))).toBe(true);
    expect(ratioIsNone(graphWithRatio('-1'))).toBe(true);
  });
  it('is true for an unparsable ratio value (NaN, L65 true)', () => {
    expect(ratioIsNone(graphWithRatio('bogus'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mapClust guard via copyClusterInfo  @see lib/pack/ccomps.c:mapClust
// ---------------------------------------------------------------------------

describe('copyClusterInfo — mapClust guard (L260)', () => {
  it('throws when a cluster clone has no mapped original in origOf', () => {
    const root = new Graph('root', 'directed');
    const comp = new Graph('_cc_0', 'directed');
    const cloneCluster = new Graph('cluster0', 'directed');
    comp.info.n_cluster = 1;
    comp.info.clust = [cloneCluster];
    const origOf = new Map<GraphType, GraphType>(); // deliberately empty
    expect(() => copyClusterInfo([comp], root, origOf))
      .toThrow('mapClust: no original for cluster cluster0');
  });

  it('does not throw when the clone IS mapped (L260 false, sanity)', () => {
    const root = new Graph('root', 'directed');
    const comp = new Graph('_cc_0', 'directed');
    const cloneCluster = new Graph('cluster0', 'directed');
    const origCluster = new Graph('cluster0', 'directed');
    cloneCluster.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    comp.info.n_cluster = 1;
    comp.info.clust = [cloneCluster];
    const origOf = new Map<GraphType, GraphType>([[cloneCluster, origCluster]]);
    copyClusterInfo([comp], root, origOf);
    expect(root.info.clust![0]).toBe(origCluster);
    expect(origCluster.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } });
  });
});

// ---------------------------------------------------------------------------
// packComponentsClusterAware dispatch, via layoutAndPack
// @see lib/pack/pack.c:putGraphs / packSubgraphs (L379-388)
// ---------------------------------------------------------------------------

describe('layoutAndPack — PackMode.Graph dispatch with a real cluster', () => {
  it('packs a clustered + plain component, unions cluster bb into root '
    + '(L379 true / L388 true / L357 true / L341 false)', () => {
    const src = 'digraph { subgraph cluster0 { a; b; a->b } c -> d }';
    const g = makeContextGraph(src);
    const { comps, origOf } = cccompsWithClusters(g);
    expect(comps.length).toBe(2);
    const pinfo = basePinfo(PackMode.Graph);
    layoutAndPack(g, comps, pinfo, origOf);
    expect(g.info.n_cluster).toBe(1);
    expect(g.info.bb).toBeDefined();
    const clusterBb = g.info.clust![0]!.info.bb;
    expect(clusterBb).toBeDefined(); // cb defined -> L341 continue NOT taken
    // Root bb was expanded to enclose the cluster boundary (L357 true branch).
    expect(g.info.bb!.ll.x).toBeLessThanOrEqual(clusterBb!.ll.x + 0.01);
    expect(g.info.bb!.ur.x).toBeGreaterThanOrEqual(clusterBb!.ur.x - 0.01);
  });
});

describe('layoutAndPack — PackMode.Array + PK_USER_VALS sortv parsing (L379-380 else-if, L382-383)', () => {
  it('keeps a valid non-negative sortv and falls back to 0 for negative/unparsable', () => {
    const src = 'digraph { a -> b; c -> d; e }';
    const g = makeContextGraph(src);
    const { comps, origOf } = cccompsWithClusters(g);
    expect(comps.length).toBe(3);
    comps[0]!.attrs.set('sortv', '5'); // valid -> kept (L383 true arm)
    comps[1]!.attrs.set('sortv', '-3'); // negative -> 0 (L383 false arm)
    // comps[2] has no sortv attr at all -> `?? ''` fallback (L382 `??` RHS branch)
    const pinfo = basePinfo(PackMode.Array, PK_USER_VALS);
    layoutAndPack(g, comps, pinfo, origOf);
    expect(pinfo.vals).toEqual([5, 0, 0]);
  });

  it('skips sortv parsing when PK_USER_VALS is unset (L382 false)', () => {
    const src = 'digraph { a -> b; c -> d }';
    const g = makeContextGraph(src);
    const { comps, origOf } = cccompsWithClusters(g);
    const pinfo = basePinfo(PackMode.Array);
    layoutAndPack(g, comps, pinfo, origOf);
    expect(pinfo.vals).toBeNull();
  });
});

describe('layoutAndPack — PackMode.Aspect: no placer, pts stays null (L388 false)', () => {
  it('leaves structurally-identical components at the same local origin '
    + '(no pack offset applied) when the mode has no placer', () => {
    const src = 'digraph { a -> b; c -> d }'; // two structurally identical components
    const g = makeContextGraph(src);
    const { comps, origOf } = cccompsWithClusters(g);
    const pinfo = basePinfo(PackMode.Aspect);
    layoutAndPack(g, comps, pinfo, origOf);
    const n0 = [...comps[0]!.nodes.values()][0]!;
    const n1 = [...comps[1]!.nodes.values()][0]!;
    // Neither polyGraphs (mode>Graph) nor arrayRects (mode!==Array) ran, so
    // pts stayed null and shiftGraphs was never invoked: both components
    // still sit at the SAME local layout origin instead of being packed apart.
    expect(n0.info.coord).toEqual(n1.info.coord);
    // The root bb is still computed unconditionally (L390, outside the guard).
    expect(g.info.bb).toBeDefined();
  });
});
