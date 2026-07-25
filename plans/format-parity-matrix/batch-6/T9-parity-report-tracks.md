<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Add new tracks to parity-report

## Context
`parity-report.ts` reads per-track summaries and writes `PARITY.md` (the matrix)
+ `PARITY-<engine>.md` detail pages. Add the new tracks so the matrix reflects
plain (×8), json (non-dot ×7), imagemap (non-dot ×7).

## Task
Extend `parity-report.ts` to also read `plain-parity-<engine>.json`,
`json-parity-<engine>.json`, `map-parity-<engine>.json` (all engines produced by
T6/T7/T8), emit one `PARITY.md` row per (engine, surface), and generate the
corresponding detail pages (`PARITY-<engine>-plain.md` etc., or extend existing
per-engine pages — follow the file's current naming). Regenerate all reports.

## Write-set
- `test/corpus/parity-report.ts` (modify)
- `test/corpus/PARITY.md` + generated `PARITY-*.md` (regenerated output)

## Read-set
- `test/corpus/parity-report.ts` (current track-loading + PARITY.md table).
- The `*-parity-<engine>.json` summary shapes from T5/T3/T4.

## Interface contract
Consumes each summary's `{ counts: {pass,diverged,accepted,...} }`. New PARITY.md
rows: `| <engine> (plain|json|imagemap) | surveyed | pass | diverged | accepted |
errors | pass% |`.

## Acceptance criteria
- Given the summaries exist, when `tsx parity-report.ts` runs, then `PARITY.md`
  contains a plain row for every engine and json/imagemap rows for the 7 non-dot
  engines.
- Given an engine with no summary yet, then it shows "not yet surveyed", not a
  crash.
- Given regeneration, then existing dot/xdot rows are unchanged.

## Observability / rollback
N/A. Reversible.

## Quality bar
`tsc` clean; `tsx parity-report.ts` runs; `PARITY.md` diff shows only additions
to the track table (no existing row perturbed).
