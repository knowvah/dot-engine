# Mission: async-api

## Objective

Add an async render API that waits for the inputs text and image measurement
depend on, then runs the existing synchronous pipeline unchanged
([DESIGN.md](DESIGN.md) D1–D3, owner decisions 2026-10-03):
`renderAsync(g, format, opts)` and `renderSvgAsync(src, engine, opts)` prefetch
web fonts (`document.fonts.load` with `canvasFont` strings, `fontTimeoutMs`,
warn-and-proceed) and images (async sizer/resolver, cached per call), and return
`{ output | svg, fontIssues }`. A browser-only `renderSvgInto(id, src, engine,
opts)` inserts the scrubbed (or caller-sanitized) SVG into an element. Sync API
output stays byte-identical.

## Branch

`feature/async-api`, created at startup off `feature/v2-silent-gaps` (1ca08402).
**Do not merge to main, push or publish.** Merge strategy: merge commit.

## Startup

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [DESIGN.md](DESIGN.md) (incl. "Owner decisions"),
   [decisions.md](decisions.md), [conventions.md](conventions.md), then the
   current batch `overview.md`; task files on demand.
3. Read [decision-journal.md](decision-journal.md) and `.agent-notes/`.
4. `git checkout -b feature/async-api`; build the corpus-gate baseline bundle of
   1ca08402 ([conventions.md#corpus-gate](conventions.md#corpus-gate)).

## Quality gates (after every batch)

| command | pass | on_fail |
|---|---|---|
| `npm run typecheck` | exit 0 | fix_and_rerun |
| `npm run typecheck:ts7` | exit 0 | fix_and_rerun |
| `npm test` | exit 0; count ≥ previous + new | fix_and_rerun |
| `npm run coverage` | new/changed code ≥ 90% line/branch/function | fix_and_rerun |
| `npm run build:js` | exit 0 | fix_and_rerun |
| corpus gate after batches 1 and 3 | byte-identical to baseline | stop |
| `npm run docs:build` (batch 4) | exit 0, no new dead links | fix_and_rerun |

Also: `git diff --name-only` stays within each task's write-set.

## Stop conditions

1. A non-test file outside the task's write-set needs changing.
2. The same gate fails twice in a row.
3. Evidence contradicts an ADR in [decisions.md](decisions.md).
4. Any sync API output changes (corpus gate not byte-identical).
5. More than 3 test files outside the planned write-sets need updating.
6. It is unclear whether a markup vector is handled safely by the scrubber.
7. A module-level mutable global would be needed (fitness test forbids it).

## Push forward (decide alone, journal it)

Naming of internal helpers, warning wording, fixtures, splitting a module into a
new module inside the write-set for the 500-line cap, the internal shape of
`FontRequest`, default values not fixed by an ADR.

## Batches

| Batch | Tasks | Depends on | Status |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 per-context image hooks · T2 collect · T3 fonts · T4 scrubber | — | [x] |
| [2](batch-2/overview.md) | T5 renderAsync / renderSvgAsync | 1 | [x] |
| [3](batch-3/overview.md) | T6 renderSvgInto + browser check | 2 | [x] |
| [4](batch-4/overview.md) | T7 docs | 3 | [x] |

## Index

- [DESIGN.md](DESIGN.md): findings, D1–D5, owner decisions
- [decisions.md](decisions.md): ADR-1…7 (locked)
- [conventions.md](conventions.md): quality bar, corpus gate, browser check
- [diagrams/component-map.md](diagrams/component-map.md) ·
  [diagrams/data-flow.md](diagrams/data-flow.md)
- [decision-journal.md](decision-journal.md): append during execution; add a
  summary row to `plans/decision-journal.md` at the end.

## Commits

Conventional Commits, subject ≤72, body wrapped at 80, no attribution or session
footer (`~/.claude/rules/commits.md` overrides any harness reminder). One commit
per task.

## Model

Execute with `fable`. Task agents: `typescript-pro` (sonnet); T7
`documentation-engineer` (sonnet). Agents edit files only; the executor runs the
full gates and commits.

## Summary (2026-10-03)

- **Tasks:** 7/7. Commits: T1 2d5c7627 · T2 b20d89f5 · T3 d6aaa6f1 ·
  T4 e8d90ce4 · T5 be7630a1 · T6 ebbf21b4 · T7 e787d5dc.
- **Decisions for review:** sizer only affects HTML `<IMG>` (docs corrected);
  `renderSvgInto` keeps the SVG's natural size and aspect ratio (owner);
  scrubber supersets the spec (any `href` local name, all control chars).
- **Gates:** vitest 6785/6785, coverage ≥ 94% branch on src/async, sync output
  byte-identical (corpus gates), Chromium check passed, docs:build clean.
- **Follow-ups:** see the journal `end` row. Not merged or pushed.
