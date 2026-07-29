// SPDX-License-Identifier: EPL-2.0
//
// T3e (coverage-90, batch-3): dot-engine flat-edge fixture exercising a
// pipeline-only branch of layout/dot/splines-flat.ts that hand-built graphs
// cannot reach without replicating the full dotInitNodeEdge -> dotRank ->
// dotMincross -> dotPosition -> dotSameports -> dotSplines_ chain: an
// adjacent flat edge with `dir=both` routes through the rotated aux graph
// (make_flat_adj_edges) and generates BOTH a head and a tail arrowhead on the
// aux edge, which copyFlatArrow must transform back onto the original edge's
// tailArrowOps (splines-flat.ts:261) — every other flat fixture in this repo
// uses the default `dir=forward`, which never populates tailArrowOps.
// Renders the input via renderSvg and compares against its oracle-generated
// ref (native `dot`, GVBINDIR=/tmp/ghl) so the coverage this topology unlocks
// lands in this batch, independent of the orchestrator's manifest merge.
//
// @see lib/dotgen/dotsplines.c:make_flat_adj_edges (copy splines/arrows)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../index.js';
import { compareSvg } from '../../../test/golden/compare.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const FIXTURES = [
  'c90-dot-flat-adj-both-arrows',
] as const;

describe('T3e flat-edge fixtures (oracle-conformant)', () => {
  for (const id of FIXTURES) {
    it(`${id}: renders conformant to the native dot oracle`, () => {
      const dot = readFileSync(`${ROOT}test/golden/inputs/${id}.dot`, 'utf8');
      const ref = readFileSync(`${ROOT}test/golden/refs/${id}.svg`, 'utf8');
      const actual = renderSvg(dot, 'dot');
      const { pass, diffs } = compareSvg(actual, ref, 'deterministic');
      expect(diffs).toEqual([]);
      expect(pass).toBe(true);
    });
  }

  it('c90-dot-flat-adj-both-arrows: both arrowheads render on the flat edge', () => {
    const dot = readFileSync(`${ROOT}test/golden/inputs/c90-dot-flat-adj-both-arrows.dot`, 'utf8');
    const svg = renderSvg(dot, 'dot');
    // Two closed arrowhead polygons (one per direction) among the edge's
    // draw ops, on top of the two node ellipses.
    const polygonCount = (svg.match(/<polygon/g) ?? []).length;
    expect(polygonCount).toBeGreaterThanOrEqual(2);
  });
});
