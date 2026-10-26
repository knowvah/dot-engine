// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  constrainedMajorizationNewWithGaps,
  fmaf,
  fmaxf,
  fminf,
  initConstrainedMajorization,
  unpackMatrix,
} from './quad-prog-solve.js';
import { squareVec, invertVec } from './matrix-ops.js';

/*
 * Expected vectors come from a native clang -O3 harness that compiles the
 * 16.1 lib/neatogen/quad_prog_solve.c, compute_hierarchy.c and kkutils.c and
 * prints every output as %.9g (float round-trip). Inputs are rebuilt here with
 * the same deterministic generator (32-bit LCG) and the same float arithmetic.
 */

const fr = Math.fround;
type Graph = 'probe' | 'dag32';
type Mode = 'rand' | 'flat' | 'near';

interface Case {
  name: string;
  graph: Graph;
  mode: Mode;
  gap: number;
  iters: number;
  seed: number;
  place: number[];
  orderingOut: number[];
}

/** Hierarchy (compute_hierarchy output) per graph: ordering and levels. */
const HIERARCHY: Record<Graph, { ordering: number[]; levels: number[] }> = {
  probe: { ordering: [0, 1, 2, 3, 4, 5], levels: [1, 2, 3, 4, 5] },
  dag32: {
    ordering: [0, 1, 2, 3, 9, 4, 6, 18, 14, 5, 11, 7, 22, 15, 10, 16, 8, 12, 13, 20, 24, 23, 17, 25, 27, 19, 29, 26, 21, 31, 28, 30],
    levels: [1, 2, 4, 7, 11, 15, 21, 25, 28, 30],
  },
};

