// SPDX-License-Identifier: EPL-2.0
//
// Imagemap conformance walker (mission: map-conformance, T3 twin of
// xdot-walk.ts; engine-parameterized by mission format-parity-matrix T4/AD-3).
// Walks the SVG-conformant corpus items from parity.json,
// sorted by input file size (small → large, same discipline as xdot-walk.ts
// AD-2), rendering each to BOTH `cmapx` and `imap` through the native oracle
// (`dot -Tcmapx` / `dot -Timap`, GVBINDIR=/tmp/ghl) and through the port
// (render-one-map.ts, T1), diffing each format with its own semantic
// comparator (compare-map.ts, T2). THREE modes:
//
//   • DEFAULT (stop-on-first-divergence, dot only, no args): render/compare
//     in size order, HALT at the first non-accepted divergence in EITHER
//     format and print its diff. Exit 0 iff the whole conformant set passes;
//     exit 1 otherwise.
//
//   • --survey (dot only): render every item in both formats, record a
//     per-format verdict plus an overall (worst-of-two) verdict, and write
//     map-parity.json (consumed by map-dashboard.ts, T4). Never halts.
//
//   • `<engine> [outJsonl]` (AD-3, any engine incl. `dot`): resumable
//     JSONL-append full sweep mirroring engine-walk.ts's pattern, reusing
//     this file's own dual-format walkOne/MapWalkResult so the summary shape
//     ({ counts, results }) matches the pre-existing map-parity.json exactly.
//     Writes map-parity-<engine>.json; when engine is `dot`, ALSO writes
//     map-parity.json as an alias (parity-report.ts keeps reading that name
//     until T9). Never halts on a divergence.
//
// Reuses xdot-walk.ts's spawn + oracle-cache model: every port render is a
// group-killed subprocess with a wall-clock budget; native oracle output is
// cached under a signature of (binary, GVBINDIR, mtime[, engine]) so a
// rebuilt `dot` auto-invalidates. The `dot` engine's cache signature is
// byte-identical to the pre-engine-arg scheme (no engine segment), so this
// change does not invalidate any existing dot oracle cache. Node-only
// dev/test infra.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareCmapx, compareImap, type MapDiff } from '../golden/compare-map.js';
import { classAcceptedIds } from './accepted-class.js';
import { CMAPX_SENTINEL, IMAP_SENTINEL } from './render-one-map.js';
import type { EngineName } from '../../src/gvc/context.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const ROOT = process.env.CORPUS_ROOT ?? join(homedir(), 'git/graphviz/tests');
const DOT_BIN = process.env.DOT_BIN ?? join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const GVBINDIR = process.env.GVBINDIR ?? '/tmp/ghl';
const RENDER_ONE = join(REPO, 'test/corpus/render-one-map.ts');
const PARITY = new URL('./parity.json', import.meta.url);
const MAP_PARITY = new URL('./map-parity.json', import.meta.url);
const ACCEPTED = new URL('./accepted-divergences-map.json', import.meta.url);

/** Oracle-cache signature: same scheme as xdot-walk.ts, namespaced for map.
 * `dot`'s signature omits the engine segment entirely so it is byte-identical
 * to the original (pre-AD-3) hash input — the existing dot oracle cache is
 * NOT invalidated by adding engine support. Every other engine gets its own
 * namespaced signature (and therefore cache dir). */
function oracleSig(engine: EngineName): string {
  let mt = '';
  try { mt = String(statSync(DOT_BIN).mtimeMs); } catch { /* checked in main */ }
  const segments = engine === 'dot' ? ['map'] : ['map', String(engine)];
  return createHash('sha1').update([DOT_BIN, GVBINDIR, ...segments, mt].join('\0')).digest('hex').slice(0, 12);
}

/** Oracle-cache directory for `engine`. `MAP_ORACLE_CACHE` only overrides the
 * `dot` case (matches the pre-AD-3 env var's scope). */
function cacheDir(engine: EngineName): string {
  if (engine === 'dot' && process.env.MAP_ORACLE_CACHE) return process.env.MAP_ORACLE_CACHE;
  const base = engine === 'dot' ? 'dot-corpus-map-oracle' : `dot-corpus-map-oracle-${engine}`;
  return join(tmpdir(), base, oracleSig(engine));
}

