# Batch 4: `dir1 n40`, re-render, issue 36 pin, docs

Runs after batch 3, in parallel worktrees. Write-sets are disjoint. T8, T11 and T12 run first; T9 starts once all three have
landed, because it documents their outcomes. T11 and T12 were added by AD-11.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T8](T8-dir1-n40.md) | 110: `dir1 n40` cause | typescript-pro (opus) | `src/layout/neato/quad-prog-vpsc.test.ts`, its fixture, `harness/T8/` | T7 | [x] |
| [T11](T11-rerender.md) | plantuml-ts 37: second layout on one graph | typescript-pro (opus) | `src/gvc/context.ts`, `src/gvc/layout-reset.ts`, `rerender.test.ts`, its fixtures, engine cleanups if needed, `harness/T11/` | T6 | [x] |
| [T12](T12-issue-36-golden.md) | plantuml-ts 36: pin against native | orchestrator | `test/golden/pt-issue-36*`, its inputs and refs | T0 | [x] |
| [T9](T9-docs.md) | Docs and locales | documentation-engineer | `docs/known-divergences.md`, `docs-site/guide/errors.md`, locale pages | T1–T8, T11, T12 | [ ] |
