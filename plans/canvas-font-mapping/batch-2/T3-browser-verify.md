# T3 — real-browser verification + journal

## Context

Unit tests use a fake context; ADR-6(c) requires one real-browser proof.
Playwright runs **only through a Python venv in the scratchpad** (never npm or
global installs): `python3 -m venv <scratch>/.venv && <scratch>/.venv/bin/pip
install playwright`; reuse browsers in `~/Library/Caches/ms-playwright` or
`/Applications/Google Chrome.app`.

## Task

1. Build the bundle (`npm run build:js`) and serve/load `dist/index.js` in a
   Chromium page (file URL or `python3 -m http.server` in the scratchpad).
2. In-page:
   - width A = canvas `measureText('Hello World')` with `14px Times, serif`;
   - width B = `new CanvasTextMeasurer(ctx).measure('Hello World','Times-Roman',14).w`;
   - assert A === B.
   - set `ctx.font = canvasFont('Helvetica-Narrow', 14)` equivalent string,
     read `ctx.font` back; record whether `condensed` survived (ADR-3).
   - render a small DOT graph with `fontname="Times-Roman"` via `renderSvg`
     and record one node width before (main) vs after (branch) — evidence only.
3. Run a **fresh** corpus sweep (delete the survey JSONL first; never edit
   `src/` while it runs). Expect 0 verdict changes (Node path untouched).
4. Journal: one row in `plans/decision-journal.md` (project table format) and
   entries in this mission's `decision-journal.md` with the measured numbers.
5. If ADR-2 weight drops or ADR-1 mode limitation are user-visible, add a
   short entry to `docs/known-divergences.md` (accepted delta class).

## Write-set
`plans/decision-journal.md`, `plans/canvas-font-mapping/decision-journal.md`,
`docs/known-divergences.md` (optional). Scratch script is NOT committed.

## Read-set
`../decisions.md`; `docs/known-divergences.md:1-80` (format);
last 5 rows of `plans/decision-journal.md` (format).

## Acceptance criteria
- Given Chromium, when measuring `Times-Roman` vs `Times, serif` at 14px,
  then widths are identical.
- Given `Helvetica-Narrow`, when reading `ctx.font` back, then the stretch
  outcome is recorded in the journal.
- Given a fresh sweep, then 0 verdict regressions vs main.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — docs/journal only.

## Stop
If A ≠ B, stop (stop condition in README) and record actual values.

## Commit
`docs(textmeasure): journal canvas font mapping browser verification`
