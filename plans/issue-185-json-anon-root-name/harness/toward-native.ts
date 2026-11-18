// SPDX-License-Identifier: EPL-2.0
// Issue #185, queue gate 5 ("toward-native changes"): for every changed output of a
// bytediff run, the diff-line count against native 16.1.1 on base and on head, the
// changed lines, and whether each changed line now equals native's line.
//   npx tsx toward-native.ts <bytediff-out.json> > toward-native.tsv
// The bytediff run saves each changed pair as <out.json>.d/<n>.{a,b}.txt (a = base,
// b = head) in the order of `diffs`; keys are `id|engine|format`. Columns:
//   key, baseDiff, headDiff (lines `diff` marks < or > against native),
//   changed (line numbers where base and head differ, same length only),
//   towardNative `y` when every changed line equals native's line at that number and
//   no line equal to native on base differs on head; `n` otherwise; `len` when base
//   and head differ in line count (inspect by hand).
// The oracle comes from test/corpus/oracle-paths.mjs (ADR-0002).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import {
  ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const MAX_BUFFER = 1 << 28;
const scratch = mkdtempSync(join(tmpdir(), 'i185-tn-'));

function native(engine: string, fmt: string, file: string): string {
  const r = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    env: { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL },
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: 300_000,
  });
  return r.stdout ?? '';
}

/** Lines `diff` reports as removed or added between two files. */
function diffCount(a: string, b: string): number {
  const r = spawnSync('diff', [a, b], { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  return (r.stdout.match(/^[<>]/gm) ?? []).length;
}

function main(): void {
  const [bd = ''] = process.argv.slice(2);
  oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR, 'dot');
  oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR_ALL, 'sfdp');
  const manifest = JSON.parse(readFileSync('test/corpus/corpus-manifest.json', 'utf8')) as
    { id: string; path: string }[];
  const byId = new Map(manifest.map((m) => [m.id, m.path]));
  const { diffs } = JSON.parse(readFileSync(bd, 'utf8')) as { diffs: string[] };
  console.log(['key', 'baseDiff', 'headDiff', 'changed', 'towardNative'].join('\t'));
  diffs.forEach((key, n) => {
    const [id = '', engine = '', fmt = ''] = key.split('|');
    const aFile = `${bd}.d/${n}.a.txt`;
    const bFile = `${bd}.d/${n}.b.txt`;
    const nFile = join(scratch, `${n}.native.txt`);
    const nat = native(engine, fmt, join(ORACLE_CORPUS_ROOT, byId.get(id)!));
    writeFileSync(nFile, nat);
    const a = readFileSync(aFile, 'utf8').split('\n');
    const b = readFileSync(bFile, 'utf8').split('\n');
    const nl = nat.split('\n');
    let changed = '-';
    let toward = 'len';
    if (a.length === b.length) {
      const idx = a.flatMap((l, i) => (l === b[i] ? [] : [i]));
      changed = idx.map((i) => i + 1).join(',');
      const ok = idx.every((i) => b[i] === nl[i] && a[i] !== nl[i]);
      toward = ok ? 'y' : 'n';
    }
    console.log([key, diffCount(aFile, nFile), diffCount(bFile, nFile), changed, toward].join('\t'));
  });
}

main();
