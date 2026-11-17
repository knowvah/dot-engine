// SPDX-License-Identifier: EPL-2.0

/** Shared shapes for the dot/xdot renderer and its agwrite serializer. */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';

/** Accumulated xdot draw strings for one model object (agset side-table). */
export interface XdotDraws {
  draw?: string;
  ldraw?: string;
  hdraw?: string;
  tdraw?: string;
  hldraw?: string;
  tldraw?: string;
}

/** Mutable state threaded through the recursive agwrite serializer. */
export interface SerCtx {
  out: string[];
  /** subgraph → preorder number (write.c:subgdfs). */
  preorder: Map<Graph, number>;
  /** node → preorder of the subgraph it was last written in (node_last_written). */
  nodeLW: Map<Node, number>;
  /** Edges the current body has pended, keyed on `Edge.seq` (AGSEQ), which dedupes as the C's
   *  ordered dictionary does. Empty at the start of every body's node walk.
   *  @see lib/cgraph/write.c:info_t (edges_todo) */
  edgesTodo: Map<number, Edge>;
  /** `Edge.seq` of every edge already written in this agwrite.
   *  @see lib/cgraph/write.c:info_t (edges_done) */
  edgesDone: Set<number>;
  /** objects whose attributes have already been emitted (AGATTRWF/attrs_written). */
  attrsWritten: Set<Node | Edge>;
  /** current indentation depth. */
  level: number;
}
