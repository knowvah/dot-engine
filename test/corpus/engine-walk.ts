// SPDX-License-Identifier: EPL-2.0
//
// Non-dot engine conformance walk (corpus hardening).
//
// Runs the SVG-conformant corpus set (parity.json, dot-track verdicts) through
// ONE non-dot deterministic engine, comparing the port's xdot against the
// native oracle (`dot -K <engine> -Txdot`, GVBINDIR=/tmp/ghl) with the semantic
// comparator (test/golden/compare-xdot.ts). Items are size-sorted small→large
// so shared mechanisms surface early. Output is JSONL (append-per-item) so
// progress is monitorable and survives interruption — a re-run resumes by
// skipping ids already recorded in the output file. After the sweep completes,
// a parity-<engine>.json summary (counts + all rows) is written for
// parity-report.ts.
//
// Usage: npx tsx test/corpus/engine-walk.ts <engine> [outJsonlPath]
//
// Node-only dev/test infra — never imported by src/index.ts. The sweep runs
// only under the `isMain` guard at the bottom, so the pure budget helpers above
// can be imported by engine-walk.test.ts without kicking off a corpus walk.

import { readFileSync, statSync, appendFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { compareXdot } from '../golden/compare-xdot.js';
import { preventIdleSleep, startClock, sleepInflated } from './keep-awake.js';
import { excludedFor } from './engine-exclusions.js';

/** Per-item outcome of the walk (one JSONL line each). */
export type EngineWalkStatus = 'pass' | 'diverged' | 'oracle-error' | 'port-error' | 'timeout';

/** One JSONL row / one entry of parity-<engine>.json's `results`. */
export interface EngineWalkRow {
  id: string;
  size: number;
  status: EngineWalkStatus;
  nDiffs?: number;
  firstDiff?: string;
  err?: string;
  /**
   * ACTIVE ms for the native oracle invocation (monotonic clock, so sleep is
   * excluded — see `portMs`), recorded on EVERY row including `oracle-error`,
   * where it says how long the oracle ran before failing. A cap-induced ETIMEDOUT
   * then reads as ~the cap, distinguishing "the oracle cannot render this" from
   * "we did not wait".
   *
   * The walker always measured this and threw it away, which made a basic
   * question — is a slow row the port's fault or the oracle's? — unanswerable
   * from the artifact and payable only by re-running the render. `survey.ts`
   * caches oracle ms beside each cached SVG for exactly this reason.
   */
  oracleMs?: number;
  /**
   * ACTIVE ms for the port render, from the monotonic clock — which on Darwin does
   * not advance while the system sleeps. This is the number comparable to the
   * budget, because node/libuv timers run on that same clock, so the timeout is
   * enforced on active time too.
   *
   * Present on `timeout` rows, where it is the budget that was consumed.
   *
   * NOT comparable to `oracleMs` on cheap graphs: this spawns `npx tsx`, so it
   * carries ~1s of node/tsx startup, while `oracleMs` is a direct `execFileSync`
   * of a native binary. Measured example — `2285` (an 11-byte graph) records
   * oracleMs 42 / portMs 1294, a 30x "ratio" that is almost entirely process
   * boot. Only read the ratio where render time dominates startup (say portMs
   * over ~10s); below that it says nothing about the port's speed.
   */
  portMs?: number;
  /**
   * WALL-clock ms for the port render, recorded only when it exceeds the active
   * time by more than 5% — i.e. only when the machine slept or the process was
   * suspended mid-render.
   *
   * Its presence is the signal: it means this row's wall-clock cost is inflated by
   * `portWallMs - portMs` of not-running, so do not read it as compute. A 2222
   * walk on 2026-07-31 recorded 8110856ms wall against a 7200000ms budget — an
   * impossibility that took a `pmset -g log` archaeology session to explain, and
   * that this field now states outright. @see keep-awake.ts
   */
  portWallMs?: number;
  /** Same relationship to `oracleMs`: present only when sleep inflated it. */
  oracleWallMs?: number;
}

/** parity-<engine>.json shape (consumed by parity-report.ts). */
export interface EngineParityReport {
  generatedAt: string;
  generatedWith: string;
  engine: string;
  /** comparison tolerance in points (0.01 deterministic, 0.5 iterative) */
  tolerance?: number;
  total: number;
  counts: Record<EngineWalkStatus, number>;
  results: EngineWalkRow[];
}

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const CORPUS = process.env.CORPUS_ROOT ?? join(homedir(), 'git/graphviz/tests');
const DOT_BIN = process.env.DOT_BIN ?? join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const GVBINDIR = process.env.GVBINDIR ?? '/tmp/ghl';

/**
 * Per-engine comparison tolerance. The deterministic engines are held to
 * the 0.01 bar (every diff is a chaseable defect); the ITERATIVE
 * force-directed engines (neato/fdp/sfdp) accumulate floating-point that
 * JS cannot reproduce bit-for-bit (accepted class A1 — FMA/pow/libm), so
 * their documented bar is 0.5pt: the sweep characterizes behavior rather
 * than gating byte-fidelity. @see docs/known-divergences.md#a1
 */
const ITERATIVE_ENGINES = new Set(['neato', 'fdp', 'sfdp']);
const EXCLUSIONS = new URL('./engine-exclusions.json', import.meta.url);

// ---------------------------------------------------------------------------
// Render budget (pure + injectable, so engine-walk.test.ts can exercise it)
// ---------------------------------------------------------------------------

/** Resolved budget knobs. */
export interface BudgetConfig {
  /** Multiplier applied to a graph's known cost. */
  mult: number;
  /** Lower bound for any port render, for graphs with no recorded cost. */
  floorMs: number;
  /** Cap on one oracle invocation. */
  oracleMs: number;
}

/** Recorded per-id costs the budget scales by. Empty tables are valid. */
export interface CostTables {
  /** id -> warm port render ms (perf.json). */
  portMs: Record<string, number>;
  /** id -> canonical native render ms (native-timings.json). */
  nativeMs: Record<string, number>;
}

/**
 * Default budget knobs, overridable per run.
 *
 * The floor is **one hour**, replacing the 90s this walker used to hard-code and
 * the 300s that briefly replaced it. `timeout` must mean *runaway*, not *slow*:
 * the row is indistinguishable from a real failure in every consumer, and
 * `attribute-divergence.ts` selects only `status === 'diverged'`, so a phantom
 * timeout silently removes a graph from attribution forever. A tight budget
 * therefore does not fail safe — it fabricates verdicts. That is not theoretical:
 * the 90s cap produced four such rows (`2108` on all three iterative tracks,
 * `1652` on fdp), and the 300s replacement was still chosen by the wrong
 * reasoning ("bound a runaway cheaply") rather than by what a real render costs.
 *
 * At this stage of the port, sweep wall-clock is cheap relative to a wrong
 * verdict, so an individual item may legitimately run for up to an hour. Genuinely
 * heavy graphs are ALSO covered by the `mult x cost` terms below; the floor exists
 * for graphs with no recorded cost, of which there are currently 151.
 */
export function budgetConfigFromEnv(env: Record<string, string | undefined> = process.env): BudgetConfig {
  return {
    mult: Number(env['ENGINE_TIMEOUT_MULT'] ?? 3),
    floorMs: Number(env['ENGINE_TIMEOUT_FLOOR_MS'] ?? 3_600_000),
    // One hour, for the same reason as the port floor: a 300s oracle cap turned
    // slow-but-valid native renders into `oracle-error` rows, which read as "the
    // oracle cannot render this" when the truth is "we did not wait". Nine such
    // rows existed across the five xdot tracks (`2222` on all five; `1652`,
    // `graphs-b103`, `2621` on circo), each an unexamined id wearing a failure's
    // clothing. `2621`'s oracle alone needs ~256s for `dot` and more under circo.
    oracleMs: Number(env['ENGINE_ORACLE_TIMEOUT_MS'] ?? 3_600_000),
  };
}

/**
 * Read a `{ results: [{id, portMs}] }` cost table (perf.json). Never throws: a
 * missing or malformed file yields an empty table, which degrades the budget to
 * its floor rather than taking the sweep down.
 */
export function loadPortTimes(path: string): Record<string, number> {
  try {
    const rows = (JSON.parse(readFileSync(path, 'utf8')) as { results?: { id: string; portMs?: number }[] })
      .results ?? [];
    const out: Record<string, number> = {};
    for (const r of rows) if (r.portMs !== undefined && r.portMs > 0) out[r.id] = r.portMs;
    return out;
  } catch { return {}; }
}

/** Read a `{ timings: {id: ms} }` table (native-timings.json). Never throws. */
export function loadNativeTimes(path: string): Record<string, number> {
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as { timings?: Record<string, number> }).timings ?? {};
  } catch { return {}; }
}

