// SPDX-License-Identifier: EPL-2.0

/**
 * Oracle-pin test for partition.ts (ortho P2, T1).
 *
 * The fixtures' gcell obstacle boxes and bounding box BB (node coords ±
 * size/2, expanded by MARGIN=36) were dumped from instrumented native
 * graphviz `dot` on `splines=ortho` inputs. Each fixture drives `partition`
 * with those exact gcells + BB (ADR-2: isolate pipeline logic from layout).
 *
 * The two segment permutations, the rectangle sets and the stream position
 * after `partition` come from graphviz 16.1.1's own `partition()` and
 * `gv_permutation`, linked from the oracle build's libortho.a and libutil.a
 * (plans/issue-164-ortho-libc-rand/harness/partition-1611.c), each case
 * starting from `srand(1)`. 16.1.1 (b99490ece) draws the permutations from
 * the process-global libc rand() stream, so every `partition` call here is
 * preceded by `csrand(1)`: the result depends on the stream position.
 *
 * Comparison is order-normalized by (LL.x, LL.y, UR.x, UR.y): C emits boxes
 * in monotonate_trapezoids DFS order; the TS port emits in trapezoid-index
 * order. The SET must match exactly.
 *
 * @see lib/ortho/partition.c:partition
 * @see lib/util/random.c:gv_permutation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  partition, traverseChildOrderForTest, TR_FROM_UP, TR_FROM_DN,
} from "./partition.js";
import { crand, csrand, gvPermutation } from "../common/crand.js";
import type { Cell, OrthoBox } from "./types.js";
import type { SegmentT, TrapT } from "./trapezoid.js";

/** Build a partition input Cell from a bounding box (only bb is read). */
function mkCell(LLx: number, LLy: number, URx: number, URy: number): Cell {
  return {
    flags: 0,
    nedges: 0,
    edges: [],
    nsides: 0,
    sides: [],
    bb: { LL: { x: LLx, y: LLy }, UR: { x: URx, y: URy } },
  };
}

function box(LLx: number, LLy: number, URx: number, URy: number): OrthoBox {
  return { LL: { x: LLx, y: LLy }, UR: { x: URx, y: URy } };
}

/** Normalize a box list to a sorted key set for order-independent equality. */
function boxKeys(boxes: OrthoBox[]): string[] {
  return boxes
    .map((b) => `${b.LL.x},${b.LL.y},${b.UR.x},${b.UR.y}`)
    .sort();
}

/** Unseeded libc rand() behaves as srand(1): a fresh native process. */
const UNSEEDED = 1;

/** C generateRandomOrdering (16.1.1): gv_permutation made 1-based. */
function genOrder(n: number): number[] {
  return gvPermutation(n).map((v) => v + 1);
}

interface Fixture {
  name: string;
  bb: OrthoBox;
  cells: Cell[];
  hperm: number[];
  vperm: number[];
  /** The next rand() after partition, from srand(1). */
  nextRand: number;
  rects: OrthoBox[];
}

// --- C-dumped fixtures (gcells + BB from instrumented native dot; orderings,
// rectangles and nextRand from the 16.1.1 partition() harness) ---------------

