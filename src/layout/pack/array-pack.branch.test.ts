// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for layout/pack/array-pack.ts.
 *
 * index.branch.test.ts (T3f) only exercises arrayRects through the default
 * (row-major, centered, no user vals, no input-order) flag combination.
 * This file drives every exported helper directly with the full PK_*
 * flag matrix: column-major grid direction, left/right/top/bottom
 * alignment, PK_USER_VALS, and PK_INPUT_ORDER.
 *
 * @see lib/pack/pack.c:arrayRects
 */

import { describe, it, expect } from 'vitest';
import type { Box } from '../../model/geom.js';
import {
  inc, computeGrid, buildAInfo, cmpByUserVals, cmpByPerimeter, sortAInfo,
  accumulateMaxima, widthsToCumulative, heightsToCumulative,
  placeX, placeY, positionRects, arrayRects,
  type AInfo, type GridDims, type GridCursor,
} from './array-pack.js';
import {
  type PackInfo, PackMode,
  PK_COL_MAJOR, PK_INPUT_ORDER, PK_USER_VALS,
  PK_LEFT_ALIGN, PK_RIGHT_ALIGN, PK_TOP_ALIGN, PK_BOT_ALIGN,
} from './types.js';

function box(llx: number, lly: number, urx: number, ury: number): Box {
  return { ll: { x: llx, y: lly }, ur: { x: urx, y: ury } };
}

function pinfo(overrides: Partial<PackInfo> = {}): PackInfo {
  return {
    aspect: 1, sz: 0, margin: 0, doSplines: false,
    mode: PackMode.Array, fixed: null, vals: null, flags: 0,
    ...overrides,
  };
}

describe('inc — grid cursor advance', () => {
  it('row-major: advances column, wraps to next row at nc', () => {
    const dims: GridDims = { nc: 2, nr: 3, rowMajor: true };
    const cursor: GridCursor = { col: { val: 0 }, row: { val: 0 } };
    inc(cursor, dims);
    expect(cursor).toEqual({ col: { val: 1 }, row: { val: 0 } });
    inc(cursor, dims); // col hits nc=2 -> wraps
    expect(cursor).toEqual({ col: { val: 0 }, row: { val: 1 } });
  });

  it('column-major: advances row, wraps to next column at nr', () => {
    const dims: GridDims = { nc: 3, nr: 2, rowMajor: false };
    const cursor: GridCursor = { col: { val: 0 }, row: { val: 0 } };
    inc(cursor, dims);
    expect(cursor).toEqual({ col: { val: 0 }, row: { val: 1 } });
    inc(cursor, dims); // row hits nr=2 -> wraps
    expect(cursor).toEqual({ col: { val: 1 }, row: { val: 0 } });
  });
});

describe('computeGrid', () => {
  it('row-major (no PK_COL_MAJOR), sz=0: nc = ceil(sqrt(ng))', () => {
    const dims = computeGrid(9, pinfo({ flags: 0 }));
    expect(dims).toEqual({ nc: 3, nr: 3, rowMajor: true });
  });

  it('row-major with sz>0: nc = sz', () => {
    const dims = computeGrid(9, pinfo({ flags: 0, sz: 2 }));
    expect(dims).toEqual({ nc: 2, nr: 5, rowMajor: true });
  });

  it('column-major (PK_COL_MAJOR), sz=0: nr = ceil(sqrt(ng))', () => {
    const dims = computeGrid(9, pinfo({ flags: PK_COL_MAJOR }));
    expect(dims).toEqual({ nc: 3, nr: 3, rowMajor: false });
  });

  it('column-major with sz>0: nr = sz', () => {
    const dims = computeGrid(9, pinfo({ flags: PK_COL_MAJOR, sz: 2 }));
    expect(dims).toEqual({ nc: 5, nr: 2, rowMajor: false });
  });
});

describe('buildAInfo', () => {
  it('builds width/height/index from bboxes, adding margin', () => {
    const gs = [box(0, 0, 10, 5), box(0, 0, 20, 8)];
    const info = buildAInfo(2, gs, 1);
    expect(info).toEqual([
      { width: 11, height: 6, index: 0 },
      { width: 21, height: 9, index: 1 },
    ]);
  });

  it('skips a hole (bb === undefined) at index i', () => {
    const gs = [box(0, 0, 10, 5), undefined as unknown as Box];
    const info = buildAInfo(2, gs, 0);
    expect(info).toEqual([{ width: 10, height: 5, index: 0 }]);
  });
});

describe('cmpByUserVals / cmpByPerimeter', () => {
  it('cmpByUserVals sorts ascending by vals[index], defaulting missing to 0', () => {
    const a: AInfo = { width: 1, height: 1, index: 0 };
    const b: AInfo = { width: 1, height: 1, index: 1 };
    expect(cmpByUserVals(a, b, [5, 2])).toBe(3); // 5-2
    expect(cmpByUserVals(a, b, [])).toBe(0); // both default to 0
  });

  it('cmpByPerimeter sorts descending by width+height', () => {
    const a: AInfo = { width: 10, height: 10, index: 0 };
    const b: AInfo = { width: 1, height: 1, index: 1 };
    expect(cmpByPerimeter(a, b)).toBeLessThan(0); // b (smaller) sorts after a
  });
});