const TIMEOUT_MULT = Number(process.env.MAP_TIMEOUT_MULT ?? 3);
// One hour, not 3 minutes — `timeout` must mean runaway, not slow. See the same
// note in json-walk.ts; 2108 sat `timeout` on six tracks for want of budget.
const TIMEOUT_FLOOR_MS = Number(process.env.MAP_TIMEOUT_FLOOR_MS ?? 3_600_000);
const ORACLE_TIMEOUT_MS = Number(process.env.MAP_ORACLE_TIMEOUT_MS ?? 300_000);
const CONCURRENCY = Number(process.env.MAP_CONCURRENCY ?? 8);
const LIMIT = Number(process.env.MAP_LIMIT ?? 0);

/** Replace the home-dir prefix with `~` so committed artifacts leak no path. */
function scrubHome(s: string): string {
  const home = homedir();
  return home ? s.split(home).join('~') : s;
}

// ---------------------------------------------------------------------------
// Verdict + result shape (interface contract consumed by T4)
// ---------------------------------------------------------------------------

export type MapVerdict =
  | 'conformant'
  | 'diverged'
  | 'accepted'
  | 'port-error'
  | 'oracle-error'
  | 'timeout';

/** Rank used to pick the "worst" of two per-format verdicts (higher = worse). */
const VERDICT_RANK: Record<MapVerdict, number> = {
  conformant: 0,
  accepted: 1,
  diverged: 2,
  timeout: 3,
  'port-error': 4,
  'oracle-error': 5,
};

function worstVerdict(a: MapVerdict, b: MapVerdict): MapVerdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/** One format's (cmapx or imap) walk outcome for one corpus item. */
export interface MapFormatResult {
  verdict: MapVerdict;
  diffCount?: number;
  firstDiff?: string;
  maxDelta?: number;
  maxDeltaPath?: string;
  errMsg?: string;
}

export interface MapWalkResult {
  id: string;
  path: string;
  /** Input file size in bytes (the sort key). */
  size: number;
  /** Worst of cmapx.verdict / imap.verdict. */
  verdict: MapVerdict;
  cmapx: MapFormatResult;
  imap: MapFormatResult;
  /**
   * True when the ORACLE's cmapx output has ≥1 `href="..."` area, or its
   * imap output has ≥1 `rect|circle|poly` line — i.e. this id actually
   * exercises anchor emission (not just an empty/tooltip-only map). Computed
   * from real oracle output rather than grepping the DOT source (HTML-label
   * `HREF=`, node `URL=`, `edgehref=`, etc. all collapse to the same
   * observable output) so it matches exactly what the comparator judges.
   * `false` when the oracle errored/timed out before this could be observed.
   */
  hasHref: boolean;
}

interface SpawnResult { stdout: string; stderr: string; code: number | null; timedOut: boolean; }

// ---------------------------------------------------------------------------
// Spawn helpers (mirrors xdot-walk.ts spawnCapture/killGroup/resolveTsx)
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
    // Buffer chunk independently, mangling a multi-byte UTF-8 char split across
    // a chunk boundary into two U+FFFD (buffering-dependent). @see json-walk.ts
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
      // Decode the whole stream as UTF-8 (non-fatal): valid multi-byte chars
      // decode correctly regardless of chunk boundaries; an isolated invalid
      // byte becomes U+FFFD rather than corrupting the rest (a whole-output
      // latin1 fallback would mojibake every valid c3xx into A-tilde+x).
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
// Oracle + port render
// ---------------------------------------------------------------------------

type MapFormat = 'cmapx' | 'imap';

/** True once the oracle's output for `format` looks complete (mirrors
 * xdot-walk.ts's `</svg>`-tail completeness check). */
function isComplete(format: MapFormat, stdout: string): boolean {
  const trimmed = stdout.trimEnd();
  if (format === 'cmapx') return trimmed.endsWith('</map>');
  // FORMAT_IMAP unconditionally starts with "base referer\n"
  // (gvrender_core_map.c:map_begin_page) whenever the render succeeds.
  return trimmed.startsWith('base referer');
}

