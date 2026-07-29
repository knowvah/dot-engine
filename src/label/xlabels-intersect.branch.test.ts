// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage tests for xlabels-intersect.ts.
 *
 * Targets the neighbour-grid index computation (getintrsxi/xcol and its
 * helpers, exercised indirectly through the exported recordointrsx /
 * recordlintrsx), the xlintersections lblenclosing loop, the four sliding
 * probes (slideTopEdge/slideLeftEdge/slideBottomEdge/slideRightEdge,
 * exercised through the exported slideFromTopLeft/slideFromBottomRight),
 * and xladjust's needsTopLeft/needsBottomRight dispatch.
 *
 * Every expected value below is hand-derived from the C algorithm in
 * lib/label/xlabels.c (getintrsxi, xlintersections, xladjust) rather than
 * captured from the port's own output.
 */

import { describe, it, expect } from 'vitest';
import {
  XLNBR,
  recordointrsx,
  recordlintrsx,
  xlintersections,
  slideFromTopLeft,
  slideFromBottomRight,
  xladjust,
  type BestPosT,
  type XLabelsState,
} from './xlabels-intersect.js';
import { type ObjectT, type XLabelT } from './xlabels.js';
import { type Rect } from './rectangle.js';
import { rTreeOpen, rTreeInsert } from './index.js';

// ---------------------------------------------------------------------------
// Neighbour-grid slot indices — mirrored from xlabels-intersect.ts (private).
// @see lib/label/xlabels.h: XLPXPY..XLNXNY
// ---------------------------------------------------------------------------
const XLPXPY = 0;
const XLCXPY = 1;
const XLNXPY = 2;
const XLPXCY = 3;
const XLNXCY = 5;
const XLPXNY = 6;
const XLCXNY = 7;
const XLNXNY = 8;

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

/** Object carrying a label with an explicit `set` flag, for grid-index tests. */
function gridObj(px: number, py: number, set = 1): ObjectT {
  return {
    pos: { x: px, y: py },
    sz: { x: 0, y: 0 },
    lbl: { sz: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, lbl: null, set },
  };
}

/** A zero-size "point" object with no label — participates via lblenclosing. */
function pointObj(px: number, py: number): ObjectT {
  return { pos: { x: px, y: py }, sz: { x: 0, y: 0 }, lbl: null };
}

/** A sized obstacle object, insertable into the R-tree. */
function bigObj(px: number, py: number, szx: number, szy: number, set = 1): ObjectT {
  return {
    pos: { x: px, y: py },
    sz: { x: szx, y: szy },
    lbl: { sz: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, lbl: null, set },
  };
}

function emptyIntrsx(): (ObjectT | null)[] {
  return new Array(XLNBR).fill(null) as (ObjectT | null)[];
}

/**
 * Call recordointrsx with a fresh intrsx array and assert exactly which slot
 * was populated — this pins down getintrsxi/xcol/intrsxiSameRow/
 * intrsxiPosY/intrsxiNegY without those private helpers being exported.
 */
function expectRecordOSlot(op: ObjectT, cp: ObjectT, expected: number, label: string): void {
  const intrsx = emptyIntrsx();
  const rp: Rect = { boundary: [0, 0, 1, 1] };
  const a = 3.5;
  const ret = recordointrsx(op, cp, rp, a, intrsx);
  expect(ret, label).toBe(a);
  for (let i = 0; i < XLNBR; i++) {
    expect(intrsx[i], `${label}: slot ${i}`).toBe(i === expected ? cp : null);
  }
}

// ---------------------------------------------------------------------------
// getintrsxi / xcol / intrsxiSameRow / intrsxiPosY / intrsxiNegY
// (exercised indirectly via recordointrsx)
// ---------------------------------------------------------------------------

