# Mission: issue #187: a failed flat-adjacent aux layout fails the layout

## Objective

A flat-adjacent edge group with a port is laid out in a rotated aux graph
(`make_flat_adj_edges`). When that aux layout fails, native 16.1.1 fails the
whole spline pass: `make_flat_edge` returns the aux `rc`, `dot_splines_`
returns it at once, and `dotLayout` skips `dot_compoundEdges` and
`dotneato_postprocess`. The port reads the failure as "declined". It falls
through to other routers, draws a route native never draws, routes every later
edge, and translates the layout. Since #162 (16.1.1: an aux edge longer than
`INT_MAX` fails `dot_position`) an input can reach this path. Probe `p1`:
`digraph { {rank=same; a [height=40000000]; b [height=40000000]} a:s -> b:n }`.

**Mechanism (checked at planning against base `98aa9373` and the carried
16.1.1 oracle).**

- **C:** `make_flat_adj_edges` returns `dot_mincross`'s `r`, `dot_position`'s
  `rc` or the aux `dot_splines_`'s `rc`, and stops right there: no
  postprocess, no copy, no `cleanupCloneGraph`
  (`~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:1211-1240`).
  `make_flat_edge` returns it (`:1535-1536`). `dot_splines_` frees its lists
  and returns it (`:418-424`), before vnode label placement, `edge_normalize`,
  port labels, `State = GVSPLINES` and `EdgeLabelsDone` (`:427-484`).
- **Port:** `makeFlatAdjEdges` (`src/layout/dot/splines-flat.ts:367-371`)
  returns `1` for a failed aux mincross or position and drops
  `dotSplines_(aux.auxg, false)`'s result. `routeFaithfulSidePort`
  (`src/layout/dot/edge-route.ts:376`) turns a non-zero result into `false`
  ("declined"). `routeFlatEdge` (`:404-427`) then tries
  `makeAdjFlatNoPortEdge` and the box-corridor router. `routeLoneEdge`,
  `dispatchEdgeGroup`, `routeEdgeGroups` (`src/layout/dot/splines-groups.ts`)
  and `dotSplines_` (`src/layout/dot/splines.ts:521-524`) carry no result
  code.

**Fix (AD-1..AD-4).** Return codes on C's path. `makeFlatAdjEdges` returns
C's values. The flat routers return `number | null`: `null` means declined
(the port's fall-through), `0` routed, and non-zero is C's `rc`. The rc goes
up through `routeOneEdge`/`routeLoneEdge` (now `number`), `dispatchEdgeGroup`
and `routeEdgeGroups` to `dotSplines_`, which returns it before
`normalizeRunOrigs` and `finalizeSplines`. The callers of `dotSplines`
already handle a non-zero result (the ortho path, `tests/2784.dot`).
[harness/prototype.diff](harness/prototype.diff) is the prototype. It lacks
the tests and the comments, and it breaks the complexity budgets (T1 step 2).

**Evidence at planning ([harness/](harness/)).**

- **Probes** (12 inputs × dot, xdot, svg = 36 rows,
  [results/probes-planning.tsv](harness/results/probes-planning.tsv)). With the
  prototype, every dot and xdot row equals native byte for byte, with three
  exceptions. `p7` dot is #275 (State gating, 1 line missing, 2 extra). `p7`
  xdot has no reference: native segfaults, also #275. `p8` is a control on
  which native prints a warning the port lacks (#276). Every svg row differs
  only by the 3 generator-header lines. stderr equals native's on the 11
  failing probes once the `Edge length` number is masked; the number itself is
  #274. The controls `p2` (main position fails, not aux), `p3` (no failure)
  and `p8` are unchanged (`headEqBase` `yes`).
- **Reach.** The 10 inputs #137's marker survey found reaching
  `makeFlatAdjEdges` (27 calls, all succeed) and #137's 8 labelled fixtures
  give 90 bytediff jobs, base vs prototype: 90 identical. No corpus input
  takes the failure path (#137, `.agent-notes/issue-137.md`).
- `npm test` passes on the prototype with no test edited: 607 files, 15178
  tests.

Done means: the probe TSV on the head equals planning's; the reach bytediff
and the smoke bytediff show 0 diffs; the new tests pin `p1`, `p4`, `p5`, `p9`
and `p10` to native. Type `fix`, a patch release.

**Out of scope:** #274 (the `Edge length` number: `make_edge_pairs`'s `int`
saturation), #275 (`State >= GVSPLINES` gate on edge `pos`, `State`
save/restore around the aux graph, native xdot crash), #276 (the routespl
"reclaim box space" warning). Also out: aux mincross failures. They are
propagated as C does, but no probe reaches them.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 98aa9373..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `98aa9373b36699e54cb5df9398ae7640032fcfd1` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base,
  rebuild the base bundle from it, and journal it.
