// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 28: a non-adjacent flat edge must honour `splines=line`
 * and `splines=polyline`. C make_flat_edge dispatches on `et`: LINE routes via
 * makeSimpleFlat, and the top/bottom corridor uses routepolylines unless
 * et == EDGETYPE_SPLINE. The port used the smooth spline router unconditionally.
 * Refs are the native (15.x) dot output.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_edge (1502-1620)
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

const read = (p: string): string =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

describe('pt-issue-28 flat edges honour splines=line|polyline', () => {
  for (const kind of ['polyline', 'line'] as const) {
    test(`splines=${kind} matches native`, () => {
      const src = read(`./inputs/pt-issue-28-${kind}.dot`);
      const ref = read(`./refs/pt-issue-28-${kind}.svg`);
      const { pass, diffs } = compareSvg(renderSvg(src, 'dot'), ref, 'deterministic');
      expect(diffs.slice(0, 3)).toEqual([]);
      expect(pass).toBe(true);
    });
  }
});
