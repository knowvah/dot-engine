<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 2 — German, the worked example

One locale, three concurrent Sonnet subagents (parts a/b/c), then the
orchestrator registers and commits. **Ends with a mandatory stop for user
review** (README stop condition 4); batch 3 does not start until the user
approves German or requests changes.

| ID | Language | Agents | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-translate-de.md) | German | 3 Sonnet + orchestrator | `docs-site/de/**`, `locales/de.ts`, `locales/goldens/de.json`, glossary column of `translation-spec.md` | T1–T5 | [ ] |
