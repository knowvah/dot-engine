# Mission: issue #192: attach rank and order on a `phase` stop

## Objective

With `phase=1`, `2` or `3` on the root graph, C's `dotLayout` stops early and
calls `attach_phase_attrs` (`lib/dotgen/dotinit.c:241-256`, called at `:271`,
`:280`, `:291`). It declares the node attributes `rank` and `order` with an
empty default (`agattr_text(g, AGNODE, …, "")`) and writes `ITOS(ND_rank(n))`
on every node, plus `ITOS(ND_order(n))` from phase 2. Phase 3 passes 2.
The port stops at the same points (`src/layout/dot/index.ts:262-268`) but
attaches nothing, so `-Tdot`, `-Txdot` and `-Tjson` lose those attributes.

Planning prototyped the fix
([harness/prototype.diff](harness/prototype.diff), reverted):

- Native (carried 16.1.1) vs port, 14 probes x 4 formats: base 17/56 equal,
  prototype **56/56** ([harness/survey.md](harness/survey.md)).
- `npm run typecheck` exit 0; `npm test` 610 files, 15203 passed, with no
  test edited.
- No corpus input sets `phase`, so no corpus output can change. The smoke
  bytediff was not run at planning because load was 28; it is predicted
  identical.

Done means: `attachPhaseAttrs` is ported into `dotLayoutPipeline`; a new
test pins native's outputs; the probe run gives `# same 56, diff 0`; gates
pass. Type `fix`.

**Out of scope:** the pack arm, which ignores `phase` entirely (#281, filed at
planning). Fill nodes on a newrank relayout (#282, filed at planning: no
native reference, because native segfaults).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session; they win over this brief.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 9fdfe503..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch; never merge `main` into it.
- **Base sha:** `9fdfe503` (the tip at planning). If the tip moved, use the
  tip at execution start and journal it.
- Per-task commits: first `docs(mission): add issue-192 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish:** `git tag issue-192/pre-squash`, `git reset --soft <base>`, one
  commit:

  ```
  fix(dot): attach rank and order node attributes on a phase stop

  <two to four lines: C's dotLayout calls attach_phase_attrs at the
  phase 1-3 stops; the port stopped there but wrote nothing, so dot, xdot
  and json lost rank and order; a root node default is reset to "">

  Refs: #192
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never
  push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1](batch-1/T1-phase-attrs.md#bytediff) | identical on every id |
| 6 | Targeted survey | [T1](batch-1/T1-phase-attrs.md#targeted-survey) | probes `# same 56, diff 0` |

Oracle: the carried build (ADR-0003), from `test/corpus/oracle-paths.mjs`:
`~/git/sseely/graphviz-carried/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611-carried`. No `upstream-16.1.1` label. Native output is
captured in `harness/native/`. Re-capture with `harness/capture-native.sh`
only to re-check it. Check `uptime` before gates 5 and 6; above 12, wait.

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-phase-attrs.md#write-set)
   must change. Journal why and stop.
2. Gate 5 shows any changed output. No smoke id sets `phase`, so a change
   means the attach runs where it should not. Diagnose and stop.
3. The probe run differs from `# same 56, diff 0`, or the new test's
   expected text disagrees with `harness/native/`. Diagnose and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose to
   a mechanism, journal it, stop.
5. An architecture decision in [decisions.md](decisions.md) proves wrong.

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names and the helper layout in the new test file.
- More probes: add the `.gv` file, re-run `capture-native.sh` and
  `run-probes.sh`, and update the expected count in the journal.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-phase-attrs.md](batch-1/T1-phase-attrs.md) | test, change, gates, squash |
| [harness/survey.md](harness/survey.md) | C semantics, probe table, reach rule, segfault case |
| [harness/probes/](harness/probes/), [harness/native/](harness/native/) | 14 probes; native dot/xdot/json/plain |
| [harness/capture-native.sh](harness/capture-native.sh), [harness/run-probes.sh](harness/run-probes.sh) | native capture; port-vs-native runner |
| [harness/port-render.ts](harness/port-render.ts), [harness/json-diff.ts](harness/json-diff.ts) | port twin; semantic json comparison |
| [harness/prototype.diff](harness/prototype.diff) | the change, reverted |
| [harness/results/](harness/results/) | probe TSVs and outputs, base and prototype |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md`: mechanism, files, gates,
  accepted-row and toward-native changes (expected: none on the corpus).
- `.agent-notes/issue-192.md` (novel): `agattr` on the root resets an
  existing root default and keeps it printed (`node [order=""]`), while a
  subgraph's local default is untouched. Native segfaults on a newrank
  phase stop that leaves fill nodes (#282).
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-21)

- Tasks: 1 of 1 done (T1).
- Decisions: journal rows 3-9; one push-forward (row 5: 26 probes added, so
  the probe count is 160, not 56). None flagged for review.
- Gates: typecheck exit 0; `npm test` 611 files / 15211 tests; goldens 5/5;
  corpus + docs 27 files / 2887 tests; smoke bytediff 1960/1960 identical,
  0 capped; probes `# same 160, diff 0`.
- Follow-ups: #281 (pack arm ignores `phase`) and #282 (newrank fill nodes,
  native segfaults), both filed at planning. Nothing new.
