// SPDX-License-Identifier: EPL-2.0

/**
 * The cluster-edge half of the json writers. C's attach_attrs ends by undoing
 * fdp's cluster edges, and both json formats run it before they write, so the
 * proxy nodes `__<i>:<cluster>` never print. The port's writers otherwise read
 * the proxies as they print and undo at the next layout (`layout-reset.ts`);
 * json prints from the graph itself, so it takes the undo at C's point, through
 * the same helper. A graph with no cluster edges keeps the usual order (attach
 * after the write): nothing there can differ.
 *
 * @see plugin/core/gvrender_core_json.c:json_begin_graph
 * @see lib/common/output.c:403 (if (HAS_CLUST_EDGE(g)) undoClusterEdges(g))
 */

import { undoRenderedClusterEdges } from '../gvc/layout-reset.js';
import { isACluster } from '../layout/dot/rank.js';
import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';

/**
 * With cluster edges on `g`: runs `attach` (attach_attrs' write-back) and the
 * undo now, and returns a no-op. Otherwise returns `attach`, for the caller to
 * run after the write.
 * @see lib/common/output.c:416 attach_attrs
 */
export function attachBeforeWriteWithClusterEdges(g: Graph, attach: () => void): () => void {
  if (!g.info?.n_cluster_edges) return attach;
  attach();
  undoRenderedClusterEdges(g);
  return () => undefined;
}

/**
 * The nodes json writes: C's write_nodes skips every IS_CLUST_NODE, the stand-in
 * node `mapN` makes for a cluster an edge points at.
 * @see plugin/core/gvrender_core_json.c:571 (if (IS_CLUST_NODE(n)) continue)
 */
export function jsonNodes(g: Graph): Node[] {
  return [...g.nodes.values()].filter((n) => !n.info.clustnode);
}

/**
 * A cluster node's `_gvid`: that of the first cluster of its name, as write_graph's
 * `lookup(map, agnameof(np))` finds it, or -1 when there is none.
 * @see plugin/core/gvrender_core_json.c:658 lookup, label_subgs
 */
export function clusterNodeGid(n: Node, dfsSubs: readonly Graph[]): number {
  return dfsSubs.findIndex((sg) => sg.name === n.name && isACluster(sg));
}
