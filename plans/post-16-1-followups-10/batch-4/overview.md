# Batch 4: second renders, then docs

Runs after batches 2, 3a and 3b land. T14 and T15 are one agent, in order, because both change `src/gvc/layout-reset.ts`. T16 runs last, so it documents what landed.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T14](T14-second-renders.md) | 117: `graphs-fdp` and `1581` second renders | typescript-pro (opus) | `src/gvc/{layout-reset,context}.ts`, `src/layout/fdp/`, tests | T12 | [x] |
| [T15](T15-reset-edges.md) | 123: pin the reset's edge cases | same agent | `src/gvc/{layout-reset,context}.ts`, tests | T14 | [x] |
| [T16](T16-docs.md) | Docs and locales | documentation-engineer | `docs/known-divergences.md`, the `dim` attribute docs, `docs-site/*/` | T13, T15 | [ ] |