/** Render one input to `format` with the native oracle under `engine`,
 * caching text + ms. `dot`'s oracle invocation (no `-K` flag) is unchanged
 * from before AD-3; every other engine adds `-K<engine>` (mirrors
 * engine-walk.ts). */
async function oracleFormat(
  absInput: string,
  id: string,
  format: MapFormat,
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
  const args = engine === 'dot' ? [`-T${format}`, absInput] : ['-K', String(engine), `-T${format}`, absInput];
  const t = Date.now();
  const r = await spawnCapture(DOT_BIN, args, env, ORACLE_TIMEOUT_MS);
  const ms = Date.now() - t;
  // Native dot exits nonzero on recoverable warnings while still emitting
  // complete output — completeness is the validity signal, not exit code
  // (mirrors xdot-walk.ts / survey.ts).
  if (r.timedOut || !isComplete(format, r.stdout)) {
    return { err: firstLine(r.stderr) || `oracle exit ${r.code}` };
  }
  mkdirSync(cache, { recursive: true });
  writeFileSync(cacheFile, r.stdout);
  writeFileSync(msFile, String(ms));
  return { text: r.stdout, ms };
}

/** Render one input to BOTH formats with the port under `engine`, in one
 * budget-killed subprocess (render-one-map.ts renders cmapx then imap and
 * separates them with sentinels). */
async function portMap(
  absInput: string,
  tsx: { cmd: string; pre: string[] },
  budgetMs: number,
  engine: EngineName,
): Promise<{ cmapx?: string; imap?: string; verdict?: MapVerdict; errMsg?: string }> {
  const args = [...tsx.pre, RENDER_ONE, absInput, String(engine)];
  const r = await spawnCapture(tsx.cmd, args, process.env, budgetMs);
  if (r.timedOut) return { verdict: 'timeout' };
  if (r.code !== 0 || r.stdout.length === 0) {
    return { verdict: 'port-error', errMsg: portErrMsg(r.stderr) || `port exit ${r.code}` };
  }
  const cIdx = r.stdout.indexOf(CMAPX_SENTINEL);
  const iIdx = r.stdout.indexOf(IMAP_SENTINEL);
  if (cIdx !== 0 || iIdx < 0) {
    return { verdict: 'port-error', errMsg: 'render-one-map: missing sentinel(s) in stdout' };
  }
  const cmapx = r.stdout.slice(CMAPX_SENTINEL.length, iIdx);
  const imap = r.stdout.slice(iIdx + IMAP_SENTINEL.length);
  return { cmapx, imap };
}

// ---------------------------------------------------------------------------
// Diff summarization (shared by both formats)
// ---------------------------------------------------------------------------

function summarize(diffs: MapDiff[]): Pick<MapFormatResult, 'diffCount' | 'firstDiff' | 'maxDelta' | 'maxDeltaPath'> {
  let maxDelta = 0;
  let maxDeltaPath: string | undefined;
  let firstDiff: string | undefined;
  for (const d of diffs) {
    if (firstDiff === undefined && d.kind !== 'numeric') firstDiff = d.path;
    if (d.delta !== undefined && d.delta > maxDelta) {
      maxDelta = d.delta;
      maxDeltaPath = d.path;
    }
  }
  if (firstDiff === undefined && diffs.length > 0) firstDiff = diffs[0].path;
  return {
    diffCount: diffs.length,
    firstDiff,
    ...(maxDelta > 0 ? { maxDelta, maxDeltaPath } : {}),
  };
}

// ---------------------------------------------------------------------------
// Walk one item
// ---------------------------------------------------------------------------

interface Item { id: string; path: string; size: number; }

/** Compare one format's port/oracle text pair and fold in acceptance. */
function judgeFormat(
  format: MapFormat,
  portText: string,
  oracleText: string,
  accepted: boolean,
  engine: EngineName = 'dot',
): { result: MapFormatResult; diffs: MapDiff[] } {
  // Deterministic engines are exact-after-round (MAP_TOLERANCE=0). Iterative
  // engines carry the documented 0.5pt model-drift bar, which after integer
  // rounding is a ±1 hotspot-coordinate window (AD-4).
  const tolerance = engine === 'neato' || engine === 'fdp' || engine === 'sfdp' ? 1 : 0;
  const { pass, diffs } = format === 'cmapx'
    ? compareCmapx(portText, oracleText, tolerance)
    : compareImap(portText, oracleText, tolerance);
  if (pass) return { result: { verdict: 'conformant' }, diffs: [] };
  const verdict: MapVerdict = accepted ? 'accepted' : 'diverged';
  return { result: { verdict, ...summarize(diffs) }, diffs };
}