const CASES: Case[] = [
  { name: 'probe_rand_g1_i1', graph: 'probe', mode: 'rand', gap: 1.0, iters: 1, seed: 777,
    place: [-2.50000024, -1.50000024, -0.500000238, 0.5, 1.5, 2.5],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_rand_g1_i30', graph: 'probe', mode: 'rand', gap: 1.0, iters: 30, seed: 777,
    place: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_rand_g0_i30', graph: 'probe', mode: 'rand', gap: 0.0, iters: 30, seed: 778,
    place: [-0.134916618, 0.0269833226, 0.0269833226, 0.0269833226, 0.0269833226, 0.0269833226],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_rand_gneg_i10', graph: 'probe', mode: 'rand', gap: -0.75, iters: 10, seed: 779,
    place: [0.0571095496, -0.0604223013, -0.259007215, 0.000930771232, 0.10039635, 0.160992846],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_flat_g1_i10', graph: 'probe', mode: 'flat', gap: 1.0, iters: 10, seed: 780,
    place: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_near_g2_i50', graph: 'probe', mode: 'near', gap: 2.0, iters: 50, seed: 781,
    place: [-5, -3, -1, 1, 3, 5],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'probe_i0', graph: 'probe', mode: 'rand', gap: 1.0, iters: 0, seed: 782,
    place: [0.39133966, -2.91088772, -2.38597274, 1.14665031, 0.606909394, -1.68294489],
    orderingOut: [0, 1, 2, 3, 4, 5] },
  { name: 'dag_rand_g1_i1', graph: 'dag32', mode: 'rand', gap: 1.0, iters: 1, seed: 901,
    place: [-5.49999857, -4.49999857, -3.49999857, -3.49999857, -2.49999857, -1.49999857, -2.49999857, -0.499998569, 0.500001431, -2.49999857, -0.499998569, -1.49999857, 0.500001431, 0.500001431, -1.49999857, -0.499998569, 0.500001431, 1.50000143, -1.49999857, 2.50000191, 0.500001431, 3.50000191, -0.499998569, 1.50000143, 0.500001431, 1.50000143, 2.50000191, 1.50000143, 4.50000191, 2.50000191, 4.50000191, 3.50000191],
    orderingOut: [0, 1, 3, 2, 9, 6, 4, 5, 18, 14, 11, 7, 15, 10, 22, 20, 13, 16, 12, 24, 8, 17, 25, 27, 23, 29, 19, 26, 21, 31, 28, 30] },
  { name: 'dag_rand_g1_i20', graph: 'dag32', mode: 'rand', gap: 1.0, iters: 20, seed: 901,
    place: [-5.49999857, -4.49999857, -3.49999857, -3.49999857, -2.49999857, -1.49999857, -2.49999857, -0.499998569, 0.500001431, -2.49999857, -0.499998569, -1.49999857, 0.500001431, 0.500001431, -1.49999857, -0.499998569, 0.500001431, 1.50000143, -1.49999857, 2.50000191, 0.500001431, 3.50000191, -0.499998569, 1.50000143, 0.500001431, 1.50000143, 2.50000191, 1.50000143, 4.50000191, 2.50000191, 4.50000191, 3.50000191],
    orderingOut: [0, 1, 3, 2, 9, 6, 4, 5, 18, 14, 11, 7, 15, 10, 22, 20, 13, 16, 12, 24, 8, 17, 25, 27, 23, 29, 19, 26, 21, 31, 28, 30] },
  { name: 'dag_flat_g1_i15', graph: 'dag32', mode: 'flat', gap: 1.0, iters: 15, seed: 902,
    place: [-5.5, -4.5, -3.5, -3.5, -2.5, -1.5, -2.5, -0.5, 0.5, -2.5, -0.5, -1.5, 0.5, 0.5, -1.5, -0.5, 0.5, 1.5, -1.5, 2.5, 0.5, 3.5, -0.5, 1.5, 0.5, 1.5, 2.5, 1.5, 4.5, 2.5, 4.5, 3.5],
    orderingOut: [0, 1, 2, 3, 9, 4, 6, 18, 14, 5, 11, 7, 15, 10, 22, 16, 8, 12, 13, 20, 24, 23, 17, 25, 27, 19, 29, 26, 21, 31, 28, 30] },
  { name: 'dag_near_g05_i40', graph: 'dag32', mode: 'near', gap: 0.5, iters: 40, seed: 903,
    place: [-2.75, -2.25, -1.75, -1.75, -1.25, -0.75, -1.25, -0.25, 0.25, -1.25, -0.25, -0.75, 0.25, 0.25, -0.75, -0.25, 0.25, 0.75, -0.75, 1.25, 0.25, 1.75, -0.25, 0.75, 0.25, 0.75, 1.25, 0.75, 2.25, 1.25, 2.25, 1.75],
    orderingOut: [0, 1, 3, 2, 9, 6, 4, 18, 14, 5, 11, 15, 10, 7, 22, 12, 24, 16, 13, 8, 20, 27, 25, 23, 17, 19, 29, 26, 21, 31, 30, 28] },
  { name: 'dag_rand_g0_i20', graph: 'dag32', mode: 'rand', gap: 0.0, iters: 20, seed: 904,
    place: [-0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, 0.0342883989, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, -0.00666491874, 0.124706164, -0.00666491874, 0.0342883989, -0.00666491874],
    orderingOut: [0, 1, 3, 2, 4, 6, 9, 18, 14, 11, 5, 22, 15, 10, 7, 24, 16, 20, 13, 8, 12, 27, 17, 25, 23, 29, 19, 26, 31, 21, 30, 28] },
  { name: 'dag_rand_g03_i5', graph: 'dag32', mode: 'rand', gap: 0.3, iters: 5, seed: 905,
    place: [-1.98421443, -1.68421435, -1.3842144, -1.3842144, -1.08421445, -0.567583501, -1.08421445, -0.0432778262, 0.256722182, -1.08421445, -0.0432778262, -0.395400703, 0.256722182, 0.256722182, -0.343277842, -0.0432778262, 0.256722182, 0.556722164, -0.395400703, 0.856722176, 0.256722182, 1.15672219, -0.0432778262, 0.556722164, 0.256722182, 0.556722164, 0.856722176, 0.556722164, 1.45672226, 0.856722176, 1.45672226, 1.15672219],
    orderingOut: [0, 1, 3, 2, 6, 4, 9, 5, 11, 18, 14, 15, 10, 7, 22, 24, 13, 16, 12, 8, 20, 17, 25, 23, 27, 19, 26, 29, 31, 21, 30, 28] },
  { name: 'dag_rand_gneg_i20', graph: 'dag32', mode: 'rand', gap: -0.4, iters: 20, seed: 906,
    place: [0.0601300895, -0.0366081484, 0.0549932308, -0.0239584427, -0.0386444479, -0.0582347475, -0.0386444479, 0.0233589876, -0.0456922203, 0.072920315, -0.00780443288, 0.0197048187, 0.0585407764, -0.0456922203, -0.0435302705, -0.00780443288, -0.0356237777, 0.00103350566, 0.0197048187, 0.0177012533, -0.0329416022, -0.0325600095, -0.00780443288, 0.00103350566, -0.0456922203, 0.00103350566, 0.0177012533, 0.00103350566, 0.0311004035, 0.108904131, -0.078593269, 0.0909350216],
    orderingOut: [0, 1, 3, 2, 4, 6, 9, 5, 14, 11, 18, 22, 15, 10, 7, 13, 24, 8, 16, 20, 12, 17, 23, 25, 27, 19, 26, 29, 21, 31, 30, 28] },
];

