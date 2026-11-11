// SPDX-License-Identifier: EPL-2.0
// Gate 6 survey: native, base and head -Tdot per file, with a cap per run.
//   GVBINDIR=<dir> node survey.mjs <compare.mjs> <base> <head> <outdir> <files...>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const DOT = `${homedir()}/git/graphviz/build/cmd/dot/dot`;
const CAP_MS = Number(process.env.CAP_MS ?? 120000);
const LANES = Number(process.env.LANES ?? 3);
const WARN = 'flat edge between adjacent nodes one of which has a record shape';
const [compare, base, head, outdir, ...files] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
function run(cmd, args) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [], err = [];
    let capped = false;
    const t = setTimeout(() => { capped = true; c.kill('SIGKILL'); }, CAP_MS);
    c.stdout.on('data', (d) => out.push(d));
    c.stderr.on('data', (d) => err.push(d));
    c.on('close', (code) => { clearTimeout(t); resolve({ code, capped, out: Buffer.concat(out).toString('utf8'), err: Buffer.concat(err).toString('utf8') }); });
  });
}
async function port(bundle, file) {
  const r = await run(process.execPath, ['--stack-size=65500', compare, '--child', bundle, 'dot', file]);
  if (r.capped) return { fail: 'CAP' };
  if (r.code !== 0) return { fail: `FAIL ${r.err.split('\n').find((l) => /Error|error/.test(l))?.slice(0, 80) ?? r.code}` };
  return JSON.parse(r.out);
}
const rows = new Array(files.length);
let next = 0;
async function lane() {
  for (;;) {
    const i = next++;
    if (i >= files.length) return;
    const file = files[i];
    const id = file.replace(`${homedir()}/git/graphviz/`, '');
    const nat = await run(DOT, ['-Tdot', file]);
    const b = await port(base, file);
    const h = await port(head, file);
    const tag = id.replaceAll('/', '__');
    const natErr = nat.capped ? null : nat.err;
    if (natErr !== null) writeFileSync(`${outdir}/${tag}.nat.err`, natErr);
    if (!b.fail) writeFileSync(`${outdir}/${tag}.base.err`, b.err);
    if (!h.fail) writeFileSync(`${outdir}/${tag}.head.err`, h.err);
    const errCmp = (p) => (p.fail ? p.fail : natErr === null ? 'natCAP' : p.err === natErr ? 'same' : 'DIFF');
    rows[i] = [
      id,
      nat.capped ? 'CAP' : `exit${nat.code}`,
      b.fail || h.fail ? (b.fail === h.fail ? 'both-fail' : 'n/a') : b.out === h.out ? 'equal' : 'CHANGED',
      !h.fail && !nat.capped ? (h.out === nat.out ? 'native' : 'differs') : 'n/a',
      errCmp(b), errCmp(h),
      natErr === null ? '?' : natErr.includes(WARN) ? 'W' : '-',
      b.fail ? '?' : b.err.includes(WARN) ? 'W' : '-',
      h.fail ? '?' : h.err.includes(WARN) ? 'W' : '-',
    ].join('\t');
    process.stderr.write(`${i + 1}/${files.length} ${id}\n`);
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
console.log('input\tnative\thead-vs-base stdout\thead stdout vs native\tbaseErr\theadErr\tnatWarn\tbaseWarn\theadWarn');
console.log(rows.join('\n'));
