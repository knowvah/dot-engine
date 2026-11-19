// SPDX-License-Identifier: EPL-2.0

/**
 * fdp compound / cluster-edge preprocessing (processClusterEdges).
 *
 * When an edge endpoint names a cluster (a node whose name matches a cluster
 * subgraph — e.g. `e -- clusterB` where `subgraph clusterB {…}` exists), fdp
 * does NOT draw that node. Instead it replaces the cluster-named endpoint with
 * an invisible box "cluster node" sized to the cluster (setClustNodes) and
 * clones the edge onto it, then DELETES the original visible node. dot/neato
 * keep drawing such a node; only fdp performs this substitution, via
 * `processClusterEdges` at the top of `fdp_init_node_edge`.
 *
 * The cluster node carries the `clustnode` flag (ND_clustnode): deriveGraph
 * skips it (it is positioned by setClustNodes, not the force solver) and the
 * dot serializer suppresses its declaration and writes its name as the cluster
 * name (the part after the synthetic `__i:` prefix).
 *
 * Spec read at the 15.0.0 tag.
 *
 * @see lib/fdpgen/fdpinit.c:fdp_init_node_edge (processClusterEdges call)
 * @see lib/common/utils.c:processClusterEdges, checkCompound, clustNode
 * @see lib/common/utils.c:undoClusterEdges, undoCompound, mapN
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { agnode, agsubnode } from '../../model/cgraph-ops.js';
import { mkClustMap } from '../../common/clust-map.js';

// ---------------------------------------------------------------------------
// Cluster name lookup (mapc); the map is common/clust-map.ts
// ---------------------------------------------------------------------------

/**
 * A node maps to a cluster iff its name starts with "cluster" AND a cluster of
 * that exact name exists. @see lib/common/utils.c:mapc
 */
