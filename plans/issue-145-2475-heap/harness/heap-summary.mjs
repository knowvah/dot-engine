// SPDX-License-Identifier: EPL-2.0
// Summarize a V8 .heapsnapshot without JSON.parse-ing it whole (issue #145, AD-2).
//
//   node --max-old-space-size=16384 heap-summary.mjs <file.heapsnapshot> [topN] [ownerOf...]
//
// Each `ownerOf` is a group key ("array:", "number:*", "object:Map"); for it the
// script prints the nodes' self size by owner, the owner being the node's parent
// on the shortest path from the GC roots and the edge that leads from it.
//
// Prints: total self size; the top N groups by self size, keyed by
// (node type, name) and, for plain `Object`s, by hidden class (shown as the
// property names of one sample); and one shortest retainer path from the GC
// roots for a sample node of each of the top 10 groups.
//
// The file is read in chunks: the `nodes` and `edges` arrays go straight into
// Uint32Arrays and `strings` through a small JSON-string tokenizer, so a
// snapshot larger than V8's maximum string length can be read.

import { openSync, readSync, fstatSync, closeSync } from 'node:fs';

const file = process.argv[2];
const topN = Number(process.argv[3] ?? 30);
const ownerOf = process.argv.slice(4);
if (!file) {
  process.stderr.write('usage: heap-summary.mjs <file.heapsnapshot> [topN]\n');
  process.exit(2);
}

const CHUNK = 1 << 26;
const fd = openSync(file, 'r');
const size = fstatSync(fd).size;
const buf = Buffer.allocUnsafe(CHUNK);
let bufLen = 0;
let bufPos = 0;
let filePos = 0;

/** Next byte of the file, or -1 at the end. */
function next() {
  if (bufPos === bufLen) {
    if (filePos >= size) return -1;
    bufLen = readSync(fd, buf, 0, CHUNK, filePos);
    filePos += bufLen;
    bufPos = 0;
    if (bufLen === 0) return -1;
  }
  return buf[bufPos++];
}

/** Skip forward until the ASCII `needle` has just been read. */
function seek(needle) {
  const n = Buffer.from(needle);
  let m = 0;
  for (;;) {
    const c = next();
    if (c === -1) throw new Error(`"${needle}" not found`);
    if (c === n[m]) { m++; if (m === n.length) return; } else m = c === n[0] ? 1 : 0;
  }
}

/** Read the snapshot header object (`"snapshot":{...}`) as JSON. */
function readHeader() {
  seek('"snapshot":');
  const parts = [];
  let depth = 0;
  for (;;) {
    const c = next();
    parts.push(c);
    if (c === 0x7b) depth++;
    else if (c === 0x7d) { depth--; if (depth === 0) break; }
  }
  return JSON.parse(Buffer.from(parts).toString('utf8'));
}

/** Read a JSON array of unsigned ints (already positioned after `[`). */
function readInts(count) {
  const out = new Uint32Array(count);
  let i = 0;
  let v = 0;
  let inNum = false;
  for (;;) {
    const c = next();
    if (c >= 0x30 && c <= 0x39) { v = v * 10 + (c - 0x30); inNum = true; continue; }
    if (inNum) { out[i++] = v; v = 0; inNum = false; }
    if (c === 0x5d || c === -1) break;
  }
  if (i !== count) throw new Error(`expected ${count} ints, read ${i}`);
  return out;
}

/** Read a JSON array of strings (already positioned after `[`). */
function readStrings() {
  const out = [];
  let cur = null;
  let esc = false;
  for (;;) {
    const c = next();
    if (c === -1) break;
    if (cur === null) {
      if (c === 0x22) cur = [0x22];
      else if (c === 0x5d) break;
      continue;
    }
    cur.push(c);
    if (esc) { esc = false; continue; }
    if (c === 0x5c) { esc = true; continue; }
    if (c === 0x22) {
      // Long strings are truncated for display; the content is not needed.
      out.push(cur.length > 4096 ? '(long string)' : JSON.parse(Buffer.from(cur).toString('utf8')));
      cur = null;
    }
  }
  return out;
}

const header = readHeader();
const meta = header.meta;
const NF = meta.node_fields.length;
const EF = meta.edge_fields.length;
const nodeTypes = meta.node_types[0];
const edgeTypes = meta.edge_types[0];
const N_TYPE = meta.node_fields.indexOf('type');
const N_NAME = meta.node_fields.indexOf('name');
const N_SELF = meta.node_fields.indexOf('self_size');
const N_EDGES = meta.node_fields.indexOf('edge_count');
const E_TYPE = meta.edge_fields.indexOf('type');
const E_NAME = meta.edge_fields.indexOf('name_or_index');
const E_TO = meta.edge_fields.indexOf('to_node');

seek('"nodes":[');
const nodes = readInts(header.node_count * NF);
seek('"edges":[');
const edges = readInts(header.edge_count * EF);
seek('"strings":[');
const strings = readStrings();
closeSync(fd);

const nodeCount = header.node_count;
const firstEdge = new Uint32Array(nodeCount + 1);
for (let i = 0; i < nodeCount; i++) firstEdge[i + 1] = firstEdge[i] + nodes[i * NF + N_EDGES];

const T_OBJECT = nodeTypes.indexOf('object');
const ET_PROPERTY = edgeTypes.indexOf('property');
const ET_INTERNAL = edgeTypes.indexOf('internal');
const ET_WEAK = edgeTypes.indexOf('weak');
const ET_ELEMENT = edgeTypes.indexOf('element');
const ET_HIDDEN = edgeTypes.indexOf('hidden');
const ET_SHORTCUT = edgeTypes.indexOf('shortcut');

