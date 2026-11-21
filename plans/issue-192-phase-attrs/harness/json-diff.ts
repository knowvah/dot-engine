// SPDX-License-Identifier: EPL-2.0
// Semantic json comparison (golden comparator, 0.01 tolerance): prints the
// number of diffs, then one line per diff on stderr.
// Usage: npx tsx json-diff.ts <port.json> <native.json>
import { readFileSync } from 'node:fs';
import { compareJson } from '../../../test/golden/compare-json.js';

const [port = '', native = ''] = process.argv.slice(2);
const r = compareJson(readFileSync(port, 'utf8'), readFileSync(native, 'utf8'));
for (const d of r.diffs) process.stderr.write(`${d.path}: port=${d.actual} native=${d.expected}\n`);
process.stdout.write(`${r.diffs.length}\n`);
