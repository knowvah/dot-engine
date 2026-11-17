// SPDX-License-Identifier: EPL-2.0
/**
 * Calibrate the reduction widths of 16.1.1's conjugate_gradient_d (AD-1).
 * Usage: npx tsx calibrate.mts <harness binary> [out dir]
 *
 * Random SPD systems (graph Laplacians and dense M^T M + I, n = 5..40, ortho1
 * on and off) go through the harness's `cgd` mode. The same systems are solved
 * here with `innerProduct` at a width per site, and compared bit for bit with:
 *   - the untraced archive function's x after every iteration count 1..maxit,
 *   - the traced copy's r.r, p.Ap and alpha.
 * Every tuple of widths in {1, 4, 8, 16}^5 is tried; the script prints the
 * tuples that match every case. With an out dir it writes the report and
 * conjgrad-d.json, the vectors of the port's conjgrad.dense.test.ts.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fma } from '../../../../src/common/fma.js';
import {
  copyVector, innerProduct, maxAbs, orthog1, vectorsAddition, vectorsScalarMult, vectorsSubtraction,
} from '../../../../src/layout/neato/matrix-ops.js';
import { rightMultWithVectorD } from '../../../../src/layout/neato/matrix-ops-dense.js';

const BIN = process.argv[2]!;
const OUT = process.argv[3];

/** mulberry32: a seeded generator, so the case list is reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Case { name: string; n: number; maxit: number; ortho1: boolean; tol: number; A: number[][]; x: number[]; b: number[] }

function laplacian(n: number, r: () => number): number[][] {
  const A = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      // a path keeps it connected; other pairs join with probability 0.3
      if (j === i - 1 || r() < 0.3) {
        const w = -1 / (1 + Math.floor(r() * 5)) ** 2 * (0.5 + r());
        A[i]![j] = w;
        A[j]![i] = w;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) if (j !== i) d -= A[i]![j]!;
    A[i]![i] = d;
  }
  return A;
}

function denseSpd(n: number, r: () => number): number[][] {
  const M = Array.from({ length: n }, () => Array.from({ length: n }, () => r() * 2 - 1));
  const A = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = i === j ? 1 : 0;
      for (let k = 0; k < n; k++) s += M[k]![i]! * M[k]![j]!;
      A[i]![j] = s;
      A[j]![i] = s;
    }
  }
  return A;
}

function cases(): Case[] {
  const out: Case[] = [];
  const r = rng(156);
  for (let n = 5; n <= 40; n++) {
    for (const kind of ['lap', 'spd'] as const) {
      for (const ortho1 of [true, false]) {
        for (let rep = 0; rep < 2; rep++) {
          const A = kind === 'lap' ? laplacian(n, r) : denseSpd(n, r);
          const x = Array.from({ length: n }, () => r() * 10 - 5);
          const b = Array.from({ length: n }, () => r() * 4 - 2);
          out.push({ name: `${kind}-n${n}-${ortho1 ? 'o' : 'x'}-${rep}`, n, maxit: n, ortho1, tol: rep ? 1e-3 : 1e-9, A, x, b });
        }
      }
    }
  }
  return out;
}

interface Native {
  sweep: { rv: number; x: number[] }[];
  traced: { rv: number; x: number[]; rr: number[]; pAp: number[]; alpha: number[] };
}

function runNative(c: Case): Native {
  const g = (v: number): string => v.toPrecision(17);
  const input = [
    `${c.n} ${c.maxit} ${c.ortho1 ? 1 : 0} ${g(c.tol)}`,
    ...c.A.map((row) => row.map(g).join(' ')),
    c.x.map(g).join(' '),
    c.b.map(g).join(' '),
  ].join('\n');
  return JSON.parse(execFileSync(BIN, ['cgd'], { input, maxBuffer: 1 << 28 }).toString()) as Native;
}

/** Widths per site: A x rows, initial r.r, A p rows, p.Ap, in-loop r.r. */
type Widths = readonly [number, number, number, number, number];

function multRows(A: Float64Array[], n: number, v: Float64Array, res: Float64Array, block: number): void {
  if (block === 8) { rightMultWithVectorD(A, n, n, v, res); return; } // the port's own function at its width
  const blocked = block === 1 ? 0 : n - (n % block);
  for (let i = 0; i < n; i++) {
    const row = A[i]!;
    let s = 0;
    let j = 0;
    for (; j < blocked; j++) s += row[j]! * v[j]!;
    for (; j < n; j++) s = fma(row[j]!, v[j]!, s);
    res[i] = s;
  }
}

interface Solve { rv: number; x: number[]; rr: number[]; pAp: number[]; alpha: number[] }

