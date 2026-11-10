// SPDX-License-Identifier: EPL-2.0

/**
 * TypeScript port of lib/dotgen/dotinit.c — initialisation helpers for
 * the dot layout pipeline (dot_init_node, dot_init_edge, dot_init_subg,
 * dot_init_node_edge, removeFill, dot_cleanup).
 *
 * @see lib/dotgen/dotinit.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { commonInitNode, lateInt } from '../../common/nodeinit.js';
import { nonconstraintEdge } from './classify.js';
import { nodeAttr } from '../../common/poly-init.js';
import { NORMAL, deleteFastNode, removeFromRank } from './fastgr.js';
import { mapbool } from './rank.js';
import { initEdgeLabels } from '../../common/edge-label-init.js';
import { graphInit } from '../../common/graph-init.js';
import { agsubg, agdelnode, agdelsubg } from '../../model/cgraph-ops.js';
import { nodesInSeq } from './decomp.js';

// ---------------------------------------------------------------------------
// RANKDIR constants — re-exported from the shared graph_init port, which owns
// them (they are const.h values, not dot's). Kept exported here so the existing
// importers (postproc, compass-port, splines-flat, …) do not have to churn.
// @see lib/common/const.h RANKDIR_TB/LR/BT/RL
// ---------------------------------------------------------------------------

export { RANKDIR_TB, RANKDIR_LR, RANKDIR_BT, RANKDIR_RL } from '../../common/graph-init.js';

// ---------------------------------------------------------------------------
// dotGraphInit — dot's binding of the shared graph_init
// @see lib/common/input.c:600 graph_init
// @see lib/dotgen/dotinit.c:352 initSubg (GD_rankdir2 propagation)
// ---------------------------------------------------------------------------

/**
 * dot's call into the engine-agnostic `graph_init`, plus the one piece of
 * rankdir handling that is genuinely dot's: propagating GD_rankdir2 down to the
 * clusters (C does this in dot's own `initSubg`, dotinit.c:352 — NOT in
 * graph_init).
 *
 * dot is the only engine with `LAYOUT_USES_RANKDIR`
 * (plugin/dot_layout/gvlayout_dot_layout.c:27), hence `useRankdir = true`: the
 * effective rankdir (bits 0-1) tracks the attr instead of being pinned to TB.
 *
 * @see lib/common/input.c:600 graph_init
 * @see lib/gvc/gvlayout.c:81 (graph_init(g, LAYOUT_USES_RANKDIR))
 * @see lib/dotgen/dotinit.c:352 initSubg
 */
export function dotGraphInit(g: Graph): void {
  graphInit(g, true);
  initSubgraphRankdir(g);
}

/**
 * Recursively propagate the root graph's rankdir2 to all subgraphs.
 * @see lib/dotgen/dotinit.c:352
 */
function initSubgraphRankdir(g: Graph): void {
  const nc = g.info.n_cluster ?? 0;
  const clust = g.info.clust;
  for (let c = 1; c <= nc; c++) {
    if (clust && clust[c - 1]) {
      const sg = clust[c - 1];
      sg.info.rankdir = g.info.rankdir;
      sg.info.flip = g.info.flip;
      initSubgraphRankdir(sg);
    }
  }
}

// ---------------------------------------------------------------------------
// CL_CROSS — cost of cluster skeleton edge crossing
// @see lib/common/const.h:CL_CROSS
// ---------------------------------------------------------------------------

/**
 * Crossing penalty for cluster-skeleton / same-group edges.
 * C uses 1000 except under _WIN32, where 100 avoids a 16-bit overflow.
 * The oracle platform (and every modern build) takes the 1000 branch;
 * mincross best-order selection on penalty plateaus depends on it.
 * @see lib/common/const.h:CL_CROSS
 */
export const CL_CROSS = 1000;

// ---------------------------------------------------------------------------
// dotInitNode
// ---------------------------------------------------------------------------

/**
 * Initialises per-node layout data for the dot engine.
 * Mirrors dot_init_node: binds Agnodeinfo_t and allocates edge lists.
 *
 * @see lib/dotgen/dotinit.c:dot_init_node
 */
export function dotInitNode(n: Node): void {
  n.info.UF_size = 1;
  n.info.in       = { list: [], size: 0 };
  n.info.out      = { list: [], size: 0 };
  n.info.flat_in  = { list: [], size: 0 };
  n.info.flat_out = { list: [], size: 0 };
  n.info.other    = { list: [], size: 0 };
  // Default lw = rw = 0.75in/2 × 72 = 27 pts; ht = 0.5in × 72 = 36 pts. C's
  // dot_init_node has no such fallback (gv_nodesize always sets a size); this is
  // only a guard for a node that reached here UNSIZED. Test `=== undefined`, not
  // falsiness, so a legitimately-computed 0 (shape=plain) is not clobbered.
  if (n.info.lw === undefined) n.info.lw = 27;
  if (n.info.rw === undefined) n.info.rw = 27;
  if (n.info.ht === undefined) n.info.ht = 36;
  // Mark as a real (NORMAL) node so firstNormalNode() can find it.
  n.info.node_type = NORMAL;
}

