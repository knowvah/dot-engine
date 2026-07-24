// SPDX-License-Identifier: EPL-2.0
//
// Semantic `plain`/`plain-ext` comparator (mission: format-parity-matrix, T1 /
// decisions.md AD-1, AD-4).
//
// `plain` is a fixed positional-field text format, not DOT — see
// lib/common/output.c `write_plain` (~line 129):
//
//   graph <scale> <width> <height>
//   node <name> <x> <y> <width> <height> <label> <style> <shape> <color> <fillcolor>
//   edge <tail> <head> <n> <x1> <y1> .. <xn> <yn> [<label> <lx> <ly>] <style> <color>
//   stop
//
// `plain-ext` differs only in that the edge `tail`/`head` fields may carry a
// port suffix (`node:port`) — see `writenodeandport`. Names/labels are run
// through `agstrcanon`, which double-quotes and backslash-escapes a token
// only when needed (embedded space, quote, etc); this comparator tokenizes
// accordingly rather than doing a naive whitespace split.
//
// AD-1: parse into structured records and compare fields positionally, with
// 0.01 numeric tolerance and exact non-numeric comparison — same model as
// `compare-xdot.ts`'s op/attr comparison.
// AD-4: `iterative: true` switches to position-agnostic structural
// comparison — record/field PRESENCE and all non-numeric fields still
// compare exactly; only coordinate/dimension NUMBERS (x/y/width/height/
// lx/ly and spline points) are skipped. A non-numeric divergence (shape,
// label, style, color, port) is a real semantic difference and fails in
// BOTH modes.
//
// Node-only dev/test infra — never imported by src/index.ts.

import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export const PLAIN_TOLERANCE = 0.01;

/** One semantic difference between the port's plain output and the native's. */
export interface PlainDiff {
  /** Record type the diff belongs to, or whole-record presence. */
  kind: 'graph' | 'node' | 'edge' | 'missing' | 'extra';
  /** Record identity: `[graph]`, node name, or `tail->head#occurrence`. */
  id: string;
  /** Field name within the record (`x`, `label`, `shape`, `pointCount`, ...). */
  field: string;
  /** Stringified port-side value (or `<absent>`). */
  port: string;
  /** Stringified native-side value (or `<absent>`). */
  native: string;
}

export interface PlainCompareResult {
  verdict: 'pass' | 'diverged';
  diffs: PlainDiff[];
}

export interface PlainCompareOptions {
  /** AD-4: skip numeric coordinate/dimension comparison when true. */
  iterative: boolean;
}

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

interface GraphRecord {
  scale: number;
  width: number;
  height: number;
}

interface NodeRecord {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  style: string;
  shape: string;
  color: string;
  fillcolor: string;
}

interface EdgePoint {
  x: number;
  y: number;
}

interface EdgeRecord {
  tail: string;
  tailPort: string | null;
  head: string;
  headPort: string | null;
  points: EdgePoint[];
  label: string | null;
  lx: number | null;
  ly: number | null;
  style: string;
  color: string;
}

interface ParsedPlain {
  graph: GraphRecord | null;
  nodes: Map<string, NodeRecord>;
  edges: EdgeRecord[];
}

// ---------------------------------------------------------------------------
// Tokenizer (AD-1: quote/escape-aware, mirrors agstrcanon's output shape)
// ---------------------------------------------------------------------------

/**
 * Split one `plain` line into fields. A field is a maximal whitespace-free
 * run that may contain quoted segments (`"..."`, with `\` escaping the next
 * character) mixed with bare characters — this handles both a lone quoted
 * label (`"my label"`) and a plain-ext `tail:port` field where either half
 * may independently be quoted (`"my node":port`).
 */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && /\s/.test(line[i]!)) i++;
    if (i >= n) break;
    let tok = '';
    while (i < n && !/\s/.test(line[i]!)) {
      if (line[i] === '"') {
        tok += line[i];
        i++;
        while (i < n) {
          const c = line[i]!;
          if (c === '\\' && i + 1 < n) {
            tok += c + line[i + 1];
            i += 2;
            continue;
          }
          tok += c;
          i++;
          if (c === '"') break;
        }
      } else {
        tok += line[i];
        i++;
      }
    }
    tokens.push(tok);
  }
  return tokens;
}

