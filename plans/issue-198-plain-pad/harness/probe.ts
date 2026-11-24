// SPDX-License-Identifier: EPL-2.0
// Issue #198 probe matrix: port bundles vs the carried oracle.
//   [ENGINES=dot] [FORMATS=svg,xdot,json,cmapx,plain] [ONLY=probe,probe] [OUT=dir] \
//     npx tsx probe.ts <probes-dir> <base.mjs> [<head.mjs>] > out.tsv
// One row per probe, engine and format: base/head `eq` when stdout AND stderr
// equal native, `out` when stdout differs, `err` when only stderr differs, `-`
// with no head bundle; moved `y` when head differs from base. json is compared
// parsed with keys sorted (#184); svg from `<svg` on, the tag's whitespace
// collapsed (the header comments differ). The stderr tally goes to stderr.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { oraclePreflight } from '../../../test/corpus/oracle-env.js';
import { ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL } from '../../../test/corpus/oracle-paths.mjs';
const ENGINES = (process.env.ENGINES ?? 'dot').split(',');
const FORMATS = (process.env.FORMATS ?? 'plain,plain-ext').split(',');
const OUT = process.env.OUT;
const ONLY = process.env.ONLY?.split(',');
const TIMEOUT_MS = 60_000;
const CHILD = `
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [bundle, engine, fmt, file] = process.argv.slice(1);
const mod = await import(pathToFileURL(bundle).href);
const errs = [];
mod.agseterrf((s) => { errs.push(s); return 0; });
let out = '';
try { out = mod.render(mod.parse(readFileSync(file, 'utf8')), fmt, { engine }); }
catch (e) { errs.push('THROW ' + e.message); }
process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
`;
interface Run { out: string; err: string }
function port(bundle: string, engine: string, fmt: string, file: string): Run {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD, '--', bundle, engine, fmt, file],
    { encoding: 'utf8', timeout: TIMEOUT_MS });
  if (r.error || r.status !== 0) return { out: 'FAIL', err: r.stderr ?? '' };
  return JSON.parse(r.stdout) as Run;
}
function native(engine: string, fmt: string, file: string): Run {
  const r = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    env: { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL },
    encoding: 'utf8', timeout: TIMEOUT_MS });
  if (r.error || r.signal) return { out: 'FAIL', err: String(r.signal ?? r.error) };
  return { out: r.stdout, err: r.stderr };
}
function sortKeys(_k: string, v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}
/** json: parsed, keys sorted (#184). svg: from `<svg` on, the tag's whitespace collapsed (header comments differ). */
function norm(fmt: string, s: string): string {
  if (fmt.startsWith('json')) { try { return JSON.stringify(JSON.parse(s), sortKeys, 1); } catch { return s; } }
  if (fmt !== 'svg') return s;
  const at = s.indexOf('<svg'); if (at < 0) return s;
  const end = s.indexOf('>', at);
  return s.slice(at, end + 1).replace(/\s+/g, ' ') + s.slice(end + 1);
}
const [dir, baseB, headB] = process.argv.slice(2);
for (const e of new Set(ENGINES)) oraclePreflight(ORACLE_DOT_BIN, e === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL, e);
const tally = new Map<string, number>();
console.log('probe\tengine\tformat\tbase\thead\tmoved');
const files = readdirSync(dir).filter((x) => x.endsWith('.gv')).sort()
  .filter((x) => ONLY === undefined || ONLY.includes(x.replace(/\.gv$/, '')));
for (const f of files) {
  const file = join(dir, f);
  for (const engine of ENGINES) for (const fmt of FORMATS) {
    const n = native(engine, fmt, file);
    const cls = (r: Run) => norm(fmt, r.out) !== norm(fmt, n.out) ? 'out' : r.err !== n.err ? 'err' : 'eq';
    const b = port(baseB, engine, fmt, file);
    const h = headB ? port(headB, engine, fmt, file) : null;
    const bc = cls(b); const hc = h ? cls(h) : '-';
    const moved = h && (h.out !== b.out || h.err !== b.err) ? 'y' : 'n';
    if (OUT) {
      mkdirSync(OUT, { recursive: true });
      const stem = join(OUT, `${f.replace(/\.gv$/, '')}.${engine}.${fmt}`);
      writeFileSync(`${stem}.native`, norm(fmt, n.out) + (n.err ? `\n--stderr--\n${n.err}` : ''));
      writeFileSync(`${stem}.base`, norm(fmt, b.out) + (b.err ? `\n--stderr--\n${b.err}` : ''));
      if (h) writeFileSync(`${stem}.head`, norm(fmt, h.out) + (h.err ? `\n--stderr--\n${h.err}` : ''));
    }
    const key = `base=${bc} head=${hc}`; tally.set(key, (tally.get(key) ?? 0) + 1);
    console.log([f.replace(/\.gv$/, ''), engine, fmt, bc, hc, moved].join('\t'));
  }
}
for (const [k, v] of [...tally].sort()) console.error(`${k}\t${v}`);