// ---------------------------------------------------------------------------
// dotInitEdge
// ---------------------------------------------------------------------------

/**
 * Which of dot_init_edge's attribute symbols are bound. C reads `constraint`,
 * `minlen` and `group` through the globals E_constr, E_minlen and N_group
 * (bound per graph by graph_init). make_flat_adj_edges' setState nulls all
 * three for the aux layout and cleanupCloneGraph restores them, so an aux
 * edge's copied `constraint=false` or `minlen`, and its clones' `group`, are
 * never read: late_int(e, NULL, 1, 0) is 1 and late_string(n, NULL, "") "".
 * @see lib/common/input.c:graph_init (E_constr, E_minlen, N_group)
 * @see lib/dotgen/dotsplines.c:setState, cleanupCloneGraph
 */
export interface InitEdgeSyms {
  readonly constr: boolean;
  readonly minlen: boolean;
  readonly group: boolean;
}

/** The main graph's symbols, as graph_init binds them. */
export const DOT_INIT_SYMS: InitEdgeSyms = { constr: true, minlen: true, group: true };

/** The flat-adj aux graph's symbols. @see lib/dotgen/dotsplines.c:setState */
export const AUX_INIT_SYMS: InitEdgeSyms = { constr: false, minlen: false, group: false };

/**
 * True when tail and head carry the same non-empty `group` attribute.
 * C compares interned refstr pointers (`tailgroup == headgroup`); cgraph's
 * per-graph string pool makes that exactly content equality, and the
 * `tailgroup[0]` guard excludes the shared "" default.
 * @see lib/dotgen/dotinit.c:dot_init_edge (tailgroup/headgroup check)
 */
export function sameNonemptyGroup(e: Edge, syms: InitEdgeSyms = DOT_INIT_SYMS): boolean {
  if (!syms.group) return false;
  const tailgroup = nodeAttr(e.tail, e.tail.root, 'group') ?? '';
  const headgroup = nodeAttr(e.head, e.head.root, 'group') ?? '';
  return tailgroup !== '' && tailgroup === headgroup;
}

/**
 * Reads the `constraint` edge attr and stores the parsed boolean on e.info.
 * Absent or empty attr leaves e.info.constraint unchanged (C: constr[0] guard).
 * @see lib/dotgen/rank.c:is_nonconstraint
 * @see lib/common/utils.c:mapbool
 */
function initEdgeConstraint(e: Edge): void {
  const s = e.attrs.get('constraint');
  if (s !== undefined && s !== '') e.info.constraint = mapbool(s);
}

/**
 * Applies the same-group penalty to xpenalty and weight.
 * @see lib/dotgen/dotinit.c:dot_init_edge (tailgroup/headgroup block)
 */
function applyGroupPenalty(e: Edge, syms: InitEdgeSyms): void {
  if (!sameNonemptyGroup(e, syms)) return;
  e.info.xpenalty = CL_CROSS;
  e.info.weight = (e.info.weight ?? 1) * 100;
}

/**
 * Zeroes xpenalty and weight when the edge is a non-constraint edge.
 * @see lib/dotgen/dotinit.c:dot_init_edge:73-76
 */
function applyNonconstraintZero(e: Edge): void {
  if (!nonconstraintEdge(e)) return;
  e.info.xpenalty = 0;
  e.info.weight = 0;
}

/**
 * Initialises per-edge layout data for the dot engine.
 * Mirrors dot_init_edge: sets weight, count, xpenalty, minlen.
 *
 * @see lib/dotgen/dotinit.c:dot_init_edge
 */
export function dotInitEdge(e: Edge, syms: InitEdgeSyms = DOT_INIT_SYMS): void {
  if (syms.constr) initEdgeConstraint(e);
  // C: ED_weight(e) = late_int(e, E_weight, 1, 0), the attribute only, on an aux
  // edge too: make_flat_adj_edges writes its 10000 with agxset. The group and
  // nonconstraint adjustments below then apply on top, matching C's order.
  // @see lib/dotgen/dotinit.c:65
  e.info.weight = lateInt(e.attrs.get('weight'), 1, 0);
  e.info.count = 1;
  e.info.xpenalty = 1;
  applyGroupPenalty(e, syms);
  applyNonconstraintZero(e);
  // late_int semantics: default 1, minimum 0; an unbound E_minlen gives 1.
  // @see lib/dotgen/dotinit.c:85  ED_minlen(e) = late_int(e, E_minlen, 1, 0)
  e.info.minlen = lateInt(syms.minlen ? e.attrs.get('minlen') : undefined, 1, 0);
  // samehead / sametail group ids for shared-port merging. C reads these via
  // agxget(e, E_samehead/E_sametail) in dot_sameports and treats an empty
  // string (id[0] == '\0') as "no group". Without populating these, the ported
  // dotSameports (wired in index.ts) never fires and same-* edges route to the
  // node center instead of a merged port. @see lib/dotgen/sameport.c:dot_sameports
  const sh = e.attrs.get('samehead');
  e.info.samehead = sh ? sh : undefined;
  const st = e.attrs.get('sametail');
  e.info.sametail = st ? st : undefined;
}

