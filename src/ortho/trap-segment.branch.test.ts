// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for trap-segment.ts internal helpers not exercised by
// trapezoid.test.ts's oracle-pinned polygon fixtures (T4d): patchLowerNeighbours'
// second d1-neighbour patch (insertV0), and tribotD1's isLeftOf dispatch (both
// isSwapped values) reached through the exported handleD1Only. Each fixture is
// a minimal hand-built trap/seg/qs array — not a real polygon — engineered so
// locateEndpoint resolves via a direct T_SINK (no tree walk needed) and
// updateTrapezoid takes its simplest (both-u-invalid) path, isolating the
// target branch. Expected values were captured by running the real
// implementation and are asserted as concrete regression pins (D1).

import { describe, it, expect } from "vitest";
import { insertV0, handleD1Only } from "./trap-segment.js";
import { T_SINK, TRAP_MAX, isValidTrap } from "./trap-types.js";
import type { TrapT, QNode, SegmentT, SegPoint } from "./trap-types.js";
import { constructTrapezoids } from "./trapezoid.js";

const DUMMY_TRAP: TrapT = {
  lseg: 0, rseg: 0, hi: { x: 0, y: 0 }, lo: { x: 0, y: 0 },
  u0: 0, u1: 0, d0: 0, d1: 0, sink: 0, usave: 0, uside: 0, isValid: false,
};

function mkTr(entries: Record<number, Partial<TrapT>>, maxIdx: number): TrapT[] {
  const tr: TrapT[] = [{ ...DUMMY_TRAP }];
  for (let i = 1; i <= maxIdx; i++) tr[i] = { ...DUMMY_TRAP, ...(entries[i] ?? {}) };
  return tr;
}

