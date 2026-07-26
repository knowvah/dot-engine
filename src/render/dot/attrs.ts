// SPDX-License-Identifier: EPL-2.0

/**
 * Attribute helpers for the `-Tdot` writer — the `attach_attrs_and_arrows`
 * side of output.c, plus the value-record and dict-default rules
 * write_nondefault_attrs / write_dict compare against.
 *
 * @see lib/common/output.c:254 attach_attrs_and_arrows
 * @see lib/cgraph/write.c:471 write_nondefault_attrs
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { IGNORED } from '../../layout/dot/rank.js';
import { agstrcanonText } from '../map.js';
import { POINTS_PER_INCH } from '../../model/geom.js';
import type { TextlabelT, FieldT } from '../../common/types.js';
import { agcanonEscape, gfmt2, gfmt5, lpStr } from './xdot-ops.js';

/**
 * C's `attach_attrs` edge loop skips IGNORED edges and edges with no spline
 * (`ED_spl(e) == NULL`) via `continue`, so such an edge is attached NEITHER
 * `pos` NOR any of `lp`/`xlp`/`head_lp`/`tail_lp` — even when it carries a
 * label. All five attributes therefore share this one gate.
 * @see lib/common/output.c:349-353
 */
export function edgeAttrsAttached(e: Edge): boolean {
  return e.info.edge_type !== IGNORED && e.info.spl != null;
}

/**
 * Append the leaf-field rectangles of a record node, mirroring the recursion in
 * `set_record_rects`: a field with sub-fields contributes nothing itself, while
 * a LEAF field (`n_flds == 0`) contributes its box translated by the node centre
 * as `llx,lly,urx,ury` at `%.5g`. C emits each field followed by a space and
 * then pops the trailing one — joining with a single space is equivalent.
 * @see lib/common/output.c:215 set_record_rects
 */
export function appendRecordRects(n: Node, f: FieldT, out: string[]): void {
  const c = n.info.coord;
  if (f.n_flds === 0) {
    out.push(
      gfmt5(f.b.ll.x + c.x) + ',' + gfmt5(f.b.ll.y + c.y) + ',' +
      gfmt5(f.b.ur.x + c.x) + ',' + gfmt5(f.b.ur.y + c.y),
    );
  }
  for (let i = 0; i < f.n_flds; i++) appendRecordRects(n, f.fld![i], out);
}

/**
 * Echo an attribute that `attach_attrs_and_arrows` did NOT overwrite.
 *
 * Every computed attribute is `agset` behind a gate (`rects` only for a
 * `record` shape; an edge's `lp` only for a routed edge that HAS a label;
 * a graph's `lp` only when `GD_label(g)` exists...). When the gate FAILS, C
 * simply does not write — so the slot keeps whatever the INPUT file parsed
 * into it, and `agwrite` (which serializes the whole attribute table, not
 * just the fields layout computed) prints that stale value verbatim. This is
 * highly visible under patchwork, which forces every shape to `box` and routes
 * no edges: on a re-fed dot output (most of the corpus) native echoes back the
 * `rects` / `lp` a *previous* dot run wrote, in that run's coordinate space.
 *
 * cgraph interns attribute strings, so a value equal to the declared (empty)
 * default is the SAME pointer as the default and write.c's
 * `data->str[sym->id] != sym->defval` test drops it — hence an empty value is
 * never printed.
 * @see lib/cgraph/write.c:427 write_nondefault_attrs · lib/common/output.c:270
 */
/** Names the serializer computes for a node; never echoed from input. */
export const COMPUTED_NODE_ATTRS = new Set(['pos', 'width', 'height', 'xlp', 'rects', '_draw_', '_ldraw_']);

/** Names the serializer computes for an edge. `tailport`/`headport` are excluded
 *  too: write_nondefault_attrs skips those symbols because they are written as
 *  `:port` syntax on the endpoints instead. @see lib/cgraph/write.c:487-492 */