/** Remove surrounding quotes and unescape a quoted (or bare) token. */
function dequote(tok: string): string {
  if (tok.length < 2 || !tok.startsWith('"') || !tok.endsWith('"')) return tok;
  let out = '';
  for (let i = 1; i < tok.length - 1; i++) {
    if (tok[i] === '\\' && i + 1 < tok.length - 1) {
      out += tok[i + 1];
      i++;
    } else {
      out += tok[i];
    }
  }
  return out;
}

/**
 * Split a combined `name` or `name:port` field at the top-level colon (a
 * colon inside a quoted name must not be treated as the port separator).
 */
function splitNodePort(tok: string): { name: string; port: string | null } {
  let i = 0;
  const n = tok.length;
  while (i < n) {
    const c = tok[i];
    if (c === '"') {
      i++;
      while (i < n) {
        if (tok[i] === '\\' && i + 1 < n) {
          i += 2;
          continue;
        }
        if (tok[i] === '"') {
          i++;
          break;
        }
        i++;
      }
    } else if (c === ':') {
      return { name: dequote(tok.slice(0, i)), port: dequote(tok.slice(i + 1)) };
    } else {
      i++;
    }
  }
  return { name: dequote(tok), port: null };
}

// ---------------------------------------------------------------------------
// Line parsers
// ---------------------------------------------------------------------------

function parseGraphLine(tokens: string[]): GraphRecord {
  return {
    scale: Number(tokens[1]),
    width: Number(tokens[2]),
    height: Number(tokens[3]),
  };
}

function parseNodeLine(tokens: string[]): NodeRecord {
  return {
    name: dequote(tokens[1] ?? ''),
    x: Number(tokens[2]),
    y: Number(tokens[3]),
    width: Number(tokens[4]),
    height: Number(tokens[5]),
    label: dequote(tokens[6] ?? ''),
    style: dequote(tokens[7] ?? ''),
    shape: dequote(tokens[8] ?? ''),
    color: dequote(tokens[9] ?? ''),
    fillcolor: dequote(tokens[10] ?? ''),
  };
}

function parseEdgeLine(tokens: string[]): EdgeRecord {
  let idx = 1;
  const tailField = splitNodePort(tokens[idx++] ?? '');
  const headField = splitNodePort(tokens[idx++] ?? '');
  const n = Number(tokens[idx++]);
  const points: EdgePoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = Number(tokens[idx++]);
    const y = Number(tokens[idx++]);
    points.push({ x, y });
  }
  const remaining = tokens.length - idx;
  let label: string | null = null;
  let lx: number | null = null;
  let ly: number | null = null;
  let style = '';
  let color = '';
  if (remaining >= 5) {
    label = dequote(tokens[idx++] ?? '');
    lx = Number(tokens[idx++]);
    ly = Number(tokens[idx++]);
    style = dequote(tokens[idx++] ?? '');
    color = dequote(tokens[idx++] ?? '');
  } else {
    style = dequote(tokens[idx++] ?? '');
    color = dequote(tokens[idx++] ?? '');
  }
  return {
    tail: tailField.name,
    tailPort: tailField.port,
    head: headField.name,
    headPort: headField.port,
    points,
    label,
    lx,
    ly,
    style,
    color,
  };
}

/** Parse full `plain`/`plain-ext` text into keyed records. */
function parsePlain(text: string): ParsedPlain {
  const nodes = new Map<string, NodeRecord>();
  const edges: EdgeRecord[] = [];
  let graph: GraphRecord | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') continue;
    const tokens = tokenize(line);
    if (tokens.length === 0) continue;
    switch (tokens[0]) {
      case 'graph':
        graph = parseGraphLine(tokens);
        break;
      case 'node': {
        const rec = parseNodeLine(tokens);
        nodes.set(rec.name, rec);
        break;
      }
      case 'edge':
        edges.push(parseEdgeLine(tokens));
        break;
      case 'stop':
        break;
      default:
        // Unrecognized line kind — ignore rather than throw; a malformed
        // input surfaces instead as missing records downstream.
        break;
    }
  }
  return { graph, nodes, edges };
}

