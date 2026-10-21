// SPDX-License-Identifier: EPL-2.0
// Unit tests for oracle-env.ts. The oracle is a fake shell script, so no real
// graphviz is needed. Node-only dev/test infra.

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ORACLE_VERSION,
  isStickyOracleFailure,
  oracleCacheRoot,
  oracleFailureFile,
  oraclePreflight,
  readOracleFailure,
  recordOracleFailure,
} from './oracle-env.js';

const scratch = mkdtempSync(join(tmpdir(), 'oracle-env-test-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const GVBINDIR = '/tmp/some-gvbindir';
const GOOD_V = `echo 'dot - graphviz version 16.1.0 (16.1.0)' >&2`;
const GOOD_SVG = `cat >/dev/null; echo '<svg width="1"></svg>'`;

/** Write a fake `dot`: `-V` runs `vBody`, anything else runs `renderBody`. */
let counter = 0;
function fakeDot(vBody: string, renderBody: string): string {
  const path = join(scratch, `dot-${counter++}.sh`);
  writeFileSync(path, `#!/bin/sh\nif [ "$1" = "-V" ]; then ${vBody}; exit 0; fi\n${renderBody}\n`);
  chmodSync(path, 0o755);
  return path;
}

describe('oracleCacheRoot', () => {
  it('uses $XDG_CACHE_HOME when set', () => {
    expect(oracleCacheRoot('xdot-oracle', 'abc123', { XDG_CACHE_HOME: '/x/cache' }, '/home/u')).toBe(
      '/x/cache/dot-engine/oracle/xdot-oracle/abc123',
    );
  });

  it('defaults to ~/.cache when XDG_CACHE_HOME is unset or empty', () => {
    const want = '/home/u/.cache/dot-engine/oracle/oracle/s1';
    expect(oracleCacheRoot('oracle', 's1', {}, '/home/u')).toBe(want);
    expect(oracleCacheRoot('oracle', 's1', { XDG_CACHE_HOME: '' }, '/home/u')).toBe(want);
  });

  it('keeps a nested sig (engine/sig) under the kind', () => {
    expect(oracleCacheRoot('xdot-oracle', 'neato/abc', {}, '/h')).toBe('/h/.cache/dot-engine/oracle/xdot-oracle/neato/abc');
  });
});

describe('oraclePreflight', () => {
  it('passes for a healthy oracle', () => {
    expect(oraclePreflight(fakeDot(GOOD_V, GOOD_SVG), GVBINDIR, 'dot')).toBeUndefined();
  });

  it('passes the engine as -K<engine> and sets GVBINDIR', () => {
    const dot = fakeDot(GOOD_V, `cat >/dev/null; echo "<svg>$1 $GVBINDIR</svg>"; [ "$1" = "-Kneato" ] || exit 3`);
    expect(oraclePreflight(dot, GVBINDIR, 'neato')).toBeUndefined();
    expect(() => oraclePreflight(dot, GVBINDIR, 'fdp')).toThrow(/exit/);
  });

  it('names the recovery command when the exit is non-zero', () => {
    const dot = fakeDot(GOOD_V, 'exit 1');
    expect(() => oraclePreflight(dot, GVBINDIR, 'dot')).toThrow(`GVBINDIR=${GVBINDIR} ${dot} -c`);
  });

  it('detects the missing-config8 "not recognized" failure', () => {
    const dot = fakeDot(GOOD_V, `cat >/dev/null; echo 'Format: "svg" not recognized. No formats found.' >&2; echo '<svg/>'`);
    expect(() => oraclePreflight(dot, GVBINDIR, 'dot')).toThrow(`GVBINDIR=${GVBINDIR} ${dot} -c`);
  });

  it('detects "no layout engine support"', () => {
    const dot = fakeDot(GOOD_V, `cat >/dev/null; echo 'Warning: no layout engine support for "neato"' >&2; echo '<svg/>'`);
    expect(() => oraclePreflight(dot, GVBINDIR, 'neato')).toThrow(/no layout engine support/);
  });

  it('detects stdout without <svg', () => {
    const dot = fakeDot(GOOD_V, 'cat >/dev/null; echo nothing');
    expect(() => oraclePreflight(dot, GVBINDIR, 'dot')).toThrow(`GVBINDIR=${GVBINDIR} ${dot} -c`);
  });

  it('rejects a binary that does not report 16.1.0, quoting what it reported', () => {
    const dot = fakeDot(`echo 'dot - graphviz version 15.1.0~dev' >&2`, GOOD_SVG);
    expect(() => oraclePreflight(dot, GVBINDIR, 'dot')).toThrow(/16\.1\.0.*15\.1\.0~dev/s);
  });

  it('throws when the binary cannot be spawned', () => {
    expect(() => oraclePreflight(join(scratch, 'absent'), GVBINDIR, 'dot')).toThrow(/absent/);
  });
});

const KEY = { engine: 'neato', format: 'xdot', id: '2593' };
const CAP_MS = 300_000;
const TIMEOUT_RUN = { timedOut: true, signal: 'SIGKILL', stderr: '' };
const ERROR_RUN = { timedOut: false, signal: null, stderr: 'Error: syntax error in line 3\n' };
const TIMEOUT_FAILURE = { err: 'oracle exit null', ms: 300_012, capMs: CAP_MS };
const ERROR_FAILURE = { err: 'Error: syntax error in line 3', ms: 41, capMs: CAP_MS };

/** A fresh XDG_CACHE_HOME per test, so no test reads another's records. */
function freshEnv(): { XDG_CACHE_HOME: string } {
  const dir = join(scratch, `xdg-${counter++}`);
  mkdirSync(dir);
  return { XDG_CACHE_HOME: dir };
}

describe('oracleFailureFile', () => {
  it('keys by ORACLE_VERSION, engine, format and id only (no binary path, mtime or GVBINDIR)', () => {
    expect(oracleFailureFile(KEY, { XDG_CACHE_HOME: '/x' }, '/h')).toBe(
      `/x/dot-engine/oracle/failures/${ORACLE_VERSION}/neato/xdot/2593.json`,
    );
  });
});

describe('isStickyOracleFailure', () => {
  it('keeps a timeout (it is re-checked against the cap on read)', () => {
    expect(isStickyOracleFailure(TIMEOUT_RUN)).toBe(true);
  });

  it('keeps a deterministic error exit or a native crash', () => {
    expect(isStickyOracleFailure(ERROR_RUN)).toBe(true);
    expect(isStickyOracleFailure({ timedOut: false, signal: 'SIGSEGV', stderr: '' })).toBe(true);
    expect(isStickyOracleFailure({ timedOut: false, signal: 'SIGABRT', stderr: '' })).toBe(true);
  });

  it('drops a kill from outside the harness (OOM killer, Ctrl-C, hangup)', () => {
    for (const signal of ['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP']) {
      expect(isStickyOracleFailure({ timedOut: false, signal, stderr: '' })).toBe(false);
    }
  });

  it('drops a harness fault (plugin config deleted mid-sweep), even on a timeout', () => {
    expect(isStickyOracleFailure({ ...ERROR_RUN, stderr: 'Format: "svg" not recognized.' })).toBe(false);
    expect(isStickyOracleFailure({ ...TIMEOUT_RUN, stderr: 'Warning: no layout engine support for "neato"' }))
      .toBe(false);
  });
});

describe('recordOracleFailure / readOracleFailure', () => {
  it('reads nothing before a record exists', () => {
    expect(readOracleFailure(KEY, CAP_MS, freshEnv())).toBeNull();
  });

  it('round-trips an error with its message and ms, whatever the current cap', () => {
    const env = freshEnv();
    recordOracleFailure(KEY, ERROR_RUN, ERROR_FAILURE, env);
    const want = { ...ERROR_FAILURE, timedOut: false };
    expect(readOracleFailure(KEY, CAP_MS, env)).toEqual(want);
    expect(readOracleFailure(KEY, 10 * CAP_MS, env)).toEqual(want);
  });

  it('reuses a timeout only while the current cap is no larger than the one it ran under', () => {
    const env = freshEnv();
    recordOracleFailure(KEY, TIMEOUT_RUN, TIMEOUT_FAILURE, env);
    const want = { ...TIMEOUT_FAILURE, timedOut: true };
    expect(readOracleFailure(KEY, CAP_MS, env)).toEqual(want);
    expect(readOracleFailure(KEY, CAP_MS - 1, env)).toEqual(want);
    expect(readOracleFailure(KEY, CAP_MS + 1, env)).toBeNull();
  });

  it('writes nothing for a failure that is not sticky', () => {
    const env = freshEnv();
    recordOracleFailure(KEY, { timedOut: false, signal: 'SIGKILL', stderr: '' }, ERROR_FAILURE, env);
    expect(existsSync(oracleFailureFile(KEY, env))).toBe(false);
    expect(readOracleFailure(KEY, CAP_MS, env)).toBeNull();
  });

  it('keeps engines, formats and ids apart', () => {
    const env = freshEnv();
    recordOracleFailure(KEY, ERROR_RUN, ERROR_FAILURE, env);
    expect(readOracleFailure({ ...KEY, engine: 'fdp' }, CAP_MS, env)).toBeNull();
    expect(readOracleFailure({ ...KEY, format: 'json' }, CAP_MS, env)).toBeNull();
    expect(readOracleFailure({ ...KEY, id: '2594' }, CAP_MS, env)).toBeNull();
  });

  it('treats an unreadable (truncated) record as a miss', () => {
    const env = freshEnv();
    recordOracleFailure(KEY, ERROR_RUN, ERROR_FAILURE, env);
    writeFileSync(oracleFailureFile(KEY, env), '{"err":"Err');
    expect(readOracleFailure(KEY, CAP_MS, env)).toBeNull();
  });
});
