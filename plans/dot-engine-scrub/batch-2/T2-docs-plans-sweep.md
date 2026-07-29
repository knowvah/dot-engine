<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Apply scrub to plans/ + docs/ + CLAUDE.md

## Context

Repo: /Users/scottseely/git/graphviz-ts, branch chore/dot-engine-scrub.
The scrub tool and its pinned dry-run counts exist (T1). Read
[../decisions.md](../decisions.md) D1/D2/D6/D7 and
`plans/dot-engine-scrub/tools/dry-run-report.md` first.

## Task

1. Run `node plans/dot-engine-scrub/tools/scrub.mjs plans docs CLAUDE.md`.
2. Verify the printed replacement counts equal the dry-run report's numbers
   for these trees exactly. Any mismatch: STOP, report, change nothing more.
3. Verify remaining occurrences in these trees are protected-pattern lines
   only: `grep -rn "graphviz-ts" plans docs CLAUDE.md` (excluding
   plans/dot-engine-scrub/) — every hit must contain `git/graphviz-ts` or
   `plans/graphviz-ts-port`.
4. Spot-read 5 rewritten files (1 docs/architecture, 1 comparison page,
   1 old mission README, CLAUDE.md, 1 plans/future doc incl. the former
   `graphviz-TS` lines) for broken prose; apply ≤1-line rewordings only
   where mechanically awkward (log each in your report).

## Write-set

plans/** (except plans/dot-engine-scrub/** and the plans/graphviz-ts-port
directory NAME — its contents' prose IS in scope), docs/**, CLAUDE.md.

## Acceptance criteria

- Given the sweep, when done, then per-tree counts match the pinned report.
- Given `grep -rn "graphviz-ts" CLAUDE.md`, then 0 hits.
- Given remaining hits in plans/ + docs/, then 100% are protected-path lines.
- Given `git diff --name-only`, then only these trees changed.

## Observability: N/A. Rollback: Reversible.

## Boundaries

- Never run the script over src/ or test/ (T3 owns them).
- Never touch tools/scrub.mjs (T1 owns it) — if the script misbehaves, STOP.
- Return journal text in your report; do not write decision-journal.md.

## Commit

`docs(scrub): rename graphviz-ts to dot-engine in plans, docs, CLAUDE.md (T2)`
