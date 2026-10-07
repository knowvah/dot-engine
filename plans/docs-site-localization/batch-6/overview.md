<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 6 — ro, ru, sk, sv, tr

5 locales, dispatched together: 15 concurrent Sonnet subagents
(parts a/b/c per locale, one message). The orchestrator then registers and
commits each locale separately, in table order. Write-sets are disjoint
across locales.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T22](T22-translate-ro.md) | Romanian | 3 Sonnet + orchestrator | `docs-site/ro/**`, `locales/ro.ts`, `locales/goldens/ro.json` | T6 | [x] |
| [T23](T23-translate-ru.md) | Russian | 3 Sonnet + orchestrator | `docs-site/ru/**`, `locales/ru.ts`, `locales/goldens/ru.json` | T6 | [x] |
| [T24](T24-translate-sk.md) | Slovak | 3 Sonnet + orchestrator | `docs-site/sk/**`, `locales/sk.ts`, `locales/goldens/sk.json` | T6 | [x] |
| [T25](T25-translate-sv.md) | Swedish | 3 Sonnet + orchestrator | `docs-site/sv/**`, `locales/sv.ts`, `locales/goldens/sv.json` | T6 | [x] |
| [T26](T26-translate-tr.md) | Turkish | 3 Sonnet + orchestrator | `docs-site/tr/**`, `locales/tr.ts`, `locales/goldens/tr.json` | T6 | [x] |

Batch done when every locale is committed or quarantined (journaled), and
`npm run docs:build` passes with all committed locales registered. Record
build time vs the T1 baseline in the journal (stop condition 6).
