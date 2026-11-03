# T10: final verification and close-out

**Task:**
1. **Quick gates at head:** all README gates, plus `npm run coverage` (what CI runs) and the libm gate over every part-9 layout
   fixture test. Part 8 passed locally and failed on Linux CI, so report which fixtures replay macOS `pow`.
2. **Survey:** in a worktree of the head, a fresh survey with the README command. Record the load before and during. Pass is
   `GATE PASS`, 0 regressions and `counts.oracle-error` == 14 (stops 5 and 6).
3. **Bytediff:** `$BASE/T0.mjs` against the head bundle, `--all`, 8 engines × 5 formats, then the 21 quarantined ids separately. Rerun
   one-sided caps at a 10-minute limit. Every change, stderr included, must match a fresh native run (stop 8). No move is expected
   from T2 (AD-10), and none from T11 (stop 15), because bytediff renders each job once. Report capped jobs as unproven.
   Then rerun `harness/T11/twice-matrix.mjs` on the head bundle and report the new table beside `matrix-T0.json`.
4. **Timing row:** if T7 ported the sort, port before and after on its largest input (3 runs, median, load noted).
5. **Close-out:**
   - `plans/post-16.1-followups/README.md`: mark 109–113 DONE or PARKED with task IDs; open 114 for `neato dim=3` (silently 2-D, 211–302
     diffs on planning's probes, absent from `known-divergences.md`); number other discoveries from 115; update the header line.
   - Mission-summary row in `plans/decision-journal.md`; this brief's checkboxes and a "Mission summary" section in the README.
   - `.agent-notes/post-16-1-followups-9.md` for anything novel.
6. **Commit:** run the gates, then commit `chore(T10): close out post-16.1 follow-ups part 9`, with a one-line stop summary in the body.
7. **Planned stop (14):** tell the user to run `git rebase -f main` with the YubiKey (a failed pick:
   `git reset --hard HEAD && git rebase --continue`), push, and open the PR as a merge commit titled
   `chore: post-16.1 follow-ups part 9 (items 109–113, plantuml-ts 36, 37)`. The `fix` commits cut a patch release. Then tell the user that
   the plantuml-ts tracker needs its pin moved to this release and `zodela-36-sica712` re-measured before 36 can be ticked, and 37 re-checked.
   Give the release note:
   - neato multi-component graphs honour root `maxiter`, `epsilon` and `stresswt`, so those layouts move to match native;
   - sfdp warns on `start=self` and `start=regular`;
   - circo's graph `root` no longer throws on a disconnected graph, and node `root=true` takes effect;
   - rendering one `Graph` twice now follows native's free cycle on every engine, and `dot` no longer throws on the second render (T11's outcome);
   - the T7 and T8 outcome, and any parked items.

**Write-set:** open: `test/corpus/parity-*.json(l)`, `test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and bytediff finish, *then* `GATE PASS`, 0 regressions, oracle-error 14, and output is identical or
  native-verified, with capped jobs listed as unproven.
- *Given* the follow-ups README, *then* each of 109–113 is DONE or PARKED with a journal reference, and 114 is open.
- *Given* `npm run coverage`, *when* run, *then* thresholds are met.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
