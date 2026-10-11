// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 23: a flat labelled edge (`minlen=0`, fixed-size HTML
 * label of WIDTH 5/9/12/20/30) routes its spline through a symmetric corridor
 * whose two interior polyline points deviate from the fitted bezier by
 * (almost) the same amount. Which one `reallyroutespline` splits at is
 * decided by C's exact arithmetic: libm `hypot` for `dist`, strict `>` for
 * the max-deviation test, and clang's FMA contraction of the bezier eval at
 * route.c:137-138. Every width must match the native oracle.
 *
 * @see lib/pathplan/route.c:reallyroutespline
 * @see .agent-notes/pathplan-fma-contraction-map.md
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

/** Label widths captured from the plantuml-ts issue 23 report. */
const WIDTHS = [5, 9, 12, 20, 30] as const;

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('plantuml-ts issue 23: flat labelled edge max-deviation split', () => {
  test.each(WIDTHS)('label width %i matches the native oracle', (w) => {
    const id = `pt-issue-23-w${w}`;
    const actual = renderSvg(read(`inputs/${id}.dot`), 'dot');
    const { pass, diffs } = compareSvg(actual, read(`refs/${id}.svg`), 'deterministic');
    expect(diffs.slice(0, 3)).toEqual([]);
    expect(pass).toBe(true);
  });
});