const FIXTURES: Fixture[] = [
  {
    name: "f2pair: a -> b (2-node chain)",
    bb: box(-63, -36, 63, 144),
    cells: [mkCell(-27, 72, 27, 108), mkCell(-27, 0, 27, 36)],
    hperm: [12, 6, 11, 5, 10, 1, 7, 9, 3, 4, 2, 8],
    vperm: [7, 12, 4, 5, 9, 2, 10, 8, 1, 3, 11, 6],
    nextRand: 1264817709,
    rects: [
      box(-63, -36, -27, 0),
      box(-63, 0, -27, 36),
      box(-63, 36, -27, 72),
      box(-63, 72, -27, 108),
      box(-63, 108, -27, 144),
      box(-27, 108, 27, 144),
      box(27, -36, 63, 0),
      box(27, 36, 63, 72),
      box(27, 108, 63, 144),
      box(27, 72, 63, 108),
      box(27, 0, 63, 36),
      box(-27, -36, 27, 0),
      box(-27, 36, 27, 72),
    ],
  },
  {
    name: "f3chain: a -> b -> c (3-node chain)",
    bb: box(-63, -36, 63, 216),
    cells: [
      mkCell(-27, 144, 27, 180),
      mkCell(-27, 72, 27, 108),
      mkCell(-27, 0, 27, 36),
    ],
    hperm: [16, 7, 3, 14, 6, 1, 2, 12, 9, 15, 4, 13, 11, 10, 5, 8],
    vperm: [9, 11, 15, 3, 13, 4, 2, 6, 1, 10, 7, 5, 14, 12, 16, 8],
    nextRand: 1954899097,
    rects: [
      box(27, -36, 63, 0),
      box(27, 36, 63, 72),
      box(27, 108, 63, 144),
      box(27, 180, 63, 216),
      box(27, 144, 63, 180),
      box(27, 72, 63, 108),
      box(27, 0, 63, 36),
      box(-27, -36, 27, 0),
      box(-63, -36, -27, 0),
      box(-63, 0, -27, 36),
      box(-63, 36, -27, 72),
      box(-63, 72, -27, 108),
      box(-63, 108, -27, 144),
      box(-63, 144, -27, 180),
      box(-63, 180, -27, 216),
      box(-27, 180, 27, 216),
      box(-27, 36, 27, 72),
      box(-27, 108, 27, 144),
    ],
  },
  {
    name: "f3branch: a -> b, a -> c (branch)",
    bb: box(-99, -36, 99, 144),
    cells: [
      mkCell(-27, 72, 27, 108),
      mkCell(-63, 0, -9, 36),
      mkCell(9, 0, 63, 36),
    ],
    hperm: [16, 7, 3, 14, 6, 1, 2, 12, 9, 15, 4, 13, 11, 10, 5, 8],
    vperm: [9, 11, 15, 3, 13, 4, 2, 6, 1, 10, 7, 5, 14, 12, 16, 8],
    nextRand: 1954899097,
    rects: [
      box(63, -36, 99, 0),
      box(63, 36, 99, 72),
      box(63, 108, 99, 144),
      box(63, 72, 99, 108),
      box(63, 0, 99, 36),
      box(9, -36, 63, 0),
      box(-9, -36, 9, 0),
      box(-9, 36, 9, 72),
      box(-9, 0, 9, 36),
      box(-63, -36, -9, 0),
      box(-99, -36, -63, 0),
      box(-99, 0, -63, 36),
      box(-99, 36, -63, 72),
      box(-99, 72, -63, 108),
      box(-99, 108, -63, 144),
      box(-63, 36, -27, 72),
      box(-63, 72, -27, 108),
      box(-63, 108, -27, 144),
      box(-27, 108, 27, 144),
      box(27, 36, 63, 72),
      box(27, 108, 63, 144),
      box(27, 72, 63, 108),
      box(9, 36, 27, 72),
      box(-27, 36, -9, 72),
    ],
  },
];

describe("ortho partition — oracle-pinned vs native C", () => {
  beforeEach(() => {
    csrand(UNSEEDED);
  });

  for (const fx of FIXTURES) {
    describe(fx.name, () => {
      const nsegs = 4 * (fx.cells.length + 1);

      it("reproduces the C gv_permutation orderings (hperm, vperm)", () => {
        expect(genOrder(nsegs)).toEqual(fx.hperm);
        expect(genOrder(nsegs)).toEqual(fx.vperm);
      });

      it("produces the C rectangle set", () => {
        const got = partition(fx.cells, fx.bb)!;
        expect(got).toHaveLength(fx.rects.length);
        expect(boxKeys(got)).toEqual(boxKeys(fx.rects));
      });

      it("draws both orderings from the shared rand() stream, unseeded", () => {
        partition(fx.cells, fx.bb);
        expect(crand()).toBe(fx.nextRand);
      });

      it("is deterministic from the same stream position", () => {
        const a = partition(fx.cells, fx.bb)!;
        csrand(UNSEEDED);
        const b = partition(fx.cells, fx.bb)!;
        expect(boxKeys(a)).toEqual(boxKeys(b));
      });
    });
  }
});

