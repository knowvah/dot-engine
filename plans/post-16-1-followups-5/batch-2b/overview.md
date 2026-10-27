# Batch 2b: independent fixes

Parallel worktrees after T0 (alongside 2a). Write-sets are disjoint from 2a and from each
other. T9's `device-cluster.ts` is consumed by T16.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-docs-hier-wording.md) | AD-17, item 86: `mode=hier` errors-table wording | documentation-engineer | `README.md`, `docs-site/**/guide/errors.md` | T0 | [x] |
| [T7](T7-json-nested-render.md) | AD-18, item 78: `-Tjson` nested xdot render in `beginGraph` | typescript-pro | `src/render/json.ts` | T0 | [x] |
| [T8](T8-attvalue-nonxml.md) | AD-14, item 76: attribute-value NON_XML set | typescript-pro | `src/common/htmltable-lex-attvalue.ts` | T0 | [x] |
| [T9](T9-cluster-snapshot.md) | AD-6, item 89: cluster attrs read the snapshot | typescript-pro | `src/gvc/device-cluster.ts` | T0 | [x] |
