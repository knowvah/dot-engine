// SPDX-License-Identifier: EPL-2.0
// Runs the port's fdp with port-trace.patch applied to src/ (temporary; revert before any commit)
// and writes the trace lines to <out>. Rendered xdot goes to stdout.
//   first render of a file:   port-trace.ts <file> <out> [native.tr]
//   #142's sequence:          port-trace.ts --subg <file> <subgraph> <out> [native.tr]
//     (subg-after-free.c's `root` mode: layout+render root, free, layout+render the subgraph, free,
//      layout+render root; each render follows a "== render N" line, as the C driver prints)
// With <native.tr>, the counterfactual: every traced libm call (atan2, cos, sin) returns native's
// traced result whenever its arguments equal a native `libm` line bit for bit; a miss is traced as
// `cf.miss` and falls back to V8. The calls where V8 differs from native go to stderr. If the port
// then equals native to the end, those libm calls are the only cause of the drift.
// Usage: from the repo root, with npx tsx.
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const subg = argv[0] === '--subg';
if (subg) argv.shift();
const file = argv.shift();
const subName = subg ? argv.shift() : undefined;
const [out, nativeTrace] = argv;
if (!file || !out) throw new Error('usage: port-trace.ts [--subg] <file> [<subgraph>] <out> [native.tr]');

/** Parses a C hex float (0x1.8p+1, -0x0p+0). */
function parseHex(s: string): number {
  const m = /^(-?)0x([01])(?:\.([0-9a-f]*))?p([-+]\d+)$/.exec(s);
  if (!m) throw new Error(`not a hex float: ${s}`);
  const mant = Number(BigInt(`0x${m[2]}${(m[3] ?? '').padEnd(13, '0')}`));
  return (m[1] ? -1 : 1) * mant * 2 ** (Number(m[4]) - 52);
}

const lines: string[] = [];
const diffs: string[] = [];
const hooks = globalThis as {
  __tr142?: (s: string) => void; __libm142?: Map<string, number>; __libmdiff142?: string[];
};
hooks.__tr142 = (s) => { lines.push(s); };
if (nativeTrace) {
  const table = new Map<string, number>();
  for (const line of readFileSync(nativeTrace, 'utf8').split('\n')) {
    const m = /^libm (.+) = (\S+)$/.exec(line);
    if (m) table.set(m[1]!, parseHex(m[2]!));
  }
  hooks.__libm142 = table;
  hooks.__libmdiff142 = diffs;
}

const source = readFileSync(file, 'latin1');
if (subName === undefined) {
  const { parse, render } = await import('../../../src/index.js');
  process.stdout.write(render(parse(source), 'xdot', { engine: 'fdp' }));
} else {
  const { parse } = await import('../../../src/parser/index.js');
  const { createDefaultContext } = await import('../../../src/gvc/default-context.js');
  const { render: deviceRender } = await import('../../../src/gvc/device.js');
  const g = parse(source);
  const s = g.subgraphs.get(subName);
  if (!s) throw new Error(`no subgraph ${subName}`);
  const ctx = createDefaultContext();
  let n = 0;
  const show = (x: typeof g): void => { process.stdout.write(`== render ${++n}\n${deviceRender(ctx, x, 'xdot')}`); };
  ctx.layout(g, 'fdp'); show(g); ctx.freeLayout(g, 'fdp');
  ctx.layout(s, 'fdp'); show(s); ctx.freeLayout(s, 'fdp');
  ctx.layout(g, 'fdp'); show(g); ctx.freeLayout(g, 'fdp');
}
writeFileSync(out, lines.join('\n') + '\n');
if (nativeTrace) {
  const misses = lines.filter((l) => l.startsWith('cf.miss')).length;
  const calls = lines.filter((l) => l.startsWith('libm ')).length;
  console.error(`libm calls=${calls} injected-where-v8-differs=${diffs.length} misses=${misses}`);
  for (const d of diffs) console.error(`  ${d}`);
}
