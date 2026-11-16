# Batch 3 — trace every changed verdict to its 16.1.1 cause

Two read-only `debugger` agents (opus) in parallel, each in its own scratch dir; the orchestrator files any new
issues and commits their output files as one `docs(mission)` commit.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T9a | [Classify dot](T9a-classify-dot.md) | debugger | `plans/graphviz-16-1-1-rebaseline/classification/dot.md` | T3, T4 | [x] |
| T9b | [Classify engines](T9b-classify-engines.md) | debugger | `plans/graphviz-16-1-1-rebaseline/classification/engines.md` | T5, T6, T7 | [x] |

## Method (both, AD-4)
1. Input: `$BASE/diff/*.tsv` (every id whose verdict changed, either direction).
2. For each changed id and format: render with native 16.1.0 and 16.1.1 (same input, engine, format; dirs from
   T2) and diff. Identical native outputs → stop 5 (after ≥8 runs on fdp, sfdp, neato, twopi).
3. Group ids by diff signature, then by the 16.1.1 C change that produces it: read
   `git -C ~/git/graphviz log -p 16.1.0..16.1.1 -- <file>` for the functions involved, and the triage in each
   issue body (`gh issue view <N>` for #149–#165).
4. Each group gets one line: issue (or `NEW: <title>`), C commit and `file:function`, the mechanism in one
   sentence, the id list, and one example diff hunk (≤10 lines). Improvements (ids that now match) are groups too.
5. A group of more than 50 ids with no filed issue and no traceable commit → stop 6.

Output files front-load a table: `| group | issue | C change | ids | direction |`, details below. ≤500 lines each.
