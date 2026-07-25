// SPDX-License-Identifier: EPL-2.0
//
// plain/plain-ext conformance walker (mission: format-parity-matrix, T5).
//
// Walks the SVG-conformant corpus items from parity.json, sorted by input
// file size (small -> large, same discipline as engine-walk.ts/json-walk.ts),
// rendering each to BOTH `plain` and `plain-ext` through the native oracle
// (`dot -K<engine> -Tplain` / `-Tplain-ext`, GVBINDIR=/tmp/ghl) and through
// the port (render-one-plain.ts, T3), diffing each format with the shared
// semantic comparator (compare-plain.ts, T1).
//
// AD-2: ONE "plain" track covers both formats — a corpus id's overall
// verdict is the WORST of its `plain` verdict and its `plain-ext` verdict
// (mirrors map-walk.ts's cmapx/imap worst-of-two aggregation); it only
// reaches `pass` when BOTH formats pass.
// AD-4: `iterative = engine in {neato, fdp, sfdp}` is passed to
// `comparePlain` as `{ iterative }` — position-agnostic structural
// comparison for the force-directed engines, exact positional comparison
// (0.01pt tolerance) for the deterministic ones.
//
//   tsx test/corpus/plain-walk.ts <engine> [outJsonl]
//
// Writes plain-parity-<engine>.json (consumed by a later dashboard/report
// task) and appends per-item rows to plain-parity-<engine>.jsonl (or
// [outJsonl] if given) as they complete — a re-run reads that JSONL first
// and skips ids already recorded, so an interrupted sweep resumes instead of
// re-rendering everything (engine-walk.ts's resume model). Never halts on a
// divergence; always a full sweep.
//
// Reuses engine-walk.ts/json-walk.ts/map-walk.ts's spawn + oracle-cache
// model: every port render is a group-killed subprocess with a wall-clock
// budget; native oracle output is cached under a sha1 signature of (binary,
// GVBINDIR, "plain", engine, mtime) so a rebuilt `dot` (or a different
// engine) auto-invalidates and never collides. Node-only dev/test infra —
// never imported by src/index.ts.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparePlain, type PlainDiff } from '../golden/compare-plain.js';
import type { EngineName } from '../../src/gvc/context.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const ROOT = process.env.CORPUS_ROOT ?? join(homedir(), 'git/graphviz/tests');
const DOT_BIN = process.env.DOT_BIN ?? join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const GVBINDIR = process.env.GVBINDIR ?? '/tmp/ghl';
const RENDER_ONE = join(REPO, 'test/corpus/render-one-plain.ts');
const PARITY = new URL('./parity.json', import.meta.url);
const ACCEPTED = new URL('./accepted-divergences-plain.json', import.meta.url);

/**
 * The force-directed engines accumulate floating-point drift JS cannot
 * reproduce bit-for-bit (accepted class A1 — FMA/pow/libm), so their
 * coordinate/dimension NUMBERS are skipped by comparePlain's `iterative`
 * mode; every non-numeric field (shape/label/style/color/port/pointCount)
 * still compares exactly. @see docs/known-divergences.md#a1
 */
const ITERATIVE_ENGINES = new Set(['neato', 'fdp', 'sfdp']);

/** Oracle-cache signature: sha1(binary, GVBINDIR, "plain", engine, mtime) —
 * namespaced by engine so parallel engine sweeps never collide and a
 * rebuilt `dot` auto-invalidates. */
function oracleSig(engine: EngineName): string {
  let mt = '';
  try { mt = String(statSync(DOT_BIN).mtimeMs); } catch { /* checked in main */ }
  return createHash('sha1')
    .update([DOT_BIN, GVBINDIR, 'plain', String(engine), mt].join('\0'))
    .digest('hex')
    .slice(0, 12);
}

function cacheDir(engine: EngineName): string {
  if (process.env.PLAIN_ORACLE_CACHE) return process.env.PLAIN_ORACLE_CACHE;
  return join(tmpdir(), 'dot-corpus-plain-oracle', String(engine), oracleSig(engine));
}