- Per-task commits while working: first `docs(mission): add issue-187 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-187/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(dot): fail the spline pass when a flat-adjacent aux layout fails

  <two to four lines: make_flat_adj_edges returns the aux mincross,
  position or splines rc and dot_splines_ returns it, so the layout
  fails; the port read it as a decline and fell through to other
  routers; the rc now travels the group loop to dotSplines_>

  Refs: #187
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-flat-adj-rc.md#bytediff) | 0 diffs |
| 6 | Targeted survey | see [T1](batch-1/T1-flat-adj-rc.md#targeted-survey) | reach 90/90 identical; probe TSV equals planning |

Oracle: the carried build (ADR-0003, the newest accepted ADR, which replaces
ADR-0002's pristine clause), from `test/corpus/oracle-paths.mjs`:
`~/git/sseely/graphviz-carried/build/cmd/dot/dot` with
`GVBINDIR=/tmp/ghl1611-carried`. Run
`npx tsx plans/issue-187-flat-adj-rc/harness/preflight.ts` before trusting
native output. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c`, or by `test/corpus/build-carried-oracle.sh`. The
issue has no `upstream-16.1.1` label. Check `uptime` before gates 5 and 6;
above 12, wait.

Baseline at planning: typecheck and `npm test` green on `98aa9373`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-flat-adj-rc.md#write-set)
   must change. Journal why and stop.
2. A probe row that differs from
   [probes-planning.tsv](harness/results/probes-planning.tsv). Write the
   diagnosis artifact and stop.
3. Gate 5 or the reach part of gate 6 shows any diff. Diagnose and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.
6. A criterion looks as if it needs #274, #275 or #276 fixed. That is a brief
   error: journal it and stop.

## Push-forward (decide alone, journal it)

- Test names and layout within the write-set; comment wording.
- Helper extraction and comment trimming to meet the complexity budgets in
  T1 step 2.
- An existing test that pinned the fall-through: update it to native's
  behaviour and journal it, with native's output as evidence. Planning found
  none.
- More probes in `harness/extra/` for a path the 12 do not reach. Compare head
  with native. A row that moves away from native is stop 2.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-flat-adj-rc.md](batch-1/T1-flat-adj-rc.md) | red tests, fix, budgets, gates, squash |
| [harness/survey.md](harness/survey.md) | probe design, reach selection |
| [harness/probes/](harness/probes/) | the 12 inputs |
| [harness/native/](harness/native/) | native `-Kdot -Tdot` stdout, stderr, exit per probe |
| [harness/compare.mjs](harness/compare.mjs) | native, base, head per probe × format |
| [harness/reach-ids.txt](harness/reach-ids.txt), [harness/fixtures/](harness/fixtures/) | gate 6 reach inputs |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/results/](harness/results/) | planning TSV |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the rc path, C and head |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal):
  mechanism, files, gates, toward-native changes.
- Write `.agent-notes/issue-187.md` (novel): the flat routers' `number | null`
  contract; native's post-failure output (untranslated coords, later edges
  unrouted); the probe recipe (huge `height` with `:s`/`:n` ports fails only
  the aux graph). Update `.agent-notes/issue-137.md`'s "a failed aux layout
  does not stop the port's spline pass" to point at this fix.
- The final message ends with the driver's status line.

## Summary (2026-11-21)

- **Tasks:** 1 of 1 (T1).
- **Result:** `makeFlatAdjEdges` returns the aux mincross, position or splines
  rc; the flat routers return `number | null`; the rc travels
  `routeLoneEdge` → `routeFlatGroup` → `dispatchEdgeGroup` →
  `routeEdgeGroups` → `dotSplines_`, which returns it before the post-loop
  steps. `p1`, `p4`, `p5`, `p6`, `p9`..`p12` equal native in dot and xdot.
- **Decisions:** 8 journal rows (3-10). For review: row 9 (#277, a pack-arm
  divergence found by an extra probe; native segfaults on it).
- **Gates:** typecheck 0; `npm test` 608 files, 15191 tests; goldens 5/5;
  corpus + docs 27 files, 2887 tests; smoke bytediff 1960/1960 identical;
  reach 90/90 identical; probe TSV byte-identical to planning.
- **Accepted-row changes:** none. **Toward-native changes:** none on the
  corpus (0 changed outputs). The probes that changed all equal native.
- **Known issues and follow-ups:** #274, #275, #276 (filed at planning), #277
  (filed here). The aux mincross failure and a non-zero aux `dotSplines_`
  are propagated but no input reaches them.
