# Mission: issue #242: subgraphs inherit only seven root graph attributes

## Objective

`digraph G { ordering=out; subgraph cluster_a { r -> c0; r -> c1; r -> c2 } s -> o0; … }`:
native 16.1.1 gives `cluster_a` the root's `ordering=out`, so dot holds the
out-edge order inside the cluster. The port's cluster reads `ordering` as
`""`, and `-Tplain` is 26 lines off native (`c0`, `c1`, `c2`, `o0`, `o1` at
other x). The gap is general: the port inherits only the label family and
`cluster` (#183).

**Mechanism (checked at planning against base `27110d7d` and graphviz
16.1.1).**

- **C:** `agmakeattrs` (`lib/cgraph/attr.c:165`) copies every graph attribute
  value in effect in the parent into a subgraph's record when it opens; every
  `agget(subg, …)` reads that copy. A value the parent sets later never
  reaches it (`unviewsubgraphsattr` pins the old one).
- **Port:** `processSubgraph` takes the same open-time snapshot
  (`src/parser/builder.ts:310`) but copies only `GRAPH_INHERIT_SEED_KEYS`
  (`:88`, loop `:323-329`) into `attrs`. `agGraphAttr`
  (`src/model/cgraph-ops.ts:191`) and the direct `attrs.get` reads see
  nothing else: `orderedEdges` on `cluster_a` adds no flat edges, `left2right`
  is 0 where native's is 1, and `reorder` swaps nodes native keeps.
  The issue's instrumented-16.1.1 traces on `1472` locate the first
  divergence there.

**Fix (AD-1, AD-2).** Seed every snapshot key the body did not set, marked in
`seededAttrs`. Writers that take a subgraph's `attrs` as local skip seeded
keys: `echoGraphAttr` (`src/render/dot/attrs.ts:406`) and json's cluster
correlation (`src/render/json.ts:280`, through a new `localGraphAttrs` in
`cgraph-ops.ts`). [harness/prototype.diff](harness/prototype.diff) is the
prototype (json part inline; T1 moves it to the helper).

**Evidence at planning ([harness/](harness/)).**

- **Probes** (9 inputs × 8 engines × dot, xdot, svg = 216 rows,
  [results/probes-planning.tsv](harness/results/probes-planning.tsv)): every
  dot and xdot row equals native on the prototype except `rankset` and
  `reopen` under sfdp, which are unchanged from the base (#257's family);
  every svg row is on the 3-line header floor or unchanged. Moved rows:
  `repro`, `nested`, `rankset` under dot, all to native. No row moves away.
- **Reach** ([results/reach-planning.txt](harness/results/reach-planning.txt)):
  the parsed model differs for 227 of 982 applicable manifest ids.
- **Reach bytediff** ([results/reach-bd-planning.txt](harness/results/reach-bd-planning.txt)):
  225 ids × 8 engines × 5 formats = 9000 jobs, 8952 identical, 40 capped on
  both sides, 8 diffs: `2242` under fdp equals native (plain, xdot, dot; json
  by `compare-json`); `1472` under dot moves toward native, and its UTF-8
  control equals native, so its remainder is #207
  ([results/moved-planning.tsv](harness/results/moved-planning.tsv)). `2475_1`
  and `2475_2` run at execution (an analogue is 40 of 40 identical).
- **Smoke:** no smoke id is in the diff set; gate 5 expects 0 diffs.
- **Writers:** without AD-2, 19 json tests fail and `refed-bb` is 2 lines off
  native in dot and xdot ([decision-journal.md](decision-journal.md) rows 1, 4).
- `npm test` passes on the prototype with no test edited (603 files, 15079
  tests).

Done means: the repro and `rankset` equal native; the probe TSV equals
planning's; every output the reach bytediff changes equals native or moves
toward it; gates 1-6 pass. Type `fix`, a patch release.

**Out of scope:** the programmatic `agsubg` (AD-4, a follow-up issue); the
redundant snapshot fallbacks (AD-3); the non-empty pin line (#262); sfdp on
cyclic inputs (#257); `1472`'s remaining width difference (#207).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 27110d7d..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `27110d7d532f7b00e73657cfd67fe2ae3f853b64` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, rebuild the base bundle from it, re-run `manifest-reach.mjs` and the
  reach bytediff against the new base, and journal it.
- Per-task commits while working: first `docs(mission): add issue-242 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-242/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(parser): inherit every graph attribute as agmakeattrs does

  <two to four lines: agmakeattrs copies every parent graph attribute
  into a new subgraph; the builder copied seven, so a cluster under a
  root ordering=out read "" and dot reordered it; writers now skip the
  seeded keys, which have no local symbol in C>

  Refs: #242
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-seed-inherited-attrs.md#bytediff) | diffs as [survey.md](harness/survey.md#smoke-expectation), each judged |
| 6 | Targeted survey | see [T1](batch-1/T1-seed-inherited-attrs.md#targeted-survey) | reach 227; reach diffs as planning, each equal to or toward native; probe TSV as planning |

Oracle (ADR-0002, the newest accepted ADR):
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot)
or `/tmp/ghl1611-all` (other engines), as `test/corpus/oracle-paths.mjs` says.
Run `npx tsx plans/issue-242-graph-attr-inheritance/harness/preflight.ts`
before trusting native output. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `27110d7d`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-seed-inherited-attrs.md#write-set)
   must change (for example a fourth writer that copies seeded keys and
   changes an output). Journal why and stop.
2. A probe row that differs from
   [probes-planning.tsv](harness/results/probes-planning.tsv). Write the
   diagnosis artifact and stop.
3. Gate 5 shows any diff, or gate 6 fails a pass rule in
   [T1's targeted survey](batch-1/T1-seed-inherited-attrs.md#targeted-survey)
   (a diff outside planning's 8 keys, a moved row off `moved-planning.tsv`,
   any change away from native). Diagnose and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.
6. `json.ts` would have to grow, or `builder.ts`/`attrs.ts` cross the
   complexity hook: journal and stop (the brief's line budget is wrong).

## Push-forward (decide alone, journal it)

- Test names and layout within the write-set; comment wording.
- An existing test that pinned a non-native inherited value: update it to
  native's output, with native's bytes as evidence.
- More probes in `harness/extra/` for a path the 9 do not reach (compare
  head with native; a row away from native is stop 2).
- A reach diff that equals native on head but also on base under a
  different engine or format: judge it by the queue rules and list it.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-seed-inherited-attrs.md](batch-1/T1-seed-inherited-attrs.md) | red tests, fix, gates, squash |
| [harness/survey.md](harness/survey.md) | probe design, reach selection, smoke expectation |
| [harness/probes/](harness/probes/) | the 9 inputs |
| [harness/native/](harness/native/) | native 16.1.1 output for the repro |
| [harness/compare.mjs](harness/compare.mjs) | native, base, head per probe × engine × format |
| [harness/manifest-reach.mjs](harness/manifest-reach.mjs) | manifest ids whose parsed model differs |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/results/](harness/results/) | planning TSVs and lists |
| [diagrams/data-flow.md](diagrams/data-flow.md) | a root `ordering` reaching a cluster |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates, toward-native changes.
- Write `.agent-notes/issue-242.md` (novel): every inherited graph attribute
  is seeded; writers that copy local attributes must skip `seededAttrs`; the
  json re-parse seeds too; the four redundant snapshot fallbacks (AD-3).
  Update `.agent-notes/issue-183.md`'s first observation's impact line to
  point at this fix.
- File the AD-4 follow-up (programmatic `agsubg` inherits nothing) with label
  `follow-up`, unless `gh issue list --search agsubg` finds one.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-18)

- **Tasks:** 1 of 1 (T1). One executor, no subagents.
- **Change:** `processSubgraph` seeds every key of the open-time snapshot; the
  snapshot is the value of the nearest local symbol up the parent chain
  (declarations and `unviewsubgraphsattr` pins, `src/parser/graph-attr-syms.ts`,
  `Graph.pinnedAttrs`); `echoGraphAttr` and json's cluster correlation skip
  seeded keys (`localGraphAttrs`).
- **Beyond the brief** (journal rows 10, 11, 17): the snapshot rule (extra probe
  `x01` regressed with the brief's fix alone), one new source file, the heavy
  inputs run with caps that fit their recorded times.
- **Gates:** typecheck 0; `npm test` 604 files / 15106; goldens 5/5; corpus +
  docs 25 files / 2863; smoke bytediff 1960 identical, 0 diffs; reach 227 as
  planning; reach bytediff 9000 jobs, 8 diffs and 40 capped, keys as planning;
  probes TSV and moved TSV identical to planning's; heavy inputs 0 diffs.
- **Decisions:** 14 journal rows at execution (6-19); for review: 10, 11
  (scope), 15 (`1472|dot`, #265), 17 (heavy inputs).
- **Issues filed:** #264 (`follow-up`, programmatic `agsubg`), #265
  (`needs-ruling`, `1472|dot` judged by its UTF-8 control).
- **Open and unchanged:** #262 (non-empty pin line; `pinnedAttrs` now holds
  what it needs), #257 (sfdp on cyclic inputs), #207 (`1472` widths).
