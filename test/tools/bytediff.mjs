// SPDX-License-Identifier: EPL-2.0
// Byte-identity of two bundles, ONE CHILD PROCESS PER JOB (no resident workers:
// pooled renders are history-dependent, follow-up 42).
//
// Usage: node bytediff.mjs <bundleA> <bundleB> <ids-file|--amp|--all> <out.json>
//   env BD_ENGINES=dot,neato (default all 8)  BD_FORMATS=svg,xdot (default svg,xdot,json,plain,cmapx)
//       BD_CAP_MS=120000  BD_LANES=<n> (default 5)  BD_REPO=<repo> (default: this checkout)
// ids-file: one manifest id per line, optionally "id engine[,engine]" to limit engines.
// Output JSON: { jobs, identical, diffs: [key], capped: [{key, a, b}] }. A job capped on
// either side (TIMEOUT / OOM / CRASH) is never counted identical. Diff outputs are saved
// to <out.json>.d/<n>.{a,b}.txt.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOB = path.join(HERE, 'bd-job.mjs');
const REPO = process.env.BD_REPO ?? path.resolve(HERE, '../..');
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const [bundleA, bundleB, sel, outFile] = process.argv.slice(2);
const ENGINES = (process.env.BD_ENGINES ?? 'dot,neato,fdp,sfdp,twopi,circo,osage,patchwork').split(',');
const FORMATS = (process.env.BD_FORMATS ?? 'svg,xdot,json,plain,cmapx').split(',');
const CAP_MS = Number(process.env.BD_CAP_MS ?? 120_000);
const LANES = Number(process.env.BD_LANES ?? 5);

const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'))
  .filter((m) => m.status === 'applicable');
const byId = new Map(manifest.map((m) => [m.id, m]));
let targets; // [{ id, file, engines }]
if (sel === '--all' || sel === '--amp') {
  const seen = new Set();
  targets = [];
  for (const m of manifest) {
    const file = path.resolve(ROOT, m.path);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    if (sel === '--amp' && !fs.readFileSync(file).includes(0x26)) continue;
    targets.push({ id: m.id, file, engines: ENGINES });
  }
} else {
  targets = fs.readFileSync(sel, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [id, eng] = l.split(/\s+/);
      const m = byId.get(id);
      if (!m) throw new Error(`unknown id ${id}`);
      return { id, file: path.resolve(ROOT, m.path), engines: eng ? eng.split(',') : ENGINES };
    });
}
const jobs = [];
for (const t of targets) for (const engine of t.engines) for (const format of FORMATS) jobs.push({ key: `${t.id}|${engine}|${format}`, ...t, engine, format });
console.error(`targets ${targets.length}, jobs ${jobs.length}, lanes ${LANES}`);

function runJob(bundle, j) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--max-old-space-size=1536', '--stack-size=65500', JOB, bundle, j.file, j.engine, j.format], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, CAP_MS);
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => { if (err.length < 4000) err += d; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (timedOut) return resolve({ cap: 'TIMEOUT' });
      if (/heap out of memory|Allocation failed|Fatal JavaScript invalid size|Reached heap limit/i.test(err)) return resolve({ cap: 'OOM' });
      if (code !== 0) return resolve({ cap: `CRASH ${code ?? signal} ${err.split('\n').find((l) => /fatal|error|heap/i.test(l)) ?? ''}`.slice(0, 200) });
      resolve({ out: Buffer.concat(chunks) });
    });
  });
}

const diffs = [];
const capped = [];
let identical = 0;
let next = 0;
let done = 0;
const dDir = `${outFile}.d`;
async function lane() {
  while (next < jobs.length) {
    const j = jobs[next++];
    const a = await runJob(bundleA, j);
    const b = await runJob(bundleB, j);
    if (a.cap || b.cap) capped.push({ key: j.key, a: a.cap ?? 'ok', b: b.cap ?? 'ok' });
    else if (a.out.equals(b.out)) identical++;
    else {
      const n = diffs.length;
      diffs.push(j.key);
      fs.mkdirSync(dDir, { recursive: true });
      fs.writeFileSync(path.join(dDir, `${n}.a.txt`), a.out);
      fs.writeFileSync(path.join(dDir, `${n}.b.txt`), b.out);
      fs.appendFileSync(path.join(dDir, 'index.txt'), `${n} ${j.key}\n`);
    }
    if (++done % 50 === 0) console.error(`${done}/${jobs.length} identical ${identical} diffs ${diffs.length} capped ${capped.length}`);
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
capped.sort((x, y) => x.key.localeCompare(y.key));
diffs.sort();
fs.writeFileSync(outFile, JSON.stringify({ bundleA, bundleB, jobs: jobs.length, identical, diffs, capped }, null, 1));
console.error(`jobs ${jobs.length}: identical ${identical}, diffs ${diffs.length}, capped ${capped.length}`);
