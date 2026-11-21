// SPDX-License-Identifier: EPL-2.0
// Issue #190 port probe: no-free relayouts through the live src/ (createDefaultContext + device render).
//   npx tsx plans/issue-190-node-relabel/harness/probe.ts <mode> <engine> <file> [format]
//   relabel: layout, render; set node a's I190_ATTR (default label) to I190_VALUE; then
//            I190_N - 1 more layouts (default 1), rendering after each.
//   warn3:   I190_N layouts (default 3), rendering after each, attributes unchanged.
// I190_RENDERS=<r> renders each layout r times (default 1).
// Each render follows a "== render N" line, as relabel-native prints it.
import { readFileSync } from 'node:fs';
import { parse } from '../../../src/parser/index.js';
import { createDefaultContext } from '../../../src/gvc/default-context.js';
import { render as deviceRender } from '../../../src/gvc/device.js';
import type { EngineName } from '../../../src/gvc/context.js';

const [mode = '', engine = 'dot', file = '', fmt = 'plain'] = process.argv.slice(2);
const ctx = createDefaultContext();
const g = parse(readFileSync(file, 'utf8'));
const n = Number(process.env.I190_N ?? (mode === 'relabel' ? 2 : 3));
const renders = Number(process.env.I190_RENDERS ?? 1);
let k = 0;
for (let i = 1; i <= n; i++) {
  ctx.layout(g, engine as EngineName);
  for (let r = 0; r < renders; r++) process.stdout.write(`== render ${++k}\n${deviceRender(ctx, g, fmt)}`);
  if (i === 1 && mode === 'relabel') {
    const a = g.nodes.get('a');
    if (a === undefined) throw new Error('probe needs a node named a');
    a.attrs.set(process.env.I190_ATTR ?? 'label', process.env.I190_VALUE ?? 'a much longer label than before');
  }
}
