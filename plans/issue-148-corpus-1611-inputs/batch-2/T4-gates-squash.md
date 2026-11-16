# T4: gates, record, squash

## Task

1. Gates 1–4 from the README, in order; record each result in
   [../decision-journal.md](../decision-journal.md).
2. <a id="gate-5"></a>**Gate 5 (port unchanged).** `src/` must not differ from the
   base: `git diff --stat <base> -- src` is empty. Build the base bundle (a
   temporary worktree under `$TMPDIR` at `<base>`, `npm ci && npm run build:js`)
   and the head bundle (`npm run build:js`); `shasum -a 256` of both
   `dist/index.js` must match. Then run
   `npx tsx test/tools/bytediff.ts <base>.mjs <head>.mjs <smoke-ids> <out>.json`
   with the smoke list at `~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt`
   to prove the moved `bytediff.ts` root still resolves every smoke id (all
   identical expected). Remove the temporary worktree.
3. Gate 6 is T3's classification; link it.
4. Add one row to `plans/decision-journal.md`. Write `.agent-notes/issue-148.md`
   only for something novel (candidates: a 16.1.1 commit that moved `2783`, the
   resume-walk staleness for changed inputs).
5. Fill the README's summary, then squash per the README's "Branch and commits".
6. Comment on #148: the brief path, the classification table, the hand-off note
   (fresh walks for the 7 changed ids), suggested smoke-list additions.

## Write-set

`plans/decision-journal.md`, this plan's `decision-journal.md` and `README.md`
(summary only), `.agent-notes/issue-148.md`.

## Acceptance criteria

- Given the head, when gates 1–4 run, then each exits 0 (gate 3: 5/5).
- Given base and head bundles, when hashed, then the sha256 values are equal.
- Given the squash, when `git log --oneline <base>..` runs, then it shows exactly
  one commit with footer `Refs: #148`, and tag `issue-148/pre-squash` exists.

**Observability:** N/A — no new observable operations.
**Rollback:** Reversible (`git reset --soft` is local; the pre-squash tag keeps
per-task history).
