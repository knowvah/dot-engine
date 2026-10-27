# T17: final verification and close-out

**Task:**
1. In a worktree of the branch head: fresh survey (README command, JSONL deleted first):
   `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 (stops 5/6).
2. Fresh walk of every engine (neato, fdp, sfdp, twopi, circo, osage, patchwork) plus the
   format walks (json/plain/xdot/map) for formats a task changed. 0 pass→worse. Commit the
   refreshed `test/corpus/parity-<engine>.jsonl` rows; regenerate parity docs with
   `npx tsx test/corpus/parity-report.ts`.
3. `attribute-divergence.ts neato|fdp|sfdp` where T10/T15 changed a diverged id's output.
4. Rows that flipped fail→pass: retire matching acceptances
   (`test/corpus/accepted-divergences-*.json`, `docs/known-divergences.md` + 23 locales,
   `sourceHash`). Rows that flipped pass→fail: stop 5.
5. Speed (load < 8): branch vs `timings-T0.json`, p50 ≤ 1.05× (stop 7).
6. Close-out: mark each of 72–87 and 89 DONE or PARKED (with task ID) in
   `plans/post-16.1-followups/README.md`; new follow-ups from the push-forward rule get
   numbers from 90; mission-summary row in `plans/decision-journal.md`; set this brief's
   checkboxes; `.agent-notes/post-16-1-followups-5.md` for anything novel.
7. Gates (all four), commit `chore(T17): close out post-16.1 follow-ups part 5`.
8. **Planned stop (13):** tell the user to run, in their terminal with the YubiKey,
   `git rebase -f main` on the branch (repo-local `commit.gpgsign=true` re-signs each
   commit; if a pick's signing fails: `git reset --hard HEAD && git rebase --continue`),
   then push and open the PR (merge commit, AD-2). Release note for the PR body:
   `layerselect`/`layerlist` honoured (minor release); bad `len` values now fall back to
   1.0 with native's warning on every neato mode; style tokens keep inner whitespace;
   cluster attributes no longer inherit root attributes declared after the cluster opens;
   re-laying out a graph after `freeLayout` re-sizes labels; `image=` nodes size through
   the installed sizer; `fillcolor`/`bgcolor` colour-list diagnostics match native.

**Write-set:** `test/corpus/parity-*.json(l)`, `test/corpus/attribution-*.json(l)`,
`test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and walks finish, *then* `GATE PASS`, 0 regressions,
  oracle-error 14, no pass→worse.
- *Given* the follow-ups README, *then* every item 72–87 and 89 is DONE or PARKED with a
  journal reference.

**Observability:** N/A. **Rollback:** reversible.
