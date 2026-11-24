# Batch 3 — trace every changed result to its cause

Two read-only `debugger` agents (opus) in parallel, each in its own scratch dir under `$BASE`; the orchestrator
files any new issues and commits their output files as one `docs(mission)` commit. T12a may start once T7 and T8
land, before T9–T11 finish (#147 precedent: it is read-only and renders lightly).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T12a | [Classify dot](T12a-classify-dot.md) | debugger | `plans/graphviz-16-1-2-rebaseline/classification/dot.md` | T7, T8 | [ ] |
| T12b | [Classify engines](T12b-classify-engines.md) | debugger | `plans/graphviz-16-1-2-rebaseline/classification/engines.md` | T9, T10, T11 | [ ] |

## Method (both, AD-2, AD-4)
1. Input: `$BASE/diff/*.tsv` (every id whose result changed, either direction).
2. For each changed id and format: render with native 16.1.1 carried and 16.1.2 carried (same input, engine,
   format; dirs from T5) and diff.
3. Identical native outputs (≥8 runs on fdp, sfdp, neato, twopi): look for a `src/` commit on main after the old
   registry's last write (`git log --format=%h -1 -- <registry>` then `git log <that>..c6d794a9 -- src`) that
   explains the change → group **"port commit on main"** (a regression there gets a GitHub issue). Neither → stop 5.
4. Native exit 1 with empty output on 16.1.2 where 16.1.1 rendered → group **"16.1.2 render skip, pending #299"**.
5. Otherwise group by diff signature, then by the 16.1.2 C change that produces it: read
   `git -C ~/git/graphviz log -p 16.1.1..16.1.2 -- <file>` (use `-w`: much of 16.1.2 is clang-format) and the
   triage in #295 and #298–#303 (`gh issue view <N>`).
6. Each group gets one line: issue (or `NEW: <title>`), C commit and `file:function`, the mechanism in one
   sentence, the id list, and one example diff hunk (≤10 lines). Improvements (ids that now match) are groups too.
7. A worsening group of more than 50 ids with no filed issue, no traceable commit and not #299 → stop 6.

Output files front-load a table: `| group | issue | C change | ids | direction |`, details below. ≤500 lines each.
