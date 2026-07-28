// SPDX-License-Identifier: EPL-2.0

/**
 * Plain, IMAP, and CMAPX renderer plugins.
 *
 * Plain: ports lib/common/output.c:write_plain.
 * IMAP/CMAPX: ports plugin/core/gvrender_core_map.c.
 *
 * @see lib/common/output.c:write_plain
 * @see plugin/core/gvrender_core_map.c
 */

import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';
import type { Edge } from '../model/edge.js';
import type { Point, Box } from '../model/geom.js';
import { POINTS_PER_INCH } from '../model/geom.js';
import type { TextSpan } from '../common/emit-types.js';
import { ShapeKind, type ShapeDesc, type TextlabelT } from '../common/types.js';
import { lateDouble } from '../common/nodeinit.js';
import { nodeAttr } from '../common/poly-init.js';
import { htmlValueContent, isHtmlValue } from '../common/html-string.js';
import { nodesInSeq } from '../layout/dot/decomp.js';
import { substObjAnchor } from '../common/subst.js';
import type { RendererPlugin } from '../gvc/context.js';
import type { ObjState, RenderJob } from '../gvc/job.js';
import { MapShape, EMIT_CLUSTERS_LAST } from '../gvc/job.js';
import {
  type MapCtx,
  computeNodeUrlMap,
  computeGraphUrlMap,
  computeClusterUrlMap,
  computeLabelRectMap,
  computeEdgeSplineMaps,
} from '../gvc/anchor.js';
import { initJobViewportZoom, parseDrawingSize } from '../gvc/viewport.js';
import { escapeXml } from './svg-helpers.js';
import { escapeXmlTitle } from './xml-escape.js';

// ---------------------------------------------------------------------------
// Avoid Lizard quote-tracker bug: never put " in string literals.
// ---------------------------------------------------------------------------

const DQ = '\x22';

// ---------------------------------------------------------------------------
// Shared interfaces (defined before all functions to avoid Lizard leakage)
// ---------------------------------------------------------------------------

/** Node style attributes for plain format. */
export interface PlainNodeAttrs {
  label: string; style: string; shape: string; color: string; fill: string;
}

/** Anchor attributes bundled to avoid >5-param functions. */
export interface AnchorCtx {
  url: string; tooltip: string; target: string; id: string;
}

// ---------------------------------------------------------------------------
// printG5 — @see lib/common/output.c:printdouble (%.5g)
// ---------------------------------------------------------------------------

/** Exact decimal digits of a finite double: doubles are binary rationals, so
 * the expansion terminates. Returns significant digits and the base-10
 * exponent of the first digit (value = 0.d₁d₂… × 10^(exp10+1)). */
function exactDecimalDigits(v: number): { digits: string; exp10: number } {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, Math.abs(v));
  const bits = dv.getBigUint64(0);
  const expBits = Number((bits >> 52n) & 0x7ffn);
  const mant = bits & 0xfffffffffffffn;
  const m = expBits === 0 ? mant : mant | (1n << 52n);
  const e = (expBits === 0 ? 1 : expBits) - 1075;
  let intDigits: string;
  let fracLen = 0;
  if (e >= 0) {
    intDigits = (m << BigInt(e)).toString();
  } else {
    intDigits = (m * 5n ** BigInt(-e)).toString();
    fracLen = -e;
  }
  if (intDigits.length <= fracLen) {
    intDigits = '0'.repeat(fracLen - intDigits.length + 1) + intDigits;
  }
  const pointPos = intDigits.length - fracLen; // digits before the decimal point
  const firstSig = intDigits.search(/[1-9]/);
  return { digits: intDigits.slice(firstSig), exp10: pointPos - firstSig - 1 };
}

/** Format with 5 significant figures, trailing zeros stripped — C snprintf
 * `%.5g`. JS toPrecision rounds exact decimal ties away from zero, but C
 * (round-to-nearest-even FP mode) rounds them to even, and integer point
 * coordinates land on exact .x5 inch ties (e.g. 78498pt/72 = 1090.25 →
 * "1090.2", not "1090.3"). Round from the exact expansion instead.
 * @see lib/common/output.c:printdouble */
