# Batch 1

One task, run by the executor itself, with no parallel work. The fix is one
guarded line and two test rows. Splitting it would leave a red test between
commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-kk-bb.md) | guard the post-routing bb recompute with `pack >= 0`, two no-free fixtures, gates, squash | executor | `src/layout/neato/index.ts`, `src/gvc/rerender.test.ts`, 8 fixtures, `regen.sh` header | — | [x] |
