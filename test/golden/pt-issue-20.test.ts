// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 20: taillabel/headlabel text reserves canvas width
 * exactly like C (cached focaci fixture).
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

ptIssueTest('20-focaci', 'pt-issue-20-focaci matches the native oracle', () => {
  matchesNative('pt-issue-20-focaci');
});
