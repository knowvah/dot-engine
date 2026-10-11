// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 32: two parallel flat labelled edges (`minlen=0`, label
 * widths 6 and 15). The spline fitter's max-deviation split in
 * `reallyroutespline` must pick the same polyline point as C, which depends on
 * C's exact arithmetic: libm `hypot` for `dist`, strict `>`, and clang's FMA
 * contraction of the bezier eval at route.c:137-138 (this case flips if the
 * other product is fused first).
 *
 * @see lib/pathplan/route.c:reallyroutespline
 * @see .agent-notes/pathplan-fma-contraction-map.md
 */

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

const ID = 'pt-issue-32';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

test(`${ID} matches the native oracle`, () => {
  const actual = renderSvg(read(`inputs/${ID}.dot`), 'dot');
  const { pass, diffs } = compareSvg(actual, read(`refs/${ID}.svg`), 'deterministic');
  expect(diffs.slice(0, 3)).toEqual([]);
  expect(pass).toBe(true);
});
