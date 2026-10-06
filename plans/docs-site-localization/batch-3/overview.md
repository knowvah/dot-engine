<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 3 — cs, da, es, et, fi

5 locales, dispatched together: 15 concurrent Sonnet subagents
(parts a/b/c per locale, one message). The orchestrator then registers and
commits each locale separately, in table order. Write-sets are disjoint
across locales.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T7](T7-translate-cs.md) | Czech | 3 Sonnet + orchestrator | `docs-site/cs/**`, `locales/cs.ts`, `locales/goldens/cs.json` | T6 | [x] |
| [T8](T8-translate-da.md) | Danish | 3 Sonnet + orchestrator | `docs-site/da/**`, `locales/da.ts`, `locales/goldens/da.json` | T6 | [x] |
| [T9](T9-translate-es.md) | Spanish | 3 Sonnet + orchestrator | `docs-site/es/**`, `locales/es.ts`, `locales/goldens/es.json` | T6 | [x] |
| [T10](T10-translate-et.md) | Estonian | 3 Sonnet + orchestrator | `docs-site/et/**`, `locales/et.ts`, `locales/goldens/et.json` | T6 | [ ] |
| [T11](T11-translate-fi.md) | Finnish | 3 Sonnet + orchestrator | `docs-site/fi/**`, `locales/fi.ts`, `locales/goldens/fi.json` | T6 | [ ] |

Batch done when every locale is committed or quarantined (journaled), and
`npm run docs:build` passes with all committed locales registered. Record
build time vs the T1 baseline in the journal (stop condition 6).
