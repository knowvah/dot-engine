# T2: `docs(T2)`: commit the follow-ups README and the mission brief

**Context:**
- `plans/post-16.1-followups/README.md` is untracked, and `docs/architecture/overview.md`
  links to it.
- Its header is stale (`main` = `a4effeee`, "rebase merges only").
- The user approved committing it.

**Task:**
1. Update the README header: `main` = `2983eea8`; merge commits only; items 1–6 done.
2. Close "neato 2371 ~7 pt drift" with its evidence: `attribution-neato.jsonl` shows
   `drift-exonerated`, 405,690 base diffs → 0 with the oracle's positions injected (item 3).
3. Add item 13 (`GVBINDIR` defaults) and a link to this mission.
4. Commit it together with `plans/post-16-1-followups-mission/**` and the tailored
   `.claude/settings.autonomous.json`. That file is gitignored; force-add it, as earlier
   missions did.

**Write-set:** the files above. **Read-set:** `git log --oneline main -8`;
`test/corpus/attribution-neato.jsonl` (the 2371 row).

**Acceptance criteria:**
- *Given* the README, *when* each item's status is compared with git history, *then* they
  agree.
- *Given* `docs/architecture/overview.md`, *when* its link to the README is followed in a
  clean clone, *then* it resolves.

**Observability:** N/A. **Rollback:** reversible.
