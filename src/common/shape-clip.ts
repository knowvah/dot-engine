// SPDX-License-Identifier: EPL-2.0

/**
 * shape_clip: clip a Bezier to a node's own shape boundary.
 *
 * Separate from splines-clip.ts (clip_and_install's home) only for file size;
 * both drive the same node insidefn through bezierClip.
 *
 * @see lib/common/splines.c:shape_clip
 */

import type { Point } from '../model/geom.js';
import type { Node } from '../model/node.js';
import { bezierClip } from './splines-geom.js';
import type { InsideContext } from './splines-geom.js';

type InsideFn = (c: InsideContext, p: Point) => boolean;
type ShapeHost = { shape?: { fns?: { insidefn?: InsideFn | null } | null } | null };

/**
 * Clip curve to n's boundary in node-relative coordinates, then translate
 * back; ND_rw is restored because some insidefns (record) scribble on it.
 * @see lib/common/splines.c:shape_clip0
 */
function shapeClip0(ctx: InsideContext, insidefn: InsideFn, n: Node, curve: Point[], leftInside: boolean): void {
  const saveRealSize = n.info.rw;
  const c = curve.map((p) => ({ x: p.x - n.info.coord.x, y: p.y - n.info.coord.y }));
  bezierClip(ctx, insidefn, c, leftInside);
  for (let i = 0; i < 4; i++) {
    curve[i] = { x: c[i].x + n.info.coord.x, y: c[i].y + n.info.coord.y };
  }
  n.info.rw = saveRealSize;
}

/**
 * Clip curve (4 control points, graph coordinates) to node n's shape, in
 * place. Nodes whose shape has no insidefn are left untouched.
 * @see lib/common/splines.c:shape_clip
 */
export function shapeClip(n: Node, curve: Point[]): void {
  const insidefn = (n.info as unknown as ShapeHost).shape?.fns?.insidefn ?? null;
  if (insidefn === null) return;
  const ctx: InsideContext = { nodeCoord: n.info.coord, rw: n.info.rw, bp: null, node: n };
  const saveRealSize = n.info.rw;
  const leftInside = insidefn(ctx, { x: curve[0].x - n.info.coord.x, y: curve[0].y - n.info.coord.y });
  n.info.rw = saveRealSize;
  shapeClip0(ctx, insidefn, n, curve, leftInside);
}
