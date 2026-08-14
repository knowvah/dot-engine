// SPDX-License-Identifier: EPL-2.0

/**
 * Geometry snapshot API — reads computed layout geometry from an
 * internal Graph after ctx.layout() has run, and returns a plain,
 * JSON-serializable snapshot.
 *
 * Coordinate systems
 * ------------------
 * Native graphviz coordinates are y-up (origin at lower-left).
 * Most screen consumers want y-down (origin at upper-left).
 *
 * With the default `yAxis: 'down'`, every y coordinate is flipped:
 *   y' = bbHeight - y
 * where bbHeight = graph bb.ur.y - graph bb.ll.y.
 * The `bounds` origin is normalised to (0, 0) at the top-left corner.
 *
 * With `yAxis: 'up'`, values are returned unchanged (native y-up frame).
 *
 * Units
 * -----
 * The internal model stores node `width` and `height` in inches
 * (matching C ND_width / ND_height in lib/common/types.h).
 * `NodeGeometry.width` and `NodeGeometry.height` are converted to
 * **points** (1 inch = 72 points) before being returned.
 *
 * All other coordinates (x, y, bbox dimensions, spline points,
 * label positions) are in the native graphviz point unit.
 *
 * @see lib/common/types.h
 */

import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';
import type { Edge } from '../model/edge.js';
import type { TextlabelT } from '../common/types.js';
import { RenderError } from '../errors.js';

// ---------------------------------------------------------------------------
// Public coordinate types (canonical home — T5 imports GeometryOptions here)
// ---------------------------------------------------------------------------

/** Coordinate system for returned geometry. */
export type YAxis = 'up' | 'down';

/**
 * Options for {@link getLayout}.
 *
 * @property yAxis - Coordinate direction. Default `'down'` (origin top-left,
 *   y increases downward — screen convention). Use `'up'` to get native
 *   graphviz coordinates (origin bottom-left, y increases upward).
 */
export type GeometryOptions = { yAxis?: YAxis };

/**
 * Overall bounding box of the graph, in points.
 *
 * With `yAxis:'down'`, x and y are 0 (normalised to top-left origin)
 * and width/height are the natural dimensions.
 * With `yAxis:'up'`, x and y match the raw lower-left corner of the
 * graph bounding box.
 */
export interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Per-node geometry extracted after layout, in points.
 *
 * `x` and `y` are the node centre coordinates.
 * `width` and `height` are in **points** (converted from the inches
 * stored on the model: `NodeInfo.width * 72`, `NodeInfo.height * 72`).
 *
 * @see lib/common/types.h:ND_coord, ND_width, ND_height
 */
export interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  /**
   * Node width in **points** (model stores inches; multiplied by 72 here).
   * @see lib/common/types.h:ND_width
   */
  width: number;
  /**
   * Node height in **points** (model stores inches; multiplied by 72 here).
   * @see lib/common/types.h:ND_height
   */
  height: number;
}

/**
 * Per-edge geometry extracted after spline routing, in points.
 *
 * `points` concatenates all bezier control points from the edge spline,
 * in order. An edge with no routed spline produces an empty `points` array.
 * `label` is present only when the edge carries a centre label.
 *
 * `tailLabel`/`headLabel` are the `taillabel`/`headlabel` port labels. They
 * are present only once the layout has actually *placed* them (C `lp->set`),
 * which is the same gate `render()` applies before emitting the `<text>`:
 * a declared port label that place_portlabel skipped (no spline, IGNORED edge
 * type) still holds calloc-zero coordinates, so it is reported as absent
 * rather than as a label at the origin.
 *
 * `sp`/`ep` are the arrow attachment points. When an end carries an arrow the
 * spline is shortened to leave room for it, and the arrow spans from the
 * terminal control point out to this point — so a consumer drawing its own
 * arrowheads reads the tip here instead of extrapolating one. Each is present
 * only when that end actually has an arrow (C `sflag`/`eflag`); with no arrow
 * the field holds the calloc-zero point, which is not geometry.
 *
 * These are the *attachment* points on the node boundary, verbatim from the
 * bezier — with `arrowhead=none` the spline simply ends there. Graphviz's own
 * renderer insets the arrow polygon it draws by a penwidth-dependent amount
 * (measured: ~1.5pt at `penwidth=1`, ~6.2pt at `penwidth=5`), so `ep` is the
 * point to draw an arrow *to*, not a copy of the rendered polygon's tip.
 *
 * @see lib/common/types.h:ED_spl, ED_label, ED_tail_label, ED_head_label
 * @see lib/common/types.h:bezier (sflag/eflag, sp/ep)
 */
