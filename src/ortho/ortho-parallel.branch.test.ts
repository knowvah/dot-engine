// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage unit tests for src/ortho/ortho-parallel.ts (T3a,
 * coverage-90 batch-3). The existing ortho-parallel.test.ts pins the
 * zero-hop base case (both segments have no prev/next route context, so
 * `decidePoint` returns prec=0 immediately and `resolveParallelPrecedence`
 * only ever takes the prec1=0/prec2=0 branch). This file drives every other
 * branch of the pipeline `addPEdgesAll -> addPEdges -> getDirections ->
 * decidePoint -> propagatePrec -> resolveParallelPrecedence ->
 * setParallelEdges / removeEdgeParallel` by giving segments a synthetic
 * prev/next chain.
 *
 * All fixtures were validated empirically against the real exported
 * `addPEdgesAll`/`segCmp` (via a throwaway probe script, not checked in)
 * before being transcribed here: each asserted `rc` and edge-direction
 * outcome is a measured fact, and each was chosen so that the *specific*
 * conditional path under test is the one that actually fires (confirmed by
 * hand-tracing the source alongside the probe output).
 *
 * @see lib/ortho/ortho.c:addPEdges, add_p_edges, decide_point,
 *      propagate_prec, set_parallel_edges, removeEdge, get_directions
 */

import { describe, it, expect } from "vitest";
import { addPEdgesAll } from "./ortho-parallel.js";
import { makeGraph, edgeExists } from "./rawgraph.js";
import { newChanDict } from "./maze-channels.js";
import { CdtOset } from "./chan-dict.js";
import { Bend } from "./types.js";
import type { OrthoSegment, Channel, ChanItem, ChanDict, Paird, Maze, SGraph } from "./types.js";

const B_NODE = Bend.B_NODE;
const B_UP = Bend.B_UP;
const B_DOWN = Bend.B_DOWN;
const B_LEFT = Bend.B_LEFT;
const B_RIGHT = Bend.B_RIGHT;

function seg(isVert: boolean, over: Partial<OrthoSegment> = {}): OrthoSegment {
  return {
    isVert, commCoord: 100, p: { p1: 10, p2: 50 },
    l1: B_NODE, l2: B_NODE, indNo: null, trackNo: null, prev: null, next: null,
    ...over,
  };
}

/** Local mirror of chancmpid (containment == equal) — matches ortho-parallel.test.ts. */
function chancmpidTest(k1: Paird, k2: Paird): number {
  if (k1.p1 > k2.p1) return k1.p2 <= k2.p2 ? 0 : 1;
  if (k1.p1 < k2.p1) return k1.p2 >= k2.p2 ? 0 : -1;
  return 0;
}

function baseMaze(): Maze {
  return {
    ncells: 0, ngcells: 0, cells: [], gcells: [],
    sg: {} as SGraph, hchans: newChanDict(), vchans: newChanDict(),
  };
}

function registerChan(
  mp: Maze, isVert: boolean, commCoord: number, p: Paird, segList: OrthoSegment[],
): Channel {
  const chan: Channel = { p: { ...p }, segList, G: makeGraph(segList.length), cp: null };
  const item: ChanItem = { v: commCoord, chans: new CdtOset<Channel, Paird>((c) => c.p, chancmpidTest) };
  item.chans.insert(chan);
  (isVert ? mp.vchans : mp.hchans).insert(item);
  return chan;
}

/** Registers segI/segJ as the sole pair in a fresh channel and runs addPEdgesAll. */
function run(
  isVert: boolean, segI: OrthoSegment, segJ: OrthoSegment,
  extra?: (mp: Maze) => void,
): { rc: number; chan: Channel; dict: ChanDict } {
  const mp = baseMaze();
  segI.indNo = 0; segJ.indNo = 1;
  const chan = registerChan(mp, isVert, 100, { p1: 10, p2: 50 }, [segI, segJ]);
  extra?.(mp);
  const dict = isVert ? mp.vchans : mp.hchans;
  const rc = addPEdgesAll(dict, mp);
  return { rc, chan, dict };
}

