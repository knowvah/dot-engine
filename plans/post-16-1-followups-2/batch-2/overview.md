# Batch 2: independent fixes (parallel worktrees)

Needs batch 1 landed (T1 in particular: every walk and survey below uses its preflight).
Write-sets do not overlap except T7/T8 on `htmltable-parse.ts`, so T8 starts from T7's
landed commit. The orchestrator lands tasks one at a time, re-running the
gates after each cherry-pick. T10 is read-only and produces an `.agent-notes/` table that
T11/T12 consume.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T4](T4-neato-ortho-dedup.md) | item 15: neato ortho concentrate dedup via `PointSet` | typescript-pro | `src/layout/neato/splines.ts`, `src/layout/dot/ortho-adapter.ts` + test | T1 | [x] |
| [T5](T5-makegraphdata-wt-dir.md) | item 18: `makeGraphData` `haveWt` / `haveDir` | debugger (opus) | `src/layout/neato/init.ts` + test | T1 | [x] |
| [T6](T6-aagerror-syntax-errors.md) | item 23: DOT syntax errors in `aagerror` format | typescript-pro | `src/parser/index.ts`, `src/parser/scan-token.ts` + tests | T1 | [x] |
| [T7](T7-html-fonttable.md) | item 19a: `fonttable` grammar | typescript-pro | `htmltable-{parse,types,pos}.ts`, `htmltable.ts`, `htmltable-emit.ts` + test | T1 | [x] |
| [T8](T8-html-attr-warnings.md) | item 19b: `htmllex.c` attribute/value warnings | typescript-pro | `htmltable-parse-attrs.ts`, `htmltable-lex.ts`, consume helper in `htmltable-parse.ts` + test, golden allow-lists | T7 | [x] |
| [T10](T10-bezier-inventory.md) | item 20a: map every `Bezier` copy to its C function | debugger (opus) | none (hand-back → orchestrator writes `.agent-notes/bezier-inventory.md`) | T0 | [x] |

**Batch close-out:** byte-identity of the batch head vs `main` on all five engines. If any
SVG changed (T7 is expected to change fonttable SVGs; T4/T5 may not), run the survey and
the neato walk (T4, T5) on the batch head, in a worktree, before batch 3 starts.

All `src/` tasks share these criteria:
- *Given* the previous head's bundle, *when* every applicable id renders on the task's
  engines, *then* SVG is identical or every change is explained as a move toward native.
- *Given* T0's native stderr, *then* each message the task adds has native's count per id.
