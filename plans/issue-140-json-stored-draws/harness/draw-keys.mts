// SPDX-License-Identifier: EPL-2.0
// Issue #140 survey probe: one input, one engine. Prints one JSON line comparing every
// object's xdot draw attributes (`_draw_` .. `_tldraw_`, plus `xdotversion`) in the port's
// -Tjson with native's. Op arrays compare after JSON.parse (3.0 and 3 are equal).
//   npx tsx plans/issue-140-json-stored-draws/harness/draw-keys.mts <file> <engine> <gvbindir>
// Run one process per input: port module statics carry across renders (follow-up 42).
// Output: {file, engine, native: "ok"|"fail", objects, diffs, samples}
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const REPO = new URL('../../../', import.meta.url);
const { parse } = await import(new URL('src/parser/index.ts', REPO).href);
const { renderFormat } = await import(new URL('test/helpers/render-format.ts', REPO).href);

const KEYS = ['_draw_', '_ldraw_', '_hdraw_', '_tdraw_', '_hldraw_', '_tldraw_', 'xdotversion'];
const ORACLE = `${os.homedir()}/git/graphviz/build/cmd/dot/dot`;
const [file = '', engine = 'dot', gvbindir = '/tmp/ghl'] = process.argv.slice(2);
type Obj = Record<string, unknown>;

/** Every json object by a stable key: the root, `objects` by name, `edges` by tail/head/order. */
function objectsOf(text: string): Map<string, Obj> {
  const root = JSON.parse(text) as Obj & { objects?: Obj[]; edges?: Obj[] };
  const out = new Map<string, Obj>([['<root>', root]]);
  for (const o of root.objects ?? []) out.set(`o:${String(o['name'])}:${String(o['_gvid'])}`, o);
  const seen = new Map<string, number>();
  for (const e of root.edges ?? []) {
    const base = `e:${String(e['tail'])}>${String(e['head'])}`;
    const k = seen.get(base) ?? 0;
    seen.set(base, k + 1);
    out.set(`${base}#${k}`, e);
  }
  return out;
}

/** As test/tools/bd-job.ts: UTF-8 when the bytes are valid UTF-8, else Latin-1. */
function decode(buf: Buffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return buf.toString('latin1'); }
}
const nat = spawnSync(ORACLE, [`-K${engine}`, '-Tjson', file], {
  env: { ...process.env, GVBINDIR: gvbindir }, maxBuffer: 1 << 28, timeout: 120_000,
});
if (nat.status !== 0) {
  console.log(JSON.stringify({ file, engine, native: 'fail', err: String(nat.stderr).slice(0, 160) }));
  process.exit(0);
}
const native = objectsOf(String(nat.stdout));
const port = objectsOf(renderFormat(parse(decode(fs.readFileSync(file))), 'json', engine));
let diffs = 0;
const samples: string[] = [];
for (const [k, n] of native) {
  const p = port.get(k) ?? {};
  for (const key of KEYS) {
    if (JSON.stringify(n[key]) === JSON.stringify(p[key])) continue;
    diffs++;
    if (samples.length < 3) samples.push(`${k}.${key} native=${JSON.stringify(n[key])?.slice(0, 60)} port=${JSON.stringify(p[key])?.slice(0, 60)}`);
  }
}
for (const k of port.keys()) if (!native.has(k)) { diffs++; if (samples.length < 3) samples.push(`${k} port-only`); }
console.log(JSON.stringify({ file, engine, native: 'ok', objects: native.size, diffs, samples }));
