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
 * Also the json cluster map: write_graph's top pass numbers the subgraphs and
 * maps each cluster's name to its gid (label_subgs, insert), which is where a
 * cluster node's gid comes from (lookup) and where a repeated cluster name is
 * warned about.
 *
 * @see plugin/core/gvrender_core_json.c:json_begin_graph
 * @see plugin/core/gvrender_core_json.c:write_graph
 * @see lib/common/output.c:403 (if (HAS_CLUST_EDGE(g)) undoClusterEdges(g))
 */

import { agwarningf } from '../common/agerr.js';
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
 * The gid mapped to cluster `name`, or -1 when there is none.
 * @see plugin/core/gvrender_core_json.c:lookup
 */
export function lookupCluster(map: ReadonlyMap<string, number>, name: string): number {
  return map.get(name) ?? -1;
}

/**
 * Maps cluster `name` to gid `v`. The first entry of a name is kept; a later
 * one with another value is warned about and dropped.
 * @see plugin/core/gvrender_core_json.c:insert
 */
export function insertCluster(map: Map<string, number>, name: string, v: number): void {
  const ip = map.get(name);
  if (ip !== undefined) {
    if (ip !== v) agwarningf(`Duplicate cluster name "${name}"`);
    return;
  }
  map.set(name, v);
}

/**
 * Numbers `g`'s subgraphs in DFS preorder from `lbl` (C's `GD_gid(g) = lbl++`;
 * here a subgraph's gid is its index in `out`) and maps each cluster's name to
 * its gid. Returns the next label: the subgraph count when called on the root
 * with 0.
 * @see plugin/core/gvrender_core_json.c:label_subgs
 */
export function labelSubgs(g: Graph, lbl: number, map: Map<string, number>, out: Graph[]): number {
  if (g !== g.root) {
    const gid = lbl++;
    out.push(g);
    if (isACluster(g)) insertCluster(map, g.name, gid);
  }
  for (const [, sg] of g.subgraphs) lbl = labelSubgs(sg, lbl, map, out);
  return lbl;
}
