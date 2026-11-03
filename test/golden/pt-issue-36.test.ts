// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 36: a single flat adjacent `minlen=0` edge with no port and
 * no label takes makeSimpleFlat's straight path and is clipped at both nodes.
 * dot-engine 2.4.0 ended that spline 0.1-0.3 px off native; refs are the native
 * graphviz 16.1.0 output. The case was fixed by an unidentified change after
 * 2.4.0, and these tests pin it.
 *
 * @see lib/dotgen/dotsplines.c:makeSimpleFlat
 * @see lib/common/splines.c:clip_and_install
 */

import { describe, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, render, renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

const read = (p: string): string =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

/** The filing's native `pos` (64.019,17 ... 98.429,17) as the ref's SVG path. */
const NATIVE_PATH = 'M64.02,-17C75.49,-17 86.96,-17 98.43,-17';

/** Every `pos`, `lp` and `bb` value of `-Tdot` output, with line continuations joined. */
function layoutValues(dot: string): string[] {
  const joined = dot.replace(/\\\n\s*/g, '');
  return [...joined.matchAll(/\b(?:pos|lp|bb)="([^"]+)"/g)].map((m) => m[1]!);
}

function matchesNative(id: string): void {
  const src = read(`./inputs/${id}.dot`);
  const ref = read(`./refs/${id}.svg`);
  const { pass, diffs } = compareSvg(renderSvg(src, 'dot'), ref, 'deterministic');
  expect(diffs.slice(0, 4)).toEqual([]);
  expect(pass).toBe(true);
  // SVG cannot see an invisible edge (cimare's four), so compare the spline values as well.
  expect(layoutValues(render(parse(src), 'dot'))).toEqual(layoutValues(read(`./refs/${id}.native.dot`)));
}

describe('pt-issue-36 flat adjacent unlabelled edge endpoints', () => {
  ptIssueTest('36', 'the filed repro matches native', () => {
    matchesNative('pt-issue-36');
  });

  ptIssueTest('36-quote', 'ref carries the path the filing quotes', () => {
    expect(read('./refs/pt-issue-36.svg')).toContain(NATIVE_PATH);
  });

  ptIssueTest('36-zodela', 'the zodela fixture matches native', () => {
    matchesNative('pt-issue-36-zodela');
  });

  ptIssueTest('36-cimare', 'the cimare fixture matches native', () => {
    matchesNative('pt-issue-36-cimare');
  });
});
