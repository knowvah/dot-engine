// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage unit tests for src/ortho/ortho-route.ts (T3a, coverage-90
 * batch-3). Targets the `seg_cmp` comparison tree (segCmpInner, overlapSeg,
 * segCmpEqualP1, segCmpSameEnds, eqEndSeg, ellSeg — all private, reached only
 * through the exported `segCmp`), the `vtrack`/`htrack` no-channel fallback,
 * the `assignSegs` no-channel skip, and `assignTracks`'s early-return failure
 * paths when a channel holds mutually-incomparable segments.
 *
 * Every fixture below was verified against the actual `segCmp` output via a
 * throwaway tracer script (not checked in) that mirrors the C branch
 * structure with tags, confirming the exact branch each input pair reaches
 * before being transcribed here — so each assertion's expected value is a
 * measured fact, not a hand-derived guess.
 *
 * @see lib/ortho/ortho.c:segCmp, eqEndSeg, overlapSeg, ellSeg, seg_cmp
 * @see lib/ortho/ortho.c:vtrack, htrack, assignSegs, assignTracks
 */

import { describe, it, expect } from "vitest";
import { segCmp, vtrack, htrack, assignSegs, assignTracks } from "./ortho-route.js";
import { makeGraph } from "./rawgraph.js";
import { newChanDict } from "./maze-channels.js";
import { CdtOset } from "./chan-dict.js";
import { Bend } from "./types.js";
import type { OrthoSegment, Maze, ChanItem, Paird, SGraph, Channel } from "./types.js";

const B_NODE = Bend.B_NODE;
const B_UP = Bend.B_UP;
const B_DOWN = Bend.B_DOWN;
const B_LEFT = Bend.B_LEFT;
const B_RIGHT = Bend.B_RIGHT;

function seg(
  isVert: boolean,
  commCoord: number,
  p1: number,
  p2: number,
  l1: Bend,
  l2: Bend,
): OrthoSegment {
  return {
    isVert, commCoord, p: { p1, p2 }, l1, l2,
    indNo: null, trackNo: null, prev: null, next: null,
  };
}

/** Local mirror of chancmpid (containment == equal) — matches ortho-parallel.test.ts. */
function chancmpidTest(k1: Paird, k2: Paird): number {
  if (k1.p1 > k2.p1) return k1.p2 <= k2.p2 ? 0 : 1;
  if (k1.p1 < k2.p1) return k1.p2 >= k2.p2 ? 0 : -1;
  return 0;
}

function emptyMaze(): Maze {
  return {
    ncells: 0, ngcells: 0, cells: [], gcells: [],
    sg: {} as SGraph, hchans: newChanDict(), vchans: newChanDict(),
  };
}

// ─── segCmp: top-level incomparable guard ─────────────────────────────────────

describe("segCmp — incomparable guard", () => {
  it("returns -2 when isVert differs", () => {
    const a = seg(true, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(-2);
  });

  it("returns -2 when commCoord differs", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 200, 0, 10, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(-2);
  });
});

// ─── segCmpInner: no-overlap / partial-overlap / touch cases ─────────────────