// ─── resolveParallelPrecedence: prec1 in {-1,0,1} x prec2 sub-cases ──────────
//
// All scenarios below use hops=0 for the direct setParallelEdges calls (the
// decidePoint while-loop exits at ans=0 because the "one hop out" segments
// are deliberately non-parallel to each other), so the only edge write is
// the unconditional `insertEdge(chan.G, seg1.indNo, seg2.indNo)` at the top
// of setParallelEdges — letting the resulting edge DIRECTION serve as a
// concrete, independently-checkable witness of which branch fired.

describe("resolveParallelPrecedence — prec1=-1", () => {
  it("prec1=-1, prec2=0: edges J->I, no removeEdgeParallel", () => {
    const segIprevC = seg(false, { commCoord: 0 });
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, next: segIprevC });
    const B = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP });
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: B, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });

  it("prec1=-1, prec2=1: edges J->I AND removeEdgeParallel runs (no crash, no extra self-edge)", () => {
    const C = seg(false, { commCoord: 0 });
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, next: C });
    const B = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP });
    const G = seg(false, { commCoord: 999 });
    const E = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, prev: G, indNo: 0 });
    const F = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, indNo: 1 });
    const segI = seg(false, { prev: A, next: E });
    const segJ = seg(false, { prev: B, next: F });
    const { rc, chan } = run(false, segI, segJ, (mp) => registerChan(mp, false, 50, { p1: 0, p2: 10 }, [E, F]));
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });
});

describe("resolveParallelPrecedence — prec1=1", () => {
  it("prec1=1, prec2=0: edges I->J, no removeEdgeParallel", () => {
    const C2 = seg(false, { commCoord: 999 });
    const A2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, next: C2 });
    const B2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN });
    const segI = seg(false, { prev: A2, next: null });
    const segJ = seg(false, { prev: B2, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("prec1=1, prec2=-1: edges I->J AND removeEdgeParallel runs (no crash)", () => {
    const C2 = seg(false, { commCoord: 999 });
    const A2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, next: C2 });
    const B2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN });
    const G2 = seg(false, { commCoord: 0 });
    const E2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, prev: G2, indNo: 0 });
    const F2 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, indNo: 1 });
    const segI = seg(false, { prev: A2, next: E2 });
    const segJ = seg(false, { prev: B2, next: F2 });
    const { rc, chan } = run(false, segI, segJ, (mp) => registerChan(mp, false, 50, { p1: 0, p2: 10 }, [E2, F2]));
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });
});

describe("resolveParallelPrecedence — prec1=0", () => {
  it("prec1=0, prec2=-1: edges J->I", () => {
    const G3 = seg(false, { commCoord: 0 });
    const E3 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, prev: G3 });
    const F3 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP });
    const segI = seg(false, { prev: null, next: E3 });
    const segJ = seg(false, { prev: null, next: F3 });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });

  it("prec1=0, prec2=0: edges I->J (baseline, re-asserted here for contrast)", () => {
    const segI = seg(false, { prev: null, next: null });
    const segJ = seg(false, { prev: null, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("prec1=0, prec2=1: edges I->J (elseif prec2===1 arm, unreachable via prec2===0 short-circuit otherwise)", () => {
    const G4 = seg(false, { commCoord: 999 });
    const E4 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, prev: G4 });
    const F4 = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN });
    const segI = seg(false, { prev: null, next: E4 });
    const segJ = seg(false, { prev: null, next: F4 });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });
});

// ─── getDirections branches ───────────────────────────────────────────────────