export const COMPUTED_EDGE_ATTRS = new Set([
  'pos', 'lp', 'xlp', 'head_lp', 'tail_lp', 'tailport', 'headport',
  '_draw_', '_ldraw_', '_hdraw_', '_tdraw_', '_hldraw_', '_tldraw_',
]);

/** dot's synthesized AGNODE `label` default. @see lib/common/const.h NODENAME_ESC */
export const NODENAME_ESC = '\\N';

/** Effective edge defaults at `scope`, inner overriding outer — mirrors the
 *  builder's snapshotEdgeDefaults walk (builder.ts:294). Edges have no stored
 *  snapshot: the builder copies inherited defaults straight into `edge.attrs`,
 *  so the only way to tell a defaulted value from an explicit one is to compare
 *  against this walk. That merge also means `edge.attrs` already IS the cgraph
 *  value record `objInputParts` expects — the node side has to build one
 *  (`nodeRecord`) because node defaults are kept in a separate snapshot. */
export function effectiveEdgeDefaults(scope: Graph): Map<string, string> {
  const eff = new Map<string, string>();
  for (let g: Graph | null = scope; g !== null; g = g.parent) {
    for (const [k, v] of g.edgeDefaults) if (!eff.has(k)) eff.set(k, v);
  }
  return eff;
}

/**
 * Effective node defaults at `scope`, inner overriding outer — the dict
 * write_node compares each node against (`d`, threaded from write_body,
 * write.c:537-545). This is the scope the node is WRITTEN in, which is not
 * necessarily where it was created.
 *
 * Includes dot's synthesized `label` default: `graph_init` installs
 * NODENAME_ESC on the root when the input declares none (input.c:737-739), and
 * it is part of the dict C compares against. `nodeRecord` seeds the same value
 * under the same condition so the two cancel — omitting it from either side
 * would print `label="\N"` (or `label=""`) on every node in the corpus.
 * @see lib/cgraph/write.c:537-545 write_node · lib/common/input.c:737-739
 */
export function effectiveNodeDefaults(scope: Graph): Map<string, string> {
  const eff = new Map<string, string>();
  for (let g: Graph | null = scope; g !== null; g = g.parent) {
    for (const [k, v] of g.nodeDefaults) if (!eff.has(k)) eff.set(k, v);
  }
  if (!eff.has('label')) eff.set('label', NODENAME_ESC);
  return eff;
}

/**
 * One node's cgraph value RECORD: the node-dict defaults in effect where the
 * node was CREATED, overridden by its own explicit attributes.
 *
 * `addattr` seeds a node's slot from the default at declaration time and an
 * explicit `n [k=v]` overwrites it; neither is disturbed by a LATER
 * `node [k=…]` in the same scope, which only moves the dict symbol. That gap is
 * the whole mechanism: `{node[shape=house]; A; node[shape=invhouse]; B}` leaves
 * A's record at `house` against a dict default of `invhouse`, so C prints
 * `shape=house` on A and nothing on B.
 * @see lib/cgraph/attr.c:210 addattr · lib/cgraph/write.c:485
 */
export function nodeRecord(n: Node): Map<string, string> {
  const rec = new Map<string, string>(n.nodeDefaultsSnapshot ?? []);
  if (!rec.has('label')) rec.set('label', NODENAME_ESC);
  for (const [k, v] of n.attrs) rec.set(k, v);
  return rec;
}

/**
 * One object's attribute block: every name whose value RECORD differs from the
 * writing scope's dict default. A name in the dict but not the record compares
 * as empty and prints as `k=""` — `digraph G { a; node[color=red]; b; }` emits
 * `a [color=""]`, which a record-only walk structurally cannot produce.
 * @see lib/cgraph/write.c:471 write_nondefault_attrs
 */
