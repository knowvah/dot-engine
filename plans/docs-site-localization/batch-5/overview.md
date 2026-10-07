<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 5 — ko, nl, no, pl, pt-br

5 locales, dispatched together: 15 concurrent Sonnet subagents
(parts a/b/c per locale, one message). The orchestrator then registers and
commits each locale separately, in table order. Write-sets are disjoint
across locales.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T17](T17-translate-ko.md) | Korean | 3 Sonnet + orchestrator | `docs-site/ko/**`, `locales/ko.ts`, `locales/goldens/ko.json` | T6 | [x] |
| [T18](T18-translate-nl.md) | Dutch | 3 Sonnet + orchestrator | `docs-site/nl/**`, `locales/nl.ts`, `locales/goldens/nl.json` | T6 | [x] |
| [T19](T19-translate-no.md) | Norwegian | 3 Sonnet + orchestrator | `docs-site/no/**`, `locales/no.ts`, `locales/goldens/no.json` | T6 | [x] |
| [T20](T20-translate-pl.md) | Polish | 3 Sonnet + orchestrator | `docs-site/pl/**`, `locales/pl.ts`, `locales/goldens/pl.json` | T6 | [x] |
| [T21](T21-translate-pt-br.md) | Brazilian Portuguese | 3 Sonnet + orchestrator | `docs-site/pt-br/**`, `locales/pt-br.ts`, `locales/goldens/pt-br.json` | T6 | [x] |

Batch done when every locale is committed or quarantined (journaled), and
`npm run docs:build` passes with all committed locales registered. Record
build time vs the T1 baseline in the journal (stop condition 6).