const TIMEOUT_MULT = Number(process.env.PLAIN_TIMEOUT_MULT ?? 3);
const TIMEOUT_FLOOR_MS = Number(process.env.PLAIN_TIMEOUT_FLOOR_MS ?? 180_000);
const ORACLE_TIMEOUT_MS = Number(process.env.PLAIN_ORACLE_TIMEOUT_MS ?? 300_000);
const CONCURRENCY = Number(process.env.PLAIN_CONCURRENCY ?? 8);
const LIMIT = Number(process.env.PLAIN_LIMIT ?? 0);

/** Replace the home-dir prefix with `~` so committed artifacts leak no path. */
function scrubHome(s: string): string {
  const home = homedir();
  return home ? s.split(home).join('~') : s;
}

// ---------------------------------------------------------------------------
// Verdict + result shape (interface contract consumed by later tasks)
// ---------------------------------------------------------------------------

export type PlainVerdict = 'pass' | 'diverged' | 'accepted' | 'oracleError' | 'portError' | 'timeout';

/** Rank used to pick the "worst" of the plain/plain-ext verdicts (higher = worse). */
const VERDICT_RANK: Record<PlainVerdict, number> = {
  pass: 0,
  accepted: 1,
  diverged: 2,
  timeout: 3,
  portError: 4,
  oracleError: 5,
};

function worstVerdict(a: PlainVerdict, b: PlainVerdict): PlainVerdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/** One format's (plain or plain-ext) walk outcome for one corpus item. */
export interface PlainFormatResult {
  verdict: PlainVerdict;
  diffCount?: number;
  /** First N `kind/id/field: port=... native=...` diff summaries. */
  firstDiffs?: string[];
  errMsg?: string;
}

/** One JSONL row / one entry of plain-parity-<engine>.json's `results`. */
export interface PlainWalkResult {
  id: string;
  path: string;
  /** Input file size in bytes (the sort key). */
  size: number;
  /** Worst of formats.plain.verdict / formats['plain-ext'].verdict (AD-2). */
  verdict: PlainVerdict;
  formats: Record<PlainFormat, PlainFormatResult>;
}

/** plain-parity-<engine>.json shape. */
export interface PlainParityReport {
  generatedAt: string;
  generatedWith: string;
  engine: string;
  oracleVersion: string;
  corpusRoot: string;
  total: number;
  counts: Record<PlainVerdict, number>;
  results: PlainWalkResult[];
}

interface SpawnResult { stdout: string; stderr: string; code: number | null; timedOut: boolean; }

// ---------------------------------------------------------------------------
// Spawn helpers (mirrors engine-walk.ts/json-walk.ts/map-walk.ts)
// ---------------------------------------------------------------------------

function spawnCapture(
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, detached: true });
    // Accumulate raw BYTES, decode once at close: `stdout += d` decodes each
    // Buffer chunk independently, mangling a multi-byte UTF-8 char split
    // across a chunk boundary into two U+FFFD (buffering-dependent). @see
    // json-walk.ts / map-walk.ts.
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child.pid);
    }, timeoutMs);
    child.stdout.on('data', (d: Buffer) => stdoutChunks.push(d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => (stderr += e.message));
    child.on('close', (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      resolve({ stdout, stderr, code, timedOut });
    });
  });
}

/** SIGKILL a detached child's whole process group (ignore if already gone). */
function killGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try { process.kill(-pid, 'SIGKILL'); } catch { /* ESRCH */ }
}

/** Locate a runnable `tsx`: TSX_BIN, local bin, npx cache, else `npx tsx`. */
function resolveTsx(): { cmd: string; pre: string[] } {
  if (process.env.TSX_BIN) return { cmd: process.env.TSX_BIN, pre: [] };
  const local = join(REPO, 'node_modules/.bin/tsx');
  if (existsSync(local)) return { cmd: local, pre: [] };
  const npx = join(homedir(), '.npm/_npx');
  if (existsSync(npx)) {
    for (const dir of readdirSync(npx)) {
      const bin = join(npx, dir, 'node_modules/.bin/tsx');
      if (existsSync(bin)) return { cmd: bin, pre: [] };
    }
  }
  return { cmd: 'npx', pre: ['--no-install', 'tsx'] };
}

