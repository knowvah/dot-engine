// SPDX-License-Identifier: EPL-2.0
//
// Performance dashboard generator. Reads perf.json (test/corpus/bench.mjs) and
// writes PERF.md — a peer to PARITY.md: PARITY tracks correctness, PERF tracks
// SPEED (warm port renderSvg vs native dot, against the <=3x native target).
//
// Regenerate: npm run build:js && node test/corpus/bench.mjs \
//             && npm run bench:wasm && node test/corpus/perf-dashboard.mjs
//
// Reads perf.json (vs native) and, if present, wasm-perf.json (vs the WASM
// build, from test/corpus/wasm-bench.mjs) — the latter drives the optional
// "dot-engine vs WASM" section. Node-only dev/test infra.

import { readFileSync, writeFileSync } from 'node:fs';

const PERF = new URL('./perf.json', import.meta.url);
const WASM = new URL('./wasm-perf.json', import.meta.url);
const OUT = new URL('./PERF.md', import.meta.url);
const SLOW_TABLE_CAP = 60;

const report = JSON.parse(readFileSync(PERF, 'utf8'));

/** Optional WASM head-to-head data (test/corpus/wasm-bench.mjs). Absent → the
 *  dot-engine-vs-WASM section is simply omitted from PERF.md. */
const wasm = (() => {
  try { return JSON.parse(readFileSync(WASM, 'utf8')); } catch { return null; }
})();
const rows = report.results;
const rated = rows.filter((r) => typeof r.ratio === 'number'); // ok + slow

/** Percentile of a sorted-ascending number array (nearest-rank). */
function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

const ratios = rated.map((r) => r.ratio).sort((a, b) => a - b);
const within = rated.filter((r) => r.ratio <= report.budgetMult).length;
const pctWithin = rated.length ? ((100 * within) / rated.length).toFixed(1) : '0.0';

/** Distribution buckets over ratio (port / native). */
const BANDS = [
  ['≤1× (port ≥ native, warm)', (x) => x <= 1],
  ['1–2×', (x) => x > 1 && x <= 2],
  ['2–3×', (x) => x > 2 && x <= 3],
  ['3–4×', (x) => x > 3 && x <= 4],
  ['4–6×', (x) => x > 4 && x <= 6],
  ['6–10×', (x) => x > 6 && x <= 10],
  ['>10×', (x) => x > 10],
];
function bandRows() {
  let out = '';
  for (const [label, test] of BANDS) {
    out += `| ${label} | ${ratios.filter(test).length} |\n`;
  }
  out += `| over-cap (≥${report.capMs}ms, possible hang) | ${report.counts['over-cap']} |\n`;
  return out;
}

const slow = rated
  .filter((r) => r.ratio > report.budgetMult)
  .sort((a, b) => b.ratio - a.ratio);
const overcap = rows.filter((r) => r.verdict === 'over-cap');
const errored = rows.filter((r) => r.verdict === 'errored');

function slowTable() {
  const head = '| id | native ms | port ms (warm) | ratio |\n|---|---:|---:|---:|\n';
  const body = slow.slice(0, SLOW_TABLE_CAP)
    .map((r) => `| \`${r.id}\` | ${r.nativeMs} | ${r.portMs} | ${r.ratio}× |`)
    .join('\n');
  const more = slow.length > SLOW_TABLE_CAP
    ? `\n\n_… and ${slow.length - SLOW_TABLE_CAP} more over-budget inputs (see perf.json)._`
    : '';
  return slow.length ? head + body + more : '_None — every rated input is within 3× native._';
}

function capTable() {
  if (!overcap.length) return '_None — no input exceeded the per-render cap (no hangs)._';
  const head = '| id | native ms | cap ms | native×budget | status |\n|---|---:|---:|---:|---|\n';
  const body = overcap.map((r) => {
    const nb = typeof r.nativeMs === 'number' ? r.nativeMs * report.budgetMult : undefined;
    // A `note` (set when an input was re-run at a higher cap) overrides the
    // generic inconclusive text. Otherwise: if 3×native already exceeds the
    // cap, the cap — not a hang — is the limiter (huge graph for both engines).
    const status = r.note
      ? r.note
      : nb !== undefined && nb > report.capMs
        ? `inconclusive (3×native=${Math.round(nb)}ms > cap — huge graph, may be within budget)`
        : 'exceeds budget (likely hang/runaway)';
    return `| \`${r.id}\` | ${r.nativeMs ?? '—'} | ${report.capMs} | ${nb !== undefined ? Math.round(nb) : '—'} | ${status} |`;
  }).join('\n');
  return head + body +
    '\n\nRaise `BENCH_CAP_MS` and re-run these ids to resolve an inconclusive status.';
}

/** dot-engine vs WASM (@hpcc-js/wasm-graphviz) section. '' when wasm-perf.json
 *  is absent. A different axis from the vs-native table above — a report, not a
 *  gate; we do not gate on beating compiled C. */
