# Batch 4 — registries, goldens, docs

T10 and T11 run in parallel (disjoint write-sets, separate worktree for T11 or sequential landing by the
orchestrator); T12 starts after T10 lands because the ledger counts depend on the accepted registries.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T10 | [Hand registries](T10-registries.md) | typescript-pro | `test/corpus/accepted-divergences*.json`, `test/corpus/engine-exclusions.json` | T9a, T9b | [x] |
| T11 | [Goldens](T11-goldens.md) | typescript-pro | `test/golden/{gen-svg-refs.ts,gen-svg-refs.test.ts,refs/,refs-xdot/,known-failing.json,inputs/PROVENANCE.md}` | T9a, T9b | [x] |
| T12 | [Docs](T12-docs.md) | orchestrator + documentation-engineer | `test/corpus/PARITY*.md`, `docs/known-divergences.md`, `docs-site/**/divergences*.md`, `docs/adr/0002-*.md`, `CLAUDE.md` | T10 | [x] |
