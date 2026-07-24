// SPDX-License-Identifier: EPL-2.0
//
// WASM head-to-head bench: @knowvah/dot-engine (this port) vs the WASM build
// @hpcc-js/wasm-graphviz. PEER to bench.mjs, DIFFERENT axis:
//   - bench.mjs        → port vs native `dot` (the <=3x-native fidelity target)
//   - wasm-bench.mjs   → port vs the in-browser WASM alternative (a report)
// Answers the question a browser consumer actually asks: "how does the pure-TS
// port compare to shipping Graphviz-compiled-to-WASM?" — on speed, apples to
// apples (both JS-callable, warm, in-process, same warmup + best-of-N).
//
// Feeds wasm-perf.json, which perf-dashboard.mjs folds into PERF.md as the
// "dot-engine vs WASM" section. A REPORT, not a gate: we do not gate on being
// faster than WASM (we are not — it is compiled C).
//
// Method & fairness (stated, never silent — see also CLAUDE.md "no silent caps"):
//   - Warm, in-process: renderSvg(src, engine) vs graphviz.layout(src,'svg',engine),
//     each warmed then timed best-of-N (min). Module/instantiate load excluded on
//     BOTH sides — the steady state a long-lived app sees.
//   - Only inputs BOTH engines render successfully count toward the ratio;
//     per-side errors are recorded and reported.
//   - Heavy inputs (native > HEAVY_MS) are excluded and listed — a warm best-of-N
//     over multi-second layouts is impractical here; their vs-native behavior is
//     already in PERF.md's main table.
//   - Very large inputs (DOT source > LARGE_SRC_BYTES, default 1 MB) are excluded
//     and listed. These are a handful of multi-MB disassembly/CFG dumps (1864,
//     2064, 2475_1, 2593, ~10k+ nodes) that are impractical for a warm best-of-N.
//     They are hard for Graphviz GENERALLY, not port-specific: spot-checked,
//     2064 fails to render in native `dot` (>120s), the WASM build (>60s in
//     layout), and the port (>30s) alike; 1864 OOMs BOTH the port (>1 GB) and the
//     WASM build ("out of memory") while native times out. A scale ceiling shared
//     with upstream. Excluded so they don't dominate/stall the sweep. Not
//     silently dropped.
//   - NOTE on memory: the port does NOT leak — with GC between renders its heap
//     is flat (~17 MB). The apparent growth in a tight no-yield loop is deferred
//     GC, a harness artifact, not a library defect. We force GC periodically so a
//     long serial sweep stays bounded.
//
// Regenerate: npm run build:js && npm run bench:wasm && node test/corpus/perf-dashboard.mjs
//
// Node-only dev/test infra; never imported by src. Requires --expose-gc; this
// file self-re-execs with it if absent, so plain `node wasm-bench.mjs` works.

import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Ensure a controllable GC so a long serial sweep stays bounded (see header).
if (!global.gc) {
  const r = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url)],
    { stdio: 'inherit', env: process.env });
  process.exit(r.status ?? 1);
}

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const ROOT = process.env.CORPUS_ROOT ?? join(homedir(), 'git/graphviz/tests');
const HEAVY_MS = Number(process.env.HEAVY_MS ?? 2000);
const WARMUP = Number(process.env.WARMUP ?? 1);
const TRIALS = Number(process.env.TRIALS ?? 3);
const LARGE_SRC_BYTES = Number(process.env.LARGE_SRC_BYTES ?? 1_000_000);
const OUT = new URL('./wasm-perf.json', import.meta.url);

const { renderSvg } = await import(join(REPO, 'dist/index.js'));
const { Graphviz } = await import('@hpcc-js/wasm-graphviz');
const graphviz = await Graphviz.load();

const manifest = JSON.parse(readFileSync(new URL('./corpus-manifest.json', import.meta.url), 'utf8'));
const native = (() => {
  try { return JSON.parse(readFileSync(new URL('./native-timings.json', import.meta.url), 'utf8')).timings ?? {}; }
  catch { return {}; }
})();