/**
 * Wall-clock budget for one port render:
 * `max(floor, mult x native, mult x recorded port time)`.
 *
 * The third term is the one that matters for the heavy tail, and it is why the
 * budget cannot be a single constant: `2621` renders in 1237s (measured
 * 2026-07-29) against a 256s native, so any floor small enough to bound a
 * runaway is far too small for it, while a floor large enough for it would blunt
 * runaway detection for the other 900+ inputs. Scaling by the graph's own known
 * cost gives every input the same headroom.
 *
 * Cost data is a loose upper bound here: perf.json records SVG (`dot`) port
 * times, and an xdot render of another engine is usually cheaper. That is the
 * safe direction for a runaway bound. Note `survey.ts` needs a third signal (the
 * oracle ms cached beside each SVG) because 2621 was absent from both cost
 * files; it now has entries in both, so two terms suffice here. (This walker did
 * gain an oracle cache — see `oracleXdot` — but deliberately does NOT feed it
 * into the budget: cached oracle time says what the ORACLE costs, and using it to
 * bound the PORT is the conflation that produced the `3x native` term being
 * smaller than a graph's own render.)
 */
export function renderBudgetMs(
  id: string,
  nativeMs: number,
  cfg: BudgetConfig = CONFIG,
  costs: CostTables = COSTS,
): number {
  return Math.max(
    cfg.floorMs,
    Math.ceil(cfg.mult * nativeMs),
    Math.ceil(cfg.mult * (costs.portMs[id] ?? 0)),
    Math.ceil(cfg.mult * (costs.nativeMs[id] ?? 0)),
  );
}

