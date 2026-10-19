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
import { afterEach, describe, expect, vi } from 'vitest';
import { renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

const INPUT_DIR = new URL('./inputs/', import.meta.url);
const REF_DIR = new URL('./refs/', import.meta.url);

const CASES = [
  { id: '29', name: 'pt-issue-29' },
  { id: '29-pair', name: 'pt-issue-29-pair' },
  { id: '29-xagonu', name: 'pt-issue-29-xagonu' },
] as const;

/** Homebrew 16.1.0 loop path quoted in the plantuml-ts issue 29 report. */
const HOMEBREW_LOOP =
  'M27,-54.42C27,-63.28 27,-72 27,-72 27,-72 72,-72 72,-72 72,-72 72,0 72,0 72,0 27,0 27,0 27,0 27,-6.06 27,-6.06';

describe('splines=ortho self-loops (plantuml-ts 29)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const { id, name } of CASES) {
    ptIssueTest(id, `${name} matches native and logs nothing`, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const src = readFileSync(new URL(`${name}.dot`, INPUT_DIR), 'utf8');
      const ref = readFileSync(new URL(`${name}.svg`, REF_DIR), 'utf8');
      const actual = renderSvg(src, 'dot');
      const result = compareSvg(actual, ref, 'deterministic');
      expect(result.diffs).toEqual([]);
      expect(result.pass).toBe(true);
      // The font-metrics fallback and the empty-FIXEDSIZE-table size warnings
      // are expected (native prints both on these inputs); nothing else, in
      // particular no `lost ... edge`, may be logged.
      const logged = warn.mock.calls
        .map((c) => String(c[0]))
        .filter((m) => !m.startsWith('Warning: no hard-coded metrics'))
        .filter((m) => m !== 'Warning: table size too small for content');
      expect(logged).toEqual([]);
    });
  }

  ptIssueTest('29-quote', 'pt-issue-29 ref carries the homebrew loop path', () => {
    const ref = readFileSync(new URL('pt-issue-29.svg', REF_DIR), 'utf8');
    expect(ref).toContain(HOMEBREW_LOOP);
    expect(ref).toContain('width="80pt" height="80pt"');
  });
});
