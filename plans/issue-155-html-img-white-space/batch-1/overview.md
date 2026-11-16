# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port 16.1.1's image rule: blank strings around `<IMG>` allowed, non-space strings a soft error that keeps the label | orchestrator (no subagent: one parser rule and its error flag) | `src/common/htmltable-parse.ts`, `htmltable-parse-image.ts` (new), `htmltable-parse-state.ts`, `htmltable-label.ts`, `htmltable-lex.ts` (AD-2 only), tests, journals | — | [x] |

Spec: [T1-img-white-space.md](T1-img-white-space.md).
