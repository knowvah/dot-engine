# T4: gates, survey, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished),
copy `dist/index.js` to `$TMPDIR/issue158-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, `node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`, copy to `$TMPDIR/issue158-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue158-base.mjs $TMPDIR/issue158-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue158-bytediff.json
```

Expected at planning: the dot jobs of `2521`, `2592` and `graphs-shells` change
(5 formats each, cmapx may stay identical); nothing else, and no other engine.
Each changed job must equal native under
[AD-6](../decisions.md#ad-6-how-equals-native-is-judged): run
`harness/native-compare.sh` on those ids. Planning (cf): all three equal native
in svg, xdot, plain and cmapx; `2592` json differs only by #185's root name, a
line the base has too (toward-native exception). Any other changed job: diagnose,
and halt unless it equals native or meets an exception.

## Targeted survey (gate 6)

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt),
45 ids):

- the issue's 35 ids, measured by #147 as moved by this upstream change, plus
  `2854_1` and `2855` (native no longer hangs);
- `2723`, `2756`, `2756_1`: the port threw on the base; the planned head
  renders them;
- the planning detector's reach ([harness/detector.sh](../harness/detector.sh)
  over all 982 applicable ids, `-Tplain`, 60 s cap): `P158MOVE` on the base (a
  rank AD-1 skips where the base's `flat_reorder` moved a node or reversed an
  edge) hit 42 ids, the issue's 34 plus `1472`, `2723`, `2756`, `2756_1`,
  `2759`, `2759_1`, `2781`, `2781_1`; `P158SORT` hit `700813` only, and only
  with AD-1 in. Per-id status:
  [detector-status-base.txt](../harness/detector-status-base.txt),
  [detector-status-cf.txt](../harness/detector-status-cf.txt). 18 ids did not
  finish on one run or both (17 hit the cap, `1864` exits 1 on both; listed
  there); none is a smoke id.

Run, at load below 12 (native renders):

```
bash plans/issue-158-flat-reorder-valid-rank/harness/native-compare.sh \
  $TMPDIR/issue158-base.mjs $TMPDIR/issue158-head.mjs \
  plans/issue-158-flat-reorder-valid-rank/harness/survey-ids.txt $TMPDIR/issue158-survey
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) (the planned head
at planning) line for line, apart from its two header lines. There, every job
with `base=head:n` has `head~native:0` or `toward:ok`, except the residuals
[AD-6](../decisions.md#ad-6-how-equals-native-is-judged) names:

- `1472`: run `python3 plans/issue-158-flat-reorder-valid-rank/harness/rankorder.py`
  on `$TMPDIR/issue158-survey/1472.plain.{base,head,native}`. Planning:
  `ranks 5 base-differs 4 head-differs 3 newly-differs []`.
- `2781`, `2781_1` (and `1314`, unchanged): native's #162 failure.
- `2723`, `2756`, `2756_1` json (`toward:FAIL a=1`): the base threw; the one
  differing line is #185's root `"name"`.

A line that differs from the planning table: diagnose it; halt unless it equals
native or meets an exception. List every exception row in the report, with its
counts, under "toward-native changes".

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. `.agent-notes/issue-158.md` for
   anything novel (candidates: valid_rank skips every rank with a constraining
   flat edge; the group-order rule).
3. Comment on #158: outcome, ids moved (survey table), and AD-5's list for the
   maintainer's survey. Comment on #159: `2723`, `2756`, `2756_1` now render and
   equal native after #158, so its measured ids need re-checking.
4. Write-set check: `git diff --name-only <base>` lists only the four task
   write-sets, this directory and `plans/decision-journal.md`.
5. `git tag issue-158/pre-squash`, `git reset --soft <base>`, one commit with
   the README's message.

## Write-set

Journals, README status/summary, `plans/decision-journal.md`,
`.agent-notes/issue-158.md`.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
