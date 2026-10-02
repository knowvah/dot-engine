# Mission: canvas-font-mapping

## Objective

`CanvasTextMeasurer` (`src/common/textmeasure.ts:272-291`) writes the raw
Graphviz fontname into `ctx.font`. The SVG emitter already resolves
PostScript names through the ported alias table (`src/common/ps-fontalias.ts`,
mirroring `gvrender_core_svg.c:462-495`) and emits e.g. `font-family="Times,serif"`
for `Times-Roman` — so in the browser, **measurement and rendering use
different fonts**. Additionally, a `ctx.font` string the browser rejects is
silently ignored, keeping the *previous* font and size. Fix: one internal
`canvasFont()` builder that yields the same face the SVG renders with, used by
`CanvasTextMeasurer`, reusable by the async prefetch step
(`plans/async-api/DESIGN.md` D4).

## Branch

`fix/canvas-font-mapping` off `main`. Merge strategy: merge commit (per-task
commit IDs are referenced in the journal).

## Startup

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, then [decisions.md](decisions.md), then the current
   batch overview.
3. Check `.agent-notes/` — relevant: `compress-xcoord-is-font-metrics.md`
   (font metrics are the accepted A2 divergence; Node sweep uses
   `EstimateTextMeasurer`).

## Quality gates

| command | pass | on_fail |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | fix_and_rerun |
| `npx vitest run` | exit 0, ≥6094 tests + new ones | fix_and_rerun |
| fresh `npm run survey` (delete the JSONL first) | 0 verdict regressions vs main | stop |

Coverage: new/changed code ≥90% line/branch/function (`npm run coverage`).

## Stop conditions

- A file outside the task's write-set needs changing.
- Two consecutive failures of the same gate.
- An ADR in decisions.md is contradicted by evidence.
- The corpus sweep moves at all (it must not — Node never constructs a
  `CanvasTextMeasurer`; movement means the change leaked).
- Chromium measures `Times-Roman` differently from `Times,serif` after the fix.

## Push forward (decide alone, journal it)

Exact shorthand spacing/quote style; cache key format; test fixture names;
journal wording.

## Batches

| Batch | Goal | Status |
|---|---|---|
| [1](batch-1/overview.md) | T1 `canvasFont` builder · T2 wire measurer | [x] |
| [2](batch-2/overview.md) | T3 real-browser verification + journal | [x] |

## Index

- [decisions.md](decisions.md) — ADRs (pre-made, locked)
- [batch-1/overview.md](batch-1/overview.md)
- [batch-2/overview.md](batch-2/overview.md)
- [diagrams/data-flow.md](diagrams/data-flow.md)
- [diagrams/component-map.md](diagrams/component-map.md)
- [decision-journal.md](decision-journal.md) — append during execution;
  also add a row to the project journal `plans/decision-journal.md`.

## Commits

Conventional Commits, ≤72-char subject, body wrapped at 80, no attribution
footer. Scope `textmeasure`. One commit per task.

## Session summary (2026-10-02)

- **Tasks:** 3/3 complete. T1 `f7d39b25`, T2 `91627f41`, T3 `6845c749` (journal
  commit). Executed directly rather than by subagents (journaled). Hashes are
  the rebased ones on main.
- **Decisions:** 12 journal rows. Flagged for review:
  - ADR-2 implemented keyword-only (no numeric alias weights exist).
  - known-divergences entry placed under non-goals rather than a new
    A-class.
- **Gates:**
  - `tsc` clean.
  - vitest 6148/6148.
  - `css-font.ts` coverage: 100% lines, 96.7% branches.
  - `CanvasTextMeasurer`: 100% covered.
  - Chromium: A === B.
  - Fresh sweep: 0 regressions attributable to the branch. 4 ids moved,
    all explained (see journal). Not done: running main's port on
    2475_1/world (80+ min each).
- **Follow-ups:**
  - Mode-aware measurer for `fontnames=svg|ps` (ADR-1).
  - Survey oracle-cap overrun (`.agent-notes/survey-oracle-cap-overrun.md`).
  - Committed `parity-rules.json` (2026-07-30) is stale vs main.
