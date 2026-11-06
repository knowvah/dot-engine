// SPDX-License-Identifier: EPL-2.0

/**
 * Connected-component decomposition. Ports lib/pack/ccomps.c.
 *
 * @see lib/pack/ccomps.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';

/** DFS to collect connected component nodes. @see lib/pack/ccomps.c */
export function dfsCollect(g: Graph, start: Node, visited: Set<string>): Node[] {
  const stack: Node[] = [start];
  const comp: Node[] = [];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (visited.has(n.name)) continue;
    visited.add(n.name);
    comp.push(n);
    for (const e of g.edges) {
      if (e.tail === n && !visited.has(e.head.name)) stack.push(e.head);
      if (e.head === n && !visited.has(e.tail.name)) stack.push(e.tail);
    }
  }
  return comp;
}

/** Build a subgraph containing only nodes. @see lib/pack/ccomps.c */
export function buildSubgraph(root: Graph, nodes: Node[], name: string): Graph {
  const sg = new (root.constructor as { new(name: string, kind: string): Graph })(name, 'directed');
  sg.info.dotroot = root;
  // C ccomps creates components via agsubg: sg->root is the original
  // root graph, so root attrs (ranksep etc.) stay visible, and
  // iteration order is the root-creation (ID) order.
  sg.parent = root;
  sg.root = root.root;
  for (const n of [...nodes].sort((a, b) => a.id - b.id)) sg.nodes.set(n.name, n);
  // Induce the component's edges (graphviz_node_induce equivalent).
  const ns = new Set(nodes);
  sg.edges = root.edges.filter((e) => ns.has(e.tail) && ns.has(e.head));
  return sg;
}

/**
 * Give a component the parent's attribute values, as agsubg does when it
 * creates a subgraph. Dot's cccompsWithClusters uses buildSubgraph without
 * this copy (part-9 AD-1).
 * @see lib/cgraph/subg.c:agsubg
 * @see lib/cgraph/attr.c:agmakeattrs
 */
function copyParentAttrs(parent: Graph, sg: Graph): Graph {
  for (const [k, v] of parent.attrs) sg.attrs.set(k, v);
  return sg;
}

/**
 * agsubg(g, name, 1) for a component: an existing subgraph of that name is
 * returned as is, and gains the component's nodes and induced edges (the C
 * dfs adds them with agsubnode/agsubedge); otherwise a new component graph
 * takes the parent's attribute values.
 * @see lib/cgraph/subg.c:agsubg
 * @see lib/pack/ccomps.c:dfs
 */
function componentSubgraph(g: Graph, nodes: Node[], name: string, reuse: boolean): Graph {
  const existing = reuse ? g.subgraphs.get(name) : undefined;
  if (existing === undefined) return copyParentAttrs(g, buildSubgraph(g, nodes, name));
  const members = new Set<Node>([...existing.nodes.values(), ...nodes]);
  existing.nodes.clear();
  for (const n of [...members].sort((a, b) => a.id - b.id)) existing.nodes.set(n.name, n);
  const ns = new Set(nodes);
  const have = new Set(existing.edges);
  for (const e of g.edges) {
    if (ns.has(e.tail) && ns.has(e.head) && !have.has(e)) existing.edges.push(e);
  }
  return existing;
}

/** @see lib/pack/ccomps.c:isLegal */
function isLegal(p: string): boolean {
  return /^[A-Za-z0-9_]*$/.test(p);
}

/**
 * Component-name prefix: pfx when legal, else `_cc_`.
 * @see lib/pack/ccomps.c:setPrefix
 */
function setPrefix(pfx: string | null | undefined): string {
  return pfx == null || !isLegal(pfx) ? '_cc_' : pfx;
}

/**
 * Decompose g into connected components (nodes only, no edges). `reuse`
 * false is for a graph that has no user subgraphs in C, such as circo's
 * derived graph: components are always fresh.
 * @see lib/pack/ccomps.c:ccomps
 */
export function ccomps(g: Graph, pfx?: string | null, reuse = true): Graph[] {
  const visited = new Set<string>();
  const result: Graph[] = [];
  let idx = 0;
  for (const n of g.nodes.values()) {
    if (visited.has(n.name)) continue;
    const comp = dfsCollect(g, n, visited);
    result.push(componentSubgraph(g, comp, `${setPrefix(pfx)}${idx++}`, reuse));
  }
  return result;
}

/**
 * ccomps variant — same as ccomps for this port.
 * @see lib/pack/ccomps.c:cccomps
 */
export function cccomps(g: Graph, pfx?: string | null): Graph[] {
  return ccomps(g, pfx);
}

/**
 * ccomps with pinned-node detection.
 * @see lib/pack/ccomps.c:pccomps
 */
export function pccomps(g: Graph, pfx?: string | null): { graphs: Graph[]; pinned: boolean } {
  // C first collects every component containing a pinned node into a single
  // subgraph at index 0 (pin=true), then the remaining components in
  // agfstnode order. Mirror that ordering so the fixed[0] flag and packing
  // arrangement match. @see lib/pack/ccomps.c:pccomps
  const visited = new Set<string>();
  const result: Graph[] = [];
  let idx = 0;
  let pinned = false;

  // Pass 1 — all pinned-node components merged into one subgraph (index 0).
  const pinnedNodes: Node[] = [];
  for (const n of g.nodes.values()) {
    if (visited.has(n.name) || !n.info.pinned) continue;
    for (const m of dfsCollect(g, n, visited)) pinnedNodes.push(m);
    pinned = true;
  }
  if (pinnedNodes.length > 0) {
    result.push(componentSubgraph(g, pinnedNodes, `${setPrefix(pfx)}${idx++}`, true));
  }

  // Pass 2 — remaining components in node order.
  for (const n of g.nodes.values()) {
    if (visited.has(n.name)) continue;
    const comp = dfsCollect(g, n, visited);
    result.push(componentSubgraph(g, comp, `${setPrefix(pfx)}${idx++}`, true));
  }
  return { graphs: result, pinned };
}

/** True if g has exactly one connected component. @see lib/pack/ccomps.c:isConnected */
export function isConnected(g: Graph): boolean {
  if (g.nodes.size === 0) return true;
  // C runs one dfs from the first node and compares the count; it creates no
  // subgraph, so a user's `_cc_N` is left alone.
  const first = g.nodes.values().next().value as Node;
  return dfsCollect(g, first, new Set<string>()).length === g.nodes.size;
}