export function objInputParts(
  record: Map<string, string>,
  defaults: Map<string, string>,
  computed: Set<string>,
): string[] {
  const parts: string[] = [];
  for (const k of new Set([...record.keys(), ...defaults.keys()])) {
    if (computed.has(k)) continue;
    const v = record.get(k) ?? '';
    if (v === (defaults.get(k) ?? '')) continue;
    parts.push(k + '=' + agstrcanonText(v));
  }
  return parts;
}

/**
 * A COMPUTED node/edge attribute, dropped when its value equals the applicable
 * dict default.
 *
 * `safe_dcl` declares each computed name with an empty default only when the
 * symbol does not already exist — an input file that says `node [width=0.5]`
 * leaves `sym->defval` at `0.5`. cgraph interns strings, so `agxset`ing a
 * computed `0.5` stores the SAME refstr as the default and
 * write_nondefault_attrs' `data->str[sym->id] != sym->defval` test drops it.
 * tests/graphs/arrows.gv is the clean case: every node emits `height=0.5`
 * (no declared default) but none emits `width`.
 *
 * `formatted` is passed in rather than derived so each call site keeps its own
 * quoting; `raw` is the unquoted text that C would have interned.
 * @see lib/common/utils.c:1065 safe_dcl · lib/cgraph/write.c:485
 */
export function computedPart(
  key: string,
  raw: string,
  formatted: string,
  defaults: Map<string, string> | undefined,
): string[] {
  if (defaults !== undefined && defaults.get(key) === raw) return [];
  return [formatted];
}

/** Attribute names the serializer computes itself; input values are echoed by
 *  `graphInputParts`, so these must not be echoed twice. */
export const COMPUTED_GRAPH_ATTRS = new Set([
  '_draw_', '_ldraw_', 'bb', 'lp', 'lwidth', 'lheight', 'xdotversion',
]);

/** Walk to the root graph (cgraph `agroot`). */
export function rootOf(g: Graph): Graph {
  let cur: Graph = g;
  while (cur.parent !== null) cur = cur.parent;
  return cur;
}

/**
 * A scope's own graph-attribute dict entries — the INPUT attributes, echoed by
 * write_dict because in cgraph a graph's attributes ARE its dict defaults.
 *
 * For a non-root scope the test is PROVENANCE, not value. `setattr` gives a
 * subgraph its own dict symbol for every attribute the input declares in that
 * scope, and write_dict prints each local symbol whose value is non-empty —
 * there is no comparison against the inherited value, so re-declaring an
 * attribute to the value it already inherited still prints. Oracle-pinned:
 * `digraph G { foo="x"; { foo="x"; a; b } }` emits `foo=x` on the subgraph.
 *
 * The only entries in `attrs` that are NOT local declarations are the ones the
 * builder seeded from the snapshot so cluster-label inheritance survives the
 * layout's cluster rebuilds; those carry no dict symbol in C and are recorded in
 * `seededAttrs`. (A value-equality test stood in for this before the marker
 * existed, and wrongly swallowed genuine re-declarations.)
 *
 * Also reproduces C's EAGER-propagation artifact. `agattr` creating a NEW global
 * graph attribute runs `agapply(root, addattr, rsym, true)`, installing the
 * symbol — with its pre-declaration (empty) default — on every subgraph that
 * ALREADY EXISTS. So a subgraph opened before the declaration carries a local
 * empty value and agwrite prints e.g. `rankdir=""`, while a sibling opened after
 * it inherits and prints nothing. `graphDefaultsSnapshot` records exactly which
 * defaults were in effect when the scope opened, so "declared at root after this
 * scope opened" is `root.attrs.has(k) && !snapshot.has(k)`.
 * @see lib/cgraph/attr.c:287 (agapply/addattr) · lib/cgraph/write.c:262
 */
export function graphInputParts(g: Graph, top: boolean): string[] {
  const parts: string[] = [];
  const snap = g.graphDefaultsSnapshot;
  const seeded = g.seededAttrs;
  for (const [k, v] of g.attrs) {
    if (COMPUTED_GRAPH_ATTRS.has(k)) continue;
    if (!top && seeded !== undefined && seeded.has(k)) continue;
    if (writeDictSkips(v, snap?.get(k))) continue;
    parts.push(k + '=' + agstrcanonText(v));
  }
  if (!top && snap !== undefined) parts.push(...eagerEmptyParts(g, snap));
  return parts;
}

