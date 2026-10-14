# Batch 6 — close-out (orchestrator, no agent)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T8 | Final gates, journals, handoff update, PR | orchestrator | `plans/registry-faults-staleness/{README,decision-journal}.md`, `plans/decision-journal.md`, `plans/post-16.1-followups/README.md` | T7a–c | [ ] |

## Steps

1. Gates on the final tree: `npm run typecheck`; `npx vitest run test/corpus
   test/docs`; `bash test/golden/gates.sh` (5/5); `node scripts/docs-i18n-status.mjs`
   (`stale pages: 0` for every locale); `git diff main -- src` empty.
2. Journal: a close row in `decision-journal.md`; a mission-summary row in
   `plans/decision-journal.md` (mechanism of each change, retirements, the
   six re-walked rows, gate results). Tick the batch table in `README.md` and
   add a short session-end summary.
3. `plans/post-16.1-followups/README.md`: mark items 1 and 2 done with the PR
   number (this file is untracked; edit it, do not commit it unless the user
   asked).
4. Commit (`docs(plans): close the registry faults mission`), push the branch,
   open the PR (pre-authorized; do **not** merge — the user rebase-merges).
   PR body: what changed per registry, the four retirements, the 11 A10
   entries, verification, and that no dot survey/engine walk was needed
   because `src/` is unchanged.

## Acceptance criteria

- Given the final tree, then every gate above passes.
- Given the PR, then it targets `main`, is open, and is not merged.

## Observability

N/A — no new observable operations.

## Rollback

Reversible — the PR is unmerged; closing it or reverting its commits restores
`main`.
