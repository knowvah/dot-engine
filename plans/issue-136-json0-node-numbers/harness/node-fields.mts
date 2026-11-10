// SPDX-License-Identifier: EPL-2.0
// Issue #136 survey probe: one input, one engine. Prints one JSON line comparing the
// port's json0 node `pos`/`width`/`height` with native's, and with the port's own -Tjson
// values (the xdot path, which already formats them as attach_attrs does).
//   npx tsx plans/issue-136-json0-node-numbers/harness/node-fields.mts <file> <engine> <gvbindir>
// Run one process per input: port module statics carry across renders (follow-up 42).
// Output: {file, engine, nodes, native: "ok"|"fail", diffs: {key: count}, vsJson: count, samples}
//   diffs   json0 port vs native, per key, over nodes present on both sides
//   vsJson  json0 port vs json port, same keys (0 after the fix)
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const REPO = new URL('../../../', import.meta.url);
const { parse } = await import(new URL('src/parser/index.ts', REPO).href);
const { renderFormat } = await import(new URL('test/helpers/render-format.ts', REPO).href);

const KEYS = ['pos', 'width', 'height'] as const;
const ORACLE = `${os.homedir()}/git/graphviz/build/cmd/dot/dot`;
const [file = '', engine = 'dot', gvbindir = '/tmp/ghl'] = process.argv.slice(2);
type Obj = Record<string, unknown>;

/** Node objects by name: json's objects array minus (sub)graph entries. */
function nodesOf(text: string): Map<string, Obj> {
  const root = JSON.parse(text) as { objects?: Obj[] };
  const isGraph = (o: Obj): boolean => 'bb' in o || 'nodes' in o || 'subgraphs' in o || 'edges' in o;
  return new Map((root.objects ?? []).filter((o) => !isGraph(o)).map((o) => [String(o.name), o]));
}

/** As test/tools/bd-job.ts: UTF-8 when the bytes are valid UTF-8, else Latin-1. */
function decode(buf: Buffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return buf.toString('latin1'); }
}
// Native reads the file itself. Planning piped a UTF-8-decoded string to stdin, which turned
// graphs-b56's Latin-1 label bytes into U+FFFD on both sides (decisions.md AD-3's 33 fields).
const src = decode(fs.readFileSync(file));
const nat = spawnSync(ORACLE, [`-K${engine}`, '-Tjson0', file], {
  env: { ...process.env, GVBINDIR: gvbindir }, maxBuffer: 1 << 28, timeout: 120_000,
});
if (nat.status !== 0) {
  console.log(JSON.stringify({ file, engine, native: 'fail', err: String(nat.stderr).slice(0, 160) }));
  process.exit(0);
}
const native = nodesOf(String(nat.stdout));
const json0 = nodesOf(renderFormat(parse(src), 'json0', engine));
const json = nodesOf(renderFormat(parse(src), 'json', engine));
const diffs: Record<string, number> = {};
const samples: string[] = [];
let vsJson = 0;
for (const [name, n] of native) {
  const p = json0.get(name);
  if (p === undefined) { diffs.missingNode = (diffs.missingNode ?? 0) + 1; continue; }
  for (const k of KEYS) {
    if (p[k] !== json.get(name)?.[k]) vsJson++;
    if (p[k] === n[k]) continue;
    diffs[k] = (diffs[k] ?? 0) + 1;
    if (samples.length < 3) samples.push(`${name}.${k} native=${String(n[k])} port=${String(p[k])}`);
  }
}
console.log(JSON.stringify({ file, engine, nodes: native.size, native: 'ok', diffs, vsJson, samples }));
