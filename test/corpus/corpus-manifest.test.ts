// SPDX-License-Identifier: EPL-2.0
//
// Guard for the committed corpus manifest (issue #148): it is enumerated from
// the oracle checkout's tests/ tree (ORACLE_CORPUS_ROOT), so it must hold the
// inputs graphviz 16.1.1 added, and an input the oracle itself crashes on has
// no reference and must be quarantined rather than scored.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildManifest, type CorpusEntry } from './enumerate.js';
import { ORACLE_CORPUS_ROOT } from './oracle-paths.mjs';

const MANIFEST = fileURLToPath(new URL('./corpus-manifest.json', import.meta.url));

/** Inputs graphviz 16.1.1's tests/ adds over 16.1.0's (all `<id>.dot`). */
const ADDED_AT_16_1_1 = [
  '2746', '2756', '2756_1', '2758', '2759', '2759_1', '2761', '2761_1', '2765', '2765_1',
  '2768', '2768_1', '2768_2', '2769', '2769_1', '2769_2', '2773', '2773_1', '2774', '2774_1',
  '2776', '2776_1', '2780', '2781', '2781_1', '2783', '2821_0', '2821_1', '2821_2', '2841',
  '2860', '2860_1', '2866', '2870_0', '2870_1', '2870_2',
];

/** Native 16.1.1 dies on SIGSEGV (exit 139) on these; upstream marks them xfail. */
const ORACLE_CRASH_AT_16_1_1 = ['2746', '2761', '2761_1'];

/** Inputs graphviz 16.1.2's tests/ adds over 16.1.1's (all `<id>.dot`); #298 admits them. */
const ADDED_AT_16_1_2 = ['2745', '2760', '2762', '2762_1', '2764', '2764_1', '2870_3'];

function committedManifest(): CorpusEntry[] {
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as CorpusEntry[];
}

describe('corpus-manifest.json', () => {
  const byId = new Map(committedManifest().map((e) => [e.id, e]));

  it('holds every input graphviz 16.1.1 added, under its file name', () => {
    for (const id of ADDED_AT_16_1_1) {
      expect(byId.get(id)?.path, id).toBe(`${id}.dot`);
    }
  });

  it('quarantines the inputs the oracle crashes on as oracle-crash', () => {
    for (const id of ORACLE_CRASH_AT_16_1_1) {
      expect(byId.get(id), id).toMatchObject({ status: 'quarantined', reason: 'oracle-crash' });
    }
  });

  it('sets graphviz 16.1.2\'s added inputs aside as pending-input', () => {
    for (const id of ADDED_AT_16_1_2) {
      expect(byId.get(id), id).toEqual({
        id,
        path: `${id}.dot`,
        engine: 'dot',
        status: 'quarantined',
        reason: 'pending-input',
      });
    }
  });

  it('scores every other added input, except the fdp one', () => {
    const scored = ADDED_AT_16_1_1.filter((id) => byId.get(id)?.status === 'applicable');
    const expected = ADDED_AT_16_1_1.filter((id) => !ORACLE_CRASH_AT_16_1_1.includes(id) && id !== '2841');
    expect(scored).toEqual(expected);
    expect(byId.get('2841')).toMatchObject({ status: 'quarantined', reason: 'engine-deferred' });
  });
});

describe.skipIf(!existsSync(ORACLE_CORPUS_ROOT))('corpus-manifest.json vs the oracle checkout', () => {
  it('equals a fresh enumeration of ORACLE_CORPUS_ROOT', () => {
    expect(committedManifest()).toEqual(buildManifest(ORACLE_CORPUS_ROOT));
  });
});