const CONFIG: BudgetConfig = budgetConfigFromEnv();
const COSTS: CostTables = {
  portMs: loadPortTimes(join(REPO, 'test/corpus/perf.json')),
  nativeMs: loadNativeTimes(join(REPO, 'test/corpus/native-timings.json')),
};

// ---------------------------------------------------------------------------
// Oracle cache (mirrors json-walk.ts's engine-scoped cache)
// ---------------------------------------------------------------------------

/**
 * Cache identity: (binary, GVBINDIR, binary mtime). Namespacing by this means two
 * differently-built oracles can never read each other's entries, and rebuilding
 * `dot` auto-invalidates — the failure mode survey.ts documents from experience,
 * where a bare shared directory silently cross-contaminated a headless and a
 * pango oracle because they shared ids.
 */
export function oracleCacheSig(dotBin: string, gvbindir: string, mtimeMs: string): string {
  return createHash('sha1').update(`${dotBin}\0${gvbindir}\0${mtimeMs}`).digest('hex').slice(0, 12);
}

const ORACLE_SIG = oracleCacheSig(DOT_BIN, GVBINDIR, (() => {
  try { return String(statSync(DOT_BIN).mtimeMs); } catch { return ''; }
})());

/** Per-engine cache dir: the same id renders differently per engine, so the
 *  engine must be part of the key (survey.ts is dot-only and omits it). */
function oracleCacheDir(engine: string): string {
  return process.env['ENGINE_ORACLE_CACHE'] ?? join(tmpdir(), 'dot-corpus-xdot-oracle', engine, ORACLE_SIG);
}

/**
 * Fetch the oracle's xdot for one input, caching complete renders.
 *
 * Without this the walker re-rendered the oracle on every walk, so re-verdicting
 * a heavy id cost its full oracle time again — 46 minutes for `2222`, for output
 * already on disk. That turned staged investigation into something to ration.
 *
 * Only COMPLETE output is cached (a closing `}`): completeness, not exit status,
 * is the validity signal, because native `dot` exits nonzero on recoverable
 * warnings while still emitting a whole document. Errors and timeouts are
 * deliberately NOT cached — a cap-induced failure must not become sticky.
 *
 * `ms` is the ORIGINAL measured render time, returned unchanged on a cache hit,
 * so a row's `oracleMs` always states what the oracle actually costs rather than
 * how long a file read took.
 */
