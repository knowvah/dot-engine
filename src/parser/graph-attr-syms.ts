// SPDX-License-Identifier: EPL-2.0
/**
 * The builder's model of cgraph's graph-attribute symbols: which graphs hold
 * a local dict symbol for a key, and what a subgraph copies when it opens.
 * @see lib/cgraph/attr.c
 */
import type { Graph } from '../model/graph.js';

/**
 * Whether `g` holds a local dict symbol for graph attribute `key`. The root
 * holds every declared key (a global definition goes into its dict); a
 * subgraph holds the keys it declared and the ones it was pinned with. A
 * seeded value is inherited through the dict view and has no symbol.
 * @see lib/cgraph/attr.c:aglocaldictsym
 */
export function hasLocalGraphSym(g: Graph, key: string): boolean {
  if (g.parent === null) return g.declaredGraphAttrs.has(key);
  if (g.pinnedAttrs?.has(key) === true) return true;
  return g.attrs.has(key) && g.seededAttrs?.has(key) !== true;
}

/**
 * Give each direct subgraph of `parent` with no local symbol for `key` one
 * holding its current value: `parent` is about to update its own symbol.
 * The value stays in the subgraph's `attrs` (absent for the empty default).
 * @see lib/cgraph/attr.c:unviewsubgraphsattr
 */
export function pinSubgraphsAttr(parent: Graph, key: string): void {
  for (const sub of parent.subgraphs.values()) {
    if (!hasLocalGraphSym(sub, key)) (sub.pinnedAttrs ??= new Set()).add(key);
  }
}

/**
 * The graph-attribute values a subgraph opening in `scope` copies: for each
 * key, the `defval` of the nearest local symbol on the dict view scope ->
 * root, which is what `agmakeattrs` iterates. A graph's value for a key it
 * holds a symbol for is its `attrs` entry (absent: the empty default, which
 * the copy leaves out). Until a subgraph is re-opened these are the current
 * values of the enclosing graphs; a re-opened one may hold a seeded value
 * that a nearer symbol above it overrides, or a pin that hides a later one.
 * Snapshotted when a subgraph opens so an ancestor attribute set LATER in
 * statement order does not retroactively apply (DOT's order-sensitive defaults).
 * @see lib/cgraph/attr.c:agmakeattrs
 */
export function effectiveGraphDefaults(scope: Graph): Map<string, string> {
  const eff = new Map<string, string>();
  const found = new Set<string>();
  const take = (g: Graph, key: string): void => {
    if (found.has(key)) return;
    found.add(key);
    const v = g.attrs.get(key);
    if (v !== undefined) eff.set(key, v);
  };
  for (let g: Graph | null = scope; g !== null; g = g.parent) {
    for (const key of g.attrs.keys()) {
      if (g.seededAttrs?.has(key) !== true) take(g, key);
    }
    for (const key of g.pinnedAttrs ?? []) take(g, key);
  }
  return eff;
}
