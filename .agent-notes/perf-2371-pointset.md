# perf-2371-pointset — observations (2026-10-15)

## Observation: /tmp/ghl has no neato_layout plugin
- **Context**: timing native twopi on 2371 slices.
- **Finding**: `GVBINDIR=/tmp/ghl` holds only core + dot_layout, so
  `-Ktwopi` fails ("no layout engine support"). The engine walks' oracle
  cache `af7c069742bf` was made with the full plugin dir
  `.../dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`
  (sha1 of `dot\0GVBINDIR\0mtimeMs`, first 12 hex).
- **Impact**: pass that GVBINDIR to engine-walk/attribution or every
  non-dot oracle errors and the cache misses.
- **Confidence**: High

## Observation: bench.mjs BENCH_IDS overwrites perf.json
- **Context**: planning a perf re-publish.
- **Finding**: `BENCH_IDS` filters entries and `writeFileSync(PERF, ...)` writes
  only those rows; there is no merge.
- **Impact**: a published perf.json needs a full bench run.
- **Confidence**: High

## Observation: single-id walk via a trimmed jsonl copy
- **Context**: re-timing twopi 2371 alone.
- **Finding**: `engine-walk.ts <engine> <out.jsonl>` resumes past ids already in
  `out.jsonl`; copy the committed jsonl minus one id to run just that id. It
  still rewrites `test/corpus/parity-<engine>.json` (fixed path), so restore it
  with `git checkout` afterward.
- **Confidence**: High

## Observation: wasm-bench hangs on inputs with no native timing
- **Context**: Re-running `npm run bench:wasm` on @hpcc-js/wasm-graphviz 1.29.2 (graphviz 16.1.0), 2026-10-16.
- **Finding**: The heavy screen was `(native[id] ?? 0) > HEAVY_MS`, so an id absent from native-timings.json counted as light and ran uncapped. The 16.1 roster's upstream crash/hang repros (2778 SIGBUS; 2834, 2854_1, 2855 >60 s native, killed by the 1 h capture cap) stalled the WASM build for 8 h at 250/950. Fixed by excluding and listing ids with no native timing (`excludedNoNative`).
- **Impact**: Any new oracle-error id would otherwise stall the WASM bench indefinitely.
- **Confidence**: High

## Observation: bench numbers are only valid on a quiet machine
- **Context**: Pass-2 port-vs-native bench (light phase ran ~2026-10-15 15:30 CDT).
- **Finding**: Light-graph port times came out 4-10x slower than pass 1 with no src change (e.g. java-dot-uml 9->149 ms). Other sessions (elk-oracle/elk-ts java, plantuml-ts vitest) were running; load average reached 130. Heavy rows, timed serially overnight, were unaffected. Check `uptime` before and during any bench.
- **Impact**: perf.json light rows from that pass are not publishable; re-bench when the machine is idle.
- **Confidence**: High

## Observation: August native baseline carried ~55 ms of per-process overhead
- **Context**: Re-benching PERF.md against the 16.1 native capture (2026-10-16).
- **Finding**: Median canonical native time fell 60 ms -> 5 ms across 930 shared
  ids, while port times were unchanged (new/old p50 1.00). The 15.x build with
  a minimal plugin dir (`/tmp/ghl15`) renders 1221/1314/1444 in ~4.7 ms, same as
  16.1 with `/tmp/ghl` (~4.8 ms), so the drop is not the graphviz version. The
  August capture (2026-08-01) ran with `GVBINDIR=/tmp/gvplugins`, now deleted,
  so its contents can't be re-timed; the ~55 ms floor was in that environment.
  Effect: the old PERF.md's p50 0.02x and 851-in-<=1x band were flattered by an
  inflated native denominator; new p50 is 0.15x, 777 in <=1x.
- **Impact**: Compare ratios only across captures from the same plugin dir.
  `bench.mjs:40`, `capture-native.mjs:24` and `survey.ts:41` still default
  `GVBINDIR` to `/tmp/gvplugins`; always pass `GVBINDIR=/tmp/ghl` (the oracle per
  CLAUDE.md) until those defaults are fixed in a dedicated change.
- **Confidence**: High for the version being ruled out; Medium on what
  `/tmp/gvplugins` held (directory gone).

## Observation: a light-only bench + merge is valid when heavy rows are clean
- **Context**: Pass-2 light rows were contaminated by other sessions' load.
- **Finding**: `BENCH_IDS=<922 light ids>` re-ran in ~2 min at load ~5; vs the
  clean pass 1, port p50 ratio 1.00 and 0 ok->slow flips. Merging by id into the
  pass-2 file (heavy rows kept) and re-tallying `verdict` gives a consistent
  perf.json. `BENCH_IDS` overwrites perf.json, so save the full file first.
- **Impact**: Avoids re-running the 5+ h heavy phase after a contaminated light
  phase.
- **Confidence**: High.