export interface EdgeGeometry {
  tail: string;
  head: string;
  /** Bezier control points for the edge spline, in points. */
  points: { x: number; y: number }[];
  /**
   * Arrow attachment point at the tail end, if that end carries an arrow.
   * @see lib/common/types.h:bezier.sp
   */
  sp?: { x: number; y: number };
  /**
   * Arrow attachment point at the head end, if that end carries an arrow.
   * @see lib/common/types.h:bezier.ep
   */
  ep?: { x: number; y: number };
  /** Centre edge label position, if present. @see lib/common/types.h:ED_label */
  label?: { x: number; y: number };
  /**
   * `taillabel` position, if placed.
   * @see lib/common/types.h:ED_tail_label
   */
  tailLabel?: { x: number; y: number };
  /**
   * `headlabel` position, if placed.
   * @see lib/common/types.h:ED_head_label
   */
  headLabel?: { x: number; y: number };
}

/**
 * Per-cluster geometry extracted after layout, in points.
 *
 * `name` is the cluster subgraph's name (e.g. `cluster6`); for nested
 * clusters the name encodes the hierarchy, so no explicit parent link is
 * exposed. `x`/`y`/`width`/`height` describe the cluster's bounding box,
 * following the same frame convention as {@link BoundsGeometry}: with
 * `yAxis:'down'` (x, y) is the top-left corner; with `yAxis:'up'` (x, y) is
 * the lower-left corner (native graphviz frame). These are the raw box
 * corners graphviz computed — the same values `render()` rounds to emit the
 * `class="cluster"` polygon, so a consumer quantizing to SVG precision gets
 * byte-conformant geometry.
 *
 * `label` is the cluster title's placed position and measured size, present
 * only when the cluster declares a label. Unlike the edge port labels, it is
 * *not* gated on the label's `set` flag: C draws a cluster label on existence
 * alone (emit.c:3920 has no `->set` test, unlike emit_edge_label:2891), so an
 * unplaced one still renders at whatever pos it holds. Gating here would hide
 * geometry `render()` acts on.
 *
 * @see lib/common/types.h:GD_bb (of a cluster subgraph)
 * @see lib/common/types.h:GD_label (textlabel_t.pos / .dimen)
 */
export interface ClusterGeometry {
  /** Cluster subgraph name (e.g. `cluster6`); encodes nesting. */
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Cluster label placement, if the cluster has one. `x`/`y` are the **centre**
   * of the label space (matching `EdgeGeometry.label`, not the box corner
   * `x`/`y` above); `width`/`height` are its measured size.
   * @see lib/common/postproc.c:place_graph_label
   */
  label?: { x: number; y: number; width: number; height: number };
}

/**
 * Plain, JSON-serializable snapshot of the graph's computed geometry.
 *
 * `clusters` lists every cluster subgraph (recursively, nested clusters each
 * get their own entry) with a computed bounding box; it is empty for graphs
 * without clusters.
 *
 * @see lib/common/types.h:GD_bb, ND_coord, ED_spl, GD_clust
 */
export interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Points per inch — matches graphviz's DPI constant. @see lib/common/geom.h */
const INCHES_TO_POINTS = 72;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a y-flip function bound to a specific graph bounding-box height. */
function makeFlipY(bbHeight: number, yAxis: YAxis): (y: number) => number {
  if (yAxis === 'up') return (y) => y;
  return (y) => bbHeight - y;
}

/**
 * Snapshot one node's geometry.
 * @see lib/common/types.h:ND_coord, ND_width, ND_height
 */
