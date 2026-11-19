// SPDX-License-Identifier: EPL-2.0
// Issue #180 (execution): per probe, engine and format, the lines the head
// changed against the base, judged by position against native (LCS alignment,
// not a line set: `<g id="a_graph0">` is native's line on layer 1 and not on
// layer 2).
//   node classify.mjs <base.mjs> <head.mjs> <dir with probes/ and native/> <probe.gv> <fmt> <engine...>
// Columns: probe, engine, format, base and head lines (svg: from the first
// `<g id=`), baseDiff and headDiff (diff lines against native, both sides),
// changed (lines the head changed), nowNative (changed lines aligned with an
// equal native line on the head), lostNative (lines aligned with an equal
// native line on the base that differ on the head), notNative (changed lines
// still not native's; listed below the row as `base => head`).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [base, head, dir, probe, fmt, ...engines] = process.argv.slice(2);
const RENDER1 = fileURLToPath(new URL('../render1.mjs', import.meta.url));
const body = (s) => (fmt === 'svg' ? s.slice(s.indexOf('<g id=')) : s).split('\n');
/** Indices of `a` that the LCS of a and b keeps. */
function matched(a, b) {
  const n = a.length, m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const keep = new Set();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { keep.add(i); i++; j++; } else if (t[i + 1][j] >= t[i][j + 1]) i++; else j++;
  }
  return keep;
}
for (const engine of engines) {
  const r = (b) => execFileSync(process.execPath, [RENDER1, b, engine, fmt.replace('_np', '-np'), `${dir}/probes/${probe}`], { maxBuffer: 1 << 26 }).toString();
  const nat = body(readFileSync(`${dir}/native/${probe}.${engine}.${fmt}`, 'utf8'));
  const b = body(r(base)), h = body(r(head));
  const bm = matched(b, nat), hm = matched(h, nat);
  const baseDiff = b.length + nat.length - 2 * bm.size, headDiff = h.length + nat.length - 2 * hm.size;
  if (b.length !== h.length) {
    console.log([probe, engine, fmt, b.length, h.length, baseDiff, headDiff, 'LINE COUNT CHANGED'].join('\t'));
    continue;
  }
  let changed = 0, nowNative = 0, lostNative = 0;
  const notNative = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] === h[i]) continue;
    changed++;
    if (bm.has(i)) lostNative++;
    if (hm.has(i)) nowNative++; else notNative.push(`${b[i]} => ${h[i]}`);
  }
  console.log([probe, engine, fmt, b.length, h.length, baseDiff, headDiff, changed, nowNative, lostNative, notNative.length].join('\t'));
  for (const l of notNative) console.log(`    ${l}`);
}
