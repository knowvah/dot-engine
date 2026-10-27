// SPDX-License-Identifier: EPL-2.0

/**
 * Attribute reads with cgraph's `agxget` semantics: an object's own value,
 * else the declared default it was created under. A leaf module (model types
 * only) so label and shape code can share it without an import cycle.
 *
 * @see lib/cgraph/attr.c:agxget
 */

import type { Node } from '../model/node.js';
import type { Graph } from '../model/graph.js';

/**
 * Read a node attribute: the node's own value, else the node-attribute defaults
 * (`node [...]`) captured from the node's declaring scope up to root *at the
 * time the node was created*. The snapshot makes a `node [...]` declared after
 * the node — at any scope — correctly not apply, and lets a cluster-scoped
 * default reach nodes declared in that cluster, as the oracle does.
 *
 * Programmatically created nodes have no snapshot; they fall back to the live
 * defaults of the passed graph `g` and root.
 * @see lib/cgraph/attr.c:agxget; src/parser/builder.ts:effectiveNodeDefaults
 */
export function nodeAttr(n: Node, g: Graph, key: string): string | undefined {
  const own = n.attrs.get(key);
  if (own !== undefined) return own;
  if (n.nodeDefaultsSnapshot !== undefined) return n.nodeDefaultsSnapshot.get(key);
  return g.nodeDefaults.get(key)
    ?? (g !== g.root ? g.root.nodeDefaults.get(key) : undefined);
}

/**
 * Read a graph attribute with subgraph→root inheritance, mirroring C's
 * agxget (late_nnstring(sg, agfindgraphattr(sg, key), ...) in do_graph_label):
 * a cluster inherits `fontname`/`fontsize`/`fontcolor` set on an ancestor
 * (e.g. root `graph[fontname=Arial]`) when it sets none of its own.
 * @see lib/common/input.c:do_graph_label
 */
export function graphAttrInherited(sg: Graph, key: string): string | undefined {
  // Own value wins; otherwise the ancestor defaults SNAPSHOTTED when this
  // subgraph opened (not a live parent walk) — so an ancestor attribute set
  // later in statement order does not retroactively apply (2184).
  // @see lib/cgraph/graph.c:agsubg (parse-time defval copy)
  return sg.attrs.get(key) ?? sg.graphDefaultsSnapshot?.get(key);
}
