# T2: gates, survey, comments, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue161-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, with `node_modules` symlinked, then `npm run parser:regen`,
`npm run build:js`, and copy to `$TMPDIR/issue161-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue161-base.mjs $TMPDIR/issue161-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue161-bytediff.json
```

**Expected at planning: 0 changed jobs.** No smoke id reaches a marker in either
detector (README, Evidence). A changed job means the change reached further than
planned. Diagnose it (which guard fired, on which node) and halt unless it
equals native.

## Targeted survey (gate 6)

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
a guard changes behaviour only on a node with no out edge, so the reach is the
set of ids where one meets a guarded site. Two detectors ran over all 982
applicable ids (`-Kdot -Tplain`, 60 s cap):

- native: [harness/detector-native.sh](../harness/detector-native.sh) with the
  plugin from [harness/build-native.sh](../harness/build-native.sh), which marks
  each 16.1.1 guard where it changes the outcome;
- port: [harness/detector.sh](../harness/detector.sh) with a bundle of the base
  plus [harness/detector.patch](../harness/detector.patch) (= the cf plus
  markers), which marks every port site AD-1 and AD-2 touch, and every chain the
  cf still declines.

Their hits are in [harness/detector-hits.txt](../harness/detector-hits.txt), and
the ids that did not finish are in
[harness/detector-nonzero.txt](../harness/detector-nonzero.txt). Optionally
(push-forward), re-run the port detector on the head with the markers re-applied
to confirm the reach. That is not required: the head's code is the cf's.

Run, at load below 12 (native renders):

```
bash plans/issue-161-no-out-edge-guards/harness/native-compare.sh \
  $TMPDIR/issue161-base.mjs $TMPDIR/issue161-head.mjs \
  plans/issue-161-no-out-edge-guards/harness/survey-ids.txt $TMPDIR/issue161-survey
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) line for line,
apart from its header lines. Also, stderr of the base and the head is identical
on every survey id
(`node test/tools/bd-job.ts <bundle> <file> dot svg 2>&1 | sed -n '/--stderr--/,$p'`).
Any other difference: diagnose it, and halt unless it equals native.

## Comments

1. On #161: the outcome; the per-guard mapping (C site, port site, upstream
   sha); the survey table; that `2765`/`2765_1` output does not change (equal to
   native before and after, json apart from #185); and the dead-end values that
   now match native.
2. On #148: #161 is on the branch, and `2765`/`2765_1` keep their verdicts.

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. Write `.agent-notes/issue-161.md`
   for anything novel. Candidate: concentration can leave an orig edge's
   `to_virt` chain ending at an orphan vnode, outside every rank's
   `v[0..n)`, and C still routes to it.
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-161.md`.
4. `git tag issue-161/pre-squash`, `git reset --soft <base>`, and one commit
   with the README's message.

## Write-set

Journals, README status/summary, `plans/decision-journal.md`,
`.agent-notes/issue-161.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the 49 smoke ids,
  then 0 jobs differ.
- Given the survey ids, when `native-compare.sh` runs, then its output equals
  `planning-survey.txt` apart from the header, and stderr is unchanged.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #161`, and the tag
  `issue-161/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
