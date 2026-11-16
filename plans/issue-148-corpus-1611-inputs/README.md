# Mission: issue #148: move the corpus to graphviz 16.1.1's `tests/` and add its new inputs

## Objective

The oracle is 16.1.1 (ADR-0002, #147), but every corpus script still defaults its
corpus root to the 16.1.0 checkout, `~/git/graphviz/tests`. The re-baseline kept it
there on purpose (`plans/graphviz-16-1-1-rebaseline/decisions.md` AD-1: "Moving it
is #148"). 16.1.1's tree, `~/git/graphviz-16.1.1/tests`, adds 36 inputs and changes
7 (`radius_dot.gv` and `shapes_dot.gv` reference copies; their ids stay).

Done means:

1. Every corpus script takes its default root from one constant in
   `test/corpus/oracle-paths.mjs`, and a fitness test forbids the old literal (T1).
2. `test/corpus/corpus-manifest.json` is re-enumerated from the 16.1.1 tree: 36 ids
   added, none removed, native-crash inputs quarantined (T2).
3. Every new id and every changed input is classified against native 16.1.1, the
   issue's three "no port change" claims are confirmed or refuted with evidence,
   and each divergence is assigned to an issue (T3).
4. Gates green, the port bundle byte-identical to the base's, one squashed commit
   (T4).

**No `src/` change.** A port divergence found here is filed, not fixed (AD-3).

**Measured at planning** on base `736b6d59` (details in
[harness/planning-smoke.txt](harness/planning-smoke.txt), dot `-Tsvg`, header lines
excluded):

- Equal to native: `2765`, `2765_1`, `2768`, `2768_1`, `2768_2`, `2769`, `2769_1`,
  `2769_2`, `2860`, `2860_1`, `2866` (dot and circo), `2870_0..2`. So the issue's
  pack (2768/2769) and circo (2866) claims hold on dot SVG.
- `2783`: the port equals native **16.1.0**, but 16.1.1 shifts the graph 27pt in x
  and prints `trapezoid segment construction failed`. The ortho claim does not
  hold as stated: a 16.1.1 change moved native. T3 attributes it.
- Port `InternalError`: `2756`, `2756_1` (`reading 'v'`), `2773_1`, `2776_1`
  (`reading 'll'`). Exit-code mismatches: `2758`, `2759`, `2759_1`, `2781`,
  `2781_1`. Diverged: `2773`, `2774`, `2774_1`, `2776`, `2780`, `2821_1`, `2821_2`.
- Native 16.1.1 segfaults on `2746`, `2761`, `2761_1` (upstream marks them `xfail`).
- With the regenerated manifest, `npx vitest run test/corpus test/docs` passed
  (24 files, 2850 tests); the manifest was then restored.

**Out of scope:** registries, dashboards and `native-timings.json` (AD-2); the
pending-ports table in `docs/known-divergences.md` and its 26 translations (AD-4);
fixing any divergence (AD-3); the smoke list `.claude/queue-smoke-ids.txt` in the
main checkout (read-only; suggest additions in the report).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then the current batch overview.
   Check finished work with `git log --oneline 736b6d59..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `736b6d59f0acac713bd92899c9690edd8196b6d2` (the tip at planning). If
  the tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-148 brief` (this
  directory), then `test(T1): ...`, `test(T2): ...`, `docs(T3): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T4's last step):** `git tag issue-148/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  test(corpus): move the corpus to graphviz 16.1.1's tests

  <two to four lines: one ORACLE_CORPUS_ROOT beside the oracle paths;
  manifest re-enumerated, 36 inputs added, N quarantined as native
  crashes; classification of the new ids is on #148>

  Refs: #148
  ```

  Type `test` (no release; nothing under `src/` changes). Lines ≤ 80, subject ≤ 72,
  lowercase, no period, no attribution lines. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Port unchanged | see [T4](batch-2/T4-gates-squash.md#gate-5) | base and head `dist/index.js` sha256 equal |
| 6 | Targeted survey | [T3](batch-2/T3-classify.md) | every new/changed id classified and assigned |

Oracle (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot` with
`GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) before trusting native output. A
missing `config8`: `GVBINDIR=<dir> <dot> -c`. The 16.1.0 build
(`~/git/graphviz/build/cmd/dot/dot`, `/tmp/ghl`) is for attribution only (T3).
Check `uptime` before T3's renders; above 12, wait. Planning saw 43.

Baseline at planning: typecheck exit 0; `npm test` 575 files, 13534 passed, 18
expected fail, on `736b6d59` ([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the task write-sets must change (other than issue comments and
   new issues). Journal why and stop.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. Re-enumeration removes or renames an existing id, or adds an id outside the 36
   listed in [T2](batch-1/T2-manifest.md). Stop: the walk of the sibling roots or
   the slugging changed, and every registry would be invalidated.
4. Gate 5 fails (the bundle differs). This mission must not change the port.
5. A corpus or docs test needs a registry, dashboard or translated doc edited to
   pass. That contradicts AD-2/AD-4; journal the coupling and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Naming, test wording, and the exact fitness-test matcher within T1's write-set.
- Quarantining a new id under an **existing** reason with evidence in a comment
  (e.g. `oracle-crash` for a native segfault); never a new reason.
- Whether a divergence matches a filed issue (#149–#165): match by upstream issue
  number in the file name and the C change named in the issue body, then confirm
  with the 16.1.0/16.1.1 native pair.
- Filing `follow-up` issues for unattributed divergences (queue rules), and
  commenting the id lists on #148 and on each matched issue.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | T1 root constant, T2 manifest |
| [batch-1/T1-root-constant.md](batch-1/T1-root-constant.md) | one default, fitness test |
| [batch-1/T2-manifest.md](batch-1/T2-manifest.md) | re-enumerate, quarantine crashes |
| [batch-2/overview.md](batch-2/overview.md) | T3 classify, T4 gates and squash |
| [batch-2/T3-classify.md](batch-2/T3-classify.md) | targeted survey, attribution, issues |
| [batch-2/T4-gates-squash.md](batch-2/T4-gates-squash.md) | gates, journal, squash |
| [harness/planning-smoke.txt](harness/planning-smoke.txt) | planning's dot `-Tsvg` smoke of the 36 ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | how the root reaches the walkers |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2 | [x] |
| 2: T3, T4 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal).
- Write `.agent-notes/issue-148.md` only for something novel; otherwise say so in
  the journal row.
- Comment on #148 with the result and the classification table. Do not close it.
- Report under "hand-off": the maintainer's pre-merge full survey must run **fresh**
  (deleted JSONL) for the 7 changed inputs, because resume walks skip ids they
  already hold (list the 7 ids).
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 4 of 4 (T1, T2, T3, T4). Base `736b6d59`; per-task history under
  tag `issue-148/pre-squash`.
- **Result:** every corpus script defaults to `ORACLE_CORPUS_ROOT`
  (`~/git/graphviz-16.1.1/tests`), guarded by a fitness test. Manifest 971 →
  1007 ids: 36 added, none removed or changed; `2746`, `2761`, `2761_1`
  quarantined `oracle-crash`. Of the 36: 15 conformant, 17 pending-port on
  #151, #155, #159, #160, #162, #164 (with #150 and #152 behind them), 3
  oracle-crash, and `2841` (`engine-deferred`; fdp defect #224). The 7 changed
  inputs stay conformant. See [classification.md](classification.md).
- **Claims:** circo held, pack held; ortho `9ac4b9e3d` held for that commit, but
  `2783` moves with `b99490ece` (#164), shown by a revert test.
- **Decisions:** 31 journal rows; 4 flagged for review (the extra
  manifest-vs-checkout fitness test; running T3 at high load from other
  repositories; the `2773` family posted on #151 rather than as a new issue;
  the base bundle built from `git archive`, not a worktree and `npm ci`).
- **Gates:** typecheck 0; `npm test` 576 files, 13547 passed, 18 expected fail;
  goldens 5/5; corpus + docs 25 files, 2863 passed; bundle sha256 equal to the
  base's (`7f4134d0…a9db3126`), smoke bytediff 1960/1960 identical; targeted
  survey 103 rows.
- **Follow-ups filed:** #224 (fdp `2841`), #225 (the rankset warning prints an
  empty name for an anonymous graph), #226 (image inputs only compare the missing-file path;
  a question for the maintainer).
- **Hand-off:** the pre-merge walks must run **fresh** (rows deleted from the
  committed JSONL) for the 7 changed inputs: `linux.i386-radius_dot`,
  `linux.x86-radius_dot`, `linux.x86-shapes_dot`, `macosx-radius_dot`,
  `nshare-radius_dot`, `nshare-shapes_dot`, `windows-radius_dot`. The 32
  applicable new ids (36 less 3 oracle-crash and `2841`; the T3 brief's "33"
  is off by one) have no registry rows yet (AD-2). Smoke-list suggestions
  are in the classification.
