# T14: final verification and close-out

**Task:**
1. In a worktree of the branch head: fresh survey (README command, JSONL deleted first) and
   every engine walk (dot, neato, fdp, sfdp, twopi, circo, osage, patchwork) plus the
   format walks for json/plain/xdot/map if any task changed those outputs. 0 regressions,
   `counts.oracle-error` == 14 (stop 5/6).
2. Rows that flipped fail→pass: record them in the committed walk JSONLs and retire the
   matching acceptances (`test/corpus/accepted-divergences-*.json`,
   `docs/known-divergences.md` + 23 locales, `sourceHash`), as item 32 did. Regenerate
   parity docs with `parity-report.ts`.
3. Speed gate (load < 8): branch vs `timings-T0.json`, p50 ≤ 1.05× (stop 7).
4. Close-out: mark each item DONE or PARKED in `plans/post-16.1-followups/README.md` with
   its task ID; add a mission-summary row to `plans/decision-journal.md`; set this brief's
   batch checkboxes; `.agent-notes/` entries for anything novel.
5. Gates (all four), commit `chore(T14): close out post-16.1 follow-ups part 3`.
6. **Planned stop (13):** print the re-sign command for the user:
   `git rebase --exec 'git commit --amend --no-edit -S' main` (run by the user in their
   terminal, with the YubiKey), then push and open the PR (AD-2).

**Write-set:** `test/corpus/accepted-divergences-*.json`, committed walk JSONLs, parity
docs, `docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and walks finish, *then* `GATE PASS`, 0
  regressions, oracle-error 14.
- *Given* the README, *then* every item 25, 29–31, 35–37, 40–42 is DONE or PARKED with a
  journal reference.

**Observability:** N/A. **Rollback:** reversible.