export function printG5(v: number): string {
  if (v === 0 || !Number.isFinite(v)) return String(v);
  const P = 5;
  const { digits, exp10 } = exactDecimalDigits(v);
  let sig = digits.slice(0, P);
  if (sig.length < P) sig += '0'.repeat(P - sig.length);
  const rest = digits.slice(P);
  const restNonzeroAfterFirst = /[1-9]/.test(rest.slice(1));
  const roundUp = rest.length > 0 && (
    rest[0]! > '5'
    || (rest[0] === '5' && restNonzeroAfterFirst)
    || (rest[0] === '5' && !restNonzeroAfterFirst
        && (sig.charCodeAt(P - 1) - 0x30) % 2 === 1));
  let exp = exp10;
  if (roundUp) {
    const n = String(BigInt(sig) + 1n);
    sig = n.length > P ? (exp++, n.slice(0, P)) : n;
  }
  const sign = v < 0 ? '-' : '';
  // %g style selection: exponential when exp < -4 or exp >= precision.
  if (exp < -4 || exp >= P) {
    const mant = (sig[0]! + '.' + sig.slice(1)).replace(/\.?0+$/, '');
    const as = Math.abs(exp);
    return sign + mant + 'e' + (exp < 0 ? '-' : '+') + (as < 10 ? '0' : '') + String(as);
  }
  let s: string;
  if (exp >= sig.length - 1) {
    s = sig + '0'.repeat(exp - sig.length + 1);
  } else if (exp >= 0) {
    s = sig.slice(0, exp + 1) + '.' + sig.slice(exp + 1);
  } else {
    s = '0.' + '0'.repeat(-exp - 1) + sig;
  }
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return sign + s;
}

/** Convert points → inches (PS2INCH = 1/72) and format as %.5g. */
export function plainCoord(v: number): string {
  return printG5(v / 72);
}

// ---------------------------------------------------------------------------
// agstrcanon — DOT-canonical string form for plain names/labels/ports.
// @see lib/cgraph/write.c:_agstrcanon / agstrcanon / agcanonhtmlstr
// ---------------------------------------------------------------------------

/** must agree with scan.l @see lib/cgraph/write.c:120 tokenlist */
const CANON_KEYWORDS = ['node', 'edge', 'strict', 'graph', 'digraph', 'subgraph'];

/** Line-break threshold. agwrite may override via `linelength` but always
 * restores this value, so the plain path (direct agstrcanon, no agwrite)
 * observes the default. @see lib/cgraph/write.c:44,676,692 */
const MAX_OUTPUTLINE = 128;

function isDigitByte(b: number): boolean { return b >= 0x30 && b <= 0x39; }

function isAlnumByte(b: number): boolean {
  return isDigitByte(b) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a);
}

/** alphanumeric, '.', '-', or non-ascii byte. @see lib/cgraph/write.c:is_id_char */
function isIdCharByte(b: number): boolean {
  return isAlnumByte(b) || b === 0x2e || b === 0x2d || b >= 0x80;
}

/** Recognized escString escape starting at bytes[i]. @see lib/cgraph/write.c:is_escape */
function isEscapeAt(bytes: Uint8Array, i: number): boolean {
  if (bytes[i] !== 0x5c) return false;
  const c = bytes[i + 1];
  return c !== undefined && 'EGHLNTlnr\\"'.includes(String.fromCharCode(c));
}

/**
 * Canonicalize an attribute value for printing — cgraph's `agstrcanon`, which
 * DISPATCHES on the html flag before falling back to the plain-string scan.
 *
 * An HTML-like value (`label=<<table…>>`) is emitted angle-bracket delimited
 * and VERBATIM: no quoting, and no escaping of the `"` inside its markup.
 * Routing it through `agstrcanonText` instead produces a quoted string with
 * every attribute quote backslash-escaped, and leaks the port's marker byte.
 *
 * @see lib/cgraph/write.c:219 agstrcanon · :209 agcanonhtmlstr
 */
export function agstrcanon(arg: string): string {
  if (isHtmlValue(arg)) return '<' + htmlValueContent(arg) + '>';
  return agstrcanonText(arg);
}

/** The needs-quotes / numeral / escape state scan of `_agstrcanon`, over UTF-8
 * BYTES (C iterates bytes: cnt counts bytes for line breaking, and non-ascii
 * bytes are id chars). Returns the quoted buffer or the untouched input.
 * NOTE: this is `_agstrcanon`, the non-html half — call `agstrcanon` unless you
 * know the value cannot be html. @see lib/cgraph/write.c:_agstrcanon */
