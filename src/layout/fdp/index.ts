// SPDX-License-Identifier: EPL-2.0

/**
 * fdp layout engine entry point — the fdp_layout pipeline:
 * init (clusters, params, nodes/edges) → recursive layout →
 * aspect/coord sync → straight-line splines → label placement.
 *
 * Spec read at the 15.0.0 tag.
 *
 * @see lib/fdpgen/layout.c:fdp_layout (15.0.0)
 */

import type { Graph } from '../../model/graph.js';
import type { LayoutEngine } from '../../gvc/context.js';
import { setEdgeTypeFromAttr } from '../dot/index.js';
import {
  EDGETYPE_LINE, EDGETYPE_NONE, EDGETYPE_ORTHO, splineEdges, injectOraclePositions,
} from '../neato/splines.js';
import { EDGETYPE_COMPOUND } from '../dot/splines.js';
import { RenderError } from '../../errors.js';
import { neatoSetAspect } from '../neato/init.js';
import { placeGraphLabel } from '../dot/position-bbox.js';
import { gvPostprocess } from '../../common/postproc.js';
import { fdpInitParams } from './tlayout-parms.js';
import { fdpInitNodeEdge, fdpCleanup } from './init.js';
import { fdpLayout, mkClusters } from './layout.js';
import { gdata } from './fdp-model.js';
import { graphInit } from '../../common/graph-init.js';
import { csrand } from '../../common/crand.js';

export { fdpLayout, mkClusters, evalPositions, setBB } from './layout.js';
export { fdpTLayout } from './tlayout.js';
export { fdpXLayout } from './xlayout.js';
export { findCComp } from './comp.js';
export { deriveGraph, type LayoutInfo } from './derive.js';
export { fdpInitNodeEdge, fdpCleanup } from './init.js';
export { fdpInitParams, fdpParms } from './tlayout-parms.js';

/** @see lib/fdpgen/layout.c:fdpSplines (agwarningf text) */
const CLUSTER_EDGE_WARNING =
  'splines and cluster edges not supported - using line segments';

/**
 * Graph-level initialization: edge type, gdata, clusters, parameters,
 * nodes and edges. GD_ndim is fixed at 2 (the "dim" attribute's 3D+
 * modes are not ported — no supported input sets it).
 * @see lib/fdpgen/layout.c:fdp_init_graph
 */
export function fdpInitGraph(g: Graph): void {
  // The root graph label is created by the shared graphInit (do_graph_label),
  // called once from fdpLayoutEngine — C's graph_init runs before fdp_layout.
  // mkClusters below only labels the *clusters* (layout.c:413), never the root.
  // setEdgeType FUNCTION (utils.c:1423): reads `splines`, LINE is the default.
  // @see lib/fdpgen/layout.c:1004
  setEdgeTypeFromAttr(g, EDGETYPE_LINE);
  gdata(g); // GD_alg(g) = gv_alloc(sizeof(gdata))
  mkClusters(g, null, g);
  fdpInitParams(g);
  fdpInitNodeEdge(g);
}

/**
 * Route edges with edge type `et`: splineEdges reads the type from GD_flags,
 * so the C local `et = EDGETYPE_LINE` is applied for the call and restored.
 * @see lib/neatogen/neatosplines.c:spline_edges1
 */
function splineEdges1(g: Graph, et: number): void {
  const saved = g.info.flags;
  g.info.flags = (saved & ~0xf) | et;
  try {
    splineEdges(g);
  } finally {
    g.info.flags = saved;
  }
}

/**
 * Route edges by the resolved edge type. C's State/Nop globals are not
 * modeled: State < GVSPLINES at the tail holds exactly when the
 * `et > EDGETYPE_ORTHO` block did not route (types <= ORTHO, or the
 * HAS_CLUST_EDGE fallback), and Nop = 2 is only set on the compoundEdges
 * path, which throws here. So the tail is the `else` of the block.
 * @see lib/fdpgen/layout.c:fdpSplines
 */
function fdpSplines(g: Graph): void {
  let et = g.info.flags & 0xf;
  if (et > EDGETYPE_ORTHO) {
    if (et === EDGETYPE_COMPOUND) {
      // C: splineEdges(g, compoundEdges, EDGETYPE_SPLINE) — unported router.
      throw new RenderError(
        'splines=compound: cluster-avoiding edge routing (compoundEdges) is not supported yet',
        'UNSUPPORTED_FEATURE',
      );
    }
    if (g.info.n_cluster_edges) { // HAS_CLUST_EDGE(g)
      console.warn(CLUSTER_EDGE_WARNING);
      et = EDGETYPE_LINE;
    } else {
      splineEdges1(g, et);
      return; // State == GVSPLINES
    }
  }
  splineEdges1(g, et); // State < GVSPLINES
}

/**
 * The complete fdp pipeline.
 * @see lib/fdpgen/layout.c:fdp_layout
 */
export function fdpLayoutEngine(g: Graph): void {
  // C: gvLayoutJobs runs graph_init(g, LAYOUT_USES_RANKDIR) before fdp_layout.
  // fdp does not set the flag → useRankdir=false. Creates GD_label(g) too.
  // @see lib/common/input.c:600, lib/gvc/gvlayout.c:81
  graphInit(g, false);
  // fdp never calls srand(); the coincident-node rand() fallback draws from
  // the process-global libc rand() stream, which is unseeded ⇒ srand(1). Reset
  // the modeled stream per render so repeated renders in one JS process match
  // a fresh C process. (fdp placement uses a separate srand48/drand48 stream.)
  csrand(1);
  fdpInitGraph(g);
  if (fdpLayout(g) !== 0) {
    return;
  }
  // T1 injection hook (iterative-parity-campaign): inert unless GVTS_POS_INJECT
  // is set. fdp does NOT route through neato's spline_edges — it has its own
  // fdpSplines — so the neato hook is never reached here. This must run BEFORE
  // neatoSetAspect, which derives coord (points) from pos (inches): routing
  // reads coord, so injecting after it would be a silent no-op. Mirrors the
  // native dump site in fdp_layout, between fdpLayout() and neato_set_aspect().
  // @see lib/fdpgen/layout.c:1062 fdp_layout
  injectOraclePositions(g);
  neatoSetAspect(g); // C neato_set_aspect: pos (inches) → coord (points)

  const et = g.info.flags & 0xf;
  if (et !== EDGETYPE_NONE) fdpSplines(g);

  // C gv_postprocess(g, 0): the drawing is already origin-based (finalCC), so
  // translation is suppressed — but the pass still runs addXLabels, which is
  // what positions the *edge* labels under fdp (fdpSplines never sets
  // ED_label(e)->pos). @see lib/fdpgen/layout.c:1076
  placeGraphLabel(g);
  gvPostprocess(g, false);
}

/**
 * fdp LayoutEngine plugin for registration with GvcContext.
 * @see lib/gvc/gvplugin.h:gvlayout_engine_s
 */
export const fdpEngine: LayoutEngine = {
  type: 'fdp',
  layout(g: Graph): void { fdpLayoutEngine(g); },
  cleanup(g: Graph): void { fdpCleanup(g); },
};
