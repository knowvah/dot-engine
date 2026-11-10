# T12: final verification and close-out

**Task:**
1. **Quick gates at head:** all README gates, plus `npm run coverage` (what CI runs) and the libm gate over every part-11
   layout fixture test.
2. **Survey:** in a worktree of the head, a fresh survey with the README command (about 3 h; `world.gv` alone about 2.5 h).
   Record the load. Pass is `GATE PASS`, 0 regressions and `counts.oracle-error` == 14 (stops 5, 6).
3. **Bytediff:** `$BASE/T0.mjs` against the head bundle, `--all`, 8 engines × 5 formats, then the 21 quarantined ids
   separately. Rerun one-sided caps at a 10-minute limit. Every change, stderr included, is stop 8 unless it falls under one
   of stop 8's exceptions; list each excepted change by task and confirm it equals native. Report capped jobs as unproven.
4. **Close-out:**
   - `plans/post-16.1-followups/README.md`: mark 126–138 DONE or PARKED with task IDs; open new follow-ups from 139;
     update the header line.
   - Mission-summary row in `plans/decision-journal.md`; this brief's checkboxes and a "Mission summary" section in the README.
   - `.agent-notes/post-16-1-followups-11.md` for anything novel.
5. **Commit:** run the gates, then commit `chore(T12): close out post-16.1 follow-ups part 11`, with a one-line stop summary
   in the body.
6. **Planned stop (13):** tell the user to run `git rebase -f main` with the YubiKey (a failed pick:
   `git reset --hard HEAD && git rebase --continue`), push, and open the PR as a merge commit titled
   `chore: post-16.1 follow-ups part 11 (items 126–138)`. No `feat`, so a patch release. Give the release note:
   - `w4`/`w5`-shaped graphs render instead of throwing;
   - `xdot` and `dot` wrap long strings at 128 columns, honouring `linelength`;
   - fdp `json` no longer shows cluster-edge proxies;
   - T6, T7, T8 and T9's outcomes, and any parked items.

**Write-set:** open: `test/corpus/parity-*.json(l)`, `test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and bytediff finish, *then* `GATE PASS`, 0 regressions, oracle-error 14, and output is
  identical or within stop 8's exceptions, with capped jobs listed as unproven.
- *Given* the follow-ups README, *then* each of 126–138 is DONE or PARKED with a journal reference.
- *Given* `npm run coverage`, *when* run, *then* thresholds are met.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
