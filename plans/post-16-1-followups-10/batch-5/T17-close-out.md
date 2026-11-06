# T17: final verification and close-out

**Task:**
1. **Quick gates at head:** all README gates, plus `npm run coverage` (what CI runs) and the libm gate over every part-10 layout fixture test. Report which fixtures replay macOS `pow`.
2. **Survey:** in a worktree of the head, a fresh survey with the README command. Record the load before and during. Pass is `GATE PASS`, 0 regressions and `counts.oracle-error` == 14 (stops 5, 6).
3. **Bytediff:** `$BASE/T0.mjs` against the head bundle, `--all`, 8 engines × 5 formats, then the 21 quarantined ids separately, then T4's inputs with `--file`. Rerun one-sided caps at a 10-minute limit. Every change, stderr included, is stop 8, except sfdp under its exception. Report capped jobs as unproven.
   Then rerun T5's matrix on the head bundle and report the table beside part 9's `harness/T11/matrix-T10.json`.
4. **Timing row:** neato and sfdp on 2-D graphs, T0 vs head, on the largest smoke id for each (3 runs, median, load noted). KK's loop bound changed from a constant to a field. Report a slowdown to the user; do not simplify C behaviour to recover it.
5. **Close-out:**
   - `plans/post-16.1-followups/README.md`: mark 114–124 DONE or PARKED with task IDs; open new follow-ups from 125; update the header line.
   - Mission-summary row in `plans/decision-journal.md`; this brief's checkboxes and a "Mission summary" section in the README.
   - `.agent-notes/post-16-1-followups-10.md` for anything novel.
6. **Commit:** run the gates, then commit `chore(T17): close out post-16.1 follow-ups part 10`, with a one-line stop summary in the body.
7. **Planned stop (12):** tell the user to run `git rebase -f main` with the YubiKey (a failed pick: `git reset --hard HEAD && git rebase --continue`), push, and open the PR as a merge commit titled `chore: post-16.1 follow-ups part 10 (items 114–124)`. The `feat` commits cut a minor release. Give the release note:
   - neato and sfdp honour `dim` and `dimen`; graphs with `dim` above 2 change layout, and `dimen` of 3 or more adds z to `pos`;
   - `ccomps` reuses a user's `_cc_N` subgraph; twopi prints native's `weight=0` error;
   - the no-free layout and second-render fixes (T9–T12, T14, T15);
   - T2's outcome, and new sfdp counts if its exception was used;
   - any parked items.

**Write-set:** open: `test/corpus/parity-*.json(l)`, `test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`, `docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and bytediff finish, *then* `GATE PASS`, 0 regressions, oracle-error 14, and output is identical or within stop 8's exception, with capped jobs listed as unproven.
- *Given* the follow-ups README, *then* each of 114–124 is DONE or PARKED with a journal reference.
- *Given* `npm run coverage`, *when* run, *then* thresholds are met.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