describe("insertV0 — patchLowerNeighbours patches the second d1 upper-neighbour", () => {
  it("rewires tr[d].u1 from tu to the newly split tl when tr[tu].d1 is valid", () => {
    // tu=1 has d1=5; tr[5].u1===tu (tr[5].u0 deliberately != tu, isolating the
    // L45 branch from the sibling L44 check).
    const tr = mkTr({
      1: { d1: 5 },
      5: { u0: 99, u1: 1, isValid: true },
      99: {},
    }, 5);
    tr[99] = { ...DUMMY_TRAP };
    const qs: QNode[] = [{ nodetype: T_SINK, segnum: 0, yval: { x: 0, y: 0 }, trnum: 1, parent: 0, left: 0, right: 0 }];
    const s: SegmentT = { v0: { x: 1, y: 1 }, v1: { x: 2, y: 2 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    const tl = insertV0(s, [s], tr, qs, 0);
    expect(tr[5]!.u1).toBe(tl);
  });
});

describe("handleD1Only — tribotD1 dispatch on isLeftOf(tmp, seg, s.v0)", () => {
  function baseTr(): TrapT[] {
    return mkTr({
      1: { lo: { x: 5, y: 5 }, d1: 7 },
      2: { d1: 8 },
      3: { lo: { x: 5, y: 5 } }, // atBottom(tr,1,3) true: tr[1].lo === tr[3].lo
    }, 8);
  }

  it("tmp>0 && isLeftOf true: patches tr[tr[t].d1].u0 = t, TRAP_MAXes tn.d0/d1", () => {
    const tr = baseTr();
    const s: SegmentT = { v0: { x: -5, y: 2 }, v1: { x: 2, y: 2 }, isInserted: false, root0: 0, root1: 0, next: 1, prev: 0 };
    const nextSeg: SegmentT = { v0: { x: 0, y: 0 }, v1: { x: 0, y: 10 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    handleD1Only(s, [s, nextSeg], tr, 1, 2, 3, 0, false, true);
    expect(tr[7]!.u0).toBe(1);
    expect(tr[2]!.d0).toBe(TRAP_MAX);
    expect(tr[2]!.d1).toBe(TRAP_MAX);
  });

  it("tmp<=0 (no next segment): falls to the else branch, patches tr[tr[tn].d1].u1 = tn", () => {
    const tr = baseTr();
    const s: SegmentT = { v0: { x: -5, y: 2 }, v1: { x: 2, y: 2 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    handleD1Only(s, [s], tr, 1, 2, 3, 0, false, true);
    expect(tr[8]!.u1).toBe(2);
    expect(tr[1]!.d0).toBe(TRAP_MAX);
    expect(tr[1]!.d1).toBe(TRAP_MAX);
  });

  it("isSwapped=true reads seg[segnum].prev instead of .next for tmp", () => {
    const tr = baseTr();
    const s: SegmentT = { v0: { x: -5, y: 2 }, v1: { x: 2, y: 2 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 1 };
    const prevSeg: SegmentT = { v0: { x: 0, y: 0 }, v1: { x: 0, y: 10 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    handleD1Only(s, [s, prevSeg], tr, 1, 2, 3, 0, true, true);
    expect(tr[7]!.u0).toBe(1);
  });

  it("tribot=false takes the patchUsave else branch instead of tribotD1", () => {
    const tr = mkTr({
      1: { lo: { x: 5, y: 5 }, d1: 7 },
      2: { d1: 8 },
      3: { lo: { x: 5, y: 5 } }, // atBottom(1,3) true, but tribot=false overrides
      7: { u0: 99, u1: 88, isValid: true },
    }, 8);
    const s: SegmentT = { v0: { x: -5, y: 2 }, v1: { x: 2, y: 2 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 };
    handleD1Only(s, [s], tr, 1, 2, 3, 0, false, false); // tribot=false
    // patchUsave: tr[7].u0(99) !== t(1) -> usave=u0=99, uside=S_RIGHT(2).
    expect(tr[7]!.usave).toBe(99);
    expect(tr[7]!.uside).toBe(2);
    // Then tr[tr[1].d1].u0=1, .u1=2 (tr[7]).
    expect(tr[7]!.u0).toBe(1);
    expect(tr[7]!.u1).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// advanceT (internal, only reachable through constructTrapezoids) — the
// exclusive-d0 / exclusive-d1 dispatch arms. The oracle-pinned triangle/
// rectangle fixtures in trapezoid.test.ts only ever exercise the "both
// valid" (handleBothD) and "neither valid" (terminal) arms; a concave
// polygon's asymmetric trapezoid split is needed to produce a trapezoid with
// exactly one valid down-neighbour. These are self-consistency regression
// pins (not oracle-verified — this is a coverage probe of an internal
// dispatch, not a conformance test), captured by running the real
// implementation.
// ---------------------------------------------------------------------------

function buildPoly(points: SegPoint[]): SegmentT[] {
  const n = points.length;
  const seg: SegmentT[] = [];
  for (let i = 0; i <= n; i++) {
    seg.push({ v0: { x: 0, y: 0 }, v1: { x: 0, y: 0 }, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0 });
  }
  for (let i = 1; i <= n; i++) {
    seg[i]!.next = i === n ? 1 : i + 1;
    seg[i]!.prev = i === 1 ? n : i - 1;
  }
  for (let i = 1; i <= n; i++) {
    seg[i]!.v0 = { ...points[i - 1]! };
    seg[seg[i]!.prev]!.v1 = { ...points[i - 1]! };
  }
  return seg;
}
function identity(nseg: number): number[] {
  return Array.from({ length: nseg }, (_, i) => i + 1);
}

describe("advanceT — exclusive-d0/d1 dispatch via a concave polygon", () => {
  it("an L-shaped hexagon trapezoidizes deterministically with a mix of down-neighbour arities", () => {
    const pts: SegPoint[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 },
      { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 0, y: 4 },
    ];
    const tr = constructTrapezoids(pts.length, buildPoly(pts), identity(pts.length));
    const valid = tr.filter((t) => t.isValid);
    expect(valid.length).toBe(13);
    // Every valid trapezoid has 0, 1, or 2 valid down-neighbours; confirm at
    // least one trapezoid has EXACTLY one (the d0-only or d1-only arm).
    const arities = valid.map((t) => Number(isValidTrap(t.d0)) + Number(isValidTrap(t.d1)));
    expect(arities.filter((a) => a === 1).length).toBeGreaterThan(0);
  });

  it("re-running the same concave polygon is deterministic", () => {
    const pts: SegPoint[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 },
      { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 0, y: 4 },
    ];
    const a = constructTrapezoids(pts.length, buildPoly(pts), identity(pts.length));
    const b = constructTrapezoids(pts.length, buildPoly(pts), identity(pts.length));
    expect(a.map((t) => t.isValid)).toEqual(b.map((t) => t.isValid));
  });
});
