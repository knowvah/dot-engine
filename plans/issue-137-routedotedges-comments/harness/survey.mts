// issue-137 gate 6. phase "mark": marker bundle x dot x svg over corpus + golden inputs.
// phase "cmp": base vs head vs native on marked ids, svg/xdot/json.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Run from the repo root: REPO=$PWD T=${TMPDIR%/} npx tsx <copy under $TMPDIR>.mts mark|cmp
// (a copy under $TMPDIR needs the .mts extension). T holds issue137-{base,head,marker}.mjs.
const REPO = process.env.REPO ?? process.cwd();
const T = process.env.T ?? os.tmpdir();
const { compareSvg } = (await import(REPO + '/test/golden/compare.ts')) as typeof import('../../../test/golden/compare.ts');
const { compareXdot } = (await import(REPO + '/test/golden/compare-xdot.ts')) as typeof import('../../../test/golden/compare-xdot.ts');
const { compareJson } = (await import(REPO + '/test/golden/compare-json.ts')) as typeof import('../../../test/golden/compare-json.ts');
const JOB = path.join(REPO, 'test/tools/bd-job.ts');
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const LANES = Number(process.env.LANES ?? 5);
const CAP_MS = 120_000;
const phase = process.argv[2];

interface Tgt { id: string; file: string }
function targets(): Tgt[] {
  const seen = new Set<string>();
  const out: Tgt[] = [];
  const man = JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8')) as { id: string; path: string; status: string }[];
  for (const m of man) {
    if (m.status !== 'applicable') continue;
    const file = path.resolve(ROOT, m.path);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: m.id, file });
  }
  const gold = JSON.parse(fs.readFileSync(path.join(REPO, 'test/golden/manifest.json'), 'utf8')) as { id: string; input: string }[];
  for (const g of gold) {
    const file = path.resolve(REPO, g.input);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: 'golden:' + g.id, file });
  }
  return out;
}

function run(bundle: string, file: string, format: string): Promise<{ out: string; cap: string | null }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--max-old-space-size=1536', '--stack-size=65500', JOB, bundle, file, 'dot', format], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, CAP_MS);
    child.stdout.on('data', (d: Buffer) => chunks.push(d));
    child.stderr.on('data', (d: Buffer) => { if (err.length < 4000) err += d.toString(); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const cap = timedOut ? 'TIMEOUT' : code !== 0 ? 'EXIT ' + String(code ?? signal) + ' ' + err.slice(0, 200) : null;
      resolve({ out: Buffer.concat(chunks).toString('utf8'), cap });
    });
  });
}

async function pool<A>(items: A[], fn: (a: A, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: LANES }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i]!, i); }
  }));
}

if (phase === 'mark') {
  const tg = targets();
  const marked: (Tgt & { calls: number; same: number; changed: number; haslabel: number; lostskip: number })[] = [];
  const capped: { id: string; cap: string }[] = [];
  const lostOnly: string[] = [];
  let done = 0;
  await pool(tg, async (t) => {
    const r = await run(T + '/issue137-marker.mjs', t.file, 'svg');
    if (r.cap !== null) capped.push({ id: t.id, cap: r.cap });
    const err = r.out.slice(r.out.indexOf('\n--stderr--\n'));
    const c = (s: string): number => err.split(s).length - 1;
    const calls = c('ISSUE137_FLATADJ');
    const lostskip = c('ISSUE137_LOSTSKIP');
    if (calls > 0) marked.push({ ...t, calls, same: c('ISSUE137_SAME'), changed: c('ISSUE137_CHANGED'), haslabel: c('ISSUE137_HASLABEL'), lostskip });
    else if (lostskip > 0) lostOnly.push(t.id + ' x' + lostskip);
    if (++done % 100 === 0) console.error(done + '/' + tg.length);
  });
  marked.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(T + '/issue137-marked.json', JSON.stringify({ targets: tg.length, marked, capped, lostOnly }, null, 1));
  console.log('targets', tg.length, 'marked', marked.length, 'capped', capped.length, 'lostOnly', lostOnly.length,
    'calls', marked.reduce((s, m) => s + m.calls, 0), 'same', marked.reduce((s, m) => s + m.same, 0),
    'changed', marked.reduce((s, m) => s + m.changed, 0), 'idsWithLabel', marked.filter((m) => m.haslabel > 0).length,
    'idsWithLostskip', marked.filter((m) => m.lostskip > 0).length);
} else {
  const { marked } = JSON.parse(fs.readFileSync(T + '/issue137-marked.json', 'utf8')) as { marked: Tgt[] };
  const rows: { id: string; fmt: string; baseEqHead: boolean; cap: string | null; native: string }[] = [];
  const jobs = marked.flatMap((m) => ['svg', 'xdot', 'json'].map((fmt) => ({ ...m, fmt })));
  await pool(jobs, async (j) => {
    const a = await run(T + '/issue137-base.mjs', j.file, j.fmt);
    const b = await run(T + '/issue137-head.mjs', j.file, j.fmt);
    const cap = a.cap ?? b.cap;
    const n = spawnSync(DOT, ['-Kdot', '-T' + j.fmt, j.file], { env: { ...process.env, GVBINDIR: '/tmp/ghl' }, encoding: 'utf8', timeout: CAP_MS, maxBuffer: 1 << 28 });
    let native: string;
    if (n.error || n.status !== 0 || n.stdout === '') native = 'native-unfinished ' + String(n.error?.message ?? n.status ?? n.signal);
    else {
      const port = b.out.slice(0, b.out.indexOf('\n--stderr--\n'));
      try {
        const pass = j.fmt === 'svg' ? compareSvg(port, n.stdout, 'deterministic').pass
          : j.fmt === 'xdot' ? compareXdot(port, n.stdout).pass : compareJson(port, n.stdout).pass;
        native = pass ? 'equal' : 'differs';
      } catch (e) { native = 'compare-threw ' + String(e).slice(0, 80); }
    }
    rows.push({ id: j.id, fmt: j.fmt, baseEqHead: cap === null && a.out === b.out, cap, native });
  });
  rows.sort((x, y) => (x.id + x.fmt).localeCompare(y.id + y.fmt));
  fs.writeFileSync(T + '/issue137-survey.json', JSON.stringify(rows, null, 1));
  const cnt = (f: (r: typeof rows[number]) => boolean): number => rows.filter(f).length;
  console.log('rows', rows.length, 'baseEqHead', cnt((r) => r.baseEqHead), 'capped', cnt((r) => r.cap !== null),
    'nativeEqual', cnt((r) => r.native === 'equal'), 'nativeDiffers', cnt((r) => r.native === 'differs'),
    'nativeOther', cnt((r) => r.native !== 'equal' && r.native !== 'differs'));
  for (const f of ['svg', 'xdot', 'json']) console.log(f, 'equal', cnt((r) => r.fmt === f && r.native === 'equal'), 'of', cnt((r) => r.fmt === f));
  for (const r of rows) if (!r.baseEqHead || (r.native !== 'equal')) console.log(JSON.stringify(r));
}