const DAG_SEED = 12345;
const DAG_NODES = 32;
const PROBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5],
];

/** 32-bit LCG used by the harness (`S = S*1664525 + 1013904223`). */
function makeRng(seed: number): { next: () => number; r01: () => number } {
  let s = seed >>> 0;
  const next = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
  return { next, r01: () => (next() >>> 8) / 16777216 };
}

/** Undirected adjacency of the test graph. */
function buildAdjacency(graph: Graph): boolean[][] {
  const n = graph === 'probe' ? 6 : DAG_NODES;
  const adj = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const link = (a: number, b: number): void => {
    adj[a]![b] = true;
    adj[b]![a] = true;
  };
  if (graph === 'probe') {
    for (const [a, b] of PROBE_EDGES) link(a, b);
    return adj;
  }
  const rng = makeRng(DAG_SEED);
  for (let i = 1; i < n; i++) {
    for (let k = 0; k < 3; k++) link(i, rng.next() % i);
  }
  return adj;
}

/** Hop distances by BFS from every node. */
function hopDistances(adj: boolean[][]): number[][] {
  const n = adj.length;
  return adj.map((_, s) => {
    const d = new Array<number>(n).fill(-1);
    d[s] = 0;
    const queue = [s];
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h]!;
      for (let v = 0; v < n; v++) {
        if (adj[u]![v] && d[v]! < 0) {
          d[v] = d[u]! + 1;
          queue.push(v);
        }
      }
    }
    return d;
  });
}

/** Packed negated Laplacian, as constrained_majorization.c builds `lap2`. */
function packedLaplacian(graph: Graph): { lap: Float32Array; n: number } {
  const dist = hopDistances(buildAdjacency(graph));
  const n = dist.length;
  const len = n + (n * (n - 1)) / 2;
  const lap = new Float32Array(len);
  for (let i = 0, c = 0; i < n; i++) {
    for (let j = i; j < n; j++, c++) lap[c] = dist[i]![j]!;
  }
  squareVec(len, lap);
  invertVec(len, lap);
  const degrees = new Array<number>(n).fill(0);
  for (let i = 0, count = 0; i < n - 1; i++) {
    let degree = 0;
    count++;
    for (let j = 1; j < n - i; j++, count++) {
      degree += lap[count]!;
      degrees[i + j]! -= lap[count]!;
    }
    degrees[i]! -= degree;
  }
  for (let step = n, count = 0, i = 0; i < n; i++, count += step, step--) {
    lap[count] = degrees[i]!;
  }
  return { lap, n };
}