/** Hidden-class node index of an object, or -1. */
function mapOf(i) {
  for (let e = firstEdge[i]; e < firstEdge[i + 1]; e++) {
    if (edges[e * EF + E_TYPE] === ET_INTERNAL && strings[edges[e * EF + E_NAME]] === 'map') {
      return edges[e * EF + E_TO] / NF;
    }
  }
  return -1;
}

/** Property names of one object, for labelling a plain-Object group. */
function propsOf(i) {
  const names = [];
  for (let e = firstEdge[i]; e < firstEdge[i + 1]; e++) {
    if (edges[e * EF + E_TYPE] === ET_PROPERTY) names.push(strings[edges[e * EF + E_NAME]]);
  }
  return names.filter((n) => n !== '__proto__').slice(0, 14).join(',');
}

/** Group key of node `i`: (type, name), or the hidden class for a plain Object. */
function keyOf(i) {
  const type = nodes[i * NF + N_TYPE];
  const name = strings[nodes[i * NF + N_NAME]];
  const tn = nodeTypes[type];
  if (type === T_OBJECT && name === 'Object') return `object:Object#${mapOf(i)}`;
  if (tn === 'string' || tn === 'concatenated string' || tn === 'sliced string') return `${tn}:*`;
  if (tn === 'number' || tn === 'code' || tn === 'closure') return `${tn}:*`;
  return `${tn}:${name}`;
}

const groups = new Map();
let total = 0;
for (let i = 0; i < nodeCount; i++) {
  const self = nodes[i * NF + N_SELF];
  total += self;
  const key = keyOf(i);
  let g = groups.get(key);
  if (!g) { g = { key, self: 0, count: 0, sample: i }; groups.set(key, g); }
  g.self += self;
  g.count++;
}

// Shortest retainer paths from the root (node 0), skipping weak and shortcut edges.
const parent = new Int32Array(nodeCount).fill(-1);
const parentEdge = new Int32Array(nodeCount).fill(-1);
const queue = new Uint32Array(nodeCount);
let qh = 0;
let qt = 0;
queue[qt++] = 0;
parent[0] = 0;
while (qh < qt) {
  const i = queue[qh++];
  for (let e = firstEdge[i]; e < firstEdge[i + 1]; e++) {
    const et = edges[e * EF + E_TYPE];
    if (et === ET_WEAK || et === ET_SHORTCUT) continue;
    const to = edges[e * EF + E_TO] / NF;
    if (parent[to] !== -1) continue;
    parent[to] = i;
    parentEdge[to] = e;
    queue[qt++] = to;
  }
}

function edgeLabel(e) {
  const et = edges[e * EF + E_TYPE];
  const n = edges[e * EF + E_NAME];
  return et === ET_ELEMENT || et === ET_HIDDEN ? `[${n}]` : `.${strings[n]}`;
}

function describe(i) {
  return `${nodeTypes[nodes[i * NF + N_TYPE]]}:${strings[nodes[i * NF + N_NAME]].slice(0, 40)}`;
}

function retainerPath(i) {
  const hops = [];
  let cur = i;
  let guard = 0;
  while (cur !== 0 && parent[cur] !== -1 && guard++ < 40) {
    hops.push(`${describe(parent[cur])}${edgeLabel(parentEdge[cur])}`);
    cur = parent[cur];
  }
  return hops.reverse().join(' -> ');
}

const mb = (n) => (n / 1048576).toFixed(1);

/** Self size of the nodes of group `key`, by (owner group, owner's edge). */
function owners(key) {
  const by = new Map();
  for (let i = 0; i < nodeCount; i++) {
    if (parent[i] === -1 || keyOf(i) !== key) continue;
    const e = parentEdge[i];
    const et = e === -1 ? -1 : edges[e * EF + E_TYPE];
    const label = e === -1 ? '' : et === ET_ELEMENT || et === ET_HIDDEN ? '[]' : edgeLabel(e);
    let pk = keyOf(parent[i]);
    if (pk.startsWith('object:Object#')) pk = `Object{${propsOf(parent[i]).slice(0, 60)}}`;
    const k = `${pk}${label}`;
    let o = by.get(k);
    if (!o) { o = { k, self: 0, count: 0 }; by.set(k, o); }
    o.self += nodes[i * NF + N_SELF];
    o.count++;
  }
  return [...by.values()].sort((a, b) => b.self - a.self).slice(0, 8);
}
const sorted = [...groups.values()].sort((a, b) => b.self - a.self).slice(0, topN);
process.stdout.write(`file ${file}\nnodes ${nodeCount} edges ${header.edge_count} ` +
  `self total ${mb(total)} MB\n\n`);
process.stdout.write('rank  selfMB    %   count      bytes/obj  group\n');
sorted.forEach((g, r) => {
  const label = g.key.startsWith('object:Object#') ? `${g.key} {${propsOf(g.sample)}}` : g.key;
  process.stdout.write(`${String(r + 1).padStart(4)} ${mb(g.self).padStart(7)} ` +
    `${((100 * g.self) / total).toFixed(1).padStart(4)} ${String(g.count).padStart(9)} ` +
    `${(g.self / g.count).toFixed(0).padStart(9)}  ${label}\n`);
});
process.stdout.write('\nretainer path of one sample per top-10 group\n');
sorted.slice(0, 10).forEach((g, r) => {
  process.stdout.write(`${r + 1}. ${g.key}\n   ${retainerPath(g.sample)}\n`);
});
for (const key of ownerOf) {
  process.stdout.write(`\nowners of ${key}\n`);
  for (const o of owners(key)) {
    process.stdout.write(`  ${mb(o.self).padStart(7)} MB ${String(o.count).padStart(9)}  ${o.k}\n`);
  }
}
