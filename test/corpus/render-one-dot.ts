// SPDX-License-Identifier: EPL-2.0
//
// Isolation worker for the `-Tdot` (agwrite) conformance walk.
//
// Renders ONE corpus input to the `dot` output format via the port and writes
// it to stdout. Mirrors test/corpus/render-one-plain.ts exactly, differing only
// in the target format arg: `render(g, 'dot')`. Runs as a spawned subprocess so
// the walker stays responsive — some inputs trigger synchronous infinite loops
// that cannot be interrupted in-process; a hang here is killed by the parent's
// wall-clock timeout, a throw exits nonzero with the message on stderr behind a
// `__RENDER_ERROR__` sentinel.
//
//   tsx test/corpus/render-one-dot.ts <inputPath> <engine>
//
// Node-only dev/test infra — never imported by src/index.ts.

import { readFileSync } from 'node:fs';
import { parse, render } from '../../src/index.js';
import type { RenderOptions } from '../../src/render/public.js';
import type { EngineName } from '../../src/gvc/context.js';

/**
 * Decode a corpus input file the way native dot reads it — identical to
 * render-one.ts / render-one-plain.ts (decodeDotInput). dot scans raw bytes
 * with a default UTF-8 charset and, on invalid UTF-8, falls back to Latin-1
 * per label (lib/common/utils.c:1218/1249 latin1ToUTF8).
 */
function decodeDotInput(buf: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return buf.toString('latin1');
  }
}

const inputPath = process.argv[2];
const engine = (process.argv[3] ?? 'dot') as EngineName;

if (!inputPath) {
  process.stderr.write('usage: render-one-dot <inputPath> [engine=dot]\n');
  process.exit(2);
}

try {
  const g = parse(decodeDotInput(readFileSync(inputPath)));
  const opts: RenderOptions = { engine };
  process.stdout.write(render(g, 'dot', opts));
} catch (err) {
  // Emit the thrown error on a sentinel line so the walker can distinguish it
  // from incidental warnings the port writes to stderr during rendering.
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`__RENDER_ERROR__ ${msg.split('\n')[0]}\n`);
  if (err instanceof Error && err.stack) process.stderr.write(err.stack + '\n');
  process.exit(1);
}
