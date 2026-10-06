<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 4 — fr, hu, is, it, ja

5 locales, dispatched together: 15 concurrent Sonnet subagents
(parts a/b/c per locale, one message). The orchestrator then registers and
commits each locale separately, in table order. Write-sets are disjoint
across locales.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T12](T12-translate-fr.md) | French | 3 Sonnet + orchestrator | `docs-site/fr/**`, `locales/fr.ts`, `locales/goldens/fr.json` | T6 | [ ] |
| [T13](T13-translate-hu.md) | Hungarian | 3 Sonnet + orchestrator | `docs-site/hu/**`, `locales/hu.ts`, `locales/goldens/hu.json` | T6 | [ ] |
| [T14](T14-translate-is.md) | Icelandic | 3 Sonnet + orchestrator | `docs-site/is/**`, `locales/is.ts`, `locales/goldens/is.json` | T6 | [ ] |
| [T15](T15-translate-it.md) | Italian | 3 Sonnet + orchestrator | `docs-site/it/**`, `locales/it.ts`, `locales/goldens/it.json` | T6 | [ ] |
| [T16](T16-translate-ja.md) | Japanese | 3 Sonnet + orchestrator | `docs-site/ja/**`, `locales/ja.ts`, `locales/goldens/ja.json` | T6 | [ ] |

Batch done when every locale is committed or quarantined (journaled), and
`npm run docs:build` passes with all committed locales registered. Record
build time vs the T1 baseline in the journal (stop condition 6).
