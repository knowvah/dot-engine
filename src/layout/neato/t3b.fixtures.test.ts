// SPDX-License-Identifier: EPL-2.0
//
// T3b (coverage-90, batch-3): neato pipeline fixture exercising
// layout/neato/overlap-prism.ts + set-aspect.ts + init.ts together through
// the real render path -- overlap="false" dispatches PRISM overlap removal
// over two coincidence-adjacent pinned pairs, ratio="fill"+size= drives
// _neato_set_aspect's fill scaling, and the pinned `pos="x,y!"` attrs
// exercise userPos's pin dispatch. Renders the c90-neato-overlap-ratio
// input via renderSvg and compares against its oracle-generated ref
// (native `dot -Kneato`, GVBINDIR=/tmp/ghl) so this integration path lands
// in-suite, independent of the orchestrator's manifest merge.
// @see lib/neatogen/overlap.c
// @see lib/neatogen/neatosplines.c:1023 _neato_set_aspect
// @see lib/neatogen/neatoinit.c:user_pos

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../index.js';
import { compareSvg } from '../../../test/golden/compare.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const FIXTURES = ['c90-neato-overlap-ratio'] as const;

describe('T3b neato overlap+ratio+pin fixtures (oracle-conformant)', () => {
  for (const id of FIXTURES) {
    it(`${id}: renders conformant to the native neato oracle`, () => {
      const dot = readFileSync(`${ROOT}test/golden/inputs/${id}.dot`, 'utf8');
      const ref = readFileSync(`${ROOT}test/golden/refs/${id}.svg`, 'utf8');
      const actual = renderSvg(dot, 'neato');
      const { pass, diffs } = compareSvg(actual, ref, 'iterative');
      expect(diffs).toEqual([]);
      expect(pass).toBe(true);
    });
  }
});
