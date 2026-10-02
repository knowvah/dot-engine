# T4: C-port throw sites, group A (14 sites)

## Context

Read the repo `CLAUDE.md` ("The C Source Is Sacred") and `../decisions.md` ADR-4.
T1 added `InternalError` and `RenderError(message, code?, options?)` to
`src/errors.ts`. These ported files throw bare `Error`s that should be
`DotEngineError`s, classified by what the C does at the same point.

## Task

Apply [../cport-classification.md](../cport-classification.md) to every
`throw new Error` in the write-set files:

| File | Sites (line, message) |
|---|---|
| `src/layout/neato/cdt-surface.ts` | 167 edge not in face · 401 vertex outside hull · 484 constraint edges cross · 493 / 547 constraint walk left surface · 551 no wedge triangle |
| `src/layout/neato/multispline-router.ts` | 168 mkRouter triangulation failed · 196 findMap no triangle · 289 edgeToSeg no edge |
| `src/vpsc/Solver.ts` | 132 / 195 Unsatisfied constraint · 186 Cycle Error! |
| `src/ortho/ortho-parallel.ts` | 84 decide_point np2 null (C assert(0)) |
| `src/ortho/trap-query.ts` | 99 locateEndpoint unreachable |

Known C anchors (verify; do not trust blindly):
- `lib/vpsc/solve_VPSC.cpp:98,130,190`: `throw std::runtime_error`, uncaught →
  `InternalError`.
- `lib/ortho/ortho.c` `decide_point`: `assert(0)` → `InternalError`.
- `lib/neatogen/multispline.c:556` `mkRouter`: check what C does when
  triangulation fails. If C returns NULL and the caller falls back, that is stop
  condition 5.

## Write-set

The five files above, plus `src/errors.cport-a.test.ts` (new).
**Not** `../reclassification.md`: return your rows; the executor appends them.

## Read-set

- `../cport-classification.md`
- `src/errors.ts` (T1 output)
- each site ±15 lines, plus the enclosing function's `@see`
- the C counterparts under `~/git/graphviz/lib/{neatogen,vpsc,ortho}/`, and wherever
  the CDT port's `@see` points

## Interface contract (input from T1)

`InternalError(message, options?)`, `RenderError(message, code?, options?)`.

## Acceptance criteria

- Every one of the 14 sites throws `InternalError` or `RenderError` with its original
  message, or is reported as stop condition 5 with no change.
- `git diff` on the five files touches only the throw expressions, imports and
  `@see` comments.
- `npm test` is green with no changes to existing tests' expectations.
- A returned table has 14 rows, each with a C reference.

## Quality bar

Strict TS; both type-checks; complexity limits. Faithfulness over everything: if
in doubt, stop and journal.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Class-only change; output identical (verified by the
corpus gate).

## Boundaries

Never change a condition, a message, or control flow. Never add exports for tests.

## Commit

`refactor(errors): throw DotEngineError subclasses at C-port sites (A)`

Body: the per-site classification table (abbreviated) and the note that control flow
is unchanged.
