# Mission: issue #170: aux mincross order with a node `ordering` on labelled flat-adjacent port edges

## Objective

A node `ordering` on an end of a labelled flat-adjacent port-edge group lays the
two edge labels out in the wrong order. Four probes reproduce it on the base
([harness/probes/](harness/probes/)): the issue's three inputs plus #169's
node-default probe. Native output is in [harness/native/](harness/native/).

**First divergent value (measured at planning, base `6676b85c`).** The aux graph's
mincross starts at different crossing counts. Native `dot -v` prints
`mincross: pass 0 iter 0 ... cur_cross 4` for `auxg`; the port's trace hook prints
`cur_cross 2`. Neither side changes the count afterwards, on all four probes. That
first count is taken after `build_ranks` (with its closing `transpose`),
`flat_breakcycles` and `flat_reorder` of pass 0. So the split happens in one of
those three steps or in `ncross` itself, not in a later mincross iteration. (Run
`npx tsx harness/trajectory.mts <probe>` and compare its output with
`harness/native/<probe>.trajectory`.)

**Why reading the code was not enough.** `constraining_flat_edge`,
`inside_cluster`, `is_a_normal_node_of`, `is_a_vnode_of_an_edge_of`, `postorder`
and `flat_reorder` match the C line for line (checked at planning). Both sides add
the same FLATORDER edges, x→y and then y→hvye (issue #170, #169's journal). With
both edges constraining and `GD_flip(auxg)` set, `flat_reorder` gives the port's
order, `[hvye, y, x]`. Native's final `[hvye, x, y]` breaks the x→y constraint. So
one of the port's inputs to that step differs from native's, and only a native
trace can show which.

Done means (the issue's own criterion): the mechanism is stated as a diagnosis
artifact, and all four probes equal native in `-Tdot`, `-Txdot` and `-Tplain`
(three from the issue, plus `node-default-out.gv`, see AD-3). Tests pin that, and
every gate is green. Type `fix`, a patch release.

**Out of scope:** #172 (the group's creation order against `edgecmp` order) and
#187/#188, unless T1 proves #170 is the same mechanism (then see the stop
conditions). Main-graph mincross: seven main-graph inputs of the same shape equal
native (the issue).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 6676b85c..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `6676b85c05a905e3ce1294b66dbc2229f66d15a1` (the tip at planning).
  If the tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-170 brief`
  (this directory), then `docs(T1): ...` and `fix(T2): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T2's last step):** `git tag issue-170/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(dot): <what the aux mincross now does, as the C does it>

  <mechanism in two to four lines: the C statement, what the port did
  instead, and why the label order followed>

  Refs: #170
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
| 5 | Smoke bytediff | see [T2](batch-1/T2-fix.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T2](batch-1/T2-fix.md#targeted-survey) | no id moves away from native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0) with `GVBINDIR=/tmp/ghl`. Run `oraclePreflight`
(`test/corpus/oracle-env.ts:124`) for `dot` before trusting native output. A
missing `config8` is fixed with
`GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -c`. Never use
`/tmp/ghl1611*` (the 16.1.1 build). The issue has no `upstream-16.1.1` label.
Check `uptime` before gate 6 and before the native build. Above 12, wait.

Baseline at planning: typecheck and `npm test` green on `6676b85c` (see
[decisions.md](decisions.md#baseline)).

## Stop conditions

1. T1's origin is in a file outside T2's write-set. Journal the full artifact,
   comment it on #170, and stop: the write-set was planned on the evidence above.
2. T1 cannot produce the artifact after tracing every step that the first-count
   window names (build_ranks, its transpose, flat_breakcycles, flat_reorder,
   ncross) on both sides. Journal what is ruled out and the next trace, and stop.
   A spent edit budget is not a diagnosis (`rules/diagnosis.md`).
3. The mechanism is a native behaviour the port cannot express without a design
   choice the C does not make (for example C reading freed or uninitialised
   memory). That is a new divergence class, which needs a maintainer ruling. Open
   `needs-ruling` with the evidence and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
5. Gate 5 or gate 6 shows a changed output that is not equal to native and
   matches neither of the queue rules' two exceptions. Halt with the row.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Trace placement, format and the env-var name in the instrumented native copy
  and in the `$TMPDIR` port copy. Neither goes into the worktree.
- Test names, file placement and wording within T2's write-set.
- A divergence found on the way that this fix does not cause: open a `follow-up`
  issue, per the queue rules.
- If the fix also makes #172's B2 input or #187's case equal native, say so in a
  comment on that issue. Do not close it.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 then T2 |
| [batch-1/T1-diagnose.md](batch-1/T1-diagnose.md) | native and port traces, the artifact |
| [batch-1/T2-fix.md](batch-1/T2-fix.md) | red tests, fix, gates, squash |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per probe and format |
| [harness/trajectory.mts](harness/trajectory.mts) | the port's mincross trajectory, in `dot -v` format |
| [harness/probes/](harness/probes/) | the four inputs |
| [harness/native/](harness/native/) | native 16.1.0 `-Tplain`, `-Txdot`, stderr, `-v` trajectory |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the aux mincross window |
| [diagrams/component-map.md](diagrams/component-map.md) | candidate components |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-170.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-11)

- **Tasks:** 2 of 2 (T1, T2), one session.
- **Mechanism:** #170 is #172. C clones the aux edges of a flat-adjacent group in
  the `edgecmp` order of the dispatch run (`dotsplines.c:1180-1186`); the port
  re-sorted the group into creation order (`edge-route.ts:349` on the base).
  `do_ordering_node` chains auxt's out-edges by that order, so the two label
  vnodes were fixed the other way round. Full artifact: the `diagnosis` row.
- **Decisions:** 22 journal rows; six flagged for review: #170 and #172 are one
  defect; the fix is outside the planned write-set (launch prompt over stop
  condition 1); seven signatures carry the run; 62 non-corpus `rankdir=LR` rows
  differ on more lines until #173 lands; 16 capped ids covered by a static
  argument; gate 6 run with `uptime` above 12.
- **Gates:** typecheck 0; `npm test` 572 files, 13506 tests; golden gates 5/5;
  corpus + docs 24 files, 2844 tests; smoke bytediff 1960 of 1960 identical;
  targeted survey 11 corpus ids, 0 lines from native on base and head.
- **Deviations from the brief:** the origin is in `edge-route.ts`, with
  `splines-groups.ts` passing the run (neither was planned); the test file also
  pins #172's three inputs and the aux clone order; a 480-input probe matrix was
  added to gate 6's evidence.
- **Known issues / follow-ups:** #215 (same re-sort in the non-adjacent flat
  collector, new). #173 now shows on `rankdir=LR` groups with two labelled port
  edges whichever order they are written in. #172 commented, not closed.
