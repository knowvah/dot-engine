# Batch 5 — locale re-translations

Three parallel subagents, one per locale group; disjoint write-sets. The
orchestrator verifies all three and makes **one** commit (one logical change):
`docs(i18n): re-translate divergences for registry-backed a10`.

| ID | Locales | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T7a](T7-translate.md) | cs da de es et fi fr hu | technical-writer | `docs-site/{cs,da,de,es,et,fi,fr,hu}/divergences.md` | T6 | [ ] |
| [T7b](T7-translate.md) | is it ja ko nl no pl pt-br | technical-writer | `docs-site/{is,it,ja,ko,nl,no,pl,pt-br}/divergences.md` | T6 | [ ] |
| [T7c](T7-translate.md) | ro ru sk sv tr zh-cn zh-tw | technical-writer | `docs-site/{ro,ru,sk,sv,tr,zh-cn,zh-tw}/divergences.md` | T6 | [ ] |

Gate after all three: `node scripts/docs-i18n-status.mjs` reports `stale pages: 0`
for every locale; `npx vitest run test/docs` green.