function wasmSection() {
  if (!wasm) return '';
  const r = wasm.ratio, c = wasm.counts;
  const f = (x) => (typeof x === 'number' ? x.toFixed(2) : '—');
  const bandTable = Object.entries(wasm.bands)
    .map(([label, n]) => `| ${label} | ${n} |`).join('\n');
  const worst = (wasm.worst20 ?? []).slice(0, 20)
    .map((w) => `| \`${w.id}\` | ${w.de} | ${w.wa} | ${w.ratio}× |`).join('\n');
  const large = (wasm.excludedLarge ?? [])
    .map((x) => `\`${x.id}\` (${(x.srcBytes / 1048576).toFixed(1)} MB)`).join(', ') || '—';
  return `
## dot-engine vs WASM (@hpcc-js/wasm-graphviz)

A **different axis** from the table above: this compares the pure-TS port against
the WASM build a browser would otherwise ship (${wasm.wasmPackage}) — both warm,
in-process, best-of-${wasm.method.trials} (min). A report, not a gate: WASM is
compiled C, so the port is expected to be a small constant factor slower; the
port's wins are bundle size and no wasm fetch+instantiate, not raw layout compute.
Source: [\`wasm-perf.json\`](./wasm-perf.json). Regenerate: \`npm run bench:wasm\`.

- **Compared:** ${c.compared} inputs · **ratio (dot-engine / wasm):** p50 ${f(r.p50)}× · p90 ${f(r.p90)}× · max ${f(r.max)}× · mean ${f(r.mean)}×
- **Excluded:** ${c.excludedHeavy} heavy (native > ${wasm.method.heavyExcludedAboveNativeMs}ms) · ${c.excludedLarge} large-source (> ${(wasm.method.largeSrcBytes / 1048576).toFixed(0)} MB) · ${c.dotEngineErrored} port-error · ${c.wasmErrored} wasm-error · ${c.missingFiles} missing

### Ratio distribution (dot-engine / wasm)

| band | count |
|---|---:|
${bandTable}

### Slowest for the port vs WASM (worst first)

| id | dot-engine ms | wasm ms | ratio |
|---|---:|---:|---:|
${worst}

### Excluded / not compared

- **Heavy (native > ${wasm.method.heavyExcludedAboveNativeMs}ms):** ${c.excludedHeavy} inputs — warm best-of-N over multi-second layouts is impractical here; their vs-native behavior is in the main table above.
- **Large source (> ${(wasm.method.largeSrcBytes / 1048576).toFixed(0)} MB):** ${large} — multi-MB disassembly/CFG dumps (~10k+ nodes) that are impractical for a warm best-of-N. These are hard for Graphviz **generally**, not port-specific: spot-checked, \`2064\` fails to render in native \`dot\` (>120s), the WASM build (>60s in \`layout()\`), and the port (>30s) alike; \`1864\` OOMs **both** the port (>1 GB) and the WASM build ("out of memory") while native times out. The port does **not** leak (with GC its per-render heap is flat ~17 MB) — this is a scale ceiling shared with upstream, not a defect.
- Per-side error ids are listed in \`wasm-perf.json\`.
`;
}

const md = `<!-- SPDX-License-Identifier: EPL-2.0 -->
<!-- GENERATED by test/corpus/perf-dashboard.mjs from perf.json — do not edit by hand. -->

# Dot performance dashboard

Warm, in-process timing of @knowvah/dot-engine vs the native \`dot\` oracle over the dot
test corpus. **Peer to [PARITY.md](./PARITY.md)** — PARITY tracks *correctness*,
PERF tracks *speed*. A report, not a gate. The fidelity target is **≤${report.budgetMult}× native**.

Regenerate: \`npm run build:js && node test/corpus/bench.mjs && npm run bench:wasm && node test/corpus/perf-dashboard.mjs\` (the \`bench:wasm\` step is optional — it adds the [dot-engine vs WASM](#dot-engine-vs-wasm-hpcc-js-wasm-graphviz) section below).

## Method

- **Port:** the shipped bundle (\`dist/index.js\`) loaded once in a pool of
  resident, JIT-primed worker threads; pure \`renderSvg()\` is timed (best-of-N),
  so the measured region excludes all process/transpile/module-load startup —
  the warm steady state a long-lived consumer sees. Light graphs run at full pool;
  heavy graphs (native > 2s) are timed serially by default — measured cross-talk
  inflates a concurrent big render's single sample materially (≈66% on 2620). Set
  \`BENCH_HEAVY_POOL>1\` for a faster, noisier scan.
- **Native:** \`dot -Tsvg\` best-of-3 (min).
- **Budget:** target ≤${report.budgetMult}× native. Per-render cap **${report.capMs}ms**
  (SIGKILL → \`over-cap\`, i.e. a true synchronous hang).
- **Caveat:** light graphs are timed under up-to-${report.pool}-way load; for a
  precise single number re-run \`BENCH_POOL=1 BENCH_IDS=<id> node test/corpus/bench.mjs\`.

## Summary

- **Rated inputs:** ${rated.length} · **within ≤${report.budgetMult}× native:** ${within} (${pctWithin}%)
- **ok (≤${report.budgetMult}×):** ${report.counts.ok} · **slow (>${report.budgetMult}×):** ${report.counts.slow} · **over-cap (hang):** ${report.counts['over-cap']} · **errored:** ${report.counts.errored} · **oracle-error:** ${report.counts['oracle-error']}
- **ratio (port/native):** p50 ${pct(ratios, 50).toFixed(2)}× · p90 ${pct(ratios, 90).toFixed(2)}× · max ${(ratios[ratios.length - 1] ?? 0).toFixed(2)}×

## Ratio distribution

| band | count |
|---|---:|
${bandRows()}
## Over budget — slower than ${report.budgetMult}× native (worst first)

${slowTable()}

## Over-cap / possible hang

${capTable()}
${wasmSection()}
${errored.length ? `\n## Errored (${errored.length})\n\nPort threw before producing output (often the same parser-gap inputs PARITY.md lists).\n\n| id | message |\n|---|---|\n${errored.map((r) => `| \`${r.id}\` | ${(r.errMsg ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').slice(0, 120)} |`).join('\n')}\n` : ''}`;

writeFileSync(OUT, md);
process.stderr.write(`PERF.md written — ${rated.length} rated, ${within} within ${report.budgetMult}x, ${report.counts.slow} slow, ${report.counts['over-cap']} over-cap\n`);
