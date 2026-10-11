// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 29: `splines=ortho` self-loops were dropped by the ortho
 * edge gather, so postproc logged `lost a a edge` and drew nothing. C's gather
 * includes loops and orthoEdges routes them via addLoop.
 *
 * @see lib/ortho/ortho.c:orthoEdges
 * @see lib/ortho/ortho.c:addLoop
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderSvg } from '../../src/index.js';
import { compareSvg } from './compare.js';

const INPUT_DIR = new URL('./inputs/', import.meta.url);
const REF_DIR = new URL('./refs/', import.meta.url);

const CASES = ['pt-issue-29', 'pt-issue-29-pair'] as const;

describe('splines=ortho self-loops (plantuml-ts 29)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each(CASES)('%s matches native and logs nothing', async (name) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const src = readFileSync(new URL(`${name}.dot`, INPUT_DIR), 'utf8');
    const ref = readFileSync(new URL(`${name}.svg`, REF_DIR), 'utf8');
    const actual = await renderSvg(src, 'dot');
    const result = compareSvg(actual, ref, 'deterministic');
    expect(result.diffs).toEqual([]);
    expect(result.pass).toBe(true);
    // The unrelated font-metrics fallback warning is expected (native prints
    // it too); nothing else, in particular no `lost ... edge`, may be logged.
    const logged = warn.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => !m.startsWith('Warning: no hard-coded metrics'));
    expect(logged).toEqual([]);
  });
});
