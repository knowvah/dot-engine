// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 21: same-rank node order must match C; closed as a
 * plantuml-ts input divergence, kept as a regression guard.
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

ptIssueTest('21-inline', 'pt-issue-21-inline matches the native oracle', () => {
  matchesNative('pt-issue-21-inline');
});

ptIssueTest('21-boseba', 'pt-issue-21-boseba matches the native oracle', () => {
  matchesNative('pt-issue-21-boseba');
});

ptIssueTest('21-majuva', 'pt-issue-21-majuva matches the native oracle', () => {
  matchesNative('pt-issue-21-majuva');
});
