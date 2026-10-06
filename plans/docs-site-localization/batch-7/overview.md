<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 7 — zh-cn, zh-tw

2 locales, dispatched together: 6 concurrent Sonnet subagents
(parts a/b/c per locale, one message). The orchestrator then registers and
commits each locale separately, in table order. Write-sets are disjoint
across locales.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T27](T27-translate-zh-cn.md) | Simplified Chinese | 3 Sonnet + orchestrator | `docs-site/zh-cn/**`, `locales/zh-cn.ts`, `locales/goldens/zh-cn.json` | T6 | [ ] |
| [T28](T28-translate-zh-tw.md) | Traditional Chinese | 3 Sonnet + orchestrator | `docs-site/zh-tw/**`, `locales/zh-tw.ts`, `locales/goldens/zh-tw.json` | T6 | [ ] |

Batch done when every locale is committed or quarantined (journaled), and
`npm run docs:build` passes with all committed locales registered. Record
build time vs the T1 baseline in the journal (stop condition 6).
