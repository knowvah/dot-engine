# T0: baselines and shared tooling (no `src/` commit)

**Context:** every `src/` task proves byte-identity against the previous head, compares
stderr with native's, and (T6–T9) needs disassembly evidence. Item 39 showed two traps:
a job that times out on both bundles must never count as identical, and diffs from a
resident worker pool are unconfirmed until re-run in their own process (item 42).

**Task:** `$BASE` = `<scratchpad>/followups3-baseline`. Scripts stay in the scratchpad.
1. **Branch + brief commit** per the README's "First run only".
2. **Oracle preflight:** `dot -V` = 16.1.0; render a trivial graph with `/tmp/ghl` and with
   the full plugin dir; on failure run `GVBINDIR=<dir> dot -c` and journal it.
3. **Gates on `main`:** the four README gates green. Record counts.
4. **T0 bundle:** `npm run build:js`; copy `dist/index.js` to `$BASE/T0.mjs`.
5. **`bytediff`:** `node bytediff.mjs <bundleA> <bundleB> <ids-file|--amp|--all> <out.json>`.
   One child process per job (`renderSvg` for svg, `render(parse(src), fmt, {engine})`
   otherwise), stdout + captured `console.*`, 120 s cap, 1.5 GB heap. Decode inputs UTF-8,
   else latin1. Output: `diffs`, and `capped` (TIMEOUT/OOM per side) listed separately.
   Self-check: T0 vs T0 over the 17 `&` files → 0 diffs.
6. **`probe`:** `node probe.mjs <bundle> <engine> <case...>` renders each DOT case natively
   (stdin, `-Tsvg`, stderr decoded UTF-8) and with the port (console captured); prints
   SAME/DIFF on SVG text spans, node polygon points and stderr lines. Base it on item 39's
   probe (`plans/decision-journal.md` 2026-10-22 rows).
7. **HTML fuzz:** rebuild item 28's attribute fuzz (random TABLE/TD/BR attributes from a
   pool of entity, char-ref, white-space and bad values; 3 seeds × 300 labels) and item
   27's structured label fuzz; record the T0 failure classes per seed.
8. **Disassembly:** `otool -tV` (or `llvm-objdump -d --no-show-raw-insn`) of the 16.1 dylibs
   under `~/git/graphviz/build/lib/` (libgvc, libcommon, libdotgen, libneatogen,
   libpathplan) to `$BASE/disasm/<lib>.txt`. Never rebuild `~/git/graphviz/build` (stop 10).
9. **Speed** (load < 8): save `perf.json`; `test/corpus/bench.mjs` with `BENCH_IDS` for 20
   dot + 20 neato ids (many splines, from `perf.json`; list them in the journal), best of 3
   warm; save `$BASE/timings-T0.json`; restore `perf.json`. Also one T0-vs-T0 pair for noise.

**Write-set:** scratchpad; the brief commit (`plans/post-16-1-followups-3/**`,
`plans/post-16.1-followups/README.md` status line).
**Read-set:** `test/corpus/bench.mjs:150-210`, `test/corpus/corpus-manifest.json`,
`.agent-notes/perf-2371-pointset.md`, `.agent-notes/html-entity-port-2026-10.md`.

**Interface output (all later tasks):** `$BASE/T0.mjs`, `$BASE/bytediff.mjs`,
`$BASE/probe.mjs`, `$BASE/fuzz/`, `$BASE/disasm/*.txt`, `$BASE/timings-T0.json` (`{id: ms}`),
`$BASE/noise.json`.

**Acceptance criteria:**
- *Given* `main`, *when* the gates run, *then* all four are green and the oracle preflight
  passes.
- *Given* `bytediff` T0 vs T0 over the `&` set, *then* 0 diffs, with capped jobs listed.
- *Given* load < 8, *then* `timings-T0.json` and `noise.json` exist; otherwise the journal
  says speed moved to T14.

**Observability:** N/A — no new observable operations. **Rollback:** reversible (scratch only).