describe("segCmp — segCmpInner outer dispatch", () => {
  it("no overlap returns 0", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 20, 30, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(0);
  });

  it("touching right edge (s1.p2 === s2.p1), matching l2/l1 -> 0", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_UP);
    const b = seg(false, 100, 10, 20, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(0);
  });

  it("touching right edge, s1.l2 === T2 -> 1", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_UP);
    const b = seg(false, 100, 10, 20, B_DOWN, B_NODE);
    expect(segCmp(a, b)).toBe(1);
  });

  it("touching right edge, else -> -1", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    const b = seg(false, 100, 10, 20, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("touching left edge (s1.p1 === s2.p2), matching l1/l2 -> 0", () => {
    const a = seg(false, 100, 10, 20, B_UP, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_UP);
    expect(segCmp(a, b)).toBe(0);
  });

  it("touching left edge, s1.l1 === T2 -> 1", () => {
    const a = seg(false, 100, 10, 20, B_UP, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });

  it("touching left edge, else -> -1", () => {
    const a = seg(false, 100, 10, 20, B_DOWN, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });
});

// ─── overlapSeg: reached via segCmpInner's "S2.p1 strictly inside S1" arm ────

describe("segCmp — overlapSeg (partial overlap, s1.p1 < s2.p1 < s1.p2)", () => {
  it("s1.p2 < s2.p2, matching T1/T2 ends -> -1", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    const b = seg(false, 100, 5, 20, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s1.p2 < s2.p2, matching T2/T1 ends -> 1", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_UP);
    const b = seg(false, 100, 5, 20, B_DOWN, B_NODE);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s1.p2 < s2.p2, neither end matches -> 0", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 20, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s1.p2 > s2.p2, s2 both ends T2 -> -1", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 10, B_UP, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s1.p2 > s2.p2, s2 both ends T1 -> 1", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 10, B_DOWN, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s1.p2 > s2.p2, s2 ends mixed -> 0", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 10, B_NODE, B_UP);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s1.p2 === s2.p2, s2.l1 === T2 branch (eqEndSeg -> -1)", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 20, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s1.p2 === s2.p2, s2.l1 !== T2 branch (-1 * eqEndSeg -> 1)", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 5, 20, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(1);
  });
});

// ─── segCmpEqualP1 lt/gt arms (s1.p1 === s2.p1, unequal p2) ──────────────────

describe("segCmp — segCmpEqualP1 (equal left endpoint, unequal right endpoint)", () => {
  it("s1.p2 < s2.p2, s1.l2 === T1 branch", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    const b = seg(false, 100, 0, 20, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s1.p2 < s2.p2, s1.l2 !== T1 branch", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_UP);
    const b = seg(false, 100, 0, 20, B_UP, B_NODE);
    // -1 * eqEndSeg(...) where eqEndSeg returns 0 -> JS's -1*0 yields the
    // exact IEEE754 value -0 (numerically 0, distinct only under Object.is).
    expect(segCmp(a, b)).toBe(-0);
  });

  it("s1.p2 > s2.p2, s2.l2 === T2 branch", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s1.p2 > s2.p2, s2.l2 !== T2 branch", () => {
    const a = seg(false, 100, 0, 20, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });
});

// ─── segCmpSameEnds (s1.p === s2.p exactly) ──────────────────────────────────

describe("segCmp — segCmpSameEnds (identical p-range)", () => {
  it("identical l1/l2 -> 0", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_DOWN);
    const b = seg(false, 100, 0, 10, B_UP, B_DOWN);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s2.l1===s2.l2===T1 -> 1", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_UP);
    const b = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2.l1===s2.l2===T2 -> -1", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    const b = seg(false, 100, 0, 10, B_UP, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2.l1===s2.l2 (neither T1/T2), s1 avoids T1 -> 1", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_UP);
    const b = seg(false, 100, 0, 10, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2.l1===s2.l2 (neither T1/T2), s1 avoids T2 -> -1", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    const b = seg(false, 100, 0, 10, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2.l1===s2.l2, s1 hits both T1 and T2 -> 0", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_DOWN);
    const b = seg(false, 100, 0, 10, B_NODE, B_NODE);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s2 = (T1,T2), s1 matches the 'a' pattern -> 1", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_UP);
    const b = seg(false, 100, 0, 10, B_DOWN, B_UP);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2 = (T1,T2), s1 matches the 'b' pattern -> -1", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    const b = seg(false, 100, 0, 10, B_DOWN, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2 = (T1,T2), s1 matches neither -> 0", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_DOWN, B_UP);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s2 = (T2,T1), s1 matches the 'a' pattern -> 1", () => {
    const a = seg(false, 100, 0, 10, B_UP, B_UP);
    const b = seg(false, 100, 0, 10, B_UP, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2 = (T2,T1), s1 matches the 'b' pattern -> -1", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    const b = seg(false, 100, 0, 10, B_UP, B_DOWN);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2 = (T2,T1), s1 matches neither -> 0", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_UP, B_DOWN);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s2 = (NODE,T1) -> ellSeg dispatch, s1.l1===T -> 1 (ellSeg else)", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2 = (NODE,T1) -> ellSeg s1.l1===T, s1.l2!==T -> 0", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    expect(segCmp(a, b)).toBe(0);
  });

  it("s2 = (NODE,T1) -> ellSeg s1.l1===T, s1.l2===T -> -1", () => {
    const a = seg(false, 100, 0, 10, B_DOWN, B_DOWN);
    const b = seg(false, 100, 0, 10, B_NODE, B_DOWN);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2 = (NODE,T2) -> -1 * ellSeg", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_NODE, B_UP);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("s2 = (T1,NODE) -> ellSeg(l2,l1,T1)", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_DOWN, B_NODE);
    expect(segCmp(a, b)).toBe(1);
  });

  it("s2 = (T2,NODE) -> -1 * ellSeg(l2,l1,T2)", () => {
    const a = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const b = seg(false, 100, 0, 10, B_UP, B_NODE);
    expect(segCmp(a, b)).toBe(-1);
  });
});

// ─── vertical axis sanity (T1=B_RIGHT, T2=B_LEFT) ────────────────────────────

describe("segCmp — vertical axis uses B_RIGHT/B_LEFT thresholds", () => {
  it("same-ends, s2 both RIGHT (T1) -> -1", () => {
    const a = seg(true, 100, 0, 10, B_RIGHT, B_RIGHT);
    const b = seg(true, 100, 0, 10, B_LEFT, B_LEFT);
    expect(segCmp(a, b)).toBe(-1);
  });

  it("same-ends, s2 both LEFT (T2) -> 1", () => {
    const a = seg(true, 100, 0, 10, B_LEFT, B_LEFT);
    const b = seg(true, 100, 0, 10, B_RIGHT, B_RIGHT);
    expect(segCmp(a, b)).toBe(1);
  });
});

// ─── vtrack / htrack: channel-not-found fallback ─────────────────────────────

