// SPDX-License-Identifier: EPL-2.0
//
// Differential parity survey runner (mission: dot-corpus-harness, T2).
//
// Reads corpus-manifest.json (T1), renders every `applicable` input through the
// native `dot` oracle and through @knowvah/dot-engine (in an isolated subprocess), diffs
// the two SVGs with test/golden/compare.ts (read-only reuse), and writes
// parity.json — the per-input verdict report consumed by T3 (dashboard.ts).
//
// A report, not a gate (AD-1): divergences are expected data. The survey never
// crashes or hangs on a bad input — every port render is a spawned subprocess
// with a wall-clock timeout (AD-2); a hang becomes `timeout`, a throw becomes
// `errored`. It exits 0 even when inputs diverge; only a harness fault (missing
// oracle binary, unreadable manifest) exits nonzero. Node-only dev/test infra.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareSvg, type Diff } from '../golden/compare.js';
import { normalizeSvg } from '../golden/normalize.js';
import type { CorpusEntry } from './enumerate.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const ROOT = process.env.CORPUS_ROOT ?? join(homedir(), 'git/graphviz/tests');

/**
 * Replace an absolute home-directory prefix with `~` so the committed survey
 * artifacts (parity.json, PARITY-dot.md) never leak a developer's local path.
 * Applied to the recorded corpus root and to native oracle error messages,
 * which embed each input's absolute path.
 */
function scrubHome(s: string): string {
  const home = homedir();
  return home ? s.split(home).join('~') : s;
}
const DOT_BIN = process.env.DOT_BIN ?? join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const GVBINDIR = process.env.GVBINDIR ?? '/tmp/gvplugins';
// Oracle-cache identity. The cache stores native `dot` SVGs keyed by input id;
// a bare shared dir silently cross-contaminated different oracles (the headless
// /tmp/ghl rules survey vs the pango /tmp/gvplugins baseline read each other's
// cached SVGs — same id, same dir) and went stale when `dot` was rebuilt (only
// missing entries are (re)written). Namespace the default cache by a signature
// of (binary, GVBINDIR, binary mtime) so oracles never collide and a rebuild
// auto-invalidates. An explicit ORACLE_CACHE override still wins verbatim.
const ORACLE_SIG = (() => {
  let mt = '';
  try { mt = String(statSync(DOT_BIN).mtimeMs); } catch { /* binary checked later */ }
  return createHash('sha1').update(`${DOT_BIN}\0${GVBINDIR}\0${mt}`).digest('hex').slice(0, 12);
})();
const CACHE = process.env.ORACLE_CACHE ?? join(tmpdir(), 'dot-corpus-oracle', ORACLE_SIG);
// A render is a `timeout` only if it does not error and runs past its budget
// (`renderBudgetMs`). The flat-20s budget mis-flagged graphs that are merely
// slow-but-valid (e.g. 2108 ~70s, native ~12s); only a true runaway past 3x the
// graph's own known cost — or the floor, whichever is greater — counts.
const TIMEOUT_MULT = Number(process.env.RENDER_TIMEOUT_MULT ?? 3);
// TIMEOUT_FLOOR_MS is derived from the canonical native times below (5x the
// slowest native render) so it scales with the host instead of a fixed 180s.
// The oracle gets a generous fixed cap so slow-but-valid native renders finish
// (they yield the reference SVG *and* the native time the budget is based on).
// ORACLE_TIMEOUT_MS is defined after MAX_NATIVE_MS below (it scales with it).
const CONCURRENCY = Number(process.env.SURVEY_CONCURRENCY ?? 8);
const MANIFEST = new URL('./corpus-manifest.json', import.meta.url);
// Output is parameterizable so a side-by-side survey (e.g. the headless rules
// survey: GVBINDIR=ghl GV_TEXT_MEASURER=estimate) can write a separate report
// without clobbering the default pango baseline. @see plans/fix-xcoord-position
const PARITY = new URL(process.env.PARITY_OUT ?? './parity.json', import.meta.url);
const NATIVE_TIMINGS = new URL('./native-timings.json', import.meta.url);
const RENDER_ONE = join(REPO, 'test/corpus/render-one.ts');
/** Canonical (frozen) native dot times (id → ms), shared with the perf bench.
 *  The budget prefers these so it is stable run-to-run; the just-measured oracle
 *  time is the fallback for not-yet-captured inputs. @see capture-native.mjs */
