# T0: baselines at `main` (no commit)

**Context:** every `src/` task proves byte-identity against the previous head and compares
its new stderr with native's per id. T11/T12 need speed numbers from before any change.

**Task:** on branch `chore/post-16-1-followups-2` at `main` (`4d173ec3`):
1. **Bundle:** esbuild `src/index.ts` → `$BASE/base.mjs` (ESM, platform neutral). The
   byte-identity harness imports two bundles, renders each applicable id
   (`test/corpus/corpus-manifest.json`) with `renderSvg(src, engine)`, captures
   `console.{log,warn,error,info}`, and compares SVG sha1 + the console lines. Cap 240 s per
   render; record timeouts. For ids over the cap, use a sentinel bundle (a counter on the
   changed line) instead: fired = 0 means identical by construction.
2. **Native stderr:** `~/git/graphviz/build/cmd/dot/dot -K<engine> -Tsvg -o /dev/null`,
   60 s cap, engines dot, osage, neato, fdp, sfdp; `GVBINDIR=/tmp/ghl` for dot, the full
   plugin dir for the rest. Save `$BASE/native/<engine>/<id>.stderr`. Skip ids whose
   canonical native time exceeds 60 s (`test/corpus/native-timings.json`); list them in
   `$BASE/skipped.txt`.
3. **Speed** (only if `uptime` load < 8): save `perf.json`, run `test/corpus/bench.mjs`
   with `BENCH_IDS` for a dot subset and a neato subset (ids with many splines: choose 20
   each from `perf.json`, list them in the journal), best of 3, warm; save
   `$BASE/timings-before.json`; restore `perf.json`.

`$BASE` = `<scratchpad>/followups2-baseline`. Scripts stay in the scratchpad.

**Write-set:** the scratchpad only. **Read-set:** `test/corpus/bench.mjs:150-210`,
`test/corpus/corpus-manifest.json`, `.agent-notes/perf-2371-pointset.md`.

**Interface output:** `$BASE/base.mjs`, `$BASE/native/<engine>/<id>.stderr`,
`$BASE/skipped.txt`, `$BASE/timings-before.json` (`{id: ms}`), the harness scripts.

**Acceptance criteria:**
- *Given* `main`, *when* T0 finishes, *then* `dot -V` reports 16.1.0, the bundle exists,
  and each engine's native capture has a stderr file or skip entry for every applicable id.
- *Given* load < 8, *then* `timings-before.json` holds both subsets; otherwise the journal
  says the measurement moved to T14.

**Observability:** N/A — no new observable operations. **Rollback:** reversible (scratch only).