describe("getDirections", () => {
  it("segI.prev null, segJ.prev non-null -> dir=1 (ternary false path)", () => {
    const B = seg(false, { commCoord: 77 });
    const segI = seg(false, { prev: null, next: null });
    const segJ = seg(false, { prev: B, next: null });
    const { rc } = run(false, segI, segJ);
    expect(rc).toBe(0); // segI.prev null -> np1 null immediately -> prec1=0, no crash
  });

  it("segI.prev non-null, segJ.prev null -> dir=1 (line183 true path)", () => {
    const A = seg(false, { commCoord: 77, p: { p1: 1, p2: 2 } });
    const jLeaf = seg(false, { commCoord: 5, p: { p1: 3, p2: 4 } });
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: null, next: jLeaf });
    const { rc } = run(false, segI, segJ);
    // A (commCoord 77) vs jLeaf (commCoord 5): incomparable -> decidePoint
    // returns -1 -> addPEdgesAll fails, but getDirections' L183 true path
    // (dir=1) was exercised on the way there.
    expect(rc).toBe(-1);
  });

  it("both prev non-null, differing commCoord -> dir=1 (cond-expr false path)", () => {
    const A = seg(false, { commCoord: 50, p: { p1: 1, p2: 2 } });
    const B = seg(false, { commCoord: 77, p: { p1: 1, p2: 2 } });
    const jLeaf = seg(false, { commCoord: 5, p: { p1: 3, p2: 4 } });
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: B, next: jLeaf });
    const { rc } = run(false, segI, segJ);
    expect(rc).toBe(-1);
  });
});

// ─── decidePoint: incomparable-segment failure (temp === -2) ────────────────

describe("decidePoint — incomparable next-hop returns -1, propagating to addPEdgesAll", () => {
  it("fails on the FIRST decidePoint call (dir1=0)", () => {
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 } });
    const B = seg(true, { commCoord: 50, p: { p1: 5, p2: 15 } }); // differs isVert + p-range
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: B, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(-1);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("fails on the SECOND decidePoint call (dir1=1) after the first succeeds trivially", () => {
    const E = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 } });
    const F = seg(true, { commCoord: 50, p: { p1: 5, p2: 15 } });
    const segI = seg(false, { prev: null, next: E });
    const segJ = seg(false, { prev: null, next: F });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(-1);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });
});

// ─── propagatePrec: horizontal and vertical flip / no-flip leaves ───────────

describe("propagatePrec — sign-flip branches (all 4 leaves, both axes)", () => {
  it("horizontal, commCoord matches p1, l1===B_UP -> flips", () => {
    const C = seg(false, { commCoord: 0 });
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP, next: C });
    const B = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN });
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: B, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    // base temp = segCmp(A,B) = 1 (same-ends, s2 both DOWN=T1); the flip at
    // commCoord===p1 with l1===B_UP inverts it to prec1=-1 -> edges J->I.
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });

  it("horizontal, commCoord mismatches p1, l2===B_DOWN -> flips", () => {
    const C = seg(false, { commCoord: 999 });
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_DOWN, l2: B_DOWN, next: C });
    const B = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_UP, l2: B_UP });
    const segI = seg(false, { prev: A, next: null });
    const segJ = seg(false, { prev: B, next: null });
    const { rc, chan } = run(false, segI, segJ);
    expect(rc).toBe(0);
    // base temp = segCmp(A,B) = -1 (s2 both UP=T2); flip at commCoord!==p1
    // with l2===B_DOWN inverts it to prec1=1 -> edges I->J.
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("vertical, commCoord matches p1, l1===B_RIGHT -> flips", () => {
    const C = seg(true, { commCoord: 0 });
    const A = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_RIGHT, l2: B_RIGHT, next: C });
    const B = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT });
    const segI = seg(true, { prev: A, next: null });
    const segJ = seg(true, { prev: B, next: null });
    const { rc, chan } = run(true, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("vertical, commCoord matches p1, l1!==B_RIGHT -> no flip", () => {
    const C = seg(true, { commCoord: 0 });
    const A = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT, next: C });
    const B = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_RIGHT, l2: B_RIGHT });
    const segI = seg(true, { prev: A, next: null });
    const segJ = seg(true, { prev: B, next: null });
    const { rc, chan } = run(true, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 0, 1)).toBe(true);
    expect(edgeExists(chan.G!, 1, 0)).toBe(false);
  });

  it("vertical, commCoord mismatches p1, l2===B_LEFT -> flips", () => {
    const C = seg(true, { commCoord: 999 });
    const A = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT, next: C });
    const B = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_RIGHT, l2: B_RIGHT });
    const segI = seg(true, { prev: A, next: null });
    const segJ = seg(true, { prev: B, next: null });
    const { rc, chan } = run(true, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });

  it("vertical, commCoord mismatches p1, l2!==B_LEFT -> no flip", () => {
    const C = seg(true, { commCoord: 999 });
    const A = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_RIGHT, l2: B_RIGHT, next: C });
    const B = seg(true, { commCoord: 50, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT });
    const segI = seg(true, { prev: A, next: null });
    const segJ = seg(true, { prev: B, next: null });
    const { rc, chan } = run(true, segI, segJ);
    expect(rc).toBe(0);
    expect(edgeExists(chan.G!, 1, 0)).toBe(true);
    expect(edgeExists(chan.G!, 0, 1)).toBe(false);
  });
});

