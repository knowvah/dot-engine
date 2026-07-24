<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Final gates + close

## Context
Verify the whole branch and write the mission summary.

## Task
1. Full gates: `npm run typecheck`, `npm test`, `npm run docs:build` — all clean.
2. Confirm `PARITY.md` shows every new track and no existing track regressed
   (compare pass counts against the pre-mission values in git history).
3. Confirm no `src/` file changed outside the declared write-sets
   (`git diff --name-only main -- src/` = only `src/render/map.ts` and the json
   emitter).
4. Append a mission summary to the repo-root `plans/decision-journal.md`
   (tasks done, fixes vs accepted counts, per-track final pass %).
5. Mark all batches `[x]` in this brief's `README.md` and write a closing
   summary at its bottom.

## Write-set
- repo-root `plans/decision-journal.md`
- `plans/format-parity-matrix/README.md` (status + summary)

## Read-set
- `test/corpus/PARITY.md`; git log for pre-mission track counts.

## Acceptance criteria
- Given the full gate run, then tsc + npm test + docs:build all exit 0.
- Given `PARITY.md`, then plain (×8), json (non-dot ×7), imagemap (non-dot ×7)
  tracks are present with pass %.
- Given the src diff, then no file outside the write-sets changed.

## Observability / rollback
N/A. Reversible.

## Quality bar
All gates green; summary written; brief checkboxes updated.