describe('sortAInfo', () => {
  const info: AInfo[] = [
    { width: 1, height: 1, index: 0 },
    { width: 10, height: 10, index: 1 },
  ];

  it('sorts by user vals when PK_USER_VALS set and vals !== null', () => {
    const sorted = sortAInfo(info, pinfo({ flags: PK_USER_VALS, vals: [9, 1] }));
    expect(sorted.map((i) => i.index)).toEqual([1, 0]);
  });

  it('falls back to perimeter sort when PK_USER_VALS set but vals is null', () => {
    const sorted = sortAInfo(info, pinfo({ flags: PK_USER_VALS, vals: null }));
    expect(sorted.map((i) => i.index)).toEqual([1, 0]); // descending perimeter
  });

  it('sorts by perimeter when neither PK_USER_VALS nor PK_INPUT_ORDER set', () => {
    const sorted = sortAInfo(info, pinfo({ flags: 0 }));
    expect(sorted.map((i) => i.index)).toEqual([1, 0]);
  });

  it('preserves input order when PK_INPUT_ORDER is set', () => {
    const sorted = sortAInfo(info, pinfo({ flags: PK_INPUT_ORDER }));
    expect(sorted.map((i) => i.index)).toEqual([0, 1]);
  });
});

describe('accumulateMaxima / widthsToCumulative / heightsToCumulative', () => {
  it('accumulates the max width per column and max height per row', () => {
    // nc=1 forces every item into a new row (wraps every step), separating
    // the height-per-row accumulation while sharing one width column.
    const dims: GridDims = { nc: 1, nr: 2, rowMajor: true };
    const sinfo: AInfo[] = [
      { width: 5, height: 3, index: 0 },
      { width: 8, height: 2, index: 1 },
    ];
    const widths: number[] = [];
    const heights: number[] = [];
    accumulateMaxima(sinfo, widths, heights, dims);
    expect(widths).toEqual([8]); // max(5,8) in the single shared column
    expect(heights).toEqual([3, 2]); // one row per item
  });

  it('widthsToCumulative computes a left-to-right prefix sum', () => {
    const widths = [5, 8, 3];
    widthsToCumulative(widths);
    expect(widths).toEqual([0, 5, 13]);
  });

  it('heightsToCumulative computes a bottom-to-top prefix sum with heights[0] = total', () => {
    const heights = [3, 2, 4]; // indices 0..2 for nr=2 -> only [0],[1] are real rows
    heightsToCumulative(heights, 2);
    // ht accumulates from i=2 down to i=1: heights[2]=0(initial ht), ht+=heights[1]=2
    // heights[1]=0(initial ht=0), ht+=heights[0]=3 -> heights[0]=ht(total)=5
    expect(heights[0]).toBe(5);
  });
});

describe('placeX — alignment flags', () => {
  const widths = [0, 10, 20];
  const bb = box(0, 0, 4, 4); // width 4

  it('PK_LEFT_ALIGN returns cround(w0)', () => {
    expect(placeX(PK_LEFT_ALIGN, widths, 0, bb)).toBe(0);
    expect(placeX(PK_LEFT_ALIGN, widths, 1, bb)).toBe(10);
  });

  it('PK_RIGHT_ALIGN returns cround(w1 - bbWidth)', () => {
    expect(placeX(PK_RIGHT_ALIGN, widths, 0, bb)).toBe(6); // 10 - 4
  });

  it('default (neither flag) centers: cround((w0+w1-bbWidth)/2)', () => {
    expect(placeX(0, widths, 0, bb)).toBe(3); // (0+10-4)/2 = 3
  });
});

describe('placeY — alignment flags', () => {
  const heights = [0, 10, 20];
  const bb = box(0, 0, 4, 6); // height 6

  it('PK_TOP_ALIGN returns cround(h0 - bbHeight)', () => {
    expect(placeY(PK_TOP_ALIGN, heights, 0, bb)).toBe(-6); // 0 - 6
  });

  it('PK_BOT_ALIGN returns cround(h1)', () => {
    expect(placeY(PK_BOT_ALIGN, heights, 0, bb)).toBe(10);
  });

  it('default (neither flag) centers: cround((h0+h1-bbHeight)/2)', () => {
    expect(placeY(0, heights, 0, bb)).toBe(2); // (0+10-6)/2 = 2
  });
});

describe('positionRects', () => {
  it('skips a hole (bb === undefined) but still advances the cursor', () => {
    const dims: GridDims = { nc: 2, nr: 1, rowMajor: true };
    const sinfo: AInfo[] = [{ width: 10, height: 10, index: 0 }, { width: 10, height: 10, index: 1 }];
    const gs: Box[] = [box(0, 0, 4, 4), undefined as unknown as Box];
    const places = positionRects(sinfo, gs, 0, { widths: [0, 10, 20], heights: [0, 10, 20] }, dims);
    expect(places[0]).toEqual({ x: 3, y: 3 });
    expect(places[1]).toEqual({ x: 0, y: 0 }); // default fill, never assigned
  });
});

describe('arrayRects — end-to-end', () => {
  it('packs a 2x2 grid of boxes with default (row-major, centered) flags', () => {
    const gs = [box(0, 0, 4, 4), box(0, 0, 4, 4), box(0, 0, 4, 4), box(0, 0, 4, 4)];
    const places = arrayRects(4, gs, pinfo({ flags: 0 }));
    expect(places).not.toBeNull();
    expect(places!.length).toBe(4);
  });

  it('packs with PK_COL_MAJOR + PK_LEFT_ALIGN + PK_BOT_ALIGN', () => {
    const gs = [box(0, 0, 4, 4), box(0, 0, 4, 4), box(0, 0, 4, 4)];
    const places = arrayRects(
      3, gs, pinfo({ flags: PK_COL_MAJOR | PK_LEFT_ALIGN | PK_BOT_ALIGN }),
    );
    // Grid is 2x2 (nr=ceil(sqrt(3))=2, nc=ceil(3/2)=2), column-major cursor
    // traversal; every box is equal-perimeter so gvQsort's (unstable) tie
    // order determines placement — values pinned from the actual computed
    // output, not hand-derived.
    expect(places).toEqual([{ x: 0, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 4 }]);
  });
});
