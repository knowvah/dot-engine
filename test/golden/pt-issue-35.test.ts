// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 35: a labelled edge (label width 6) parallel to an
 * unlabelled edge. The spline fitter's max-deviation split in
 * `reallyroutespline` must pick the same polyline point as C, which depends on
 * C's exact arithmetic: libm `hypot` for `dist`, strict `>`, and clang's FMA
 * contraction of the bezier eval at route.c:137-138.
 *
 * @see lib/pathplan/route.c:reallyroutespline
 * @see .agent-notes/pathplan-fma-contraction-map.md
 */

import { expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

function matchesNative(id: string): void {
  const actual = renderSvg(read(`inputs/${id}.dot`), 'dot');
  const { pass, diffs } = compareSvg(actual, read(`refs/${id}.svg`), 'deterministic');
  expect(diffs.slice(0, 3)).toEqual([]);
  expect(pass).toBe(true);
}

function refCarries(id: string, quotes: readonly (string | RegExp)[]): void {
  const ref = read(`refs/${id}.svg`);
  for (const quote of quotes) {
    if (typeof quote === 'string') expect(ref).toContain(quote);
    else expect(ref).toMatch(quote);
  }
}

ptIssueTest('35', 'pt-issue-35 matches the native oracle', () => {
  matchesNative('pt-issue-35');
});

// Homebrew 16.1.0 geometry quoted in the plantuml-ts issue 35 report.
ptIssueTest('35-quote', 'pt-issue-35 ref carries the homebrew canvas, node and edges', () => {
  refCarries('pt-issue-35', [
    '-4,4 -4,-127 23.77,-127 23.77,4 -4,4',
    '19.77,-123 1.77,-123 1.77,-87 19.77,-87',
    'M10.77,-86.8C10.77,-75.58 10.77,-60.67 10.77,-47.69',
    'M4.46,-86.96C1.62,-77.33 -0.77,-65.05 0.77,-54 1.08,-51.79 1.5,-49.53 1.98,-47.27',
  ]);
});

// The bamami fixture (issue 32's input, also named by issue 35).
ptIssueTest('35-bamami', 'pt-issue-32-bamami matches the native oracle', () => {
  matchesNative('pt-issue-32-bamami');
});
