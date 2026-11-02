// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  assignDigcolaLevels,
  generateNonoverlapConstraints,
  getNumDigcolaConstraints,
  removeoverlaps,
} from './quad-prog-vpsc-overlap.js';
import { initCMajVPSC } from './quad-prog-vpsc.js';
import { VPSC_CASES, graphOf, optionsOf, type VpscOp } from './__fixtures__/quad-prog-vpsc.js';

/*
 * Native values come from the T5 harness (fixture header): constraint lists
 * (left id, right id, gap) of generateNonoverlapConstraints and the float
 * coordinates of removeoverlaps.
 */

const levelsOf = (sizes: number[]): { nodes: Int32Array; numNodes: number }[] =>
  sizes.map((s) => ({ nodes: new Int32Array(s), numNodes: s }));

describe('assignDigcolaLevels', () => {
  const ordering = Int32Array.from([4, 2, 0, 1, 3, 5]);

  it('cuts ordering at each level start, the last level running to n', () => {
    const l = assignDigcolaLevels(ordering, 6, Int32Array.from([2, 3, 5]), 3);
    expect(l.map((x) => [x.numNodes, Array.from(x.nodes)])).toEqual([
      [2, [4, 2]], [1, [0]], [2, [1, 3]], [1, [5]],
    ]);
  });

  it('has a single level of all n nodes with no divisions', () => {
    const l = assignDigcolaLevels(ordering, 6, Int32Array.from([6]), 0);
    expect(l.map((x) => [x.numNodes, Array.from(x.nodes)])).toEqual([[6, [4, 2, 0, 1, 3, 5]]]);
  });
});

describe('getNumDigcolaConstraints', () => {
  it('sums adjacent level pairs plus the first and last level', () => {
    // (3+2) + (4+3) + |L0| 2 + |L2| 4
    expect(getNumDigcolaConstraints(levelsOf([2, 3, 4]), 3)).toBe(18);
  });

  it('counts the single level twice', () => {
    expect(getNumDigcolaConstraints(levelsOf([5]), 1)).toBe(10);
  });
});

describe('removeoverlaps (native harness)', () => {
  for (const c of VPSC_CASES) {
    for (const op of c.ops) {
      if (op.op !== 'RM') continue;
      it(c.name, () => {
        const coords = [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)];
        removeoverlaps(c.n, coords, optionsOf(c));
        expect(Array.from(coords[0]!)).toEqual(op.expect.x.map(Math.fround));
        expect(Array.from(coords[1]!)).toEqual(op.expect.y.map(Math.fround));
      });
    }
  }
});

describe('generateNonoverlapConstraints (native harness, constraint lists)', () => {
  // Constraint lists depend only on the boxes and the earlier passes, not on
  // solves; a GNCK pass reads y from the previous solve's native result.
  const passCases = VPSC_CASES.filter((c) => c.name.startsWith('noverlap1 dir0') || c.name === 'cluster dir1');
  for (const c of passCases) {
    it(c.name, () => {
      const opt = optionsOf(c);
      const init = c.ops.find((o) => o.op === 'INIT');
      const e = initCMajVPSC(c.n, null, graphOf(c), opt, init?.op === 'INIT' ? init.diredges : 0)!;
      let lastPlace: readonly number[] = [];
      for (const op of c.ops as VpscOp[]) {
        if (op.op === 'CMV' || op.op === 'CMVK') lastPlace = op.expect.place;
        if (op.op !== 'GNC' && op.op !== 'GNCK') continue;
        const coords = op.op === 'GNC'
          ? [Float32Array.from(op.coords[0]!), Float32Array.from(op.coords[1]!)]
          : [Float32Array.from(op.x), Float32Array.from(lastPlace)];
        generateNonoverlapConstraints(e, { nsizeScale: Math.fround(op.scale), coords, k: op.k, transitiveClosure: op.tc, opt });
        expect(e.cs!.map((x) => [x.left.id, x.right.id, x.gap])).toEqual(op.expect.cs);
      }
    });
  }

  it('keeps the global constraints first and replaces only the overlap ones', () => {
    const c = VPSC_CASES.find((x) => x.name === 'cluster dir1')!;
    const opt = optionsOf(c);
    const e = initCMajVPSC(c.n, null, null, opt, 0)!;
    const globals = e.gcs!.slice();
    const xy = [new Float32Array(c.n), new Float32Array(c.n)];
    for (let i = 0; i < c.n; i++) xy[0]![i] = i;
    generateNonoverlapConstraints(e, { nsizeScale: 1, coords: xy, k: 0, transitiveClosure: true, opt });
    const first = e.cs!.slice(e.gm);
    generateNonoverlapConstraints(e, { nsizeScale: 1, coords: xy, k: 1, transitiveClosure: false, opt });
    expect(e.cs!.slice(0, e.gm)).toEqual(globals);
    expect(e.m).toBe(e.cs!.length);
    // the previous pass's overlap constraints are detached from their variables
    expect(first.every((x) => !x.left.out.includes(x) && !x.right.in.includes(x))).toBe(true);
  });
});
