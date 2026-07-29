// SPDX-License-Identifier: EPL-2.0
//
// T2e (coverage-90, batch-2): circo topology fixtures exercising
// layout/circo/blockpath.ts branches that respond to graph TOPOLOGY rather
// than attributes -- chords (findPairEdges pairing), an articulation-point
// tail off a cycle (multi-block placeResiduals), two biconnected blocks
// sharing a cut vertex (bowtie), a parallel edge, and a densely chorded
// 6-cycle (multi-pass reduceEdgeCrossings). Renders each c90-circo-* input
// via renderSvg and compares against its oracle-generated ref (native
// `dot -Kcirco`, GVBINDIR=/tmp/ghl) so the coverage these topologies unlock
// lands in this batch, independent of the orchestrator's manifest merge.
// @see lib/circogen/blockpath.c

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../index.js';
import { compareSvg } from '../../../test/golden/compare.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const FIXTURES = [
  'c90-circo-chord',
  'c90-circo-artic-tree',
  'c90-circo-bowtie',
  'c90-circo-parallel',
  'c90-circo-wheel6',
] as const;

describe('T2e circo blockpath topology fixtures (oracle-conformant)', () => {
  for (const id of FIXTURES) {
    it(`${id}: renders conformant to the native circo oracle`, () => {
      const dot = readFileSync(`${ROOT}test/golden/inputs/${id}.dot`, 'utf8');
      const ref = readFileSync(`${ROOT}test/golden/refs/${id}.svg`, 'utf8');
      const actual = renderSvg(dot, 'circo');
      const { pass, diffs } = compareSvg(actual, ref, 'deterministic');
      expect(diffs).toEqual([]);
      expect(pass).toBe(true);
    });
  }
});