const CANON_NATIVE: Record<string, number> = (() => {
  try { return JSON.parse(readFileSync(NATIVE_TIMINGS, 'utf8')).timings ?? {}; }
  catch { return {}; }
})();
/**
 * FLOOR term of the render budget (see `renderBudgetMs` for the full formula),
 * derived as 5x the slowest canonical native render so it scales with the host
 * (native-timings.json is frozen per-hardware). This keeps a slow-but-valid port
 * render from falsely timing out under concurrency — e.g. the mincross-heavy 2108
 * is ~7x its native time and, with 8-way CPU contention, can run several hundred
 * seconds though native is only ~13s — while a true runaway is still bounded.
 * Env override wins; falls back to 180s when no native timings are available.
 */
const MAX_NATIVE_MS = Math.max(0, ...Object.values(CANON_NATIVE));
const TIMEOUT_FLOOR_MS = Number(
  // At least one hour, then host-scaled beyond that: `timeout` must mean
  // *runaway*, not *slow*. The 5x-slowest-native derivation alone yields ~22min
  // here, which is under the time a legitimately heavy render can take (2621
  // measured 20.6min, 1652 13.7min — both uncomfortably close to being clipped).
  process.env.RENDER_TIMEOUT_FLOOR_MS ?? Math.max(3_600_000, Math.ceil(5 * MAX_NATIVE_MS)),
);
/** Oracle render cap: must comfortably exceed the corpus's slowest canonical
 *  native render even under survey concurrency (1652 = 270s native blew the old
 *  fixed 300s cap whenever its cache entry needed repopulating, poisoning every
 *  subsequent run). Scales like the floor: max(300s, 3x slowest native). */
const ORACLE_TIMEOUT_MS = Number(
  process.env.ORACLE_TIMEOUT_MS ?? Math.max(300_000, Math.ceil(3 * MAX_NATIVE_MS)),
);
/** Recorded warm port render times (id -> ms) from the perf bench, used only to
 *  pre-filter slow graphs out of a fast validation run (SURVEY_MAX_PORT_MS). */
const PORT_TIMES: Record<string, number> = (() => {
  try {
    const rows = JSON.parse(readFileSync(new URL('./perf.json', import.meta.url), 'utf8')).results ?? [];
    return Object.fromEntries(rows.map((r: { id: string; portMs?: number }) => [r.id, r.portMs ?? 0]));
  } catch { return {}; }
})();
/** Fast "did we break anything?" mode: when set, exclude graphs whose recorded
 *  warm port render exceeds this many ms (e.g. 60000), so a routine run skips the
 *  slow/timeout tail and focuses on divergences that complete in reasonable time.
 *  Graphs with no recorded port time are kept (assumed fast). 0 = no filter. */
const MAX_PORT_MS = Number(process.env.SURVEY_MAX_PORT_MS ?? 0);
/** Extracts a semantic version from `dot -V` output. */
const VERSION_RE = /version (\d+\.\d+\.\d+)/;

/**
 * Wall-clock budget for one port render: `max(FLOOR, MULT x native, MULT x own
 * recorded port time)`.
 *
 * The third term exists because the first two are blind to a graph whose port
 * cost far exceeds its native cost. 1652 renders in 823s against a 270s native
 * (3.0x), so `MULT x native` (810s) lands *below* its own uncontended time and
 * only the FLOOR (5x the slowest native = 1351s) kept it alive — 1.6x headroom.
 * LPT dispatch then starts the eight most expensive graphs together, so 1652 met
 * its worst contention exactly where it had the least room and was recorded
 * `timeout` despite being conformant standalone (measured 2026-07-29: conformant,
 * 823s). Scaling by the graph's own known cost gives every input the same 3x
 * headroom the MULT was meant to express, and still bounds a true runaway.
 *
 * Residual: this is a wall-clock bound on a CPU-cost estimate, so a graph can
 * still flip under pathological contention. If that recurs, re-verdict the id
 * with SURVEY_CONCURRENCY=1 before treating it as a regression.
 */
