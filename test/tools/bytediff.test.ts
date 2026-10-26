// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  buildJobs,
  buildReport,
  capReason,
  outcomeOf,
  parseIdLines,
  summaryLine,
} from './lib/bytediff-core.js';

describe('parseIdLines', () => {
  it('parses ids with optional engine lists, skipping blanks and comments', () => {
    expect(parseIdLines('# c\n\n1234\n  2475_1 dot,neato \n')).toEqual([
      { id: '1234', engines: null },
      { id: '2475_1', engines: ['dot', 'neato'] },
    ]);
  });
});

describe('buildJobs', () => {
  it('expands target x engine x format with stable keys', () => {
    const jobs = buildJobs([{ id: 'a', file: '/f', engines: ['dot', 'neato'] }], ['svg', 'xdot']);
    expect(jobs.map((j) => j.key)).toEqual(['a|dot|svg', 'a|dot|xdot', 'a|neato|svg', 'a|neato|xdot']);
  });
});

describe('capReason', () => {
  it('classifies timeout, oom, crash and ok', () => {
    expect(capReason(true, null, 'SIGKILL', '')).toBe('TIMEOUT');
    expect(capReason(false, 134, null, 'FATAL ERROR: Reached heap limit')).toBe('OOM');
    expect(capReason(false, 1, null, 'x\nTypeError: boom')).toBe('CRASH 1 TypeError: boom');
    expect(capReason(false, null, 'SIGSEGV', '')).toBe('CRASH SIGSEGV ');
    expect(capReason(false, 0, null, '')).toBeNull();
  });
  it('truncates long crash text to 200 chars', () => {
    expect(capReason(false, 1, null, `error ${'z'.repeat(500)}`)?.length).toBe(200);
  });
});

describe('outcomeOf', () => {
  it('capped on either side is never identical', () => {
    expect(outcomeOf({ cap: 'OOM' }, { out: Buffer.from('a') })).toBe('capped');
    expect(outcomeOf({ out: Buffer.from('a') }, { cap: 'OOM' })).toBe('capped');
  });
  it('compares bytes', () => {
    expect(outcomeOf({ out: Buffer.from('a') }, { out: Buffer.from('a') })).toBe('identical');
    expect(outcomeOf({ out: Buffer.from('a') }, { out: Buffer.from('b') })).toBe('diff');
  });
});

describe('buildReport', () => {
  it('sorts diffs and capped and summarises', () => {
    const r = buildReport('A', 'B', 5, 2, ['z', 'a'], [{ key: 'q', a: 'ok', b: 'OOM' }, { key: 'b', a: 'ok', b: 'ok' }]);
    expect(r.diffs).toEqual(['a', 'z']);
    expect(r.capped.map((c) => c.key)).toEqual(['b', 'q']);
    expect(summaryLine(r)).toBe('jobs 5: identical 2, diffs 2, capped 2');
  });
});
