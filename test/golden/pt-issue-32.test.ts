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

ptIssueTest('32', 'pt-issue-32 matches the native oracle', () => {
  matchesNative('pt-issue-32');
});

// Homebrew 16.1.0 paths quoted in the plantuml-ts issue 32 report.
ptIssueTest('32-quote', 'pt-issue-32 ref carries the homebrew detour and straight edge', () => {
  refCarries('pt-issue-32', [
    'M18.35,-10.48C25.6,-4.69 36.07,1.34 46,-1.34 53.81,-3.44 61.68,-8.05 67.54,-12.08',
    'M18.46,-19.34C31.45,-19.34 54.68,-19.34 67.63,-19.34',
  ]);
});

ptIssueTest('32-zosuje', 'pt-issue-32-zosuje matches the native oracle', () => {
  matchesNative('pt-issue-32-zosuje');
});

ptIssueTest('32-zosuje-quote', 'pt-issue-32-zosuje ref carries the homebrew detour span', () => {
  // Issue 32: zosuje real detour runs `M50.25 ... 117.58`.
  refCarries('pt-issue-32-zosuje', [/ d="M50\.25,[^"]* 117\.58,[^"]*"/]);
});

ptIssueTest('32-bamami', 'pt-issue-32-bamami matches the native oracle', () => {
  matchesNative('pt-issue-32-bamami');
});

ptIssueTest('32-bamami-quote', 'pt-issue-32-bamami ref carries the homebrew detour span', () => {
  // Issue 32: bamami real detour runs `M46.87 ... 129.92`.
  refCarries('pt-issue-32-bamami', [/ d="M46\.87,[^"]* 129\.92,[^"]*"/]);
});

ptIssueTest('32-bobixe', 'pt-issue-32-bobixe matches the native oracle', () => {
  matchesNative('pt-issue-32-bobixe');
});

ptIssueTest('32-pugodi', 'pt-issue-32-pugodi matches the native oracle', () => {
  matchesNative('pt-issue-32-pugodi');
});

ptIssueTest('32-rufopi', 'pt-issue-32-rufopi matches the native oracle', () => {
  matchesNative('pt-issue-32-rufopi');
});
