# T29: final verification and close-out (items 70, 71)

**Task:**
1. In a worktree of the branch head: fresh survey (README command, JSONL deleted first):
   `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 (stops 5/6).
2. Fresh walk of every engine (neato, fdp, sfdp, twopi, circo, osage, patchwork) with T3's
   nondeterminism handling, plus the format walks (json/plain/xdot/map) for formats a task
   changed. 0 pass→worse. Commit the refreshed `test/corpus/parity-<engine>.jsonl` rows so
   `nDiffs`/`firstDiff` reflect today's head (item 71); regenerate parity docs with
   `parity-report.ts`.
3. `npx tsx test/corpus/attribute-divergence.ts fdp` → refreshed
   `test/corpus/attribution-fdp.json(l)` without the stale 241_0 row (item 70).
4. Rows that flipped fail→pass: retire matching acceptances
   (`test/corpus/accepted-divergences-*.json`, `docs/known-divergences.md` + 23 locales,
   `sourceHash`).
5. Speed (load < 8): branch vs `timings-T0.json`, p50 ≤ 1.05× (stop 7).
6. Close-out: mark each item 43–71 DONE or PARKED (with task ID) in
   `plans/post-16.1-followups/README.md`; mission-summary row in `plans/decision-journal.md`;
   set this brief's checkboxes; `.agent-notes/post-16-1-followups-4.md` for anything novel.
7. Gates (all four), commit `chore(T29): close out post-16.1 follow-ups part 4`.
8. **Planned stop (13):** tell the user to run, in their terminal with the YubiKey,
   `git rebase -f main` on the branch (repo-local `commit.gpgsign=true` re-signs each
   commit), then push and open the PR (merge commit, AD-2). Release note for the PR body:
   `mode=hier` is now laid out (minor release); agerr warnings formerly on
   `console.error` now arrive on `console.warn`; `GvcContext.layout` resets per-render
   state.

**Write-set:** `test/corpus/parity-*.json(l)`, `test/corpus/attribution-fdp.json(l)`,
`test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and walks finish, *then* `GATE PASS`, 0 regressions,
  oracle-error 14, and every nondeterministic id labelled.
- *Given* the follow-ups README, *then* every item 43–71 is DONE or PARKED with a journal
  reference.

**Observability:** N/A. **Rollback:** reversible.
