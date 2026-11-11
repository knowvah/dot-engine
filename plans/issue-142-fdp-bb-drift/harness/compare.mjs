// SPDX-License-Identifier: EPL-2.0
// Gate 6 of issue #142: native vs base vs head for fdp inputs.
// usage: GVBINDIR=<dir with neato_layout> node compare.mjs <base.mjs> <head.mjs> <input>...
// Prints, per input and format: line count, lines differing from native for the
// base and the head, lines equal to native on the base that differ on the head
// (`lost`, must be 0), whether the head has native's structure, and the head's
// largest numeric difference. Native runs twice; an input whose two native runs
// differ is printed as `native-varies` and not scored (fdp has 13 such inputs).
// One child process per render: a pooled render is history-dependent (follow-up 42).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const ENGINE = 'fdp';
const FORMATS = ['xdot', 'dot', 'plain'];
const NUMBER = /-?\d+\.?\d*(?:e[-+]?\d+)?/g;
const MAX_BUFFER = 1 << 28;

if (process.argv[2] === '--render') {
  const [, , , bundle, file, format] = process.argv;
  const engine = await import(pathToFileURL(bundle).href);
  console.warn = () => {};
  console.error = () => {};
  process.stdout.write(engine.render(engine.parse(fs.readFileSync(file, 'latin1')), format, { engine: ENGINE }));
  process.exit(0);
}

const unwrap = (text) => text.replace(/\\\n/g, '');

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { encoding: 'latin1', maxBuffer: MAX_BUFFER, env });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}: ${r.stderr}`);
  return unwrap(r.stdout).split('\n');
}

const renderPort = (bundle, file, format) => run(process.execPath, [SELF, '--render', bundle, file, format]);
const renderNative = (file, format) => run(DOT, [`-K${ENGINE}`, `-T${format}`, file], process.env);

function differing(a, b) {
  let n = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}

function lost(native, base, head) {
  let n = 0;
  for (let i = 0; i < native.length; i++) if (base[i] === native[i] && head[i] !== native[i]) n++;
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
  return { structure, max: Number(max.toPrecision(5)) };
}

const [base, head, ...inputs] = process.argv.slice(2);
for (const file of inputs) {
  for (const format of FORMATS) {
    const native = renderNative(file, format);
    if (differing(native, renderNative(file, format)) !== 0) {
      console.log([path.basename(file), format, 'native-varies'].join(' '));
      continue;
    }
    const b = renderPort(base, file, format);
    const h = renderPort(head, file, format);
    const { structure, max } = headAgainstNative(native, h);
    console.log([path.basename(file), format, `lines=${native.length - 1}`, `base=${differing(native, b)}`,
      `head=${differing(native, h)}`, `lost=${lost(native, b, h)}`, `structure=${structure}`,
      `max=${max}`].join(' '));
  }
}
