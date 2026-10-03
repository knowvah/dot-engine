// SPDX-License-Identifier: EPL-2.0

/**
 * `overlap=vpsc`: the VPSC adjuster of removeOverlapWith, moved out of
 * neato/index.ts so every engine reaches it through the shared dispatch.
 *
 * C works on `float` coordinates (`float *coords[2]`), so positions are rounded
 * to float on entry and after each pass: that decides exact-touch verdicts
 * between the x and y passes.
 *
 * @see lib/neatogen/adjust.c:vpscAdjust
 * @see lib/neatogen/quad_prog_vpsc.c:removeoverlaps
 */

import type { Graph } from '../../model/graph.js';
import {
  newVariable,
  deleteVariable,
  deleteVPSC,
  deleteConstraints,
  solveVPSC,
  genXConstraints,
  genYConstraints,
  VPSC,
  Rectangle,
  type Variable,
} from '../../vpsc/index.js';
import { sepFactor, DFLT_MARGIN } from './sep-factor.js';

const POINTS_PER_INCH = 72;
/** Widen nodes in the x pass so a horizontally resolved pair does not count as
 * vertically overlapping. @see quad_prog_vpsc.c:generateNonoverlapConstraints */
const X_PASS_SCALE = Math.fround(1.0001);

interface Gap { x: number; y: number }
interface VpscBox { w: number; h: number }
type Coords = readonly [Float32Array, Float32Array];

/** One Rectangle per node: size scaled by `scale`, plus half the gap per side.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints */
function buildRects(c: Coords, size: VpscBox[], gap: Gap, scale: number): Rectangle[] {
  return size.map((s, i) => {
    const hw = (scale * s.w) / 2.0 + gap.x / 2.0;
    const hh = (scale * s.h) / 2.0 + gap.y / 2.0;
    return new Rectangle(c[0][i]! - hw, c[0][i]! + hw, c[1][i]! - hh, c[1][i]! + hh);
  });
}

/** Solve one axis and store the result (rounded to float) into `c[axis]`.
 * @see lib/neatogen/quad_prog_vpsc.c:removeoverlaps */
function solveAxis(c: Coords, size: VpscBox[], gap: Gap, axis: 0 | 1): void {
  const rects = buildRects(c, size, gap, axis === 0 ? X_PASS_SCALE : 1);
  const vars: Variable[] = size.map((_, i) => newVariable(i, 1.0, 1.0));
  const cs = axis === 0 ? genXConstraints(rects, vars, true) : genYConstraints(rects, vars);
  const vpsc = new VPSC(vars, cs);
  solveVPSC(vpsc);
  // solveVPSC places every variable in a block. @see quad_prog_vpsc.c:568 getVariablePos
  vars.forEach((v, i) => {
    c[axis][i] = v.position();
  });
  deleteVPSC(vpsc);
  deleteConstraints(cs);
  for (const v of vars) deleteVariable(v);
}

/**
 * Remove overlaps with two VPSC passes (x then y). The gap handed to
 * removeoverlaps is twice the separation margin (opt.gap is the gap size, not
 * the margin): `2 * sep` when `sep` is additive, else twice DFLT_MARGIN.
 * Returns 0 as C does.
 * @see lib/neatogen/adjust.c:vpscAdjust
 */
export function vpscAdjust(g: Graph): number {
  const margin = sepFactor(g);
  const gap: Gap = {
    x: (2 * (margin.doAdd ? margin.x : DFLT_MARGIN)) / POINTS_PER_INCH,
    y: (2 * (margin.doAdd ? margin.y : DFLT_MARGIN)) / POINTS_PER_INCH,
  };
  const nodes = Array.from(g.nodes.values());
  const c: Coords = [new Float32Array(nodes.length), new Float32Array(nodes.length)];
  // Layout has set ND_pos and node init ND_width/ND_height before any adjuster.
  nodes.forEach((n, i) => {
    c[0][i] = n.info.pos![0];
    c[1][i] = n.info.pos![1];
  });
  const size = nodes.map((n) => ({ w: n.info.width!, h: n.info.height! }));
  solveAxis(c, size, gap, 0);
  solveAxis(c, size, gap, 1);
  nodes.forEach((n, i) => {
    n.info.pos = [c[0][i]!, c[1][i]!];
  });
  return 0;
}