function firstLine(s: string): string {
  for (const line of s.split('\n')) if (line.trim().length > 0) return line.trim();
  return '';
}

/** Extract the port's thrown error behind the `__RENDER_ERROR__` sentinel. */
function portErrMsg(stderr: string): string {
  const marker = '__RENDER_ERROR__';
  for (const line of stderr.split('\n')) {
    if (line.startsWith(marker)) return line.slice(marker.length).trim();
  }
  return firstLine(stderr);
}

// ---------------------------------------------------------------------------
// Oracle + port render (one format at a time — render-one-plain.ts's CLI
// takes a single `<plain|plain-ext>` arg, unlike render-one-map.ts's
// dual-sentinel single-invocation trick)
// ---------------------------------------------------------------------------

type PlainFormat = 'plain' | 'plain-ext';

/** Render one input to `format` with the native oracle under `engine`,
 * caching text + ms. `write_plain` (lib/common/output.c) always terminates
 * with a `stop` line on success — completeness signal, not exit code
 * (native dot can exit nonzero on a recoverable warning while still emitting
 * the full document; mirrors engine-walk.ts/json-walk.ts). */
async function oracleFormat(
  absInput: string,
  id: string,
  format: PlainFormat,
  engine: EngineName,
): Promise<{ text?: string; ms?: number; err?: string }> {
  const cache = cacheDir(engine);
  const cacheFile = join(cache, `${id}.${format}`);
  const msFile = join(cache, `${id}.${format}.ms`);
  if (existsSync(cacheFile) && existsSync(msFile)) {
    const cached = readFileSync(cacheFile, 'utf8');
    const ms = Number(readFileSync(msFile, 'utf8'));
    if (cached.length > 0 && Number.isFinite(ms)) return { text: cached, ms };
  }
  const env = { ...process.env, GVBINDIR };
  const args = ['-K', String(engine), `-T${format}`, absInput];
  const t = Date.now();
  const r = await spawnCapture(DOT_BIN, args, env, ORACLE_TIMEOUT_MS);
  const ms = Date.now() - t;
  const lines = r.stdout.trimEnd().split('\n');
  if (r.timedOut || lines[lines.length - 1] !== 'stop') {
    return { err: firstLine(r.stderr) || `oracle exit ${r.code}` };
  }
  mkdirSync(cache, { recursive: true });
  writeFileSync(cacheFile, r.stdout);
  writeFileSync(msFile, String(ms));
  return { text: r.stdout, ms };
}

/** Render one input to `format` with the port under `engine`, in a
 * budget-killed subprocess. */
async function portFormat(
  absInput: string,
  tsx: { cmd: string; pre: string[] },
  budgetMs: number,
  engine: EngineName,
  format: PlainFormat,
): Promise<{ text?: string; verdict?: 'timeout' | 'portError'; errMsg?: string }> {
  const args = [...tsx.pre, RENDER_ONE, absInput, String(engine), format];
  const r = await spawnCapture(tsx.cmd, args, process.env, budgetMs);
  if (r.timedOut) return { verdict: 'timeout' };
  if (r.code !== 0 || r.stdout.length === 0) {
    return { verdict: 'portError', errMsg: portErrMsg(r.stderr) || `port exit ${r.code}` };
  }
  return { text: r.stdout };
}

// ---------------------------------------------------------------------------
// Diff summarization + per-format judgment
// ---------------------------------------------------------------------------

function summarize(diffs: PlainDiff[]): Pick<PlainFormatResult, 'diffCount' | 'firstDiffs'> {
  return {
    diffCount: diffs.length,
    firstDiffs: diffs
      .slice(0, 5)
      .map((d) => `[${d.kind}] ${d.id}/${d.field}: port=${d.port} native=${d.native}`),
  };
}