/** Does the ORACLE's output for this id actually exercise anchor emission
 * (≥1 real `href`), vs. an empty or tooltip-only map? See MapWalkResult
 * .hasHref doc. */
function detectHasHref(oracleCmapx: string, oracleImap: string): boolean {
  return /\bhref="/.test(oracleCmapx) || /^(rect|circle|poly)\s/m.test(oracleImap);
}

async function walkOne(
  item: Item,
  tsx: { cmd: string; pre: string[] },
  accepted: Set<string>,
  engine: EngineName,
): Promise<{
  result: MapWalkResult;
  cmapxDiffs: MapDiff[];
  imapDiffs: MapDiff[];
  oracleCmapx?: string;
  oracleImap?: string;
  portCmapx?: string;
  portImap?: string;
}> {
  const absInput = join(ROOT, item.path);
  const meta = { id: item.id, path: item.path, size: item.size };
  const oCmapx = await oracleFormat(absInput, item.id, 'cmapx', engine);
  const oImap = await oracleFormat(absInput, item.id, 'imap', engine);
  if (oCmapx.text === undefined || oImap.text === undefined) {
    const errMsg = scrubHome(oCmapx.err ?? oImap.err ?? '');
    const errResult: MapFormatResult = { verdict: 'oracle-error', errMsg };
    return {
      result: { ...meta, verdict: 'oracle-error', cmapx: errResult, imap: errResult, hasHref: false },
      cmapxDiffs: [],
      imapDiffs: [],
    };
  }
  const hasHref = detectHasHref(oCmapx.text, oImap.text);
  const oracleMs = (oCmapx.ms ?? 0) + (oImap.ms ?? 0);
  const budgetMs = Math.max(TIMEOUT_FLOOR_MS, Math.ceil(TIMEOUT_MULT * oracleMs));
  const port = await portMap(absInput, tsx, budgetMs, engine);
  if (port.cmapx === undefined || port.imap === undefined) {
    const errResult: MapFormatResult = { verdict: port.verdict!, errMsg: scrubHome(port.errMsg ?? '') };
    return {
      result: { ...meta, verdict: port.verdict!, cmapx: errResult, imap: errResult, hasHref },
      cmapxDiffs: [],
      imapDiffs: [],
    };
  }
  const isAccepted = accepted.has(item.id);
  const { result: cmapxResult, diffs: cmapxDiffs } = judgeFormat('cmapx', port.cmapx, oCmapx.text, isAccepted, engine);
  const { result: imapResult, diffs: imapDiffs } = judgeFormat('imap', port.imap, oImap.text, isAccepted, engine);
  return {
    result: {
      ...meta,
      verdict: worstVerdict(cmapxResult.verdict, imapResult.verdict),
      cmapx: cmapxResult,
      imap: imapResult,
      hasHref,
    },
    cmapxDiffs,
    imapDiffs,
    oracleCmapx: oCmapx.text,
    oracleImap: oImap.text,
    portCmapx: port.cmapx,
    portImap: port.imap,
  };
}

// ---------------------------------------------------------------------------
// Item enumeration (conformant set, size-sorted — same source as xdot-walk.ts)
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

function loadAccepted(engine: EngineName): Set<string> {
  // Class members first: computed from the attribution harness, so the A1-drift
  // roster cannot go stale as the corpus grows (@see accepted-class.ts).
  const accepted = classAcceptedIds(ACCEPTED, engine);
  try {
    const raw = JSON.parse(readFileSync(ACCEPTED, 'utf8')) as {
      divergences?: Array<{ id: string; engine?: string }>;
    };
    // Entries may be engine-scoped; an engine-less entry applies everywhere.
    for (const d of raw.divergences ?? []) {
      if (d.engine === undefined || d.engine === engine) accepted.add(d.id);
    }
  } catch {
    // A missing/unreadable registry accepts only whatever the class resolved.
  }
  return accepted;
}