export function agstrcanonText(arg: string): string {
  if (arg.length === 0) return '""';
  const bytes = new TextEncoder().encode(arg);
  const out: number[] = [0x22];
  let needsQuotes = false;
  let partOfEscape = false;
  let backslashPending = false;
  let cnt = 0;
  let dotcnt = 0;
  let maybeNum = isDigitByte(bytes[0]!) || bytes[0] === 0x2e || bytes[0] === 0x2d;
  for (let i = 0; i < bytes.length; i++) {
    const uc = bytes[i]!;
    if (uc === 0x22 && !partOfEscape) { // '"' not already part of an escape
      out.push(0x5c);
      needsQuotes = true;
    } else if (!partOfEscape && isEscapeAt(bytes, i)) {
      needsQuotes = true;
      partOfEscape = true;
    } else if (maybeNum) {
      if (uc === 0x2d) { // '-' legal only as the first char of a numeral
        if (cnt) { maybeNum = false; needsQuotes = true; }
      } else if (uc === 0x2e) { // one '.' allowed
        if (dotcnt++) { maybeNum = false; needsQuotes = true; }
      } else if (!isDigitByte(uc)) {
        maybeNum = false;
        needsQuotes = true;
      }
      partOfEscape = false;
    } else if (!(isAlnumByte(uc) || uc === 0x5f || uc >= 0x80)) {
      needsQuotes = true;
      partOfEscape = false;
    } else {
      partOfEscape = false;
    }
    out.push(uc);
    cnt++;
    const next = bytes[i + 1];
    // Long-string line breaking: only after a non-id, non-backslash output
    // char where the next input char is an id char. @see write.c:170-190
    if (next !== undefined) {
      const last = out[out.length - 1]!;
      const canBreak = !(isIdCharByte(last) || last === 0x5c) && isIdCharByte(next);
      if (backslashPending && canBreak) {
        out.push(0x5c, 0x0a);
        needsQuotes = true;
        backslashPending = false;
        cnt = 0;
      } else if (cnt >= MAX_OUTPUTLINE) {
        if (canBreak) {
          out.push(0x5c, 0x0a);
          needsQuotes = true;
          cnt = 0;
        } else {
          backslashPending = true;
        }
      }
    }
  }
  out.push(0x22);
  const first = bytes[0]!;
  if (needsQuotes || (cnt === 1 && (first === 0x2e || first === 0x2d))) {
    return new TextDecoder().decode(new Uint8Array(out));
  }
  // Quotes protect DOT keywords (e.g. a node named "node"). @see write.c:199-203
  const lower = arg.toLowerCase();
  for (const tok of CANON_KEYWORDS) {
    if (tok === lower) return new TextDecoder().decode(new Uint8Array(out));
  }
  return arg;
}

/** late_nnstring: default when the attr is missing OR empty.
 * @see lib/common/utils.c:late_nnstring */
function lateNN(v: string | undefined, def: string): string {
  return v !== undefined && v !== '' ? v : def;
}

/** Resolve fill color: fillcolor attr, then color attr, then lightgrey. */
export function plainNodeFill(n: Node, g: Graph): string {
  // @see lib/common/output.c:write_plain (167-169): fillcolor attr if non-empty,
  // else the color attr, else DEFAULT_FILL ("lightgrey"). Note the fallback is
  // DEFAULT_FILL, not DEFAULT_COLOR — an unfilled node's plain fill field is
  // "lightgrey", not "black".
  const fillcolor = lateNN(nodeAttr(n, g, 'fillcolor'), '');
  if (fillcolor !== '') return fillcolor;
  return lateNN(nodeAttr(n, g, 'color'), 'lightgrey');
}

// ---------------------------------------------------------------------------
// Plain format helpers — @see lib/common/output.c:write_plain
// ---------------------------------------------------------------------------

/** The label field of a plain node line: HTML labels re-wrap the ORIGINAL
 * label attr in `<...>` (agstrcanon's aghtmlstr branch on agxget(n, N_label));
 * everything else — including record labels, whose textlabel keeps the raw
 * unsubstituted source — canonicalizes ND_label(n)->text.
 * @see lib/common/output.c:write_plain (152-158) */
function plainNodeLabel(n: Node, g: Graph): string {
  const lbl = n.info.label as TextlabelT | undefined;
  const attr = nodeAttr(n, g, 'label');
  if (lbl !== undefined && lbl.u.kind === 'html') {
    const a = attr ?? '';
    return '<' + (isHtmlValue(a) ? htmlValueContent(a) : a) + '>';
  }
  // An html-valued attr with a NON-html label object = the HTML parse failed:
  // the port's fallback label is empty (matching C's drawn spans), but C's
  // ND_label->text still holds the raw markup, which plain prints quoted.
  // @see lib/common/labels.c:make_label (html branch gv_strdup before parse)
  if (attr !== undefined && isHtmlValue(attr) && lbl !== undefined && lbl.u.kind === 'txt') {
    return agstrcanonText(htmlValueContent(attr));
  }
  // C record textlabels keep the raw UNSUBSTITUTED label source (make_label's
  // is_record branch gv_strdup's it; substitution happens per-field at record
  // parse). The port's record label resolves the default to the node name, so
  // reconstruct C's text: the label attr, or cgraph's always-present N_label
  // default "\N". @see lib/common/labels.c:make_label ; lib/common/input.c:468
  const shape = n.info.shape as ShapeDesc | undefined;
  if (shape !== undefined && shape.kind === ShapeKind.SH_RECORD) {
    return agstrcanonText(nodeAttr(n, g, 'label') ?? '\\N');
  }
  const text = lbl !== undefined ? lbl.text : (n.attrs.get('label') ?? n.name);
  return agstrcanonText(text);
}