/**
 * C's EAGER-propagation artifact. `agattr` creating a NEW global graph
 * attribute runs `agapply(root, addattr, rsym, true)`, installing the symbol —
 * with its pre-declaration (empty) default — on every subgraph that ALREADY
 * EXISTS. So a subgraph opened before the declaration carries a local empty
 * value and agwrite prints e.g. `rankdir=""`, while a sibling opened after it
 * inherits and prints nothing. "Declared at root after this scope opened" is
 * exactly `root.attrs.has(k) && !snapshot.has(k)`.
 * @see lib/cgraph/attr.c:287 (agapply/addattr)
 */
function eagerEmptyParts(g: Graph, snap: Map<string, string>): string[] {
  const parts: string[] = [];
  for (const k of rootOf(g).attrs.keys()) {
    if (COMPUTED_GRAPH_ATTRS.has(k)) continue;
    if (snap.has(k) || g.attrs.has(k)) continue;
    parts.push(k + '=' + agstrcanonText(''));
  }
  return parts;
}

/**
 * `name=value` parts for one attribute-default map, values canonicalized by the
 * `_agstrcanon` port (conditional quoting — `rankdir=LR` bare, `bb="0,0,1,1"`
 * quoted), matching write_canonstr. @see lib/cgraph/write.c:write_canonstr
 */
export function dictParts(defaults: Map<string, string>): string[] {
  const parts: string[] = [];
  for (const [k, v] of defaults) parts.push(k + '=' + agstrcanonText(v));
  return parts;
}

/**
 * Node-dict parts for a scope. At the root, dot's `graph_init` installs an
 * AGNODE `label` default of NODENAME_ESC (`\N`) when absent — the port models
 * attributes as per-object Maps and reproduces that default at each use-site
 * (see the N_label note in common/graph-init.ts), and the serializer is such a
 * use-site. An explicit root-level `node [label=...]` wins over the synthesized
 * default. @see lib/common/input.c:737-739 (N_label)
 */
export function nodeDictParts(g: Graph, top: boolean): string[] {
  const defs = new Map(g.nodeDefaults);
  if (top && !defs.has('label')) defs.set('label', NODENAME_ESC);
  return dictParts(defs);
}

export function echoAttr(attrs: Map<string, string>, key: string): string[] {
  const v = attrs.get(key);
  if (v === undefined || v.length === 0) return [];
  return [key + '="' + agcanonEscape(v) + '"'];
}

/**
 * write_dict's conditional empty-value skip, as OBSERVED against the oracle.
 *
 * A non-empty local value always prints. An empty one is dropped only when the
 * INHERITED value is present and empty too; an inherited value that is absent
 * or non-empty leaves the empty local value printed, and so does the root,
 * which inherits nothing. Pinned with `digraph G { [foo=<i>;] { foo=""; … } }`:
 * inherited absent PRINTS, inherited `"x"` PRINTS, inherited `""` SKIPS, and
 * the root's own `foo=""` PRINTS in every one of those.
 *
 * Neither half of the C's guard can be read literally. `Agsym_t.print`
 * (cgraph.h:644) is assigned nowhere in the tree, so porting
 * `EMPTY(psym->defval) && psym->print` verbatim makes the parent-empty skip
 * unreachable; and the `view == NULL` skip would drop the root's `foo=""`,
 * which native prints. The observed rule is authoritative here.
 * @see lib/cgraph/write.c:271-278 write_dict
 */
export function writeDictSkips(v: string, inherited: string | undefined): boolean {
  return v.length === 0 && inherited === '';
}

