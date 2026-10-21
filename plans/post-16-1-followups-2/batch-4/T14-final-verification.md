# T14: `chore(T14)`: close out the mission, then stop for the re-sign

**Task:**
1. **Fresh survey** on the final head (in a worktree; delete the probe JSON first):
   `GATE PASS`, 0 regressions, `counts.oracle-error` == 14.
2. **Engine walks** for every engine whose SVG changed in any task (at least neato for
   T4/T5, sfdp for T13, and all eight for T11/T12 if they changed output), compared by id
   with the committed `parity-<engine>.jsonl`: no pass→worse. Commit walk JSONLs only when
   their moves are port-side and toward native; explain every moved row in the journal.
3. **Format walks** (json / plain / map) for engines whose output changed.
4. **Speed:** any measurement deferred from T11/T12 (load < 8). Restore `perf.json`.
5. **Stderr parity table:** per item (15–23), the port vs native message counts across
   T0's native capture.
6. **Docs:** regenerate the parity docs the walks stamp (locales included);
   `npx vitest run test/corpus test/docs` green.
7. **Records:**
   - `plans/post-16.1-followups/README.md`: items 15–23 marked **Done** (with branch and
     task) or **Parked** (with the journal pointer); any new follow-ups appended.
   - This brief's README: batches `[x]`, a session summary (outcomes, gates, decisions
     flagged for review, incidents).
   - `plans/decision-journal.md`: one mission-summary row.
8. **Planned stop (12):** print the re-sign command for the user to run in their terminal
   (PIN + touch), e.g.
   `! git rebase --exec 'git commit --amend --no-edit -S' main` on
   `chore/post-16-1-followups-2`, then push and open the PR (merge commit, AD-2).

**Write-set:** `plans/post-16.1-followups/README.md`, `plans/decision-journal.md`,
`plans/post-16-1-followups-2/{README,decision-journal}.md`, `test/corpus/*` walk/survey
outputs that changed port-side, regenerated docs.

**Acceptance criteria:**
- *Given* the final head, *then* every quality gate in the README passes, with the numbers
  in the journal.
- *Given* items 15–23, *then* each is Done or Parked with its diagnosis artifact.
- *Given* the stop, *then* nothing is pushed and the user has the exact re-sign command.

**Observability:** N/A. **Rollback:** reversible.
