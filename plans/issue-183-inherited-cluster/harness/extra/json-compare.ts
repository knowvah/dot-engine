// SPDX-License-Identifier: EPL-2.0
// Stop condition 4 for issue #183: -Tjson on the 13 probes, base and head
// against native 16.1.1, through the golden suite's structural comparator
// (the port's json is not byte-formatted as native's, so line counts say
// nothing). Each port render runs in its own process (module statics).
//   npx tsx json-compare.ts <base.mjs> <head.mjs> <probe.gv...>
import { spawnSync } from 'node:child_process';
import { compareJson } from '../../../../test/golden/compare-json.js';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../../test/corpus/oracle-paths.mjs';

const ENGINES = ['dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp', 'patchwork'];
const CHILD = `
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [bundle, engine, file] = process.argv.slice(1);
const mod = await import(pathToFileURL(bundle).href);
mod.agseterrf(() => 0);
process.stdout.write(mod.render(mod.parse(readFileSync(file, 'utf8')), 'json', { engine }));
`;

function port(bundle: string, engine: string, file: string): string {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD, '--', bundle, engine, file],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`port render failed: ${r.stderr}`);
  return r.stdout;
}

function native(engine: string, file: string): string {
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  for (let i = 0; i < 5; i++) {
    const r = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, '-Tjson', file],
      { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, GVBINDIR: gvbindir } });
    if (r.signal !== 'SIGSEGV') return r.stdout;
  }
  return '';
}

const [base, head, ...files] = process.argv.slice(2) as [string, string, ...string[]];
console.log('input\tengine\tbaseDiffs\theadDiffs\theadPaths');
for (const file of files) {
  for (const engine of ENGINES) {
    const nat = native(engine, file);
    const b = compareJson(port(base, engine, file), nat);
    const h = compareJson(port(head, engine, file), nat);
    console.log([file.split('/').pop(), engine, b.diffs.length, h.diffs.length,
      h.diffs.map((d) => `${d.object}:${d.path}`).slice(0, 6).join(' ')].join('\t'));
  }
}
