// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 19: a flat edge whose endpoint is an HTML-table port must
 * attach at the port, not at the node boundary.
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

ptIssueTest('19-baneru', 'pt-issue-19-baneru matches the native oracle', () => {
  matchesNative('pt-issue-19-baneru');
});

ptIssueTest('19-camuna', 'pt-issue-19-camuna matches the native oracle', () => {
  matchesNative('pt-issue-19-camuna');
});

ptIssueTest('19-coxose', 'pt-issue-19-coxose matches the native oracle', () => {
  matchesNative('pt-issue-19-coxose');
});

ptIssueTest('19-mucoti', 'pt-issue-19-mucoti matches the native oracle', () => {
  matchesNative('pt-issue-19-mucoti');
});

ptIssueTest('19-nafiki', 'pt-issue-19-nafiki matches the native oracle', () => {
  matchesNative('pt-issue-19-nafiki');
});

ptIssueTest('19-rifuzu', 'pt-issue-19-rifuzu matches the native oracle', () => {
  matchesNative('pt-issue-19-rifuzu');
});

ptIssueTest('19-ririlu', 'pt-issue-19-ririlu matches the native oracle', () => {
  matchesNative('pt-issue-19-ririlu');
});

ptIssueTest('19-sefazi', 'pt-issue-19-sefazi matches the native oracle', () => {
  matchesNative('pt-issue-19-sefazi');
});