// ---------------------------------------------------------------------------
// Field comparison helpers
// ---------------------------------------------------------------------------

/** Compare a coordinate/dimension number; no-op under `iterative` (AD-4). */
function numField(
  kind: PlainDiff['kind'],
  id: string,
  field: string,
  port: number | null,
  native: number | null,
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  if (iterative) return;
  if (port === null && native === null) return;
  if (port === null || native === null) {
    diffs.push({
      kind,
      id,
      field,
      port: port === null ? '<absent>' : String(port),
      native: native === null ? '<absent>' : String(native),
    });
    return;
  }
  if (Math.abs(port - native) > PLAIN_TOLERANCE) {
    diffs.push({ kind, id, field, port: String(port), native: String(native) });
  }
}

/** Compare a non-numeric field; always active regardless of mode (AD-4). */
function strField(
  kind: PlainDiff['kind'],
  id: string,
  field: string,
  port: string | null,
  native: string | null,
  diffs: PlainDiff[],
): void {
  const p = port ?? '<absent>';
  const n = native ?? '<absent>';
  if (p !== n) diffs.push({ kind, id, field, port: p, native: n });
}

// ---------------------------------------------------------------------------
// Record comparators
// ---------------------------------------------------------------------------

function compareGraph(
  port: GraphRecord | null,
  native: GraphRecord | null,
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  if (port === null && native === null) return;
  if (port === null || native === null) {
    diffs.push({
      kind: port === null ? 'missing' : 'extra',
      id: '[graph]',
      field: 'graph',
      port: port === null ? '<absent>' : 'present',
      native: native === null ? '<absent>' : 'present',
    });
    return;
  }
  numField('graph', '[graph]', 'scale', port.scale, native.scale, iterative, diffs);
  numField('graph', '[graph]', 'width', port.width, native.width, iterative, diffs);
  numField('graph', '[graph]', 'height', port.height, native.height, iterative, diffs);
}

function compareNodeFields(
  id: string,
  port: NodeRecord,
  native: NodeRecord,
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  numField('node', id, 'x', port.x, native.x, iterative, diffs);
  numField('node', id, 'y', port.y, native.y, iterative, diffs);
  numField('node', id, 'width', port.width, native.width, iterative, diffs);
  numField('node', id, 'height', port.height, native.height, iterative, diffs);
  strField('node', id, 'label', port.label, native.label, diffs);
  strField('node', id, 'style', port.style, native.style, diffs);
  strField('node', id, 'shape', port.shape, native.shape, diffs);
  strField('node', id, 'color', port.color, native.color, diffs);
  strField('node', id, 'fillcolor', port.fillcolor, native.fillcolor, diffs);
}

function compareNodes(
  port: Map<string, NodeRecord>,
  native: Map<string, NodeRecord>,
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  const names = new Set<string>([...port.keys(), ...native.keys()]);
  for (const name of [...names].sort()) {
    const p = port.get(name);
    const n = native.get(name);
    if (p === undefined || n === undefined) {
      diffs.push({
        kind: p === undefined ? 'missing' : 'extra',
        id: name,
        field: 'node',
        port: p === undefined ? '<absent>' : 'present',
        native: n === undefined ? '<absent>' : 'present',
      });
      continue;
    }
    compareNodeFields(name, p, n, iterative, diffs);
  }
}

/**
 * Key edges `tail->head#occurrence`, disambiguating parallel edges by order
 * of appearance — same basis on both sides for identical input, mirroring
 * `compare-xdot.ts`'s `collectEdges`.
 */
function keyEdges(edges: EdgeRecord[]): Map<string, EdgeRecord> {
  const counter = new Map<string, number>();
  const out = new Map<string, EdgeRecord>();
  for (const e of edges) {
    const base = `${e.tail}->${e.head}`;
    const idx = counter.get(base) ?? 0;
    counter.set(base, idx + 1);
    out.set(`${base}#${idx}`, e);
  }
  return out;
}