// ---------------------------------------------------------------------------
// traverse_polygon branch-table transcription (F1) — direct unit tests
//
// C's traverse_polygon (partition.c:400-621) is a preorder DFS over the
// trapezoid u0/u1/d0/d1 adjacency whose recursive CALL ORDER varies per
// branch based on (from, dir) and a handful of `equal_to` geometry checks.
// The prior port's iterative form used a fixed push order (u0,u1,d0,d1,
// popped LIFO) and skipped the true DFS entry point (`tr_start` itself),
// which is provably box-SET-correct (order-normalized, see the oracle-pinned
// tests above) but not order-faithful to C. `childOrder` is the literal
// branch-table transcription; these tests pin its output against hand-built
// TrapT/SegmentT fixtures chosen to hit each branch, citing the C line the
// branch corresponds to — a regression net for the transcription itself,
// independent of whether a given real-world maze geometry currently
// exercises the branch (per F1 investigation: on the corpus tested, box
// SETS never depend on traversal order, so `partition()`'s output is
// unchanged by this fix on every fixture tried — see decisions.md).
// ---------------------------------------------------------------------------

const ORIGIN = { x: 0, y: 0 };

/** Minimal TrapT — only the fields childOrder reads are meaningful. */
function mkTrap(over: Partial<TrapT>): TrapT {
  return {
    lseg: 0, rseg: 0, hi: ORIGIN, lo: ORIGIN,
    u0: 0, u1: 0, d0: 0, d1: 0,
    sink: 0, usave: 0, uside: 0, isValid: true,
    ...over,
  };
}

/** seg[] indexed from 1 (index 0 unused, matches C's 1-based segment array). */
function mkSegArray(entries: Record<number, Partial<SegmentT>>): SegmentT[] {
  const seg: SegmentT[] = [];
  const max = Math.max(0, ...Object.keys(entries).map(Number));
  for (let i = 0; i <= max; i++) {
    seg.push({
      v0: ORIGIN, v1: ORIGIN, isInserted: false, root0: 0, root1: 0, next: 0, prev: 0,
      ...entries[i],
    });
  }
  return seg;
}

