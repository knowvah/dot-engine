// SPDX-License-Identifier: EPL-2.0
// Gate 6 for issue #173, selection: which corpus and golden inputs reach one of
// the changed expressions with a value the change alters.
//   node mark.mjs <marker.mjs> <out.json>      (from the repo root)
// The marker bundle is a $TMPDIR copy of the head that prints, on stderr,
// `I173 <site> <ranksep>` at each beginpath/endpath half when `ranksep` is odd
// (B40 B53 B124 E49 E58 E124), and `I173 SIBODD|SIBEVEN <minlen> <nodesep>` at
// make_LR_constraints' m0. One child per input (`-Kdot -Tdot`, 45 s cap).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = process.cwd();
const JOB = path.join(REPO, 'test/tools/bd-job.ts');
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const LANES = Number(process.env.LANES ?? 6);
const CAP_MS = 45_000;
const [marker, outFile] = process.argv.slice(2);

function targets() {
  const seen = new Set();
  const out = [];
  const man = JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'));
  for (const m of man) {
    if (m.status !== 'applicable') continue;
    const file = path.resolve(ROOT, m.path);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: m.id, file });
  }
  const gold = JSON.parse(fs.readFileSync(path.join(REPO, 'test/golden/manifest.json'), 'utf8'));
  for (const g of gold) {
    const file = path.resolve(REPO, g.input);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: `golden:${g.id}`, file });
  }
  return out;
}

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--max-old-space-size=1536', '--stack-size=65500', JOB, marker, file, 'dot', 'dot'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks = [];
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, CAP_MS);
    child.stdout.on('data', (d) => chunks.push(d));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ out: Buffer.concat(chunks).toString('utf8'), cap: timedOut ? 'TIMEOUT' : code !== 0 ? `EXIT ${code}` : null });
    });
  });
}

const tg = targets();
const marked = [];
const capped = [];
const totals = {};
let next = 0;
await Promise.all(Array.from({ length: LANES }, async () => {
  while (next < tg.length) {
    const t = tg[next++];
    const r = await run(t.file);
    if (r.cap !== null) { capped.push({ id: t.id, cap: r.cap }); continue; }
    const sites = {};
    for (const line of r.out.slice(r.out.indexOf('\n--stderr--\n')).split('\n')) {
      if (!line.startsWith('I173 ')) continue;
      const site = line.split(' ')[1];
      sites[site] = (sites[site] ?? 0) + 1;
    }
    for (const [s, c] of Object.entries(sites)) totals[s] = (totals[s] ?? 0) + c;
    const odd = Object.keys(sites).filter((s) => s !== 'SIBEVEN');
    if (odd.length > 0) marked.push({ ...t, sites });
  }
}));
marked.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(outFile, JSON.stringify({ inputs: tg.length, totals, marked, capped }, null, 1));
console.log(`inputs ${tg.length}, marked ${marked.length}, capped ${capped.length}`);
console.log('totals', JSON.stringify(totals));
for (const m of marked) console.log(`${m.id}\t${JSON.stringify(m.sites)}`);
console.log('capped', capped.map((c) => c.id).join(' '));
