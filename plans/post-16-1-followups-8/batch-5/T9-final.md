# T9: final verification and close-out

**Task:**
1. **Survey:** in a worktree of the branch head, run a fresh survey with the README
   command, alone on the machine. Pass is `GATE PASS`, 0 regressions and
   `counts.oracle-error` == 14 (stops 5 and 6).
2. **Bytediff and walks:** bytediff `$BASE/T0.mjs` against the head bundle over all corpus
   ids, every engine and format. Every stderr change must match a fresh native run (part 7
   caught a regression this way). Walk only engines/formats whose output changed (none is
   expected: no corpus id reaches 103, 105, 107 or 108); journal the verdict per engine.
3. **Timing row:** port vs native wall time on T0's largest `model=circuit` probe (3 runs,
   median, load noted).
4. **Close-out:**
   - `plans/post-16.1-followups/README.md`: mark 103–108 DONE or PARKED with task IDs;
     number new follow-ups from 109; update the header line.
   - Mission-summary row in `plans/decision-journal.md`; this brief's checkboxes and a
     "Mission summary" section at the bottom of the README.
   - `.agent-notes/post-16-1-followups-8.md` for anything novel.
5. **Commit:** run the gates (all four, ipsep and model probes, i18n), then commit
   `chore(T9): close out post-16.1 follow-ups part 8`, with a one-line stop summary in the
   body.
6. **Planned stop (14):** tell the user to run `git rebase -f main` with the YubiKey (a failed
   pick: `git reset --hard HEAD && git rebase --continue`), push, and open the PR as a merge
   commit titled `chore: post-16.1 follow-ups part 8 (items 103–108)`; the `feat` commits cut
   a minor release. Give the release note (models on major/KK/hier, major-path mds, model
   warnings, FT_NULL at layout, vpsc tie order, per-context `safefile`, parked items).

**Write-set:** `test/corpus/parity-*.json(l)`, `test/corpus/PARITY-*.md`,
`test/corpus/accepted-divergences-*.json`, `docs/known-divergences.md`,
`docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and the bytediff finish, *then* `GATE PASS`,
  0 regressions, oracle-error 14, output identical or native-verified.
- *Given* the follow-ups README, *then* every item 103–108 is DONE or PARKED with a journal
  reference.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
