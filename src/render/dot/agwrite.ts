// SPDX-License-Identifier: EPL-2.0

/**
 * The agwrite serializer — write.c's graph/subgraph/node/edge emission, shared
 * verbatim by `-Tdot` and `-Txdot`.
 *
 * Split out of dot.ts as an abstract base rather than a collaborator so every
 * method body moves UNCHANGED: the serializer reads only three things from the
 * renderer (`emitDraws`, `clusters`, `drawsOf`), which are declared abstract
 * here and supplied by XdotRenderer. Keeping the bodies byte-identical matters
 * more than the inheritance being fashionable — this is ported C, and a
 * mechanical move is auditable against write.c in a way a rewrite is not.
 *
 * @see lib/cgraph/write.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { TextlabelT, FieldT, ShapeDesc } from '../../common/types.js';
import { agstrcanon } from '../map.js';
import { XDOT_VERSION, agcanonEscape, gfmt5, lpStr, xdotId } from './xdot-ops.js';
import {
  COMPUTED_EDGE_ATTRS, COMPUTED_NODE_ATTRS, appendRecordRects, computedPart, dictParts,
  echoAttr, echoGraphAttr, edgeAttrsAttached, edgeConnector, edgePosRaw,
  effectiveEdgeDefaults, effectiveNodeDefaults, graphInputParts, graphLabelAttrs,
  isDirected, nodeDictParts, nodeRecord, objInputParts,
} from './attrs.js';
import type { XdotDraws, SerCtx } from './types.js';

/** write.c's serializer half of the dot/xdot renderer. @see lib/cgraph/write.c */
export abstract class DotWriterBase {
  /** @see dot.ts XdotRenderer.emitDraws */
  protected abstract readonly emitDraws: boolean;
  /** Clusters in render order (GD_clust); filled by the renderer's endCluster. */
  protected clusters: Graph[] = [];
  /** Draw strings for `obj`, or undefined in a format that emits none. */
  protected abstract drawsOf(obj: Node | Edge | Graph): XdotDraws | undefined;

  /**
   * Emit `key="value"`, escaping the value the way agwrite's agcanonStr does: a
   * `"` becomes `\"` unless it is already part of an escape sequence (see
   * agcanonEscape). A draw string carries label text that may contain a bare `"`
   * (would close the attribute early) or a source `\"`/`\\` (must not be
   * double-escaped). The byte-length prefix stays on the UNescaped text (the
   * parser un-escapes before parseXDot re-reads it), matching native exactly.
   * @see lib/cgraph/write.c:_agstrcanon (135-167)
   */
  private drawAttr(key: string, value: string): string {
    return key + '="' + agcanonEscape(value) + '"';
  }

  /** `llx,lly,urx,ury` from a graph's layout bb. */
  private bbStr(g: Graph): string {
    const bb = g.info.bb;
    return gfmt5(bb.ll.x) + ',' + gfmt5(bb.ll.y) + ',' +
      gfmt5(bb.ur.x) + ',' + gfmt5(bb.ur.y);
  }

  /**
   * Serialize the whole laid-out graph to xdot DOT text — a faithful port of
   * cgraph's agwrite (lib/cgraph/write.c). Recurses the subgraph tree
   * (write_subgs/write_body), scoping each node/edge to the subgraph(s) it
   * belongs to via preorder numbers (write_node_test/write_edge_test), and
   * re-emits an object bare (no attrs) on any scope after the first
   * (attrs_written). This reproduces native's per-subgraph edge re-declarations
   * — e.g. an edge in a rank=same subgraph is drawn once, then re-declared bare.
   * @see lib/cgraph/write.c:agwrite
   */
  protected serialize(g: Graph): string {
    const ctx: SerCtx = {
      out: [],
      preorder: new Map<Graph, number>(),
      nodeLW: new Map<Node, number>(),
      edgeLW: new Map<Edge, number>(),
      attrsWritten: new Set<Node | Edge>(),
      level: 0,
    };
    this.subgdfs(g, 1, ctx.preorder);
    this.writeHdr(g, true, ctx);
    this.writeBody(g, ctx);
    this.writeTrl(ctx);
    return ctx.out.join('');
  }

