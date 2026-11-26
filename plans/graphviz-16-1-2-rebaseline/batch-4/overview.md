# Batch 4 — registries, goldens, docs

T13 and T14 run in parallel (disjoint write-sets; T14 in a detached scratch worktree `$BASE/wt-t14` or landed
sequentially by the orchestrator); T15 starts after T13 lands because the ledger counts depend on the accepted
registries.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T13 | [Hand registries](T13-registries.md) | typescript-pro | `test/corpus/accepted-divergences*.json`, `test/corpus/engine-exclusions.json` | T12a, T12b | [ ] |
| T14 | [Goldens](T14-goldens.md) | typescript-pro | `test/golden/{refs/,refs-xdot/,known-failing.json,inputs/PROVENANCE.md}` | T12a, T12b | [x] |
| T15 | [Docs](T15-docs.md) | orchestrator + documentation-engineer | `test/corpus/PARITY*.md`, `docs/known-divergences.md`, `docs-site/**/divergences*.md`, `docs/adr/000{2,3}-*.md`, `CLAUDE.md` | T13 | [ ] |
