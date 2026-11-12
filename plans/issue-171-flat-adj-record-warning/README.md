# Mission: issue #171: print make_flat_adj_edges' record-shape warning

## Objective

When a flat edge joins two adjacent nodes and one of them has a record shape, C
`make_flat_adj_edges` warns once per process, then gives up on the edge. The port
gives up on the same edges but prints nothing. The drawing already equals native.
Only stderr differs.

**Mechanism (stated in the issue, checked at planning against base `c29f47fa`).**
`lib/dotgen/dotsplines.c:1143-1152`:

```c
tn = agtail(e0), hn = aghead(e0);
if (shapeOf(tn) == SH_RECORD || shapeOf(hn) == SH_RECORD) {
  if (!atomic_flag_test_and_set(&warned)) {
    agwarningf("flat edge between adjacent nodes one of which has a record "
               "shape - replace records with HTML-like labels\n");
    agerr(AGPREV, "  Edge %s %s %s\n", agnameof(tn),
          agisdirected(g) ? "->" : "--", agnameof(hn));
  }
  return 0;
}
```

The port takes the same exit in `routeFlatEdge` (`src/layout/dot/edge-route.ts:418`)
through `isLostFlatAdjRecordEdge` (`edge-route.ts:400-406`). That function only
detects the case and writes nothing.

**Evidence ([harness/](harness/)).** There are 15 probes, `1323.gv` plus 14 small
ones. Native 16.1.0 `-Tdot` stderr for each is in `harness/native/*.err`. On the
base, the port's stderr equals native on the two probes that never reach the exit
(`splines-none`, `splines-ortho`). On the other 13 it equals native except for the
two missing lines. Every `Error: lost ...` line already matches. Two of the probes
settle details of the message:

- `rankdir-lr.gv`: the source edge is `b -> a`, and native prints `Edge a -> b`.
  C names the forward-normalized lead edge (`make_flat_edge`'s `makefwdedge` of
  `*edges`, `dotsplines.c:1521-1535`), not the source edge.
- `quoted-name.gv`: native prints `Edge x y -> p"q`, the raw `agnameof` names
  with no `agstrcanon` quoting.

`two-pairs.gv` has two record pairs, and native warns only once.

Done means (the issue's own criterion): the port writes both lines once, as C
does, and a test pins native's stderr for `1323`. Type `fix`, a patch release.

**Out of scope:** routing or drawing changes (the drawing equals native). Moving
the record test into `makeFlatAdjEdges` (AD-1). The no-free-relayout difference
that every per-render once-flag has (AD-3, `docs/process-statics.md`).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline c29f47fa..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `c29f47fa34fd6a9f97d10457aafa7e34f211b913` (the tip at planning).
  If the tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-171 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-171/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(dot): warn on a record end of a flat-adjacent edge as c does

  <two to four lines: make_flat_adj_edges warns once and names the
  forward-normalized lead edge; the port took the same exit silently>

  Refs: #171
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 (includes `process-statics.test.ts`) |
| 5 | Smoke bytediff | see [T1](batch-1/T1-warn.md#bytediff) | 0 changed outputs (stdout must not change) |
| 6 | Targeted survey | see [T1](batch-1/T1-warn.md#targeted-survey) | see T1 |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0) with `GVBINDIR=/tmp/ghl`. Run `oraclePreflight`
(`test/corpus/oracle-env.ts:124`) for `dot` before trusting native output. A
missing `config8` is fixed with
`GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gate 6. Above 12, wait (the load
was about 30 at planning).

Baseline at planning: typecheck and `npm test` green on `c29f47fa`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-warn.md#write-set) must change.
   Journal why and stop.
2. After the fix, a probe's port stderr still differs from `harness/native/*.err`,
   and the cause is not the warning code itself. Example: the port reaches the
   exit for a different edge, in a different order, or not at all. That is a
   routing divergence. Write the diagnosis artifact, open a `follow-up` issue,
   and stop if it touches the issue's own `1323`. Otherwise, journal it and go on.
3. Any stdout change in gate 5 or gate 6. This fix writes stderr only, so a
   stdout change means the edit reached routing. Halt with the row.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Names of the new module's exports, test names and wording, within the
  write-set.
- Wording of the `docs/process-statics.md` row, within the verdict AD-3 fixes.
- A corpus id where native warns and the port does not, or the reverse, because
  the layouts differ upstream: open a `follow-up` issue (queue rules). It does not
  block this mission unless it is `1323` (stop condition 2).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-warn.md](batch-1/T1-warn.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the 15 inputs |
| [harness/native/](harness/native/) | native 16.1.0 `-Tdot` stdout and stderr |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per input and format |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the warning is written |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-171.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-11)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 14 journal rows. Flagged for review: rows 10 (follow-ups #216,
  #217, #218 filed) and 11 (`tests/1864.dot` and `tests/2834.dot` unverified:
  neither native nor the port finishes them under the cap, base and head alike).
- **Gates:** typecheck exit 0. `npm test` 573 files, 13521 tests. Golden gates
  5 of 5. Corpus and docs 24 files, 2844 tests. Smoke bytediff 1960 jobs,
  1960 identical, 0 diffs. Targeted survey: stdout unchanged on every input
  that renders; stderr `DIFF` → `same` on `1323`, `1323_1` and `graphs/b15`;
  no row worse.
- **Correction to this brief:** the harness has 14 probes, not 15 (12 reach the
  exit, 2 are silent).
- **Known issues:** none in this change. Pre-existing stderr gaps found by the
  survey are #216, #217 and #218.