const bestOf = (fn) => {
  for (let i = 0; i < WARMUP; i++) fn();
  let best = Infinity;
  for (let i = 0; i < TRIALS; i++) { const t = performance.now(); fn(); best = Math.min(best, performance.now() - t); }
  return best;
};

const applicable = manifest.filter((e) => e.status === 'applicable');
const excludedHeavy = [], excludedLarge = [], deErr = [], waErr = [], missing = [], rows = [];

let done = 0;
for (const e of applicable) {
  if ((native[e.id] ?? 0) > HEAVY_MS) { excludedHeavy.push({ id: e.id, nativeMs: native[e.id] }); continue; }
  const file = join(ROOT, e.path);
  if (!existsSync(file)) { missing.push(e.id); continue; }
  const srcBytes = statSync(file).size;
  if (srcBytes > LARGE_SRC_BYTES) { excludedLarge.push({ id: e.id, srcBytes }); continue; }
  const src = readFileSync(file, 'utf8');
  const engine = e.engine ?? 'dot';

  let de = NaN, wa = NaN;
  try { de = bestOf(() => renderSvg(src, engine)); } catch (err) { deErr.push({ id: e.id, msg: String(err.message).slice(0, 160) }); }
  try { wa = bestOf(() => graphviz.layout(src, 'svg', engine)); } catch (err) { waErr.push({ id: e.id, msg: String(err.message).slice(0, 160) }); }

  if (isFinite(de) && isFinite(wa)) rows.push({ id: e.id, de: +de.toFixed(3), wa: +wa.toFixed(3), ratio: +(de / wa).toFixed(3) });
  if (++done % 50 === 0) { global.gc(); process.stderr.write(`wasm-bench: ${done}/${applicable.length} timed, heap=${(process.memoryUsage().heapUsed / 1048576) | 0}MB\n`); }
}

rows.sort((a, b) => a.ratio - b.ratio);
const ratios = rows.map((r) => r.ratio);
const pct = (p) => (ratios.length ? ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))] : null);
const BANDS = [
  ['dot-engine faster (<1×)', (x) => x < 1],
  ['1–2×', (x) => x >= 1 && x < 2],
  ['2–4×', (x) => x >= 2 && x < 4],
  ['4–6×', (x) => x >= 4 && x < 6],
  ['6–10×', (x) => x >= 6 && x < 10],
  ['>10×', (x) => x >= 10],
];
const bands = Object.fromEntries(BANDS.map(([label, f]) => [label, ratios.filter(f).length]));
const mean = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

const result = {
  generated: 'test/corpus/wasm-bench.mjs — do not edit by hand',
  wasmPackage: '@hpcc-js/wasm-graphviz@1.28.0',
  method: { warmup: WARMUP, trials: TRIALS, heavyExcludedAboveNativeMs: HEAVY_MS, largeSrcBytes: LARGE_SRC_BYTES, node: process.version },
  counts: {
    applicable: applicable.length, compared: rows.length,
    excludedHeavy: excludedHeavy.length, excludedLarge: excludedLarge.length,
    dotEngineErrored: deErr.length, wasmErrored: waErr.length, missingFiles: missing.length,
  },
  ratio: { p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: ratios.at(-1) ?? null, mean },
  bands,
  worst20: rows.slice(-20).reverse(),
  excludedHeavy, excludedLarge, dotEngineErrors: deErr, wasmErrors: waErr, missingFiles: missing,
  rows,
};
writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');

process.stderr.write('\n=== dot-engine vs WASM (@hpcc-js/wasm-graphviz), warm, in-process ===\n');
process.stderr.write(`compared ${rows.length} (excluded ${excludedHeavy.length} heavy, ${excludedLarge.length} large-src, ${deErr.length} de-err, ${waErr.length} wa-err, ${missing.length} missing)\n`);
process.stderr.write(`ratio de/wa  p50 ${result.ratio.p50}×  p90 ${result.ratio.p90}×  max ${result.ratio.max}×  mean ${mean?.toFixed(2)}×\n`);
process.stderr.write(`bands ${JSON.stringify(bands)}\n`);
process.stderr.write(`wrote ${fileURLToPath(OUT)}\n`);