function renderBudgetMs(id: string, nativeMs: number): number {
  return Math.max(
    TIMEOUT_FLOOR_MS,
    Math.ceil(TIMEOUT_MULT * nativeMs),
    Math.ceil(TIMEOUT_MULT * (PORT_TIMES[id] ?? 0)),
  );
}

/**
 * Oracle render times (id -> ms) already recorded beside each cached oracle SVG.
 * A third cost signal for graphs the perf bench and the frozen native capture
 * both missed: 2621 appears in neither, so without this it scored 0 and sorted
 * as the cheapest possible render despite a ~4min oracle and a multi-minute port
 * render — it dispatched last AND escaped the heavy cap. Read once at startup;
 * an absent/unreadable cache simply contributes nothing.
 */
const CACHED_ORACLE_MS: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  try {
    for (const f of readdirSync(CACHE)) {
      if (!f.endsWith('.ms')) continue;
      const ms = Number(readFileSync(join(CACHE, f), 'utf8'));
      if (Number.isFinite(ms) && ms > 0) out[f.slice(0, -3)] = ms;
    }
  } catch { /* no cache yet */ }
  return out;
})();

/**
 * Expected cost of one render: the recorded warm port time when we have one,
 * else the canonical native time, else the oracle time recorded in the cache,
 * else 0 (unknown = assumed cheap). Same measure LPT dispatch orders by, so
 * "heavy" means the same thing in both places.
 */
function expectedCostMs(id: string): number {
  return PORT_TIMES[id] || CANON_NATIVE[id] || CACHED_ORACLE_MS[id] || 0;
}

/**
 * Cost above which a render competes for a heavy slot. Renders under this run
 * freely in any worker slot.
 */
const HEAVY_MS = Number(process.env.SURVEY_HEAVY_MS ?? 120_000);
/**
 * How many heavy renders may run at once.
 *
 * LPT dispatch (cost-descending) was introduced so the slowest renders start at
 * t=0 and overlap the fast bulk rather than bunching into a mutually-contending
 * tail — but it thereby guarantees the `concurrency` most expensive graphs run
 * *simultaneously*, which is the same contention it was meant to avoid, just
 * moved to the front. Measured on a 12-core/96GB host at concurrency 8: 1652
 * renders in 823s alone but blew a 2403s budget in the pool, and 2371/2646
 * inflated 3.8-5.7x over their standalone times — enough to flip four of the
 * heaviest graphs to `timeout` in a single sweep. Capping co-scheduled heavy
 * renders bounds that peak while light work still fills every worker slot, so
 * throughput is broadly preserved and the tail stays short.
 *
 * This is the same remedy the perf bench already applies for the same reason:
 * bench.mjs times heavy inputs serially (BENCH_HEAVY_POOL=1) because running
 * them concurrently was measured to inflate 2620's sample ~66% (1969->3268ms)
 * "via memory-bandwidth + scheduler cross-talk". The survey was simply missing
 * that protection.
 *
 * Known inefficiency: because dispatch is cost-descending, the first few workers
 * all draw heavy entries and those beyond HEAVY_SLOTS block on the semaphore
 * rather than moving on to light work, so a couple of worker slots idle during
 * the heavy phase. That is a throughput cost, not a correctness one — and it
 * lands exactly when less load is wanted. Fixing it properly means a separate
 * heavy queue; not worth the restructuring unless sweep wall-clock regresses.
 */
const HEAVY_SLOTS = Number(process.env.SURVEY_HEAVY_SLOTS ?? 2);

