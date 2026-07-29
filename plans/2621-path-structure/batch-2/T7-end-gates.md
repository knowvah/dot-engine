<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — End gates + closeout (commit 3)

## Task

1. `npx tsc --noEmit` clean; `npm test` green.
2. Fresh 939-sweep (background, `GVBINDIR=/tmp/ghl ORACLE_TIMEOUT_MS=900000
   npx tsx test/corpus/survey.ts`); per-id verdict diff vs HEAD: exactly the
   intended 2621 change (diverged→conformant for T6a; unchanged raw verdict
   with the acceptance joining at report time for T6b), 0 regressions. The
   known 1652 conformant↔timeout flake is acceptable IF an idle re-render
   byte-matches (document it).
3. Regenerate dashboards: `npx tsx test/corpus/dashboard.ts` + `npx tsx
   test/corpus/parity-report.ts`.
4. Native tree check: `git -C ~/git/graphviz status` — revert any T2/T4
   temporary patches; only pre-existing GVTS_POS_DUMP instrumentation may
   remain. Orphan check: `ps -eo pid,%cpu,command | awk '$2>10 && /node/'`.
5. Journal: final summary row (mechanism one-liner, budget spent: N/3
   renders, gate results). Update `.agent-notes/2621-path-structure.md`
   status line. Write/update project memory for any generalizable lesson.
6. Mission summary at the bottom of README.md (tasks done, decisions count,
   gate results, follow-ups). Mark all checkboxes.
7. Commit 3: `test(corpus): re-sweep after 2621 <fix|acceptance>`.

## Write-set

`test/corpus/parity.json`, `test/corpus/PARITY*.md`, plan files,
`.agent-notes/2621-path-structure.md`, memory dir.

## Acceptance criteria

- Given the sweep diff, when reviewed, then only the intended flip (plus a
  documented 1652 flake at most) appears.
- Given the native tree, when statused, then no mission patches remain.

## Observability: N/A. ## Rollback: Reversible.
