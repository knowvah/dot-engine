// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 28: a non-adjacent flat edge must honour `splines=line`
 * and `splines=polyline`. C make_flat_edge dispatches on `et`: LINE routes via
 * makeSimpleFlat, and the top/bottom corridor uses routepolylines unless
 * et == EDGETYPE_SPLINE. The port used the smooth spline router unconditionally.
 * Refs are the native graphviz 16.1.0 output.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_edge (1502-1620)
 */

import { describe, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

const read = (p: string): string =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

function matchesNative(id: string): void {
  const src = read(`./inputs/${id}.dot`);
  const ref = read(`./refs/${id}.svg`);
  const { pass, diffs } = compareSvg(renderSvg(src, 'dot'), ref, 'deterministic');
  expect(diffs.slice(0, 3)).toEqual([]);
  expect(pass).toBe(true);
}

/** Homebrew 16.1.0 `a -> b` path quoted in the plantuml-ts issue 28 report. */
const HOMEBREW_PATH = {
  polyline:
    'M50.03,-36.42C61.1,-45.28 72,-54 72,-54 72,-54 126,-54 126,-54 126,-54 131.88,-49.3 139.39,-43.29',
  line: 'M54.28,-18C80.35,-18 106.41,-18 132.47,-18',
} as const;

describe('pt-issue-28 flat edges honour splines=line|polyline', () => {
  for (const kind of ['polyline', 'line'] as const) {
    ptIssueTest(`28-${kind}`, `splines=${kind} matches native`, () => {
      matchesNative(`pt-issue-28-${kind}`);
    });

    ptIssueTest(`28-${kind}-quote`, `splines=${kind} ref carries the homebrew path`, () => {
      expect(read(`./refs/pt-issue-28-${kind}.svg`)).toContain(HOMEBREW_PATH[kind]);
    });
  }

  ptIssueTest('28-deroxu', 'the deroxu fixture matches native', () => {
    matchesNative('pt-issue-28-deroxu');
  });
});
