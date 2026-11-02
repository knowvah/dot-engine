# Batch 3: major and hier models, docs

Runs after batch 2. T6 needs T1 (`parseModel`) and T2 (the moved helpers, AD-4). T8 edits
only docs and needs only the decided behaviour; its model wording is checked against T6
and T7 before it lands.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-major-hier-models.md) | Item 103b: subset, circuit and mds on the major and hier paths | typescript-pro (opus) | `src/layout/neato/stress-models.ts`, `init.ts`, `constrained-majorization.ts`, `start.ts` (major/hier), `models-probes.test.ts` (major/hier) (+ tests) | T1, T2 | [x] |
| [T8](T8-docs.md) | Docs: model rows, VPSC ledger entry, part-7 `images.md` nits (+23 locales) | documentation-engineer | `docs-site/guide/errors.md`, `docs-site/guide/images.md`, `docs/known-divergences.md`, their locale copies | T1; T6, T7 for the model wording | [x] |
