// SPDX-License-Identifier: EPL-2.0
// Failure classes of a fuzz run: npx tsx test/tools/fuzz/classify.ts <outdir>
import fs from 'node:fs';
import { tallyRows } from '../lib/classify.js';

const dir = process.argv[2] ?? '';
const out: Record<string, { bad: number; classes: Record<string, number> }> = {};
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
  out[f] = tallyRows(fs.readFileSync(`${dir}/${f}`, 'utf8'));
}
console.log(JSON.stringify(out, null, 1));
