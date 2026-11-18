// SPDX-License-Identifier: EPL-2.0
// Issue #258 reach: parse every input under the given roots with two bundles
// and compare the parsed Graph models (node ids and order, edges with seq and
// attrs, subgraph tree with seq, attrs, seeded keys, snapshot, node and edge
// membership, defaults). An input whose models are equal cannot render
// differently, because the change is in the builder only.
//   node model-reach.mjs <base.mjs> <head.mjs> <root...>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const INPUT_RE = /\.(gv|dot)$/;
const [baseB, headB, ...roots] = process.argv.slice(2);
const base = await import(pathToFileURL(baseB).href);
const head = await import(pathToFileURL(headB).href);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (INPUT_RE.test(name)) yield p;
  }
}

function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

const edgeKey = (e) => `${e.tail.id}>${e.head.id}#${e.key ?? ''}@${e.graphSeq ?? ''}`;

function model(g) {
  return {
    name: g.name, seq: g.seq,
    attrs: [...g.attrs], seeded: [...(g.seededAttrs ?? [])].sort(),
    snap: g.graphDefaultsSnapshot ? [...g.graphDefaultsSnapshot] : null,
    first: [...(g.firstGraphDecl ?? [])],
    nd: [...g.nodeDefaults], ed: [...g.edgeDefaults],
    nodes: [...g.nodes.values()].map((n) => n.id),
    edges: g.edges.map(edgeKey),
    subs: [...g.subgraphs.values()].map(model),
  };
}

function rootModel(g) {
  return {
    ...model(g),
    nodeAttrs: [...g.nodes.values()].map((n) => [n.id, n.name, [...n.attrs],
      [...(n.nodeDefaultsSnapshot ?? [])]]),
    edgeAttrs: g.edges.map((e) => [edgeKey(e), [...e.attrs]]),
  };
}

function parsed(mod, src) {
  mod.agseterrf(() => 0);
  try {
    return JSON.stringify(rootModel(mod.parse(src)));
  } catch (err) {
    return `THROW ${err?.message}`;
  }
}

let files = 0;
let diff = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    files++;
    const src = decode(readFileSync(file));
    if (parsed(base, src) !== parsed(head, src)) {
      diff++;
      console.log(`DIFF\t${file}`);
    }
  }
}
console.log(`# files ${files}, model differs ${diff}`);
