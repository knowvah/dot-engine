// Generates T5 harness cases, runs the native harness, writes the TS fixture.
// usage: node gen.mjs <out.ts>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
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

/** Packed negated Laplacian (off-diagonal 1/d^2 > 0, diagonal -rowsum), float. */
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
/** A right-hand side orthogonal to 1 (as cola's b = lap1 * coords), so the quadratic is bounded. */
const bvec = (n, rnd) => {
  const v = vec(n, rnd, -3, 3);
  const mean = v.reduce((a, x) => a + x, 0) / n;
  return v.map((x) => fr(x - mean));
};

/** Random DAG rows (vtx_data with edists): edge i->j for i<j gets edists +1 at i, -1 at j. */
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

function run(c) {
  console.error('case', c.name);
  const script = [header(c), ...c.ops.map(opLine), 'END'].join('\n') + '\n';
  const out = execFileSync(path.join(HERE, 'harness'), { input: script }).toString().trim().split('\n');
  let li = 0;
  const nums = (line, tag) => {
    const p = line.split(' ');
    if (p[0] !== tag) throw new Error(`${c.name}: expected ${tag}, got ${line}`);
    return p.slice(1).map(Number);
  };
  for (const o of c.ops) {
    const line = out[li++];
    if (o.op === 'INIT') {
      const p = line.split(' ');
      o.expect = p[1] === 'null' ? null : { nv: +p[2], nldv: +p[3], ndv: +p[4], gm: +p[5], m: +p[6] };
    } else if (o.op === 'CMV') {
      o.expect = { ret: nums(line, 'cmv')[0], place: nums(out[li++], 'place') };
    } else if (o.op === 'CMVK') {
      o.expect = { ret: nums(line, 'cmv')[0], place: nums(out[li++], 'place') };
    } else if (o.op === 'GNC' || o.op === 'GNCK') {
      const [m, gm] = nums(line, 'gnc');
      const cs = [];
      for (let i = 0; i < m; i++) cs.push(nums(out[li++], 'c'));
      const bb = [];
      for (let i = 0; i < c.clusters.length; i++) bb.push(nums(out[li++], 'bb'));
      o.expect = { m, gm, cs, bb };
    } else if (o.op === 'SRAND') {
      if (line !== 'srand') throw new Error(line);
    } else if (o.op === 'DEL') {
      if (line !== 'del') throw new Error(line);
    } else if (o.op === 'RM') {
      if (line !== 'rm') throw new Error(line);
      o.expect = { x: nums(out[li++], 'x'), y: nums(out[li++], 'y') };
    }
  }
  return c;
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
// diredges 0, no constraints: scalar (n=3), 4-block + scalar (n=7), 16 + 4 + scalar (n=23)
for (const [nv, seed] of [[3, 11], [7, 12], [23, 13], [18, 14]]) {
  const c = base(`dir0 n${nv}`, seed, nv);
  const b = bvec(c.n, c.rnd), p = vec(c.n, c.rnd, -6, 6);
  c.ops.push({ op: 'INIT', diredges: 0 }, { op: 'CMV', iters: 1, b, place: p }, { op: 'DEL' },
    { op: 'INIT', diredges: 0 }, { op: 'CMV', iters: 200, b, place: p }, { op: 'CMV', iters: 0, b, place: p }, { op: 'DEL' });
  cases.push(c);
}
// diredges 1: one constraint per directed edge
for (const [nv, ne, seed] of [[6, 7, 21], [20, 34, 22], [40, 70, 23]]) {
  const c = base(`dir1 n${nv}`, seed, nv, { edges: ne });
  const b = bvec(c.n, c.rnd), p = vec(c.n, c.rnd, -6, 6);
  c.ops.push({ op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 1, b, place: p }, { op: 'DEL' },
    { op: 'INIT', diredges: 1 }, { op: 'CMV', iters: 100, b, place: p }, { op: 'DEL' });
  cases.push(c);
}
// diredges 2: DiG-CoLa levels
for (const [nv, ne, seed, layers] of [[9, 12, 31, 0], [23, 30, 32, 3]]) {
  const c = base(`dir2 n${nv}`, seed, nv, { edges: ne, edgeGap: 0.5, layers });
  const b = bvec(c.n, c.rnd), p = vec(c.n, c.rnd, -6, 6);
  c.ops.push({ op: 'SRAND', seed: 1 }, { op: 'INIT', diredges: 2 }, { op: 'CMV', iters: 1, b, place: p }, { op: 'DEL' },
    { op: 'SRAND', seed: 1 }, { op: 'INIT', diredges: 2 }, { op: 'CMV', iters: 100, b, place: p }, { op: 'DEL' });
  cases.push(c);
}
// noverlap 1: overlap constraints regenerated per pass, with and without global constraints
{
  const c = base('noverlap1 dir0 n8', 41, 8);
  const xy = coords(c, 1.5);
  c.ops.push({ op: 'INIT', diredges: 0 },
    { op: 'GNC', scale: 0.1, k: 0, tc: false, coords: xy }, { op: 'CMV', iters: 20, b: bvec(c.n, c.rnd), place: xy[0] },
    { op: 'GNC', scale: 0.6, k: 0, tc: true, coords: xy }, { op: 'CMV', iters: 20, b: bvec(c.n, c.rnd), place: xy[0] },
    { op: 'GNC', scale: 1, k: 1, tc: false, coords: xy }, { op: 'CMV', iters: 20, b: bvec(c.n, c.rnd), place: xy[1] },
    { op: 'DEL' });
  cases.push(c);
}
for (const [dir, nv, ne, seed] of [[1, 12, 16, 42], [2, 10, 12, 43]]) {
  const c = base(`noverlap1 dir${dir} n${nv}`, seed, nv, { edges: ne, layers: dir === 2 ? 3 : 0 });
  c.ops.push({ op: 'SRAND', seed: 1 }, { op: 'INIT', diredges: dir }, cmv(c, 30),
    { op: 'GNCK', scale: 0.1, k: 1, tc: false, x: vec(c.n, c.rnd, -1.5, 1.5) }, { op: 'CMVK', iters: 20, b: bvec(c.n, c.rnd) },
    { op: 'GNCK', scale: 0.6, k: 1, tc: false, x: vec(c.n, c.rnd, -1.5, 1.5) }, { op: 'CMVK', iters: 20, b: bvec(c.n, c.rnd) },
    { op: 'DEL' });
  cases.push(c);
}
// noverlap 2: removeoverlaps
for (const [nv, seed, spread] of [[8, 51, 1], [25, 52, 2.5]]) {
  const c = base(`noverlap2 n${nv}`, seed, nv, { noMat: true });
  c.ops.push({ op: 'RM', coords: coords(c, spread) });
  cases.push(c);
}
// clusters: containment constraints, cluster non-overlap, removeoverlaps
{
  const c = base('cluster dir0', 61, 10, { clusters: [[1, 2, 3], [5, 6, 8]] });
  const xy = coords(c, 1.5);
  c.ops.push({ op: 'INIT', diredges: 0 }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: vec(c.n, c.rnd, -2, 2) },
    { op: 'GNC', scale: 0.5, k: 0, tc: true, coords: xy }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: xy[0] },
    { op: 'GNC', scale: 1, k: 1, tc: false, coords: xy }, { op: 'CMV', iters: 30, b: bvec(c.n, c.rnd), place: xy[1] },
    { op: 'DEL' }, { op: 'RM', coords: coords(c, 1.5) });
  cases.push(c);
}
{
  const c = base('cluster dir1', 63, 12, { clusters: [[0, 4, 7, 9], [2, 3]], edges: 8 });
  c.ops.push({ op: 'INIT', diredges: 1 }, cmv(c, 30),
    { op: 'GNCK', scale: 0.8, k: 1, tc: false, x: vec(c.n, c.rnd, -2, 2) }, { op: 'CMVK', iters: 30, b: bvec(c.n, c.rnd) },
    { op: 'DEL' });
  cases.push(c);
}