describe('recordointrsx — neighbour-grid slot selection (getintrsxi)', () => {
  // Full 3x3 grid, op fixed at (5,5), set=1/1, neither at origin.
  it('cp below-left (y<opy, x<opx) -> XLPXPY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(2, 2), XLPXPY, 'below-left');
  });
  it('cp below-right (y<opy, x>opx) -> XLNXPY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(8, 2), XLNXPY, 'below-right');
  });
  it('cp below-center (y<opy, x==opx) -> XLCXPY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(5, 2), XLCXPY, 'below-center');
  });
  it('cp above-left (y>opy, x<opx) -> XLPXNY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(2, 8), XLPXNY, 'above-left');
  });
  it('cp above-right (y>opy, x>opx) -> XLNXNY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(8, 8), XLNXNY, 'above-right');
  });
  it('cp above-center (y>opy, x==opx) -> XLCXNY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(5, 8), XLCXNY, 'above-center');
  });
  it('cp same-row left (y==opy, x<opx) -> XLPXCY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(2, 5), XLPXCY, 'same-row-left');
  });
  it('cp same-row right (y==opy, x>opx) -> XLNXCY', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(8, 5), XLNXCY, 'same-row-right');
  });
  it('cp coincident with op (y==opy, x==opx) -> getintrsxi -1 -> XLNXCY fallback', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(5, 5), XLNXCY, 'coincident');
  });

  it('op.lbl.set==0 -> getintrsxi -1 -> XLNXCY fallback', () => {
    expectRecordOSlot(gridObj(5, 5, 0), gridObj(2, 2, 1), XLNXCY, 'op-unset');
  });
  it('cp.lbl.set==0 -> getintrsxi -1 -> XLNXCY fallback', () => {
    expectRecordOSlot(gridObj(5, 5, 1), gridObj(2, 2, 0), XLNXCY, 'cp-unset');
  });

  it('op at origin (0,0) -> getintrsxi -1 -> XLNXCY fallback', () => {
    expectRecordOSlot(gridObj(0, 0), gridObj(5, 5), XLNXCY, 'op-origin');
  });
  it('cp at origin (0,0) -> getintrsxi -1 -> XLNXCY fallback', () => {
    expectRecordOSlot(gridObj(5, 5), gridObj(0, 0), XLNXCY, 'cp-origin');
  });

  // Partial-zero coordinates: exercise each half of the "at origin" AND
  // separately, to make sure a single zero coordinate does not falsely
  // trigger the origin short-circuit.
  it('op.x==0 but op.y!=0 (not origin) -> real same-row slot', () => {
    // op=(0,5), cp=(5,5): same row, cp.x(5) > op.x(0) -> XLNXCY
    expectRecordOSlot(gridObj(0, 5), gridObj(5, 5), XLNXCY, 'op-x-zero-only');
  });
  it('op.y==0 but op.x!=0 (not origin) -> real neg-y-center slot', () => {
    // op=(5,0), cp=(5,5): cp.y(5) > op.y(0), same x -> XLCXNY
    expectRecordOSlot(gridObj(5, 0), gridObj(5, 5), XLCXNY, 'op-y-zero-only');
  });
  it('cp.x==0 but cp.y!=0 (not origin) -> real same-row slot', () => {
    // op=(5,5), cp=(0,5): same row, cp.x(0) < op.x(5) -> XLPXCY
    expectRecordOSlot(gridObj(5, 5), gridObj(0, 5), XLPXCY, 'cp-x-zero-only');
  });
  it('cp.y==0 but cp.x!=0 (not origin) -> real pos-y-center slot', () => {
    // op=(5,5), cp=(5,0): cp.y(0) < op.y(5), same x -> XLCXPY
    expectRecordOSlot(gridObj(5, 5), gridObj(5, 0), XLCXPY, 'cp-y-zero-only');
  });
});

describe('recordlintrsx — i<0 fallback (mirrors recordointrsx)', () => {
  it('real grid computation -> XLPXPY', () => {
    const intrsx = emptyIntrsx();
    const cp = gridObj(2, 2);
    const ret = recordlintrsx(gridObj(5, 5), cp, { boundary: [0, 0, 1, 1] }, 2, intrsx);
    expect(ret).toBe(2);
    expect(intrsx[XLPXPY]).toBe(cp);
  });
  it('getintrsxi -1 (op at origin) -> XLNXCY fallback', () => {
    const intrsx = emptyIntrsx();
    const cp = gridObj(5, 5);
    const ret = recordlintrsx(gridObj(0, 0), cp, { boundary: [0, 0, 1, 1] }, 2, intrsx);
    expect(ret).toBe(2);
    expect(intrsx[XLNXCY]).toBe(cp);
  });
});

// ---------------------------------------------------------------------------
// xlintersections — lblenclosing loop (L221 true branch)
// ---------------------------------------------------------------------------

