# Mission: issue #161: handle virtual nodes with no out edge as graphviz 16.1.1 does

## Objective

Graphviz 16.1.1 (upstream #2765, invalid ports under `concentrate`) guards five
reads of `ND_out(v).list[0]` on a virtual node with no out edge:
`make_regular_edge`'s loop body (`4f9ef1d9e`) and its `straight_path` result
(`a79e42588`), `recover_slack` (`f3da7c569`), `cl_bound` (`f8e3f2100`) and
`straight_len` (`5649d079c`). The port never crashed there. It declines a chain
that ends at such a node before routing it, so `2765`/`2765_1` already draw as
native does (#148). But it skips what 16.1.1 does at that dead end: route to the
node, resize it with `recover_slack`, and drop the edge. It also has 16.1.0's
`cl_bound` and a `straight_len` that leans on a list sentinel.

Done means:

- AD-1: 16.1.1's dead-end close ported into the shared chain walker, with the
  three segment builders accepting a dead end.
  ([AD-1](decisions.md#ad-1-port-1611s-dead-end-close-in-the-shared-chain-walker))
- AD-2: the `straightLen`, `clBound` and `recoverSlack` guards ported in place.
  ([AD-2](decisions.md#ad-2-the-three-function-local-guards-in-place))
- AD-3: each with a red-first test, and `2765`/`2765_1` `-Tplain` pinned to
  native.
  ([AD-3](decisions.md#ad-3-tdd-the-red-tests-and-one-corpus-pin))
- T2: gates green; the smoke bytediff is unchanged; the survey equals the
  planning table, with stderr unchanged
  ([AD-4](decisions.md#ad-4-how-equals-native-is-judged)).

Type `fix`, a patch release.

**Out of scope** ([AD-5](decisions.md#ad-5-scope)): #216 (the missing `port …
unrecognized` warnings), #187, #188, `cl_bound`'s unguarded `adj` branch,
concentration's stale `to_virt`, and corpus records and the ledger.

## Evidence (measured at planning, base `c55b4c66`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1 + AD-2). Native = 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8` present).

- **Native reach** (instrumented plugin, [harness/build-native.sh](harness/build-native.sh)
  + [detector-native.patch](harness/detector-native.patch), run by
  [detector-native.sh](harness/detector-native.sh) over all 982 applicable ids,
  `-Kdot -Tplain`, 60 s cap): markers on `2765` and `2765_1` only, each
  firing all five guards once (`P161SL`, `P161MRE out0`, `P161CLB`,
  `P161RS b`, `P161MRE null`) ([harness/detector-hits.txt](harness/detector-hits.txt)).
- **Port reach** (cf + markers, [harness/detector.sh](harness/detector.sh) +
  [detector.patch](harness/detector.patch), same ids and cap): the same two ids
  and nothing else. No chain is still declined for another reason, and no back
  edge or entry run meets a dead end (no `P161BK`, `P161ER`, `incomplete-notdead`
  line). 11 big inputs (0.24-16 MB) never finished on one side or both, even at
  a 300 s re-run. None has `concentrate`, which is what orphans the vnode, and
  none is a smoke id. Native exits 1 on 38 ids (including smoke `1328`, `1581`)
  before splines, and the port detector covers those
  ([harness/detector-nonzero.txt](harness/detector-nonzero.txt)).
- **Same work on `2765`:** on both ids the cf prints the native marker set
  (`straight_len` on the orphan, the dead-end close, `cl_bound` taken as NORMAL,
  `recover_slack`'s second exit, the edge dropped). Its discarded route and the
  resized orphan equal native's bit for bit
  ([harness/dead-end-values.txt](harness/dead-end-values.txt)).
- **Output** ([harness/planning-survey.txt](harness/planning-survey.txt)): on both ids the
  cf leaves svg, xdot, plain, json and cmapx byte-identical to the base. All but
  json equal native; json differs by native's root `"name": "%1"` (#185). Stderr
  is identical between the base and the cf.
- **Smoke reach:** none of the 49 smoke ids hits a marker in either detector, so
  gate 5 expects 0 changed jobs.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline c55b4c66..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `c55b4c66` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-161 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-161/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): handle virtual nodes with no out edge as graphviz 16.1.1 does

  Graphviz 16.1.1 stops at a virtual node with no out edge in straight_len,
  cl_bound and recover_slack, and make_regular_edge routes a chain that
  ends at one, then drops the edge (upstream 5649d079c, f8e3f2100,
  f3da7c569, 4f9ef1d9e, a79e42588). The port declined such a chain before
  routing it; route it to the dead end, recover the slack and drop it, and
  port the three guards. 2765 and 2765_1 still render as native does.

  Refs: #161
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; expected-fail count as the baseline |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | 0 changed jobs |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | equals the planning table; stderr unchanged |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output; if `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before native renders; wait
while the load is above 12.

## Baseline (Phase 8)

Measured at planning on `c55b4c66` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 582 files, 13743 passed, 4 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

Oracle preflight: `/tmp/ghl1611/config8` present; the 16.1.1 binary rendered
`2765`/`2765_1` (exit 0) this session. Gate 2's expected-fail count stays 4: no
known-failing entry covers `2765`.

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red test passes on the base (the case does not reach the guard it
   claims to), or the dead-end test cannot reproduce native's orphan values.
   Rebuild the test; if it can't be built, stop with the mechanism.
4. `2765`/`2765_1` output on the head differs from the base, or their stderr
   changes.
5. A smoke job changes, or a survey line differs from the planning table, and
   it does not equal native.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and file placement (`edge-route-faithful.test.ts` versus a new
  `.branch.test.ts`); how the dead-end test reaches the orphan.
- Whether `straightNext` goes (only if nothing else references it) and the name
  of `isChainDeadEnd`.
- Wording of doc comments and fixture provenance comments.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | background, AD-1..AD-5, rollback, readiness |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-no-out-edge-guards.md](batch-1/T1-no-out-edge-guards.md) | port the guards |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, comments, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 + AD-2 as planned |
| [harness/build-native.sh](harness/build-native.sh), [detector-native.patch](harness/detector-native.patch), [detector-native.sh](harness/detector-native.sh) | native reach |
| [harness/detector.sh](harness/detector.sh), [detector.patch](harness/detector.patch) | port reach |
| [harness/detector-hits.txt](harness/detector-hits.txt), [detector-nonzero.txt](harness/detector-nonzero.txt) | both planning runs |
| [harness/dead-end-values.txt](harness/dead-end-values.txt) | native vs cf at the dead end |
| [harness/native-compare.sh](harness/native-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per job (from #160, unchanged) |
| [harness/survey-ids.txt](harness/survey-ids.txt), [planning-survey.txt](harness/planning-survey.txt) | gate 6 ids and the planning result |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-161.md` if novel.
- Comments on #161 and #148.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `c55b4c66` (the tip at execution
  start); per-task history under tag `issue-161/pre-squash`.
- **Decisions:** AD-1..AD-5 held. Journalled judgment calls: `routeBackEdge`
  accepts a dead end at any chain length, where the counterfactual kept
  `segs.length < 2` (C has no such test; variants E and F take the dead-end
  close in native); `entryRunSegments` tests the out list's size; the edge
  views moved to a new `edge-route-chain-views.ts` because
  `edge-route-chain.ts` was at the 500-line limit; a shared
  `test/helpers/dot-position.ts`; the 2765 test expects `lost` on the merged
  `:Target` edge only (nothing collects the other, in C or the port).
- **Gates:** typecheck exit 0; `npm test` 585 files, 13758 passed, 4 expected
  fail; goldens 5/5; corpus + docs 25 files, 2863 passed; smoke bytediff 1960
  jobs, 0 changed; targeted survey equals the planning table line for line and
  stderr is unchanged ([harness/execution-survey.txt](harness/execution-survey.txt)).
  The port detector re-run on the head over all 982 applicable ids hits
  `2765` and `2765_1` only ([harness/head-detector-hits.txt](harness/head-detector-hits.txt)).
- **Accepted-row changes:** none. **Toward-native changes:** none (no smoke or
  survey job changed).
- **Dead-end values:** on `2765`/`2765_1` the head's discarded route and the
  resized orphan equal native's (`x = 5.3425925925925908`,
  `lw = rw = 3.3425925925925908`); the same holds on three hand-made variants,
  two of them back edges ([harness/head-dead-end-values.txt](harness/head-dead-end-values.txt)).
- **For review:** nothing needs a ruling.
- **Follow-ups:** #234 (a variant of 2765_1 with two more `:Target` edges
  routes two edges off native, on the base and the head alike; not diagnosed).
  For the maintainer's survey: no id changes verdict.
