<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — RCA artifact + journal (commit 1)

## Context

Batch gate. `~/.claude/rules/diagnosis.md` requires the artifact BEFORE any
fix: mechanism (1–2 sentences), origin `file:line`, causal chain from origin
to the observed symptom (the g[14] path-structure delta), and a non-empty
ruled-out list with the evidence that eliminated each.

## Task

1. Write `.agent-notes/2621-path-structure.md` with the four diagnosis.md
   sections plus: the T1 per-op delta table, T3's first-diverging stage, the
   T4 decisive experiment, and the T2 hook inventory (so a future session can
   re-drive the dumps).
2. Append the batch-1 journal rows to
   `plans/2621-path-structure/decision-journal.md` (T1 calibration numbers,
   render budget spent, any native-tree patches outstanding).
3. Commit: `test(2621): localize the path-structure divergence to <stage>`
   (adjust type to `fix`/`docs` as appropriate; ≤72 chars, per commits.md).

## Write-set

- `.agent-notes/2621-path-structure.md`
- `plans/2621-path-structure/decision-journal.md`
- `plans/2621-path-structure/batch-1/overview.md` + `README.md` checkboxes

## Read-set

T4 interface draft; `~/.claude/rules/diagnosis.md`; `~/.claude/rules/commits.md`.

## Acceptance criteria

- Given the artifact, when reviewed against diagnosis.md, then all four
  sections exist and "ruled out" is non-empty.
- Given the commit, when inspected, then it contains only the declared
  write-set.

## Observability: N/A. ## Rollback: Reversible.
