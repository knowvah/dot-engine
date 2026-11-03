# Batch 4: `dir1 n40`, re-render, issue 36 pin, docs

Runs after batch 3, in parallel worktrees. Write-sets are disjoint. T8, T11 and T12 run first, then T13 and T14 (one agent, in that order,
landed one at a time). T9 starts once all of them have landed, because it documents their outcomes. T11 and T12 were added by AD-11, T13 and T14 by AD-12.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T8](T8-dir1-n40.md) | 110: `dir1 n40` cause | typescript-pro (opus) | `src/layout/neato/quad-prog-vpsc.test.ts`, its fixture, `harness/T8/` | T7 | [x] |
| [T11](T11-rerender.md) | plantuml-ts 37: second layout on one graph | typescript-pro (opus) | `src/gvc/context.ts`, `src/gvc/layout-reset.ts`, `rerender.test.ts`, its fixtures, engine cleanups if needed, `harness/T11/` | T6 | [x] |
| [T12](T12-issue-36-golden.md) | plantuml-ts 36: pin against native | orchestrator | `test/golden/pt-issue-36*`, its inputs and refs | T0 | [x] |
| [T13](T13-nofree-append.md) | 37: a layout with no free appends its route | typescript-pro (opus) | `src/layout/dot/` routing gates, `rerender.test.ts`, its fixtures | T11 | [ ] |
| [T14](T14-write-back.md) | 37: rendering writes attributes back | typescript-pro (opus) | `src/render/**`, `src/gvc/**`, `src/common/emit*`, `src/common/output*`, tests, fixtures | T13 | [ ] |
| [T9](T9-docs.md) | Docs and locales | documentation-engineer | `docs/known-divergences.md`, `docs-site/guide/errors.md`, locale pages | T1–T8, T11–T14 | [ ] |
