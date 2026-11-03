// Part-8 T0: runs the part-7 T5 native VPSC harness on the three tie cases 8 times
// each, varying environment size and MallocNanoZone, and writes one output per run
// under runs/ with the input script and a summary of the distinct variants.
// usage: node runs.mjs <harness binary> <out dir>
// Case generators are copied verbatim from ../../../post-16-1-followups-7/harness/T5/gen.mjs
// (same seeds, so the inputs equal the committed quad-prog-vpsc fixture's).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [HARNESS, OUT] = process.argv.slice(2);
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

function dag(nv, ne, rnd, layers) {
  const adj = Array.from({ length: nv }, () => new Map());
  let made = 0;
  const level = (i) => (layers ? i % layers : i);
  while (made < ne) {
    const a = Math.floor(rnd() * nv);
    const b = Math.floor(rnd() * nv);
    if (a === b || adj[a].has(b)) continue;
    if (layers && Math.abs(level(a) - level(b)) !== 1) continue;
    const [u, v] = level(a) < level(b) ? [a, b] : [b, a];
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
  const t = ['HDR', c.n, c.clusters.length];
  for (const cl of c.clusters) t.push(cl.length, ...cl);
  t.push(c.toplevel.length, ...c.toplevel, c.edgeGap, c.gap[0], c.gap[1]);
  for (const s of c.nsize) t.push(s[0], s[1]);
  if (c.graph) {
    t.push(1);
    for (const r of c.graph) t.push(r.edges.length, ...r.edges, ...r.ewgts, ...r.edists);
  } else t.push(0);
  if (c.packed) t.push(1, ...c.packed);
  else t.push(0);
  return t.join(' ');
}

function opLine(o) {
  switch (o.op) {
    case 'INIT': return `INIT ${o.diredges}`;
    case 'SRAND': return `SRAND ${o.seed}`;
    case 'CMV': return ['CMV', o.iters, ...o.b, ...o.place].join(' ');
    case 'GNC': return ['GNC', o.scale, o.k, o.tc ? 1 : 0, ...o.coords[0], ...o.coords[1]].join(' ');
    case 'CMVK': return ['CMVK', o.iters, ...o.b].join(' ');
    case 'GNCK': return ['GNCK', o.scale, o.k, o.tc ? 1 : 0, ...o.x].join(' ');
    case 'DEL': return 'DEL';
    case 'RM': return ['RM', ...o.coords[0], ...o.coords[1]].join(' ');
  }
  throw new Error(o.op);
}

function base(name, seed, nv, opts = {}) {
  const rnd = mulberry32(seed);
  const clusters = opts.clusters ?? [];
  const n = nv + 2 * clusters.length;
  const inCl = new Set(clusters.flat());
  const toplevel = [];
  for (let i = 0; i < nv; i++) if (!inCl.has(i)) toplevel.push(i);
  const nsize = Array.from({ length: nv }, () => [0.5 + rnd(), 0.4 + 0.6 * rnd()]);
  const graph = opts.edges ? dag(nv, opts.edges, rnd, opts.layers) : null;
  const packed = opts.noMat ? null : packedLap(n, rnd);
  return { name, n, clusters, toplevel, edgeGap: opts.edgeGap ?? 1, gap: opts.gap ?? [0.25, 0.2],
    nsize, graph, packed, rnd, ops: [] };
}

const cmv = (c, iters, spread = 6) => ({ op: 'CMV', iters, b: bvec(c.n, c.rnd), place: vec(c.n, c.rnd, -spread, spread) });
const coords = (c, spread) => [vec(c.n, c.rnd, -spread, spread), vec(c.n, c.rnd, -spread, spread)];

const cases = [];
{
  const c = base('dir1 n40', 23, 40, { edges: 70 });
  const b = bvec(c.n, c.rnd), p = vec(c.n, c.rnd, -6, 6);
  c.ops.push({ op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 1, b, place: p }, { op: 'DEL' },
    { op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 100, b, place: p }, { op: 'DEL' });
  cases.push(c);
}
{
  const c = base('noverlap1 dir2 n10', 43, 10, { edges: 12, layers: 3 });
  c.ops.push({ op: 'SRAND', seed: 1 }, { op: 'INIT', diredges: 2 }, cmv(c, 30),
    { op: 'GNCK', scale: 0.1, k: 1, tc: false, x: vec(c.n, c.rnd, -1.5, 1.5) }, { op: 'CMVK', iters: 20, b: bvec(c.n, c.rnd) },
    { op: 'GNCK', scale: 0.6, k: 1, tc: false, x: vec(c.n, c.rnd, -1.5, 1.5) }, { op: 'CMVK', iters: 20, b: bvec(c.n, c.rnd) },
    { op: 'DEL' });
  cases.push(c);
}
{
  const c = base('cluster dir0', 61, 10, { clusters: [[1, 2, 3], [5, 6, 8]] });
  const xy = coords(c, 1.5);
  c.ops.push({ op: 'INIT', diredges: 0 }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: vec(c.n, c.rnd, -2, 2) },
    { op: 'GNC', scale: 0.5, k: 0, tc: true, coords: xy }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: xy[0] },
    { op: 'GNC', scale: 1, k: 1, tc: false, coords: xy }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: xy[1] },
    { op: 'DEL' }, { op: 'RM', coords: coords(c, 1.5) });
  cases.push(c);
}

/** The eight environments: unset, env sizes, and MallocNanoZone off or on. */
const pad = (n) => 'x'.repeat(n);
const ENVS = [
  { tag: 'default', add: {} },
  { tag: 'X=1', add: { X: '1' } },
  { tag: 'pad1k', add: { PAD: pad(1024) } },
  { tag: 'pad8k', add: { PAD: pad(8192) } },
  { tag: 'nano0', add: { MallocNanoZone: '0' } },
  { tag: 'nano0-X=1', add: { MallocNanoZone: '0', X: '1' } },
  { tag: 'nano0-pad1k', add: { MallocNanoZone: '0', PAD: pad(1024) } },
  { tag: 'nano1', add: { MallocNanoZone: '1' } },
];

fs.mkdirSync(OUT, { recursive: true });
const summary = {};
for (const c of cases) {
  const slug = c.name.replaceAll(' ', '-');
  const script = [header(c), ...c.ops.map(opLine), 'END'].join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, `${slug}.in`), script);
  const runs = ENVS.map((e, k) => {
    const r = spawnSync(HARNESS, { input: script, env: { ...process.env, ...e.add }, encoding: 'utf8', maxBuffer: 1 << 26 });
    fs.writeFileSync(path.join(OUT, `${slug}.run${k + 1}.out`), r.stdout);
    const hash = createHash('sha256').update(r.stdout).digest('hex').slice(0, 12);
    return { run: k + 1, env: e.tag, rc: r.status, hash };
  });
  summary[c.name] = { runs, distinct: new Set(runs.map((r) => r.hash)).size };
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const [name, s] of Object.entries(summary)) {
  console.log(name, 'distinct', s.distinct, s.runs.map((r) => `${r.env}:${r.rc}:${r.hash.slice(0, 6)}`).join(' '));
}
