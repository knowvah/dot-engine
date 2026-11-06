// SPDX-License-Identifier: EPL-2.0
// Compares the port's renders of each subg-* case (harness/T0, subg-after-free.c's modes root and
// nofree) with one native run directory from variance.sh (default: the noaddr arm, run 1).
// xdot: test/golden/compare-xdot.ts (it parses, so native's backslash-newline wrap of long strings
// is invisible) plus a byte compare with "\\\n" removed from both sides. svg: byte compare with the
// top <g id="graphN"> normalized (T9 owns that id).
// Usage (from the repo root): npx tsx plans/post-16-1-followups-11/harness/T7/port-vs-native.ts <native-run-dir> [outdir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from '../../../../src/parser/index.js';
import { createDefaultContext } from '../../../../src/gvc/default-context.js';
import { render as deviceRender } from '../../../../src/gvc/device.js';
import type { EngineName, GvcContext } from '../../../../src/gvc/context.js';
import type { Graph } from '../../../../src/model/graph.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../../test/golden/compare-xdot.js';

const here = new URL('.', import.meta.url);
const SOURCE = readFileSync(new URL('../T0/subg.gv', here), 'latin1');
const nativeDir = process.argv[2];
const outDir = process.argv[3];
if (outDir) mkdirSync(outDir, { recursive: true });

const show = (ctx: GvcContext, g: Graph, fmt: 'xdot' | 'svg'): string => deviceRender(ctx, g, fmt);

function port(engine: EngineName, sub: string, mode: string, fmt: 'xdot' | 'svg'): string[] {
  const g = parse(SOURCE);
  const s = g.subgraphs.get(sub);
  if (!s) throw new Error(`no subgraph ${sub}`);
  const ctx = createDefaultContext();
  const out: string[] = [];
  ctx.layout(g, engine);
  out.push(show(ctx, g, fmt));
  if (mode !== 'nofree') ctx.freeLayout(g, engine);
  ctx.layout(s, engine);
  out.push(show(ctx, s, fmt));
  ctx.freeLayout(s, engine);
  if (mode === 'root') {
    ctx.layout(g, engine);
    out.push(show(ctx, g, fmt));
    ctx.freeLayout(g, engine);
  }
  return out;
}

const unwrap = (x: string): string => x.replace(/\\\n/g, '');
const svgNorm = (x: string): string => x.replace(/<g id="graph\d+"/, '<g id="graphN"');
const lineDiffs = (a: string, b: string): number => {
  const x = a.split('\n'); const y = b.split('\n');
  let n = Math.abs(x.length - y.length);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) n++;
  return n;
};

for (const engine of ['fdp', 'osage'] as EngineName[]) {
  for (const sub of ['s', 'cluster_k']) {
    for (const mode of ['root', 'nofree']) {
      for (const fmt of ['xdot', 'svg'] as const) {
        const k = `subg-${engine}.${sub}.${mode}.${fmt}`;
        const nat = readFileSync(`${nativeDir}/${k}`, 'latin1').split(/^== render \d+\n/m).slice(1);
        const ours = port(engine, sub, mode, fmt);
        if (outDir) ours.forEach((r, i) => writeFileSync(`${outDir}/${k}.r${i + 1}`, r));
        const cells = ours.map((r, i) => {
          const n = nat[i];
          if (n === undefined) return `r${i + 1}: no native`;
          if (fmt === 'svg') {
            const d = lineDiffs(svgNorm(r), svgNorm(n));
            return `r${i + 1}: ${d === 0 ? 'bytes=' : `${d} lines differ`}`;
          }
          const bytes = unwrap(r) === unwrap(n);
          const diffs = compareXdot(r, n, XDOT_TOLERANCE + 1e-9).diffs.length;
          return `r${i + 1}: ${bytes ? 'bytes=' : `${lineDiffs(unwrap(r), unwrap(n))} lines differ`} cmp=${diffs}`;
        });
        console.log(`${k}  ${cells.join('  ')}`);
      }
    }
  }
}
