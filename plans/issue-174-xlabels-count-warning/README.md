# Mission: issue #174: print addXLabels' "exterior labels positioned" warning

## Objective

When `addXLabels` cannot place every exterior label, C warns how many it
placed. The port places the same labels and prints nothing. Only stderr
differs; the drawing already equals native on the probes.

**Mechanism (stated in the issue, checked at planning against base `6f593c50`
and graphviz 16.1.1).** `~/git/graphviz-16.1.1/lib/common/postproc.c:569-587`:

```c
xlp = lbls;
size_t cnt = 0;
for (size_t i = 0; i < n_lbls; i++) {
    if (xlp->set) { cnt++; ... updateBB (gp, lp); }
    xlp++;
}
if (Verbose)
    fprintf(stderr, "%zu out of %zu labels positioned.\n", cnt, n_lbls);
else if (cnt != n_lbls)
    agwarningf("%zu out of %zu exterior labels positioned.\n", cnt, n_lbls);
```

The port's write-back loop is `writeBackLabels`
(`src/common/xlabels-place.ts:422-432`), called from `runPlacement`
(`xlabels-place.ts:463`). It counts nothing and warns nothing;
`grep -rn "exterior labels" src` is empty.

**Evidence ([harness/](harness/)).** Six probes under all eight engines
(48 cases), native 16.1.1 `-Tdot` stdout and stderr in `harness/native/`
(`<probe>.<engine>.{dot,err}`). Native warns in 13 cases: `repro` (dot 1/2,
osage 1/3), `headtail` (dot 4/12, neato/fdp/twopi/osage/sfdp 2/12, circo 0/12)
and `nosplines` (neato/fdp/twopi 2/3, osage 0/3). The port is silent in all 48.
Port `-Tdot` stdout equals native in 47 of 48. The exception is
`headtail`/twopi: the port places one xlabel native leaves unplaced (filed as
#244), so after the fix the port will print `3 out of 12` where native prints
`2 out of 12`. `addXLabels` runs once per layout, with no once-flag, so there is
no process static. No input of the 16.1.1 corpus makes native warn under any
engine ([harness/survey.md](harness/survey.md)), so the probes carry the
positive cases and the corpus survey checks only that nothing else changes.

`repro` routes `a:n -> b:n` through dot's flat-adjacent aux layout, which also
runs postprocess (and `addXLabels`) on the aux graph. Native warns once, so the
port's aux pass must stay silent. The `repro` test pins that.

Done means (the issue's own criterion): the port emits the warning where C
does. The issue's `Verbose` line applies only "if the port models `Verbose`
there"; it does not (AD-2). Type `fix`, a patch release.

**Out of scope:** the `no position for edge with ...` warnings and the
`continue` in the same C loop (#243); the twopi placement difference (#244);
any placement or drawing change.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 6f593c50..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `6f593c502868d8919c6cce817e84b13492be5605` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-174 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-174/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(xlabels): warn when addXLabels leaves exterior labels unplaced

  <two to four lines: C counts the placed labels and warns "N out of M
  exterior labels positioned" when any is left; the port wrote back the
  same labels silently>

  Refs: #174
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-warn.md#bytediff) | 0 changed outputs (stdout must not change) |
| 6 | Targeted survey | see [T1](batch-1/T1-warn.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says; `harness/compare.mjs` imports it. Run
`oraclePreflight` (`test/corpus/oracle-env.ts:125`) for `dot` and for `neato`
before trusting native output (both passed at planning). A missing `config8`
is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1`
label. Check `uptime` before gate 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `6f593c50`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-warn.md#write-set) must change.
   Journal why and stop.
2. After the fix, the port warns on the aux graph of a dot flat-adjacent layout
   (an extra or doubled line on `repro`/dot). That means the port's aux graph
   holds unplaced labels C's does not. Write the diagnosis artifact and stop.
3. After the fix, a probe's or survey id's port stderr differs from native for
   a reason other than the new line's absence. Example: a different count,
   from a placement divergence. If its stdout also differs from native (as
   `headtail`/twopi, #244), journal it, link or open a `follow-up` issue, and
   go on. If its stdout equals native, the count itself is wrong: diagnose and
   stop.
4. Any stdout change in gate 5 or gate 6. This fix writes stderr only, so a
   stdout change means the edit reached placement. Halt with the row.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and wording, the return shape of `writeBackLabels`, within the
  write-set.
- More probes in `harness/extra/` to settle a path the six do not reach.
- A corpus id where native warns and the port does not, or the reverse,
  because the layouts differ upstream: open a `follow-up` issue (queue rules),
  per stop condition 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-warn.md](batch-1/T1-warn.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the six inputs |
| [harness/native/](harness/native/) | native 16.1.1 `-Tdot` stdout and stderr per engine |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per input, engine and format |
| [harness/survey.md](harness/survey.md) | the planning-time corpus sweep for the warning |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the warning is written |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-174.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-17)

- **Tasks:** 1 of 1 (T1). Base `6f593c50`; per-task history under tag
  `issue-174/pre-squash`.
- **Decisions:** 10 journal rows, one flagged for review: `headtail`/twopi
  prints `1 out of 12`, not the `3 out of 12` this brief and #244 predicted.
  Native places two xlabels there and the port one, so the direction in #244
  was reversed. Corrected in a comment on #244; the case stays unpinned.
- **Gates:** typecheck exit 0; `npm test` 591 files, 13874 passed; goldens
  5/5; corpus + docs 2863 passed; smoke bytediff 1960 jobs, 0 diffs, 0 capped;
  probes 96 rows, stdout unchanged, stderr equal to native in 94 (the two
  others are `headtail`/twopi); survey 176 rows, stdout and stderr unchanged.
- **Accepted-row changes:** none. **Toward-native changes:** none (stdout did
  not change anywhere).
- **Follow-ups:** #243 and #244 (planning); #245 (`nodes touch - falling back
  to straight line edges` warnings not printed) and #246 (the ortho-labels
  warning ends in two newlines), both found by the survey and older than this
  change.
- **Notes:** nothing novel; no `.agent-notes/issue-174.md`.
