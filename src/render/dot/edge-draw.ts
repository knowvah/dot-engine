// SPDX-License-Identifier: EPL-2.0

/**
 * Edge spline + arrow draw-op emission — emit.c's multicolor / tapered / ortho
 * branches, split out of dot.ts for file size. Same abstract-base approach as
 * agwrite.ts: every body moves UNCHANGED and reaches the renderer's emit state
 * (`penwidth`, `styleOp`, `penOp`) through inheritance rather than injection,
 * so each branch stays diffable against the C.
 *
 * @see lib/common/emit.c:2389 multicolor · :2422 tapered · :2583 ortho
 */

import type { Edge } from '../../model/edge.js';
import type { Point } from '../../model/geom.js';
import { isDirected } from './attrs.js';
import type { Bezier } from '../../model/geom.js';
import type { ArrowDrawOp } from '../../common/arrows-types.js';
import type { GVColor } from '../../common/color.js';
import type { RenderJob } from '../../gvc/job.js';
import { EmitState } from '../../gvc/job.js';
import { resolveRenderColor } from '../color-resolve.js';
import { taper, taperfun } from '../../common/taper.js';
import { orthoRoundedRadius } from '../svg-helpers.js';
import { orthoRoundedPolylines } from '../svg-edge-ortho-radius.js';
import { parseSegs } from '../../common/multicolor.js';
import { splitSplineByColor } from '../svg-edge-split.js';
import { buildOffsetLists, advanceTmpList } from '../../common/edge-offset.js';
import { xdotFillColor, xdotNum, xdotPenColor, xdotPoint, xdotPoints, xdotStrOp, trimFixed3 } from './xdot-ops.js';
import { DotWriterBase } from './agwrite.js';

/**
 * One arrow primitive as an xdot op. Lifted out of emitArrows' loop unchanged —
 * the four cases and their `filled` variants are exactly arrow_gen's.
 * @see lib/common/arrows.c arrow_gen
 */
function emitArrowOp(buf: string[], op: ArrowDrawOp, pen: GVColor): void {
  switch (op.kind) {
    case 'polygon':
      if (op.filled) buf.push(xdotFillColor(pen));
      buf.push(xdotPoints(op.filled ? 'P' : 'p', op.points));
      break;
    case 'ellipse':
      if (op.filled) buf.push(xdotFillColor(pen));
      buf.push(
        (op.filled ? 'E ' : 'e ') + xdotPoint(op.center) +
          xdotNum(op.rx) + ' ' + xdotNum(op.ry) + ' ',
      );
      break;
    case 'polyline':
      buf.push(xdotPoints('L', op.points));
      break;
    case 'bezier':
      buf.push(xdotPoints('B', op.points));
      break;
  }
}

/** emit.c's edge-drawing half, between the serializer base and the renderer. */
export abstract class EdgeDrawBase extends DotWriterBase {
  /** setlinewidth state per emit_state. @see gvrender_core_dot.c penwidth[] */
  protected penwidth: number[] = new Array(12).fill(1);
  protected abstract styleOp(job: RenderJob): string;
  protected abstract penOp(job: RenderJob): string;

  /**
   * The plain single-colour spline branch of beginEdge — lifted verbatim so the
   * four-way spline-kind chain above stays readable; no branch was reordered or
   * merged. splines=ortho + radius/style=rounded emits straight segments plus
   * corner arcs as polylines (L), else the bezier itself.
   * @see lib/common/emit.c:2583
   */
  protected emitPlainSpline(e: Edge, list: Bezier[], edraw: string[], job: RenderJob): void {
    const radius = orthoRoundedRadius(e, job);
    const obj = job.obj;
    const origStyle = obj !== null ? [...obj.rawStyle] : [];
    const multi = list.length > 1;
    for (const bez of list) {
      this.emitSplineBezier(bez, radius, edraw, job);
      // arrow_gen (drawn to TDRAW/HDRAW below) resets the job style to
      // defaultlinestyle ("solid") as a side effect. For a multi-bezier spline
      // the NEXT segment's xdot_style re-emits the current rawstyle every call,
      // so a solid edge picks up a bare `S 5 -solid`; C restores the edge's own
      // styles afterward only when it has explicit ones. @see emit.c:2668-2677
      if (obj !== null && multi && (bez.sflag || bez.eflag)) {
        obj.rawStyle = origStyle.length > 0 ? origStyle : ['solid'];
      }
    }
    if (obj !== null) obj.rawStyle = origStyle;
  }

