// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 30: in a flat-adjacent group where one edge has ports,
 * make_flat_adj_edges lays out an aux graph; the port-less edge must start and
 * end exactly where native dot puts it. Refs are the native graphviz 16.1.0 output.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1122-1290)
 */

import { describe, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

const read = (p: string): string =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

/** Homebrew 16.1.0 edge paths quoted in the plantuml-ts issue 30 report. */
const HOMEBREW_PATHS = [
  'M54.46,-18C56.43,-18 58.44,-18 60.46,-18',
  'M54,-18C56.75,-18 58.79,-18 60.61,-18',
] as const;

function matchesNative(id: string): void {
  const src = read(`./inputs/${id}.dot`);
  const ref = read(`./refs/${id}.svg`);
  const { pass, diffs } = compareSvg(renderSvg(src, 'dot'), ref, 'deterministic');
  expect(diffs.slice(0, 4)).toEqual([]);
  expect(pass).toBe(true);
}

describe('pt-issue-30 flat-adjacent aux layout endpoints', () => {
  ptIssueTest('30', 'port-less and port edges match native', () => {
    matchesNative('pt-issue-30');
  });

  ptIssueTest('30-quote', 'ref carries the homebrew edge paths', () => {
    const ref = read('./refs/pt-issue-30.svg');
    for (const path of HOMEBREW_PATHS) expect(ref).toContain(path);
  });

  ptIssueTest('30-repoge', 'the repoge fixture matches native', () => {
    matchesNative('pt-issue-30-repoge');
  });

  ptIssueTest('30-sokevu', 'the sokevu fixture matches native', () => {
    matchesNative('pt-issue-30-sokevu');
  });

  ptIssueTest('30-port-first', 'ported edge declared first routes the port-less sibling in the aux', () => {
    const src = 'digraph g { {rank=same; a; b;} node [shape=box,label=""]; a:e -> b:w; a -> b; }';
    const paths = renderSvg(src, 'dot').match(/ d="M[^"]+"/g);
    // Native: port edge M54,... then port-less edge M54.46,... (aux spline).
    expect(paths).toEqual([
      ' d="M54,-18C56.75,-18 58.79,-18 60.61,-18"',
      ' d="M54.46,-18C56.43,-18 58.44,-18 60.46,-18"',
    ]);
  });
});