/** Oracle -> port -> comparePlain for one format, folding in acceptance. */
async function resolveFormat(
  absInput: string,
  id: string,
  format: PlainFormat,
  engine: EngineName,
  tsx: { cmd: string; pre: string[] },
  iterative: boolean,
  isAccepted: boolean,
): Promise<{ result: PlainFormatResult; diffs: PlainDiff[] }> {
  const oracle = await oracleFormat(absInput, id, format, engine);
  if (oracle.text === undefined) {
    return { result: { verdict: 'oracleError', errMsg: scrubHome(oracle.err ?? '') }, diffs: [] };
  }
  const budgetMs = Math.max(TIMEOUT_FLOOR_MS, Math.ceil(TIMEOUT_MULT * (oracle.ms ?? 0)));
  const port = await portFormat(absInput, tsx, budgetMs, engine, format);
  if (port.text === undefined) {
    return { result: { verdict: port.verdict!, errMsg: scrubHome(port.errMsg ?? '') }, diffs: [] };
  }
  const { verdict: cmpVerdict, diffs } = comparePlain(port.text, oracle.text, { iterative });
  if (cmpVerdict === 'pass') return { result: { verdict: 'pass' }, diffs: [] };
  const verdict: PlainVerdict = isAccepted ? 'accepted' : 'diverged';
  return { result: { verdict, ...summarize(diffs) }, diffs };
}

// ---------------------------------------------------------------------------
// Walk one item
// ---------------------------------------------------------------------------

interface Item { id: string; path: string; size: number; }

async function walkOne(
  item: Item,
  tsx: { cmd: string; pre: string[] },
  accepted: Set<string>,
  engine: EngineName,
): Promise<{ result: PlainWalkResult; plainDiffs: PlainDiff[]; extDiffs: PlainDiff[] }> {
  const absInput = join(ROOT, item.path);
  const meta = { id: item.id, path: item.path, size: item.size };
  const iterative = ITERATIVE_ENGINES.has(String(engine));
  const isAccepted = accepted.has(`${String(engine)}::${item.id}`);

  const [plain, ext] = await Promise.all([
    resolveFormat(absInput, item.id, 'plain', engine, tsx, iterative, isAccepted),
    resolveFormat(absInput, item.id, 'plain-ext', engine, tsx, iterative, isAccepted),
  ]);

  return {
    result: {
      ...meta,
      verdict: worstVerdict(plain.result.verdict, ext.result.verdict),
      formats: { plain: plain.result, 'plain-ext': ext.result },
    },
    plainDiffs: plain.diffs,
    extDiffs: ext.diffs,
  };
}

// ---------------------------------------------------------------------------
// Item enumeration (conformant set, size-sorted — mirrors engine-walk.ts)
// ---------------------------------------------------------------------------

interface ParityRow { id: string; path: string; verdict: string; }

function conformantItems(): Item[] {
  const parity = JSON.parse(readFileSync(PARITY, 'utf8')) as { results: ParityRow[] };
  const items: Item[] = [];
  for (const r of parity.results) {
    if (r.verdict !== 'conformant') continue;
    let size = 0;
    try { size = statSync(join(ROOT, r.path)).size; } catch { size = 0; }
    items.push({ id: r.id, path: r.path, size });
  }
  items.sort((a, b) => a.size - b.size || a.id.localeCompare(b.id));
  return LIMIT > 0 ? items.slice(0, LIMIT) : items;
}

/** Entry shape (see accepted-divergences-plain.json's `comment`):
 * `{ id, engine, reason }`. Looked up by the composite `engine::id` key
 * since one graph can be accepted on one engine and not another. */
interface AcceptedEntry { id: string; engine: string; reason?: string }

function loadAccepted(): Set<string> {
  try {
    const raw = JSON.parse(readFileSync(ACCEPTED, 'utf8')) as { divergences?: AcceptedEntry[] };
    return new Set((raw.divergences ?? []).map((d) => `${d.engine}::${d.id}`));
  } catch {
    return new Set();
  }
}