function snapshotNode(node: Node, flipY: (y: number) => number): NodeGeometry {
  const coord = node.info.coord;
  return {
    name: node.name,
    x: coord.x,
    y: flipY(coord.y),
    width: node.info.width * INCHES_TO_POINTS,
    height: node.info.height * INCHES_TO_POINTS,
  };
}

/**
 * Collect bezier control points from an edge's spline.
 * Uses `.size` (not `.list.length`) because C over-allocates `list`
 * and `size` holds the actual count after clip_and_install.
 * @see lib/common/splines.c:clip_and_install
 */
function collectEdgePoints(
  edge: Edge,
  flipY: (y: number) => number,
): { x: number; y: number }[] {
  const spl = edge.info.spl;
  if (spl === undefined) return [];
  const pts: { x: number; y: number }[] = [];
  for (const bz of spl.list) {
    for (let k = 0; k < bz.size; k++) {
      const pt = bz.list[k];
      pts.push({ x: pt.x, y: flipY(pt.y) });
    }
  }
  return pts;
}

/**
 * Position of a port label that layout actually placed, else undefined.
 * `set` is C's own "this label has coordinates" flag, and the gate
 * emit_edge_label uses before drawing; an unplaced label still holds the
 * calloc-zero pos and must not be published as geometry.
 * @see lib/common/splines.c:place_portlabel (l->set = TRUE)
 * @see lib/common/emit.c:emit_edge_label (lbl == NULL || !lbl->set)
 */
function placedLabelPos(
  lbl: TextlabelT | undefined,
  flipY: (y: number) => number,
): { x: number; y: number } | undefined {
  if (lbl === undefined || !lbl.set) return undefined;
  return { x: lbl.pos.x, y: flipY(lbl.pos.y) };
}

/**
 * Arrow attachment points, one per end that actually carries an arrow.
 * C keeps `sp`/`ep` beside the control points and gates them on
 * `sflag`/`eflag`; with no arrow at that end the flag is 0 and the point is
 * still calloc-zero, so an ungated read would publish (0, 0) as geometry.
 * Indexes the bezier array by `spl.size` (not `list.length`), matching C.
 * @see lib/common/types.h:bezier
 * @see lib/common/postproc.c:endPoints
 */
function arrowAttachPoints(
  edge: Edge,
  flipY: (y: number) => number,
): { sp?: { x: number; y: number }; ep?: { x: number; y: number } } {
  const spl = edge.info.spl;
  if (spl === undefined || spl.size === 0) return {};
  const out: { sp?: { x: number; y: number }; ep?: { x: number; y: number } } = {};
  const first = spl.list[0];
  if (first.sflag !== 0) out.sp = { x: first.sp.x, y: flipY(first.sp.y) };
  const last = spl.list[spl.size - 1];
  if (last.eflag !== 0) out.ep = { x: last.ep.x, y: flipY(last.ep.y) };
  return out;
}

/**
 * Snapshot one edge's geometry.
 * @see lib/common/types.h:ED_spl, ED_label, ED_tail_label, ED_head_label
 *   (textlabel_t.pos), bezier.sp/ep
 */
function snapshotEdge(edge: Edge, flipY: (y: number) => number): EdgeGeometry {
  const geom: EdgeGeometry = {
    tail: edge.tail.name,
    head: edge.head.name,
    points: collectEdgePoints(edge, flipY),
  };
  const lbl = edge.info.label;
  if (lbl !== undefined) {
    geom.label = { x: lbl.pos.x, y: flipY(lbl.pos.y) };
  }
  const tailLabel = placedLabelPos(edge.info.tail_label, flipY);
  if (tailLabel !== undefined) geom.tailLabel = tailLabel;
  const headLabel = placedLabelPos(edge.info.head_label, flipY);
  if (headLabel !== undefined) geom.headLabel = headLabel;
  const { sp, ep } = arrowAttachPoints(edge, flipY);
  if (sp !== undefined) geom.sp = sp;
  if (ep !== undefined) geom.ep = ep;
  return geom;
}

