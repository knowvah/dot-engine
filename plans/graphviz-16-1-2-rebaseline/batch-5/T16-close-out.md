# T16 — close-out (`chore(T16)`), then the planned stop

## Steps
1. Port unchanged: rebuild the head bundle from a clean export; sha256 equals `c6d794a9`'s (stop 3 otherwise);
   `git diff c6d794a9 HEAD -- src` is empty.
2. Full gates on head: typecheck, `npm test`, goldens 5/5, corpus + docs, `docs:i18n-status`, `npm run coverage`.
   Record counts. (`npm run codeql:gate` is the user's, before the PR.)
3. Issues (do not close any; the branch is unmerged), each as "Measured against the 16.1.2 carried oracle in
   #297: …" from `classification/*.md`:
   - #300–#303 and any new `upstream-16.1.2` issue: the ids and formats each now explains;
   - #299: the render-skip ids and formats, and the goldens kept at 16.1.1 (T14);
   - #298: the 7 inputs are in the manifest as `pending-input` (AD-1); admitting them is removing their
     `MANUAL_QUARANTINE` lines;
   - #222: retarget the bench to the 16.1.2 timings (AD-10);
   - #311: fixed by T15 (closes when the branch merges);
   - #297 and #295: the summary.
4. Journal: per-task rows complete; a mission-summary row in both journals; README batches ticked and a
   "Mission summary" section (counts per registry before → after, oracle-error 10 → N, groups per issue).
5. Commit `chore(T16): close out the graphviz 16.1.2 re-baseline`.

## Planned stop — hand the user
- Re-sign: `! cd ~/git/knowvah/dot-engine-1612 && git rebase --force-rebase -S origin/main` (squashing to one
  commit per issue as the user prefers), `npm run codeql:gate`, then push and a PR (merge commit), title
  `chore: move the oracle to graphviz 16.1.2 (#297)`.
- After merge (AD-7), in the main checkout's local `.claude/`: `settings.json` dot permissions → the 16.1.2
  carried and pristine binaries (keep the 16.1.1 lines for bisecting); `queue-policy.md` oracle rule → the
  16.1.2 **carried** build and dirs (it still says pristine 16.1.1); `mission-driver.sh` needs nothing (reads
  `oracle-paths.mjs`). Fast-forward `chore/issue-queue` to the merge. Then #298, and #300–#303 can go
  `queue:ready`; #299 waits on the ruling.

## Acceptance criteria
- Given step 1, then the hashes are equal and `src/` has no diff.
- Given every T12 group, then its issue carries a comment with its ids.
- Given the README, then every batch is ticked and the summary states before → after counts per registry.

## Observability / rollback
N/A. Reversible.
