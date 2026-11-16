# T13 — close-out (`chore(T13)`), then the planned stop

## Steps
1. Port unchanged: rebuild the head bundle from a clean export; sha256 equals `9c7c65b6`'s (stop 3 otherwise).
2. Full gates on head: typecheck, `npm test`, goldens 5/5, corpus + docs, `docs:i18n-status`, `npm run coverage`.
   Record counts.
3. Issues: on each of #149–#165 (and new `upstream-16.1.1` issues) comment the ids and formats it now explains, from
   `classification/*.md`, as "Measured against the 16.1.1 oracle in #147: …". Comment on #147 and #166 with the
   summary. Do not close any issue (the branch is unmerged).
4. Journal: per-task rows complete; a mission-summary row in both journals; README batches ticked and a
   "Mission summary" section (counts per registry before → after, oracle-error 14 → N, groups per issue).
5. Commit `chore(T13): close out the graphviz 16.1.1 re-baseline`.

## Planned stop — hand the user
- Re-sign: `! cd ~/git/knowvah/dot-engine-1611 && git rebase --force-rebase -S origin/main`, then push and a PR
  (merge commit), title `chore: re-pin the oracle to graphviz 16.1.1 (#147)`.
- After merge (AD-7), in the main checkout's local `.claude/`: `mission-driver.sh` `GVBINDIR` default → take it from
  `oracle-paths.mjs` (or `/tmp/ghl1611`); `settings.json:56` dot permission → `~/git/graphviz-16.1.1/build/cmd/dot/dot`;
  `queue-policy.md` oracle rule → 16.1.1. Then #148 and #149–#165 can go `queue:ready`, followed by the held labels
  (174–185, 187, 188, 190–209).

## Acceptance criteria
- Given step 1, then the hashes are equal.
- Given every T9 group, then its issue carries a comment with its ids.
- Given the README, then every batch is ticked and the summary states before → after counts per registry.
