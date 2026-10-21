# Batch 1: baselines and oracle safety

T0 first (it captures `main` before any change). T1 must land before any survey or walk
runs. T2 is independent. T3 starts after T1 lands, in its own worktree, and may run while
batch 2 is developed (it reads only its worktree's `src/`).

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | port bundle, native stderr, speed baselines at `main` | orchestrator | scratchpad only | — | [x] |
| [T1](T1-oracle-preflight-cache.md) | item 22: oracle preflight + persistent cache + ADR-0001 | typescript-pro | `test/corpus/oracle-env.ts` (+test), the walk/survey scripts, `docs/adr/0001-*.md` | T0 | [x] |
| [T2](T2-2516-stderr-test.md) | item 16: pin 2516's stderr | typescript-pro | `src/common/htmltable-label-errors.test.ts` | T0 | [x] |
| [T3](T3-world-json-rewalk.md) | item 21: re-walk json circo `tree-share-examples-world` | orchestrator | `test/corpus/json-parity-circo.{jsonl,json}`, `PARITY-circo-json.md`, generated docs | T1 | [x] |

Batch close-out: gates on the batch head; journal rows for T0–T3. No survey (no `src/`
change in this batch).
