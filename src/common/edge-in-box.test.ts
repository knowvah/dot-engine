// SPDX-License-Identifier: EPL-2.0
//
// edge_in_box tests spl->bb, which init_bb computes before every render, and the
// label boxes against job->clip. Native refs: plans/post-16-1-followups-11/
// harness/T7b (regen.sh): the subg-after-free renders under fdp's settled
// (noaddr) class, and corpus 1581 under dot.
// @see lib/common/emit.c:2686 edge_in_box · lib/common/emit.c:4157 init_bb
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareXdot, XDOT_TOLERANCE } from '../../test/golden/compare-xdot.js';
import { parse } from '../parser/index.js';
import { render } from '../index.js';
import type { EngineName } from '../gvc/context.js';
import type { Edge } from '../model/edge.js';
import type { TextlabelT } from './types.js';
import { edgeHasDrawableContent } from './edge-in-box.js';
import {
  nativeSubgRenders, portSubgRenders, svgBody, type SubgFmt, type SubgMode,
} from '../gvc/__fixtures__/subg-renders/subg-renders.js';

const HARNESS = new URL('../../plans/post-16-1-followups-11/harness/T7b/', import.meta.url);

const CASES = (['fdp', 'osage'] as EngineName[]).flatMap((e) =>
  ['s', 'cluster_k'].flatMap((s) =>
    (['root', 'nofree'] as SubgMode[]).flatMap((m) => (['xdot', 'svg'] as SubgFmt[]).map((f) => [e, s, m, f] as const))));

/** fdp's third layout of cluster_k drifts at 1e-11 in the cluster's bb x0 (a layout matter, not a render one). */
const LAYOUT_DRIFT = new Set(['fdp.cluster_k.root.xdot.3']);

describe('every subgraph render equals native', () => {
  it.each(CASES)('%s %s %s %s', (engine, sub, mode, fmt) => {
    const native = nativeSubgRenders(engine, sub, mode, fmt);
    const port = portSubgRenders(engine, sub, mode, fmt);
    port.forEach((r, i) => {
      const n = native[i];
      // native segfaults after fdp cluster_k's first no-free xdot render: no render 2 to compare
      if (n === undefined) return;
      if (fmt === 'svg') expect(svgBody(r)).toBe(svgBody(n));
      else if (LAYOUT_DRIFT.has(`${engine}.${sub}.${mode}.${fmt}.${i + 1}`)) {
        expect(compareXdot(r, n, XDOT_TOLERANCE + 1e-9).diffs).toEqual([]);
      } else expect(r).toBe(n);
    });
  });
});

describe('an edge drawn only by its label', () => {
  // 1581's graph is 0x0; its labelled self-loops have no spline and an unplaced
  // label at the origin, which overlaps the clip, so C opens an empty edge group.
  it('corpus 1581 under dot draws native\'s two empty edge groups', () => {
    const src = readFileSync(new URL('1581.dot', HARNESS), 'latin1');
    const native = readFileSync(new URL('1581.dot.svg', HARNESS), 'utf8');
    expect(svgBody(render(parse(src), 'svg', { engine: 'dot' }))).toBe(svgBody(native));
  });
});

describe('edgeHasDrawableContent', () => {
  const clip = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
  const edge = (): Edge => parse('digraph { a -> b }').edges[0]!;
  const label = (x: number, set: boolean): TextlabelT =>
    ({ pos: { x, y: 50 }, dimen: { x: 10, y: 10 }, set } as unknown as TextlabelT);

  it('tests the spline box, not the spline\'s presence', () => {
    const e = edge();
    e.info.spl = { list: [], size: 0, bb: { ll: { x: 150, y: 0 }, ur: { x: 200, y: 10 } } };
    expect(edgeHasDrawableContent(e, clip)).toBe(false);
    e.info.spl.bb = { ll: { x: 90, y: 0 }, ur: { x: 200, y: 10 } };
    expect(edgeHasDrawableContent(e, clip)).toBe(true);
  });

  it('tests the label whether or not it was placed, and an xlabel only when placed', () => {
    const e = edge();
    e.info.label = label(50, false);
    expect(edgeHasDrawableContent(e, clip)).toBe(true);
    e.info.label = label(500, true);
    e.info.xlabel = label(50, false);
    expect(edgeHasDrawableContent(e, clip)).toBe(false);
    e.info.xlabel = label(50, true);
    expect(edgeHasDrawableContent(e, clip)).toBe(true);
  });

  it('does not test head or tail labels', () => {
    const e = edge();
    e.info.head_label = label(50, true);
    e.info.tail_label = label(50, true);
    expect(edgeHasDrawableContent(e, clip)).toBe(false);
  });
});