/**
 * `echoAttr` for a GRAPH attribute the layout did not overwrite — same as
 * echoAttr except an EMPTY value can still be emitted, per `writeDictSkips`.
 * So a re-fed dot output whose `{rank=same}` block carries `bb=""`/`lp=""`
 * under a boxed, labelled cluster echoes both back verbatim
 * (tests/share/KW91.gv).
 */
export function echoGraphAttr(g: Graph, key: string): string[] {
  const v = g.attrs.get(key);
  if (v === undefined) return [];
  if (writeDictSkips(v, g.graphDefaultsSnapshot?.get(key))) return [];
  return [key + '="' + agcanonEscape(v) + '"'];
}

/**
 * The `lp`/`lwidth`/`lheight` triple for a graph or cluster, in C's order.
 * `rec_attach_bb` attaches them to the root graph AND recursively to every
 * cluster, but ONLY when the graph carries a label with non-empty text
 * (`GD_label(g) && GD_label(g)->text[0]`) — an absent or empty-text label emits
 * none of the three. `lp` is the label centre in points (`%.5g`); `lwidth` and
 * `lheight` are the label's `dimen` converted to inches and written `%.2f`.
 * When the gate fails, the input's own values survive and are echoed: patchwork
 * and osage never build a cluster label object, so a re-fed dot file's cluster
 * `lp` comes straight back out.
 * @see lib/common/output.c:239-248 rec_attach_bb
 */
export function graphLabelAttrs(g: Graph): string[] {
  const label = g.info.label as TextlabelT | undefined;
  if (!label || label.text.length === 0) {
    return [
      ...echoGraphAttr(g, 'lp'),
      ...echoGraphAttr(g, 'lwidth'),
      ...echoGraphAttr(g, 'lheight'),
    ];
  }
  return [
    'lp="' + lpStr(label.pos) + '"',
    'lwidth=' + gfmt2(label.dimen.x / POINTS_PER_INCH),
    'lheight=' + gfmt2(label.dimen.y / POINTS_PER_INCH),
  ];
}

// ---------------------------------------------------------------------------
// DOT attribute helpers
// ---------------------------------------------------------------------------

/**
 * Format edge spline points for the DOT `pos` attribute. Per bezier: the start
 * endpoint `s,sp` when `sflag` set, then the end endpoint `e,ep` when `eflag`
 * set, then `bez.size` control points — all at `%.5g`, exactly as native's
 * spline serialization. @see lib/common/output.c:357-372
 */
export function formatEdgePos(e: Edge): string {
  const raw = edgePosRaw(e);
  return raw === null ? '' : 'pos="' + raw + '"';
}

/** `formatEdgePos`'s value without the `pos="…"` wrapper — the text C interns
 *  and compares against the symbol default. `null` when no `pos` is attached. */
export function edgePosRaw(e: Edge): string | null {
  const spl = e.info.spl;
  if (!spl || spl.list.length === 0) return null;
  // Native's pos loop skips IGNORED edges (output.c:350) — concentrate merges
  // an edge into its opposite and marks the absorbed one IGNORED; it is still
  // drawn (has _draw_) but carries no `pos`. @see lib/common/output.c:349-353
  if (e.info.edge_type === IGNORED) return null;
  const parts: string[] = [];
  for (const bez of spl.list) {
    if (bez.sflag) parts.push('s,' + gfmt5(bez.sp.x) + ',' + gfmt5(bez.sp.y));
    if (bez.eflag) parts.push('e,' + gfmt5(bez.ep.x) + ',' + gfmt5(bez.ep.y));
    const pts = bez.list.slice(0, bez.size);
    for (const p of pts) parts.push(gfmt5(p.x) + ',' + gfmt5(p.y));
  }
  return parts.join(' ');
}

/** Return the edge connector token. */
export function edgeConnector(directed: boolean): string {
  return directed ? '->' : '--';
}

/** Return true if the graph is directed or strict-directed. */
export function isDirected(g: Graph): boolean {
  return g.kind === 'directed' || g.kind === 'strict-directed';
}
