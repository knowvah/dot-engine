// SPDX-License-Identifier: EPL-2.0
// Issue #185: the json/json0 root `name` of base and head against native 16.1.1.
//   [ENGINES=dot] [FORMATS=json,json0] [IDS=ids.txt] \
//     npx tsx root-name-survey.ts <base.mjs> <head.mjs> [<in.gv>...] > out.tsv
// IDS names a file of corpus manifest ids (one per line); extra arguments are
// .gv paths outside the corpus. One row per input, engine and format:
//   native/base/head  the root object's "name" (JSON-quoted), or FAIL/SEGV/TIMEOUT;
//            base/head are `-` when native gave no name (the port is not run)
//   verdict  `eq` (head equals native), `NE` (head differs), `skip` (native gave
//            no name, or base and head both failed or timed out: the port's
//            limits, not this change); `moved` is `y` when base and head differ
//   err      `same` when head's stderr equals base's (both FAIL counts as same), else DIFF
// compareJson skips the root name (RESERVED_TOP), so this reads it directly.
// Each port render runs in its own process (module statics carry across renders).
// The oracle comes from test/corpus/oracle-paths.mjs (ADR-0002).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import {
  ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const ENGINES = (process.env.ENGINES ?? 'dot').split(',');
const FORMATS = (process.env.FORMATS ?? 'json,json0').split(',');
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;
/** A port render past this is TIMEOUT: a few corpus inputs take the port minutes. */
const PORT_TIMEOUT_MS = 300_000;

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

/** The root's name line is the first `"name"` line; json writes it second. */
function rootName(out: string): string {
  const m = /^ {2}"name": (".*"),$/m.exec(out);
  return m ? m[1]! : 'NONAME';
}

function port(bundle: string, engine: string, fmt: string, file: string): { name: string; err: string } {
  const r = spawnSync(process.execPath,
    ['--input-type=module', '-e', CHILD, '--', bundle, engine, fmt, file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: PORT_TIMEOUT_MS });
  if (r.error) return { name: 'TIMEOUT', err: 'TIMEOUT' };
  // A crash's stderr names the bundle path (and an OOM's heap addresses), so
  // base and head never match on it: compare only that both failed.
  if (r.status !== 0) return { name: 'FAIL', err: 'FAIL' };
  const j = JSON.parse(r.stdout) as { out: string; err: string };
  return { name: rootName(j.out), err: j.err };
}

function native(engine: string, fmt: string, file: string): string {
  const r = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    env: { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL },
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
  });
  if (r.error) return 'TIMEOUT';
  if (r.signal) return 'SEGV';
  return r.stdout ? rootName(r.stdout) : 'FAIL';
}

function inputs(extra: string[]): [string, string][] {
  const out: [string, string][] = [];
  const idsFile = process.env.IDS;
  if (idsFile) {
    const manifest = JSON.parse(readFileSync('test/corpus/corpus-manifest.json', 'utf8')) as
      { id: string; path: string }[];
    const byId = new Map(manifest.map((m) => [m.id, m.path]));
    for (const id of readFileSync(idsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)) {
      out.push([id, join(ORACLE_CORPUS_ROOT, byId.get(id)!)]);
    }
  }
  for (const f of extra) out.push([f.split('/').pop()!, f]);
  return out;
}

function main(): void {
  const [base = '', head = '', ...extra] = process.argv.slice(2);
  oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR, 'dot');
  oraclePreflight(ORACLE_DOT_BIN, ORACLE_GVBINDIR_ALL, 'sfdp');
  console.log(['id', 'engine', 'format', 'native', 'base', 'head', 'verdict', 'moved', 'err'].join('\t'));
  const tally: Record<string, number> = {};
  for (const [id, file] of inputs(extra)) {
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        const n = native(engine, fmt, file);
        const ran = n.startsWith('"');
        const b = ran ? port(base, engine, fmt, file) : { name: '-', err: '' };
        const h = ran ? port(head, engine, fmt, file) : { name: '-', err: '' };
        const portDead = !b.name.startsWith('"') && !h.name.startsWith('"');
        const verdict = !ran || portDead ? 'skip' : h.name === n ? 'eq' : 'NE';
        const moved = b.name === h.name ? 'n' : 'y';
        const err = b.err === h.err ? 'same' : 'DIFF';
        tally[`${verdict}/${moved}/${err}`] = (tally[`${verdict}/${moved}/${err}`] ?? 0) + 1;
        console.log([id, engine, fmt, n, b.name, h.name, verdict, moved, err].join('\t'));
      }
    }
  }
  console.error(tally);
}

main();