async function oracleVersion(): Promise<string> {
  const r = await spawnCapture(DOT_BIN, ['-V'], { ...process.env, GVBINDIR }, 5000);
  const m = (r.stderr + r.stdout).match(/version (\d+\.\d+\.\d+)/);
  return m ? `dot ${m[1]}` : 'dot (unknown)';
}

// ---------------------------------------------------------------------------
// Diff printing (default stop-on-first mode)
// ---------------------------------------------------------------------------

function printDivergence(format: MapFormat, result: MapWalkResult, diffs: MapDiff[]): void {
  process.stderr.write(
    `\nDIVERGENCE (${format}) at ${result.id} (${result.path}, ${result.size}B) — ` +
      `${diffs.length} diff(s):\n`,
  );
  for (const d of diffs.slice(0, 25)) {
    process.stderr.write(
      `  ${d.path}\n    port=${d.actual}  native=${d.expected}` +
        `${d.delta !== undefined ? `  delta=${d.delta.toFixed(4)}` : ''}  [${d.kind}]\n`,
    );
  }
  if (diffs.length > 25) process.stderr.write(`  ... and ${diffs.length - 25} more diff(s)\n`);
  process.stderr.write(
    `\nInspect:\n` +
      `  GVBINDIR=${GVBINDIR} ${DOT_BIN} -T${format} ${join(ROOT, result.path)}\n` +
      `  npx tsx ${RENDER_ONE} ${join(ROOT, result.path)}\n`,
  );
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

/** Stop-on-first-divergence (dot only): sequential, halt at the first real
 * divergence in either format. */
async function runDefault(items: Item[], tsx: { cmd: string; pre: string[] }, accepted: Set<string>): Promise<void> {
  let passed = 0;
  for (const item of items) {
    const { result, cmapxDiffs, imapDiffs } = await walkOne(item, tsx, accepted, 'dot');
    if (result.verdict === 'conformant' || result.verdict === 'accepted') {
      passed++;
      continue;
    }
    if (result.cmapx.verdict === 'diverged') printDivergence('cmapx', result, cmapxDiffs);
    if (result.imap.verdict === 'diverged') printDivergence('imap', result, imapDiffs);
    if (result.cmapx.verdict !== 'diverged' && result.imap.verdict !== 'diverged') {
      process.stderr.write(
        `\n${result.verdict.toUpperCase()} at ${result.id} (${result.path}): ` +
          `${result.cmapx.errMsg ?? result.imap.errMsg ?? ''}\n`,
      );
    }
    process.stderr.write(`\n(${passed} conformant before this item)\n`);
    process.exit(1);
  }
  process.stderr.write(`\nALL ${passed}/${items.length} conformant map items pass.\n`);
  process.exit(0);
}

/** Survey (dot only): render all, write map-parity.json (never halts). */
async function runSurvey(items: Item[], tsx: { cmd: string; pre: string[] }, accepted: Set<string>): Promise<void> {
  const results: MapWalkResult[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = (await walkOne(items[i], tsx, accepted, 'dot')).result;
      if (++done % 50 === 0) process.stderr.write(`  ${done}/${items.length}\n`);
    }
  };
  const n = Math.min(CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: n }, worker));

  const counts: Record<MapVerdict, number> = {
    conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0,
  };
  for (const r of results) counts[r.verdict]++;
  const report = {
    generatedAt: new Date().toISOString(),
    generatedWith: 'test/corpus/map-walk.ts --survey',
    oracleVersion: await oracleVersion(),
    corpusRoot: scrubHome(ROOT),
    total: results.length,
    counts,
    results,
  };
  writeFileSync(MAP_PARITY, JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`wrote map-parity.json — ${JSON.stringify(counts)}\n`);
}

/** Default JSONL path for the engine-parameterized walk (AD-3). `dot` reuses
 * the unsuffixed `map-parity` stem (matches the pre-existing map-parity.json
 * naming); every other engine gets a `-<engine>` suffix (mirrors
 * engine-walk.ts's `parity-<engine>.jsonl`). */
