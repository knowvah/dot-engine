# T2: the `position.c:276` sibling, gates 1-6, squash

## Context

`make_LR_constraints` declares `int m0` (`position.c:222`) and sets
`m0 = ED_minlen(e) * GD_nodesep(g) / 2` (`position.c:276`). The port computes it
as a float (`src/layout/dot/position-aux.ts:201`). AD-2 explains why no render
can change: the product is always even on a real layout. So the test is a unit
test that calls `applyFlatLabel` with an odd product.

## Steps

1. **Red.** In `src/layout/dot/position-aux.branch.test.ts`, in
   `describe('applyFlatLabel')`, add a case with `g.info.nodesep = 23`,
   `e.info.minlen = 1`, and endpoints whose `rw`/`lw` are known. Assert the aux
   edge's `minlen` is `cround(11 + rw + lw)` (C), not `cround(11.5 + rw + lw)`.
   Choose `rw + lw` so that the two values differ (for example 50: 61 against 62).
   Run it on T1's head: it must fail. Journal it.
2. **Green.** `const m0 = Math.trunc(edgeMinlen(e) * nodesep / 2);` with a
   comment citing `int m0` (`position.c:222,276`). Run the test: green.
3. **No render change.** Rebuild `$TMPDIR/i173/head.mjs`. Gate 5 must show the
   same changed rows with and without this line. If any row differs, that is stop
   condition 5.
4. **Commit** `fix(T2): truncate m0 in make_LR_constraints as c's int does`.
5. **Gates 1-6** (README table). Record each in the journal.
6. **Finish** (README, "Branch and commits"): update the README status and the
   batch checkboxes, add the project journal row, then tag, soft-reset and make
   one commit. Comment the result on #173.

## Write-set

- `src/layout/dot/position-aux.ts`
- `src/layout/dot/position-aux.branch.test.ts`
- `plans/decision-journal.md`, this mission's `decision-journal.md`, `README.md`
  and `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-173.md` (only if novel)

## Bytediff

The queue rules, gate 5. Use `$TMPDIR/i173/base.mjs` and the final head bundle:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i173/base.mjs $TMPDIR/i173/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i173-smoke.json
```

Every changed output must equal native, or fit one of the queue rules' two
exceptions (list those rows in the report). Otherwise: stop condition 4.

## Targeted survey

Choose ids with a marker bundle, as `.agent-notes/issue-130.md:30` describes.
Build it from a `$TMPDIR` copy of the head, with a `console.error('I173')` at
each of the six sites when `ranksep` is odd (only there do the two divisions
differ), and one at `position-aux.ts:201` when the product is odd (expected never;
AD-2). Run it through `test/tools/bd-job.ts` on the `dot`-engine manifest ids
(`-Kdot -Tdot`, 45 s cap). Add the nine ids that reach `makeFlatAdjEdges` on the
corpus (`1444`, `1444-2`, `1949`, `241_0`, `241_1`, `2437` and the three `ports`
copies, per `.agent-notes/issue-130.md`), whether or not they print the marker.
For every selected id, compare native, base and head with
`plans/issue-170-aux-ordering-mincross/harness/compare.mjs`, or with
`bytediff.ts --file` and a native render. Journal the selection rule, the marker
counts per site, and the result table.

Pass: no id has more lines missing from native on the head than on the base, and
no `headErr` is `DIFF` where `baseErr` is `same`. A marker hit at
`position-aux.ts:201` disproves AD-2: stop condition 5.

## Read-set

- `~/git/graphviz/lib/dotgen/position.c:215-310` (`make_LR_constraints`)
- `~/git/graphviz/lib/dotgen/rank.c:165-185` (`edgelabel_ranks`)
- `src/layout/dot/position-aux.ts:100-115,190-215`
- `src/layout/dot/position-aux.branch.test.ts:365-430`

## Observability / rollback

Observability: N/A, no new observable operations (library: no logs, metrics or
traces). Rollback: Reversible (revert the one squashed commit).

## Acceptance criteria

- Given T1's head, when the new `applyFlatLabel` case runs, then it fails, with
  the aux `minlen` one higher than C's.
- Given the sibling truncated, when the case runs, then it passes.
- Given gates 1-6, when they run on the final head, then each passes as the README
  table says, and the marker never fires at `position-aux.ts:201`.
- Given the finished mission, when `git log <base>..` is listed, then there is
  exactly one commit, with footer `Refs: #173`, and tag `issue-173/pre-squash`
  holds the per-task history.