/**
 * Snapshot one cluster's bounding box, in the requested frame.
 *
 * Mirrors the {@link BoundsGeometry} convention: `yAxis:'up'` returns the
 * native lower-left corner (ll); `yAxis:'down'` returns the top-left corner
 * (ll.x, flipped ur.y). `width`/`height` are frame-independent (ur - ll).
 *
 * The label rides in the same call because place_graph_label runs on the same
 * layout pass that fills GD_bb; `pos` is the centre of the label space, so it
 * flips like any other coordinate rather than like the box corner.
 *
 * @see lib/common/types.h:GD_bb (cluster subgraph)
 * @see lib/common/postproc.c:place_graph_label
 */
function snapshotCluster(
  sg: Graph, yAxis: YAxis, flipY: (y: number) => number,
): ClusterGeometry {
  const bb = sg.info.bb;
  const geom: ClusterGeometry = {
    name: sg.name,
    x: bb.ll.x,
    // 'up' keeps the lower-left y; 'down' flips the upper-right y to the
    // top-left of the box (flipY is monotonic-decreasing there).
    y: yAxis === 'up' ? bb.ll.y : flipY(bb.ur.y),
    width: bb.ur.x - bb.ll.x,
    height: bb.ur.y - bb.ll.y,
  };
  const lab = sg.info.label as TextlabelT | undefined;
  if (lab !== undefined) {
    geom.label = {
      x: lab.pos.x,
      y: flipY(lab.pos.y),
      width: lab.dimen.x,
      height: lab.dimen.y,
    };
  }
  return geom;
}

/**
 * Collect every cluster subgraph (depth-first, nested clusters included).
 * C stores clusters 1-indexed in GD_clust; the TS model exposes a 0-indexed
 * `info.clust` array on each (sub)graph. A cluster without a computed bb
 * (never laid out) is skipped.
 * @see lib/common/types.h:GD_clust, GD_n_cluster
 */
function collectClusters(
  sg: Graph, yAxis: YAxis, flipY: (y: number) => number,
  out: ClusterGeometry[],
): void {
  for (const c of sg.info.clust ?? []) {
    if (c.info.bb !== undefined) out.push(snapshotCluster(c, yAxis, flipY));
    collectClusters(c, yAxis, flipY, out);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a plain, JSON-serializable snapshot of the computed geometry for
 * all nodes and edges in graph `g`.
 *
 * Must be called **after** `ctx.layout(g, engine)` (or `render`) has run.
 * Before layout the geometry fields hold calloc-zero defaults (every node at
 * the origin, an empty bounding box), so a not-yet-laid-out graph is rejected
 * with a `RenderError` rather than returning that all-zero snapshot as if it
 * were real geometry.
 *
 * @param g    - Laid-out graph (internal model; not mutated by this function).
 * @param opts - Coordinate options; defaults to `{ yAxis: 'down' }`.
 * @throws RenderError if `g` has not been laid out.
 *
 * @see lib/common/types.h:GD_bb, ND_coord, ED_spl
 */
export function getLayout(g: Graph, opts?: GeometryOptions): LayoutSnapshot {
  if (g.info?.laidOut !== true) {
    throw new RenderError(
      'getLayout requires a laid-out graph; run ctx.layout(g, engine) or render() first',
      'GENERIC_ERROR',
    );
  }
  const yAxis: YAxis = opts?.yAxis ?? 'down';
  const bb = g.info.bb;
  const bbWidth = bb.ur.x - bb.ll.x;
  const bbHeight = bb.ur.y - bb.ll.y;
  const flipY = makeFlipY(bbHeight, yAxis);

  const bounds: BoundsGeometry = yAxis === 'down'
    ? { x: 0, y: 0, width: bbWidth, height: bbHeight }
    : { x: bb.ll.x, y: bb.ll.y, width: bbWidth, height: bbHeight };

  const nodes = Array.from(g.nodes.values()).map((n) => snapshotNode(n, flipY));
  const edges = g.edges.map((e) => snapshotEdge(e, flipY));
  const clusters: ClusterGeometry[] = [];
  collectClusters(g, yAxis, flipY, clusters);

  return { bounds, nodes, edges, clusters };
}
