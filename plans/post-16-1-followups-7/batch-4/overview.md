# Batch 4: ipsep wiring, docs

Runs after batch 3. T10 and T11 run in parallel: T11 edits only docs and needs only the
decided behaviour, not T10's code. T11's text about ipsep is checked against T10's result
before landing.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T10](T10-ipsep-wiring.md) | Item 96c: wire the cola driver, drop the guard and the kD `cola` option | typescript-pro | `src/layout/neato/init.ts`, `start.ts`, `stress-kernel.ts`, `stress-kernel.fused.test.ts`, `ipsep-probes.test.ts` (+ tests) | T8 | [x] |
| [T11](T11-docs.md) | Docs: ipsep rows, image types, `imagepath`, divergences (+23 locales) | documentation-engineer | `docs-site/guide/errors.md`, `docs-site/guide/images.md`, `docs/known-divergences.md`, `docs-site/divergences.md`, their 23 locale copies, i18n hashes | T6, T9; T10 for the ipsep wording | [x] |