function compareEdgeFields(
  id: string,
  port: EdgeRecord,
  native: EdgeRecord,
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  strField('edge', id, 'tailPort', port.tailPort, native.tailPort, diffs);
  strField('edge', id, 'headPort', port.headPort, native.headPort, diffs);
  // Point count is structural (route shape), not a coordinate value, so it
  // is compared in BOTH modes — only the individual x/y values are skipped
  // under `iterative` (AD-4).
  strField(
    'edge',
    id,
    'pointCount',
    String(port.points.length),
    String(native.points.length),
    diffs,
  );
  if (port.points.length === native.points.length) {
    for (let i = 0; i < port.points.length; i++) {
      numField('edge', id, `point[${i}].x`, port.points[i]!.x, native.points[i]!.x, iterative, diffs);
      numField('edge', id, `point[${i}].y`, port.points[i]!.y, native.points[i]!.y, iterative, diffs);
    }
  }
  strField('edge', id, 'label', port.label, native.label, diffs);
  numField('edge', id, 'lx', port.lx, native.lx, iterative, diffs);
  numField('edge', id, 'ly', port.ly, native.ly, iterative, diffs);
  strField('edge', id, 'style', port.style, native.style, diffs);
  strField('edge', id, 'color', port.color, native.color, diffs);
}

function compareEdges(
  port: EdgeRecord[],
  native: EdgeRecord[],
  iterative: boolean,
  diffs: PlainDiff[],
): void {
  const portMap = keyEdges(port);
  const nativeMap = keyEdges(native);
  const keys = new Set<string>([...portMap.keys(), ...nativeMap.keys()]);
  for (const key of [...keys].sort()) {
    const p = portMap.get(key);
    const n = nativeMap.get(key);
    if (p === undefined || n === undefined) {
      diffs.push({
        kind: p === undefined ? 'missing' : 'extra',
        id: key,
        field: 'edge',
        port: p === undefined ? '<absent>' : 'present',
        native: n === undefined ? '<absent>' : 'present',
      });
      continue;
    }
    compareEdgeFields(key, p, n, iterative, diffs);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare the port's `plain`/`plain-ext` output against native's,
 * semantically (AD-1, AD-4).
 *
 * @param portOut   full `-Tplain`/`-Tplain-ext` text from the port
 * @param nativeOut full `-Tplain`/`-Tplain-ext` text from native graphviz
 * @param opts      `{ iterative }` — see AD-4
 */
export function comparePlain(
  portOut: string,
  nativeOut: string,
  opts: PlainCompareOptions,
): PlainCompareResult {
  const diffs: PlainDiff[] = [];
  const port = parsePlain(portOut);
  const native = parsePlain(nativeOut);

  compareGraph(port.graph, native.graph, opts.iterative, diffs);
  compareNodes(port.nodes, native.nodes, opts.iterative, diffs);
  compareEdges(port.edges, native.edges, opts.iterative, diffs);

  return { verdict: diffs.length === 0 ? 'pass' : 'diverged', diffs };
}

// ---------------------------------------------------------------------------
// CLI entry point — compare two plain files (port vs native)
// ---------------------------------------------------------------------------

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , portPath, nativePath, mode] = process.argv;
  if (!portPath || !nativePath) {
    process.stderr.write('Usage: tsx compare-plain.ts <portPlain> <nativePlain> [iterative]\n');
    process.exit(2);
  }
  const { verdict, diffs } = comparePlain(
    readFileSync(portPath, 'utf8'),
    readFileSync(nativePath, 'utf8'),
    { iterative: mode === 'iterative' },
  );
  if (verdict !== 'pass') {
    for (const d of diffs.slice(0, 20)) {
      process.stderr.write(`DIFF [${d.kind}] ${d.id}/${d.field}: port=${d.port} native=${d.native}\n`);
    }
    if (diffs.length > 20) process.stderr.write(`... and ${diffs.length - 20} more\n`);
    process.exit(1);
  }
  process.exit(0);
}
