// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 26: a self-loop inside a cluster next to a flat labelled
 * edge must route and place its label like C.
 * Refs are the native graphviz 16.1.0 output (`GVBINDIR=/tmp/ghl dot -Tsvg`);
 * `inputs/PROVENANCE.md` records where each input came from.
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

ptIssueTest('26-selfloop-min', 'pt-issue-26-selfloop-min matches the native oracle', () => {
  matchesNative('pt-issue-26-selfloop-min');
});

ptIssueTest('26-selfloop-cluster', 'pt-issue-26-selfloop-cluster matches the native oracle', () => {
  matchesNative('pt-issue-26-selfloop-cluster');
});

ptIssueTest('26-selfloop-bisect', 'pt-issue-26-selfloop-bisect matches the native oracle', () => {
  matchesNative('pt-issue-26-selfloop-bisect');
});

ptIssueTest('26-selfloop-bisect-quote', 'pt-issue-26-selfloop-bisect ref carries the homebrew 16.1.0 quote', () => {
  refCarries('pt-issue-26-selfloop-bisect', [
    'M192.05,-117.81C211.53,-117.15 226.56,-111.55 226.56,-101 226.56,-90.45 211.53,-84.85 192.05,-84.19',
  ]);
});

ptIssueTest('26-cobumi', 'pt-issue-26-cobumi matches the native oracle', () => {
  matchesNative('pt-issue-26-cobumi');
});
