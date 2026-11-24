// SPDX-License-Identifier: EPL-2.0
// Port twin of twice-native's seq mode for issue #191: one parsed graph, a script of
// l = ctx.layout, f = ctx.freeLayout, anything else = renderWithContext in that format,
// each render printed after a "== render N" line, as twice.c prints it.
// usage: npx tsx plans/issue-191-anchor-id-renders/harness/probe.ts <file> <engine> <ops>
import { readFileSync } from 'node:fs';
import { parse, renderWithContext } from '../../../src/index.js';
import { createDefaultContext } from '../../../src/gvc/default-context.js';
import type { EngineName } from '../../../src/gvc/context.js';

const [file, engine, ops] = process.argv.slice(2);
const g = parse(readFileSync(file, 'utf8'));
const ctx = createDefaultContext();
let n = 0;
for (const op of ops.split(',')) {
  if (op === 'l') ctx.layout(g, engine as EngineName);
  else if (op === 'f') ctx.freeLayout(g, engine as EngineName);
  else {
    n += 1;
    process.stdout.write(`== render ${n}\n${String(renderWithContext(ctx, g, op))}`);
  }
}
