// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 33: two parallel labelled edges between adjacent ranks
 * (label widths 80 and 66). The spline fitter's max-deviation split in
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

ptIssueTest('33', 'pt-issue-33 matches the native oracle', () => {
  matchesNative('pt-issue-33');
});

// Homebrew 16.1.0 paths quoted in the plantuml-ts issue 33 report.
ptIssueTest('33-quote', 'pt-issue-33 ref carries the homebrew edge paths', () => {
  refCarries('pt-issue-33', [
    'M81.58,-129.76C86.73,-115.75 91.59,-96.93 89.12,-80 87.92,-71.8 85.81,-63.15 83.47,-55.13',
    / d="M44\.68,-136\.45C29\.38,-126\.69 [^"]* 35\.16,-40\.7"/,
  ]);
});

ptIssueTest('33-xenusu', 'pt-issue-33-xenusu matches the native oracle', () => {
  matchesNative('pt-issue-33-xenusu');
});