function oracleXdot(path: string, id: string, engine: string, cacheDir: string):
  { xdot?: string; ms?: number; wallMs?: number; err?: string } {
  const cacheFile = join(cacheDir, `${id}.xdot`);
  const msFile = join(cacheDir, `${id}.ms`);
  if (existsSync(cacheFile) && existsSync(msFile)) {
    const cached = readFileSync(cacheFile, 'utf8');
    const ms = Number(readFileSync(msFile, 'utf8'));
    if (cached.trimEnd().endsWith('}') && Number.isFinite(ms)) return { xdot: cached, ms };
  }
  const read = startClock();
  let out = '';
  try {
    out = execFileSync(DOT_BIN, ['-K', engine, '-Txdot', path], {
      env: { ...process.env, GVBINDIR }, encoding: 'utf8', timeout: CONFIG.oracleMs,
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch (err) {
    const so = (err as { stdout?: unknown }).stdout;
    if (typeof so === 'string' && so.trimEnd().endsWith('}')) {
      out = so; // complete despite nonzero exit
    } else {
      const t = read();
      return { ms: t.activeMs, wallMs: sleepInflated(t.activeMs, t.wallMs),
               err: String((err as Error).message).split('\n')[0]!.slice(0, 160) };
    }
  }
  const t = read();
  const ms = t.activeMs;
  const wallMs = sleepInflated(t.activeMs, t.wallMs);
  if (!out.trimEnd().endsWith('}')) return { ms, wallMs, err: 'incomplete oracle output' };
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, out);
  writeFileSync(msFile, String(ms));
  return { xdot: out, ms, wallMs };
}

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const engine = process.argv[2];
  if (!engine) {
    console.error('usage: npx tsx test/corpus/engine-walk.ts <engine> [outJsonlPath]');
    process.exit(2);
  }
  const TOLERANCE = ITERATIVE_ENGINES.has(engine) ? 0.5 : 0.01;
  const OUT = process.argv[3] ?? fileURLToPath(new URL(`./parity-${engine}.jsonl`, import.meta.url));
  const SUMMARY = fileURLToPath(new URL(`./parity-${engine}.json`, import.meta.url));
  const CACHE = oracleCacheDir(engine);
  // Hold an idle-sleep assertion for the whole walk: sleep does not break the
  // timeout (libuv's clock pauses too) but it corrupts every wall-clock number
  // we record. @see keep-awake.ts
  const awake = preventIdleSleep();

  interface ParityEntry { id: string; path: string; verdict: string }
  const parity = JSON.parse(
    readFileSync(join(REPO, 'test/corpus/parity.json'), 'utf8'),
  ) as { results: ParityEntry[] };
  const allItems = parity.results
    .filter((r) => r.verdict === 'conformant')
    .map((r) => {
      const p = join(CORPUS, r.path);
      let size = Number.MAX_SAFE_INTEGER;
      try { size = statSync(p).size; } catch { /* missing file -> sort last */ }
      return { id: r.id, path: p, size };
    })
    .sort((a, b) => a.size - b.size || (a.id < b.id ? -1 : 1));
  // Drop ids this engine cannot meaningfully exercise (@see engine-exclusions.ts).
  const excluded = excludedFor(EXCLUSIONS, engine);
  const items = allItems.filter((it) => !excluded.has(it.id));

  // resume: skip ids already in the output file
  const done = new Set<string>();
  if (existsSync(OUT)) {
    for (const ln of readFileSync(OUT, 'utf8').split('\n')) {
      if (!ln) continue;
      try { done.add((JSON.parse(ln) as { id: string }).id); } catch { /* partial line */ }
    }
  } else {
    writeFileSync(OUT, '');
  }

  // State the budget actually in force. survey.ts shipped a stale banner that
  // reported a formula it no longer used, which cost real debugging time.
  console.error(
    `[${engine}] ${items.length} conformant items (${done.size} already recorded), tolerance ${TOLERANCE}\n` +
      `[${engine}] port budget max(${CONFIG.floorMs}ms, ${CONFIG.mult}x native, ${CONFIG.mult}x recorded cost), ` +
      `oracle cap ${CONFIG.oracleMs}ms\n` +
      `[${engine}] cost tables: ${Object.keys(COSTS.portMs).length} port, ` +
      `${Object.keys(COSTS.nativeMs).length} native\n` +
      `[${engine}] oracle cache ${CACHE}\n` +
      `[${engine}] idle-sleep assertion: ${awake ? 'held' : 'NOT held'}\n` +
      (excluded.size > 0
        ? `[${engine}] excluded ${excluded.size}: ${[...excluded.keys()].join(', ')}\n`
        : ''),
  );

  let n = 0;
  for (const it of items) {
    n++;
    if (done.has(it.id)) continue;
    const rec: EngineWalkRow = { id: it.id, size: it.size, status: 'pass' };

    // oracle — native dot exits nonzero on recoverable warnings (e.g. a
    // missing image file) while still emitting a COMPLETE xdot document.
    // Completeness (a closing `}`) is the validity signal, not the exit code —
    // the json/map/plain walkers already classify this way; exit-code-fatal
    // here left 45 comparable ids as phantom "oracle-error" rows.
    const o = oracleXdot(it.path, it.id, engine, CACHE);
    rec.oracleMs = o.ms;
    if (o.wallMs !== undefined) rec.oracleWallMs = o.wallMs;
    if (o.xdot === undefined) {
      rec.status = 'oracle-error';
      rec.err = o.err;
      appendFileSync(OUT, JSON.stringify(rec) + '\n');
      continue;
    }
    const oracle = o.xdot;

    // port (spawned, hang-safe). detached + negative-pid kill takes the WHOLE
    // process group: killing only the npx wrapper leaves the node grandchild
    // spinning forever on a hung render (observed: a 241_1/circo render
    // orphaned at 100% CPU for 20h after spawnSync's killSignal).
    const budgetMs = renderBudgetMs(it.id, COSTS.nativeMs[it.id] ?? 0);
    const readPortClock = startClock();
    const r = await new Promise<{ stdout: string; stderr: string; status: number | null; timedOut: boolean }>(
      (resolve) => {
        const child = spawn('npx', ['tsx', join(REPO, 'test/corpus/render-one-xdot.ts'), it.path, engine], {
          cwd: REPO, env: process.env, detached: true,
        });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          if (child.pid !== undefined) {
            try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
          }
        }, budgetMs);
        child.stdout.on('data', (d: Buffer) => (stdout += d));
        child.stderr.on('data', (d: Buffer) => (stderr += d));
        child.on('error', (e) => (stderr += String(e)));
        child.on('close', (status) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, status, timedOut });
        });
      },
    );
    const pt = readPortClock();
    const elapsedMs = pt.activeMs;
    rec.portMs = elapsedMs;
    if (sleepInflated(pt.activeMs, pt.wallMs) !== undefined) rec.portWallMs = pt.wallMs;
    if (r.timedOut) {
      // State elapsed AND budget so a reader can tell a genuine runaway from a
      // render that was merely long, without re-running anything.
      rec.status = 'timeout';
      rec.err = `ran ${elapsedMs}ms, exceeded ${budgetMs}ms budget`;
    } else if (r.status !== 0) {
      const m = /__RENDER_ERROR__ (.*)/.exec(r.stderr ?? '');
      rec.status = 'port-error';
      rec.err = (m?.[1] ?? (r.stderr ?? '')).slice(0, 200);
    } else {
      const res = compareXdot(r.stdout, oracle, TOLERANCE);
      if (res.pass) {
        rec.status = 'pass';
      } else {
        const d = res.diffs[0];
        rec.status = 'diverged';
        rec.nDiffs = res.diffs.length;
        rec.firstDiff = d
          ? `${d.object} ${d.attr} ${d.path}: ${d.actual} vs ${d.expected}`
          : 'no-diff-detail';
      }
    }
    appendFileSync(OUT, JSON.stringify(rec) + '\n');
    if (n % 50 === 0) console.error(`[${engine}] ${n}/${items.length}`);
  }

  // summary: re-read the (possibly resumed) JSONL so the JSON reflects every row.
  const results: EngineWalkRow[] = [];
  for (const ln of readFileSync(OUT, 'utf8').split('\n')) {
    if (!ln) continue;
    try { results.push(JSON.parse(ln) as EngineWalkRow); } catch { /* partial line */ }
  }
  const counts: Record<EngineWalkStatus, number> = {
    pass: 0, diverged: 0, 'oracle-error': 0, 'port-error': 0, timeout: 0,
  };
  for (const row of results) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const summary: EngineParityReport = {
    generatedAt: new Date().toISOString(),
    generatedWith: 'test/corpus/engine-walk.ts',
    engine,
    tolerance: TOLERANCE,
    total: results.length,
    counts,
    results,
  };
  writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n');

  console.log(`[${engine}] done: ${items.length} items -> ${OUT}`);
  console.log(`[${engine}] summary -> ${SUMMARY}`);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  await main();
}
