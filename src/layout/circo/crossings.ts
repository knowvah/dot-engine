// SPDX-License-Identifier: EPL-2.0

/**
 * Crossing reduction for one block's circle order: count_all_crossings (with
 * its open-edge-list quirks), insertNodelist and the reduce passes. Split out
 * of blockpath.ts for file size; bodies unchanged.
 *
 * @see lib/circogen/blockpath.c:count_all_crossings / reduce / reduce_edge_crossings
 * @see lib/circogen/nodelist.c:insertNodelist
 */

import type { Node } from '../../model/node.js';
import type { DerivedNode, DerivedEdge } from './blocks.js';

// ---------------------------------------------------------------------------
// Crossing counting helpers (each branch extracted to keep CCN low)
// ---------------------------------------------------------------------------

export function derivedOf(n: Node): DerivedNode | null {
  return (n.info.alg as { derivedNode?: DerivedNode } | undefined)?.derivedNode ?? null;
}

export function closeOpenEdge(e: DerivedEdge, d: DerivedNode, opened: Iterable<DerivedEdge>): number {
  let cross = 0;
  for (const o of opened) {
    if (o.order > e.order && o.tail !== d && o.head !== d) cross++;
  }
  return cross;
}

/**
 * Every node's incident edges in agfstedge order: out-edges by head, then
 * in-edges by tail (node creation order, ties by edge sequence) — the order
 * spanIncident uses, keyed by orig.id because layoutBlock sorts the block's
 * nodes that way. @see lib/cgraph/edge.c:agfstedge
 */
export function agfstedgeLists(edges: DerivedEdge[]): Map<DerivedNode, DerivedEdge[]> {
  const seq = new Map<DerivedEdge, number>();
  edges.forEach((e, i) => seq.set(e, i));
  const by = (end: (e: DerivedEdge) => DerivedNode) => (a: DerivedEdge, b: DerivedEdge): number =>
    (end(a).orig.id - end(b).orig.id) || (seq.get(a)! - seq.get(b)!);
  const out = new Map<DerivedNode, DerivedEdge[]>();
  const inn = new Map<DerivedNode, DerivedEdge[]>();
  for (const e of edges) {
    out.set(e.tail, [...(out.get(e.tail) ?? []), e]);
    inn.set(e.head, [...(inn.get(e.head) ?? []), e]);
  }
  const lists = new Map<DerivedNode, DerivedEdge[]>();
  for (const d of new Set([...out.keys(), ...inn.keys()])) {
    const o = (out.get(d) ?? []).sort(by((e) => e.head));
    const i = (inn.get(d) ?? []).sort(by((e) => e.tail));
    lists.set(d, [...o, ...i]);
  }
  return lists;
}

/**
 * C's count_all_crossings — INCLUDING its load-bearing bug: remove_edge keys
 * the open-edge dict by the half-edge POINTER handed to it, and add_edge
 * stored the half that the OPENING node's agfstedge yielded. Closing at the
 * other endpoint yields the opposite half, so dtdelete misses and the edge
 * stays open; each close therefore counts EVERY edge opened after it, minus
 * edges incident to the closing node. Only when a node is on the list twice
 * (a place_residual_nodes quirk) does its second visit yield the stored half,
 * so the edges it opened ARE removed — in agfstedge order, between the counts.
 * Do not "fix" either behaviour: the final circle order depends on both.
 * @see lib/circogen/blockpath.c:count_all_crossings
 * @see lib/circogen/edgelist.c:remove_edge
 */
export function countCrossings(list: Node[], edges: DerivedEdge[]): number {
  for (const e of edges) e.order = 0;
  const incident = agfstedgeLists(edges);
  const opened = new Map<DerivedEdge, DerivedNode>(); // edge → node whose half add_edge stored
  let crossings = 0; let order = 1;
  for (const n of list) {
    const d = derivedOf(n);
    if (!d) continue;
    const es = incident.get(d) ?? [];
    crossings += closeEdgesAt(d, es, opened);
    for (const e of es) {
      if (e.order === 0) { e.order = order; opened.set(e, d); }
    }
    order++;
  }
  return crossings;
}

