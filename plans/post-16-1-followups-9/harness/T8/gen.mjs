// T8: writes the `dir1 n40` fixture from one output of harness-ordered (build.sh).
// The case generator is copied from part 8's harness/T0/runs.mjs (same seed), and the script it
// prints must equal part 8's committed input, or this throws.
// usage: node gen.mjs <harness-ordered> <out.ts>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [HARNESS, OUT] = process.argv.slice(2);
const T0_INPUT = new URL('../../../post-16-1-followups-8/harness/T0/runs/dir1-n40.in', import.meta.url);
const fr = Math.fround;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function packedLap(n, rnd) {
  const w = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = 1 + 2 * rnd();
    w[i][j] = w[j][i] = fr(1 / (d * d));
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) if (j !== i) s = fr(s + w[i][j]);
    for (let j = i; j < n; j++) out.push(j === i ? -s : w[i][j]);
  }
  return out;
}

const vec = (n, rnd, lo, hi) => Array.from({ length: n }, () => fr(lo + (hi - lo) * rnd()));
const bvec = (n, rnd) => {
  const v = vec(n, rnd, -3, 3);
  const mean = v.reduce((a, x) => a + x, 0) / n;
  return v.map((x) => fr(x - mean));
};

function dag(nv, ne, rnd) {
  const adj = Array.from({ length: nv }, () => new Map());
  let made = 0;
  while (made < ne) {
    const a = Math.floor(rnd() * nv);
    const b = Math.floor(rnd() * nv);
    if (a === b || adj[a].has(b)) continue;
    const [u, v] = a < b ? [a, b] : [b, a];
    adj[u].set(v, 1);
    adj[v].set(u, -1);
    made++;
  }
  return adj.map((m, i) => {
    const edges = [i, ...m.keys()];
    return { edges, ewgts: edges.map((_, k) => (k === 0 ? 0 : 1)), edists: [0, ...m.values()] };
  });
}

function header(c) {
  const t = ['HDR', c.n, 0, c.toplevel.length, ...c.toplevel, c.edgeGap, c.gap[0], c.gap[1]];
  for (const s of c.nsize) t.push(s[0], s[1]);
  t.push(1);
  for (const r of c.graph) t.push(r.edges.length, ...r.edges, ...r.ewgts, ...r.edists);
  t.push(1, ...c.packed);
  return t.join(' ');
}

const opLine = (o) => (o.op === 'INIT' ? `INIT ${o.diredges}`
  : o.op === 'DEL' ? 'DEL' : ['CMV', o.iters, ...o.b, ...o.place].join(' '));

const NV = 40;
const rnd = mulberry32(23);
const nsize = Array.from({ length: NV }, () => [0.5 + rnd(), 0.4 + 0.6 * rnd()]);
const graph = dag(NV, 70, rnd);
const packed = packedLap(NV, rnd);
const b = bvec(NV, rnd);
const place = vec(NV, rnd, -6, 6);
const c = {
  name: 'dir1 n40', n: NV, clusters: [], toplevel: Array.from({ length: NV }, (_, i) => i),
  edgeGap: 1, gap: [0.25, 0.2], nsize, graph, packed,
  ops: [
    { op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 1, b, place }, { op: 'DEL' },
    { op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 100, b, place }, { op: 'DEL' },
  ],
};
const script = [header(c), ...c.ops.map(opLine), 'END'].join('\n') + '\n';
if (script !== fs.readFileSync(T0_INPUT, 'utf8')) throw new Error('input differs from part 8 T0');

const lines = execFileSync(HARNESS, { input: script, encoding: 'utf8', maxBuffer: 1 << 26 }).trim().split('\n');
let at = 0;
for (const o of c.ops) {
  const words = lines[at++].split(' ');
  if (o.op === 'INIT') {
    const [nv, nldv, ndv, gm, m] = words.slice(2).map(Number);
    o.expect = { nv, nldv, ndv, gm, m };
  } else if (o.op === 'CMV') {
    o.expect = { ret: Number(words[1]), place: lines[at++].split(' ').slice(1).map(Number) };
  }
}

const head = `// SPDX-License-Identifier: EPL-2.0
/**
 * "dir1 n40" of the quad_prog_vpsc tests, from harness-ordered: the part-7
 * native harness linked with a scratch lib/vpsc whose \`Blocks\` is ordered by
 * a Block creation index and is otherwise the oracle's (graphviz 16.1.0). That
 * build gave 1 stdout in 332 runs across environments; the unpatched library
 * gave 17 in 332, none of them this one. See
 * plans/post-16-1-followups-9/harness/T8/.
 * Generated data: do not hand-edit (harness/T8/gen.mjs).
 */

import type { VpscCase } from './quad-prog-vpsc.js';

export const DIR1_N40: VpscCase = `;
fs.writeFileSync(OUT, `${head}${JSON.stringify(c)};\n`);
console.log(c.ops.map((o) => o.op + (o.op === 'CMV' ? `:${o.expect.ret}` : '')).join(' '));
