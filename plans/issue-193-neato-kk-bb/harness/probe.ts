// SPDX-License-Identifier: EPL-2.0
// Issue #193 port probe: I193_N (default 3) layouts with no free, through the live src/
// (createDefaultContext + device render), each render after a "== render N" line as twice-native's
// nofree mode prints it.
//   npx tsx plans/issue-193-neato-kk-bb/harness/probe.ts <engine> <file> [format]
import { readFileSync } from 'node:fs';
import { parse } from '../../../src/parser/index.js';
import { createDefaultContext } from '../../../src/gvc/default-context.js';
import { render as deviceRender } from '../../../src/gvc/device.js';
import type { EngineName } from '../../../src/gvc/context.js';

const [engine = 'neato', file = '', fmt = 'plain'] = process.argv.slice(2);
const ctx = createDefaultContext();
const g = parse(readFileSync(file, 'utf8'));
const n = Number(process.env.I193_N ?? 3);
for (let i = 1; i <= n; i++) {
  ctx.layout(g, engine as EngineName);
  process.stdout.write(`== render ${i}\n${deviceRender(ctx, g, fmt)}`);
}
