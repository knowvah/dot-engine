// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 34: HTML-table emission order. Graphviz 16.1.0 draws the
 * table border before the cells; the 15.x-era port draws it after. Refs are
 * the native graphviz 16.1.0 output (`GVBINDIR=/tmp/ghl dot -Tsvg`).
 *
 * @see lib/common/htmltable.c:emit_html_tbl
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

// Homebrew 16.1.0 polygons quoted in the plantuml-ts issue 34 report.
ptIssueTest('34-inline', 'pt-issue-34-inline matches the native oracle', () => {
  matchesNative('pt-issue-34-inline');
});

ptIssueTest('34-inline-quote', 'pt-issue-34-inline ref draws the table border before the cell', () => {
  const ref = read('refs/pt-issue-34-inline.svg');
  expect(ref).toContain('points="21,-12 21,-24 33,-24 33,-12 21,-12"');
  expect(ref).toContain('points="24,-15 24,-21 30,-21 30,-15 24,-15"');
  expect(ref.indexOf('points="21,-12')).toBeLessThan(ref.indexOf('points="24,-15'));
});

// The rubebe fixture (issue 31's input): the two polygons of cluster6's label.
ptIssueTest('34-rubebe', 'pt-issue-31-rubebe matches the native oracle', () => {
  matchesNative('pt-issue-31-rubebe');
});
