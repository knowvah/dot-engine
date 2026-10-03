// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { solve } from './kk-solve.js';
import { mdsModel, newPathState, shortestPath } from './kk-paths.js';
import { kkNeato } from './kk.js';
import { MODE_KK, solveModel } from './init.js';

/** Tolerance (inches) for neato output against the native oracle. */
const TOL = 0.5;

const plain = (src: string): string =>
  String(render(parse(src), 'plain', { engine: 'neato' }));

/** Parse `node` lines of -Tplain output into name -> [x, y] (inches). */
function nodePositions(out: string): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  for (const line of out.split('\n')) {
    const p = line.split(' ');
    if (p[0] === 'node') m.set(p[1]!, [Number(p[2]), Number(p[3])]);
  }
  return m;
}

/** "a:x,y b:x,y" (native `dot -Kneato -Tplain` oracle values). */
function expected(spec: string): Map<string, [number, number]> {
  return new Map(spec.split(' ').map((s) => {
    const [name, xy] = s.split(':') as [string, string];
    const [x, y] = xy.split(',').map(Number) as [number, number];
    return [name, [x, y]] as [string, [number, number]];
  }));
}

afterEach(() => { vi.restoreAllMocks(); });

/**
 * Oracle: ~/git/graphviz/build/cmd/dot/dot -Kneato -Tplain (native build).
 * Each source sets mode=KK, so they pass once neato's parseMode honours `mode`.
 */
const NATIVE_CASES: readonly (readonly [string, string, string])[] = [
  ['plain graph', 'graph g { mode=KK; a--b--c--d--e--a; a--c; c--f; f--g; }',
    'a:1.6981,0.76666 b:2.3924,1.4043 c:1.3841,1.7991 d:0.375,1.2578 e:0.75652,0.25 f:1.3516,2.8749 g:1.2593,3.8832'],
  ['edge len', 'graph g { mode=KK; a--b[len=2]; b--c[len=0.5]; c--d; d--a[len=3]; a--c; e--a; e--f[len=1.5]; }',
    'a:2.8671,0.98796 b:4.0794,0.25 c:3.9076,0.74175 d:4.7303,1.4544 e:1.8633,1.1326 f:0.375,1.3791'],
  ['pinned and user pos', 'graph g { mode=KK; a[pos="0,0!"]; b[pos="2,1"]; a--b--c--d--a; c--e; e--f; f--b; }',
    'a:0.67784,0.25 b:1.4337,1.3389 c:0.52627,1.2733 d:1.416,0.28921 e:0.375,2.3774 f:1.4253,2.4532'],
  ['directed with weight', 'digraph g { mode=KK; a->b->c->a; c->d; b->d [weight=3]; d->e; e->a; }',
    'a:0.375,0.88038 b:1.5455,1.0277 c:0.6557,0.25 d:0.95807,1.3903 e:1.4187,0.27507'],
  ['start=regular', 'graph g { mode=KK; start=regular; a--b--c--d--a; c--e }',
    'a:2.7431,1.4373 b:1.693,1.7433 c:1.307,0.71742 d:2.3599,0.41285 e:0.375,0.25'],
  ['seed and maxiter', 'graph g { mode=KK; start=7; maxiter=5; a--b--c--d--a; c--e; b--e[weight=4] }',
    'a:1.8013,1.944 b:1.1009,1.6222 c:1.2738,0.25 d:0.97101,2.2006 e:0.375,1.1016'],
  ['packed components', 'graph g { mode=KK; pack=true; a--b--c; d--e; f }',
    'a:0.375,1.833 b:1.1025,1.1466 c:1.786,0.41667 d:2.0417,2.0641 e:3.0307,1.9167 f:0.375,0.25'],
  ['start=self', 'graph g { mode=KK; start=self; a--b--c--d--a; }',
    'a:0.375,0.74125 b:1.667,0.9523 c:1.265,0.25 d:0.75521,1.4553'],
  ['bad len', 'graph g { mode=KK; a--b[len=-1]; b--c[len=x]; c--a[len=0] }',
    'a:0.375,1.0124 b:1.3588,1.1916 c:1.0221,0.25'],
  // C packs only when pack/packmode is set or layoutMode != MODE_KK; else the
  // whole disconnected graph is solved at once. @see neatoinit.c:1371-1380
  ['unpacked components', 'graph g { mode=KK; a--b--c; d--e; f }',
    'a:1.9164,0.25 b:2.8564,0.63012 c:3.6369,1.2775 d:1.2484,4.312 e:0.375,3.7902 f:1.6927,2.5798'],
  ['unpacked with defaultdist', 'graph g { mode=KK; defaultdist=2; a--b--c; d--e; }',
    'a:2.5984,1.8973 b:2.2869,0.95595 c:1.5903,0.25 d:0.86937,2.3778 e:0.375,1.5713'],
  ['pack=false stays unpacked', 'graph g { mode=KK; pack=false; a--b--c--d; e--f; }',
    'a:2.3925,3.809 b:1.5342,3.288 c:0.84441,2.5581 d:0.375,1.6706 e:3.9826,0.96399 f:3.3066,0.25'],
  ['packmode alone packs', 'graph g { mode=KK; packmode="graph"; a--b--c; d--e; f }',
    'a:0.375,1.6663 b:1.1025,0.97996 c:1.786,0.25 d:3.0417,2.8974 e:4.0307,2.75 f:1.7083,2.75'],
  ['packmode with pack margin', 'graph g { mode=KK; packmode="graph"; pack=40; a--b--c; d--e; f }',
    'a:0.375,1.6663 b:1.1025,0.97996 c:1.786,0.25 d:3.8056,3.828 e:4.7946,3.6806 f:1.4306,3.6806'],
  ['defaultdist epsilon Damping', 'graph g { mode=KK; defaultdist=2; epsilon=0.01; Damping=0.9; a--b--c--d; b--e }',
    'a:0.375,0.43536 b:1.3538,0.66663 c:1.2155,1.7459 d:2.0012,2.2668 e:2.3063,0.25'],
];

