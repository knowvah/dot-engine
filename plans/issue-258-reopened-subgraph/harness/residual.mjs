// SPDX-License-Identifier: EPL-2.0
// Issue #258: for every probe row whose head output still differs from native,
// list the key=value pairs native prints that head does not (missing) and the
// pairs head prints that native does not (extra). The rows #262 owns miss only
// the pinned value (`cluster=false`, `cluster=true`, `color=red`, `label=L`)
// and have no extra pair; sfdp rows on cyclic probes are #257's.
//   node residual.mjs <head.mjs> <probes-planning.tsv> <probes-dir>
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const MAX_BUFFER = 1 << 28;
const PAIR_RE = /[A-Za-z_]+=("(?:[^"\\]|\\.)*"|[^,\];\s]+)/g;

if (process.argv[2] === '--child') {
  const [, , , bundle, engine, fmt, file] = process.argv;
  const mod = await import(pathToFileURL(bundle).href);
  mod.agseterrf(() => 0);
  process.stdout.write(mod.render(mod.parse(readFileSync(file, 'utf8')), fmt, { engine }));
  process.exit(0);
}

const [head, tsv, dir] = process.argv.slice(2);

function pairs(text) {
  const m = new Map();
  for (const p of text.replace(/\\\n/g, '').match(PAIR_RE) ?? []) m.set(p, (m.get(p) ?? 0) + 1);
  return m;
}

function minus(a, b) {
  const out = [];
  for (const [k, n] of a) for (let i = (b.get(k) ?? 0); i < n; i++) out.push(k);
  return out;
}

const rows = readFileSync(tsv, 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
console.log('input\tengine\tformat\tmissing\textra');
for (const [input, engine, fmt, , , , headLines, , , , eqNative] of rows) {
  if (eqNative === 'yes' || fmt === 'svg') continue;
  const file = join(dir, input);
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  const nat = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER, env: { ...process.env, GVBINDIR: gvbindir } }).stdout;
  const port = spawnSync(process.execPath, [process.argv[1], '--child', head, engine, fmt, file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER }).stdout;
  const n = pairs(nat);
  const p = pairs(port);
  console.log([input, engine, fmt, minus(n, p).join(' ') || '-',
    minus(p, n).join(' ') || '-', headLines].slice(0, 5).join('\t'));
}
