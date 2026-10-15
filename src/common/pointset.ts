// SPDX-License-Identifier: EPL-2.0

/**
 * Set of points, compared exactly on their double coordinates.
 *
 * C keeps the points in an ordered cdt dictionary (`Dtoset`) under `cmppair`:
 * x first, then y, plain double `<`/`>`, so -0 and 0 are one key. Here the
 * dictionary is a two-level `Map` keyed on the coordinates themselves. Map
 * keys use SameValueZero, which also makes -0 and 0 one key. A lookup
 * allocates nothing; packing calls it once per cell per candidate position.
 *
 * @see lib/common/pointset.c
 */

import type { Point } from '../model/geom.js';

/** @see lib/common/pointset.c:cmppair */
function cmpPair(a: Point, b: Point): number {
  if (a.x > b.x) return 1;
  if (a.x < b.x) return -1;
  if (a.y > b.y) return 1;
  if (a.y < b.y) return -1;
  return 0;
}

/** @see lib/common/pointset.h:PointSet */
export class PointSet {
  private readonly byX = new Map<number, Map<number, Point>>();
  private n = 0;

  /**
   * Insert (x, y). A duplicate keeps the point inserted first, as `dtinsert`
   * returns the existing object and the new one is freed.
   * @see lib/common/pointset.c:addPS
   */
  addPS(x: number, y: number): void {
    let col = this.byX.get(x);
    if (col === undefined) {
      col = new Map();
      this.byX.set(x, col);
    }
    if (col.has(y)) return;
    col.set(y, { x, y });
    this.n++;
  }

  /** @see lib/common/pointset.c:inPS */
  inPS(pt: Point): boolean {
    return this.byX.get(pt.x)?.has(pt.y) ?? false;
  }

  /** @see lib/common/pointset.c:isInPS */
  isInPS(x: number, y: number): boolean {
    return this.byX.get(x)?.has(y) ?? false;
  }

  /** @see lib/common/pointset.c:sizeOf */
  sizeOf(): number {
    return this.n;
  }

  /**
   * The points in dictionary order (`dtflatten` walks the ordered set).
   * @see lib/common/pointset.c:pointsOf
   */
  pointsOf(): Point[] {
    const pts: Point[] = [];
    for (const col of this.byX.values()) {
      for (const p of col.values()) pts.push({ x: p.x, y: p.y });
    }
    return pts.sort(cmpPair);
  }
}
