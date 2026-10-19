# T0: port and native baselines (no commit)

**Context:**
- Batches 2–3 must prove their SVG output is byte-identical, and that their new warnings
  match native's count per id.
- Batch 3 needs speed numbers from before any change.

**Task:** at `main` (`2983eea8`), build the bundle (`npm run build:js`) and capture:
1. **Port renders:** every applicable manifest id (`test/corpus/corpus-manifest.json`,
   `status: applicable`) on the engines dot, osage, neato, fdp and sfdp. Save each as
   `$BASE/port/<engine>/<id>.svg` and `.stderr`.
   - Use resident workers over `dist/index.js`, like `bench.mjs`.
   - Cap each render at 120 s and record a timeout as `<id>.timeout`.
2. **Native stderr:** `~/git/graphviz/build/cmd/dot/dot -K<engine> -Tsvg`,
   `GVBINDIR=/tmp/ghl`, 60 s cap, same engines. Save `$BASE/native/<engine>/<id>.stderr`.
   Skip ids with canonical native time above 60 s (`test/corpus/native-timings.json`)
   and list them in `$BASE/skipped.txt`.
3. **Speed baseline** (only if `uptime` load is below 8): port times for the item-11
   sites — osage ids, ids with HTML tables, ids with `splines=ortho` plus `concentrate`.
   Save `$BASE/timings-before.json` (`{id: ms}`, best of 3, warm).

`$BASE` = `<scratchpad>/followups-baseline`. Keep the capture script in the scratchpad,
not the repo.

**Write-set:** the scratchpad only. **Read-set:** `test/corpus/bench.mjs:150-210`
(warm worker pattern), `test/corpus/corpus-manifest.json`.

**Interface output:** `$BASE/{port,native}/<engine>/<id>.{svg,stderr}`,
`$BASE/skipped.txt`, `$BASE/timings-before.json`.

**Acceptance criteria:**
- *Given* `main`, *when* T0 finishes, *then* every applicable id × engine has an SVG,
  a recorded error, or a timeout marker, and the per-engine counts are in the journal row.
- *Given* the native capture, *when* it finishes, *then* the skipped ids are listed with
  their native times.

**Observability:** N/A — no new observable operations. **Rollback:** reversible
(scratch data only).