/** Minimal FIFO counting semaphore (no deps; used only by runPool). */
class Semaphore {
  private free: number;
  private readonly waiters: (() => void)[] = [];
  constructor(slots: number) {
    this.free = Math.max(1, slots);
  }
  async acquire(): Promise<void> {
    if (this.free > 0) {
      this.free--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }
  release(): void {
    const nextWaiter = this.waiters.shift();
    if (nextWaiter === undefined) this.free++;
    else nextWaiter();
  }
}

/** Verdict for one surveyed input. */
export type Verdict =
  | 'conformant'
  | 'structural-match'
  | 'diverged'
  | 'errored'
  | 'timeout'
  | 'oracle-error';

/** One row of parity.json (interface contract consumed by T3). */
export interface SurveyResult {
  id: string;
  path: string;
  verdict: Verdict;
  maxDelta?: number;
  firstDiffPath?: string;
  /**
   * XPath of the worst numeric diff — the location `maxDelta` occurs at. Unlike
   * `firstDiffPath` (set only for `diverged`, at the first STRUCTURAL diff), this
   * is set for both `diverged` and `structural-match` and is the bucket key that
   * lets the dashboard cluster structural-match near-misses. `undefined` only
   * when there are no numeric diffs. @see dashboard.ts structuralBucket
   */
  maxDeltaPath?: string;
  errMsg?: string;
  /**
   * Port-SPECIFIC clipping in points: how much farther drawn geometry falls
   * outside the viewport in the port than in the native render
   * (`max(0, portOverflow − nativeOverflow)`). The position-blind
   * `structural-match` verdict cannot see this; the gate flags new/worse
   * clipping as a regression. @see svgOverflow
   */
  clipOverflow?: number;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

/**
 * Spawn a process, capture stdout/stderr, and SIGKILL the entire process GROUP
 * after `timeoutMs`. Group-kill is essential: `tsx` runs the render in a
 * grandchild, and a port that hangs in a synchronous loop is unkillable
 * in-process (AD-2). Killing only the direct child would orphan the grandchild,
 * which keeps the stdout pipe open so `close` never fires and the survey stalls.
 * `detached: true` makes the child a group leader so `kill(-pid)` reaches the
 * whole tree.
 */
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
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    /* already exited (ESRCH) */
  }
}

/** Locate a runnable `tsx`: TSX_BIN, local bin, npx cache, else `npx tsx`. */
function resolveTsx(): { cmd: string; pre: string[] } {
  if (process.env.TSX_BIN) return { cmd: process.env.TSX_BIN, pre: [] };
  const local = join(REPO, 'node_modules/.bin/tsx');
  if (existsSync(local)) return { cmd: local, pre: [] };
  const cached = findCachedTsx();
  if (cached) return { cmd: cached, pre: [] };
  return { cmd: 'npx', pre: ['--no-install', 'tsx'] };
}

/** Search the npx cache for a tsx binary (machine-specific hashed dirs). */
function findCachedTsx(): string | null {
  const npx = join(homedir(), '.npm/_npx');
  if (!existsSync(npx)) return null;
  for (const dir of readdirSync(npx)) {
    const bin = join(npx, dir, 'node_modules/.bin/tsx');
    if (existsSync(bin)) return bin;
  }
  return null;
}

/**
 * Render an input with the native oracle, caching the SVG and the native render
 * time (a `.ms` sidecar) under CACHE. The time seeds the port's per-input budget
 * (max(MULT×native, FLOOR)), so it must be cached alongside the SVG (AD-3).
 */
async function oracleSvg(absInput: string, id: string): Promise<{ svg?: string; ms?: number; err?: string }> {
  const cacheFile = join(CACHE, `${id}.svg`);
  const msFile = join(CACHE, `${id}.ms`);
  if (existsSync(cacheFile) && existsSync(msFile)) {
    const cached = readFileSync(cacheFile, 'utf8');
    const ms = Number(readFileSync(msFile, 'utf8'));
    if (cached.length > 0 && Number.isFinite(ms)) return { svg: cached, ms };
  }
  const env = { ...process.env, GVBINDIR };
  const t = Date.now();
  const r = await spawnCapture(DOT_BIN, ['-Tsvg', absInput], env, ORACLE_TIMEOUT_MS);
  const ms = Date.now() - t;
  // The native `dot` exits nonzero on warnings AND on recoverable errors (e.g.
  // "trouble in init_rank") while still emitting a COMPLETE SVG. Exit code is
  // therefore not a validity signal — completeness (a closing </svg>) is. Only
  // a timeout or a truncated/empty render is a genuine oracle-error.
  if (r.timedOut || !r.stdout.includes('</svg>')) {
    return { err: firstLine(r.stderr) || `oracle exit ${r.code}` };
  }
  writeFileSync(cacheFile, r.stdout);
  writeFileSync(msFile, String(ms));
  return { svg: r.stdout, ms };
}

