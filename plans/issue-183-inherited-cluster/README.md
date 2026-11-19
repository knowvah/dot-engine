# Mission: issue #183: a subgraph inherits the `cluster` graph attribute

## Objective

C's `is_a_cluster` (`~/git/graphviz-16.1.1/lib/common/utils.c`, `is_a_cluster`)
reads `agget(g, "cluster")`. That returns the value the subgraph took from its
parent when it opened. The port's three copies (`isACluster` in
`src/layout/dot/rank.ts:89`, `isCluster` in `src/layout/osage/index.ts:86` and
`src/layout/patchwork/index.ts:307`) read `g.attrs.get('cluster')`. That is
the subgraph's own value only, so an inherited `cluster=true` is ignored and
every engine sees fewer clusters than native.

**Mechanism (checked at planning against base `89708589` and graphviz
16.1.1).** `agmakeattrs` (`lib/cgraph/attr.c:165`) copies every visible
graph-attribute `defval` into a subgraph when it opens. `attrstmt`
(`lib/cgraph/grammar.y:355`) declares an unknown name with `""` through
`bindattrs`. It then sets it through `agattr_text` → `setattr` (`attr.c:265`):

- on the root: an update of the root symbol's `defval`;
- on a subgraph: a new local symbol whose `defval` the subgraph's later
  children copy.

`unviewsubgraphsattr` pins subgraphs that already exist, so a later value
never reaches them. The port's builder already models exactly this as
`graphDefaultsSnapshot`, taken when a subgraph opens
(`src/parser/builder.ts:311`). It then seeds six label keys from the snapshot
into the subgraph's own `attrs` (`GRAPH_LABEL_INHERIT_KEYS`,
`builder.ts:81`). `cluster` is not among them, and nothing else reads it from
the snapshot.

**Fix (AD-1).** Add `cluster` to the seeded keys, renamed
`GRAPH_INHERIT_SEED_KEYS`. The seeded value then reaches all three
`isACluster` copies. It also survives dot's pack projection, which copies
`attrs` but not the snapshot (`src/layout/dot/pack-components.ts:111`, C's
`agcopyattr`). `seededAttrs` keeps it out of `-Tdot`.

**Evidence ([harness/](harness/)).** 13 probes, 8 engines, formats `dot`,
`xdot` and `svg`, with native 16.1.1 captures in `harness/native/`.

- **Base:** fewer clusters than native in every probe under dot, fdp, osage
  and patchwork.
- **Prototype ([harness/prototype.diff](harness/prototype.diff), one line):**
  stderr equals native in 312 of 312 rows, and stdout byte-equals native in
  204 of 208 dot/xdot rows. The other 4 differ on the base too:
  - `num`/fdp: one `bb` last-bit drift, which a plain `cluster_p` shows on the
    base as well (#209's family);
  - `mixed`/sfdp: an sfdp divergence that remains with every cluster removed.
- **Rejected option A ([harness/prototype-a.diff](harness/prototype-a.diff)):**
  it fixes every probe except `pack.gv` under dot, which stays 10 lines off
  (AD-1).

Done means the issue's criterion. Both repros (`r1.gv`, `r2.gv`) equal native
under dot in svg and xdot, on stdout and stderr (svg apart from the
generator-comment and `<svg>` header lines the base already differs on). A
targeted survey of the corpus inputs that set `cluster` as a graph attribute
shows no new difference from native. Type `fix`, a patch release.

**Out of scope:**

- every other graph attribute's inheritance (#242, which generalizes this
  seed list);
- the programmatic API's `addSubgraph`/`agsubg`, which takes no snapshot
  (`src/model/cgraph-ops.ts:116`). T1 comments on #242;