function mapc(cmap: Map<string, Graph>, n: Node): Graph | null {
  if (n.name.startsWith('cluster')) return cmap.get(n.name) ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Edge dedup map (mapEdge / insertEdge) — symmetric (t,h) key over proxies
// ---------------------------------------------------------------------------

interface MapItem { t: Node; h: Node }

function edgeKey(t: Node, h: Node): string {
  return `${t.name}\0${h.name}`;
}

/** @see lib/common/utils.c:mapEdge */
function mapEdge(map: Map<string, MapItem>, t: Node, h: Node): MapItem | undefined {
  return map.get(edgeKey(t, h));
}

/**
 * Record the cloned edge's proxy endpoints under both (t,h) and (h,t) so a
 * later parallel real edge in either direction reuses the same proxies.
 * @see lib/common/utils.c:insertEdge
 */
function insertEdge(map: Map<string, MapItem>, t: Node, h: Node, ce: Edge): void {
  map.set(edgeKey(t, h), { t: ce.tail, h: ce.head });
  map.set(edgeKey(h, t), { t: ce.head, h: ce.tail });
}

// ---------------------------------------------------------------------------
// Node / edge construction (clustNode / cloneEdge)
// ---------------------------------------------------------------------------

/**
 * Create the invisible box "cluster node" standing in for the endpoint of an
 * edge to cluster cg, whose original node n has the same name as cg. The
 * original node n is recorded for deletion. A synthetic `__i:<cluster>` name
 * keeps proxies distinct; the serializer strips the prefix.
 * @see lib/common/utils.c:clustNode
 */
function clustNode(
  n: Node, cg: Graph, root: Graph, delSet: Set<Node>, idx: { v: number },
): Node {
  // C's `agxbprint(xb, "__%d:%s", *idx++, …)` post-increments the POINTER, not
  // the counter, so index_counter never advances: every proxy for a cluster is
  // named `__0:<cluster>` and agnode create-or-get returns one shared node per
  // cluster. Replicate that (idx is retained for parity but not advanced).
  const name = `__${idx.v}:${cg.name}`;
  const cn = agnode(root, name, true)!;
  cn.info.clustnode = true; // SET_CLUST_NODE
  agsubnode(cg, cn, true);
  delSet.add(n); // agsubnode(clg, n, 1): mark original for deletion
  // C setAttr: label empty, invisible, box. setClustNodes overwrites geometry.
  cn.attrs.set('label', '');
  cn.attrs.set('style', 'invis');
  cn.attrs.set('shape', 'box');
  return cn;
}

/**
 * The next edge AGSEQ. C's counter keeps counting past deleted edges, so a
 * cycle's clones and undone clones still number the next cycle's. No edge is
 * deleted before a first layout's clones, so there this is `edges.length + 1`.
 * @see lib/cgraph/edge.c:newedge (agnextseq)
 */
function nextEdgeSeq(root: Graph): number {
  let max = 0;
  for (const e of root.edges) max = Math.max(max, e.graphSeq);
  return max + 1;
}

/**
 * Clone e as ct->ch (same sense) in the root graph, copying attributes and
 * flagging it compound. @see lib/common/utils.c:cloneEdge
 */
function cloneEdge(root: Graph, e: Edge, ct: Node, ch: Node): Edge {
  const ce = new Edge(ct, ch, '');
  for (const [k, v] of e.attrs) ce.attrs.set(k, v);
  ce.info.compound = 1; // ED_compound = true
  ce.graphSeq = nextEdgeSeq(root);
  root.edges.push(ce);
  return ce;
}

// ---------------------------------------------------------------------------
// checkCompound
// ---------------------------------------------------------------------------

/**
 * If either endpoint of e names a cluster, replace it with a cluster node and
 * clone the edge; return 1 if a cluster edge was created, else 0. Containment
 * conflicts (cluster inside cluster, node inside cluster, cluster cycle) are
 * warnings that create nothing, exactly as C.
 * @see lib/common/utils.c:checkCompound
 */
function checkCompound(
  e: Edge, root: Graph, cmap: Map<string, Graph>, map: Map<string, MapItem>,
  delSet: Set<Node>, idx: { v: number },
): number {
  const t = e.tail;
  const h = e.head;
  if (h.info.clustnode) return 0; // IS_CLUST_NODE(h)
  const tg = mapc(cmap, t);
  const hg = mapc(cmap, h);
  if (!tg && !hg) return 0;
  if (tg === hg) return 0; // cluster cycle t--t not supported (warn)

  const ip = mapEdge(map, t, h);
  if (ip) {
    cloneEdge(root, e, ip.t, ip.h);
    return 1;
  }

  let cn: Node;
  let ce: Edge;
  if (hg) {
    if (tg) {
      if (agContains(hg, tg) || agContains(tg, hg)) return 0; // nested clusters
      cn = clustNode(t, tg, root, delSet, idx);
      const cn1 = clustNode(h, hg, root, delSet, idx);
      ce = cloneEdge(root, e, cn, cn1);
      insertEdge(map, t, h, ce);
    } else {
      if (agContainsNode(hg, t)) return 0; // tail node inside head cluster
      cn = clustNode(h, hg, root, delSet, idx);
      ce = cloneEdge(root, e, t, cn);
      insertEdge(map, t, h, ce);
    }
  } else {
    if (agContainsNode(tg!, h)) return 0; // head node inside tail cluster
    cn = clustNode(t, tg!, root, delSet, idx);
    ce = cloneEdge(root, e, cn, h);
    insertEdge(map, t, h, ce);
  }
  return 1;
}

/** agcontains(a, b): is cluster b a descendant cluster of a? */
function agContains(a: Graph, b: Graph): boolean {
  for (let g: Graph | null = b; g !== null; g = g.parent) {
    if (g === a) return true;
  }
  return false;
}

/** agcontains(cg, n): is node n a member of cluster cg (or a descendant)? */
function agContainsNode(cg: Graph, n: Node): boolean {
  return cg.nodes.has(n.name);
}

// ---------------------------------------------------------------------------
// processClusterEdges
// ---------------------------------------------------------------------------

/** Remove node n from g and every enclosing/nested graph, dropping its edges.
 *  Mirrors agdelete(g, n), which also deletes n's incident edges. */
function deleteNodeAndEdges(root: Graph, n: Node): void {
  const purge = (gr: Graph): void => {
    if (gr.edges.length > 0) {
      gr.edges = gr.edges.filter((e) => e.tail !== n && e.head !== n);
    }
    gr.nodes.delete(n.name);
    for (const sg of gr.subgraphs.values()) purge(sg);
  };
  purge(root);
}

/**
 * Replace cluster-edge endpoints that name a cluster with invisible cluster
 * nodes, clone the edges onto them, and delete the original nodes. Records the
 * cluster-edge count on the graph (HAS_CLUST_EDGE). Must run after mkClusters
 * (needs info.clust) and before node ids are assigned.
 * @see lib/common/utils.c:processClusterEdges
 */
export function processClusterEdges(g: Graph): void {
  const root = g.root;
  const cmap = mkClustMap(g);
  if (cmap.size === 0) return; // no clusters ⇒ no cluster edges
  const map = new Map<string, MapItem>();
  const delSet = new Set<Node>();
  const idx = { v: 0 };
  let numClEdges = 0;

  for (const n of [...g.nodes.values()]) {
    if (n.info.clustnode) continue;
    for (const e of n.outEdges(g)) {
      numClEdges += checkCompound(e, root, cmap, map, delSet, idx);
    }
  }

  for (const n of delSet) deleteNodeAndEdges(root, n);

  if (numClEdges > 0) g.info.n_cluster_edges = numClEdges;
}

// ---------------------------------------------------------------------------
// undoClusterEdges
// ---------------------------------------------------------------------------

/**
 * A cluster node's original: a new node named for the cluster, with default
 * attributes, in the root alone. A node that is not a cluster node returns as
 * it is. @see lib/common/utils.c:mapN
 */
function mapN(n: Node, delSet: Set<Node>): Node {
  if (!n.info.clustnode) return n;
  delSet.add(n); // agsubnode(clg, n, 1)
  const name = n.name.slice(n.name.indexOf(':') + 1);
  const existing = agnode(n.root, name, false);
  if (existing !== null) return existing;
  const nn = agnode(n.root, name, true)!;
  nn.info.clustnode = true; // SET_CLUST_NODE
  return nn;
}

/** @see lib/common/utils.c:undoCompound */
function undoCompound(root: Graph, e: Edge, delSet: Set<Node>): void {
  const ntail = mapN(e.tail, delSet);
  const nhead = mapN(e.head, delSet);
  const ce = cloneEdge(root, e, ntail, nhead);
  // Transfer drawing information. C's gv_cleanup_edge(e) follows: e goes with
  // its proxy below, and its record with it.
  ce.info.spl = e.info.spl;
  e.info.spl = undefined;
  ce.info.label = e.info.label;
  e.info.label = undefined;
  ce.info.xlabel = e.info.xlabel;
  e.info.xlabel = undefined;
  ce.info.head_label = e.info.head_label;
  e.info.head_label = undefined;
  ce.info.tail_label = e.info.tail_label;
  e.info.tail_label = undefined;
}

/**
 * Replace cluster nodes with originals and original edges, then delete the
 * cluster nodes, which also deletes the cluster edges. A compound edge that
 * already joins originals is left alone: C's mapN crashes on it, since the name
 * of a node this made has no ':' (a second undo with no gvFreeLayout, measured:
 * `l,dot,l,dot` exits on SIGSEGV), and a record left over from an earlier cycle
 * with no compound edges left crashes C too (`l,plain,f,l,xdot`).
 * @see lib/common/utils.c:undoClusterEdges
 */
export function undoClusterEdges(g: Graph): void {
  if (!g.info.n_cluster_edges) return;
  const root = g.root;
  const delSet = new Set<Node>();
  const edgelist: Edge[] = [];
  for (const n of g.nodes.values()) {
    for (const e of n.outEdges(g)) {
      if (e.info.compound && isProxyEdge(e)) edgelist.push(e);
    }
  }
  for (const e of edgelist) undoCompound(root, e, delSet);
  // gv_cleanup_node(n): the record goes with the node.
  for (const n of delSet) deleteNodeAndEdges(root, n);
}

/** True when an endpoint of e is a proxy, which `clustNode` names `__i:<cluster>`. */
function isProxyEdge(e: Edge): boolean {
  return (e.tail.info.clustnode && e.tail.name.includes(':'))
    || (e.head.info.clustnode && e.head.name.includes(':'));
}
