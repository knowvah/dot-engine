// SPDX-License-Identifier: EPL-2.0
// Issue #199: toward-native.ts for one job whose native output is already on disk (2621 under dot and
// circo, where native needs 8 to 40 minutes; 2239 under fdp, where native segfaults on most runs).
//   node one-row.mjs <native-output> <base-output> <head-output>
// The base and head outputs are a bytediff run's <out>.d/<n>.a.txt and .b.txt.
import { readFileSync } from 'node:fs';
const sortKeys = (_k, v) => (v === null || typeof v !== 'object' || Array.isArray(v)) ? v : Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
const parse = (s) => JSON.parse(s.replace(/"(?:[^"\\]|\\.)*"|-?\b(?:inf|nan)\b/g, (m) => (m.startsWith('"') ? m : `"${m}"`)));
const read = (f) => readFileSync(f, 'utf8').split('\n--stderr--\n');
const lines = (s) => JSON.stringify(parse(s), sortKeys, 1).split('\n');
const members = (s) => JSON.stringify((parse(s).objects ?? []).map((o) => [o._gvid, o.name, o.subgraphs, o.nodes, o.edges]));
const [nf, af, bf] = process.argv.slice(2);
const [nOut] = read(nf); const [aOut, aErr] = read(af); const [bOut, bErr] = read(bf);
const nat = lines(nOut), a = lines(aOut), b = lines(bOut);
const neq = (x) => x.filter((l, i) => l !== nat[i]).length;
let verdict = 'SHAPE';
if (a.length === nat.length && b.length === nat.length) {
  const away = b.some((l, i) => l !== a[i] && (l !== nat[i] || a[i] === nat[i]));
  verdict = away ? 'AWAY' : neq(b) === 0 ? 'native' : 'toward';
}
if (aErr !== bErr) verdict += '+STDERR';
const changed = a.length === b.length ? a.filter((l, i) => l !== b[i]).length : -1;
console.log([verdict, `lines nat=${nat.length} a=${a.length} b=${b.length}`, `neq base=${neq(a)} head=${neq(b)}`, `members base=${members(aOut) === members(nOut) ? 'eq' : 'ne'} head=${members(bOut) === members(nOut) ? 'eq' : 'ne'}`, `a!=b lines=${changed}`].join('\t'));