/** Read the five style attrs needed for a plain node line. */
export function plainNodeAttrs(n: Node, g: Graph): PlainNodeAttrs {
  // style/shape/color resolve through the node-defaults chain (C agxget sees
  // `node [...]` defaults). C prints ND_shape(n)->name, which bind_shape
  // derives purely from attrs: a non-epsf shapefile forces "custom", unknown
  // names keep the user's name (user_shape), default is "ellipse" — so the
  // port's resolved-fallback ShapeDesc name must NOT be used here.
  // @see lib/common/output.c:write_plain (163-166)
  // @see lib/common/shapes.c:bind_shape / user_shape
  const shapeAttr = lateNN(nodeAttr(n, g, 'shape'), 'ellipse');
  const shapefile = nodeAttr(n, g, 'shapefile');
  const shapeName =
    shapefile !== undefined && shapefile !== '' && shapeAttr !== 'epsf' ? 'custom' : shapeAttr;
  return {
    label: plainNodeLabel(n, g),
    style: lateNN(nodeAttr(n, g, 'style'), 'solid'),
    shape: shapeName,
    color: lateNN(nodeAttr(n, g, 'color'), 'black'),
    fill: plainNodeFill(n, g),
  };
}

/** Write one node line: `node name x y w h label style shape color fill\n` */
export function writePlainNode(n: Node, g: Graph, out: string[]): void {
  const x = plainCoord(n.info.coord.x);
  const y = plainCoord(n.info.coord.y);
  const w = printG5(n.info.width);
  const h = printG5(n.info.height);
  const a = plainNodeAttrs(n, g);
  out.push('node ' + agstrcanonText(n.name) + ' ' + x + ' ' + y + ' ' + w + ' ' + h
    + ' ' + a.label + ' ' + a.style + ' ' + a.shape + ' ' + a.color + ' ' + a.fill + '\n');
}

/** Flatten all Bezier curves in an edge spline into a point array. Reads
 * exactly bz.size points — routing can leave over-allocated scratch entries
 * past size in bz.list (C sums ED_spl sizes, never the allocation).
 * @see lib/common/output.c:write_plain (183-195) */
export function collectSplinePts(e: Edge): Point[] {
  if (!e.info.spl) return [];
  const pts: Point[] = [];
  for (const bz of e.info.spl.list) {
    for (let i = 0; i < bz.size; i++) pts.push(bz.list[i]!);
  }
  return pts;
}

/** Return `:name` suffix when a port name is present, else empty string. */
export function portSuffix(name: string | null): string {
  return name ? ':' + name : '';
}

/** Write ` name[:port]`, both parts DOT-canonicalized. A cluster proxy node's
 * synthetic `__i:<cluster>` id is written as the cluster name it stands for
 * (C: strchr(agnameof(node), ':') + 1).
 * @see lib/common/output.c:writenodeandport */
function writeNodeAndPort(n: Node, portname: string, out: string[]): void {
  let name = n.name;
  if (n.info.clustnode) {
    const i = name.indexOf(':');
    if (i >= 0) name = name.slice(i + 1);
  }
  out.push(' ' + agstrcanonText(name));
  if (portname !== '') out.push(':' + agstrcanonText(portname));
}

/** Write the `edge tail head n pt...` prefix when spline data exists. */
export function writePlainEdgeHead(
  e: Edge, tport: string, hport: string, pts: Point[], out: string[],
): void {
  out.push('edge');
  writeNodeAndPort(e.tail, tport, out);
  writeNodeAndPort(e.head, hport, out);
  out.push(' ' + String(pts.length));
  for (const pt of pts) {
    out.push(' ' + plainCoord(pt.x) + ' ' + plainCoord(pt.y));
  }
}

/** Write one edge — spline prefix if available, then the edge label (when
 * present), always appends `style color\n`. plain-ext ports come from the
 * tailport/headport ATTRS (C agget), which keep any `:compass` suffix the
 * resolved port objects have already split off.
 * @see lib/common/output.c:write_plain (200-208) */
export function writePlainEdge(e: Edge, extend: boolean, out: string[]): void {
  const tport = extend ? (e.attrs.get('tailport') ?? '') : '';
  const hport = extend ? (e.attrs.get('headport') ?? '') : '';
  const pts = collectSplinePts(e);
  if (pts.length > 0) writePlainEdgeHead(e, tport, hport, pts, out);
  // Edge label: canon(text) then position, mirroring `if (ED_label(e)) {
  // printstring(canon(...)); printpoint(pos) }`.
  const lbl = e.info.label;
  if (lbl !== undefined) {
    out.push(' ' + agstrcanonText(lbl.text)
      + ' ' + plainCoord(lbl.pos.x) + ' ' + plainCoord(lbl.pos.y));
  }
  const style = lateNN(e.attrs.get('style'), 'solid');
  const color = lateNN(e.attrs.get('color'), 'black');
  out.push(' ' + style + ' ' + color + '\n');
}

/** Write the full plain output: graph header, nodes, edges, stop.
 * Node iteration is agfstnode/agnxtnode (AGSEQ) order, not insertion-Map
 * order; the graph line's scale is job->zoom — the size= fit factor, computed
 * with the dot renderer's pad of 0 (render_features_dot).
 * @see lib/common/output.c:write_plain
 * @see plugin/core/gvrender_core_dot.c:render_features_dot */
