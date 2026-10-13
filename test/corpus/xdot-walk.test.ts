// SPDX-License-Identifier: EPL-2.0
//
// Guard for xdot-walk.ts's survey resume: an interrupted `--survey` must reuse
// the rows already appended to xdot-parity.jsonl instead of re-rendering them
// (the multi-hour sweeps over tree-share-examples-world cannot restart from 0).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadResumed } from './xdot-walk.js';

const ROW_A = { id: 'a', path: 'a.gv', size: 10, verdict: 'conformant' };
const ROW_B_OLD = { id: 'b', path: 'b.gv', size: 20, verdict: 'timeout' };
const ROW_B_NEW = { id: 'b', path: 'b.gv', size: 20, verdict: 'diverged' };

describe('xdot-walk loadResumed', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const tmpFile = (body: string): string => {
    const dir = mkdtempSync(join(tmpdir(), 'xdot-walk-'));
    dirs.push(dir);
    const file = join(dir, 'xdot-parity.jsonl');
    writeFileSync(file, body);
    return file;
  };

  it('returns an empty map when the JSONL does not exist', () => {
    expect(loadResumed(join(tmpdir(), 'xdot-walk-absent', 'none.jsonl')).size).toBe(0);
  });

  it('keeps the last row per id and skips a partial trailing line', () => {
    const body = [ROW_A, ROW_B_OLD, ROW_B_NEW].map((r) => JSON.stringify(r)).join('\n') +
      '\n{"id":"c","pa';
    const resumed = loadResumed(tmpFile(body));
    expect([...resumed.keys()]).toEqual(['a', 'b']);
    expect(resumed.get('a')?.verdict).toBe('conformant');
    expect(resumed.get('b')?.verdict).toBe('diverged');
  });
});
