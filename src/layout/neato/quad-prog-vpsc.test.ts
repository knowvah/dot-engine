// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  constrainedMajorizationVpsc,
  deleteCMajEnvVPSC,
  initCMajVPSC,
  type CMajEnvVPSC,
  type IpsepOptions,
} from './quad-prog-vpsc.js';
import { generateNonoverlapConstraints, removeoverlaps } from './quad-prog-vpsc-overlap.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import { csrand } from '../../common/crand.js';
import { InternalError } from '../../errors.js';
import {
  VPSC_CASES, graphOf, optionsOf, type VpscCase, type VpscOp,
} from './__fixtures__/quad-prog-vpsc.js';
import { DIR1_N40 } from './__fixtures__/quad-prog-vpsc-dir1-n40.js';

/*
 * Every case replays a native harness script (see the fixture header): the
 * same calls on one environment, in order, comparing each native result bit
 * for bit (floats as float32, constraint gaps as doubles).
 */

afterEach(() => { csrand(1); });

interface Replay {
  readonly c: VpscCase;
  readonly opt: IpsepOptions;
  readonly graph: DirectedVtxData[] | null;
  readonly packed: Float32Array | null;
  e: CMajEnvVPSC | null;
  place: Float32Array;
}

/** The environment of a step: harness ops after INIT run on a live one. */
function env(r: Replay): CMajEnvVPSC {
  if (r.e === null) throw new Error(`${r.c.name}: no environment`);
  return r.e;
}

/** What one harness step returns, in the shape of the fixture's `expect`. */
function observeGnc(r: Replay, op: Extract<VpscOp, { op: 'GNC' | 'GNCK' }>): unknown {
  const coords = op.op === 'GNC'
    ? [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)]
    : [Float32Array.from(op.x), Float32Array.from(r.place)];
  const e = env(r);
  generateNonoverlapConstraints(e, {
    nsizeScale: Math.fround(op.scale), coords, k: op.k, transitiveClosure: op.tc, opt: r.opt,
  });
  return {
    m: e.m, gm: e.gm,
    cs: e.cs!.map((c) => [c.left.id, c.right.id, c.gap]),
    bb: r.opt.clusters.bb.map((b) => [b.ll.x, b.ll.y, b.ur.x, b.ur.y]),
  };
}

function observeCmv(r: Replay, op: Extract<VpscOp, { op: 'CMV' | 'CMVK' }>): unknown {
  if (op.op === 'CMV') r.place = Float32Array.from(op.place);
  const ret = constrainedMajorizationVpsc(env(r), Float32Array.from(op.b), r.place, op.iters);
  return { ret, place: Array.from(r.place) };
}

function observeOp(r: Replay, op: VpscOp): unknown {
  switch (op.op) {
    case 'SRAND': csrand(op.seed); return null;
    case 'INIT':
      r.e = initCMajVPSC(r.c.n, r.packed, r.graph, r.opt, op.diredges);
      return r.e === null ? null
        : { nv: r.e.nv, nldv: r.e.nldv, ndv: r.e.ndv, gm: r.e.gm, m: r.e.m };
    case 'CMV': case 'CMVK': return observeCmv(r, op);
    case 'GNC': case 'GNCK': return observeGnc(r, op);
    case 'DEL': deleteCMajEnvVPSC(env(r)); r.e = null; return null;
    case 'RM': {
      const coords = [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)];
      removeoverlaps(r.c.n, coords, r.opt);
      return { x: Array.from(coords[0]!), y: Array.from(coords[1]!) };
    }
  }
}

/** Replays a case's steps on the port; one result per step. */
function observeCase(c: VpscCase): unknown[] {
  const r: Replay = {
    c, opt: optionsOf(c), graph: graphOf(c),
    packed: c.packed === null ? null : Float32Array.from(c.packed),
    e: null, place: new Float32Array(c.n),
  };
  return c.ops.map((op) => observeOp(r, op));
}

const expectedOf = (op: VpscOp): unknown => ('expect' in op ? op.expect : null);

