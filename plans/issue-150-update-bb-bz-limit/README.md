# Mission: issue #150: limit update_bb_bz refinement to 10 levels

## Objective

Graphviz 16.1.1 (upstream `81c6b5484`, issue 2780) splits `update_bb_bz` into a
static `update_bb_bz_core(bb, cp, recurse)` and a wrapper that passes
`ATTEMPTS = 10` (`~/git/graphviz-16.1.1/lib/common/emit.c:735-776`). When a
segment is still not refined and `recurse` is 0, the core returns without
expanding the bb. The port's `updateBbBz` (`src/common/splines-geom.ts:98-109`)
recurses without a limit. On huge coordinates it runs forever, as native 16.1.0
did: measured at planning, both hang on one of T1's curves.

Done means:

- `splines-geom.ts` has the core-plus-wrapper shape of the C. Every port caller
  goes through the wrapper. Those are `splines-clip.ts:385`,
  `edge-route-helpers.ts:159`, `splines-flat.ts:288` and `pack/index.ts:135`.
- Three test cases in `src/common/splines.test.ts` pin values from native
  16.1.1's own `update_bb_bz`, called through
  [harness/native-bb.c](harness/native-bb.c).
- Every gate is green. The smoke bytediff is identical on every job.

Type `fix`, a patch release.

**Out of scope:**

- `approx_bezier` (`src/gvc/anchor.ts:448`): it is still unbounded in 16.1.1
  ([AD-4](decisions.md#ad-4-approx_bezier-stays-unbounded)).
- #151: `2780` and the other 277x inputs throw in the port before they reach
  `updateBbBz`.
- The #150 cell of the 16.1.1 table in `docs/known-divergences.md`
  ([AD-3](decisions.md#ad-3-the-ledger-and-corpus-records-stay-as-they-are)).

## Evidence (measured at planning, base `46fd64cd`)

- **Native value harness:** [harness/native-bb.c](harness/native-bb.c), linked
  once against 16.1.1's `libgvc` and once against 16.1.0's. The port's
  unbounded `updateBbBz` equals 16.1.0 on every curve that finishes. A bounded
  copy (the T1 change, written in a scratch script) equals 16.1.1 bit for bit
  on all four curves tried, the existing AC3 curve among them.
- **Reach:** a 16.1.1 `-Tplain` sweep of the 982 applicable corpus inputs gave
  each graph's size ([harness/native-large.txt](harness/native-large.txt) lists
  those over 1000 in). Before 10 halvings, the bound can only matter when a
  control point sits about 2·4¹⁰ ≈ 2.1e6 pt off its chord. So the candidates are
  inputs about that large, plus the 17 that gave no native output in 20 s.
  [harness/depth-detector.sh](harness/depth-detector.sh) runs a copy of the port
  that prints the moment refinement reaches depth 10. It found no hit:
  - the candidates
    ([harness/detector-candidates.txt](harness/detector-candidates.txt)): `2222`
    and `2784` make no calls, and the 277x family throws first (#151). `2471`
    and 12 of the inputs with no native output hit the 120 s cap without printing
    a hit. `1864` runs out of memory in the port, three are parse errors, and
    `1783` finishes;
  - the 49 smoke ids ([harness/detector-smoke.txt](harness/detector-smoke.txt)):
    508 top-level calls.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 46fd64cd..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `46fd64cd969b29860a8eac747045d3f207a6332e` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-150 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-150/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(common): limit update_bb_bz refinement to 10 levels

  Graphviz 16.1.1 bounds update_bb_bz's recursion at 10 levels and
  leaves the bb untouched for a segment still unrefined there (upstream
  2780). The port recursed without a limit and, like native 16.1.0,
  never finished on huge coordinates. Port the core-plus-wrapper shape;
  the tests pin values from native 16.1.1's own update_bb_bz.

  Refs: #150
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13558 + 3 new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-update-bb-bz-limit.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-update-bb-bz-limit.md#targeted-survey) | the table in T1 |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for the other engines. Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) for `dot` before trusting native
output. If `config8` is missing, run `GVBINDIR=<dir> <dot> -c`. Check `uptime`
before gate 6, and wait if the load is above 12.

The baseline was green at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. Gate 5 shows any changed output. At planning, no smoke input reached depth
   10. A change means an unexpected path: diagnose it, and halt per the queue
   rules unless it equals native.
4. A pinned test value differs from the head by even one bit. Re-run
   [harness/native-bb.c](harness/native-bb.c) first. If native still gives the
   brief's value, the port's `ptToLine2` or `bezier` differs from native here.
   That is a defect outside the write-set: stop with the trace.
5. An existing test fails because of the change. At planning, the AC3 curve gave
   the same bb bounded and unbounded.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- The constant's name and placement (module-level `UPDATE_BB_BZ_ATTEMPTS`, or a
  local `const ATTEMPTS` inside the wrapper as the C has it).
- Test names and their order inside the existing `describe('updateBbBz')`.
- Whether the hang case runs in the red step. It cannot fail cleanly on the base:
  a synchronous loop blocks vitest's timeout. Run it only after the change is in.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-update-bb-bz-limit.md](batch-1/T1-update-bb-bz-limit.md) | the task |
| [harness/native-bb.c](harness/native-bb.c) | native `update_bb_bz` on one curve |
| [harness/depth-detector.sh](harness/depth-detector.sh) | reach check: depth-10 hits per id |
| [harness/native-size.sh](harness/native-size.sh) | native `-Tplain` graph line per id |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the recursion, bounded |
| [diagrams/component-map.md](diagrams/component-map.md) | touched component and callers |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-150.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #150 with the outcome: which ids reach the bound (none in the corpus
  at planning) and that `2780` waits on #151.
- The final message ends with the driver's status line.

## Mission summary (2026-11-16)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 2 push-forward (module-level `UPDATE_BB_BZ_ATTEMPTS`; test
  names and order). One diagnosis: `2108` capped on the base only in the first
  targeted-survey run. It renders in about 96 s, at the edge of bytediff's
  120 s cap under 5 lanes. Re-run without the cap pressure, all three formats
  are identical ([decision-journal.md](decision-journal.md), gate 6 row).
- **Gates:** 1 typecheck 0; 2 `npm test` 13561 passed, 18 expected fail;
  3 goldens 5/5; 4 corpus + docs 2863 passed; 5 smoke bytediff 1960 jobs,
  identical 1960; 6 targeted survey 57 jobs (19 ids, dot, svg/xdot/plain), all
  identical; `2108` `-Tplain` graph line `graph 1 24.183 12092` on native
  16.1.1 and the head.
- **Accepted-row and toward-native changes:** none (no output changed).
- **Stop conditions:** none triggered.
- **Follow-ups:** none opened. `2780` waits on #151.
- **Per-task history:** tag `issue-150/pre-squash`.