describe('mode=KK against the native oracle', () => {
  it.each(NATIVE_CASES)('%s', (_name, src, spec) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const got = nodePositions(plain(src));
    const want = expected(spec);
    expect([...got.keys()]).toEqual([...want.keys()]);
    for (const [name, [x, y]] of want) {
      expect(Math.abs(got.get(name)![0] - x)).toBeLessThan(TOL);
      expect(Math.abs(got.get(name)![1] - y)).toBeLessThan(TOL);
    }
  });

  it('differs from mode=major (KK is not the stress kernel)', () => {
    const kk = plain('graph g { mode=KK; a--b--c--d--e--a; a--c; c--f; f--g; }');
    const major = plain('graph g { a--b--c--d--e--a; a--c; c--f; f--g; }');
    expect(kk).not.toBe(major);
  });

  it('leaves mode=major byte-identical to no mode', () => {
    const none = plain('graph g { a--b--c--d--e--a; a--c }');
    const major = plain('graph g { mode=major; a--b--c--d--e--a; a--c }');
    expect(major).toBe(none);
  });
});

describe('KK warnings (C text)', () => {
  it('warns on a bad edge len and falls back to 1.00', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    plain('graph g { mode=KK; a--b[len=-1]; b--c[len=x]; c--a[len=0] }');
    const text = warn.mock.calls.map((c) => String(c[0]));
    expect(text).toContain('bad edge len "-1" in g - setting to 1.00');
    expect(text).toContain('bad edge len "x" in g - setting to 1.00');
    expect(text).toContain('bad edge len "0" in g - setting to 1.00');
  });

  it('warns when MaxIter is reached', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    plain('graph g { mode=KK; maxiter=5; a--b--c--d--a; c--e }');
    expect(warn.mock.calls.map((c) => String(c[0]))).toContain('Max. iterations (5) reached on graph g');
  });

  it('does not warn when the descent converges', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    plain('graph g { mode=KK; a--b--c--d--e--a; a--c; c--f; f--g; }');
    expect(warn.mock.calls.map((c) => String(c[0])).filter((s) => s.startsWith('Max.'))).toEqual([]);
  });

  it('start=self and the subset model keep their start.ts behaviour', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    plain('graph g { mode=KK; start=self; a--b--c }');
    expect(warn).toHaveBeenCalledWith('start=0 not supported with mode=self - ignored');
    expect(() => plain('graph g { mode=KK; model=subset; a--b--c }'))
      .toThrow(expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }));
    expect(() => plain('graph g { mode=KK; model=circuit; a--b--c }'))
      .toThrow(expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }));
  });
});

