<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Gates, fresh sweep, closeout (orchestrator)

## Task

1. **Count identity** (stop condition 4): repo-wide
   `grep -rn "graphviz-ts" . --exclude-dir=.git --exclude-dir=node_modules
   --exclude-dir=dist` filtered to exclude `.agent-notes/`,
   `.plan-mission-progress.md` (if present), and `plans/dot-engine-scrub/`
   must yield EXACTLY the remaining count pinned in
   `tools/dry-run-report.md`, every line containing `git/graphviz-ts` or
   `plans/graphviz-ts-port`. Also confirm 0 `graphviz-TS` variants remain.
2. `npm run coverage` — thresholds pass.
3. Fresh sweep: `rm -f parity-rules.json && npm run survey &&
   npm run survey:gate` — 0 regressions. Judge per-id deltas, not bucket
   counts; 1652 conformant↔timeout is budget-marginal (see
   plans/fix-port-bugs/decision-journal.md) — verify standalone-completion
   reasoning applies before excusing it. Commit a refreshed
   test/corpus/parity-rules.json if it changed.
4. Update checkboxes (README + batch overviews), append all journal entries
   (task agents returned theirs in reports), write the mission summary in
   README.md, commit `docs(scrub): mission closeout (T4)`.
5. Open the PR: base main, title
   `docs: scrub graphviz-ts branding to dot-engine` (typed — squash-only
   repo). Body: scope, protected patterns, count identity, gate results.

## Write-set

plans/dot-engine-scrub/**, test/corpus/parity-rules.json (conditional).

## Acceptance criteria

- Given the identity grep, then counts match the pinned numbers exactly.
- Given the sweep gate, then regressions=0 with per-id audit noted.
- Given the PR, then its title is conventional-commit typed.

## Observability: N/A. Rollback: Reversible (revert squash).
