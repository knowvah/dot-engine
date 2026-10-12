# T2 — Re-baseline at graphviz 16.1.0

**Agent:** orchestrator. **Depends on:** T0, T1. **Rollback:** Reversible.
**Observability:** records the 16.1 starting SLIs: survey counts, ratchet length,
perf, walk counts.

## Context

AD-4. Every reference and baseline now comes from 16.1.0. The port has not
changed, so every new difference is 16.1 behaviour the port lacks. Those are the
work list, not regressions.

## Task

1. Re-capture every `test/golden/refs/*` from the 16.1.0 oracle, using each
   manifest entry's engine and format (`-K<engine>`, the format the ref
   holds), with `GVBINDIR=/tmp/ghl`. For a non-dot engine, use the plugin dir
   the ref was originally captured with (see `.agent-notes/pt-tracker-2-observations.md`:
   `/tmp/ghl` holds only core + dot_layout). Diff old vs new refs and list
   every ref whose bytes changed.
2. Run `npx vitest run test/golden`. Put every failing id into `known-failing.json`
   (`goldens` for manifest ids, `ptIssue` for `pt-issue-*` cases). Re-run until green.
3. `npx tsx test/corpus/enumerate.ts` to add the 11 new 16.1 corpus graphs (2778,
   2784, 2834, 2849, 2851, 2852, 2854_1, 2855, 698066, 700813, 894589) to
   `corpus-manifest.json`. Check that the manifest test count assertions still hold.
4. Fresh survey on the 16.1 oracle (README gate command, but writing to
   `parity-baseline.json` via `PARITY_OUT=parity-baseline.json`). Journal the
   counts and the ids that changed verdict versus the T7 probe of the previous
   mission (`$SP/parity-t7.json` if present, else
   `plans/plantuml-tracker-2/decision-journal.md`).
5. Perf baseline: bench 2646 and graphs-b100 (README command); restore `perf.json`.
6. Starting walks: run each walk the dashboards come from (`dot-walk`,
   `engine-walk`, `json/map/plain/xdot-walk`) once on 16.1. Record counts per
   engine/format in the journal. Do not commit regenerated `PARITY-*.md` (AD-8).

## Acceptance

- Given the re-captured refs, when `bash test/golden/gates.sh` runs, then 5/5 PASS
  with the ratchet populated.
- Given the 11 new graphs, when the survey runs, then each has a verdict.
- Given T2 done, then the journal holds the 16.1 survey counts, ratchet length,
  perf numbers and walk counts. These are the SLIs every later task is gated against.

## Write-set

`test/golden/refs/*`, `test/golden/known-failing.json`,
`test/corpus/corpus-manifest.json`, `test/corpus/parity-baseline.json`
(untracked), journal.

## Commit

`test(golden): re-capture references from graphviz 16.1.0`. The body lists the
changed-ref count, the ratchet length and the survey delta.