export function writePlain(g: Graph, job: RenderJob, extend: boolean): void {
  const w = plainCoord(g.info.bb.ur.x);
  const h = plainCoord(g.info.bb.ur.y);
  const zoom = initJobViewportZoom(
    job.bb, parseDrawingSize(g.attrs.get('size')), { x: 0, y: 0 });
  job.write('graph ' + printG5(zoom) + ' ' + w + ' ' + h + '\n');
  const nodes = nodesInSeq(g);
  for (const n of nodes) {
    if (n.info.clustnode) continue; // IS_CLUST_NODE — cluster proxies get no node line
    const buf: string[] = [];
    writePlainNode(n, g, buf);
    job.write(buf.join(''));
  }
  for (const n of nodes) {
    for (const e of n.outEdges(g)) {
      const buf: string[] = [];
      writePlainEdge(e, extend, buf);
      job.write(buf.join(''));
    }
  }
  job.write('stop\n');
}

// ---------------------------------------------------------------------------
// CMAPX / IMAP helpers — @see plugin/core/gvrender_core_map.c
// ---------------------------------------------------------------------------

/** Build AnchorCtx from an ObjState, defaulting nulls to empty string. */
export function cmapxObjAnchor(obj: ObjState): AnchorCtx {
  return {
    url: obj.url ?? '',
    tooltip: obj.tooltip ?? '',
    target: obj.target ?? '',
    id: obj.id ?? '',
  };
}

/** Write graph-level CMAPX shape if the obj has map points. */
export function writeCmapxGraphShape(job: RenderJob, out: string[]): void {
  const obj = job.obj;
  if (!obj || !obj.urlMapPts.length) return;
  mapOutputCmapx(obj.urlMapShape, obj.urlMapPts, cmapxObjAnchor(obj), true, out);
}

/** Map MapShape enum to CMAPX shape attribute string. */
export function cmapxShape(shape: MapShape): string {
  if (shape === MapShape.Circle) return 'circle';
  if (shape === MapShape.Rectangle) return 'rect';
  return 'poly';
}

/** CMAPX coords for a rectangle (UL→LR in Y-down space). */
export function cmapxCoordsRect(pts: Point[]): string {
  return String(Math.round(pts[0]!.x)) + ',' + String(Math.round(pts[1]!.y))
    + ',' + String(Math.round(pts[1]!.x)) + ',' + String(Math.round(pts[0]!.y));
}

/** CMAPX coords for a circle: `cx,cy,r`. */
export function cmapxCoordsCircle(pts: Point[]): string {
  const cx = Math.round(pts[0]!.x);
  const cy = Math.round(pts[0]!.y);
  const r = Math.round(pts[1]!.x - pts[0]!.x);
  return String(cx) + ',' + String(cy) + ',' + String(r);
}

/** CMAPX coords for a polygon: `x0,y0,x1,y1,...`. */
export function cmapxCoordsPoly(pts: Point[]): string {
  return pts.map(p => String(Math.round(p.x)) + ',' + String(Math.round(p.y))).join(',');
}

/** Dispatch to the correct CMAPX coordinate formatter. */
export function cmapxCoords(shape: MapShape, pts: Point[]): string {
  if (shape === MapShape.Circle) return cmapxCoordsCircle(pts);
  if (shape === MapShape.Rectangle) return cmapxCoordsRect(pts);
  return cmapxCoordsPoly(pts);
}

/** Append optional id/href/target/title attributes to out. */
export function mapCmapxAttrs(a: AnchorCtx, out: string[]): void {
  if (a.id) out.push(' id=' + DQ + escapeXml(a.id) + DQ);
  if (a.url) out.push(' href=' + DQ + escapeXml(a.url) + DQ);
  // C uses gvputs_xml (dash+nbsp flags) for target/title — runs of spaces
  // become &#160;. @see gvrender_core_map.c:map_output_shape
  if (a.target) out.push(' target=' + DQ + escapeXmlTitle(a.target) + DQ);
  if (a.tooltip) out.push(' title=' + DQ + escapeXmlTitle(a.tooltip) + DQ);
}

/** Write one `<area>` element: CMAPX (isXml=true → `/>`) or CMAP (`>`). */
export function mapOutputCmapx(
  shape: MapShape, pts: Point[], a: AnchorCtx, isXml: boolean, out: string[],
): void {
  out.push('<area shape=' + DQ + cmapxShape(shape) + DQ);
  mapCmapxAttrs(a, out);
  out.push(' alt=' + DQ + DQ);
  out.push(' coords=' + DQ + cmapxCoords(shape, pts) + DQ);
  out.push(isXml ? '/>\n' : '>\n');
}

