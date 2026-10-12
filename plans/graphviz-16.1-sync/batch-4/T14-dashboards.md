# T14 — Regenerate all 35 PARITY dashboards

**Agent:** orchestrator. **Depends on:** T13 (ratchet empty). **Rollback:** Reversible.
**Observability:** the dashboards are the observability surface. This task refreshes all of them.

## Context

AD-8. `test/corpus/PARITY*.md` (35 files) all name the old oracle. Each dashboard
states its own `Regenerate:` command near the top. dot uses `survey.ts` then
`dashboard.ts` / `parity-report.ts`. The engines and formats use
`engine-walk.ts`, `dot-walk.ts`, `json-walk.ts`, `map-walk.ts`, `plain-walk.ts`,
`xdot-walk.ts` (usage lines in each file header). The walks take hours, so run them
in the background, one engine at a time, and never edit `src/` while any walk runs.

## Task

1. For each dashboard, read its `Regenerate:` line and run it fresh (delete any
   resume JSONL first, CLAUDE.md sweep discipline).
2. Check each regenerated dashboard: oracle version 16.1.0, no retired
   accepted rows (A3/A8, `linux.i386-b29`), totals consistent with the T2 walk
   counts plus Batch 2–3 improvements. A walk count below T2's is a regression;
   stop and diagnose (STOP 3 rules).
3. `npx vitest run test/corpus` green (`parity-report.test.ts`, links tests).

## Acceptance

- Given all 35 dashboards, then each was regenerated in this task (git diff
  shows each changed) and names graphviz 16.1.0.
- Given each engine/format, then its conformant count ≥ the T2 starting count.

## Write-set

`test/corpus/PARITY*.md` and the committed walk outputs they read (per each
generator's documented output path).

## Commit

`docs(parity): regenerate dashboards against graphviz 16.1.0`