/** Initial place and b vector for a case. */
function initialVectors(c: Case, n: number): { place: Float32Array; b: Float32Array } {
  const rng = makeRng(c.seed);
  const place = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (c.mode === 'rand') place[i] = rng.r01() * 10 - 5;
    else if (c.mode === 'near') place[i] = 0.003 * (i % 3);
  }
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = rng.r01() * 2 - 1;
  return { place, b };
}

function solveCase(c: Case, iters: number = c.iters) {
  const { lap, n } = packedLaplacian(c.graph);
  const h = HIERARCHY[c.graph];
  const ordering = Int32Array.from(h.ordering);
  const env = initConstrainedMajorization(
    lap, n, ordering, Int32Array.from(h.levels), h.levels.length,
  );
  const { place, b } = initialVectors(c, n);
  const x = Float32Array.from({ length: n }, (_, i) => 0.5 * i);
  constrainedMajorizationNewWithGaps(env, b, [x, place], 1, iters, c.gap);
  return { env, place, x, ordering, start: initialVectors(c, n).place };
}

describe('unpackMatrix', () => {
  it('mirrors an upper-triangular packed matrix into a symmetric one', () => {
    const rows = unpackMatrix(Float32Array.from([1, 2, 3, 4, 5, 6]), 3);
    expect(rows.map((r) => Array.from(r))).toEqual([
      [1, 2, 3],
      [2, 4, 5],
      [3, 5, 6],
    ]);
  });
});

describe('constrainedMajorizationNewWithGaps against the native harness', () => {
  it.each(CASES)('$name: place and ordering match bit for bit', (c) => {
    const out = solveCase(c);
    expect(Array.from(out.place)).toEqual(c.place.map(fr));
    expect(Array.from(out.ordering)).toEqual(c.orderingOut);
  });

  it('leaves the other axis untouched', () => {
    const c = CASES[0]!;
    const out = solveCase(c);
    expect(Array.from(out.x)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
  });

  it('returns immediately when maxIterations <= 0', () => {
    const c = CASES.find((k) => k.name === 'probe_i0')!;
    const out = solveCase(c, 0);
    expect(Array.from(out.place)).toEqual(Array.from(out.start));
  });

  it('merges near-equal places into one block (equals tolerance 1e-2)', () => {
    const c = CASES.find((k) => k.name === 'probe_near_g2_i50')!;
    const out = solveCase(c);
    expect(Array.from(out.place)).toEqual([-5, -3, -1, 1, 3, 5]);
  });
});

describe('fmaf (float fused multiply-add, arm64 fmadd s)', () => {
  it('rounds once: a double-rounding case where fround(a*b+c) is one ulp low', () => {
    const a = 1.0000001192092896;
    const b = 1.5000001192092896;
    const c = -1.4210853021136109e-14;
    expect(fr(a * b + c)).toBe(1.500000238418579);
    expect(fmaf(a, b, c)).toBe(1.5000003576278687);
  });

  it('steps toward zero from a power of two (borrow across the low word)', () => {
    expect(fmaf(1, 1, -(2 ** -60))).toBe(1);
  });

  it('handles negative sums and exact results', () => {
    expect(fmaf(-1.0000001192092896, 1.5000001192092896, 1.4210853021136109e-14))
      .toBe(-1.5000003576278687);
    expect(fmaf(3, 5, 1)).toBe(16);
    expect(fmaf(Infinity, 2, 1)).toBe(Infinity);
  });
});

describe('fminf / fmaxf NaN handling', () => {
  it('returns the non-NaN operand, as C fminf/fmaxf do', () => {
    expect(fminf(NaN, 2)).toBe(2);
    expect(fminf(2, NaN)).toBe(2);
    expect(fminf(1, 2)).toBe(1);
    expect(fmaxf(NaN, 2)).toBe(2);
    expect(fmaxf(2, NaN)).toBe(2);
    expect(fmaxf(1, 2)).toBe(2);
  });
});
