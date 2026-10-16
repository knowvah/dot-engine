# T14: `chore(T14)`: final verification and handoff

**Task:**
1. Fresh full survey (README gate) plus engine walks for dot, osage, neato, fdp, sfdp and
   circo, into scratch paths, compared by id with the committed outputs. All must show 0
   regressions.
2. Regenerate dashboards only for tracks whose numbers moved (`parity-report.ts`,
   `dashboard.ts`). Run any deferred speed measurement from T11 if `uptime` load is
   below 8.
3. Mark each item in `plans/post-16.1-followups/README.md` done (with its task ID) or
   parked (with the reason).
4. Write the session summary into this mission's README, and add one row to
   `plans/decision-journal.md`.
5. Commit, then **STOP** and give the user:
   `git -C <repo> rebase --exec 'git commit --amend --no-edit -S' main`
   (one YubiKey touch per commit).
6. After the user confirms, have them run `~/.claude/hooks/autonomous-toggle.sh off .`
   first. The autonomous settings deny `git push`, so the push happens in an
   interactive session. Then:
   - `git log --show-signature main..` must show a good signature on every commit.
   - Append the task-ID → signed-SHA map to the journal. This is the only edit after the
     re-sign: commit it signed by the user, or carry it in the PR body.
   - Push `chore/post-16-1-followups` and open the PR. The body has no attribution and
     lists every new warning message, every accepted or parked item, and the item-11
     speed numbers.

**Write-set:** moved `test/corpus/PARITY*.md` and `parity-*.json(l)`;
`plans/post-16.1-followups/README.md`; this mission's README and journal;
`plans/decision-journal.md`.

**Acceptance criteria:**
- *Given* the final survey and walks, *then* `GATE PASS` with 0 regressions on every
  track.
- *Given* the re-signed branch, *then* every commit in `main..` has a good signature
  before the push.
- *Given* the PR, *then* it is opened only after the signatures are verified, and it is
  not merged by the executor.

**Observability:** N/A. **Rollback:** reversible (revert the PR).
