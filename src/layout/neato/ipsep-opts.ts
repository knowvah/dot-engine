// SPDX-License-Identifier: EPL-2.0

/**
 * The `ipsep_options` `majorization` builds for `stress_majorization_cola`
 * (mode=ipsep), and the cluster membership it carries.
 *
 * Inputs reuse the port's existing parsers: the overlap mode is the
 * `AdjustData` that `graphAdjustMode` / `getAdjustMode` (`fdp-adjust.ts`,
 * C `adjust.c:graphAdjustMode`) resolved once per layout, passed in as C
 * passes `am`, so an unrecognized `overlap` value does not warn twice; the gap
 * comes from `sepFactor` (`sep-factor.ts`, C `adjust.c:sepFactor`); `levelsgap`
 * goes through `lateDouble` (C `late_double`) and `diredgeconstraints` through
 * `mapbool`. The `Verbose` lines of the C block are not ported (the port has
 * no Verbose), nor the `DEBUG_COLA` dump.
 *
 * Node indices follow `nodes` (C `ND_id`, assigned in `agfstnode(g)` order),
 * which is the order of the layout's coordinate arrays.
 *
 * @see lib/neatogen/neatoinit.c:majorization (1121-1170)
 * @see lib/neatogen/neatoinit.c:cluster_map
 * @see lib/neatogen/digcola.h:ipsep_options
 */

import type { Box, Point } from '../../model/geom.js';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import { lateDouble } from '../../common/nodeinit.js';
import { mapbool, isACluster } from '../dot/rank.js';
import { nodesInSeq } from '../dot/decomp.js';
import { aggetGraph } from '../fdp/fdp-model.js';
import { AM_IPSEP, AM_VPSC, type AdjustData } from './fdp-adjust.js';
import { DFLT_MARGIN, sepFactor } from './sep-factor.js';
import type { ClusterData, IpsepOptions } from './quad-prog-vpsc.js';

/** `POINTS_PER_INCH`, the divisor of C's `PS2INCH` macro. @see lib/common/geom.h:PS2INCH */
const POINTS_PER_INCH = 72;
/** `strncasecmp(str, "hier", 4)`: the DiG-CoLa prefix of `diredgeconstraints`. */
const HIER_PREFIX = 'hier';

/** C `PS2INCH(a_points)`: `(a_points)/(double)POINTS_PER_INCH` (a divide, not `* 1/72`). */
const ps2inch = (points: number): number => points / POINTS_PER_INCH;

/** C `boxf` zero-initialised by `gv_calloc`. */
const zeroBox = (): Box => ({ ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } });

/**
 * Indices (in `agfstnode(g)` order) of a cluster's members. A member that is
 * not in `g` gets C's fall-through index `agnnodes(g)`.
 * @see lib/neatogen/neatoinit.c:cluster_map (inner loops)
 */
function memberIndices(subg: Graph, nodes: readonly Node[]): Int32Array {
  const members = nodesInSeq(subg);
  const c = new Int32Array(members.length);
  members.forEach((n, k) => {
    let ind = 0;
    for (const gn of nodes) {
      if (gn.id === n.id) break;
      ind++;
    }
    c[k] = ind;
  });
  return c;
}

/** The top-level clusters of `mg`, in `agfstsubg` order. @see lib/common/utils.c:is_a_cluster */
function topClusters(mg: Graph): Graph[] {
  return [...mg.subgraphs.values()].filter((s) => s !== mg.root && isACluster(s));
}

/**
 * Cluster membership of `g`'s nodes: one index array per top-level cluster of
 * the master graph, the nodes in no cluster (`toplevel`), and a zeroed
 * bounding box per cluster.
 * @see lib/neatogen/neatoinit.c:cluster_map
 */
export function clusterMap(mg: Graph, g: Graph, nodes: readonly Node[]): ClusterData {
  const nnodes = nodes.length;
  // C bitarray_t of agnnodes(g) bits; an out-of-range set (a member not in g) is dropped.
  const assigned = new Uint8Array(nnodes);
  const clusters = topClusters(mg);
  let ntoplevel = nnodes;
  let nvars = 0;
  const cs: Int32Array[] = [];
  const cn = new Int32Array(clusters.length);
  clusters.forEach((subg, i) => {
    /* clusters are processed by separate calls to ordered_edges */
    const c = memberIndices(subg, nodes);
    cn[i] = c.length;
    nvars += c.length;
    cs.push(c);
    for (const ind of c) {
      assigned[ind] = 1;
      ntoplevel--;
    }
  });
  const toplevel = new Int32Array(ntoplevel);
  let j = 0;
  for (let i = 0; i < nnodes; i++) {
    if (assigned[i] === 0) toplevel[j++] = i;
  }
  return {
    nvars, nclusters: clusters.length, clustersizes: cn, clusters: cs,
    ntoplevel, toplevel, bb: clusters.map(zeroBox),
  };
}

/**
 * `diredgeconstraints`: true-ish -> 1 (directed edge constraints), a `hier`
 * prefix (any case) -> 2 (DiG-CoLa level constraints), else 0.
 * @see lib/neatogen/neatoinit.c:majorization (1130-1140)
 */
function diredgesOf(str: string | undefined): 0 | 1 | 2 {
  if (mapbool(str)) return 1;
  if (str !== undefined && str.slice(0, HIER_PREFIX.length).toLowerCase() === HIER_PREFIX) return 2;
  return 0;
}

/**
 * `overlap=ipsep` -> 1 (non-overlap constraints), `overlap=vpsc` -> 2 (remove
 * overlaps after layout), else 0.
 * @see lib/neatogen/neatoinit.c:majorization (1141-1150)
 */
function noverlapOf(am: AdjustData): 0 | 1 | 2 {
  if (am.mode === AM_IPSEP) return 1;
  if (am.mode === AM_VPSC) return 2;
  return 0;
}

/**
 * The gap enforced when removing overlap: twice the additive `sep` margin
 * (`opt.gap` is the gap size, not the margin), else twice `DFLT_MARGIN`.
 * @see lib/neatogen/neatoinit.c:majorization (1151-1157)
 */
function gapOf(g: Graph): Point {
  const margin = sepFactor(g);
  /* Multiply by 2 since opt.gap is the gap size, not the margin */
  if (margin.doAdd) {
    return { x: 2.0 * ps2inch(margin.x), y: 2.0 * ps2inch(margin.y) };
  }
  const gap = 2.0 * ps2inch(DFLT_MARGIN);
  return { x: gap, y: gap };
}

/**
 * The options `majorization` hands `stress_majorization_cola` for one
 * component `g` of the master graph `mg`; `am` is the layout's resolved
 * overlap mode.
 * @see lib/neatogen/neatoinit.c:majorization (1121-1170)
 */
export function ipsepOptions(mg: Graph, g: Graph, nodes: readonly Node[], am: AdjustData): IpsepOptions {
  const clusters = clusterMap(mg, g, nodes);
  const edgeGap = lateDouble(aggetGraph(g, 'levelsgap'), 0.0, -Number.MAX_VALUE);
  const diredges = diredgesOf(aggetGraph(g, 'diredgeconstraints'));
  const noverlap = noverlapOf(am);
  const gap = gapOf(g);
  const nsize = nodes.map((v) => ({ x: v.info.width, y: v.info.height }));
  return { diredges, edgeGap, noverlap, gap, nsize, clusters };
}
