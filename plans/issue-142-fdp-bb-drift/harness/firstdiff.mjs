// SPDX-License-Identifier: EPL-2.0
// Prints the first differing line of two trace files (native, port), the count of differing lines,
// and the count per label (first token). Exit 0 when the files are equal, 1 otherwise.
// usage: node firstdiff.mjs <native.tr> <port.tr> [context-lines]
import fs from 'node:fs';

const [a, b, ctx = '2'] = process.argv.slice(2);
const A = fs.readFileSync(a, 'utf8').split('\n');
const B = fs.readFileSync(b, 'utf8').split('\n');
const n = Math.max(A.length, B.length);
let first = -1;
let count = 0;
const perLabel = new Map();
for (let i = 0; i < n; i++) {
  if (A[i] === B[i]) continue;
  count++;
  if (first < 0) first = i;
  const label = (A[i] ?? B[i]).split(' ')[0];
  perLabel.set(label, (perLabel.get(label) ?? 0) + 1);
}
console.log(`lines native=${A.length - 1} port=${B.length - 1} differing=${count}`);
if (first < 0) process.exit(0);
for (let i = Math.max(0, first - Number(ctx)); i < first; i++) console.log(`  = ${i + 1}: ${A[i]}`);
console.log(`first difference at line ${first + 1}:`);
console.log(`  native: ${A[first]}`);
console.log(`  port:   ${B[first]}`);
console.log('differing lines per label:', Object.fromEntries(perLabel));
process.exit(1);
