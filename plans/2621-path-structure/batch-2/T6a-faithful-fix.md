<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6a — Faithful fix (commit 2; only if T5 = misport)

## Context

The RCA names the mechanism site. Faithful-port rules apply strictly: port
the C branch as-is, no reordering, no simplification; preserve oddities.

## Task

1. TDD: first add a unit test that captures the C behavior at the mechanism
   site (from T4's recorded values — the isolated replay inputs make an
   ideal fixture; keep it small, no full-graph rendering in tests).
2. Apply the fix at the origin (mechanism site), not downstream.
3. Verify cheaply first: T4's replay harness on C inputs now byte-matches
   C's stage output; the T3 port stage dumps re-derived through the fixed
   function match C's.
4. Spend the THIRD (final) budgeted full port render: re-render 2621, diff
   against the cached oracle xdot — target edge(s) conformant, and compare
   the whole file (other edges must not shift beyond tolerance).
5. Commit: `fix(<scope>): <mechanism summary>` with body citing the RCA.

## Write-set

RCA-named files only (expected: src/layout/dot/* or src/pathplan/*) +
colocated `.test.ts`. Anything else → stop condition 1 protocol.

## Read-set

`.agent-notes/2621-path-structure.md`; the C region named in the RCA;
`~/.claude/rules/testing.md` (TDD), `testability.md`.

## Acceptance criteria

- Given the new unit test, when run before the fix, then it fails; after,
  passes (red-green).
- Given the replay harness on C inputs, when re-run, then stage output
  byte-matches C.
- Given the full re-render, when diffed to the cached oracle, then 2621's
  edge set is conformant and no other edge exceeds tolerance.
- Given lizard, when run on touched files, then caps hold.

## Observability: N/A — no new observable operations.
## Rollback: Reversible (git revert).
