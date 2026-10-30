# T6: final verification and close-out

**Task:**
1. In a worktree of the branch head: fresh survey (README command, probe file deleted
   first): `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 (stops 5/6).
2. Bytediff `$BASE/T0.mjs` vs the head bundle over the corpus ids for every engine and
   format. Walk only the engines/formats with an output change (AD-7); 0 pass→worse;
   commit refreshed `test/corpus/parity-<engine>.jsonl` rows for walked engines and
   regenerate parity docs with `npx tsx test/corpus/parity-report.ts`. Journal the
   bytediff verdict for the engines not walked.
3. Rows that flipped fail→pass: retire matching acceptances
   (`test/corpus/accepted-divergences-*.json`, `docs/known-divergences.md` + 23 locales,
   `sourceHash`). Rows that flipped pass→fail: stop 5.
4. Close-out: mark 90–94 DONE or PARKED (with task ID) in
   `plans/post-16.1-followups/README.md`; new follow-ups numbered from 95;
   mission-summary row in `plans/decision-journal.md`; set this brief's checkboxes;
   `.agent-notes/post-16-1-followups-6.md` for anything novel.
5. Gates (all four plus i18n), commit `chore(T6): close out post-16.1 follow-ups part 6`.
6. **Planned stop (12):** tell the user to run, in their terminal with the YubiKey,
   `git rebase -f main` on the branch (repo-local `commit.gpgsign=true` re-signs each
   commit; if a pick's signing fails: `git reset --hard HEAD && git rebase --continue`),
   then push and open the PR (merge commit, AD-2). Release note: missing-image warnings
   print once per layout (json no longer doubles them); node `image=` is drawn in svg and
   xdot/json, honouring `imagescale`/`imagepos`, and HTML `<IMG>` placement matches native;
   empty colour names in node/cluster fills warn and fill black as native; image docs
   state the sizer's pixel unit; the ipsep right-multiply verdict from T3.

**Write-set:** `test/corpus/parity-*.json(l)`, `test/corpus/attribution-*.json(l)`,
`test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and any walks finish, *then* `GATE PASS`,
  0 regressions, oracle-error 14, no pass→worse.
- *Given* the follow-ups README, *then* every item 90–94 is DONE or PARKED with a journal
  reference.

**Observability:** N/A. **Rollback:** reversible.