/** conjgrad.c:conjugate_gradient_d, statement for statement, widths as parameters. */
function solve(c: Case, maxit: number, w: Widths): Solve {
  const n = c.n;
  const A = c.A.map((row) => Float64Array.from(row));
  const x = Float64Array.from(c.x);
  const b = Float64Array.from(c.b);
  const r = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
  const Ax = new Float64Array(n), alphap = new Float64Array(n), orthB = new Float64Array(n);
  const t: Solve = { rv: 0, x: [], rr: [], pAp: [], alpha: [] };
  copyVector(n, b, orthB);
  if (c.ortho1) { orthog1(n, orthB); orthog1(n, x); }
  multRows(A, n, x, Ax, w[0]);
  vectorsSubtraction(n, orthB, Ax, r);
  copyVector(n, r, p);
  let rR = innerProduct(n, r, r, w[1]);
  t.rr.push(rR);
  for (let i = 0; i < maxit && maxAbs(n, r) > c.tol; i++) {
    multRows(A, n, p, Ap, w[2]);
    const pAp = innerProduct(n, p, Ap, w[3]);
    t.pAp.push(pAp);
    if (pAp === 0) break;
    const alpha = rR / pAp;
    t.alpha.push(alpha);
    vectorsScalarMult(n, p, alpha, alphap);
    vectorsAddition(n, x, alphap, x);
    if (i < maxit - 1) {
      vectorsScalarMult(n, Ap, alpha, Ap);
      vectorsSubtraction(n, r, Ap, r);
      const rRNew = innerProduct(n, r, r, w[4]);
      t.rr.push(rRNew);
      if (rR === 0) { t.rv = 1; break; }
      const beta = rRNew / rR;
      rR = rRNew;
      vectorsScalarMult(n, p, beta, p);
      vectorsAddition(n, r, p, p);
    }
  }
  t.x = Array.from(x);
  return t;
}

const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

function matches(c: Case, nat: Native, w: Widths): boolean {
  const full = solve(c, c.maxit, w);
  const tr = nat.traced;
  if (full.rv !== tr.rv || !same(full.x, tr.x) || !same(full.rr, tr.rr) || !same(full.pAp, tr.pAp) || !same(full.alpha, tr.alpha)) return false;
  for (let k = 1; k <= c.maxit; k++) {
    const s = solve(c, k, w);
    const ns = nat.sweep[k - 1]!;
    if (s.rv !== ns.rv || !same(s.x, ns.x)) return false;
  }
  return true;
}

const all = cases();
const native = all.map(runNative);
const untracedEqualsTraced = all.every((c, i) => same(native[i]!.sweep[c.maxit - 1]!.x, native[i]!.traced.x));
const WIDTHS = [1, 4, 8, 16];
const tuples: Widths[] = [];
for (const a of WIDTHS) for (const b of WIDTHS) for (const c of WIDTHS) for (const d of WIDTHS) for (const e of WIDTHS) tuples.push([a, b, c, d, e]);
const AD1: Widths = [8, 4, 8, 8, 1];
const score = tuples.map((w) => ({ w, ok: all.filter((c, i) => matches(c, native[i]!, w)).length }));
const perfect = score.filter((s) => s.ok === all.length).map((s) => s.w.join('/'));
const ad1 = score.find((s) => s.w.join() === AD1.join())!;
const runnerUp = score.filter((s) => s.w.join() !== AD1.join()).sort((p, q) => q.ok - p.ok)[0]!;
const iterations = native.map((nv) => nv.traced.alpha.length);
const report = {
  cases: all.length,
  nRange: [5, 40],
  iterationsMin: Math.min(...iterations),
  iterationsMax: Math.max(...iterations),
  untracedEqualsTraced,
  ad1Matches: ad1.ok,
  tuplesMatchingAll: perfect,
  runnerUp: { widths: runnerUp.w.join('/'), matches: runnerUp.ok },
};
console.log(JSON.stringify(report, null, 2));
/**
 * The unit-test vectors: systems of n <= 24 chosen greedily until no tuple but
 * AD-1's reproduces every chosen x (what a test of the solver can observe),
 * with native x after the full run and after max_iterations = 2.
 */
function pickVectors(): number[] {
  const small = all.map((c, i) => i).filter((i) => all[i]!.n <= 24);
  const xMatches = new Map<string, Set<number>>();
  for (const w of tuples) {
    if (w.join() === AD1.join()) continue;
    xMatches.set(w.join(), new Set(small.filter((i) => same(solve(all[i]!, all[i]!.maxit, w).x, native[i]!.traced.x))));
  }
  let alive = [...xMatches.keys()];
  const chosen: number[] = [];
  while (alive.length > 0) {
    let best = -1;
    let bestKills = 0;
    for (const i of small) {
      const kills = alive.filter((k) => !xMatches.get(k)!.has(i)).length;
      if (kills > bestKills) { best = i; bestKills = kills; }
    }
    if (best < 0) throw new Error(`tuples indistinguishable by x on n <= 24: ${alive.join(' ')}`);
    chosen.push(best);
    alive = alive.filter((k) => xMatches.get(k)!.has(best));
  }
  // coverage beyond discrimination: no ortho1, dense SPD, n % 4 != 0
  for (const name of ['spd-n7-x-0', 'spd-n13-x-1', 'lap-n22-x-1']) chosen.push(all.findIndex((c) => c.name === name));
  return chosen;
}

if (OUT) {
  const vectors = pickVectors().map((i) => {
    const c = all[i]!;
    const nat = native[i]!;
    return {
      name: c.name, n: c.n, ortho1: c.ortho1, tol: c.tol, A: c.A, x0: c.x, b: c.b,
      rv: nat.traced.rv, x: nat.traced.x, iterations: nat.traced.alpha.length, xAfter2: nat.sweep[1]!.x,
    };
  });
  writeFileSync(`${OUT}/cgd-calibration.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${OUT}/conjgrad-d.json`, `${JSON.stringify(vectors)}\n`);
  console.log(`vectors: ${vectors.map((v) => v.name).join(' ')}`);
}