// ---------------------------------------------------------------------------
// dotInitSubg
// ---------------------------------------------------------------------------

/**
 * Recursively initialises subgraph-level attributes with defaults.
 * Mirrors dot_init_subg: binds Agraphinfo_t and propagates params.
 *
 * nodesep defaults: 0.25 in × 72 = 18 pts; ranksep: 0.5 in × 72 = 36 pts.
 *
 * @see lib/dotgen/dotinit.c:dot_init_subg
 */
export function dotInitSubg(g: Graph): void {
  if (g.info.nodesep === undefined) g.info.nodesep = 18;
  if (g.info.ranksep === undefined) g.info.ranksep = 36;
  const nc = g.info.n_cluster ?? 0;
  const clust = g.info.clust;
  for (let c = 1; c <= nc; c++) {
    if (clust && clust[c - 1]) dotInitSubg(clust[c - 1]);
  }
}

// ---------------------------------------------------------------------------
// dotInitNodeEdge
// ---------------------------------------------------------------------------

/**
 * Drops a node's fast-graph lists, as dot_cleanup frees them.
 * @see lib/dotgen/dotinit.c:dot_cleanup_node (free_list)
 */
function clearFastGraphLists(n: Node): void {
  n.info.in       = undefined;
  n.info.out      = undefined;
  n.info.flat_in  = undefined;
  n.info.flat_out = undefined;
  n.info.other    = undefined;
}

/**
 * Calls commonInitNode (shape-aware, label-driven sizing) then
 * dotInitNode for every node, then dotInitEdge for every edge. `syms` stands
 * for the global symbol state C's dot_init_edge reads (AUX_INIT_SYMS inside
 * make_flat_adj_edges).
 *
 * @see lib/dotgen/dotinit.c:dot_init_node_edge
 * @see lib/dotgen/dotinit.c:dot_init_node (common_init_node + gv_nodesize)
 */
export function dotInitNodeEdge(g: Graph, syms: InitEdgeSyms = DOT_INIT_SYMS): void {
  for (const n of nodesInSeq(g)) {
    commonInitNode(n, g);
    dotInitNode(n);
  }
  const measurer = g.root.info.gvc?.textMeasurer;
  for (const e of g.edges) {
    dotInitEdge(e, syms);
    if (measurer) initEdgeLabels(e, g, measurer);
  }
}

// ---------------------------------------------------------------------------
// removeFill
// ---------------------------------------------------------------------------

/**
 * Deletes the placeholder fill-nodes inserted by fillRanks (NEW_RANK mode)
 * once positioning is done, so they never render. Looks up the `_new_rank`
 * subgraph under the root graph; if absent (the common no-newrank case) this
 * is a no-op. Operates on `g.root` throughout because fillRanks created the
 * fill nodes and their ranks under the root.
 *
 * @see lib/dotgen/dotinit.c:removeFill
 */
export function removeFill(g: Graph): void {
  const sg = agsubg(g.root, '_new_rank', false);
  if (sg === null) return;
  // Snapshot first: agdelnode mutates membership (including sg) during the
  // loop. C's nxt = agnxtnode look-ahead tolerates deleting the current node;
  // the snapshot is its faithful equivalent.
  const fillNodes = nodesInSeq(sg);
  for (const n of fillNodes) {
    deleteFastNode(g.root, n);
    removeFromRank(g.root, n);
    // dot_cleanup_node has no equivalent in this port (GC reclaims the node).
    agdelnode(g.root, n);
  }
  agdelsubg(g.root, sg);
}

// ---------------------------------------------------------------------------
// dotCleanup
// ---------------------------------------------------------------------------

/**
 * Clears all edge lists and linked-list pointers from nodes in the fast-graph,
 * releasing layout state without destroying the underlying graph structure.
 *
 * Mirrors dot_cleanup: frees virtual node list then per-node edge lists.
 *
 * @see lib/dotgen/dotinit.c:dot_cleanup
 */
export function dotCleanup(g: Graph): void {
  // gv_cleanup_edge, dot_cleanup_node, dot_cleanup_graph: labels go at the next
  // layout (layout-reset.ts).
  let n: Node | undefined = g.info.nlist;
  while (n !== undefined) {
    const next: Node | undefined = n.info.next;
    clearFastGraphLists(n);
    n.info.next     = undefined;
    n.info.prev     = undefined;
    n = next;
  }
  g.info.nlist = undefined;
}
