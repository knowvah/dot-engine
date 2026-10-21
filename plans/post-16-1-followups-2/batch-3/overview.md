# Batch 3: HTML lexer errors, shared Bezier, sfdp corridor

Needs batch 2 landed (T9 needs T7 + T8; T11 needs T10's inventory). Parallel worktrees;
write-sets do not overlap.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T9](T9-html-lexer-errors.md) | item 19c: Unclosed comment, Label closed before end, unterminated quote | typescript-pro | `htmltable-lex.ts` (+ `htmltable-parse.ts` if needed) + test | T7, T8 | [x] |
| [T11](T11-shared-fused-bezier.md) | item 20b: one shared fused `bezier()` for every `utils.c:Bezier` mirror | typescript-pro | new `src/common/bezier.ts`, `spline-midpoint.ts`, the T10 `Bezier` rows + tests | T10 | [x] |
| [T13](T13-sfdp-2168_3-corridor.md) | item 17: sfdp 2168_3 multispline corridor polygon | debugger (opus) | `src/layout/neato/multispline{,-router}.ts`, `cdt-surface.ts` if the fix is there + test | T1 | [x] |

**Batch close-out:** byte-identity of the batch head vs batch 2's head on all five engines
plus circo/twopi/patchwork for T11 (shared code). If any SVG changed, run the survey and
the walks for every engine whose SVG changed, in a worktree. T11's speed gate is part of
T11, not the close-out.
