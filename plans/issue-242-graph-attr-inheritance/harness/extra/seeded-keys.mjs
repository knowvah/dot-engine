// SPDX-License-Identifier: EPL-2.0
// Issue #242: the keys the head seeds into each subgraph that the base does not hold there.
//   node seeded-keys.mjs <base.mjs> <head.mjs> <in.gv...>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [baseB, headB, ...files] = process.argv.slice(2);
const base = await import(pathToFileURL(baseB).href);
const head = await import(pathToFileURL(headB).href);
const decode = (buf) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return Buffer.from(buf).toString('latin1'); } };
function walk(gb, gh, acc) {
  for (const [name, sh] of gh.subgraphs) {
    const sb = gb.subgraphs.get(name);
    for (const [k, v] of sh.attrs) {
      if (sb.attrs.get(k) !== v) {
        const e = acc.get(k) ?? { n: 0, clusters: 0, values: new Set() };
        e.n++; if (name.startsWith('cluster') || sh.attrs.get('cluster') === 'true') e.clusters++;
        e.values.add(v.length > 30 ? v.slice(0, 30) + '…' : v);
        acc.set(k, e);
      }
    }
    walk(sb, sh, acc);
  }
}
for (const f of files) {
  const src = decode(readFileSync(f));
  base.agseterrf(() => 0); head.agseterrf(() => 0);
  const acc = new Map();
  const gh = head.parse(src);
  walk(base.parse(src), gh, acc);
  const count = (g) => { let c = g.subgraphs.size; for (const s of g.subgraphs.values()) c += count(s); return c; };
  console.log(f.split('/').pop(), 'subgraphs', count(gh), 'root attrs', JSON.stringify([...gh.attrs.keys()]));
  for (const [k, e] of acc) console.log('  ', k, 'in', e.n, 'subgraphs (clusters', e.clusters + ')', 'values', JSON.stringify([...e.values]));
}
