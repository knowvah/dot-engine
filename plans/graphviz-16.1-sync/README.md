# Mission: graphviz 16.1.0 sync

## Objective

Re-pin the oracle from graphviz 15.0.0-82 (`dot -V` 15.1.0~dev) to **16.1.0** and
port every behaviour change in the 519 upstream commits between them, so the port
matches the graphviz that plantuml-ts measures against (homebrew 16.1.0). Turn the
16.1-era repros in plantuml-ts `docs/graphviz-issues/` (TRACKER.md + issue files +
cached `svek-1.dot` fixtures) into tests. Then the final bits: regenerate all 35
`PARITY-*.md` dashboards and re-translate `divergences.md` into the 23 locales.

Known 16.1 behaviour changes (full list is T3's output): HTML-table emission order
(`f0d07786b`, plantuml-ts 34), `htmllex.c` rewrite, ortho failure → `dot_splines_`
return code → layout failure, svg `svgid`, dotgen crash/leak fixes, sfdp/sparse/neato
numeric edits, xlabels refactor; +11 corpus graphs.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, `decisions.md`, `decision-journal.md`, then the current
   batch's `overview.md`. Verify task commits with `git log --oneline`.
3. Read the `.agent-notes/` entries named in the task spec
   (`pt-tracker-2-observations.md` always: harness quirks, bench overwrites
   `perf.json`, `otool` hangs, survey ~3h).

## Branch

`feature/graphviz-16.1-sync` off `main` once PR #85 is merged; if it is still open
at T0, branch off `fix/plantuml-tracker-issues-2` and say so in the journal (AD-9).
One commit per task (Conventional Commits, ≤72-char subject, lines ≤80, no
attribution). Merge-commit PR at the end.

## Quality gates (every task, before commit)

- `npm run typecheck` — exit 0 — fix_and_rerun
- `npx vitest run` — exit 0 (ratchet-listed failures are expected, AD-4) — fix_and_rerun
- `bash test/golden/gates.sh` — 5/5 PASS — fix_and_rerun
- Survey (any task touching `src/`; **fresh** — delete `test/corpus/parity-probe.json`
  first; never edit `src/` while it runs; ~3h):
  `rm -f test/corpus/parity-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-probe.json test/corpus/parity-baseline.json`
  — pass: `GATE PASS`, regressions=0 vs the 16.1 baseline — on_fail: revert, STOP
- Perf (T8, T10, T12, T16): `npm run build:js && BENCH_POOL=1 BENCH_IDS=2646,graphs-b100 node test/corpus/bench.mjs`
  ≤ 1.10× the T2 baseline; then `git checkout test/corpus/perf.json`.
- Oracle after T0: `~/git/graphviz/build/cmd/dot/dot` (16.1.0) with `GVBINDIR=/tmp/ghl`.
  15.x reference build: `~/git/graphviz-15/build/cmd/dot/dot`. Homebrew `dot`
  (16.1.0) only for the T0/T4 equivalence cross-check, never as the oracle.

## Stop conditions

1. A task must write outside its write-set.
2. The same gate check fails twice in a row.
3. A conformant→worse regression that reverting the task's change does not clear.
4. The 16.1.0 build fails, `dot -V` ≠ 16.1.0, or a repro differs between our build
   and homebrew 16.1.0.
5. T3 leaves a moved native output unexplained by a "port" row.
6. A port needs code outside its area task's write-set, or behaviour no T3 row covers.
7. Perf > 1.10× after one optimization attempt.
8. Evidence contradicts an AD (e.g. C ortho failure does not behave as AD-6 says).
9. 3 consecutive edits to one code site without resolving its check.
10. The ratchet list grows, or T12 finds > 10 entries needing new diagnosis.
11. Any plantuml-ts write other than `docs/graphviz-issues/TRACKER.md` (copying
    repros out of plantuml-ts is a read).
12. Any write to `~/git/graphviz` or `~/git/graphviz-15` outside T0.
13. Push to `main`, version bump, tag, publish, or release.
14. T14/T15 start while the ratchet list is non-empty.

## Push forward (decide alone)

- Push the gate baseline forward after an improvement-only fresh survey.
- Assign a T3 row to an area task when two would fit (write-sets must not overlap).
- Close an area task with no rows as a journal-only no-op.
- Re-pin a test from 15.x behaviour to native 16.1.0 output, citing the commit.
- 1–3-line pre-existing fixes in files being edited; log others to `.agent-notes/`.
- Restore `test/corpus/perf.json` after every bench.
- Retire an accepted-divergence entry the fresh survey proves conformant.
- Translation wording within `plans/docs-site-localization/translation-spec.md`.
- Reuse a fresh survey as the final one when `src/` is unchanged since.
- Env-gated temporary instrumentation in the port or in a scratchpad copy of
  graphviz; revert port traces before commit.
- END: push the branch and open the PR (pre-authorized; merge-commit; no attribution).

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [0](batch-0/overview.md) | T0 oracle re-pin · T1 ratchet harness · T2 re-baseline | sequential | [x] |
| [1](batch-1/overview.md) | T3 triage · T4 tracker suite · T5 optmacroname · T6 dead flat router | parallel | [x] |
| [2](batch-2/overview.md) | T7 HTML · T8 dotgen+ortho · T9 renderers · T10 force engines · T11 shared | parallel dev, serial land | [x] |
| [3](batch-3/overview.md) | T12 residual ratchet → T13 registries + docs | sequential | [x] |
| [4](batch-4/overview.md) | T14 dashboards · T15 translations → T16 tracker + PR | T14‖T15, then T16 | [x] |

## Documents

- [decisions.md](decisions.md) — AD-1 … AD-10 (locked)
- [decision-journal.md](decision-journal.md) — append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: append a mission-summary row to `plans/decision-journal.md` (T16).

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every fix and every
  ratchet entry: mechanism / origin / causal chain / ruled out in the journal row.
- Every ported symbol keeps `/** @see lib/...:fn */`; stale line numbers are not
  chased (AD-3).
- Per-issue goldens: `test/golden/pt-issue-NN.test.ts` reading
  `test/golden/{inputs,refs}/pt-issue-*`; never edit `test/golden/manifest.json`
  except T2's corpus/golden re-baseline needs (journal any edit).
- Only the orchestrator writes `decision-journal.md`; subagents report
  observations in their hand-back.
- Area tasks develop in worktrees; the orchestrator lands them one at a time
  (cherry-pick, gates, fresh survey, journal, commit).

## Follow-on (not this mission)

Publish/version bump of `@knowvah/dot-engine` with the 16.1 behaviour changes;
plantuml-ts `.tgz` bump and re-measure of the fixtures named in TRACKER.md.

## Session-end summary (2026-10-14)

**Tasks:** 17 of 17 planned (T0–T16) completed; one extra unit of work
(roster-addition fixes `560668e4`/`47da7dfd`/`910be2a2`, landed under T14
with its own survey and perf A/B).

**Outcome:** oracle re-pinned to graphviz 16.1.0 (native build ≡ headless
homebrew 16.1.0 on the tracker repros; 15.x build kept at `~/git/graphviz-15`).
519 upstream commits triaged (17 port / 279 refactor / 223 outside); every
port row ported or confirmed no-change. Survey conformant 904 → **929/950**
on the 16.1 baseline, 0 regressions; ratchet peaked at 51 and is **empty**;
all 7 engine walks and 26 format walks at or above their 16.1 starting
counts on the same ids (roster 910 → 929); perf 0.86× / 0.75× of baseline.

**Decisions:** ~95 journal rows; flagged for review —
- 2784 on circo/twopi/neato/fdp/sfdp now throws `Map maximum size exceeded`
  (faithful pack int arithmetic needs 2.0e9 cells; V8 Map caps at 2^24) —
  accepted as A10, prose-only because no registry can accept port-errors.
- AD-6 held in its conditional form: native 16.1 ortho failure exits 0 with
  an untranslated, edge-less SVG, and the port mirrors that (no throw).
- Consumer-visible changes: HTML table border/rules now precede cells;
  `svgid`; ortho-failure output; parser accepts `node a = [...]` macro names
  with C's warning; scan.l numbers (`width=1e1` is now a syntax error, as
  natively); default fontname `Times-Roman`; SVG node/edge comments emitted.
- Not landed: circo positioning FMA/association patch (would flip 1855 via
  libm sin/cos amplification) — `followups/circpos-fma-assoc.patch`.

**Follow-ups:** publish/version bump and plantuml-ts `.tgz` bump; registry
schema for port-error/timeout acceptances; staleness tests for the
engine/json/plain/xdot/map registries; regenerate `attribution-*.json` for
16.1; oracle version line in `parity-report.ts` pages; `poly-pack.ts`
second polyomino copy keeps double arithmetic; 2371 twopi/sfdp port ≈ 7×
native (perf); HTML lexer error paths (unknown entity, mismatched tag) and
`table size too small for content` warning are pre-existing gaps.
