<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — record attrBool delegates to mapbool (digit guard)

## Context

graphviz-ts is a faithful TypeScript port of Graphviz; the C source at
`~/git/graphviz` is the canonical spec. Tests use vitest; strict TS. TDD:
convert the existing `it.todo` into a real red test FIRST, verify red, then
fix src.

## The bug (locked analysis — if the fix turns out to differ, STOP)

`attrBool` (src/common/record.ts:348-353) reimplements C `mapBool`
(`~/git/graphviz/lib/common/utils.c:325-339`) but drops the `gv_isdigit(*p)`
guard: C only takes the `atoi(p) != 0` fallback when the FIRST character is a
digit; otherwise it returns the default (false). The port unconditionally runs
`parseInt(s, 10) !== 0`, and `parseInt('abc')` is NaN, so `attrBool('abc')` is
TRUE where C says FALSE. Effect: `fixedsize="abc"` clamps a record node when C
expands it. The project already has the correct port: `mapbool`
(src/layout/dot/rank.ts:70-77).

## Task

1. In src/common/record.branch.test.ts, replace the `it.todo` at :439 with a
   real test (the `widthHeight` helper used by neighboring tests at :411-427
   is already in the file). Run it; confirm red.
2. Fix per decision D2 ([../decisions.md](../decisions.md#d2--recordts-attrbool-delegate-to-mapbool)):
   `attrBool` becomes a delegation to `mapbool` imported from
   `../layout/dot/rank.js` (graph-init.ts:30 shows the established pattern).
   Delete the divergent local logic; keep/add a `@see lib/common/utils.c:mapBool`.
3. Confirm green; run the full quality bar.

## Write-set

- src/common/record.ts
- src/common/record.branch.test.ts

## Read-set

- src/common/record.ts:345-395 (attrBool + its two call sites)
- src/common/record.branch.test.ts:405-445 (fixedsize describe + the todo)
- src/layout/dot/rank.ts:60-77 (mapbool + its doc comment)
- ~/git/graphviz/lib/common/utils.c:325-344 (mapBool + mapbool)

## Acceptance criteria

- Given `fixedsize="abc"` on a record node, when sized, then it EXPANDS
  (w ≈ 3.0 like the `"0"` case at :425-427), not clamps.
- Given `'true'`, `'yes'`, `'1'`, `'0'` (existing tests :411-427), then
  behavior is unchanged.
- attrBool contains no local `parseInt` fallback; it delegates to `mapbool`.
- The `it.todo` is gone; its replacement asserts specific values.

## Observability requirements

N/A — no new observable operations.

## Rollback notes

Reversible — pure code change, revert the commit.

## Quality bar

`npm run typecheck` exit 0; `npm test` exit 0 (full suite);
`git diff --name-only` within the write-set only.

## Boundaries

- Never edit files outside the write-set (do NOT touch rank.ts).
- Do not write decision-journal.md — return your journal-entry text in your
  final report instead.

## Commit

One commit: `fix(common): attrBool delegates to mapbool for C digit guard (T2)`
Body: why (C utils.c:336 gv_isdigit guard; NaN !== 0 inverted the default).