describe("traverse_polygon childOrder — C branch-table transcription", () => {
  it("no u-neighbours, single d-neighbour: 'just traverse all neighbours' fallback (partition.c:419-426)", () => {
    const t = mkTrap({ u0: 0, u1: 0, d0: 5, d1: 0, lseg: 1, rseg: 2 });
    const seg = mkSegArray({});
    expect(traverseChildOrderForTest(t, seg, 0, TR_FROM_DN))
      .toEqual([[0, TR_FROM_DN], [0, TR_FROM_DN], [5, TR_FROM_UP], [0, TR_FROM_UP]]);
  });

  it("downward opening triangle, from === d1 (partition.c:406-411)", () => {
    const t = mkTrap({ u0: 0, u1: 0, d0: 5, d1: 7, lseg: 1, rseg: 2 });
    const seg = mkSegArray({});
    expect(traverseChildOrderForTest(t, seg, 7, TR_FROM_UP))
      .toEqual([[7, TR_FROM_UP], [5, TR_FROM_UP]]);
  });

  it("downward opening triangle, from !== d1 (partition.c:412-417)", () => {
    const t = mkTrap({ u0: 0, u1: 0, d0: 5, d1: 7, lseg: 1, rseg: 2 });
    const seg = mkSegArray({});
    expect(traverseChildOrderForTest(t, seg, 99, TR_FROM_UP))
      .toEqual([[5, TR_FROM_UP], [7, TR_FROM_UP]]);
  });

  it("upward opening triangle, from === u1 (partition.c:433-437)", () => {
    const t = mkTrap({ u0: 5, u1: 7, d0: 0, d1: 0, lseg: 1, rseg: 2 });
    const seg = mkSegArray({});
    expect(traverseChildOrderForTest(t, seg, 7, TR_FROM_DN))
      .toEqual([[7, TR_FROM_DN], [5, TR_FROM_DN]]);
  });

  it("downward+upward cusps, tie-break condition true (partition.c:460-468)", () => {
    const t = mkTrap({ u0: 5, u1: 7, d0: 9, d1: 11, lseg: 1, rseg: 2 });
    expect(traverseChildOrderForTest(t, mkSegArray({}), 11, TR_FROM_DN))
      .toEqual([[7, TR_FROM_DN], [11, TR_FROM_UP], [5, TR_FROM_DN], [9, TR_FROM_UP]]);
  });

  it("downward+upward cusps, tie-break condition false (partition.c:469-476)", () => {
    const t = mkTrap({ u0: 5, u1: 7, d0: 9, d1: 11, lseg: 1, rseg: 2 });
    expect(traverseChildOrderForTest(t, mkSegArray({}), 99, TR_FROM_DN))
      .toEqual([[5, TR_FROM_DN], [9, TR_FROM_UP], [7, TR_FROM_DN], [11, TR_FROM_UP]]);
  });

  it("only downward cusp, equal_to(lo, lseg.v1) true, dir=UP && u0===from (partition.c:484-491)", () => {
    const t = mkTrap({
      u0: 5, u1: 7, d0: 9, d1: 0, lseg: 1, rseg: 2, lo: { x: 10, y: 20 },
    });
    const seg = mkSegArray({ 1: { v1: { x: 10, y: 20 } } });
    expect(traverseChildOrderForTest(t, seg, 5, TR_FROM_UP))
      .toEqual([[5, TR_FROM_DN], [9, TR_FROM_UP], [7, TR_FROM_DN], [0, TR_FROM_UP]]);
  });

  it("only downward cusp, equal_to(lo, lseg.v1) true, else branch (partition.c:492-499)", () => {
    const t = mkTrap({
      u0: 5, u1: 7, d0: 9, d1: 0, lseg: 1, rseg: 2, lo: { x: 10, y: 20 },
    });
    const seg = mkSegArray({ 1: { v1: { x: 10, y: 20 } } });
    expect(traverseChildOrderForTest(t, seg, 99, TR_FROM_DN))
      .toEqual([[7, TR_FROM_DN], [9, TR_FROM_UP], [0, TR_FROM_UP], [5, TR_FROM_DN]]);
  });

  it("only upward cusp, equal_to(hi, lseg.v0) true, condition true (partition.c:529-536)", () => {
    const t = mkTrap({
      u0: 5, u1: 0, d0: 9, d1: 11, lseg: 1, rseg: 2, hi: { x: 30, y: 40 },
    });
    const seg = mkSegArray({ 1: { v0: { x: 30, y: 40 } } });
    expect(traverseChildOrderForTest(t, seg, 99, TR_FROM_UP))
      .toEqual([[0, TR_FROM_DN], [11, TR_FROM_UP], [5, TR_FROM_DN], [9, TR_FROM_UP]]);
  });

  it("no cusp, first split-point pair matches, dir=UP (partition.c:571-581)", () => {
    const t = mkTrap({
      u0: 5, u1: 0, d0: 9, d1: 0, lseg: 1, rseg: 2,
      hi: { x: 30, y: 40 }, lo: { x: 0, y: 0 },
    });
    const seg = mkSegArray({
      1: { v0: { x: 30, y: 40 } },
      2: { v0: { x: 0, y: 0 } },
    });
    expect(traverseChildOrderForTest(t, seg, 0, TR_FROM_UP))
      .toEqual([[5, TR_FROM_DN], [0, TR_FROM_DN], [0, TR_FROM_UP], [9, TR_FROM_UP]]);
  });

  it("no cusp, no split possible → fallback (partition.c:613-619)", () => {
    const t = mkTrap({
      u0: 5, u1: 0, d0: 9, d1: 0, lseg: 1, rseg: 2,
      hi: { x: 1, y: 1 }, lo: { x: 2, y: 2 },
    });
    const seg = mkSegArray({
      1: { v0: { x: 99, y: 99 }, v1: { x: 66, y: 66 } },
      2: { v0: { x: 88, y: 88 }, v1: { x: 77, y: 77 } },
    });
    expect(traverseChildOrderForTest(t, seg, 0, TR_FROM_UP))
      .toEqual([[5, TR_FROM_DN], [9, TR_FROM_UP], [0, TR_FROM_DN], [0, TR_FROM_UP]]);
  });
});
