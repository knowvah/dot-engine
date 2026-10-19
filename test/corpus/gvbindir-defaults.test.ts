// SPDX-License-Identifier: EPL-2.0
//
// Fitness test (T1, plans/post-16-1-followups-mission/batch-1/T1-gvbindir-defaults.md):
// every corpus script that shells out to native dot defaults GVBINDIR to the
// 16.1 oracle plugin dir (docs/adr/0001-graphviz-16.1-oracle.md). The old
// pango plugin dir added ~55 ms per native render and inflated PERF.md.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ORACLE_GVBINDIR = '/tmp/ghl';
const RETIRED_GVBINDIR = ['/tmp', 'gvplugins'].join('/');
const CORPUS_DIR = new URL('./', import.meta.url);
const SELF = 'gvbindir-defaults.test.ts';
const DEFAULTED_SCRIPTS = ['bench.mjs', 'capture-native.mjs', 'survey.ts'];
const DEFAULT_RE = /process\.env\.GVBINDIR\s*\?\?\s*'([^']*)'/g;

function read(name: string): string {
  return readFileSync(new URL(name, CORPUS_DIR), 'utf8');
}

function defaultsOf(src: string): string[] {
  return [...src.matchAll(DEFAULT_RE)].map((m) => m[1] ?? '');
}

describe('GVBINDIR defaults', () => {
  it.each(DEFAULTED_SCRIPTS)('%s defaults GVBINDIR to the 16.1 oracle dir', (name) => {
    const src = read(name);
    expect(defaultsOf(src)).toEqual([ORACLE_GVBINDIR]);
    expect(src.includes(RETIRED_GVBINDIR)).toBe(false);
  });

  it('no corpus script defaults GVBINDIR to the retired plugin dir', () => {
    const scripts = readdirSync(CORPUS_DIR).filter(
      (f) => /\.(ts|mjs)$/.test(f) && f !== SELF,
    );
    const offenders = scripts.filter((f) => defaultsOf(read(f)).includes(RETIRED_GVBINDIR));
    expect(offenders).toEqual([]);
  });
});
