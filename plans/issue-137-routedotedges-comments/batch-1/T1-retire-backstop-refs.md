# T1: retire references to the removed routeDotEdges backstop

## Context

See the [README](../README.md#objective) table for the five sites and what is true now,
and [decisions.md](../decisions.md) for AD-1 (remove the redundant aux label pass), AD-2
(`lost` stays) and AD-3 (survey scope).

## Task

No new test: four sites are comments, and AD-1 removes a call that should change nothing.
Byte identity in gates 5 and 6 is the test (TDD exception: no new behaviour). The existing
flat-adjacent tests and goldens must stay green.

1. **Setup.** Preflight `/tmp/ghl` × dot. Re-run
   `grep -rn "routeDotEdges\|edge-order\.ts" src test docs` and confirm the five planned
   sites are still the only hits. Golden ids named `*edge-order*` are unrelated.
2. **Comments.** Rewrite `splines-flat-labeled.ts:153-154`, `edgeInfo.ts:175-177`,
   `svg.ts:117-119` and `bsd-qsort.ts:11` per the table. Keep each `@see`. Name
   `routeLoneEdge` and `beginRoutingPass` where the table does, after checking both by
   reading them.
3. **AD-1.** Delete `splines-flat.ts:372-376` (comment and call) and
   `placeRegularEdgeLabels` from the `:44` import. Check
   `grep -n placeRegularEdgeLabels src/layout/dot/splines-flat.ts` prints nothing. Run
   `npx vitest run src/layout/dot` green.
4. **`rc` check.** Read whether `dotSplines_` can return non-zero for an aux graph
   (`splines.ts:496-499`: only `orthoDispatch`). If it can, file a `follow-up` issue
   (`makeFlatAdjEdges` ignores `rc`, `dotsplines.c:1236-1239`). Journal the answer
   either way.
5. Append a dated line under the first observation in
   `.agent-notes/followup-14-flat-labeled-lost.md` saying the backstop is gone (part 11
   T8) and the re-route risk is now within the flat group loop (`routeLoneEdge`).
6. Mark item 151 in `plans/post-16.1-followups/README.md` (line 709)
   `**[DONE — issue #137: comments name the live readers; aux label re-place removed]**`,
   in item 147's style.
7. Gates 1-6 (README), journal, `.agent-notes/issue-137.md`, then the squash.

## Write-set

- `src/layout/dot/splines-flat-labeled.ts` (comment, lines 153-154)
- `src/layout/dot/splines-flat.ts` (import line 44; lines 372-376)
- `src/render/svg.ts` (comment, lines 117-119)
- `src/model/edgeInfo.ts` (comment, lines 175-177)
- `src/util/bsd-qsort.ts` (comment, line 11)
- `.agent-notes/followup-14-flat-labeled-lost.md` (one appended line)
- `plans/post-16.1-followups/README.md` (item 151 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README and overview checkboxes
- `.agent-notes/issue-137.md`

## Read-set

- `~/git/graphviz/lib/dotgen/dotsplines.c:1180-1260` (`make_flat_adj_edges`)
- `src/layout/dot/splines.ts:484-523`; `src/layout/dot/splines-label.ts:60-80,295-320`
- `src/layout/dot/splines-groups.ts:100-145`; `src/layout/dot/edge-route.ts:455-470`;
  `src/layout/dot/edge-route-rank.ts:118-137`
- `plans/post-16-1-followups-11/decision-journal.md` (T8 row)
- `.agent-notes/issue-134.md` (marker-bundle survey), `.agent-notes/issue-129.md`
  (`.mts` temp scripts)

## Interface contracts

None. No exported symbol changes. `placeRegularEdgeLabels` keeps its other callers
(`splines.ts:488,520`).

## Acceptance criteria

- Given the head tree, when grepping `src test docs` for `routeDotEdges` or
  `edge-order.ts`, then there are no hits.
- Given `makeFlatAdjEdges`, when reading it, then `dotSplines_` is followed directly by
  `gvPostprocess`, as in `dotsplines.c:1236-1240` (or, under the fallback, the call stays
  with a comment that states its mechanism and links the follow-up).
- Given any smoke id × engine × format, when rendered by base and head bundles, then the
  output is byte-identical.
- Given any corpus id that reaches `makeFlatAdjEdges`, when rendered with dot, then
  base and head are byte-identical in svg, xdot and json.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from `git archive 9466ec3f` in
`$TMPDIR/issue137-base` (symlink `node_modules`, `npm run parser:regen`,
`npm run build:js`) and the head bundle from the worktree. Copy each `dist/index.js` to
`$TMPDIR/issue137-{base,head}.mjs`, then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue137-base.mjs $TMPDIR/issue137-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue137-bytediff.json
```

Pass: every job identical. Any changed job triggers the AD-1 fallback. If one still
changes after the fallback, that is stop condition 3.

## Targeted survey

How chosen (AD-3): only `makeFlatAdjEdges` can change output. Copy the base tree to
`$TMPDIR/issue137-marker` and add `console.error('ISSUE137_FLATADJ')` as the first
statement of `makeFlatAdjEdges`. Build it and render every dot-applicable corpus input
(the list `test/corpus` uses) with dot to svg. Keep the ids whose stderr has the marker.
Also include every golden manifest input that has the marker.

For each marked id, render svg, xdot and json with the base and head bundles under dot.
Pass: base equals head byte for byte on every row. Also run native (`/tmp/ghl`) and
journal how many rows equal native (structural, the corpus comparator). The count must
be the same for base and head, which it is if base equals head. Journal the marked ids,
the row count, and any rows native did not finish.

## Observability

N/A: comments and an output-neutral call removal.

## Rollback

Reversible: revert the commit.
