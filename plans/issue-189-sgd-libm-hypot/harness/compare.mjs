// SPDX-License-Identifier: EPL-2.0
// Gate 6 of issue #189: native vs base vs head on the inputs that reach mode=sgd.
// usage: GVBINDIR=<dir with neato_layout> node compare.mjs <base.mjs> <head.mjs> <input>...
// Prints, per input and format: line count, lines differing from native for the
// base and the head, whether the head has native's structure, and the head's
// largest numeric difference. One child process per render: a pooled render is
// history-dependent (follow-up 42).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const FORMATS = ['dot', 'xdot', 'plain'];
const NUMBER = /-?\d+\.?\d*(?:e[-+]?\d+)?/g;
const MAX_BUFFER = 1 << 28;

if (process.argv[2] === '--render') {
  const [, , , bundle, file, format] = process.argv;
  const engine = await import(pathToFileURL(bundle).href);
  console.warn = () => {};
  console.error = () => {};
  process.stdout.write(engine.render(engine.parse(fs.readFileSync(file, 'utf8')), format, { engine: 'neato' }));
  process.exit(0);
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: MAX_BUFFER, env });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}: ${r.stderr}`);
  return r.stdout.split('\n');
}

const renderPort = (bundle, file, format) => run(process.execPath, [SELF, '--render', bundle, file, format]);

function differing(a, b) {
  let n = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}

function headAgainstNative(native, head) {
  let structure = native.length === head.length;
  let max = 0;
  for (let i = 0; i < Math.min(native.length, head.length); i++) {
    if (native[i] === head[i]) continue;
    if (native[i].replace(NUMBER, '#') !== head[i].replace(NUMBER, '#')) { structure = false; continue; }
    const a = native[i].match(NUMBER) ?? [];
    const b = head[i].match(NUMBER) ?? [];
    a.forEach((v, k) => { max = Math.max(max, Math.abs(Number(v) - Number(b[k]))); });
  }
  return { structure, max: Number(max.toFixed(7)) };
}

const [base, head, ...inputs] = process.argv.slice(2);
for (const file of inputs) {
  for (const format of FORMATS) {
    const native = run(DOT, ['-Kneato', `-T${format}`, file], process.env);
    const b = renderPort(base, file, format);
    const h = renderPort(head, file, format);
    const { structure, max } = headAgainstNative(native, h);
    console.log([path.basename(file), format, `lines=${native.length - 1}`, `base=${differing(native, b)}`,
      `head=${differing(native, h)}`, `structure=${structure}`, `max=${max}`].join(' '));
  }
}
