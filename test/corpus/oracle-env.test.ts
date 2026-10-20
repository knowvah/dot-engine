// SPDX-License-Identifier: EPL-2.0
// Unit tests for oracle-env.ts. The oracle is a fake shell script, so no real
// graphviz is needed. Node-only dev/test infra.

import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { oracleCacheRoot, oraclePreflight } from './oracle-env.js';

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
