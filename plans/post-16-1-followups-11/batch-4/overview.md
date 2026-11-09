# Batch 4: cleanups and ledger

Runs after batch 3 has landed. T10 and T11 are independent (disjoint write-sets) and may run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T10](T10-comment-and-helper.md) | 126, 130: stale comment, redundant helper | typescript-pro (sonnet) | `src/layout/sfdp/spring-electrical.ts`, `src/layout/neato/fdp-adjust.ts` | batch 3 | [x] |
| [T11](T11-ledger-docs.md) | 138: divergences ledger and locales | documentation-engineer | `docs/known-divergences.md`, `docs-site/*/divergences.md` | batch 3 | [x] |