/** Write one IMAP shape line; skipped when url is empty. */
export function mapOutputImap(
  shape: MapShape, pts: Point[], url: string, out: string[],
): void {
  if (!url) return;
  if (shape === MapShape.Rectangle) {
    out.push('rect ' + url + ' '
      + Math.round(pts[0]!.x) + ',' + Math.round(pts[1]!.y)
      + ' ' + Math.round(pts[1]!.x) + ',' + Math.round(pts[0]!.y) + '\n');
  } else if (shape === MapShape.Circle) {
    const r = Math.round(pts[1]!.x - pts[0]!.x);
    out.push('circle ' + url + ' '
      + Math.round(pts[0]!.x) + ',' + Math.round(pts[0]!.y) + ',' + String(r) + '\n');
  } else {
    const pairs = pts.map(p => Math.round(p.x) + ',' + Math.round(p.y)).join(' ');
    out.push('poly ' + url + ' ' + pairs + '\n');
  }
}

// ---------------------------------------------------------------------------
// PlainRenderer
// ---------------------------------------------------------------------------

/** @see plugin/core/gvrender_core_dot.c FORMAT_PLAIN */
export class PlainRenderer implements RendererPlugin {
  readonly type = 'plain';
  readonly quality = 0;

  beginGraph(_g: Graph, _job: RenderJob): void { /* no-op */ }
  endGraph(g: Graph, job: RenderJob): void { writePlain(g, job, false); }
  beginNode(_n: Node, _job: RenderJob): void { /* no-op */ }
  endNode(_n: Node, _job: RenderJob): void { /* no-op */ }
  beginEdge(_e: Edge, _job: RenderJob): void { /* no-op */ }
  endEdge(_e: Edge, _job: RenderJob): void { /* no-op */ }
  textspan(_pos: Point, _span: TextSpan, _job: RenderJob): void { /* no-op */ }
  ellipse(_c: Point, _rx: number, _ry: number, _f: boolean, _j: RenderJob): void { /* no-op */ }
  polygon(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  bezier(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  polyline(_pts: Point[], _job: RenderJob): void { /* no-op */ }
}

// ---------------------------------------------------------------------------
// PlainExtRenderer
// ---------------------------------------------------------------------------

/** @see plugin/core/gvrender_core_dot.c FORMAT_PLAIN_EXT */
export class PlainExtRenderer implements RendererPlugin {
  readonly type = 'plain-ext';
  readonly quality = 0;

  beginGraph(_g: Graph, _job: RenderJob): void { /* no-op */ }
  endGraph(g: Graph, job: RenderJob): void { writePlain(g, job, true); }
  beginNode(_n: Node, _job: RenderJob): void { /* no-op */ }
  endNode(_n: Node, _job: RenderJob): void { /* no-op */ }
  beginEdge(_e: Edge, _job: RenderJob): void { /* no-op */ }
  endEdge(_e: Edge, _job: RenderJob): void { /* no-op */ }
  textspan(_pos: Point, _span: TextSpan, _job: RenderJob): void { /* no-op */ }
  ellipse(_c: Point, _rx: number, _ry: number, _f: boolean, _j: RenderJob): void { /* no-op */ }
  polygon(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  bezier(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  polyline(_pts: Point[], _job: RenderJob): void { /* no-op */ }
}

// ---------------------------------------------------------------------------
// Imagemap renderers (cmapx / imap and their no-polygon `_np` variants)
// ---------------------------------------------------------------------------

/** Graph name as `agnameof` returns it: the DOT name, or `%1` for an anonymous
 * root (cgraph's first anonymous id). The port stores `''` for an anonymous
 * root (dot/xdot re-serialization must not print a `%`-name — see dot.ts), so
 * the imagemap layer restores the internal name only here.
 * @see lib/cgraph/id.c:agnameof ; lib/cgraph/id.c:idmap (anon → `%1`) */
export function mapGraphName(g: Graph): string {
  return g.anonymous ? '%1' : g.name;
}

/** First non-empty attr walking parent scopes (agget inheritance). */
function graphAttr(g: Graph, key: string): string | undefined {
  for (let s: Graph | null = g; s !== null; s = s.parent) {
    const v = s.attrs.get(key);
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

/** Root graph URL (href, then URL) with \-substitution, for the imap `default`
 * line. Resolved from attrs because obj.url is populated after beginGraph.
 * @see lib/common/emit.c:initObjMapData ; gvrender_core_map.c:map_begin_page */
export function graphMapUrl(g: Graph): string | null {
  const raw = graphAttr(g, 'href') ?? graphAttr(g, 'URL');
  return raw === undefined ? null : substObjAnchor(raw, g);
}

/** Build the imagemap coordinate context. The map device's default dpi is 96
 * (dpi/resolution attrs override); zoom fits the drawing into `size=` exactly
 * as the SVG path (initJobViewportZoom). @see gvrender_core_map.c device_features_map */
export function buildMapCtx(g: Graph, job: RenderJob, mapPolygon: boolean): MapCtx {
  const drawingDpi = lateDouble(g.attrs.get('dpi'), lateDouble(g.attrs.get('resolution'), 0, 0), 0);
  const mapDpi = drawingDpi > 0 ? drawingDpi : 96;
  const devscale = mapDpi / POINTS_PER_INCH;
  const z = initJobViewportZoom(job.bb, parseDrawingSize(g.attrs.get('size')), job.pad);
  // The graph `margin=` enters device space as `margin * dpi/72` (independent
  // of zoom), added after the scaled transform. @see emit.c:setup_page.
  const marginOff = { x: job.margin.x * devscale, y: job.margin.y * devscale };
  return { bb: job.bb, pad: job.pad, scale: z * devscale, marginOff, mapPolygon };
}

/** Head/tail/center label anchor bundle. */
interface EdgeLabelAnchor { url: string | null; tooltip: string | null; target: string | null; explicit: boolean; }

/** Coalesce nullable anchor fields to '' (gvrender_begin_anchor passes ""). */
function anchorOf(url: string | null, tooltip: string | null, target: string | null, id: string | null): AnchorCtx {
  return { url: url ?? '', tooltip: tooltip ?? '', target: target ?? '', id: id ?? '' };
}

/**
 * Shared imagemap renderer. Ports plugin/core/gvrender_core_map.c: the
 * `url_map_p` geometry (src/gvc/anchor.ts) is populated in the begin hooks and
 * emitted as `<area>` (cmapx) or `keyword url coords` (imap) lines in traversal
 * order. The `_np` subclasses disable polygon/circle shapes
 * (device_features_map_nopoly).
 * @see plugin/core/gvrender_core_map.c
 */
abstract class MapRendererBase implements RendererPlugin {
  abstract readonly type: string;
  readonly quality = 0;
  protected abstract readonly isCmapx: boolean;
  protected abstract readonly mapPolygon: boolean;
  private mapCtx: MapCtx | null = null;

  beginGraph(g: Graph, job: RenderJob): void {
    // Reset per render — instance may be reused across diagrams.
    // The map device carries EMIT_CLUSTERS_LAST (device_features_map): container
    // anchors (HTML table, cluster) emit their <area> AFTER their contents, so
    // an inner cell's area precedes the enclosing table's. @see gvrender_core_map.c
    job.flags |= EMIT_CLUSTERS_LAST;
    this.mapCtx = buildMapCtx(g, job, this.mapPolygon);
    if (this.isCmapx) {
      const name = escapeXml(mapGraphName(g));
      job.write('<map id=' + DQ + name + DQ + ' name=' + DQ + name + DQ + '>\n');
      return;
    }
    job.write('base referer\n');
    const url = graphMapUrl(g);
    if (url) job.write('default ' + url + '\n');
  }

  endGraph(_g: Graph, job: RenderJob): void {
    if (!this.isCmapx) return;
    const obj = job.obj;
    // Root graph hot spot (map_end_page). @see gvrender_core_map.c:map_end_page
    if (obj !== null && this.mapCtx !== null && (obj.url !== null || obj.explicitTooltip)) {
      computeGraphUrlMap(obj, this.mapCtx);
    }
    const buf: string[] = [];
    writeCmapxGraphShape(job, buf);
    job.write(buf.join(''));
    job.write('</map>\n');
  }

  beginNode(n: Node, job: RenderJob): void {
    if (this.mapCtx !== null && job.obj !== null) computeNodeUrlMap(n, job.obj, this.mapCtx);
  }

  beginCluster(sg: Graph, job: RenderJob): void {
    const bb = sg.info.bb;
    if (this.mapCtx !== null && job.obj !== null && bb !== undefined) {
      computeClusterUrlMap(bb, job.obj, this.mapCtx);
    }
  }

  endEdge(e: Edge, job: RenderJob): void {
    if (this.mapCtx !== null && job.obj !== null) this.emitEdge(e, job.obj, job);
  }

  /** C emit_map_rect: record the HTML table/cell box as the pending hot spot,
   *  so the following beginAnchor emits its <area>. @see emit.c:640 */
  emitMapRect(box: Box, job: RenderJob): void {
    if (this.mapCtx !== null && job.obj !== null) {
      computeClusterUrlMap(box, job.obj, this.mapCtx);
    }
  }

  beginAnchor(url: string, tip: string, target: string, id: string, job: RenderJob): void {
    const obj = job.obj;
    if (obj === null || obj.urlMapPts.length === 0) return;
    this.emitShape(obj.urlMapShape, obj.urlMapPts, { url, tooltip: tip, target, id }, job);
  }

  endNode(_n: Node, _job: RenderJob): void { /* no-op */ }
  beginEdge(_e: Edge, _job: RenderJob): void { /* no-op */ }
  endCluster(_sg: Graph, _job: RenderJob): void { /* no-op */ }
  textspan(_pos: Point, _span: TextSpan, _job: RenderJob): void { /* no-op */ }
  ellipse(_c: Point, _rx: number, _ry: number, _f: boolean, _j: RenderJob): void { /* no-op */ }
  polygon(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  bezier(_pts: Point[], _filled: boolean, _job: RenderJob): void { /* no-op */ }
  polyline(_pts: Point[], _job: RenderJob): void { /* no-op */ }

  /** Emit one hot spot: `<area>` (cmapx) or a plain `keyword url coords` line. */
  private emitShape(shape: MapShape, pts: Point[], a: AnchorCtx, job: RenderJob): void {
    const buf: string[] = [];
    if (this.isCmapx) mapOutputCmapx(shape, pts, a, true, buf);
    else mapOutputImap(shape, pts, a.url, buf);
    job.write(buf.join(''));
  }

  /** Whole-edge spline outline(s) then center/head/tail label hot spots.
   * @see lib/common/emit.c:emit_begin_edge (2851-2872) / emit_end_edge */
  private emitEdge(e: Edge, obj: ObjState, job: RenderJob): void {
    const spl = e.info.spl;
    const wholeEdge = obj.url !== null || obj.explicitTooltip;
    if (spl !== undefined && this.mapPolygon && wholeEdge) {
      const w2 = Math.max(obj.penWidth / 2, 2);
      const anchor = anchorOf(obj.url, obj.tooltip, obj.target, obj.id);
      for (const poly of computeEdgeSplineMaps(spl, w2, this.mapCtx!)) {
        this.emitShape(MapShape.Polygon, poly, anchor, job);
      }
    }
    const centerA: EdgeLabelAnchor = {
      url: obj.labelUrl, tooltip: obj.labelTooltip, target: obj.labelTarget, explicit: obj.explicitLabelTooltip,
    };
    this.emitEdgeLabel(e.info.label, centerA, obj, job);
    this.emitEdgeLabel(e.info.xlabel, centerA, obj, job);
    this.emitEdgeLabel(e.info.head_label,
      { url: obj.headUrl, tooltip: obj.headTooltip, target: obj.headTarget, explicit: obj.explicitHeadTooltip },
      obj, job);
    this.emitEdgeLabel(e.info.tail_label,
      { url: obj.tailUrl, tooltip: obj.tailTooltip, target: obj.tailTarget, explicit: obj.explicitTailTooltip },
      obj, job);
  }

  /** One edge label hot spot (map_label rect), if placed and url/explicit-tip.
   * @see lib/common/emit.c:emit_edge_label */
  private emitEdgeLabel(lab: TextlabelT | undefined, la: EdgeLabelAnchor, obj: ObjState, job: RenderJob): void {
    const placed = lab !== undefined && lab.set && this.mapCtx !== null;
    if (!placed || (la.url === null && !la.explicit)) return;
    computeLabelRectMap(lab, obj, this.mapCtx!);
    this.emitShape(MapShape.Rectangle, obj.urlMapPts, anchorOf(la.url, la.tooltip, la.target, obj.id), job);
  }
}

/** @see plugin/core/gvrender_core_map.c FORMAT_IMAP */
export class ImapRenderer extends MapRendererBase {
  readonly type = 'imap';
  protected readonly isCmapx = false;
  protected readonly mapPolygon = true;
}

/** @see plugin/core/gvrender_core_map.c FORMAT_IMAP (no-polygon device) */
export class ImapNpRenderer extends MapRendererBase {
  readonly type = 'imap-np';
  protected readonly isCmapx = false;
  protected readonly mapPolygon = false;
}

/** @see plugin/core/gvrender_core_map.c FORMAT_CMAPX */
export class CmapxRenderer extends MapRendererBase {
  readonly type = 'cmapx';
  protected readonly isCmapx = true;
  protected readonly mapPolygon = true;
}

/** @see plugin/core/gvrender_core_map.c FORMAT_CMAPX (no-polygon device) */
export class CmapxNpRenderer extends MapRendererBase {
  readonly type = 'cmapx-np';
  protected readonly isCmapx = true;
  protected readonly mapPolygon = false;
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** @see plugin/core/gvrender_core_dot.c FORMAT_PLAIN */
export function createPlainRenderer(): RendererPlugin { return new PlainRenderer(); }

/** @see plugin/core/gvrender_core_dot.c FORMAT_PLAIN_EXT */
export function createPlainExtRenderer(): RendererPlugin { return new PlainExtRenderer(); }

/** @see plugin/core/gvrender_core_map.c FORMAT_IMAP */
export function createImapRenderer(): RendererPlugin { return new ImapRenderer(); }

/** @see plugin/core/gvrender_core_map.c FORMAT_IMAP (no polygon) */
export function createImapNpRenderer(): RendererPlugin { return new ImapNpRenderer(); }

/** @see plugin/core/gvrender_core_map.c FORMAT_CMAPX */
export function createCmapxRenderer(): RendererPlugin { return new CmapxRenderer(); }

/** @see plugin/core/gvrender_core_map.c FORMAT_CMAPX (no polygon) */
export function createCmapxNpRenderer(): RendererPlugin { return new CmapxNpRenderer(); }
