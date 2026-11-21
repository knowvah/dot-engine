# Batch 1

One task, run by the executor itself, with no parallel work. The fix is two
small edits and their test. Splitting it would leave a red test between commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-relabel.md) | `makeNodeLabel` on every layout, guard kept for render, test + fixtures, process-statics rows, gates, squash | executor | `src/common/{poly-init,nodeinit}.ts`, `src/async/collect.ts` (comment), `src/gvc/rerender-relabel.test.ts`, 5 fixtures, `regen.sh` header, `docs/process-statics.md` | — | [x] |
