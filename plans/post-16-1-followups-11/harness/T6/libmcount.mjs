// SPDX-License-Identifier: EPL-2.0
// Counts how often V8's Math.hypot / Math.exp miss the native values recorded in a GVTS_T6_DEEP
// trace (every step's dx, dy, mag) and expcmp's table (-lambda*t, macOS exp).
// usage: node libmcount.mjs <native trace> <exp table>
import { readFileSync } from 'node:fs';
const unhex = (h) => {
  if (h === '0x0p+0') return 0; if (h === '-0x0p+0') return -0;
  const m = /^(-?)0x1(?:\.([0-9a-f]+))?p([+-]\d+)$/.exec(h);
  return (m[1] ? -1 : 1) * (1 + parseInt((m[2] ?? '').padEnd(13, '0'), 16) * 2 ** -52) * 2 ** Number(m[3]);
};
let n = 0, miss = 0;
for (const l of readFileSync(process.argv[2], 'utf8').split('\n')) {
  if (!l.startsWith('step ')) continue;
  const p = l.split(' '); n++;
  if (!Object.is(Math.hypot(unhex(p[4]), unhex(p[5])), unhex(p[6]))) miss++;
}
console.log(`hypot: ${n} native calls, Math.hypot misses ${miss}`);
const ex = readFileSync(process.argv[3], 'utf8').trim().split('\n').map((l) => l.split(' '));
const bad = ex.filter(([, a, e]) => !Object.is(Math.exp(unhex(a)), unhex(e))).map(([t]) => t);
console.log(`exp: ${ex.length} native calls, Math.exp misses ${bad.length} (t = ${bad.join(', ')})`);
