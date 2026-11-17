// SPDX-License-Identifier: EPL-2.0
// Gate 6 for issue #149, selection: which corpus and golden inputs the new
// write_body changes, and how. No native run.
//   node plans/issue-149-agwrite-edge-order/harness/mark.mjs <marker.mjs> <out.json>
// (from the repo root). The marker bundle is a $TMPDIR copy of the head whose
// writeBody also replays the base's rule (each edge after its tail node, behind
// the old edge_last_written test) and prints on stderr, once per body:
//   I149 D <n>  the base would have re-declared <n> edges that edgesDone skips
//   I149 R      the body's edges come out in another order than on the base
//   I149 N      the base wrote a node after an edge of the same body (the edges
//               moved behind the nodes; the order among them may be the same)
//   I149 X <n>  the head writes <n> edges the base rule would not (never expected)
// One child per input (`-Kdot -Tdot`, 45 s cap). `size` is the input's bytes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';

const REPO = process.cwd();
const JOB = path.join(REPO, 'test/tools/bd-job.ts');
const ROOT = ORACLE_CORPUS_ROOT;
const LANES = Number(process.env.LANES ?? 6);
const CAP_MS = 45_000;
const MARK = 'I149 ';
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
    out.push({ id: m.id, file, size: fs.statSync(file).size });
  }
  const gold = JSON.parse(fs.readFileSync(path.join(REPO, 'test/golden/manifest.json'), 'utf8'));
  for (const g of gold) {
    const file = path.resolve(REPO, g.input);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: `golden:${g.id}`, file, size: fs.statSync(file).size });
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
      if (!line.startsWith(MARK)) continue;
      const site = line.split(' ')[1];
      sites[site] = (sites[site] ?? 0) + 1;
    }
    for (const s of Object.keys(sites)) totals[s] = (totals[s] ?? 0) + 1;
    if (Object.keys(sites).length > 0) marked.push({ id: t.id, size: t.size, sites });
  }
}));
marked.sort((a, b) => a.size - b.size || a.id.localeCompare(b.id));
fs.writeFileSync(outFile, JSON.stringify({ inputs: tg.length, totals, marked, capped }, null, 1));
console.log(`inputs ${tg.length}, marked ${marked.length}, capped ${capped.length}`);
console.log('ids per class', JSON.stringify(totals));
const ids = (k) => marked.filter((m) => m.sites[k]).map((m) => m.id);
console.log('D', ids('D').join(' '));
console.log('X', ids('X').join(' '));
console.log('R (30 smallest)', ids('R').slice(0, 30).join(' '));
console.log('capped', capped.map((c) => `${c.id}:${c.cap}`).join(' '));
