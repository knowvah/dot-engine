# T0 — Oracle re-pin to graphviz 16.1.0

**Agent:** orchestrator. **Depends on:** —. **Rollback:** Reversible (15.x
commit and build stay; switch back with `git checkout` + rebuild).
**Observability:** records the oracle identity (`dot -V`, commit shas) in the journal.

## Context

AD-1. `~/git/graphviz` is at `9d6e3abfd` (15.0.0-82) with uncommitted env-gated
`GVTS_POS_DUMP` instrumentation in `lib/fdpgen/layout.c`, `lib/label/xlabels.c`
and `lib/neatogen/neatosplines.c`, plus `.gitignore` (`.serena/cache/`) and an
untracked `.agent-notes/`. Harness defaults read `~/git/graphviz/build/cmd/dot/dot`,
`~/git/graphviz/tests` and `GVBINDIR=/tmp/ghl`
(`test/corpus/gen-headless-gvbindir.sh`; env `GRAPHVIZ_BUILD`, `DOT_BIN`).
The deny rule `git -C ~/git/graphviz checkout` in `.claude/settings.autonomous.json`
is lifted for this mission; stop 12 confines graphviz writes to T0.

## Task

1. Branch: if PR #85 (`gh pr view 85 --json state`) is MERGED, `git checkout main
   && git pull` then `git checkout -b feature/graphviz-16.1-sync`; else branch off
   `fix/plantuml-tracker-issues-2` and journal it (AD-9).
   Commit this brief first: `git add plans/graphviz-16.1-sync && git commit -m
   "docs(plans): add the graphviz 16.1 sync mission brief"`.
2. In `~/git/graphviz`: commit the GVTS instrumentation (3 lib files only, not
   `.gitignore`, not `.agent-notes/`) on a local branch `oracle/15-gvts` at
   `9d6e3abfd`. Message: `chore(local): GVTS_POS_DUMP oracle instrumentation`.
   Never push.
3. `git worktree add ~/git/graphviz-15 oracle/15-gvts`; configure and build with
   the same cmake options as `~/git/graphviz/build` (read `build/CMakeCache.txt`).
   Build a headless plugin dir: `GRAPHVIZ_BUILD=~/git/graphviz-15/build sh
   test/corpus/gen-headless-gvbindir.sh /tmp/ghl15`.
4. In `~/git/graphviz`: `git checkout -b oracle/16.1.0 16.1.0`, cherry-pick the
   GVTS commit (resolve conflicts by re-applying the same env-gated dumps), rebuild
   `build/`, regenerate `/tmp/ghl`.
5. Verify `dot -V` for both builds; smoke-render `tests/2368.dot` on both.
6. Equivalence cross-check against homebrew `dot` 16.1.0. Build a headless dir
   from homebrew's own `core` + `dot_layout` plugins (`/opt/homebrew/lib/graphviz`)
   so text measurement matches. Render every DOT block of plantuml-ts issue files
   23, 27-35 (`/Users/scottseely/git/knowvah/plantuml-ts/docs/graphviz-issues/`)
   through both. If coordinates differ, first rule out build options (compiler,
   `-ffp-contract`). A remaining difference is STOP 4.

## Acceptance

- Given `~/git/graphviz/build/cmd/dot/dot -V` with `GVBINDIR=/tmp/ghl`, then it
  reports 16.1.0; `~/git/graphviz-15/build/cmd/dot/dot -V` reports 15.1.0~dev.
- Given the issue repros, when rendered by our 16.1.0 and headless homebrew
  16.1.0, then all coordinates are identical (journal the list).
- Given `GVTS_POS_DUMP=1`, when fdp renders a graph on either build, then
  `GVTS_POS` lines appear on stderr.

## Write-set

`~/git/graphviz` (branches `oracle/15-gvts`, `oracle/16.1.0`, `build/`),
`~/git/graphviz-15`, `/tmp/ghl`, `/tmp/ghl15`, a scratchpad homebrew plugin dir,
`plans/graphviz-16.1-sync/decision-journal.md`.

## Commit

The brief commit (step 1); the T0 outcome is a journal row in the T1/T2 commits.
