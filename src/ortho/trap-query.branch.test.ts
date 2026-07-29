// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for trap-query.ts's isLeftOf and mergeTrapezoids/doMerge
// internals not exercised by trapezoid.test.ts's oracle-pinned polygon
// fixtures (T4d): isLeftOf's on-endpoint fast paths for both segment
// orientations, and checkMergeCond/doMerge's S_RIGHT d1 branch (hand-built
// trap/qnode arrays, isolating the merge step the way real polygon
// trapezoidation would reach it after several segments share a boundary).
// Expected values were captured by running the real implementation and are
// asserted as concrete regression pins (D1).

import { describe, it, expect } from "vitest";
import { isLeftOf, mergeTrapezoids } from "./trap-query.js";
import { S_RIGHT } from "./trap-types.js";
import type { SegmentT, TrapT, QNode } from "./trap-types.js";

describe("isLeftOf — on-endpoint fast paths", () => {
  it("upward segment (v1.y > v0.y), query on v1's y, at/right of v1.x -> false", () => {
    const segUp: SegmentT = { v0: { x: 0, y: 0 }, v1: { x: 0, y: 10 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    expect(isLeftOf(0, [segUp], { x: 5, y: 10 })).toBe(false);
  });

  it("downward segment (v0.y > v1.y), query on v1's y, left of v1.x -> true", () => {
    const segDown: SegmentT = { v0: { x: 0, y: 10 }, v1: { x: 0, y: 0 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    expect(isLeftOf(0, [segDown], { x: -5, y: 0 })).toBe(true);
  });

  it("downward segment, query on v0's y, at/right of v0.x -> false", () => {
    const segDown: SegmentT = { v0: { x: 0, y: 10 }, v1: { x: 0, y: 0 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    expect(isLeftOf(0, [segDown], { x: 5, y: 10 })).toBe(false);
  });
});

describe("mergeTrapezoids / doMerge — S_RIGHT d1 branch", () => {
  const DUMMY: TrapT = {
    lseg: 0, rseg: 0, hi: { x: 0, y: 0 }, lo: { x: 0, y: 0 },
    u0: 0, u1: 0, d0: 0, d1: 0, sink: 0, usave: 0, uside: 0, isValid: false,
  };

  /** t=1 (d0 invalid, forcing the d1 branch), tnext=5 (d1 valid, lseg match
   *  triggers doMerge), tnext's own d1=6 whose u0/u1 vary per test. */
  function baseFixture(t6u0: number, t6u1: number): { tr: TrapT[]; qs: QNode[] } {
    const tr: TrapT[] = [{ ...DUMMY }];
    tr[1] = { ...DUMMY, d0: 0, d1: 5, lseg: 7, rseg: 3, lo: { x: 0, y: 0 }, sink: 1, isValid: true };
    tr[5] = { ...DUMMY, lseg: 7, rseg: 3, d0: 0, d1: 6, lo: { x: 0, y: 5 }, sink: 2, isValid: true };
    tr[6] = { ...DUMMY, lseg: 99, u0: t6u0, u1: t6u1, lo: { x: 0, y: -1000 }, isValid: true };
    const qs: QNode[] = [{ nodetype: 0, segnum: 0, yval: { x: 0, y: 0 }, trnum: 0, parent: 0, left: 0, right: 0 }];
    qs[1] = { nodetype: 0, segnum: 0, yval: { x: 0, y: 0 }, trnum: 0, parent: 3, left: 0, right: 0 };
    qs[2] = { nodetype: 0, segnum: 0, yval: { x: 0, y: 0 }, trnum: 0, parent: 3, left: 0, right: 0 };
    qs[3] = { nodetype: 0, segnum: 0, yval: { x: 0, y: 0 }, trnum: 0, parent: 0, left: 2, right: 99 };
    return { tr, qs };
  }

  it("checkMergeCond evaluates the d1/lseg branch (d0 invalid) and doMerge patches u1===tnext", () => {
    const { tr, qs } = baseFixture(88, 5); // tr[6].u1 === tnext(5)
    mergeTrapezoids(7, 1, 1, S_RIGHT, tr, qs);
    expect(tr[6]!.u1).toBe(1); // repointed from tnext(5) to t(1)
    expect(tr[5]!.isValid).toBe(false);
    expect(qs[3]!.left).toBe(1); // parent's child pointer repointed to tr[1].sink
  });

  it("doMerge's else-if falls through when neither u0 nor u1 match tnext", () => {
    const { tr, qs } = baseFixture(88, 77); // neither matches tnext(5)
    mergeTrapezoids(7, 1, 1, S_RIGHT, tr, qs);
    expect(tr[6]!.u0).toBe(88); // unchanged
    expect(tr[6]!.u1).toBe(77); // unchanged
    expect(tr[5]!.isValid).toBe(false); // merge itself still happened
  });
});