/**
 * count_all_crossings' close loop at node d: count against the open list,
 * then remove_edge — a hit only for edges add_edge stored from d itself.
 */
export function closeEdgesAt(d: DerivedNode, es: DerivedEdge[], opened: Map<DerivedEdge, DerivedNode>): number {
  let crossings = 0;
  for (const e of es) {
    if (e.order === 0) continue;
    crossings += closeOpenEdge(e, d, opened.keys());
    if (opened.get(e) === d) opened.delete(e); // remove_edge: same half → dtdelete hits
  }
  return crossings;
}

// ---------------------------------------------------------------------------
// Crossing reduction
// ---------------------------------------------------------------------------

export function insertNode(list: Node[], cn: Node, neighbor: Node, pos: number): void {
  const i = list.indexOf(cn); if (i !== -1) list.splice(i, 1);
  const ni = list.indexOf(neighbor);
  if (ni === -1) { list.push(cn); return; }
  list.splice(pos === 0 ? ni : ni + 1, 0, cn);
}

/**
 * One reduce pass, mirroring C's reduce (blockpath.c:439): iterate the
 * SUBGRAPH's nodes in agfstnode (root-seq) order — NOT the current list
 * order — and each node's incident edges in agfstedge order; the neighbour
 * is agtail(e) unless that is curnode. The first-improving-move order is
 * load-bearing for the final arrangement.
 */
export function reducePass(
  list: Node[], edges: DerivedEdge[], cnt: { v: number }, nodes: DerivedNode[],
): void {
  const ord = new Map<DerivedNode, number>();
  nodes.forEach((dn, i) => ord.set(dn, i));
  const seq = new Map<DerivedEdge, number>();
  edges.forEach((e, i) => seq.set(e, i));
  for (const dn of nodes) {
    for (const e of spanIncident(dn, edges, ord, seq)) {
      let neighbor = e.tail;
      if (neighbor === dn) neighbor = e.head;
      for (const pos of [0, 1] as const) {
        const copy = [...list];
        insertNode(list, dn.orig, neighbor.orig, pos);
        const nc = countCrossings(list, edges);
        if (nc < cnt.v) { cnt.v = nc; if (cnt.v === 0) return; }
        else { list.length = 0; list.push(...copy); }
      }
    }
  }
}

const CROSS_ITER = 10;

/** @see lib/circogen/blockpath.c:reduce_edge_crossings */
export function reduceEdgeCrossings(
  list: Node[], edges: DerivedEdge[], nodes: DerivedNode[],
): Node[] {
  const cnt = { v: countCrossings(list, edges) };
  for (let i = 0; i < CROSS_ITER && cnt.v > 0; i++) {
    const prev = cnt.v; reducePass(list, edges, cnt, nodes);
    if (prev === cnt.v) break;
  }
  return list;
}

/**
 * Incident edges of dn in agfstedge order over the (possibly pruned)
 * subgraph edge set: out-edges (by head order, seq) then in-edges (by tail
 * order, seq). `ord`/`seq` maps carry the derived root's node and edge
 * creation orders. @see lib/cgraph/edge.c:agfstedge
 */
export function spanIncident(
  dn: DerivedNode, edges: DerivedEdge[],
  ord: Map<DerivedNode, number>, seq: Map<DerivedEdge, number>,
): DerivedEdge[] {
  const out = edges.filter((e) => e.tail === dn)
    .sort((a, b) => ((ord.get(a.head) ?? 0) - (ord.get(b.head) ?? 0)) || ((seq.get(a) ?? 0) - (seq.get(b) ?? 0)));
  const inn = edges.filter((e) => e.head === dn)
    .sort((a, b) => ((ord.get(a.tail) ?? 0) - (ord.get(b.tail) ?? 0)) || ((seq.get(a) ?? 0) - (seq.get(b) ?? 0)));
  return [...out, ...inn];
}
