// SPDX-License-Identifier: EPL-2.0

/**
 * `overlap=vpsc`: the VPSC adjuster of removeOverlapWith, moved out of
 * neato/index.ts so every engine reaches it through the shared dispatch.
 *
 * C works on `float` coordinates (`float *coords[2]`): positions are rounded
 * to float on entry, and `removeoverlaps` stores each pass's result as float,
 * which decides exact-touch verdicts between the x and y passes.
 *
 * @see lib/neatogen/adjust.c:vpscAdjust
 */

import type { Graph } from '../../model/graph.js';
import { sepFactor, DFLT_MARGIN } from './sep-factor.js';
import type { ClusterData, IpsepOptions } from './quad-prog-vpsc.js';
import { removeoverlaps } from './quad-prog-vpsc-overlap.js';

const POINTS_PER_INCH = 72;

/** `(cluster_data){0}`. @see lib/neatogen/adjust.c:vpscAdjust */
function noClusters(): ClusterData {
  return {
    nvars: 0, nclusters: 0, clustersizes: new Int32Array(0), clusters: [],
    ntoplevel: 0, toplevel: new Int32Array(0), bb: [],
  };
}

/**
 * Remove overlaps with `removeoverlaps` (two VPSC passes, x then y). The gap
 * is twice the separation margin (opt.gap is the gap size, not the margin):
 * `2 * sep` when `sep` is additive, else twice DFLT_MARGIN. Returns 0 as C
 * does.
 * @see lib/neatogen/adjust.c:vpscAdjust
 */
export function vpscAdjust(g: Graph): number {
  const nodes = Array.from(g.nodes.values());
  const coords = [new Float32Array(nodes.length), new Float32Array(nodes.length)];
  // Layout has set ND_pos and node init ND_width/ND_height before any adjuster.
  nodes.forEach((n, j) => {
    coords[0]![j] = n.info.pos![0];
    coords[1]![j] = n.info.pos![1];
  });
  const margin = sepFactor(g);
  /* Multiply by 2 since opt.gap is the gap size, not the margin */
  const opt: IpsepOptions = {
    diredges: 0,
    edgeGap: 0,
    noverlap: 2,
    clusters: noClusters(),
    gap: {
      x: 2.0 * ((margin.doAdd ? margin.x : DFLT_MARGIN) / POINTS_PER_INCH),
      y: 2.0 * ((margin.doAdd ? margin.y : DFLT_MARGIN) / POINTS_PER_INCH),
    },
    nsize: nodes.map((n) => ({ x: n.info.width!, y: n.info.height! })),
  };
  removeoverlaps(nodes.length, coords, opt);
  nodes.forEach((n, j) => {
    n.info.pos = [coords[0]![j]!, coords[1]![j]!];
  });
  return 0;
}