async function oracleVersion(): Promise<string> {
  const r = await spawnCapture(DOT_BIN, ['-V'], { ...process.env, GVBINDIR }, 5000);
  const m = (r.stderr + r.stdout).match(/version (\d+\.\d+\.\d+)/);
  return m ? `dot ${m[1]}` : 'dot (unknown)';
}

// ---------------------------------------------------------------------------
// Resumable engine walk (mirrors engine-walk.ts / map-walk.ts's
// runEngineWalk): full sweep, JSONL-append per item, never halts.
// ---------------------------------------------------------------------------

function defaultJsonlPath(engine: EngineName): string {
  return fileURLToPath(new URL(`./plain-parity-${engine}.jsonl`, import.meta.url));
}

function summaryPath(engine: EngineName): string {
  return fileURLToPath(new URL(`./plain-parity-${engine}.json`, import.meta.url));
}

async function runEngineWalk(
  engine: EngineName,
  outJsonlArg: string | undefined,
  items: Item[],
  tsx: { cmd: string; pre: string[] },
  accepted: Set<string>,
): Promise<void> {
  const outJsonl = outJsonlArg ?? defaultJsonlPath(engine);
  const doneIds = new Set<string>();
  if (existsSync(outJsonl)) {
    for (const ln of readFileSync(outJsonl, 'utf8').split('\n')) {
      if (!ln) continue;
      try { doneIds.add((JSON.parse(ln) as PlainWalkResult).id); } catch { /* partial line */ }
    }
  } else {
    writeFileSync(outJsonl, '');
  }

  const pending = items.filter((it) => !doneIds.has(it.id));
  let next = 0;
  let completed = 0;
  const worker = async (): Promise<void> => {
    for (let i = next++; i < pending.length; i = next++) {
      const { result } = await walkOne(pending[i], tsx, accepted, engine);
      appendFileSync(outJsonl, JSON.stringify(result) + '\n');
      if (++completed % 50 === 0) process.stderr.write(`[${engine}] ${completed}/${pending.length}\n`);
    }
  };
  const n = Math.min(CONCURRENCY, pending.length);
  await Promise.all(Array.from({ length: n }, worker));

  // Re-read the (possibly resumed) JSONL so the summary reflects every row.
  const results: PlainWalkResult[] = [];
  for (const ln of readFileSync(outJsonl, 'utf8').split('\n')) {
    if (!ln) continue;
    try { results.push(JSON.parse(ln) as PlainWalkResult); } catch { /* partial line */ }
  }
  const counts: Record<PlainVerdict, number> = {
    pass: 0, diverged: 0, accepted: 0, oracleError: 0, portError: 0, timeout: 0,
  };
  for (const r of results) counts[r.verdict]++;
  const report: PlainParityReport = {
    generatedAt: new Date().toISOString(),
    generatedWith: 'test/corpus/plain-walk.ts',
    engine: String(engine),
    oracleVersion: await oracleVersion(),
    corpusRoot: scrubHome(ROOT),
    total: results.length,
    counts,
    results,
  };
  writeFileSync(summaryPath(engine), JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`[${engine}] wrote plain-parity-${engine}.json — ${JSON.stringify(counts)}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(DOT_BIN)) {
    process.stderr.write(`harness fault: oracle binary not found at ${DOT_BIN}\n`);
    process.exit(2);
  }
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const engineArg = positional[0];
  if (!engineArg) {
    console.error('usage: npx tsx test/corpus/plain-walk.ts <engine> [outJsonlPath]');
    process.exit(2);
    return;
  }
  const engine = engineArg as EngineName;
  const outJsonlArg = positional[1];
  const accepted = loadAccepted();
  const tsx = resolveTsx();
  const items = conformantItems();
  process.stderr.write(
    `plain[${engine}] walk: ${items.length} conformant items, size-sorted small→large\n` +
      `oracle ${DOT_BIN} -K ${engine} (GVBINDIR=${GVBINDIR})\ncache ${cacheDir(engine)}\n` +
      `accepted divergences: ${accepted.size}\n`,
  );
  await runEngineWalk(engine, outJsonlArg, items, tsx, accepted);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`harness fault: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  });
}
