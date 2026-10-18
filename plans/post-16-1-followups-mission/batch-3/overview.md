# Batch 3: `PointSet` everywhere (item 11)

Needs T0 (baselines, `timings-before.json`) and T7 (both T7 and T9 write `htmltable.ts`).
T8–T10 run in parallel worktrees; T11 runs after them.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T8](T8-poly-pack-pointset.md) | `poly-pack.ts` on `PointSet`, exact doubles | typescript-pro | `src/layout/pack/poly-pack.ts` + tests | T0 | [x] |
| [T9](T9-htmltable-pointset.md) | HTML cell-occupancy set on `PointSet` | typescript-pro | `src/common/htmltable.ts` + test | T0, T7 | [x] |
| [T10](T10-ortho-pointset.md) | ortho `seen` set on `PointSet` | typescript-pro | `src/layout/dot/ortho-adapter.ts` + test | T0 | [x] |
| [T11](T11-pointmap-and-speed.md) | Assess neato `PointMap`; measure speed before/after | orchestrator | journal (+ `init.ts` only if observable) | T8, T9, T10 | [x] |

**Interface (all tasks):** `src/common/pointset.ts` `PointSet`: `addPS(x, y)`,
`inPS({x, y})`, `isInPS(x, y)`, `sizeOf()`, `pointsOf()`. It is already ported and tested;
do not change it. Its two-level `Map` compares exact doubles, with -0 equal to 0.

**Commit type:** `perf(TN)` if output is byte-identical to T0's; `fix(TN)` if any output
changed (AD-6). A changed output also needs a survey or walk with 0 regressions, with
every changed id moving toward the oracle.