describe('kkNeato', () => {
  const root = (src: string) => parse(src);
  const seed = (g: ReturnType<typeof root>): void => {
    for (const n of g.nodes.values()) n.info.pos = [0, 0];
  };

  it('moves nothing when maxiter is negative (C: MaxIter < 0 returns)', () => {
    const g = root('graph g { maxiter=-1; a--b--c }');
    seed(g);
    kkNeato(g, 3, 0);
    expect([...g.nodes.values()].map((n) => n.info.pos)).toEqual([[0, 0], [0, 0], [0, 0]]);
  });

  it('moves nothing for fewer than two nodes', () => {
    const g = root('graph g { a }');
    seed(g);
    kkNeato(g, 1, 0);
    expect(g.nodes.get('a')!.info.pos).toEqual([0, 0]);
  });

  it('keeps a pinned node fixed and settles the others at the ideal length', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = root('graph g { a[pos="0,0!"]; b[pos="5,0"]; a--b }');
    for (const n of g.nodes.values()) n.info.pos = [0, 0];
    for (const n of g.nodes.values()) {
      const [x, y] = n.attrs.get('pos')!.replace('!', '').split(',').map(Number) as [number, number];
      n.info.pos = [x, y]; n.info.posSet = true; n.info.pinned = n.attrs.get('pos')!.endsWith('!');
    }
    kkNeato(g, 2, 0);
    expect(g.nodes.get('a')!.info.pos).toEqual([0, 0]);
    const [bx, by] = g.nodes.get('b')!.info.pos!;
    expect(Math.hypot(bx!, by!)).toBeCloseTo(1, 2);
  });

  it('runs the mds model (C overruns GD_dist here; the port drops those cells)', () => {
    const g = root('graph g { a--b[len=2]; b--c; c--a }');
    seed(g);
    g.nodes.forEach((n, k) => { n.info.pos = [k === 'a' ? 0.1 : k === 'b' ? 0.9 : 0.4, 0.3]; });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    kkNeato(g, 3, 3);
    const [a, b] = [g.nodes.get('a')!.info.pos!, g.nodes.get('b')!.info.pos!];
    expect(Number.isFinite(a[0]! + b[1]!)).toBe(true);
    expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)).toBeGreaterThan(0.5);
  });

  it('honours solveModel dispatch for MODE_KK', () => {
    const g = root('graph g { a--b--c }');
    seed(g);
    solveModel(g, MODE_KK, 0);
    const [a, b] = [g.nodes.get('a')!.info.pos!, g.nodes.get('b')!.info.pos!];
    expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)).toBeCloseTo(1, 1);
  });
});

describe('solve (Gaussian elimination)', () => {
  it('solves a 2x2 system, restoring a and c', () => {
    const a = Float64Array.of(2, 1, 1, 3);
    const c = Float64Array.of(5, 10);
    const b = new Float64Array(2);
    solve(a, b, c, 2);
    expect([b[0], b[1]]).toEqual([1, 3]);
    expect([...a]).toEqual([2, 1, 1, 3]);
    expect([...c]).toEqual([5, 10]);
  });

  it('pivots on the largest column entry', () => {
    const b = new Float64Array(2);
    solve(Float64Array.of(0, 1, 4, 0), b, Float64Array.of(3, 8), 2);
    expect([b[0], b[1]]).toEqual([2, 3]);
  });

  it('warns and leaves b zero when a pivot is too small', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const b = new Float64Array(2);
    solve(Float64Array.of(0, 0, 0, 0), b, Float64Array.of(1, 1), 2);
    expect(warn).toHaveBeenCalledWith('ill-conditioned');
    expect([b[0], b[1]]).toEqual([0, 0]);
  });

  it('warns when only the last pivot is too small', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const b = new Float64Array(2);
    solve(Float64Array.of(1, 1, 1, 1), b, Float64Array.of(1, 1), 2);
    expect(warn).toHaveBeenCalledWith('ill-conditioned');
  });
});

