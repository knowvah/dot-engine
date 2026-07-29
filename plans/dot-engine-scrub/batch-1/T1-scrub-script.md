<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Author scrub.mjs + dry-run report

## Context

Repo: /Users/scottseely/git/graphviz-ts, branch chore/dot-engine-scrub.
Text scrub `graphviz-ts` → `dot-engine` per locked decisions
[../decisions.md](../decisions.md) (read D1, D2, D4, D7 before writing code).
Node 26, ESM (.mjs), no new dependencies — Node builtins only.

## Task

Write `plans/dot-engine-scrub/tools/scrub.mjs`:

1. CLI: `node scrub.mjs [--dry-run] <path>...` — operates ONLY under the
   given paths (files or directories, recursive).
2. Always-excluded (even if inside a given path): `.git`, `node_modules`,
   `dist`, `.agent-notes`, `.plan-mission-progress.md`,
   `plans/dot-engine-scrub`. Skip binary files (NUL-byte heuristic).
3. Per file, apply in order (D1/D2):
   a. sentinel-swap `git/graphviz-ts` and `plans/graphviz-ts-port` to
      unique placeholders;
   b. `graphviz-ts/` → `@knowvah/dot-engine/` (specifier rule);
   c. `graphviz-ts` and `graphviz-TS` → `dot-engine` (exact variants only);
   d. restore sentinels.
4. `--dry-run`: modify nothing; print per-tree and per-file replacement
   counts, occurrences left untouched (protected/excluded), and a 10-line
   sample diff. Real run: write files, print the same summary.
5. Run `--dry-run` over `plans docs CLAUDE.md src test` and save the output
   as `tools/dry-run-report.md`, adding a PINNED NUMBERS section:
   total occurrences found, total to replace, and the exact expected
   remaining count (protected lines outside excluded trees) that T4 will
   verify. Reconcile against the planning survey (407 case-sensitive
   occurrences repo-wide; 8 `git/graphviz-ts` + 4 `plans/graphviz-ts-port`
   protected lines; 2 `graphviz-TS` variants) and explain any delta.

## Write-set

- plans/dot-engine-scrub/tools/scrub.mjs
- plans/dot-engine-scrub/tools/dry-run-report.md

## Read-set

- ../decisions.md (D1, D2, D4, D7)
- Sample occurrence lines: run the greps yourself; do not modify targets.

## Acceptance criteria

- Given `--dry-run` over the five path sets, when it finishes, then
  `git status --porcelain` shows only the two write-set files.
- Given a line containing both `~/git/graphviz-ts/plans/...` and a prose
  `graphviz-ts`, when rewritten (in-memory test), then only the prose
  occurrence changes.
- Given `'graphviz-ts/api'`, when rewritten, then it becomes
  `'@knowvah/dot-engine/api'` (not `'dot-engine/api'`).
- Given the report, then it contains the PINNED NUMBERS section with an
  exact expected-remaining count and a reconciliation note.

## Observability: N/A. Rollback: Reversible (tool file, delete to undo).

## Boundaries

- Do not modify any file outside the write-set (dry-run only this task).
- Do not add npm dependencies.
- Return your journal-entry text in your final report; do not write
  decision-journal.md.

## Commit

`chore(scrub): add dot-engine scrub tool + pinned dry-run report (T1)`