  /** One bezier of a plain spline: rounded-ortho corner polylines when a radius
   *  applies and the segment has enough control points, else the bezier. */
  protected emitSplineBezier(bez: Bezier, radius: number | null, edraw: string[], job: RenderJob): void {
    const pts = bez.list.slice(0, bez.size);
    const polys = radius !== null && bez.size >= 4 ? orthoRoundedPolylines(pts, radius) : [];
    if (polys.length === 0) {
      edraw.push(this.styleOp(job), this.penOp(job), xdotPoints('B', pts));
      return;
    }
    for (const poly of polys) edraw.push(this.styleOp(job), this.penOp(job), xdotPoints('L', poly));
  }

  protected emitTaperedSpline(e: Edge, bz: Bezier | undefined, edraw: string[], job: RenderJob): void {
    if (bz === undefined) return;
    const radfunc = taperfun(e.attrs.get('dir'), isDirected(e.tail.root));
    const verts = taper(bz, radfunc, job.obj?.penWidth ?? 1);
    const edgeColor = job.obj?.penColor ?? { type: 'string', s: 'black' };
    edraw.push(this.styleOp(job));
    edraw.push(xdotPenColor(resolveRenderColor('transparent')));
    edraw.push(xdotFillColor(edgeColor));
    edraw.push(xdotPoints('P', verts));
  }

  /**
   * Emit a split-along-length `;` multicolor edge spline: split each routed
   * bezier along its arc length into one sub-curve per color segment, drawn
   * under that segment's pen. Reuses the same split geometry
   * (splitSplineByColor) as the SVG path. @see lib/common/emit.c:1975 multicolor
   */
  protected emitSplitSpline(
    bzList: (Bezier | undefined)[],
    colorAttr: string,
    edraw: string[],
    job: RenderJob,
  ): { firstColor: string; endColor: string } {
    const segs = parseSegs(colorAttr).segs;
    const firstColor = segs[0]?.color ?? 'black';
    let endColor = firstColor;
    for (const bz of bzList) {
      if (bz === undefined || bz.size < 4) continue;
      const split = splitSplineByColor(bz.list.slice(0, bz.size), segs);
      endColor = split.endColor;
      for (const c of split.curves) {
        edraw.push(this.styleOp(job), xdotPenColor(resolveRenderColor(c.color)), xdotPoints('B', c.points));
      }
    }
    return { firstColor, endColor };
  }

  /**
   * Emit the parallel-multicolor edge spline: one offset Bézier per color,
   * offset SEP=2.0 perpendicular per pass — reusing the same offset geometry
   * (buildOffsetLists/advanceTmpList) as the SVG parallel-edge path.
   * @see lib/common/emit.c:2443 (parallel multicolor) / svg-parallel-edge.ts
   */
  protected emitParallelSpline(
    bzList: (Bezier | undefined)[],
    colorAttr: string,
    numc: number,
    edraw: string[],
    job: RenderJob,
  ): void {
    const segData = bzList.map((bz) =>
      bz !== undefined && bz.size >= 4
        ? buildOffsetLists(bz.list, (2 + numc) / 2)
        : { offlist: [] as Point[], tmplist: [] as Point[] },
    );
    const colors = parseSegs(colorAttr).segs.map((s) => s.color ?? 'black');
    for (const color of colors) {
      const pen = xdotPenColor(resolveRenderColor(color));
      for (const sd of segData) {
        if (sd.offlist.length === 0) continue;
        advanceTmpList(sd.tmplist, sd.offlist);
        edraw.push(this.styleOp(job), pen, xdotPoints('B', sd.tmplist));
      }
    }
  }

  /** Emit one arrow's primitive ops into `buf` (pen/fill from the edge color).
   *  arrow_gen sets the default line style ("solid") and the edge penwidth
   *  before each primitive, so a non-default penwidth emits `S setlinewidth(N)`
   *  once (tracked per HDRAW/TDRAW state). @see arrows.c:arrow_gen */
  protected emitArrows(
    buf: string[], ops: ArrowDrawOp[] | undefined, job: RenderJob, state: EmitState,
    penOverride?: string,
  ): void {
    if (ops === undefined) return;
    const pen = penOverride !== undefined
      ? resolveRenderColor(penOverride)
      : job.obj?.penColor ?? { type: 'string', s: 'black' };
    const pw = job.obj?.penWidth ?? 1;
    for (const op of ops) {
      if (Math.abs(pw - this.penwidth[state]!) >= 0.0005) {
        this.penwidth[state] = pw;
        buf.push(xdotStrOp('S ', 'setlinewidth(' + trimFixed3(pw) + ')'));
      }
      buf.push(xdotStrOp('S ', 'solid'));
      buf.push(xdotPenColor(pen));
      emitArrowOp(buf, op, pen);
    }
  }
}
