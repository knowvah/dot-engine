<!-- SPDX-License-Identifier: EPL-2.0 -->

# ADR-0002: Re-pin the oracle to graphviz 16.1.1

## Status

Accepted 2026-11-14 (issue #147, re-baseline mission
`plans/graphviz-16-1-1-rebaseline/`; tracking issue #166). Supersedes
ADR-0001's decision 1; ADR-0001's decisions 2–5 and its cache and preflight
rules carry over unchanged.

Version clause superseded by ADR-0004 (graphviz 16.1.2).

## Context

The oracle is graphviz 16.1.0 (ADR-0001). Graphviz 16.1.1 was released on
2026-11-08: 582 commits, about 290 in code the port covers. Most are refactors
(clang-format, container APIs, scope, `CHKRV` inlining). Three read-only
triages of every in-scope commit found about 20 observable changes, filed as
#149–#165. The ones with the widest reach:

- `lib/cgraph/write.c:write_body` writes a body's edges after its nodes, in
  creation order, and never re-declares an edge in a sibling subgraph
  (#149; upstream 2193, 2855). Every `-Tdot`, `-Txdot` and `-Tcanon` render
  with edges can change.
- neato's Laplacian and conjugate gradient run in double precision (#156).
- `flat_reorder` skips a rank whose incoming flat edges are constrained
  (#158; upstream 2368, 2854).
- Native crashes, overruns and hangs fixed in dot routing, positioning and
  ortho (#150, #151, #160–#162; upstream 2756, 2759, 2765, 2773–2781, 2783),
  and the ortho permutation now draws from libc `rand()` (#164).

Several fixed crashes are corpus inputs that are oracle errors or quarantined
at 16.1.0 (`2778`, `2854_1`, `2855`; `2854` quarantined `perf`), so the
survey's oracle-error count and the quarantine move with the pin.

## Decision

1. **Oracle = graphviz 16.1.1.** `~/git/graphviz` local branch
   `oracle/16.1.1` (`45244c1d0`), checked out in its own worktree
   `~/git/graphviz-16.1.1`: tag 16.1.1 (`b2a4eced3`) plus the env-gated
   `GVTS_POS_DUMP` instrumentation from `oracle/16.1.0`, committed as a merge
   whose second parent is the release commit `ce75a862a`, so `gen_version.py`
   reports a stable `16.1.1`. Never pushed. Binary
   `~/git/graphviz-16.1.1/build/cmd/dot/dot`; headless plugin dir
   `/tmp/ghl1611` (core + `dot_layout`, decision 2 of ADR-0001) and
   `/tmp/ghl1611-all` (adds `neato_layout`). Both are built by
   `test/corpus/gen-headless-gvbindir.sh` (`sh … [outDir]` for the dot-only
   dir, `sh … all [outDir]` for the all-engines dir); non-dot walks and
   `gen-xdot-refs.ts` default to the all-engines dir.
2. **Build.** Release, `-DWITH_POPPLER=OFF`, Homebrew `bison` and `flex`
   (`-DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison`,
   `-DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex`): 16.1.1 requires
   bison ≥ 3.0 and macOS ships 2.3. Plugins are `8.0.16`.
3. **One place for the oracle location.** `test/corpus/oracle-paths.mjs`
   holds the version, binary and plugin dirs; every script takes its default
   from it (env overrides still win), and a fitness test forbids hardcoded
   defaults elsewhere. The headless-dir generator script mirrors its values.
4. **Three oracles during the move.** 16.1.0 stays at `~/git/graphviz`
   (`oracle/16.1.0`, `/tmp/ghl`) until the re-baseline lands, so any 16.1.1
   delta can be bisected; 15.x stays as in ADR-0001.
5. **ortho `rand()`.** The port emulates macOS libc `rand()` for ortho's
   permutation, as it already does for sfdp and neato (`src/common/crand.ts`),
   not a fixed-seed `drand48` (#164, maintainer decision 2026-11-09).
6. **Order of work.** Re-baseline first (survey, quarantine, timings, golden
   and mission harness refs, `docs/known-divergences.md`), recording each
   16.1.1-caused failure against its issue; then port #149–#165, each closing
   its failures. A gate regression explained by a filed 16.1.1 change is not a
   port regression.
7. **Unit-test fixtures stay at 16.1.0.** The native captures under
   `src/**/__fixtures__` (10 `regen.sh` scripts, about 375 files stamped
   16.1.0) pin the unchanged port's behaviour and still pass. Each port issue
   re-captures the fixtures it touches against 16.1.1.

## Alternatives

- **Stay on 16.1.0:** rejected. Consumers run current graphviz, and 16.1.1
  fixes crashes on inputs the corpus already holds.
- **Port the changes before moving the oracle:** rejected. Without a 16.1.1
  reference no change can be verified, and a change ported against 16.1.0
  shows as a regression.
- **Keep `drand48` in ortho and record a divergence:** rejected (decision 5).

## Consequences

- References, goldens, registries and native timings are re-baselined against
  16.1.1; the oracle-error count and quarantine change.
- `-Tdot`/`-Txdot`/`-Tcanon` byte output changes for most graphs with edges
  once #149 lands.
- The oracle depends on a third local, unpushed branch per machine.
- Native harness scripts that rewrite plugin link lines take the plugin
  version as a parameter (`8.0.15` → `8.0.16`).
- The corpus root moved with the oracle (#148): every corpus script defaults
  to the oracle checkout's `tests/` through `ORACLE_CORPUS_ROOT` in
  `oracle-paths.mjs`, so inputs and reference come from one version.

## Rollback

Point `DOT_BIN` / `GVBINDIR` (or `oracle-paths.mjs`) back at
`~/git/graphviz/build/cmd/dot/dot` and `/tmp/ghl`, set the version to
`16.1.0`, and revert the re-baseline commits; ADR-0001 applies again.
