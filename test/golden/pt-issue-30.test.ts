// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 30: in a flat-adjacent group where one edge has ports,
 * make_flat_adj_edges lays out an aux graph; the port-less edge must start and
 * end exactly where native dot puts it. Ref is the native (15.x) dot output.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1122-1290)
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

const read = (p: string): string =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

describe('pt-issue-30 flat-adjacent aux layout endpoints', () => {
  test('port-less and port edges match native', () => {
    const src = read('./inputs/pt-issue-30.dot');
    const ref = read('./refs/pt-issue-30.svg');
    const { pass, diffs } = compareSvg(renderSvg(src, 'dot'), ref, 'deterministic');
    expect(diffs.slice(0, 4)).toEqual([]);
    expect(pass).toBe(true);
  });

  test('ported edge declared first routes the port-less sibling in the aux', () => {
    const src = 'digraph g { {rank=same; a; b;} node [shape=box,label=""]; a:e -> b:w; a -> b; }';
    const paths = renderSvg(src, 'dot').match(/ d="M[^"]+"/g);
    // Native: port edge M54,... then port-less edge M54.46,... (aux spline).
    expect(paths).toEqual([
      ' d="M54,-18C56.75,-18 58.79,-18 60.61,-18"',
      ' d="M54.46,-18C56.43,-18 58.44,-18 60.46,-18"',
    ]);
  });
});