describe('xlintersections — lblenclosing counts enclosed zero-size objects', () => {
  it('a zero-size object strictly inside the label rect increments n', () => {
    const objp: ObjectT = {
      pos: { x: 0, y: 0 },
      sz: { x: 0, y: 0 },
      lbl: { pos: { x: 0, y: 0 }, sz: { x: 10, y: 10 }, lbl: null, set: 1 },
    };
    const enclosed = pointObj(5, 5); // strictly inside (0,0)-(10,10)
    const xlp: XLabelsState = { objs: [objp, enclosed], nObjs: 2, spdx: rTreeOpen() };
    const bp = xlintersections(xlp, objp, emptyIntrsx());
    expect(bp).toEqual({ n: 1, area: 0, pos: { x: 0, y: 0 } });
  });

  it('a zero-size object outside the label rect does not increment n', () => {
    const objp: ObjectT = {
      pos: { x: 0, y: 0 },
      sz: { x: 0, y: 0 },
      lbl: { pos: { x: 0, y: 0 }, sz: { x: 10, y: 10 }, lbl: null, set: 1 },
    };
    const outside = pointObj(50, 50);
    const xlp: XLabelsState = { objs: [objp, outside], nObjs: 2, spdx: rTreeOpen() };
    const bp = xlintersections(xlp, objp, emptyIntrsx());
    expect(bp).toEqual({ n: 0, area: 0, pos: { x: 0, y: 0 } });
  });
});

// ---------------------------------------------------------------------------
// slideFromTopLeft — direct unit tests isolating slideTopEdge/slideLeftEdge
// ---------------------------------------------------------------------------