/** Render an input with the port in an isolated, budget-killed subprocess. */
async function portSvg(
  absInput: string,
  tsx: { cmd: string; pre: string[] },
  budgetMs: number,
): Promise<{ svg?: string; verdict?: Verdict; errMsg?: string }> {
  const args = [...tsx.pre, RENDER_ONE, absInput, 'dot'];
  const r = await spawnCapture(tsx.cmd, args, process.env, budgetMs);
  if (r.timedOut) return { verdict: 'timeout' };
  if (r.code !== 0 || r.stdout.length === 0) {
    return { verdict: 'errored', errMsg: portErrMsg(r.stderr) || `port exit ${r.code}` };
  }
  return { svg: r.stdout };
}

/** First non-empty line of a (possibly multi-line) string. */
function firstLine(s: string): string {
  for (const line of s.split('\n')) {
    if (line.trim().length > 0) return line.trim();
  }
  return '';
}

/** Extract the port's thrown error: the `__RENDER_ERROR__` sentinel line if
 * present (incidental warnings precede it), else the first stderr line. */
function portErrMsg(stderr: string): string {
  const marker = '__RENDER_ERROR__';
  for (const line of stderr.split('\n')) {
    if (line.startsWith(marker)) return line.slice(marker.length).trim();
  }
  return firstLine(stderr);
}

/**
 * Max distance (pt) any drawn geometry falls outside the SVG viewport, after
 * the root group's `translate`. 0 means fully in view. Catches clipped renders
 * that the position-blind structural-match verdict misses (e.g. packed cluster
 * boxes that landed at negative coordinates).
 */
function svgOverflow(svg: string): number {
  const vb = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  const tr = /transform="[^"]*translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(svg);
  if (!vb || !tr) return 0;
  const W = Number(vb[1]); const H = Number(vb[2]);
  const tx = Number(tr[1]); const ty = Number(tr[2]);
  let worst = 0;
  const bump = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const X = x + tx; const Y = y + ty;
    worst = Math.max(worst, -X, X - W, -Y, Y - H);
  };
  for (const m of svg.matchAll(/points="([^"]+)"/g)) {
    for (const p of m[1].trim().split(/\s+/)) {
      const a = p.split(','); bump(Number(a[0]), Number(a[1]));
    }
  }
  for (const m of svg.matchAll(/<ellipse[^>]*cx="([-\d.]+)" cy="([-\d.]+)" rx="([-\d.]+)" ry="([-\d.]+)"/g)) {
    const cx = Number(m[1]); const cy = Number(m[2]); const rx = Number(m[3]); const ry = Number(m[4]);
    bump(cx - rx, cy - ry); bump(cx + rx, cy + ry);
  }
  return worst;
}

/** Port-specific clipping: how much more the port overflows the viewport than native. */
function clipOverflow(port: string, oracle: string): number {
  return Math.max(0, svgOverflow(port) - svgOverflow(oracle));
}

/**
 * True iff `svg` is well-formed enough for compareSvg to normalize it. Reuses
 * the SAME parser (`normalizeSvg`) that compareSvg uses, so a `true` result
 * guarantees compareSvg will not throw on this SVG. Pure, no I/O, never throws.
 * Used to gate the ORACLE side only (see surveyOne) — a non-well-formed native
 * render is an oracle-usability fault, not a port divergence (fix-1472 AD-1).
 */
