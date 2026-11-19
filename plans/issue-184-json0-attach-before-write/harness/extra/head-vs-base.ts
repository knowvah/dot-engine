// SPDX-License-Identifier: EPL-2.0
// Issue #184: a row native cannot render (2717.dot under fdp: SEGVx5) is
// judged head against base. Pass: head json0 adds keys only (every base/head
// diff is a key base lacks), each added key's value is base -Tjson's, and
// -Tjson and stderr do not change.
//   npx tsx head-vs-base.ts <base.mjs> <head.mjs> <engine> <in.gv>
import { spawnSync } from 'node:child_process';
import { compareJson } from '../../../../test/golden/compare-json.js';

const CHILD = `
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [bundle, engine, fmt, file] = process.argv.slice(1);
const mod = await import(pathToFileURL(bundle).href);
const errs = [];
mod.agseterrf((s) => { errs.push(s); return 0; });
const out = mod.render(mod.parse(readFileSync(file, 'utf8')), fmt, { engine });
process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
`;
const MISSING = '[missing]';
const [base, head, engine, file] = process.argv.slice(2) as [string, string, string, string];

function run(bundle: string, fmt: string): { out: string; err: string } {
  const r = spawnSync(process.execPath,
    ['--input-type=module', '-e', CHILD, '--', bundle, engine, fmt, file],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`render failed: ${bundle} ${fmt}: ${r.stderr}`);
  return JSON.parse(r.stdout) as { out: string; err: string };
}

const b0 = run(base, 'json0');
const h0 = run(head, 'json0');
const bj = run(base, 'json');
const hj = run(head, 'json');
const added = compareJson(b0.out, h0.out).diffs;
const dropped = compareJson(h0.out, b0.out).diffs.filter((d) => d.path.endsWith(MISSING));
const vsJson = compareJson(h0.out, bj.out).diffs.filter((d) => !d.path.includes('draw_'));
console.log(`base json0 against head json0: ${added.length} diffs, `
  + `${added.filter((d) => !d.path.endsWith(MISSING)).length} not a key base lacks`);
console.log(`keys base json0 has and head lacks: ${dropped.length}`);
console.log(`head json0 against base json, draw keys aside: ${vsJson.length} diffs `
  + vsJson.slice(0, 6).map((d) => d.path).join(' '));
console.log(`json bytes equal: ${bj.out === hj.out}; json0 stderr equal: ${b0.err === h0.err}`);
