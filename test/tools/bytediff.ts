// SPDX-License-Identifier: EPL-2.0
// Byte-identity of two bundles, ONE CHILD PROCESS PER JOB (no resident workers:
// pooled renders are history-dependent, follow-up 42).
//
// Usage: npx tsx test/tools/bytediff.ts <bundleA> <bundleB> <ids-file|--amp|--all> <out.json>
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
import {
  DEFAULT_ENGINES,
  DEFAULT_FORMATS,
  buildJobs,
  buildReport,
  capReason,
  outcomeOf,
  parseIdLines,
  summaryLine,
  type Capped,
  type Job,
  type RunResult,
  type Target,
} from './lib/bytediff-core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOB = path.join(HERE, 'bd-job.ts');
const REPO = process.env.BD_REPO ?? path.resolve(HERE, '../..');
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const [bundleA = '', bundleB = '', sel = '', outFile = ''] = process.argv.slice(2);
const ENGINES = (process.env.BD_ENGINES ?? DEFAULT_ENGINES).split(',');
const FORMATS = (process.env.BD_FORMATS ?? DEFAULT_FORMATS).split(',');
const CAP_MS = Number(process.env.BD_CAP_MS ?? 120_000);
const LANES = Number(process.env.BD_LANES ?? 5);
const MAX_ERR = 4000;
const AMP = 0x26;

interface ManifestEntry {
  id: string;
  path: string;
  status: string;
}

function loadManifest(): ManifestEntry[] {
  const raw: unknown = JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'));
  if (!Array.isArray(raw)) throw new Error('corpus manifest is not an array');
  return (raw as ManifestEntry[]).filter((m) => m.status === 'applicable');
}

function allTargets(manifest: readonly ManifestEntry[], ampOnly: boolean): Target[] {
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const m of manifest) {
    const file = path.resolve(ROOT, m.path);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    if (ampOnly && !fs.readFileSync(file).includes(AMP)) continue;
    targets.push({ id: m.id, file, engines: ENGINES });
  }
  return targets;
}

function idTargets(manifest: readonly ManifestEntry[]): Target[] {
  const byId = new Map(manifest.map((m) => [m.id, m]));
  return parseIdLines(fs.readFileSync(sel, 'utf8')).map(({ id, engines }) => {
    const m = byId.get(id);
    if (!m) throw new Error(`unknown id ${id}`);
    return { id, file: path.resolve(ROOT, m.path), engines: engines ?? ENGINES };
  });
}

function selectTargets(): Target[] {
  const manifest = loadManifest();
  return sel === '--all' || sel === '--amp' ? allTargets(manifest, sel === '--amp') : idTargets(manifest);
}

function runJob(bundle: string, j: Job): Promise<RunResult> {
  return new Promise((resolve) => {
    const args = ['--max-old-space-size=1536', '--stack-size=65500', JOB, bundle, j.file, j.engine, j.format];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, CAP_MS);
    child.stdout.on('data', (d: Buffer) => chunks.push(d));
    child.stderr.on('data', (d: Buffer) => {
      if (err.length < MAX_ERR) err += d.toString();
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const cap = capReason(timedOut, code, signal, err);
      resolve(cap === null ? { out: Buffer.concat(chunks) } : { cap });
    });
  });
}

const jobs = buildJobs(selectTargets(), FORMATS);
console.error(`targets ${new Set(jobs.map((j) => j.id)).size}, jobs ${jobs.length}, lanes ${LANES}`);
const diffs: string[] = [];
const capped: Capped[] = [];
let identical = 0;
let next = 0;
let done = 0;
const dDir = `${outFile}.d`;

function saveDiff(j: Job, a: RunResult, b: RunResult): void {
  const n = diffs.length;
  diffs.push(j.key);
  fs.mkdirSync(dDir, { recursive: true });
  fs.writeFileSync(path.join(dDir, `${n}.a.txt`), a.out ?? '');
  fs.writeFileSync(path.join(dDir, `${n}.b.txt`), b.out ?? '');
  fs.appendFileSync(path.join(dDir, 'index.txt'), `${n} ${j.key}\n`);
}

async function lane(): Promise<void> {
  while (next < jobs.length) {
    const j = jobs[next++]!;
    const a = await runJob(bundleA, j);
    const b = await runJob(bundleB, j);
    const outcome = outcomeOf(a, b);
    if (outcome === 'capped') capped.push({ key: j.key, a: a.cap ?? 'ok', b: b.cap ?? 'ok' });
    else if (outcome === 'identical') identical++;
    else saveDiff(j, a, b);
    if (++done % 50 === 0) {
      console.error(`${done}/${jobs.length} identical ${identical} diffs ${diffs.length} capped ${capped.length}`);
    }
  }
}

await Promise.all(Array.from({ length: LANES }, lane));
const report = buildReport(bundleA, bundleB, jobs.length, identical, diffs, capped);
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
console.error(summaryLine(report));
