# T1: remove `EdgeInfo.lost`, tests, gates, squash

## Context

`EdgeInfo.lost` is port-only. Its one reader, `routeLoneEdge`'s skip, never
runs, because no original edge reaches `routeLoneEdge` twice in a pass
(AD-1; [../harness/survey.md](../harness/survey.md)).
[../harness/prototype.diff](../harness/prototype.diff) is the working
removal. It passes every behaviour check below. It lacks the new test case
and the `routing-failure-once` header rewording (AD-2), and its comments
need a final read.

## Steps

1. **Marker re-check.** Skip this step when the tip at execution start is
   `cf38d077`, and journal "planning's marker stands". Otherwise build a
   marker bundle on the new base: `git apply ../harness/marker.patch`,
   `npm run build:js`, copy `dist/index.js` to `$TMPDIR/i188/marker.mjs`,
   then `git checkout src`. Run
   `bash plans/issue-188-edgeinfo-lost/harness/marker-run.sh $TMPDIR/i188/marker.mjs`.
   Pass: no `ISSUE188_LOSTSKIP` and no `ISSUE188_LOSTREOFFER` line (else
   stop 2). If the patch no longer applies, re-create its 10 marker lines
   by hand at the same sites and journal it.
2. **Characterization test first (red-free by design).** This change removes
   behaviour that never runs, so no test can go red on the base. Write the
   new case before touching `src/`, and run it on the base:
   - Copy `../harness/probes/s1-structs-sideport-lost.gv` to
     `src/layout/dot/__fixtures__/structs-sideport-lost.dot`. Add a `//`
     header in the style of `2796-flat-labeled-lost.dot`: copied from
     graphviz `tests/graphs/structs.gv`, and `struct1:f2 -> struct3:here`
     fails routesplines through the side-port router.
   - In `src/layout/dot/routing-failure-once.test.ts`, add a `CASES` entry
     "lost side-port edge (routeFaithfulSidePort)": failures `1`, lost
     `['struct1 struct3']`, from
     `../harness/native/s1-structs-sideport-lost.stderr` (carried 16.1.1).
     Reword the header as AD-2 says, and name both oracles: the first four
     cases are 16.1.0 values (#278 tracks the fourth), and the new case is
     carried 16.1.1, captured 2026-11-21.
   - `npx vitest run src/layout/dot/routing-failure-once.test.ts` on the
     base: 5 pass. Journal it.
3. **Remove** (AD-1). Apply `git apply plans/issue-188-edgeinfo-lost/harness/prototype.diff`.
   If it does not apply because the base moved, make the same edits by
   hand. Then read every hunk against AD-1:
   - No `lost` identifier is left on `EdgeInfo` or `e.info`:
     `grep -rn "info\.lost\|lost?:\|lost: undefined" src` prints nothing.
   - Each writer site returns what it returned before.
   - A C reference stays at each site (`make_regular_edge`,
     `make_flat_labeled_edge`, `routespl.c:routesplines`), and no comment
     names the backstop, a "later call" or "re-attempt".
   - `splines-route.ts`: `if (base === 'lost' || base === null) return;`.
     Check that `resolveOrigEdge` is still imported only if something still
     uses it (typecheck plus lint).
4. **Existing tests.** `npm test`. Planning edited only the two dead-end
   assertions (AD-2). Any other failure is a gate failure, not push-forward:
   the removal is meant to change nothing.
5. **Agent notes** (Session end, README) can wait until the gates pass.
6. **Gates 1-6** (README). Record each in the journal.
7. **Journal the artifact.** This is not a defect fix, but the queue rules
   ask for a mechanism:
   - **Mechanism:** `lost` let `routeLoneEdge` skip an original that a
     writer had marked in the same pass. Since the backstop went (part 11
     T8), no original reaches `routeLoneEdge` twice in a pass, so the skip
     never runs and the field is dead state.
   - **Origin:** `src/model/edgeInfo.ts:174-181`, reader
     `src/layout/dot/edge-route.ts:477-479`, clear
     `src/layout/dot/edge-route-rank.ts:126,133`, writers `edge-route.ts:225,247,282,401`,
     `edge-route-chain.ts:481`, `splines-flat-labeled.ts:156`,
     `splines-route.ts:393` (base `cf38d077`).
   - **Causal chain:** survey.md's argument (collection rules, then
     `routeLoneEdge`'s two callers, then one non-merge entry per original).
   - **Ruled out:** a re-offer through `routeParallelEdgeGroup` or
     `routeEntryRun` (marker `LOSTREOFFER` 0); a path-2 construction
     (`c1`-`c4`: under `concentrate`, mergeable parallels become `IGNORED`,
     so no lost parallel group forms); an output change on any input that
     loses an edge (105/105).
8. **Finish** (README, "Branch and commits").

## Write-set

- `src/model/edgeInfo.ts` (field, doc, `makeEdgeInfo` key)
- `src/layout/dot/edge-route.ts` (`routeFaithfulRegularPlain`,
  `routeFaithfulAdjacentBack`, `routeFaithfulMultiRank`,
  `routeFaithfulSidePort`, `routeLoneEdge`)
- `src/layout/dot/edge-route-rank.ts` (`beginRoutingPass` and its doc)
- `src/layout/dot/edge-route-chain.ts` (`routeBackEdge`)
- `src/layout/dot/splines-flat-labeled.ts` (`makeFlatLabeledEdge`'s pn == 0
  branch)
- `src/layout/dot/splines-route.ts` (`routeParallelEdgeGroup`)
- `src/layout/dot/routing-failure-once.test.ts`,
  `src/layout/dot/edge-route-chain.dead-end.test.ts`
- `src/layout/dot/__fixtures__/structs-sideport-lost.dot` (new)
- `plans/issue-188-edgeinfo-lost/harness/results/` and `harness/probes/`
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README
  and `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-188.md` (new), `.agent-notes/issue-137.md`,
  `.agent-notes/followup-14-flat-labeled-lost.md`, `.agent-notes/issue-161.md`

## Read-set

- `src/model/edgeInfo.ts:170-185,415-447`
- `src/layout/dot/edge-route.ts:214-300,355-500`
- `src/layout/dot/edge-route-rank.ts:115-150`
- `src/layout/dot/edge-route-chain.ts:290-375,455-484`
- `src/layout/dot/splines-flat-labeled.ts:140-160`
- `src/layout/dot/splines-route.ts:290-410`
- `src/layout/dot/splines-groups.ts:30-200` (the group loop)
- `src/layout/dot/splines.ts:340-410` (collection)
- `src/layout/dot/routing-failure-once.test.ts`,
  `src/layout/dot/edge-route-chain.dead-end.test.ts:140-230`,
  `src/layout/dot/__fixtures__/2796-flat-labeled-lost.dot:1-3`
- `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:228-430` (collection and
  group loop), `lib/common/postproc.c` (`map_edge`'s lost-edge report)

## Interface contracts

No signature changes. `EdgeInfo` loses the optional `lost` field. Every
reader and writer is listed above, and no caller outside them exists
(`grep` at planning; T1 step 3 checks again).

## Budgets

Every touched file and function shrinks or keeps its size. Prototype
against base: `edge-route.ts` 499 → 497 lines, `splines-route.ts` 485 → 479,
`edgeInfo.ts` 447 → 438. Budgets are not at risk. If the new test case or
comments push a `src/` file past its base length, trim comments, never a
`@see`.

## Bytediff

Queue gate 5. Build the base bundle from `git archive cf38d077` in
`$TMPDIR`: symlink `node_modules`, run `npm run parser:regen` and
`npm run build:js`, and copy `dist/index.js` to `$TMPDIR/i188/base.mjs`.
Build the head bundle from the working tree (`npm run build:js`, copy to
`$TMPDIR/i188/head.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i188/base.mjs $TMPDIR/i188/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i188/smoke.json
```

**Expect** every job identical and 0 diffs. bytediff compares stderr too. A
capped job means load, so re-run it alone. Any diff is stop 3.

## Targeted survey

**Selection rule:** [../harness/survey.md](../harness/survey.md#reach-selection).
The output can change only where a writer fires, and a writer fires only on
a routing failure. The set is the 17 corpus ids in
`../harness/reach-ids.txt`, the 10 probes and #137's 8 fixtures.

```
H=plans/issue-188-edgeinfo-lost/harness
bash $H/compare.sh $TMPDIR/i188/base.mjs $TMPDIR/i188/head.mjs > $H/results/compare-head.tsv
tail -1 $H/results/compare-head.tsv
```

Pass: `# identical 105/105`, as at planning
([../harness/results/compare-planning.tsv](../harness/results/compare-planning.tsv)).
Base and head are compared, not native: the change claims no move toward
native. The new test case covers native for `s1`.

## Observability / rollback

Observability: N/A. This is a library with no logs, metrics or traces, and
its stderr text is unchanged (gate 6). Rollback: Reversible (revert the one
squashed commit).

## Acceptance criteria

1. **Given** the head tree, **when** `grep -rn "info\.lost\|lost?:\|lost: undefined" src`
   runs, **then** it prints nothing, and typecheck passes.
2. **Given** `s1` (`structs.gv`), **when** rendered `-Tsvg`, **then**
   stderr has one `in routesplines, Pshortestpath failed` and
   `Error: lost struct1 struct3 edge`, as native does, on both base and
   head.
3. **Given** the 35 reach inputs, **when** compared base against head in
   dot, xdot and svg, **then** 105 of 105 jobs are identical, stdout and
   stderr, and the smoke bytediff shows 0 diffs.
4. **Given** the dead-end tests, **when** run on the head, **then** both
   edges still have no spline, and `SRC_BACK` still renders byte-equal to
   native's plain output.
5. **Given** gates 1-4, **when** run on the head, **then** all pass, with no
   test edited beyond AD-2.