  /** Preorder-number the subgraph tree. @see write.c:subgdfs */
  private subgdfs(g: Graph, ix: number, preorder: Map<Graph, number>): number {
    let ix0 = ix;
    preorder.set(g, ix0);
    for (const sub of g.subgraphs.values()) ix0 = this.subgdfs(sub, ix0, preorder);
    return ix0 + 1;
  }

  /** A subgraph is anonymous when its name is empty or a `%N` local name. */
  private isAnonymous(g: Graph): boolean {
    return g.name.length === 0 || g.name.charCodeAt(0) === 0x25 /* % */;
  }

  /** A graph carries a `bb` attribute when it is the root or has a layout bb
   *  (clusters, and any subgraph output.c computed a box for). Native seeds `bb`
   *  on every graph via safe_dcl, so the value differs (set vs empty "") between
   *  a boxed graph and an unboxed child — the driver that makes an anon subgraph
   *  under the root or a cluster "relevant". @see lib/common/output.c:safe_dcl */
  private hasBb(g: Graph): boolean {
    return g === g.root || this.clusters.includes(g);
  }

  /** Anonymous subgraph with no own node/edge defaults and no graph attrs
   *  differing from its parent → inlined into the parent. Native compares every
   *  graph attr over the root attr dict; the load-bearing ones are `bb` (set on
   *  the parent, empty on the child) and `rank`. @see write.c:irrelevant_subgraph */
  private irrelevantSubgraph(g: Graph): boolean {
    if (!this.isAnonymous(g)) return false;
    if (this.clusters.includes(g)) return false;
    if (g.nodeDefaults.size > 0 || g.edgeDefaults.size > 0) return false;
    if (g.parent) {
      if (this.hasBb(g) !== this.hasBb(g.parent)) return false;
      for (const [k, v] of g.attrs) {
        if (g.parent.attrs.get(k) !== v) return false;
      }
    } else if (g.attrs.size > 0) {
      return false;
    }
    return true;
  }

  /** Non-draw graph attrs a subgraph emits (rank for rank=same; clusters use
   *  clusterAttrs). Only comparator-relevant fields need be exact.
   *
   *  `rec_attach_bb` walks the ROOT and then `GD_clust` recursively, so a
   *  subgraph the layout did not box is attached NEITHER `bb` NOR the label
   *  triple — both keep the INPUT's values, which agwrite echoes. circo and
   *  twopi lay out no clusters at all (`GD_clust` empty — mirrored here by
   *  `this.clusters`, filled from endCluster), so on a re-fed dot output their
   *  `cluster0` comes back carrying the *previous* run's `bb` and `lp`.
   *  @see lib/common/output.c:249 rec_attach_bb */
  private subgGraphAttrs(sg: Graph): string[] {
    // `rank` is not special-cased here: it is an ordinary input attribute and
    // graphInputParts echoes it, on clusters as well as plain subgraphs.
    const parts: string[] = [];
    parts.push(...echoGraphAttr(sg, 'bb'));
    parts.push(...graphLabelAttrs(sg));
    parts.push(...graphInputParts(sg, false));
    return parts;
  }

  private indent(ctx: SerCtx): string {
    return '\t'.repeat(ctx.level);
  }

  /** @see write.c:write_hdr */
  private writeHdr(g: Graph, top: boolean, ctx: SerCtx): void {
    if (top) {
      const strict = g.kind === 'strict-directed' || g.kind === 'strict-undirected' ? 'strict ' : '';
      const kw = isDirected(g) ? 'digraph' : 'graph';
      const nm = g.name.length > 0 && !this.isAnonymous(g) ? xdotId(g.name) + ' ' : '';
      ctx.out.push(strict + kw + ' ' + nm + '{\n');
      ctx.level++;
    } else {
      const nm = this.isAnonymous(g) ? '' : 'subgraph ' + xdotId(g.name) + ' ';
      ctx.out.push(this.indent(ctx) + nm + '{\n');
      ctx.level++;
    }
    this.writeDicts(g, top, ctx);
  }

