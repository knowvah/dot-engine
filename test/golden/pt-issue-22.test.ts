// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 22: sametail edges from an LR plaintext HTML-table node
 * share a start point whose clip offset must match C.
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

ptIssueTest('22-sametail-min', 'pt-issue-22-sametail-min matches the native oracle', () => {
  matchesNative('pt-issue-22-sametail-min');
});

ptIssueTest('22-sametail-min-quote', 'pt-issue-22-sametail-min ref carries the homebrew 16.1.0 quote', () => {
  refCarries('pt-issue-22-sametail-min', [
    'M97,-57.12C97,-57.12 109.84,-64.75 123.17,-72.68',
    'M97,-57.12C97,-57.12 109.84,-49.49 123.17,-41.56',
  ]);
});

ptIssueTest('22-sametail-min-rect', 'pt-issue-22-sametail-min-rect matches the native oracle', () => {
  matchesNative('pt-issue-22-sametail-min-rect');
});

ptIssueTest('22-sametail-min-tb', 'pt-issue-22-sametail-min-tb matches the native oracle', () => {
  matchesNative('pt-issue-22-sametail-min-tb');
});

ptIssueTest('22-pijiju', 'pt-issue-22-pijiju matches the native oracle', () => {
  matchesNative('pt-issue-22-pijiju');
});