describe('slideFromTopLeft', () => {
  // Shared geometry: objp at origin, point label 4x4, xincr=yincr=2.
  function makeObjp(): ObjectT {
    return {
      pos: { x: 0, y: 0 },
      sz: { x: 0, y: 0 },
      lbl: { pos: { x: 0, y: 0 }, sz: { x: 4, y: 4 }, lbl: null, set: 1 },
    };
  }
  const DUMMY = {} as ObjectT;

  it('top edge: finds zero-intersection position mid-slide (done=true)', () => {
    const objp = makeObjp();
    // Enclosed at px=-4 (window (-4,0)) but not at px=-2 (window (-2,2)).
    const obstacle = pointObj(-3.5, 2);
    const xlp: XLabelsState = { objs: [objp, obstacle], nObjs: 2, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLPXCY] = DUMMY; // force the left-edge guard false; isolate top edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(true);
    expect(r.bp).toEqual({ n: 0, area: 0, pos: { x: -2, y: 0 } });
  });

  it('top edge: exhausts without a zero-intersection position (done=false)', () => {
    const objp = makeObjp();
    // obsA covers px=-4,-2; obsB covers px=-2,0 — every iteration has n>0.
    const obsA = pointObj(-1.9, 2);
    const obsB = pointObj(0.1, 2);
    const xlp: XLabelsState = { objs: [objp, obsA, obsB], nObjs: 3, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLPXCY] = DUMMY; // isolate top edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual({ n: 1, area: 0, pos: { x: -4, y: 0 } });
  });

  it('left edge: finds zero-intersection position mid-slide (done=true)', () => {
    const objp = makeObjp();
    // Enclosed at py=0 (window (0,4)) but not at py=-2 (window (-2,2)).
    const obstacle = pointObj(-2, 3.5);
    const xlp: XLabelsState = { objs: [objp, obstacle], nObjs: 2, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXNY] = DUMMY; // force the top-edge guard false; isolate left edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(true);
    expect(r.bp).toEqual({ n: 0, area: 0, pos: { x: -4, y: -2 } });
  });

  it('left edge: exhausts without a zero-intersection position (done=false)', () => {
    const objp = makeObjp();
    const obsA = pointObj(-2, -1.9);
    const obsB = pointObj(-2, 0.1);
    const xlp: XLabelsState = { objs: [objp, obsA, obsB], nObjs: 3, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXNY] = DUMMY; // isolate left edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual({ n: 1, area: 0, pos: { x: -4, y: 0 } });
  });

  it('both guards false via left operands -> neither slide runs', () => {
    const objp = makeObjp();
    const xlp: XLabelsState = { objs: [objp], nObjs: 1, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXNY] = DUMMY;
    intrsx[XLPXCY] = DUMMY;
    const bp0: BestPosT = { n: 1, area: 5, pos: { x: 1, y: 1 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual(bp0);
  });

  it('both guards false via right operands -> neither slide runs', () => {
    const objp = makeObjp();
    const xlp: XLabelsState = { objs: [objp], nObjs: 1, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLNXNY] = DUMMY;
    intrsx[XLPXPY] = DUMMY;
    const bp0: BestPosT = { n: 1, area: 5, pos: { x: 1, y: 1 } };
    const r = slideFromTopLeft(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual(bp0);
  });
});

// ---------------------------------------------------------------------------
// slideFromBottomRight — direct unit tests isolating slideBottomEdge/
// slideRightEdge
// ---------------------------------------------------------------------------

describe('slideFromBottomRight', () => {
  function makeObjp(): ObjectT {
    return {
      pos: { x: 0, y: 0 },
      sz: { x: 0, y: 0 },
      lbl: { pos: { x: 0, y: 0 }, sz: { x: 4, y: 4 }, lbl: null, set: 1 },
    };
  }
  const DUMMY = {} as ObjectT;

  it('bottom edge: finds zero-intersection position mid-slide (done=true)', () => {
    const objp = makeObjp();
    // Enclosed at px=0 (window (0,4)) but not at px=-2 (window (-2,2)).
    const obstacle = pointObj(3.5, -2);
    const xlp: XLabelsState = { objs: [objp, obstacle], nObjs: 2, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLNXCY] = DUMMY; // force the right-edge guard false; isolate bottom edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(true);
    expect(r.bp).toEqual({ n: 0, area: 0, pos: { x: -2, y: -4 } });
  });

  it('bottom edge: exhausts without a zero-intersection position (done=false)', () => {
    const objp = makeObjp();
    const obsA = pointObj(1.9, -2);
    const obsB = pointObj(-0.1, -2);
    const xlp: XLabelsState = { objs: [objp, obsA, obsB], nObjs: 3, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLNXCY] = DUMMY; // isolate bottom edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual({ n: 1, area: 0, pos: { x: 0, y: -4 } });
  });

  it('right edge: finds zero-intersection position mid-slide (done=true)', () => {
    const objp = makeObjp();
    // Enclosed at py=-4 (window (-4,0)) but not at py=-2 (window (-2,2)).
    const obstacle = pointObj(2, -3.5);
    const xlp: XLabelsState = { objs: [objp, obstacle], nObjs: 2, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXPY] = DUMMY; // force the bottom-edge guard false; isolate right edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(true);
    expect(r.bp).toEqual({ n: 0, area: 0, pos: { x: 0, y: -2 } });
  });

  it('right edge: exhausts without a zero-intersection position (done=false)', () => {
    const objp = makeObjp();
    const obsA = pointObj(2, -1.9);
    const obsB = pointObj(2, 0.1);
    const xlp: XLabelsState = { objs: [objp, obsA, obsB], nObjs: 3, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXPY] = DUMMY; // isolate right edge
    const bp0: BestPosT = { n: 1, area: Infinity, pos: { x: 0, y: 0 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual({ n: 1, area: 0, pos: { x: 0, y: -4 } });
  });

  it('both guards false via left operands -> neither slide runs', () => {
    const objp = makeObjp();
    const xlp: XLabelsState = { objs: [objp], nObjs: 1, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLCXPY] = DUMMY;
    intrsx[XLNXCY] = DUMMY;
    const bp0: BestPosT = { n: 1, area: 5, pos: { x: 1, y: 1 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual(bp0);
  });

  it('both guards false via right operands -> neither slide runs', () => {
    const objp = makeObjp();
    const xlp: XLabelsState = { objs: [objp], nObjs: 1, spdx: rTreeOpen() };
    const intrsx = emptyIntrsx();
    intrsx[XLPXPY] = DUMMY;
    intrsx[XLNXNY] = DUMMY;
    const bp0: BestPosT = { n: 1, area: 5, pos: { x: 1, y: 1 } };
    const r = slideFromBottomRight(xlp, objp, 2, 2, bp0, intrsx);
    expect(r.done).toBe(false);
    expect(r.bp).toEqual(bp0);
  });
});

// ---------------------------------------------------------------------------
// xladjust — needsTopLeft / needsBottomRight dispatch (full integration)
// ---------------------------------------------------------------------------

describe('xladjust — needsTopLeft / needsBottomRight dispatch', () => {
  // Common object under placement: pos=(50,50), point object, 10x10 label.
  // xincr = (2*10+0)/8 = 2.5; yincr = (2*10+0)/2 = 10.
  function makeObjp(): ObjectT {
    return {
      pos: { x: 50, y: 50 },
      sz: { x: 0, y: 0 },
      lbl: { pos: { x: 0, y: 0 }, sz: { x: 10, y: 10 }, lbl: null, set: 1 },
    };
  }

  // objp is a zero-size (point) object, so xR = objp.pos.x + objp.sz.x
  // coincides with xM, and yT = objp.pos.y + objp.sz.y coincides with yM.
  // The tryFixedPositions candidate list therefore visits only 4 distinct
  // positions: (xL,yM)=(40,50), (xL,yB)=(40,40), (xM,yT)=(50,50),
  // (xM,yB)=(50,40) (each repeated once or more). One interior point per
  // rectangle guarantees bp.n > 0 at every initial/fixed probe without ever
  // touching the R-tree (so intrsx stays empty unless a test adds its own
  // R-tree obstacle).
  function fixedProbeGuardPoints(): ObjectT[] {
    return [
      pointObj(45, 55), // inside (40,50)-(50,60)
      pointObj(45, 45), // inside (40,40)-(50,50)
      pointObj(55, 55), // inside (50,50)-(60,60)
      pointObj(55, 45), // inside (50,40)-(60,50)
    ];
  }

  it('both needsTopLeft/needsBottomRight false (no R-tree obstacle): both slide blocks skipped', () => {
    const objp = makeObjp();
    const xlp: XLabelsState = {
      objs: [objp, ...fixedProbeGuardPoints()],
      nObjs: 5,
      spdx: rTreeOpen(),
    };
    const result = xladjust(xlp, objp);
    // area stays 0 throughout (no R-tree hits) so bp never updates past the
    // very first (initial) probe: pos=(xL,yT)=(40,50), enclosing only (45,55).
    expect(result).toEqual({ n: 1, area: 0, pos: { x: 40, y: 50 } });
  });

  it('both needsTopLeft/needsBottomRight true via XLPXPY slot: both slides exhaust', () => {
    const objp = makeObjp();
    // Obstacle at (30,30), sz (50,40) -> rect [30,30]-[80,70], fully
    // containing every probe rectangle (10x10, area 100) generated by the
    // initial probe, the fixed candidates, and both slides.
    const cpBig = bigObj(30, 30, 50, 40);
    const xlp: XLabelsState = { objs: [objp, cpBig], nObjs: 2, spdx: rTreeOpen() };
    rTreeInsert(xlp.spdx, { boundary: [30, 30, 80, 70] }, cpBig);
    const result = xladjust(xlp, objp);
    // Every probe is fully contained -> area is always exactly 100, so the
    // strict "<" comparison never updates bp past the initial probe.
    expect(result).toEqual({ n: 1, area: 100, pos: { x: 40, y: 50 } });
  });

  it('needsTopLeft true, top-edge slide finds success mid-loop -> early return', () => {
    const objp = makeObjp();
    // Marker at (30,30) maps to slot XLPXPY (cp.y<op.y, cp.x<op.x) and
    // overlaps the fixed probes and the first two top-edge slide iterations
    // (px=40,42.5) but not the third (px=45).
    const marker = bigObj(30, 30, 15, 25);
    const xlp: XLabelsState = {
      objs: [objp, marker, ...fixedProbeGuardPoints()],
      nObjs: 6,
      spdx: rTreeOpen(),
    };
    rTreeInsert(xlp.spdx, { boundary: [30, 30, 45, 55] }, marker);
    const result = xladjust(xlp, objp);
    expect(result).toEqual({ n: 0, area: 0, pos: { x: 45, y: 50 } });
  });

  it('needsBottomRight true, bottom-edge slide finds success mid-loop -> early return', () => {
    const objp = makeObjp();
    // Marker2 at (55,50) maps to slot XLNXCY (same row, cp.x>op.x) — a slot
    // present only in needsBottomRight's condition set, keeping needsTopLeft
    // false. It overlaps only the (xM,yT)=(50,50) fixed probe. The guard
    // point at (55,45) (one of the fixed-probe guards) additionally drops
    // out of the bottom-edge slide window at its third iteration (px=45),
    // producing a zero-intersection position there.
    const marker2 = bigObj(55, 50, 4, 4);
    const xlp: XLabelsState = {
      objs: [objp, marker2, ...fixedProbeGuardPoints()],
      nObjs: 6,
      spdx: rTreeOpen(),
    };
    rTreeInsert(xlp.spdx, { boundary: [55, 50, 59, 54] }, marker2);
    const result = xladjust(xlp, objp);
    expect(result).toEqual({ n: 0, area: 0, pos: { x: 45, y: 40 } });
  });
});
