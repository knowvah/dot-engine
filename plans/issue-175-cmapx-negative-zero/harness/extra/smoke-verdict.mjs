// SPDX-License-Identifier: EPL-2.0
// Issue #175, gate 5: every output test/tools/bytediff.ts reports as changed,
// judged against native 16.1.1 by the queue's rule (see rowcheck.mjs).
//   node smoke-verdict.mjs <out.json>
// Reads <out.json>.d/index.txt and <n>.{a,b}.txt (a = base, b = head; stdout,
// then "\n--stderr--\n" and the captured diagnostics). Verdicts: `native`,
// `toward`, `AWAY`, `timeout`; `stderr` is appended when the diagnostics changed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../../test/corpus/oracle-paths.mjs';

const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;
const SHOW = 170;
const STDERR_MARK = '\n--stderr--\n';
const MANIFEST = new URL('../../../../test/corpus/corpus-manifest.json', import.meta.url);

function split(text) {
  const at = text.lastIndexOf(STDERR_MARK);
  return { out: text.slice(0, at), err: text.slice(at + STDERR_MARK.length) };
}

function judge(nat, base, head) {
  const n = nat.split('\n');
  const b = base.split('\n');
  const h = head.split('\n');
  const count = (x) => (x.length === n.length ? x.filter((l, i) => l !== n[i]).length : -1);
  const counts = { base: count(b), head: count(h) };
  if (head === nat) return { verdict: 'native', counts, left: [] };
  if (counts.base < 0 || counts.head < 0) return { verdict: 'AWAY', counts, left: [] };
  const bad = h.some((l, i) => l !== n[i] && (l !== b[i] || b[i] === n[i]));
  const changed = h.flatMap((l, i) => (l === b[i] ? [] : [`  base   ${b[i]}`, `  head   ${l}`, `  native ${n[i]}`]));
  return { verdict: bad ? 'AWAY' : 'toward', counts, left: changed };
}

const outJson = process.argv[2];
const dir = `${outJson}.d`;
const paths = new Map(JSON.parse(readFileSync(MANIFEST, 'utf8')).map((m) => [m.id, m.path]));
const tally = {};
console.log('id\tengine\tformat\tbaseDiff\theadDiff\tverdict');
for (const line of readFileSync(join(dir, 'index.txt'), 'utf8').trim().split('\n')) {
  const [n, key] = line.split(' ');
  const [id, engine, format] = key.split('|');
  const a = split(readFileSync(join(dir, `${n}.a.txt`), 'utf8'));
  const b = split(readFileSync(join(dir, `${n}.b.txt`), 'utf8'));
  const nat = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${format}`, join(ORACLE_CORPUS_ROOT, paths.get(id))], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL },
  });
  const r = nat.error !== undefined || nat.status === null
    ? { verdict: 'timeout', counts: { base: '-', head: '-' }, left: [] }
    : judge(nat.stdout, a.out, b.out);
  const verdict = r.verdict + (a.err === b.err ? '' : '+stderr');
  tally[verdict] = (tally[verdict] ?? 0) + 1;
  console.log([id, engine, format, r.counts.base, r.counts.head, verdict].join('\t'));
  for (const l of r.left) console.log(l.slice(0, SHOW));
}
console.log(Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' '));
