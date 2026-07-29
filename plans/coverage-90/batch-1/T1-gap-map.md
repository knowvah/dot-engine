<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Gap map + agent prompt payloads (serial; commit 1)

## Context
graphviz-ts coverage mission (see ../README.md). Coverage artifacts land in
`coverage/` (`coverage-summary.json` per-file pcts; `coverage-final.json`
per-statement/branch maps).

## Task
1. `npm run coverage`; record the four globals in the journal.
2. From coverage-final.json, build per-family digests: for each module in
   the batch-2/3 task specs, the uncovered line ranges and uncovered branch
   locations (file:line, branch type). Append each digest to the matching
   `T2x`/`T3x` file under an "## Uncovered appendix" heading.
3. Re-audit 0%/near-0% files for dead-code candidates (precise import-path
   grep; D5 rules; deletions in this commit with evidence in the journal).
4. Confirm family assignments still match the CURRENT ranking (the landed
   slices shifted it); rebalance task files if a family fell below ~40
   uncovered branches (fold it into a neighbor and note it).

## Write-set
plans/coverage-90/* (appendices, journal), possible src deletions (D5),
suite-count pin if deletions removed tests.

## Acceptance criteria
- Given coverage-final.json, when digests are appended, then every batch-2/3
  task file has an Uncovered appendix with concrete file:line targets.
- Given a deletion, when committed, then the journal row carries the
  import-grep evidence and tsc+tests stay green.

## Observability: journal row with the four globals. ## Rollback: Reversible.
