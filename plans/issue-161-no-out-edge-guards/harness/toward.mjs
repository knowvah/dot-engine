// SPDX-License-Identifier: EPL-2.0
// toward.mjs <base> <head> <native>: the queue rules' toward-native test on one
// job, as multisets of lines. Prints "ok" when
//   (a) every head line that the base does not have is a native line, and
//   (b) every base line that is a native line is still in the head;
// otherwise "FAIL a=<count> b=<count>" (lines breaking (a), lines breaking (b)).
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'latin1').split('\n');
const bag = (lines) => {
  const m = new Map();
  for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1);
  return m;
};
const [b, h, n] = process.argv.slice(2).map(read);
const B = bag(b), H = bag(h), N = bag(n);
let a = 0, bb = 0;
for (const [l, c] of H) {
  const extra = c - (B.get(l) ?? 0);
  if (extra > 0) a += Math.max(0, extra - (N.get(l) ?? 0));
}
for (const [l, c] of B) {
  const kept = Math.min(c, N.get(l) ?? 0);
  bb += Math.max(0, kept - (H.get(l) ?? 0));
}
console.log(a === 0 && bb === 0 ? 'ok' : `FAIL a=${a} b=${bb}`);
