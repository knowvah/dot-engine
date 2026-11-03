// SPDX-License-Identifier: EPL-2.0

/**
 * The record half of gvFreeLayout, run late (part-9 AD-11).
 *
 * C deletes every layout record when the layout is freed, so the next layout
 * binds zeroed ones. The port cannot delete them there: `getLayout` is
 * documented to work after `render`, and `render` frees at its end. `freeLayout`
 * therefore only marks the graph freed, and the next `layout` replaces the
 * records before the engine runs. That is an explicit deviation in WHEN the
 * records go. What a layout sees is the same: zeroed records after a free, stale
 * ones without one.
 *
 * @see lib/gvc/gvlayout.c:gvFreeLayout
 */

import { makeEdgeInfo, makePort } from '../model/edgeInfo.js';
import { makeGraphInfo } from '../model/graphInfo.js';
import type { Graph } from '../model/graph.js';
import { makeNodeInfo } from '../model/nodeInfo.js';

/**
 * True when a completed layout on `g` has since been freed. `layout` sets
 * `laidOut` and `cleanup` together when the engine returns, and `freeLayout`
 * clears `cleanup`, so this needs no field of its own and cannot hold on a graph
 * that was never laid out: its records are still the ones it was created with.
 *
 * @see lib/gvc/gvlayout.c:88 (GD_cleanup(g) = gvle->cleanup)
 * @see lib/gvc/gvlayout.c:gvFreeLayout (GD_cleanup(g) = NULL)
 */
export function layoutWasFreed(g: Graph): boolean {
  return g.info?.laidOut === true && g.info.cleanup === undefined;
}

/**
 * Replaces the record of `g` and of every subgraph under it.
 * @see lib/common/input.c:802 (agclean(g, AGRAPH, "Agraphinfo_t"))
 * @see lib/cgraph/rec.c:agclean (agapply over the subgraphs)
 */
function resetGraphRecords(g: Graph): void {
  g.info = makeGraphInfo();
  for (const subg of g.subgraphs.values()) resetGraphRecords(subg);
}

/**
 * Replaces every layout record reachable from `g`: what the engine cleanup and
 * graph_cleanup delete in C. `g.nodes` and `g.edges` hold every member of the
 * graph, including those declared in a subgraph (as agfstnode/agfstout do), and
 * the virtual nodes and edges of a layout are reachable only through the
 * records this drops. The parser and the builder stamp nothing on a record, and
 * `layout` sets `gvc` after this runs, so there is nothing to carry over.
 *
 * @see lib/common/utils.c:1522 (gv_cleanup_edge: agdelrec Agedgeinfo_t)
 * @see lib/common/utils.c:gv_cleanup_node (agdelrec Agnodeinfo_t)
 * @see lib/dotgen/dotinit.c:114 (dot_cleanup_node: agdelrec Agnodeinfo_t)
 * @see lib/common/input.c:graph_cleanup
 */
export function resetLayoutRecords(g: Graph): void {
  for (const n of g.nodes.values()) n.info = makeNodeInfo();
  for (const e of g.edges) e.info = makeEdgeInfo(makePort(), makePort());
  resetGraphRecords(g);
}
