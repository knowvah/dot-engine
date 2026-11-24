# Mission: issue #196: a labelled cluster or root sets its `_ldraw_` from an empty buffer

## Objective

C's `xdot_end_cluster` sets a cluster's `_ldraw_` whenever the cluster has a
`GD_label`, and `xdot_end_graph` does the same for the render root, even when
this render's label buffer is empty (`plugin/core/gvrender_core_dot.c:285-286`,
`:436-437`). An invisible labelled cluster, or a `"\n"` label, therefore loses
its stored `_ldraw_`: `-Txdot` prints `_ldraw_=""` and `-Tjson` prints none.
The port records `_ldraw_` only from a non-empty buffer
(`src/render/dot.ts:123`, `:308`), so it keeps the input's or an earlier
render's string, and never prints `_ldraw_=""`. The maintainer ruled this a
defect of its own, separate from #140. The full diagnosis, with what was ruled
out, is in [decisions.md](decisions.md#mechanism-plannings-diagnosis).

Planning reproduced it against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **Probe matrix** (14 in-scope probes × dot, fdp, osage × dot, xdot, json,
  svg body; stdout and stderr): base 96/168 equal native, prototype 162/168.
  The 6 left are `-Tdot` rows of two probes, unmoved (#293). The two `oos-*`
  probes still differ, for #292 and #293 (AD-3). `oos-html-empty-label`'s six
  xdot and json rows move one line away from native: the port gives
  `label=<>` a `GD_label` (#292), so the head now clears that cluster's
  stored `_ldraw_` (AD-1 consequences).
- **Gates on the prototype:** typecheck clean; `npm test` 614 files, 15381
  tests; `gates.sh` 5/5; corpus and docs 27 files, 2887 tests.
- **Bytediff:** smoke and the targeted survey, in
  [decision-journal.md](decision-journal.md) rows 2 and 3.

Done means the issue's criterion: the six rows of the issue equal native in
xdot and json, and the open-row lists in `src/render/json-stored-draws.test.ts`
(describe "open rows ... (#196)") are empty. AD-1 does it, and AD-2's tests
pin it. Type `fix`.

**Out of scope:** #292, #293 and #294, filed at planning. See AD-3.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-cluster-ldraw.md](batch-1/T1-cluster-ldraw.md). Check finished
   work with `git log --oneline 77f433ff..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `77f433ff5fc4e01a875b4b384bb8d97e051fd0f8` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the probe matrix on it (T1 step 5), and journal it.
- Per-task commits while working: first `docs(mission): add issue-196 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-196/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(xdot): set a labelled cluster's _ldraw_ from an empty buffer

  <two to four lines: xdot_end_cluster and xdot_end_graph agxset _ldraw_
  whenever GD_label is set, so an invisible cluster or a "\n" label loses
  its stored string and agwrite prints _ldraw_=""; the port recorded only a
  non-empty buffer and kept the stale string>

  Refs: #196
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 614 files, 15381 tests |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1 step 7](batch-1/T1-cluster-ldraw.md#steps) | equals journal row 2 |
| 6 | Targeted survey | [T1 steps 5, 8](batch-1/T1-cluster-ldraw.md#steps) | probe tally as planning's; survey equals journal row 3 |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(fdp, osage). `harness/probe.ts` runs `oraclePreflight` for both, and
`harness/recapture.sh` regenerates a missing `config8`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gate 5, gate 6 and the matrix,
and wait if it is above 12.

Baseline at planning: [decision-journal.md](decision-journal.md) row 0.

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-cluster-ldraw.md#write-set)
   must change, or `dot.ts` must grow past 505 lines or `agwrite.ts` past
   533. Journal why and stop.
2. On the base (T1 step 3), the new tests' failures differ from AD-2's
   consequences. The tests do not reach the defect: journal and stop.
3. The probe matrix (T1 step 5) differs from the planning prototype's in any
   row, or gates 5 and 6 show a diff key planning did not classify, or a job
   capped twice. Diagnose it and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs #292, #293 or #294 fixed (a brief
   error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names and structure inside `cluster-ldraw.test.ts`, provided AD-2's
  checks are all there.
- More probes in `harness/probes/` for a path the matrix does not reach. Run
  them on base and head, and recapture their fixtures. A new non-equal head
  row that is also non-equal on the base, with the same diff, predates this
  mission: file a `follow-up` issue and name it `oos-*`. Any other new row is
  stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-3, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-cluster-ldraw.md](batch-1/T1-cluster-ldraw.md) | fixtures, tests, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe and corpus selection |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the tests' native fixtures; planning's copies |
| [harness/survey-reach-ids.txt](harness/survey-reach-ids.txt), [harness/survey-control-ids.txt](harness/survey-control-ids.txt) | gate 6's bytediff ids |
| [harness/results/](harness/results/) | planning TSV (base and prototype columns) |
| [harness/prototype.diff](harness/prototype.diff) | the prototype with its tests, reverted |
| [diagrams/data-flow.md](diagrams/data-flow.md) | a labelled cluster's `_ldraw_`, render to output |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  origin, fix, files, gates, matrix counts, accepted-row changes and
  toward-native changes (as journal rows 2 and 3 classify them).
- Write `.agent-notes/issue-196.md` (novel). xdot's store rule differs by
  object kind: nodes and edges store only a non-empty buffer, a drawn cluster
  always stores `_draw_`, and a labelled cluster or root always stores
  `_ldraw_`. agwrite skips a subgraph's empty value only when it would inherit
  the root's own empty value (probes; the C's `print` guard cannot be read
  literally), and #294 is the same rule for user attributes. The port's
  `sg.attrs` holds seeded copies of inherited graph values, so a change to a
  subgraph attribute made through the API needs `seededAttrs.delete(key)` to
  act as `agsafeset` does (a local symbol). From planning: the 500-line write
  hook compares against the file's line count at `HEAD`, so `dot.ts` (505)
  and `agwrite.ts` (533) may be edited only without growing.
- On #140, comment that #196's change empties its open-row lists. The issue
  closes when the branch merges.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-23)

- **Tasks:** 1 of 1 (T1), with two amendments to planning's decisions
  ([decisions.md](decisions.md), "Execution amendment" × 2).
- **Decisions:** journal rows 5-11; three flagged for review: row 6 (AD-1's
  serializer rule replaced by write_dict's guard and a ported `print` flag;
  `graph.ts` and `builder.ts` outside the planned write-set), row 8 (#292
  fixed here; `graph-label.ts`), and the probe set growing from 14 to 22.
- **Gates:** typecheck exit 0; `npm test` 614 files, 15415 tests;
  `gates.sh` 5/5; corpus and docs 27 files, 2887 tests; smoke bytediff
  2352/2352 identical; reach 332/336 and control 458/460 identical, 0 diffs,
  the 6 capped jobs TIMEOUT on both bundles as at planning.
- **Probe matrix:** 258 of 264 in-scope rows equal native under dot, fdp,
  osage (base 138), 436 of 440 under the other five engines (base 348); no
  row moves away from native. The rows left are #293's.
- **Follow-ups:** #305 filed (a pinned empty `_ldraw_`); #293 and #294 open
  with comments; #292 fixed here, left open for the maintainer to close.
