# Batch 2: native warnings (stderr only)

Items 8 and 10. SVG output must not change; only `console.warn` lines are added.
Needs T0. Each task works in its own worktree; the orchestrator lands them one at a time.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T4](T4-pathplan-prerror.md) | C `prerror` messages in `Pshortestpath` | typescript-pro | `src/pathplan/shortest.ts` + test | T0 | [x] |
| [T5](T5-multispline-warnings.md) | multispline "Could not create control points" ×5 | typescript-pro | `src/layout/neato/multispline.ts` + test | T0 | [x] |
| [T6](T6-html-lexer-errors.md) | HTML lexer: unknown entity, mismatched tag | typescript-pro | `src/common/htmltable-lex.ts`, `htmltable-parse.ts` + tests | T0 | [ ] |
| [T7](T7-html-size-warnings.md) | HTML: cell/table size too small warnings | typescript-pro | `src/common/htmltable.ts` (+ `htmltable-pos.ts`) + test | T0 | [x] |

**Acceptance criteria shared by T4–T7** (in addition to each task's own):
- *Given* T0's port baseline, *when* the affected engines re-render every id, *then* every
  SVG is byte-identical.
- *Given* T0's native stderr, *when* the port's stderr is compared per id, *then* the count
  of each message this task adds equals native's. Every mismatching id is diagnosed and
  reported in the hand-back.
- *Given* `test/golden/pt-issue-*` stderr refs and the plantuml-ts tracker tests, *then*
  they still pass. They parse only `lost` and `Pshortestpath` lines.

Messages go through `console.warn(...)`, the port's existing warning channel
(`splines-routespl.ts:445`, `postproc.ts:229`). Use C's text exactly, without trailing
`\n`.