describe('shortestPath and mdsModel', () => {
  it('fills GD_dist with weighted shortest paths and Initial_dist for unreachable pairs', () => {
    // 0 -1- 1 -2- 2 ; 3 isolated
    const n = 4;
    const dist = new Float64Array(n * n).fill(9); // GD_dist starts at Initial_dist
    const adj = [
      [{ id: 1, len: 1 }], [{ id: 0, len: 1 }, { id: 2, len: 2 }], [{ id: 1, len: 2 }], [],
    ];
    shortestPath(newPathState(n, dist, adj, 9));
    expect(dist[0 * n + 2]).toBe(3);
    expect(dist[2 * n + 0]).toBe(3);
    expect(dist[0 * n + 1]).toBe(1);
    expect(dist[0 * n + 3]).toBe(9);
    expect(dist[3 * n + 2]).toBe(9);
  });

  it('relaxes through a shorter path discovered later (heap decrease-key)', () => {
    const n = 4;
    const dist = new Float64Array(n * n);
    const e = (id: number, len: number) => ({ id, len });
    const adj = [
      [e(1, 10), e(2, 1)], [e(0, 10), e(3, 1), e(2, 1)], [e(0, 1), e(1, 1)], [e(1, 1)],
    ];
    shortestPath(newPathState(n, dist, adj, 99));
    expect(dist[0 * n + 1]).toBe(2);
    expect(dist[0 * n + 3]).toBe(3);
  });

  it('mdsModel writes both triangles by 1-based AGSEQ and drops out-of-range cells', () => {
    const n = 2;
    const dist = new Float64Array(n * n).fill(7);
    mdsModel(dist, n, [
      { tailSeq: 1, headSeq: 1, len: 5 },
      { tailSeq: 0, headSeq: 1, len: 3 },
      { tailSeq: 2, headSeq: 1, len: 4 },
    ]);
    expect([...dist]).toEqual([7, 3, 3, 7]);
  });
});

describe('mode=KK input edge cases', () => {
  const pos = (src: string): Map<string, [number, number]> => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    return nodePositions(plain(src));
  };

  it('ignores self-loops in the spring model', () => {
    expect([...pos('graph g { mode=KK; start=3; a--b--c--a; a--a }')])
      .toEqual([...pos('graph g { mode=KK; start=3; a--b--c--a }')]);
  });

  it('treats a parallel edge like the first one (one spring per node pair)', () => {
    expect([...pos('graph g { mode=KK; start=3; a--b--c; a--b }')])
      .toEqual([...pos('graph g { mode=KK; start=3; a--b--c }')]);
  });

  it('lays out an edgeless graph (no edges: initial dist from nE = 1)', () => {
    const p = pos('graph g { mode=KK; start=3; a; b; c }');
    expect(p.size).toBe(3);
    for (const [x, y] of p.values()) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
  });

  // Native: maxiter=x == maxiter=0 (atoi); epsilon=x == unset (getdouble
  // leaves the default when sscanf fails); defaultdist=x -> MAX(Epsilon, 0).
  it('reads maxiter (atoi), epsilon (getdouble) and defaultdist (atof) like C', () => {
    const src = (a: string): string => `graph g { mode=KK; start=3; ${a} a--b--c--d--a; c--e }`;
    expect(plain(src('maxiter=x;'))).toBe(plain(src('maxiter=0;')));
    expect(plain(src('epsilon=x;'))).toBe(plain(src('')));
    expect(plain(src('epsilon=x;'))).not.toBe(plain(src('epsilon=0;')));
    expect(plain(src('defaultdist=x;'))).toBe(plain(src('defaultdist=0;')));
  });
});
