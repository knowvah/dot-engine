# T3: font prefetch (ADR-4)

## Context
Canvas measures an unloaded `@font-face` family as its fallback (DESIGN finding 1).
`canvasFont(fontname, fontsize, flags)` (`src/common/css-font.ts:99-109`) yields the
exact CSS string `CanvasTextMeasurer` sets.

## Task
`loadFonts(fontSet: FontSetLike | undefined, fonts: readonly FontRequest[],
timeoutMs: number): Promise<FontIssue[]>`:
- `FontSetLike = { load(font: string): Promise<readonly { status?: string }[]> }`
  (structural; real `FontFaceSet` satisfies it).
- Undefined set → `[]` immediately.
- One `load` per distinct `canvasFont` string, all in parallel; each raced
  against one shared deadline of `timeoutMs`.
- Rejection, or any returned face with `status === 'error'` → `{face, reason:'failed'}`;
  not settled by the deadline → `{face, reason:'timeout'}`; resolved `[]` → no issue.
- `console.warn` once per issue naming face and reason. Clear the timer when done.
Import `FontRequest` from `./collect.js` if T2 has landed, else declare the same
shape locally as `{ fontname: string | null; fontsize: number; flags?: TextVariantFlags }`
(the executor reconciles).

## Write-set
`src/async/fonts.ts`, `src/async/fonts.test.ts` (new).

## Interface contract (consumed by T5)
`export type FontIssue = { face: string; reason: 'failed' | 'timeout' }`,
`export interface FontSetLike`, `export function loadFonts(...)`.

## Acceptance criteria
- Given a set whose load resolves, then [] and no warning.
- Given a load that never settles and timeoutMs=5 (fake timers), then one timeout issue.
- Given a rejecting load, then a failed issue; given a face with status 'error', then failed.
- Given duplicate requests mapping to one CSS string, then load is called once.
- Given no set, then [] without touching timers.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