for (const c of cases) run(c);

const strip = (c) => {
  const { rnd, ...rest } = c;
  return rest;
};
const head = `// SPDX-License-Identifier: EPL-2.0
/**
 * Expected results for the T5 quad_prog_vpsc tests, captured from a native
 * clang -O3 -flto=thin -arch arm64 (-DDIGCOLA -DIPSEPCOLA) harness that links
 * the oracle's own lib/neatogen and lib/vpsc (graphviz 16.1.0) and calls
 * initCMajVPSC, constrained_majorization_vpsc, generateNonoverlapConstraints,
 * removeoverlaps and deleteCMajEnvVPSC in the listed order on one environment.
 * The harness copies of those functions disassemble to the same instruction
 * stream as libgvplugin_neato_layout.8.0.15.dylib's.
 * Floats are printed as %.17g of the float value; constraint gaps are doubles.
 * Inputs are seeded pseudo-random (mulberry32). Generated data: do not hand-edit
 * (regenerate with the harness kept beside the T5 hand-back).
 */

import type { IpsepOptions } from '../quad-prog-vpsc.js';
import type { DirectedVtxData } from '../opt-arrangement.js';

/** One harness step and its native result. */
export type VpscOp =
  | { readonly op: 'INIT'; readonly diredges: 0 | 1 | 2;
      readonly expect: { nv: number; nldv: number; ndv: number; gm: number; m: number } | null }
  | { readonly op: 'CMV'; readonly iters: number; readonly b: readonly number[]; readonly place: readonly number[];
      readonly expect: { ret: number; place: readonly number[] } }
  | { readonly op: 'GNC'; readonly scale: number; readonly k: 0 | 1; readonly tc: boolean;
      readonly coords: readonly (readonly number[])[];
      readonly expect: { m: number; gm: number; cs: readonly (readonly number[])[]; bb: readonly (readonly number[])[] } }
  | { readonly op: 'CMVK'; readonly iters: number; readonly b: readonly number[];
      readonly expect: { ret: number; place: readonly number[] } }
  | { readonly op: 'GNCK'; readonly scale: number; readonly k: 0 | 1; readonly tc: boolean; readonly x: readonly number[];
      readonly expect: { m: number; gm: number; cs: readonly (readonly number[])[]; bb: readonly (readonly number[])[] } }
  | { readonly op: 'SRAND'; readonly seed: number }
  | { readonly op: 'DEL' }
  | { readonly op: 'RM'; readonly coords: readonly (readonly number[])[];
      readonly expect: { x: readonly number[]; y: readonly number[] } };

/** One harness case: header (graph, options, matrix) plus its steps. */
export interface VpscCase {
  readonly name: string;
  /** Variables, including the two cluster boundary variables per cluster. */
  readonly n: number;
  readonly clusters: readonly (readonly number[])[];
  readonly toplevel: readonly number[];
  readonly edgeGap: number;
  readonly gap: readonly [number, number];
  readonly nsize: readonly (readonly [number, number])[];
  readonly graph: readonly { edges: number[]; ewgts: number[]; edists: number[] }[] | null;
  /** Packed upper-triangular float matrix (row-wise), or null. */
  readonly packed: readonly number[] | null;
  readonly ops: readonly VpscOp[];
}

export const VPSC_CASES: readonly VpscCase[] = [
`;
const helpers = `
/** \`ipsep_options\` of a harness case (clusters, gaps, node sizes); \`bb\` is output. */
export function optionsOf(c: VpscCase): IpsepOptions {
  return {
    diredges: 0,
    edgeGap: c.edgeGap,
    noverlap: 0,
    gap: { x: c.gap[0], y: c.gap[1] },
    nsize: c.nsize.map(([x, y]) => ({ x, y })),
    clusters: {
      nvars: c.clusters.reduce((s, cl) => s + cl.length, 0),
      nclusters: c.clusters.length,
      clustersizes: Int32Array.from(c.clusters.map((cl) => cl.length)),
      clusters: c.clusters.map((cl) => Int32Array.from(cl)),
      ntoplevel: c.toplevel.length,
      toplevel: Int32Array.from(c.toplevel),
      bb: c.clusters.map(() => ({ ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } })),
    },
  };
}

/** \`vtx_data\` rows of a harness case (fresh arrays: compute_y_coords swaps ewgts). */
export function graphOf(c: VpscCase): DirectedVtxData[] | null {
  return c.graph === null ? null : c.graph.map((r) => ({
    nedges: r.edges.length, edges: [...r.edges], ewgts: [...r.ewgts], edists: [...r.edists],
  }));
}
`;
const body = cases.map((c) => '  ' + JSON.stringify(strip(c)) + ',').join('\n');
fs.writeFileSync(process.argv[2], head + body + '\n];\n' + helpers);
console.log(cases.map((c) => `${c.name}: ` + c.ops.map((o) => o.op + (o.expect ? JSON.stringify((o.op === 'GNC' || o.op === 'GNCK') ? { m: o.expect.m, gm: o.expect.gm } : (o.op === 'CMV' || o.op === 'CMVK') ? o.expect.ret : o.op === 'INIT' ? o.expect : '') : '')).join(' ')).join('\n'));
