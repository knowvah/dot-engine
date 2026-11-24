// SPDX-License-Identifier: EPL-2.0
// The port's json/json0 of subgraph `s` alone (as build.sh's subonly mode),
// compared with native's, for each subrender/*.gv. Imports the port from
// <src-root> (a checkout's src/), so base and head can both be run:
//   [OUT=dir] npx tsx subrender/port.ts <src-root> <native-dir>
// Prints one row per probe and format: eq when the parsed json (keys sorted,
// array order kept) and stderr equal native's.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [srcRoot, nativeDir] = process.argv.slice(2);
const here = new URL('.', import.meta.url).pathname;
const imp = (p: string): Promise<Record<string, unknown>> => import(pathToFileURL(join(resolve(srcRoot), p)).href);
const { parse } = await imp('parser/index.ts') as { parse: (s: string) => { subgraphs: Map<string, unknown> } };
const { createDefaultContext } = await imp('gvc/default-context.ts') as {
  createDefaultContext: () => { layout: (g: unknown, e: string) => void; freeLayout: (g: unknown, e: string) => void };
};
const { render } = await imp('gvc/device.ts') as { render: (c: unknown, g: unknown, f: string) => string };
function sortKeys(_k: string, v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}
const norm = (s: string): string => JSON.stringify(JSON.parse(s), sortKeys, 1);
console.log('probe\tformat\tport');
for (const f of readdirSync(here).filter((x) => x.endsWith('.gv')).sort()) {
  const b = f.replace(/\.gv$/, '');
  for (const fmt of ['json', 'json0']) {
    const errs: string[] = [];
    const sink = (...a: unknown[]): void => { errs.push(a.map(String).join(' ')); };
    console.warn = sink; console.error = sink;
    const sg = parse(readFileSync(join(here, f), 'utf8')).subgraphs.get('s');
    const ctx = createDefaultContext();
    ctx.layout(sg, 'dot');
    const out = render(ctx, sg, fmt);
    ctx.freeLayout(sg, 'dot');
    const nOut = readFileSync(join(nativeDir, `${b}.s.${fmt}`), 'utf8');
    const nErr = readFileSync(join(nativeDir, `${b}.s.${fmt}.stderr`), 'utf8').split('\n').filter((l) => l !== '');
    const cls = norm(out) !== norm(nOut) ? 'out' : errs.join('\n') !== nErr.join('\n') ? 'err' : 'eq';
    if (process.env.OUT) {
      mkdirSync(process.env.OUT, { recursive: true });
      writeFileSync(join(process.env.OUT, `${b}.s.${fmt}.port`), norm(out));
      writeFileSync(join(process.env.OUT, `${b}.s.${fmt}.native`), norm(nOut));
    }
    process.stdout.write(`${b}\t${fmt}\t${cls}\n`);
  }
}