- the `num`/fdp drift (#209) and the `mixed`/sfdp divergence (AD-4).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 89708589..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `897085894c196f76f1712d0248f942bf66bd475d` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-183 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-183/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(parser): inherit the cluster graph attribute as agmakeattrs does

  <two to four lines: cgraph copies every graph attribute in effect into a
  subgraph when it opens, so is_a_cluster sees an inherited cluster=true;
  the builder now seeds cluster with the label keys, which also survives
  dot's pack projection>

  Refs: #183
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-seed-cluster.md#bytediff) | queue rules gate 5 |
| 6 | Targeted survey | see [T1](batch-1/T1-seed-cluster.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR):
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot)
or `/tmp/ghl1611-all` (other engines), as `test/corpus/oracle-paths.mjs` says.
`harness/compare.mjs` imports it. Run `oraclePreflight`
(`test/corpus/oracle-env.ts`) for `dot` and for `fdp` before trusting native
output. A missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue
has no `upstream-16.1.1` label. Check `uptime` before gate 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `89708589`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-seed-cluster.md#write-set)
   must change. Journal why and stop.
2. A probe row whose head stdout is not byte-equal to native, other than the
   four listed in [T1](batch-1/T1-seed-cluster.md) step 4. Write the diagnosis
   artifact and stop.
3. Any row in gate 5 or gate 6 that moves away from native: a line equal to
   native on the base differs on the head. Diagnose and stop.
4. A seeded `cluster` prints in `-Tdot`/`-Txdot` output where native prints
   none, or it changes `-Tjson` output other than toward native.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and layout, and the constant's exact new name, within the
  write-set.
- More probes in `harness/extra/` to settle a path the 13 do not reach.
- An existing test whose expectation encoded the old non-inheritance: update
  it to native's behaviour and journal it, with native's output as evidence.
- A survey row still differing from native for a reason this change does not
  touch (head equals base): link the issue that owns it, or open a
  `follow-up`, and go on.
- Native `SEGVxN` rows (fdp, #182 AD-4): compare head with base only, and
  journal it.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-seed-cluster.md](batch-1/T1-seed-cluster.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the 13 inputs |
| [harness/native/](harness/native/) | native 16.1.1 `-Tdot`/`-Txdot` stdout (and stderr when non-empty) per engine |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per input, engine and format, with byte-equality columns |
| [harness/prototype.diff](harness/prototype.diff) | the chosen prototype (option B), reverted |
| [harness/prototype-a.diff](harness/prototype-a.diff) | the rejected option A, reverted |
| [harness/survey.md](harness/survey.md) | probe design, survey selection, planning results |
| [harness/results/](harness/results/) | planning TSVs |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the inherited value flows |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched and readers |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-183.md` with the cgraph inheritance rules that
  `bindattrs`, `setattr` and `unviewsubgraphsattr` give (novel: not in
  `.agent-notes/` at planning; `issue-230-cluster-ordering-inheritance.md`
  covers only `agmakeattrs`). Also note that dot's pack projection copies
  `attrs` but not the snapshot.
- Comment on #242 (T1 step 7).
- The final message ends with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1, AD-3, AD-4 and AD-5 held as planned. AD-2 holds for
  every subgraph opened once; it does not cover a re-opened subgraph
  (journal row 11, flagged for review). Journal rows 1-15.
- **Gates:** typecheck 0; `npm test` 600 files / 14871 tests; goldens 5/5;
  corpus + docs 2863 tests; smoke bytediff 1960 of 1960 identical; survey 64
  rows, head equal to base in all, no stderr row `same`→`DIFF`.
- **Probes:** 312 rows, equal to the planning run: stderr equal to native in
  312; `dot`/`xdot` byte-equal to native in 204 of 208 (`num`/fdp, #209;
  `mixed`/sfdp, #257); svg 3 header lines off. json equals native through
  `compareJson` in 103 of 104 rows (base: 43).
- **Extra probes** (`harness/extra/`, 13): the eight that open each subgraph
  once equal native in 127 of 128 `dot`/`xdot` rows (#260 owns the one).
- **Known issues / follow-ups:**
  - **#259 (`needs-ruling`):** on an input that re-opens a named subgraph,
    45 probe rows change and 27 of them lose native lines (`reopen1`,
    `reopen3`: a cluster native does not have). The cause is #258 (the
    builder replaces a re-opened subgraph and retakes the snapshot), which
    predates this change. No corpus input re-opens a subgraph (0 of 1320).
  - #257 (sfdp lays out a cycle in another orientation), #258, #260
    (`irrelevant_subgraph` on an anonymous cluster) filed; #242 has the
    comment; #209 and #256 linked.
