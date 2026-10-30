// SPDX-License-Identifier: EPL-2.0
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

/*
 * Every case replays a native harness script (see the fixture header): the
 * same calls on one environment, in order, asserting each native result
 * bit for bit (floats as float32, constraint gaps as doubles).
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

function expectFloats(actual: Float32Array, expected: readonly number[]): void {
  expect(Array.from(actual)).toEqual(expected.map(Math.fround));
}

function replayGnc(r: Replay, op: Extract<VpscOp, { op: 'GNC' | 'GNCK' }>): void {
  const coords = op.op === 'GNC'
    ? [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)]
    : [Float32Array.from(op.x), Float32Array.from(r.place)];
  const e = env(r);
  generateNonoverlapConstraints(e, {
    nsizeScale: Math.fround(op.scale), coords, k: op.k, transitiveClosure: op.tc, opt: r.opt,
  });
  expect([e.m, e.gm]).toEqual([op.expect.m, op.expect.gm]);
  expect(e.cs!.map((c) => [c.left.id, c.right.id, c.gap])).toEqual(op.expect.cs);
  expect(r.opt.clusters.bb.map((b) => [b.ll.x, b.ll.y, b.ur.x, b.ur.y])).toEqual(op.expect.bb);
}

function replayCmv(r: Replay, op: Extract<VpscOp, { op: 'CMV' | 'CMVK' }>): void {
  if (op.op === 'CMV') r.place = Float32Array.from(op.place);
  const ret = constrainedMajorizationVpsc(env(r), Float32Array.from(op.b), r.place, op.iters);
  expect(ret).toBe(op.expect.ret);
  expectFloats(r.place, op.expect.place);
}

function replayOp(r: Replay, op: VpscOp): void {
  switch (op.op) {
    case 'SRAND': csrand(op.seed); return;
    case 'INIT': {
      r.e = initCMajVPSC(r.c.n, r.packed, r.graph, r.opt, op.diredges);
      const got = r.e === null ? null
        : { nv: r.e.nv, nldv: r.e.nldv, ndv: r.e.ndv, gm: r.e.gm, m: r.e.m };
      expect(got).toEqual(op.expect);
      return;
    }
    case 'CMV': case 'CMVK': replayCmv(r, op); return;
    case 'GNC': case 'GNCK': replayGnc(r, op); return;
    case 'DEL': deleteCMajEnvVPSC(env(r)); r.e = null; return;
    case 'RM': {
      const coords = [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)];
      removeoverlaps(r.c.n, coords, r.opt);
      expectFloats(coords[0]!, op.expect.x);
      expectFloats(coords[1]!, op.expect.y);
    }
  }
}

/**
 * Cases where src/vpsc's sweep line orders constraints differently from C++
 * (follow-up 105); `it.fails` flips to a failure once SweepLine is fixed.
 * - "cluster dir0": C++ `Node::leftNeighbours` is a `set<Node*,CmpNodePos>`
 *   iterated by position; TS keeps insertion order, and getLeftNeighbours
 *   inserts in descending position, so the top-level pass emits [0→10]
 *   before [7→10] (native: [7→10] first, x[7] < x[0]).
 * - "noverlap1 dir2 n10": three nodes per level share the exact centre y;
 *   C++ CmpNodePos breaks the tie by Node* address, TS nodePosLt compares
 *   objects with `<` (always false), so the y pass makes 26 constraints, not
 *   27. The native tie order is itself heap-dependent (4 results in 8
 *   harness runs); the fixture keeps the majority (5 of 8).
 *
 * "noverlap1 dir1 n12" also has y ties: native gave the fixture's result in
 * 6 of 8 runs, and the port matches it.
 *
 * A 40-node diredges-1 case ("dir1 n40") was dropped: its second
 * IncVPSC::satisfy iterates `Blocks : std::set<Block*>` in heap-address order,
 * and the same native harness input gave three different results (default
 * environment, an extra env var X=1, MallocNanoZone=0), one equal to the
 * port's. No native value is stable enough to assert (follow-up 106).
 */
const SWEEP_ORDER_DIVERGENT = new Set(['cluster dir0', 'noverlap1 dir2 n10']);

describe('quad_prog_vpsc native harness replay', () => {
  for (const c of VPSC_CASES) {
    const test = SWEEP_ORDER_DIVERGENT.has(c.name) ? it.fails : it;
    test(c.name, () => {
      const r: Replay = {
        c, opt: optionsOf(c), graph: graphOf(c),
        packed: c.packed === null ? null : Float32Array.from(c.packed),
        e: null, place: new Float32Array(c.n),
      };
      for (const op of c.ops) replayOp(r, op);
    });
  }
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
