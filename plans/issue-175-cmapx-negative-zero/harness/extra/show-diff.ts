// SPDX-License-Identifier: EPL-2.0
// Issue #175: the port's stdout beside native's for one probe, where they differ.
//   npx tsx plans/issue-175-cmapx-negative-zero/harness/extra/show-diff.ts <probe> <fmt> [engine...]
import { readFileSync } from 'node:fs';
import { parse, render } from '../../../../src/index.js';
import type { EngineName, OutputFormat } from '../../../../src/index.js';

const HARNESS = new URL('../', import.meta.url);
const [probe, fmt, ...engines] = process.argv.slice(2);
for (const engine of (engines.length ? engines : ['dot', 'neato', 'fdp']) as EngineName[]) {
  const src = readFileSync(new URL(`probes/${probe}.gv`, HARNESS), 'utf8');
  const out = render(parse(src), fmt!.replace('_np', '-np') as OutputFormat, { engine });
  const nat = readFileSync(new URL(`native/${probe}.gv.${engine}.${fmt}`, HARNESS), 'utf8');
  console.log(engine, out === nat ? 'same' : `DIFF\nPORT\n${out}NATIVE\n${nat}`);
}
