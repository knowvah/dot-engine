// SPDX-License-Identifier: EPL-2.0

/**
 * `node a = [shape=box]`: grammar.y `optmacroname` is accepted, nomacros()
 * warns "attribute macros not implemented", and the attributes still apply.
 * Native stderr for the input (graphviz 16.1.0) is exactly
 * `Warning: attribute macros not implemented`.
 *
 * @see lib/cgraph/grammar.y:attrstmt
 * @see lib/cgraph/grammar.y:nomacros
 */

import { test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

const ID = 'optmacroname';
const NATIVE_STDERR = 'Warning: attribute macros not implemented';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

afterEach(() => {
  vi.restoreAllMocks();
});

test(`${ID} matches the native oracle and warns like native`, () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const actual = renderSvg(read(`inputs/${ID}.dot`), 'dot');
  const warnings = spy.mock.calls.map((c) => c[0]);
  const { pass, diffs } = compareSvg(
    actual,
    read(`refs/${ID}.svg`),
    'deterministic',
  );
  expect(diffs.slice(0, 3)).toEqual([]);
  expect(pass).toBe(true);
  expect(warnings).toEqual([NATIVE_STDERR]);
  // x (no explicit shape) took shape=box: a 4-point-plus-close polygon, no ellipse.
  expect(actual).not.toContain('<ellipse');
  expect(actual).toContain('<polygon');
});
