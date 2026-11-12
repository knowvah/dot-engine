# Mission: issue #173: divide `GD_ranksep` as C's `int` does in beginpath/endpath

## Objective

`GD_ranksep` is an `int` (`lib/common/types.h:335`), so `GD_ranksep(agraphof(n))/2`
in `beginpath`/`endpath` (`lib/common/splines.c:415,428,486,618,631,684`) is
integer division. The port divides as floating point at six sites
(`src/common/splines-path-begin.ts:40,53,124`,
`src/common/splines-path-end.ts:49,58,124`). With an odd `ranksep`, the side-port
end box is 0.5 taller, `splinefits` accepts a first tangent that native halves,
and the last Bezier piece differs. The flat-adjacent aux of a labelled graph has
`ranksep` 9 (36 → 18 → 9 through `edgelabel_ranks` twice), so it shows on
`rankdir=LR` flat-adjacent groups with a side port and an edge label.

**The diagnosis is done** (the issue body: mechanism, origin, causal chain, ruled
out, a controlled experiment). **It was re-measured at planning** on base
`cbf48285`. A throwaway bundle with `Math.trunc(ranksep / 2)` at the six sites
renders all six probes in [harness/probes/](harness/probes/) equal to native in
`-Tdot`, `-Txdot` and `-Tplain`. On the base they miss 2/4/2 lines (the five
`repro-*`) and 9/22/5 lines (`two-labelled`). Native output is in
[harness/native/](harness/native/).

**The sibling, `position.c:276`.** `m0 = ED_minlen(e) * GD_nodesep(g) / 2` has
`int m0`, so it is integer division too. The port has
`src/layout/dot/position-aux.ts:201` as a float. It is reached (a planning marker
printed `m0` = 23 and 69 for `nodesep=0.32`), but the product is always even:
`ND_alg` exists only for a labelled flat edge, and then `edgelabel_ranks` has
doubled every `ED_minlen`. So no render can change. T2 ports it anyway, as the C
types it, with a unit test (AD-2).

Done means: the six expressions and the sibling divide as C does, the six probes
equal native in every format, tests pin that, and every gate is green. Type `fix`,
a patch release.

**Out of scope:** #187 and #188 (the flat-adjacent aux fall-through), #215 (the
non-adjacent flat collector re-sort), and any other `int` field the port stores as
a float. If you find one, open a `follow-up` issue for it.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline cbf48285..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `cbf48285638d24bce615f0647132a28879570f22` (the tip at planning).
  If the tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-173 brief`
  (this directory), then `fix(T1): ...` and `fix(T2): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T2's last step):** `git tag issue-173/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(dot): divide ranksep and nodesep as c's int fields do

  <two to four lines: GD_ranksep/GD_nodesep are int, so the six
  beginpath/endpath halves and position.c's m0 truncate; the port
  divided as float, the end box grew 0.5 and splinefits kept a
  tangent native halves>

  Refs: #173
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
| 5 | Smoke bytediff | see [T2](batch-1/T2-sibling-gates.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T2](batch-1/T2-sibling-gates.md#targeted-survey) | no id moves away from native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0) with `GVBINDIR=/tmp/ghl`. Run `oraclePreflight`
(`test/corpus/oracle-env.ts:124`) for `dot` before trusting native output. A
missing `config8` is fixed with
`GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -c`. Never use
`/tmp/ghl1611*` (the 16.1.1 build). The issue has no `upstream-16.1.1` label.
Check `uptime` before gate 6. Above 12, wait.

Baseline at planning: typecheck and `npm test` green on `cbf48285` (see
[decisions.md](decisions.md#baseline)).

## Stop conditions

1. A probe still differs from native after the six sites truncate. The issue's
   mechanism is then incomplete. Diagnose the rest to a full artifact
   (`rules/diagnosis.md`), journal it, comment it on #173, and stop.
2. The fix needs a file outside the task write-sets. Journal why and stop.
3. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
4. Gate 5 or gate 6 shows a changed output that is not equal to native and fits
   neither of the queue rules' two exceptions. Halt with the row.
5. The sibling change (T2) changes any render output. AD-2's argument says it
   cannot. Revert T2's source line, journal the input that proves the argument
   wrong, open a `follow-up` issue with it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names, wording and placement within the write-sets.
- A main-graph probe for odd `ranksep` (the issue says "not probed"). If you find
  one that the fix moves to native, pin it in T1's test file. If you do not, say
  so in the journal. Planning tried six shapes with `ranksep=0.32`/`0.35`, and
  none reached the tangent window.
- A unit test of `beginPath`/`endPath` boxes with an odd `ranksep`, if a fixture
  is cheap. The render tests are required either way.
- A divergence found on the way that this fix does not cause: open a `follow-up`
  issue, per the queue rules.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 then T2 |
| [batch-1/T1-ranksep-boxes.md](batch-1/T1-ranksep-boxes.md) | red probe tests, the six sites |
| [batch-1/T2-sibling-gates.md](batch-1/T2-sibling-gates.md) | the sibling, gates, squash |
| [harness/probes/](harness/probes/) | the six inputs |
| [harness/native/](harness/native/) | native 16.1.0 `-Tdot`, `-Txdot`, `-Tplain` (stderr empty) |
| [harness/mark.mjs](harness/mark.mjs) | gate 6 selection: the marker-bundle scan (added at execution) |
| `plans/issue-170-aux-ordering-mincross/harness/compare.mjs` | native, base and head per probe and format (reused) |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the odd `ranksep` comes from and where it is read |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-173.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #173 with the result. Do not close it: it closes when the branch
  merges.
- The final message ends with the driver's status line.

## Summary (2026-11-11)

- **Tasks:** 2 of 2 (T1, T2). One batch.
- **Result:** the six `beginpath`/`endpath` halves and `make_LR_constraints`'
  `m0` truncate as C's `int` does. The six planned probes and six added
  `main-*` probes equal native in `-Tdot`, `-Txdot` and `-Tplain`.
- **Decisions:** 17 journal rows, one flagged for review: the defect is not
  confined to the flat-adjacent aux. An odd `ranksep` on the main graph
  (0.32in = 23pt, or 0.25in / 0.07in with an edge label) shows it on any
  side-port edge. A generated scan found 140 such inputs; the fix moved every
  one to native and none away. One probe per changed expression is pinned.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 574 files / 13535 tests; 3 golden
  5/5; 4 corpus + docs 2844 tests; 5 smoke bytediff 1960/1960 identical; 6
  nine ids, all equal native on base and head.
- **Stop conditions:** none triggered. The sibling changed no output (T1 head
  against T1+T2 head: 1960/1960 identical; the corpus product is even on all
  20 hits).
- **Follow-ups:** none opened. No other `int` half was found as a float.
- **Per-task history:** tag `issue-173/pre-squash`.