function defaultJsonlPath(engine: EngineName): string {
  return engine === 'dot'
    ? fileURLToPath(new URL('./map-parity.jsonl', import.meta.url))
    : fileURLToPath(new URL(`./map-parity-${engine}.jsonl`, import.meta.url));
}

function summaryPath(engine: EngineName): string {
  return fileURLToPath(new URL(`./map-parity-${engine}.json`, import.meta.url));
}

/**
 * Engine-parameterized resumable walk (AD-3, mission format-parity-matrix
 * T4): mirrors engine-walk.ts's JSONL-append + resume-by-id pattern, reusing
 * THIS file's own dual-format walkOne/MapWalkResult (rather than a separate
 * per-engine implementation) so the summary shape ({ counts, results })
 * stays identical to the pre-existing map-parity.json — only the content
 * (and, for non-dot engines, the file name) changes. Never halts on a
 * divergence — always a full sweep, like --survey.
 *
 *   tsx map-walk.ts <engine> [outJsonl]
 *
 * Writes map-parity-<engine>.json; when `engine` is `dot`, ALSO writes
 * map-parity.json as an alias (parity-report.ts / map-dashboard.ts keep
 * reading that unsuffixed name until T9 retires it).
 */
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
      try { doneIds.add((JSON.parse(ln) as MapWalkResult).id); } catch { /* partial line */ }
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
  const results: MapWalkResult[] = [];
  for (const ln of readFileSync(outJsonl, 'utf8').split('\n')) {
    if (!ln) continue;
    try { results.push(JSON.parse(ln) as MapWalkResult); } catch { /* partial line */ }
  }
  const counts: Record<MapVerdict, number> = {
    conformant: 0, diverged: 0, accepted: 0, 'port-error': 0, 'oracle-error': 0, timeout: 0,
  };
  for (const r of results) counts[r.verdict]++;
  const report = {
    generatedAt: new Date().toISOString(),
    generatedWith: 'test/corpus/map-walk.ts <engine>',
    engine: String(engine),
    oracleVersion: await oracleVersion(),
    corpusRoot: scrubHome(ROOT),
    total: results.length,
    counts,
    results,
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(summaryPath(engine), json);
  process.stderr.write(`[${engine}] wrote map-parity-${engine}.json — ${JSON.stringify(counts)}\n`);
  if (engine === 'dot') {
    // AD-3 alias: keep map-parity.json valid for parity-report.ts / T9.
    writeFileSync(MAP_PARITY, json);
    process.stderr.write(`[${engine}] wrote map-parity.json (dot alias)\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(DOT_BIN)) {
    process.stderr.write(`harness fault: oracle binary not found at ${DOT_BIN}\n`);
    process.exit(2);
  }
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const accepted = loadAccepted((positional[0] as EngineName | undefined) ?? 'dot');
  const tsx = resolveTsx();

  if (positional.length > 0) {
    // AD-3: tsx map-walk.ts <engine> [outJsonl] — any engine incl. `dot`.
    const engine = positional[0] as EngineName;
    const outJsonlArg = positional[1];
    const items = conformantItems();
    process.stderr.write(
      `map engine-walk: ${items.length} conformant items, size-sorted small→large\n` +
        `oracle ${DOT_BIN} (GVBINDIR=${GVBINDIR}, engine=${engine})\ncache ${cacheDir(engine)}\n` +
        `accepted divergences: ${accepted.size}\n`,
    );
    await runEngineWalk(engine, outJsonlArg, items, tsx, accepted);
    return;
  }

  // Legacy dot-only CLI (unchanged by AD-3): bare invocation or --survey.
  const survey = argv.includes('--survey');
  const items = conformantItems();
  process.stderr.write(
    `map ${survey ? 'survey' : 'walk (stop-on-first)'}: ${items.length} conformant items, ` +
      `size-sorted small→large\noracle ${DOT_BIN} (GVBINDIR=${GVBINDIR})\ncache ${cacheDir('dot')}\n` +
      `accepted divergences: ${accepted.size}\n`,
  );
  if (survey) await runSurvey(items, tsx, accepted);
  else await runDefault(items, tsx, accepted);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`harness fault: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  });
}
