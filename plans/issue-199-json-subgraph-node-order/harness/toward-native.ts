// SPDX-License-Identifier: EPL-2.0
// Issue #199: checks every changed job of a bytediff run against the carried
// oracle. json is parsed and printed with keys sorted, array order kept
// (#184), one value per line. A job passes when base and head have the same
// line count as native, every line head changed equals native's, and no line
// that equalled native on base differs on head. Prints one row per job: key,
// verdict (native | toward | AWAY | SHAPE; +STDERR when base and head stderr
// differ), lines unequal to native on base
// and on head, and whether the member lists (gid, name, subgraphs, nodes,
// edges of each object, in order) equal native's on base and on head.
//   npx tsx toward-native.ts <bytediff-out.json> > out.tsv
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import { ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL } from '../../../test/corpus/oracle-paths.mjs';

interface Entry { id: string; path: string }
const [outJson] = process.argv.slice(2);
const STDERR_MARK = '\n--stderr--\n';
// Native's time limit per job; NATIVE_TIMEOUT_MS raises it for an id like 2621.
const NATIVE_TIMEOUT_MS = Number(process.env.NATIVE_TIMEOUT_MS ?? 300_000);
const dDir = `${outJson}.d`;
const manifest = JSON.parse(readFileSync(new URL('../../../test/corpus/corpus-manifest.json', import.meta.url), 'utf8')) as Entry[];
const pathOf = new Map(manifest.map((e) => [e.id, e.path]));
const gvb = (e: string): string => (e === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL);
function sortKeys(_k: string, v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}
/**
 * json prints a non-finite number as a bare `inf` or `nan` (1332 under osage:
 * native and the port alike), which JSON.parse rejects. Quote those tokens,
 * outside strings only, the same way on native, base and head.
 */
function parseJson(s: string): unknown {
  return JSON.parse(s.replace(/"(?:[^"\\]|\\.)*"|-?\b(?:inf|nan)\b/g, (m) => (m.startsWith('"') ? m : `"${m}"`)));
}
/** Each object's gid, name and member lists, in printed order: the surface #199 changes. */
function members(s: string): string {
  const doc = parseJson(s) as { objects?: Array<Record<string, unknown>> };
  return JSON.stringify((doc.objects ?? []).map((o) => [o._gvid, o.name, o.subgraphs, o.nodes, o.edges]));
}
const lines = (s: string): string[] => JSON.stringify(parseJson(s), sortKeys, 1).split('\n');
const index = readFileSync(join(dDir, 'index.txt'), 'utf8').trim().split('\n').map((l) => l.split(' ') as [string, string]);
for (const e of new Set(index.map(([, k]) => k.split('|')[1]))) oraclePreflight(ORACLE_DOT_BIN, gvb(e), e);
console.log('key\tverdict\tbase\thead\tmembers-base\tmembers-head');
for (const [n, key] of index) {
  const [id, engine, fmt] = key.split('|');
  const r = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, join(ORACLE_CORPUS_ROOT, pathOf.get(id)!)],
    { env: { ...process.env, GVBINDIR: gvb(engine) }, encoding: 'utf8', maxBuffer: 1 << 28, timeout: NATIVE_TIMEOUT_MS });
  // Native exits 1 with its output written when it reports an Error (fdp's non-comparable clusters, dot's
  // rebuild_vlists): that output is still the reference. With none (a timeout, a crash) there is nothing to
  // compare: say so, with the exit status or signal, and go on.
  if (r.error || r.stdout === '') { console.log([key, `NATIVE-NONE ${r.signal ?? r.status}`, '', '', '', ''].join('\t')); continue; }
  // An output that still does not parse (a port throw leaves none) gets its own row, not a lost run.
  try { row(n, key, r.stdout); } catch (err) { console.log([key, `ERROR ${String(err).split('\n')[0]}`, '', '', '', ''].join('\t')); }
}
function row(n: string, key: string, native: string): void {
  const nat = lines(native);
  // A saved output is stdout, then `--stderr--` and stderr when there was any.
  const [aOut, aErr] = readFileSync(join(dDir, `${n}.a.txt`), 'utf8').split(STDERR_MARK);
  const [bOut, bErr] = readFileSync(join(dDir, `${n}.b.txt`), 'utf8').split(STDERR_MARK);
  const a = lines(aOut);
  const b = lines(bOut);
  const neq = (x: string[]): number => x.filter((l, i) => l !== nat[i]).length;
  let verdict = 'SHAPE';
  if (a.length === nat.length && b.length === nat.length) {
    const away = b.some((l, i) => l !== a[i] && (l !== nat[i] || a[i] === nat[i]));
    verdict = away ? 'AWAY' : neq(b) === 0 ? 'native' : 'toward';
  }
  if (aErr !== bErr) verdict += '+STDERR';
  const mem = (x: string): string => (members(x) === members(native) ? 'eq' : 'ne');
  console.log([key, verdict, neq(a), neq(b), mem(aOut), mem(bOut)].join('\t'));
}
