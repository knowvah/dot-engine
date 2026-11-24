<!-- SPDX-License-Identifier: EPL-2.0 -->

# ADR-0004: Move the oracle to graphviz 16.1.2

## Status

Accepted 2026-11-24 (issue #297, tracker #295; mission
`plans/graphviz-16-1-2-rebaseline/`, decisions AD-1 to AD-10 in its
`decisions.md`, approved by the maintainer). Supersedes the version clause of
ADR-0002 (decision 1, "16.1.1") and of ADR-0003 (decision 1, "the 16.1.1 tag
plus the carried patches"). Everything else in both ADRs is unchanged: the
headless plugin dirs, `oracle-paths.mjs` as the one source of locations, the
carried build and the fix-forward rules.

## Context

Graphviz 16.1.2 was tagged on 2026-11-20 (`445239ae6`): 90 non-merge commits
since 16.1.1, about 65 of them in `lib/`, `cmd/` and `plugin/`. Most are
refactors (clang-format, scope reduction, `LIST` in place of hand-managed
arrays). Seven changelog fixes land in code the port covers; the triage is in
#295 and its sub-issues #298 to #303.

The one carried patch (upstream !5152, graphviz#2876, #266) is not in 16.1.2.
It applies cleanly to the 16.1.2 tag.

Both 16.1.2 builds were made beside the live 16.1.1 oracle in #296 (PR #304),
so a queue run could keep reading 16.1.1 until this move.

## Decision

1. **The oracle is the 16.1.2 carried build**: the 16.1.2 tag plus
   `test/corpus/oracle-patches/*.patch`, built by
   `test/corpus/build-carried-oracle.sh` in
   `~/git/sseely/graphviz-carried-1612`. Binary
   `~/git/sseely/graphviz-carried-1612/build/cmd/dot/dot`; plugin dirs
   `/tmp/ghl1612-carried` (dot) and `/tmp/ghl1612-carried-all` (other
   engines). Locations live only in `test/corpus/oracle-paths.mjs`
   (`ORACLE_VERSION` is `16.1.2`).
2. **Pristine 16.1.2 is the bisect build** for a suspected patch effect:
   `~/git/graphviz-16.1.2/build/cmd/dot/dot` (branch `oracle/16.1.2`), plugin
   dirs `/tmp/ghl1612` and `/tmp/ghl1612-all`.
3. **The 16.1.1 builds stay on disk** for bisecting a 16.1.1 → 16.1.2 change:
   carried `~/git/sseely/graphviz-carried` (`/tmp/ghl1611-carried`,
   `/tmp/ghl1611-carried-all`) and pristine `~/git/graphviz-16.1.1`
   (`/tmp/ghl1611`, `/tmp/ghl1611-all`). No script defaults to them.
4. **Corpus root** (AD-1). `ORACLE_CORPUS_ROOT` stays derived from the pristine
   build and so becomes `~/git/graphviz-16.1.2/tests`. 16.1.2 changes no
   existing input and adds seven: `2745`, `2760`, `2762`, `2762_1`, `2764`,
   `2764_1` and `2870_3`. They enter `corpus-manifest.json` quarantined with
   reason `pending-input`, so no walk reads them; #298 admits them.
5. **Render skip** (AD-2). In 16.1.2 `dot` no longer renders when layout
   reports an error: it exits 1 with empty output where 16.1.1 exited 1 with a
   document. Whether the port follows is #299, which waits on a maintainer
   ruling. Until then such rows are recorded as measured (an oracle error),
   classified "16.1.2 render skip, pending #299" and listed on #299 and in
   `docs/known-divergences.md`. Nothing in `src/` changes for it.
6. **Registries are committed as measured** (AD-3). A failure 16.1.2 causes is
   listed on its port issue (#300 to #303, or a new `upstream-16.1.2` issue)
   and in a "Pending 16.1.2 ports" section of `docs/known-divergences.md`. It
   does not go into an accepted-divergence registry.
7. **Failure-site inventory and fixtures** (AD-5).
   `test/corpus/failure-sites.json` is regenerated against 16.1.2's C source,
   because 16.1.2's clang-format moved its line anchors. `src/**/__fixtures__`
   captures stay as they are; each port issue re-captures what it touches.
8. **Build facts.** 16.1.2 plugins are `libgvplugin_*.8.0.17.dylib` (16.1.1:
   `8.0.16`). Every build, pristine too, must use flex 2.6.4
   (`-DFLEX_EXECUTABLE=/usr/bin/flex`): Homebrew's flex 2.6.16 makes cgraph
   reject long quoted and HTML strings.

## Consequences

- Every oracle-derived measurement is re-taken against 16.1.2: native timings,
  the dot survey, every format and engine walk, attribution, the oracle-error
  registries and the golden references. `src/` does not change in the move;
  the proof is that the built bundle hashes equal before and after.
- Every result that changes is traced to one of: a 16.1.2 commit and its
  issue, the render skip (#299), or a port commit that landed on main after
  the old registry was written.
- The plugin dirs under `/tmp` can lose `config8` overnight. Check it before a
  native run and regenerate with `test/corpus/gen-headless-gvbindir.sh`.
- Harnesses under `plans/` that relink a plugin hardcode SOVER 8.0.15 or
  8.0.16; a rerun against 16.1.2 needs 8.0.17 in a copy. `plans/` stays as it
  is.
- The local queue files (`.claude/settings.json`, `.claude/queue-policy.md`)
  change only after this move merges (AD-7).

## Rollback

Reversible. Revert the merge: the 16.1.1 registries, references and paths come
back with it. The 16.1.1 builds are still on disk; if their `/tmp` plugin dirs
are gone, rebuild them with `test/corpus/build-carried-oracle.sh` and
`test/corpus/gen-headless-gvbindir.sh` at the reverted revision, where the
live tag is 16.1.1 again.
