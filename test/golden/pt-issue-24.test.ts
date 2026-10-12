// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 24: a flat labelled minlen=0 edge on a larger graph
 * routes its spline through the same boxes as C (not a label-side mirror).
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

// Not asserted: the issue's homebrew spline for sh0030->sh0014 (lp 1063,902.5)
// does not match the cached givoli DOT as it stands today, on the oracle or on
// homebrew dot 16.1.0 alike (both give lp 1093,902.5); see the T4 hand-back.
ptIssueTest('24-givoli', 'pt-issue-24-givoli matches the native oracle', () => {
  matchesNative('pt-issue-24-givoli');
});

ptIssueTest('24-nadepi', 'pt-issue-24-nadepi matches the native oracle', () => {
  matchesNative('pt-issue-24-nadepi');
});

ptIssueTest('24-tekena', 'pt-issue-24-tekena matches the native oracle', () => {
  matchesNative('pt-issue-24-tekena');
});
