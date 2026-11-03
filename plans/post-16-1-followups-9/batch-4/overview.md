# Batch 4: `dir1 n40` and docs

Runs after batch 3, in parallel worktrees. Write-sets are disjoint. T9 starts from T8's result if T8 lands first;
otherwise the orchestrator gives T9 T8's outcome before it writes the ledger sentence.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T8](T8-dir1-n40.md) | 110: `dir1 n40` cause | typescript-pro (opus) | `src/layout/neato/quad-prog-vpsc.test.ts`, its fixture, `harness/T8/` | T7 | [ ] |
| [T9](T9-docs.md) | Docs and locales | documentation-engineer | `docs/known-divergences.md`, `docs-site/guide/errors.md`, locale pages | T1–T8 | [ ] |