describe("vtrack / htrack — chanSearch miss falls back to commCoord", () => {
  it("vtrack returns commCoord verbatim when no channel matches", () => {
    const s = seg(true, 42, 0, 10, B_NODE, B_NODE);
    expect(vtrack(s, emptyMaze())).toBe(42);
  });

  it("htrack returns commCoord verbatim when no channel matches", () => {
    const s = seg(false, 42, 0, 10, B_NODE, B_NODE);
    expect(htrack(s, emptyMaze())).toBe(42);
  });
});

// ─── assignSegs: chanSearch miss is silently skipped ─────────────────────────

describe("assignSegs — segment with no matching channel is skipped, not thrown", () => {
  it("does not throw and leaves no trace when chanSearch misses", () => {
    const mp = emptyMaze();
    const s = seg(true, 999, 0, 10, B_NODE, B_NODE);
    expect(() => assignSegs([{ segs: [s] }], mp)).not.toThrow();
    expect(s.indNo).toBeNull();
  });
});

// ─── assignTracks: propagated failure from incomparable segments ────────────

function chanWithIncomparablePair(isVert1: boolean, isVert2: boolean) {
  const s1 = seg(isVert1, 100, 0, 10, B_NODE, B_NODE);
  const s2 = seg(isVert2, 100, 0, 10, B_NODE, B_NODE); // same p-range, differing isVert
  const chan: Channel = { p: { p1: 0, p2: 10 }, segList: [s1, s2], G: null, cp: null };
  const dict = newChanDict();
  const item: ChanItem = { v: 100, chans: new CdtOset<Channel, Paird>((c) => c.p, chancmpidTest) };
  item.chans.insert(chan);
  dict.insert(item);
  return dict;
}

/** Two mutually-parallel top-level segs whose prev-chain is incomparable, so
 * addPEdgesAll's decidePoint call fails (segCmp === -2) after addNpEdges
 * already succeeded on the pair itself (segCmp(identical) === 0, not -2). */
function chanWithBadParallelPrev(): ReturnType<typeof newChanDict> {
  const a = seg(false, 77, 1, 2, B_NODE, B_NODE);
  const b = seg(true, 77, 5, 6, B_NODE, B_NODE); // differs isVert AND p-range: not parallel, then incomparable
  const segI = seg(false, 100, 10, 50, B_NODE, B_NODE);
  const segJ = seg(false, 100, 10, 50, B_NODE, B_NODE);
  segI.indNo = 0; segJ.indNo = 1;
  segI.prev = a; segJ.prev = b;
  const chan: Channel = { p: { p1: 10, p2: 50 }, segList: [segI, segJ], G: null, cp: null };
  const dict = newChanDict();
  const item: ChanItem = { v: 100, chans: new CdtOset<Channel, Paird>((c) => c.p, chancmpidTest) };
  item.chans.insert(chan);
  dict.insert(item);
  return dict;
}

describe("assignTracks — failure paths propagate through addNpEdges / addPEdgesAll", () => {
  it("fails when a horizontal channel has incomparable segments (addNpEdges/hchans)", () => {
    const mp: Maze = {
      ncells: 0, ngcells: 0, cells: [], gcells: [], sg: {} as SGraph,
      hchans: chanWithIncomparablePair(false, true), vchans: newChanDict(),
    };
    expect(assignTracks(mp)).toBe(-1);
  });

  it("fails when a vertical channel has incomparable segments (addNpEdges/vchans, hchans clean)", () => {
    const mp: Maze = {
      ncells: 0, ngcells: 0, cells: [], gcells: [], sg: {} as SGraph,
      hchans: newChanDict(), vchans: chanWithIncomparablePair(true, false),
    };
    expect(assignTracks(mp)).toBe(-1);
  });

  it("fails when addPEdgesAll(hchans) hits an incomparable parallel-precedence pair", () => {
    const mp: Maze = {
      ncells: 0, ngcells: 0, cells: [], gcells: [], sg: {} as SGraph,
      hchans: chanWithBadParallelPrev(), vchans: newChanDict(),
    };
    expect(assignTracks(mp)).toBe(-1);
  });

  it("fails when addPEdgesAll(vchans) hits an incomparable parallel-precedence pair (hchans clean)", () => {
    const mp: Maze = {
      ncells: 0, ngcells: 0, cells: [], gcells: [], sg: {} as SGraph,
      hchans: newChanDict(), vchans: chanWithBadParallelPrev(),
    };
    expect(assignTracks(mp)).toBe(-1);
  });

  it("succeeds and assigns track numbers on a clean single-segment channel", () => {
    const s = seg(false, 100, 0, 10, B_NODE, B_NODE);
    const chan: Channel = { p: { p1: 0, p2: 10 }, segList: [s], G: makeGraph(1), cp: null };
    const hchans = newChanDict();
    const item: ChanItem = { v: 100, chans: new CdtOset<Channel, Paird>((c) => c.p, chancmpidTest) };
    item.chans.insert(chan);
    hchans.insert(item);
    const mp: Maze = {
      ncells: 0, ngcells: 0, cells: [], gcells: [], sg: {} as SGraph,
      hchans, vchans: newChanDict(),
    };
    expect(assignTracks(mp)).toBe(0);
    expect(s.trackNo).toBe(1);
  });
});