export function isWellFormedSvg(svg: string): boolean {
  try {
    normalizeSvg(svg);
    return true;
  } catch {
    return false;
  }
}

/** Classify a rendered pair: conformant / structural-match / diverged. */
export function diffVerdict(port: string, oracle: string): Omit<SurveyResult, 'id' | 'path'> {
  let diffs: Diff[];
  try {
    const cmp = compareSvg(port, oracle, 'deterministic');
    if (cmp.pass) return { verdict: 'conformant' };
    diffs = cmp.diffs;
  } catch (e) {
    return { verdict: 'diverged', firstDiffPath: '<compare-threw>', errMsg: errText(e) };
  }
  const numeric = diffs.filter((d) => d.delta !== undefined);
  const structural = diffs.find((d) => d.delta === undefined);
  // Track the worst numeric diff AND its path in one pass. First-encountered
  // wins on ties (strict `>`), a stable order-defined tie-break over the
  // compareSvg walk order — same source array/order as the old maxDelta reduce.
  let maxDelta = 0;
  let maxDeltaPath: string | undefined;
  for (const d of numeric) {
    if ((d.delta ?? 0) > maxDelta) {
      maxDelta = d.delta ?? 0;
      maxDeltaPath = d.path;
    }
  }
  if (structural) {
    return { verdict: 'diverged', maxDelta, firstDiffPath: structural.path, maxDeltaPath };
  }
  return { verdict: 'structural-match', maxDelta, maxDeltaPath };
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Survey one applicable input end-to-end. */
async function surveyOne(
  entry: CorpusEntry,
  tsx: { cmd: string; pre: string[] },
): Promise<SurveyResult> {
  const absInput = join(ROOT, entry.path);
  const meta = { id: entry.id, path: entry.path };
  const oracle = await oracleSvg(absInput, entry.id);
  if (oracle.svg === undefined) return { ...meta, verdict: 'oracle-error', errMsg: oracle.err };
  // A non-empty but non-well-formed oracle (native dot leaking invalid UTF-8 into
  // its SVG, e.g. tests/1472.dot) is an oracle-usability fault, not a port
  // divergence: compareSvg would throw normalizing the ORACLE and diffVerdict
  // would blanket it as `diverged`, blaming the port. Short-circuit to
  // oracle-error BEFORE rendering the port. Message stays PII-free — no raw
  // oracle bytes (they carry the invalid UTF-8). See decisions.md AD-1.
  if (!isWellFormedSvg(oracle.svg)) {
    return { ...meta, verdict: 'oracle-error', errMsg: `oracle not well-formed XML: ${oracle.svg.length}B` };
  }
  // Budget = max(MULT × native, FLOOR): only a non-erroring run past this is a
  // timeout. Native time is the canonical (frozen) value when captured, else the
  // time the oracle run just measured.
  const nativeMs = CANON_NATIVE[entry.id] ?? oracle.ms ?? 0;
  const budgetMs = renderBudgetMs(entry.id, nativeMs);
  const port = await portSvg(absInput, tsx, budgetMs);
  if (port.svg === undefined) return { ...meta, verdict: port.verdict!, errMsg: port.errMsg };
  const co = clipOverflow(port.svg, oracle.svg);
  return {
    ...meta,
    ...diffVerdict(port.svg, oracle.svg),
    ...(co > 0.5 ? { clipOverflow: Math.round(co * 10) / 10 } : {}),
  };
}

/** Bounded worker pool: run `entries` `concurrency`-at-a-time, preserving order. */
async function runPool(
  entries: CorpusEntry[],
  tsx: { cmd: string; pre: string[] },
  concurrency: number,
): Promise<SurveyResult[]> {
  const results: SurveyResult[] = new Array(entries.length);
  const heavy = new Semaphore(HEAVY_SLOTS);
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    for (let i = next++; i < entries.length; i = next++) {
      const entry = entries[i];
      // Heavy renders take a heavy slot as well as their worker slot, so at most
      // HEAVY_SLOTS of them ever run together (see HEAVY_MS).
      if (expectedCostMs(entry.id) > HEAVY_MS) {
        await heavy.acquire();
        try { results[i] = await surveyOne(entry, tsx); } finally { heavy.release(); }
      } else {
        results[i] = await surveyOne(entry, tsx);
      }
      if (++done % 50 === 0) process.stderr.write(`  ${done}/${entries.length}\n`);
    }
  };
  const n = Math.min(concurrency, entries.length);
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

/** Tally verdict counts (keys cover every verdict; sum === total). */
function tally(results: SurveyResult[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = {
    conformant: 0,
    'structural-match': 0,
    diverged: 0,
    errored: 0,
    timeout: 0,
    'oracle-error': 0,
  };
  for (const r of results) counts[r.verdict]++;
  return counts;
}

/** Read `dot -V` and return a short version string ("dot 15.0.0"). */
async function oracleVersion(): Promise<string> {
  const r = await spawnCapture(DOT_BIN, ['-V'], { ...process.env, GVBINDIR }, 5000);
  const m = (r.stderr + r.stdout).match(VERSION_RE);
  return m ? `dot ${m[1]}` : 'dot (unknown)';
}

async function main(): Promise<void> {
  if (!existsSync(DOT_BIN)) {
    process.stderr.write(`harness fault: oracle binary not found at ${DOT_BIN}\n`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as CorpusEntry[];
  let applicable = manifest.filter((e) => e.status === 'applicable');
  const limit = Number(process.env.SURVEY_LIMIT ?? 0);
  if (limit > 0) applicable = applicable.slice(0, limit);
  let skippedSlow = 0;
  if (MAX_PORT_MS > 0) {
    const before = applicable.length;
    applicable = applicable.filter((e) => !(PORT_TIMES[e.id] > MAX_PORT_MS));
    skippedSlow = before - applicable.length;
  }
  mkdirSync(CACHE, { recursive: true });
  const tsx = resolveTsx();
  process.stderr.write(
    `surveying ${applicable.length} applicable inputs ` +
      `(concurrency ${CONCURRENCY}, budget max(${TIMEOUT_MULT}x native, ` +
      `${TIMEOUT_MULT}x recorded port, ${TIMEOUT_FLOOR_MS}ms))\n` +
      (MAX_PORT_MS > 0 ? `fast mode: excluded ${skippedSlow} graphs with port time > ${MAX_PORT_MS}ms\n` : '') +
      `oracle ${DOT_BIN} (cap ${ORACLE_TIMEOUT_MS}ms)\ncache ${CACHE}\nport via ${tsx.cmd}\n`,
  );
  // LPT dispatch (longest expected job first): start the slowest renders at
  // t=0 so they overlap the fast bulk of the corpus instead of bunching into a
  // mutually-contending tail — 8 concurrent monsters at the end stretched 1652
  // (~735s standalone) past even its 5x-native budget. Expected cost = warm
  // port time when recorded, else canonical native time. Results are restored
  // to manifest order below, so parity.json ordering is unchanged.
  const manifestIdx = new Map(applicable.map((e, i) => [e.id, i]));
  const cost = (e: CorpusEntry): number => expectedCostMs(e.id);
  const dispatch = [...applicable].sort((a, b) => cost(b) - cost(a));
  const pooled = await runPool(dispatch, tsx, CONCURRENCY);
  const results: SurveyResult[] = new Array(applicable.length);
  for (let i = 0; i < dispatch.length; i++) results[manifestIdx.get(dispatch[i].id)!] = pooled[i];
  const counts = tally(results);
  const report = {
    generatedAt: new Date().toISOString(),
    generatedWith: 'test/corpus/survey.ts',
    oracleVersion: await oracleVersion(),
    corpusRoot: scrubHome(ROOT),
    total: results.length,
    counts,
    results: results.map((r) =>
      r.errMsg !== undefined ? { ...r, errMsg: scrubHome(r.errMsg) } : r,
    ),
  };
  writeFileSync(PARITY, JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`wrote parity.json — ${JSON.stringify(counts)}\n`);
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`harness fault: ${errText(e)}\n`);
    process.exit(2);
  });
}