describe('quad_prog_vpsc native harness replay', () => {
  for (const c of VPSC_CASES) {
    it(c.name, () => {
      expect(observeCase(c)).toEqual(c.ops.map(expectedOf));
    });
  }
});

/** Reads the raw harness stdout one tagged line at a time. */
class RunLines {
  private next = 0;
  private readonly lines: readonly string[];

  constructor(text: string) {
    this.lines = text.trim().split('\n');
  }

  words(): string[] {
    return this.lines[this.next++]!.split(' ');
  }

  nums(tag: string): number[] {
    const [got, ...rest] = this.words();
    if (got !== tag) throw new Error(`expected a ${tag} line, got ${got}`);
    return rest.map(Number);
  }
}

function parseGnc(lines: RunLines, clusters: number): unknown {
  const [m, gm] = lines.nums('gnc') as [number, number];
  const cs = Array.from({ length: m }, () => lines.nums('c'));
  const bb = Array.from({ length: clusters }, () => lines.nums('bb'));
  return { m, gm, cs, bb };
}

function parseInit(lines: RunLines): unknown {
  const p = lines.words();
  if (p[1] === 'null') return null;
  const [nv, nldv, ndv, gm, m] = p.slice(2).map(Number);
  return { nv, nldv, ndv, gm, m };
}

function parseOp(lines: RunLines, op: VpscOp, clusters: number): unknown {
  switch (op.op) {
    case 'SRAND': lines.words(); return null;
    case 'DEL': lines.words(); return null;
    case 'INIT': return parseInit(lines);
    case 'CMV': case 'CMVK': {
      const [ret] = lines.nums('cmv');
      return { ret, place: lines.nums('place') };
    }
    case 'GNC': case 'GNCK': return parseGnc(lines, clusters);
    case 'RM': {
      lines.words();
      return { x: lines.nums('x'), y: lines.nums('y') };
    }
  }
}

/** One native run's results, parsed as harness/T5/gen.mjs `run()` does. */
function parseRun(c: VpscCase, text: string): unknown[] {
  const lines = new RunLines(text);
  return c.ops.map((op) => parseOp(lines, op, c.clusters.length));
}

/** T0's eight native runs per tie case (part-8 AD-8). */
const T0_RUNS = new URL('../../../plans/post-16-1-followups-8/harness/T0/runs/', import.meta.url);
const T0_RUN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

function t0Runs(c: VpscCase): unknown[][] {
  const slug = c.name.replaceAll(' ', '-');
  return T0_RUN_NUMBERS.map((k) =>
    parseRun(c, readFileSync(new URL(`${slug}.run${k}.out`, T0_RUNS), 'utf8')));
}

const vpscCase = (name: string): VpscCase => VPSC_CASES.find((x) => x.name === name)!;

/*
 * Cases where C++ `CmpNodePos` decides the constraint order, through exact
 * position ties or neighbour sets of more than one node
 * (generate-constraints.cpp:43-84). Native breaks a tie by `Node*` address and
 * walks `Blocks : std::set<Block*>` by address (blocks.h:37), so its output
 * varies run to run; the port takes creation order, and any native run is a
 * valid result (follow-up 106).
 *
 * "noverlap1 dir1 n12" also has y ties: native gave the fixture's result in
 * 6 of 8 runs, and the port matches it.
 *
 * "dir1 n40" (40 nodes, diredges 1) never reaches the sweep line, and block
 * address order is its only difference from the port (part-9 AD-3): the oracle's
 * library gave 17 stdouts in 332 runs, none equal to the port's. The same library
 * with `Blocks : std::set<Block*>` ordered by a Block creation index, and nothing
 * else changed, gave 1 stdout in 332 runs across the same environments, and the
 * port equals it bit for bit (plans/post-16-1-followups-9/harness/T8/).
 */
