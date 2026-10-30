# T12: final verification and close-out

**Task:**
1. **Survey:** in a worktree of the branch head, run a fresh survey with the README
   command, deleting the probe file first. Pass is `GATE PASS`, 0 regressions and
   `counts.oracle-error` == 14 (stops 5 and 6).
2. **Bytediff and walks:** bytediff `$BASE/T0.mjs` against the head bundle over the corpus
   ids, for every engine and format.
   - Walk only the engines and formats whose output changed (AD-8), with 0 pass→worse.
     T3 (edge `fillcolor`) and T9 (`imagepath`) are the expected movers.
   - For walked engines, commit the refreshed `test/corpus/parity-<engine>.jsonl` rows and
     regenerate the parity docs with `npx tsx test/corpus/parity-report.ts`.
   - Journal the bytediff verdict for every engine that was not walked.
3. **Flipped rows:**
   - fail→pass: retire the matching acceptances (`test/corpus/accepted-divergences-*.json`,
     `docs/known-divergences.md` + 23 locales, `sourceHash`).
   - pass→fail: stop 5.
4. **Close-out:**
   - In `plans/post-16.1-followups/README.md`, mark 95–102 DONE or PARKED, each with its
     task ID. Number new follow-ups from 103 (103 = wiring subset/circuit into the major,
     kk and hier paths, AD-3).
   - Add the mission-summary row to `plans/decision-journal.md`.
   - Set this brief's checkboxes.
   - Write `.agent-notes/post-16-1-followups-7.md` for anything novel. This includes the
     pre-existing duplicate APSP copies (`bfs.ts` vs `stress-kernel.ts`) if T7 or T10 did
     not resolve them.
5. **Commit:** run the gates (all four plus i18n), then commit
   `chore(T12): close out post-16.1 follow-ups part 7`.
6. **Planned stop (13):**
   - Tell the user to run `git rebase -f main` on the branch in their terminal with the
     YubiKey. The repo-local `commit.gpgsign=true` re-signs each commit; if a pick's
     signing fails, run `git reset --hard HEAD && git rebase --continue`.
   - Then the user pushes and opens the PR as a merge commit, titled
     `chore: post-16.1 follow-ups part 7 (items 95–102)`. The `feat` commits cut a minor
     release (AD-1).
   - Release note:
     - neato lays out constrained ipsep (`diredgeconstraints`, `overlap=ipsep|vpsc`,
       clusters) with `stress_majorization_cola`, including the subset and circuit
       models; unconstrained ipsep now matches native byte for byte;
     - `shape=custom` and unknown shape names warn as native;
     - `":red"` fill names on point nodes and edge arrowheads warn and fill black as
       native;
     - rotated svg images match native;
     - image types are sniffed from resolver bytes: `No loadimage plugin` for json, and a
       warning plus no draw for unknown magic;
     - `imagepath` gives native's `Filename "…" is unsafe` warning;
     - list any parked items.

**Write-set:** `test/corpus/parity-*.json(l)`, `test/corpus/attribution-*.json(l)`,
`test/corpus/PARITY-*.md`, `test/corpus/accepted-divergences-*.json`,
`docs/known-divergences.md`, `docs-site/*/divergences.md`, `plans/**`, `.agent-notes/`.

**Acceptance criteria:**
- *Given* the head, *when* the survey and any walks finish, *then* `GATE PASS`,
  0 regressions, oracle-error 14 and no pass→worse.
- *Given* the follow-ups README, *then* every item 95–102 is DONE or PARKED with a journal
  reference.

**Observability:** N/A. **Rollback:** reversible.
