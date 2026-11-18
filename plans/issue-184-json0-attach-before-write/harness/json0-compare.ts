// SPDX-License-Identifier: EPL-2.0
// Issue #184: -Tjson0 (or FORMAT) of base and head against native 16.1.1,
// through the golden suite's structural comparator. The port's json is not
// byte-formatted as native's (key order, the root name), so line counts say
// nothing; compareJson compares values per object and attribute.
//   [ENGINES=dot,neato] [FORMAT=json0] [NATIVE_DIR=dir] \
//     npx tsx json0-compare.ts <base.mjs> <head.mjs> <in.gv...>
// One row per input and engine:
//   native   `ok`, `SEGVxN` (native died N times, then gave output), `FAIL`
//   base/headDiffs  compareJson diff count against native
//   lost     diffs in head that base did not have (path + actual)
//   unowned  lost diffs that base -Tjson does not show at the same path with
//            the same value against native -Tjson (json carries the same bb
//            and pos, so such a diff is a layout divergence json0 now prints,
//            queue rules gate 5 exception (a)); the gate: 0 in every row
//   gained   diffs base had that head does not
//   baseErr/headErr  `same` when the port's stderr equals native's, else DIFF
//   headPaths  the first six remaining head diff paths
// NATIVE_DIR, when set, saves native stdout as <input>.<engine>.<format>.
// Each port render runs in its own process (module statics carry across
// renders). The oracle comes from test/corpus/oracle-paths.mjs (ADR-0002).
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { compareJson } from '../../../test/golden/compare-json.js';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const ENGINES = (process.env.ENGINES
  ?? 'dot,neato,fdp,circo,twopi,osage,sfdp,patchwork').split(',');
const FORMAT = process.env.FORMAT ?? 'json0';
const NATIVE_DIR = process.env.NATIVE_DIR;
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 300_000;
const NATIVE_TRIES = 5;

const CHILD = `
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [bundle, engine, fmt, file] = process.argv.slice(1);
const mod = await import(pathToFileURL(bundle).href);
const errs = [];
mod.agseterrf((s) => { errs.push(s); return 0; });
const buf = readFileSync(file);
let src;
try { src = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
catch { src = Buffer.from(buf).toString('latin1'); }
const out = mod.render(mod.parse(src), fmt, { engine });
process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
`;

interface Run { out: string; err: string; ok: boolean }

function port(bundle: string, engine: string, file: string, fmt = FORMAT): Run {
  const r = spawnSync(process.execPath,
    ['--input-type=module', '-e', CHILD, '--', bundle, engine, fmt, file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  if (r.status !== 0) return { out: '', err: r.stderr, ok: false };
  const j = JSON.parse(r.stdout) as { out: string; err: string };
  return { ...j, ok: true };
}

function nativeOnce(engine: string, file: string, fmt: string): ReturnType<typeof spawnSync> {
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  return spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: gvbindir },
  });
}

/** Native's result, retried while it dies on SIGSEGV. */
function native(engine: string, file: string, fmt = FORMAT): Run & { status: string } {
  let crashes = 0;
  while (crashes < NATIVE_TRIES) {
    const r = nativeOnce(engine, file, fmt);
    if (r.signal !== 'SIGSEGV') {
      const out = String(r.stdout);
      const ok = r.status === 0 || out.length > 0;
      const status = ok ? (crashes > 0 ? `SEGVx${crashes}` : 'ok') : 'FAIL';
      return { out, err: String(r.stderr), ok, status };
    }
    crashes++;
  }
  return { out: '', err: '', ok: false, status: `SEGVx${crashes}` };
}

const key = (d: { path: string; actual: string }): string => `${d.path}=${d.actual}`;

type Diff = { path: string; actual: string };

/** Lost diffs that base -Tjson does not also show against native -Tjson. */
function unowned(lost: Diff[], base: string, engine: string, file: string): number {
  if (lost.length === 0) return 0;
  const nat = native(engine, file, 'json');
  const b = port(base, engine, file, 'json');
  if (!nat.ok || !b.ok) return lost.length;
  const owned = new Set(compareJson(b.out, nat.out).diffs.map(key));
  return lost.filter((d) => !owned.has(key(d))).length;
}

/** One TSV row for `file` under `engine`. */
function row(base: string, head: string, file: string, engine: string): string {
  const nat = native(engine, file);
  if (NATIVE_DIR !== undefined) {
    writeFileSync(join(NATIVE_DIR, `${basename(file)}.${engine}.${FORMAT}`), nat.out);
  }
  const b = port(base, engine, file);
  const h = port(head, engine, file);
  if (!nat.ok || !b.ok || !h.ok) {
    return [basename(file), engine, nat.status, b.ok ? '' : 'PORT-FAIL',
      h.ok ? '' : 'PORT-FAIL', '', '', '', '', '', ''].join('\t');
  }
  const bd = compareJson(b.out, nat.out).diffs;
  const hd = compareJson(h.out, nat.out).diffs;
  const bk = new Set(bd.map(key));
  const hk = new Set(hd.map(key));
  const lost = hd.filter((d) => !bk.has(key(d)));
  const gained = bd.filter((d) => !hk.has(key(d))).length;
  return [basename(file), engine, nat.status, bd.length, hd.length, lost.length,
    unowned(lost, base, engine, file), gained,
    b.err === nat.err ? 'same' : 'DIFF', h.err === nat.err ? 'same' : 'DIFF',
    hd.map((d) => d.path).slice(0, 6).join(' ')].join('\t');
}

function main(): void {
  const [base, head, ...files] = process.argv.slice(2) as [string, string, ...string[]];
  console.log('input\tengine\tnative\tbaseDiffs\theadDiffs\tlost\tunowned\tgained\tbaseErr\theadErr\theadPaths');
  for (const file of files) {
    for (const engine of ENGINES) console.log(row(base, head, file, engine));
  }
}

main();