describe('quad_prog_vpsc tie cases against the native runs', () => {
  it('dir1 n40 equals the native build that orders Blocks by creation index', () => {
    expect(observeCase(DIR1_N40)).toEqual(DIR1_N40.ops.map(expectedOf));
  });

  it('noverlap1 dir2 n10 equals one of the 8 native runs', () => {
    const c = vpscCase('noverlap1 dir2 n10');
    expect(t0Runs(c)).toContainEqual(observeCase(c));
  });

  // The whole of this case is checked against the fixture, the run variant the
  // port lands on. T0's 8 runs all hold the other variant, which differs only
  // in the iterations of one CMV (IncVPSC::splitBlocks' address order), so they
  // pin what src/vpsc/SweepLine.ts decides: the constraint lists.
  it('cluster dir0 has the constraint lists of all 8 native runs', () => {
    const c = vpscCase('cluster dir0');
    const isGnc = (_: unknown, i: number): boolean => c.ops[i]!.op === 'GNC';
    const observed = observeCase(c).filter(isGnc);
    expect(observed.length).toBe(2);
    for (const run of t0Runs(c)) expect(observed).toEqual(run.filter(isGnc));
  });
});

describe('initCMajVPSC', () => {
  const c = VPSC_CASES.find((x) => x.name === 'dir2 n9')!;

  it('builds a full matrix and float work arrays of n entries', () => {
    const e = initCMajVPSC(c.n, Float32Array.from(c.packed!), null, optionsOf(c), 0)!;
    expect(e.A!.length).toBe(c.n);
    expect(e.A![1]![0]).toBe(e.A![0]![1]);
    expect([e.fArray1.length, e.fArray2.length, e.fArray3.length]).toEqual([c.n, c.n, c.n]);
    expect([e.vpsc, e.cs, e.gcs, e.m]).toEqual([null, null, null, 0]);
  });

  it('leaves A null without a packed matrix', () => {
    expect(initCMajVPSC(c.n, null, null, optionsOf(c), 0)!.A).toBeNull();
  });

  it('adds one dummy variable (weight 1e-6) per DiG-CoLa boundary', () => {
    csrand(1);
    const e = initCMajVPSC(c.n, null, graphOf(c), optionsOf(c), 2)!;
    expect(e.vs.length).toBe(c.n + e.ndv);
    expect(e.vs.slice(c.n).map((v) => [v.id, v.weight])).toEqual(
      Array.from({ length: e.ndv }, (_, i) => [c.n + i, 0.000001]));
  });

  it('throws where native indexes past vs (diredges 2, a single level)', () => {
    // One undirected edge: conjugate gradient from the random orth1 start
    // lands both y on 0, compute_hierarchy finds 0 boundaries and C's
    // `e->ndv - 1` (size_t) wraps; native 16.1 segfaults (rc 139) on
    // `digraph { mode=ipsep; diredgeconstraints=hier; a->b [dir=none] }`.
    csrand(1);
    const pair = [
      { nedges: 2, edges: [0, 1], ewgts: [0, 1], edists: [0, 0] },
      { nedges: 2, edges: [1, 0], ewgts: [0, 1], edists: [0, 0] },
    ];
    const opt = optionsOf({ ...c, clusters: [], toplevel: [0, 1], nsize: [[1, 1], [1, 1]] });
    expect(() => initCMajVPSC(2, null, pair, opt, 2)).toThrow(InternalError);
  });
});

describe('constrainedMajorizationVpsc', () => {
  it('returns 0 without touching place when maxIterations is 0', () => {
    const c = VPSC_CASES[0]!;
    const e = initCMajVPSC(c.n, Float32Array.from(c.packed!), null, optionsOf(c), 0)!;
    const place = Float32Array.from([1, 2, 3]);
    expect(constrainedMajorizationVpsc(e, new Float32Array(3), place, 0)).toBe(0);
    expect(Array.from(place)).toEqual([1, 2, 3]);
  });

  it('takes beta = 1 (no line-search step back) when d is zero', () => {
    // A zero matrix makes both denominators 0: alpha = 1, then beta = 1.
    const e = initCMajVPSC(2, new Float32Array(3), null, optionsOf(VPSC_CASES[0]!), 0)!;
    const place = Float32Array.from([1, -1]);
    expect(constrainedMajorizationVpsc(e, Float32Array.from([0.5, -0.25]), place, 1)).toBe(1);
    // g = 2b, place -= alpha * g with alpha = 1
    expect(Array.from(place)).toEqual([0, -0.5]);
  });
});