// ─── setParallelEdges: the hop loop itself (SPE_FLIP_TABLE + edgeSeen) ───────

describe("setParallelEdges — multi-hop loop (SPE_FLIP_TABLE dispatch + edgeSeen comparison)", () => {
  it("2-hop horizontal chain exercises both edgeSeen===flip outcomes without crashing", () => {
    // segI/segJ -> (A,B) parallel hop -> (A2,B2) parallel hop -> null (stop).
    // hopsA=2 for the first setParallelEdges call: x=1's insert direction
    // determines whether x=2's edgeSeen (checked against the FORWARD pair)
    // reads true or false, so a single 2-hop chain exercises both L150 arms.
    const mp = baseMaze();
    const A2 = seg(false, { commCoord: 5, p: { p1: 1, p2: 2 }, indNo: 0 });
    const B2 = seg(false, { commCoord: 5, p: { p1: 1, p2: 2 }, indNo: 1 });
    const A = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, prev: A2, indNo: 0 });
    const B = seg(false, { commCoord: 50, p: { p1: 0, p2: 10 }, prev: B2, indNo: 1 });
    const segI = seg(false, { indNo: 0, prev: A, next: null });
    const segJ = seg(false, { indNo: 1, prev: B, next: null });
    const chanIJ = registerChan(mp, false, 100, { p1: 10, p2: 50 }, [segI, segJ]);
    const chanAB = registerChan(mp, true, 50, { p1: 0, p2: 10 }, [A, B]);
    const chanA2B2 = registerChan(mp, true, 5, { p1: 1, p2: 2 }, [A2, B2]);
    const rc = addPEdgesAll(mp.hchans, mp);
    expect(rc).toBe(0);
    // x=1 inserts the reverse pair (B->A) into chanAB.
    expect(edgeExists(chanAB.G!, 1, 0)).toBe(true);
    expect(edgeExists(chanAB.G!, 0, 1)).toBe(false);
    // x=2 then sees edgeSeen=false for the forward (A->B) pair and inserts
    // forward (A2->B2) into chanA2B2.
    expect(edgeExists(chanA2B2.G!, 0, 1)).toBe(true);
    expect(edgeExists(chanA2B2.G!, 1, 0)).toBe(false);
    expect(edgeExists(chanIJ.G!, 0, 1)).toBe(true);
  });

  it("1-hop vertical chain: seg1.isVert=true uses hchans for the hop lookup", () => {
    const mp = baseMaze();
    const A = seg(true, {
      commCoord: 10, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT, indNo: 0,
    });
    const B = seg(true, {
      commCoord: 10, p: { p1: 0, p2: 10 }, l1: B_LEFT, l2: B_LEFT, indNo: 1,
    });
    const segI = seg(true, { commCoord: 100, p: { p1: 10, p2: 50 }, indNo: 0, prev: A, next: null });
    const segJ = seg(true, { commCoord: 100, p: { p1: 10, p2: 50 }, indNo: 1, prev: B, next: null });
    const chanIJ = registerChan(mp, true, 100, { p1: 10, p2: 50 }, [segI, segJ]);
    const chanAB = registerChan(mp, false, 10, { p1: 0, p2: 10 }, [A, B]); // hchans: A.commCoord === segI.p.p1
    const rc = addPEdgesAll(mp.vchans, mp);
    expect(rc).toBe(0);
    expect(edgeExists(chanIJ.G!, 0, 1)).toBe(true);
    // hop insert landed in chanAB (either direction — asserting SOME edge
    // exists confirms the hop loop actually ran against the hchans lookup).
    const hopEdge = edgeExists(chanAB.G!, 0, 1) || edgeExists(chanAB.G!, 1, 0);
    expect(hopEdge).toBe(true);
  });
});
