# T2: gates, survey, follow-up, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue160-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, `node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`, copy to `$TMPDIR/issue160-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue160-base.mjs $TMPDIR/issue160-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue160-bytediff.json
```

**Expected at planning: 0 changed jobs.** No smoke id has an empty rank at any
guard site: the planning detector hit only `2759` and `2759_1`, and neither is a
smoke id. Any changed job: diagnose it (which guard fired, through which empty
rank). Halt unless it equals native.

## Targeted survey (gate 6)

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
a guard changes behaviour only when the rank it reads is empty, so the reach is
the set of ids where an empty rank meets one of the five sites. The planning
detector ([harness/detector.sh](../harness/detector.sh) with
[harness/detector.patch](../harness/detector.patch), all 982 applicable ids,
`-Kdot -Tplain`, 60 s cap, 4 lanes) hit `2759` and `2759_1` only, each with
`P160LR0`, `P160SIZEY below` and `P160YC`
([harness/detector-hits.txt](../harness/detector-hits.txt)). 17 ids did not
finish (16 hit the cap; `1864` exits 1 on the base too); they are listed in
[harness/detector-nonzero.txt](../harness/detector-nonzero.txt), and none is a
smoke id. `2761` and `2761_1` are quarantined (`oracle-crash`): there the port
throws at `setYcoordsCopy` on base and cf alike, the unguarded copy loop where
native 16.1.1 crashes as well (AD-1, rejected option 2).

Optionally (push-forward), re-run the detector on the head with the markers
re-applied to confirm the reach. That is not required: the head's code is the
cf's.

Run, at load below 12 (native renders):

```
bash plans/issue-160-empty-rank-guards/harness/native-compare.sh \
  $TMPDIR/issue160-base.mjs $TMPDIR/issue160-head.mjs \
  plans/issue-160-empty-rank-guards/harness/survey-ids.txt $TMPDIR/issue160-survey
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) line for line,
apart from its two header lines: svg, xdot, plain and cmapx at
`head~native:0`, and json at `head~native:31 toward:FAIL a=1 b=0` for both ids.
The json residual ([AD-3](../decisions.md#ad-3-how-equals-native-is-judged)):
the one head line not in native is #185's root `"name": ""`, and the native
lines the head lacks are the cluster's `_draw_` and `"bb"` (the follow-up
below). Check that by reading the diff
(`diff $TMPDIR/issue160-survey/2759.json.native $TMPDIR/issue160-survey/2759.json.head`).
Any other difference: diagnose it, and halt unless it equals native.

## Follow-up, comments

1. File [harness/followup-json-cluster-bb.md](../harness/followup-json-cluster-bb.md)
   (strip the leading HTML comment) with
   `gh issue create --label bug --label follow-up --title "json: a cluster
   inside an anonymous subgraph after an edge loses bb and _draw_"`. If the
   create is denied, journal it and put the text's path in the report. Don't
   halt on that.
2. Comment on #230: `2759` and `2759_1` json are the same case its "base threw"
   rows describe, with the counts from gate 6 and the follow-up's number.
3. Comment on #160: outcome; the survey table; `2759`/`2759_1` for the
   maintainer's survey (port-error → equal to native in svg, xdot, plain and
   cmapx; json as above) (AD-4).
4. Comment on #159: #160 is on the branch. Its own scan's empty rank -1 now
   reaches the `dotComputeBb` and `sizey` guards (probes `a.gv` and `b.gv` in
   the #159 comment).

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. `.agent-notes/issue-160.md` for
   anything novel (candidate: empty ranks are `v[0] === null` or `undefined`
   depending on the path, so the guards use `== null`).
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-160.md`.
4. `git tag issue-160/pre-squash`, `git reset --soft <base>`, one commit with
   the README's message.

## Write-set

Journals, README status/summary, `plans/decision-journal.md`,
`.agent-notes/issue-160.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the 49 smoke ids,
  then 0 jobs differ.
- Given the survey ids, when `native-compare.sh` runs, then its output equals
  `planning-survey.txt` apart from the header.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #160`, and the tag
  `issue-160/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