  /**
   * Emit this scope's `graph` / `node` / `edge` default statements, in that
   * order. @see lib/cgraph/write.c:307 write_dicts
   */
  private writeDicts(g: Graph, top: boolean, ctx: SerCtx): void {
    const graphParts = top
      ? this.graphAttrs(g)
      : this.clusters.includes(g)
        ? this.clusterAttrs(g)
        : this.subgGraphAttrs(g);
    this.writeDict('graph', graphParts, ctx);
    this.writeDict('node', nodeDictParts(g, top), ctx);
    this.writeDict('edge', dictParts(g.edgeDefaults), ctx);
  }

  /**
   * One `<name> [...]` default statement. Entries are emitted in **strcmp order
   * of attribute name**: cgraph's attribute dicts are `Dttree`s keyed on
   * `Agsym_t.name` with a NULL comparf (attr.c:34), so `dtfirst`/`dtnext` walk
   * them sorted — the oracle's `graph [bb, rankdir]` and `[height, pos, width]`.
   *
   * Layout mirrors write_dict exactly: a single entry stays on one line, and two
   * or more break after each `,` with the body indented one level deeper and the
   * closing `];` back at the statement's own level.
   *
   * Not ported: the `EMPTY(defval) && !sym->print` skip (write.c:271-280). Every
   * entry here was explicitly declared or computed, i.e. `print` is set, so that
   * branch is unreachable until the eager-propagation artifact lands — an
   * `agapply`-installed empty default is the only `print == false` producer.
   *
   * @see lib/cgraph/write.c:262 write_dict
   */
  private writeDict(name: string, parts: string[], ctx: SerCtx): void {
    if (parts.length === 0) return;
    const sorted = [...parts].sort((a, b) => {
      const ka = a.slice(0, a.indexOf('='));
      const kb = b.slice(0, b.indexOf('='));
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    ctx.out.push(this.indent(ctx) + name + ' [');
    ctx.level++;
    ctx.out.push(sorted.join(',\n' + this.indent(ctx)));
    ctx.level--;
    if (sorted.length > 1) ctx.out.push('\n' + this.indent(ctx));
    ctx.out.push('];\n');
  }

  /**
   * One object's `[...]` attribute block, or '' when it has no attributes.
   * Entries sort strcmp like every dict (attr.c:34). Layout is
   * write_nondefault_attrs, which differs from write_dict in two ways: the block
   * opens with a literal TAB before `[`, and the closing `]` follows the last
   * value directly — there is no newline+indent before it.
   * @see lib/cgraph/write.c:471 write_nondefault_attrs
   */
  private objAttrBlock(parts: string[], ctx: SerCtx): string {
    if (parts.length === 0) return '';
    const sorted = [...parts].sort((a, b) => {
      const ka = a.slice(0, a.indexOf('='));
      const kb = b.slice(0, b.indexOf('='));
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    ctx.level++;
    const body = sorted.join(',\n' + this.indent(ctx));
    ctx.level--;
    return '\t[' + body + ']';
  }

  /** @see write.c:write_trl */
  private writeTrl(ctx: SerCtx): void {
    ctx.level--;
    ctx.out.push(this.indent(ctx) + '}\n');
  }

  /** @see write.c:write_subgs */
  private writeSubgs(g: Graph, ctx: SerCtx): void {
    for (const sub of g.subgraphs.values()) {
      if (this.irrelevantSubgraph(sub)) {
        this.writeSubgs(sub, ctx);
      } else {
        this.writeHdr(sub, false, ctx);
        this.writeBody(sub, ctx);
        this.writeTrl(ctx);
      }
    }
  }

  /** @see write.c:write_body — subgraphs, then this scope's nodes and edges. */
  private writeBody(g: Graph, ctx: SerCtx): void {
    this.writeSubgs(g, ctx);
    for (const n of g.nodes.values()) {
      if (this.writeNodeTest(g, n, ctx)) this.writeNode(g, n, ctx);
      let prev: Node = n;
      for (const e of n.outEdges(g)) {
        if (prev !== e.head && this.writeNodeTest(g, e.head, ctx)) {
          this.writeNode(g, e.head, ctx);
          prev = e.head;
        }
        if (this.writeEdgeTest(g, e, ctx)) this.writeEdge(g, e, ctx);
      }
    }
  }

  /** @see write.c:write_node_test — every xdot node carries pos/size, so it is
   *  never "default"; write it in the first scope that has not yet emitted it.
   *  Cluster nodes (fdp compound proxies, ND_clustnode) are never declared —
   *  C's write_plain/writenodeandport suppress them. @see lib/common/output.c:146 */
  private writeNodeTest(g: Graph, n: Node, ctx: SerCtx): boolean {
    if (n.info.clustnode) return false;
    return (ctx.nodeLW.get(n) ?? 0) < ctx.preorder.get(g)!;
  }

  /** Emitted node name: a cluster node's synthetic `__i:<cluster>` id is written
   *  as the cluster name it stands for. @see lib/common/output.c:114 */
  private emitNodeName(n: Node): string {
    if (n.info.clustnode) {
      const i = n.name.indexOf(':');
      if (i >= 0) return n.name.slice(i + 1);
    }
    return n.name;
  }

  /** @see write.c:write_edge_test */
  private writeEdgeTest(g: Graph, e: Edge, ctx: SerCtx): boolean {
    return (ctx.edgeLW.get(e) ?? 0) < ctx.preorder.get(g)!;
  }

  /** @see write.c:write_node */
  private writeNode(g: Graph, n: Node, ctx: SerCtx): void {
    let s = this.indent(ctx) + xdotId(this.emitNodeName(n));
    if (!ctx.attrsWritten.has(n)) {
      s += this.objAttrBlock(this.nodeAttrs(n, g), ctx);
      ctx.attrsWritten.add(n);
    }
    ctx.out.push(s + ';\n');
    ctx.nodeLW.set(n, ctx.preorder.get(g)!);
  }

  /** @see write.c:write_edge — attrs only on first emission, bare thereafter. */
  private writeEdge(g: Graph, e: Edge, ctx: SerCtx): void {
    const conn = edgeConnector(isDirected(g));
    let s = this.indent(ctx) + xdotId(this.emitNodeName(e.tail)) + ' ' + conn + ' ' +
      xdotId(this.emitNodeName(e.head));
    if (!ctx.attrsWritten.has(e)) {
      s += this.objAttrBlock(this.edgeAttrStr(e, g), ctx);
      ctx.attrsWritten.add(e);
    }
    ctx.out.push(s + ';\n');
    ctx.edgeLW.set(e, ctx.preorder.get(g)!);
  }

  /** Root-graph attribute block: `_draw_`, `_ldraw_`, `bb`, `xdotversion`. */
  private graphAttrs(g: Graph): string[] {
    const d = this.drawsOf(g);
    const parts: string[] = [];
    if (d?.draw) parts.push(this.drawAttr('_draw_', d.draw));
    if (d?.ldraw) parts.push(this.drawAttr('_ldraw_', d.ldraw));
    parts.push('bb="' + this.bbStr(g) + '"');
    parts.push(...graphLabelAttrs(g));
    // xdot_begin_graph agsets xdotversion; FORMAT_DOT never does.
    // @see plugin/core/gvrender_core_dot.c:341 xdot_begin_graph
    // Canonicalized like any other dict value: `1.7` needs no quotes, and
    // native emits it bare. @see lib/cgraph/write.c:write_canonstr
    if (this.emitDraws) parts.push('xdotversion=' + agstrcanon(XDOT_VERSION));
    parts.push(...graphInputParts(g, true));
    return parts;
  }

  /** Cluster attribute block. C's xdot_end_cluster ALWAYS agsets `_draw_` when
   *  the graph has clusters (even empty, e.g. peripheries=0), so emit it
   *  unconditionally; `_ldraw_` only when the cluster has a label.
   *  @see plugin/core/gvrender_core_dot.c:284 xdot_end_cluster */
  private clusterAttrs(sg: Graph): string[] {
    const d = this.drawsOf(sg);
    const parts: string[] = this.emitDraws ? [this.drawAttr('_draw_', d?.draw ?? '')] : [];
    if (d?.ldraw) parts.push(this.drawAttr('_ldraw_', d.ldraw));
    if (sg.info.bb) parts.push('bb="' + this.bbStr(sg) + '"');
    // rec_attach_bb recurses into GD_clust, so a labelled cluster carries the
    // same lp/lwidth/lheight triple as the root. @see lib/common/output.c:249
    parts.push(...graphLabelAttrs(sg));
    parts.push(...graphInputParts(sg, false));
    return parts;
  }

  /** Node attribute block: pos/width/height plus `_draw_`/`_ldraw_`. `scope` is
   *  the subgraph the node is being WRITTEN in, whose node dict every value is
   *  compared against. @see lib/cgraph/write.c:537-545 write_node */
  private nodeAttrs(n: Node, scope: Graph): string[] {
    const info = n.info;
    // attach_attrs derives the emitted size from ND_lw+ND_rw / ND_ht, NOT
    // ND_width/ND_height (output.c:307-308). They coincide except where an
    // engine leaves them divergent — patchwork's finishNode lets poly_init
    // clobber ND_width/height while the tile survives in lw/rw/ht.
    const defs = effectiveNodeDefaults(scope);
    const posRaw = gfmt5(info.coord.x) + ',' + gfmt5(info.coord.y);
    const widthRaw = gfmt5((info.lw + info.rw) / 72);
    const heightRaw = gfmt5(info.ht / 72);
    const parts: string[] = [
      ...computedPart('pos', posRaw, 'pos="' + posRaw + '"', defs),
      ...computedPart('width', widthRaw, 'width=' + widthRaw, defs),
      ...computedPart('height', heightRaw, 'height=' + heightRaw, defs),
    ];
    parts.push(...this.nodeXlpPart(n, defs));
    parts.push(...this.nodeRectsPart(n, defs));
    const d = this.drawsOf(n);
    if (d?.draw) parts.push(this.drawAttr('_draw_', d.draw));
    if (d?.ldraw) parts.push(this.drawAttr('_ldraw_', d.ldraw));
    parts.push(...objInputParts(nodeRecord(n), defs, COMPUTED_NODE_ATTRS));
    return parts;
  }

  /** The `[...]` attribute body for an edge (draw ops + spline `pos`), or ''. */
  private edgeAttrStr(e: Edge, g: Graph): string[] {
    const defs = effectiveEdgeDefaults(g);
    const parts: string[] = this.edgeDrawParts(e);
    const posRaw = edgePosRaw(e);
    if (posRaw !== null) {
      parts.push(...computedPart('pos', posRaw, 'pos="' + posRaw + '"', defs));
    } else {
      // C's attach_attrs only agsets `pos` when the edge HAS a spline
      // (output.c:348); an engine that never routes (patchwork) leaves the
      // INPUT's own pos attribute intact and write.c emits it verbatim.
      parts.push(...echoAttr(e.attrs, 'pos'));
    }
    // The label-position attributes live inside the SAME loop that writes `pos`
    // (output.c:377-396), so they are attached only for a routed, non-IGNORED
    // edge. Note the asymmetry C encodes: `lp`/`head_lp`/`tail_lp` are emitted
    // whenever the label EXISTS, but `xlp` additionally requires `->set` — an
    // unplaced xlabel is omitted. Order mirrors C: lp, xlp, head_lp, tail_lp.
    // Each gate is independent, and each FAILED gate leaves the input's own
    // value in the slot for write.c to echo: an unrouted edge (patchwork routes
    // none) returns the `lp` a previous dot run wrote.
    parts.push(...this.edgeLabelPosParts(e, defs));
    parts.push(...objInputParts(e.attrs, defs, COMPUTED_EDGE_ATTRS));
    return parts;
  }

  /** `xlp` — only when the node HAS an xlabel AND the xlabel placer actually set
   *  its position (`ND_xlabel(n)->set`). An xlabel that was never placed is
   *  omitted entirely, so an input `xlp` survives and is echoed.
   *  @see lib/common/output.c:309-313 */
  private nodeXlpPart(n: Node, defs: Map<string, string>): string[] {
    const xlabel = n.info.xlabel as TextlabelT | undefined;
    if (!xlabel || !xlabel.set) return echoAttr(n.attrs, 'xlp');
    const raw = lpStr(xlabel.pos);
    return computedPart('xlp', raw, 'xlp="' + raw + '"', defs);
  }

  /** `rects` — record field boxes. C gates on the SHAPE NAME being exactly
   *  "record" (`strcmp(ND_shape(n)->name, "record") == 0`), so `Mrecord` and
   *  HTML-table nodes get NO rects; confirmed against the native oracle. When
   *  the shape is not a record the input's `rects` is never overwritten and is
   *  echoed — patchwork forces every node to `box`, so a re-fed dot output
   *  returns its old record rects untouched. @see lib/common/output.c:314-317 */
  private nodeRectsPart(n: Node, defs: Map<string, string>): string[] {
    const shape = n.info.shape as ShapeDesc | undefined;
    if (shape?.name !== 'record') return echoAttr(n.attrs, 'rects');
    const rects: string[] = [];
    appendRecordRects(n, n.info.shape_info as FieldT, rects);
    const raw = rects.join(' ');
    return computedPart('rects', raw, 'rects="' + raw + '"', defs);
  }

  /** The six `_draw_`-family attributes of an edge, in C's order. */
  private edgeDrawParts(e: Edge): string[] {
    const d = this.drawsOf(e);
    const parts: string[] = [];
    if (d?.draw) parts.push(this.drawAttr('_draw_', d.draw));
    if (d?.ldraw) parts.push(this.drawAttr('_ldraw_', d.ldraw));
    if (d?.hdraw) parts.push(this.drawAttr('_hdraw_', d.hdraw));
    if (d?.tdraw) parts.push(this.drawAttr('_tdraw_', d.tdraw));
    if (d?.hldraw) parts.push(this.drawAttr('_hldraw_', d.hldraw));
    if (d?.tldraw) parts.push(this.drawAttr('_tldraw_', d.tldraw));
    return parts;
  }

  /**
   * `lp`/`xlp`/`head_lp`/`tail_lp` for one edge, in C's order.
   *
   * Note the asymmetry C encodes: `lp`/`head_lp`/`tail_lp` are emitted whenever
   * the label EXISTS, but `xlp` additionally requires `->set` — an unplaced
   * xlabel is omitted. Each gate is independent, and each FAILED gate leaves the
   * input's own value in the slot for write.c to echo: an unrouted edge
   * (patchwork routes none) returns the `lp` a previous dot run wrote.
   * @see lib/common/output.c:377-396
   */
  private edgeLabelPosParts(e: Edge, defs: Map<string, string>): string[] {
    const attached = edgeAttrsAttached(e);
    const info = e.info;
    const parts: string[] = [];
    const lpPart = (key: string, label: TextlabelT): string[] => {
      const raw = lpStr(label.pos);
      return computedPart(key, raw, key + '="' + raw + '"', defs);
    };
    if (attached && info.label) parts.push(...lpPart('lp', info.label));
    else parts.push(...echoAttr(e.attrs, 'lp'));
    if (attached && info.xlabel && info.xlabel.set) {
      parts.push(...lpPart('xlp', info.xlabel));
    } else parts.push(...echoAttr(e.attrs, 'xlp'));
    if (attached && info.head_label) {
      parts.push(...lpPart('head_lp', info.head_label));
    } else parts.push(...echoAttr(e.attrs, 'head_lp'));
    if (attached && info.tail_label) {
      parts.push(...lpPart('tail_lp', info.tail_label));
    } else parts.push(...echoAttr(e.attrs, 'tail_lp'));
    return parts;
  }
}
