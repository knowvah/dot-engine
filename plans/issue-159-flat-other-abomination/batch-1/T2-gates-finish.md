# T2: gates, survey, follow-up, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue159-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, `node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`, copy to `$TMPDIR/issue159-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue159-base.mjs $TMPDIR/issue159-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue159-bytediff.json
```

**Expected at planning: 0 changed jobs.** No smoke id carries a detector marker
that changes behaviour (`P159ABOM new` or `P159GROUP`; README Evidence). Any
changed job: diagnose it (which of AD-1 to AD-3 moved it). Halt unless it
equals native or passes a queue-rule exception.

## Targeted survey (gate 6)

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
the change alters output only where the new abomination fires (`P159ABOM new`)
or a self-loop group splits (`P159GROUP`). The planning detector
([harness/detector.sh](../harness/detector.sh) with
[harness/detector.patch](../harness/detector.patch), all applicable ids,
`-Kdot -Tplain`, 60 s cap, 3 lanes) found those ids
([harness/detector-hits.txt](../harness/detector-hits.txt)); `P159ABOM both`
ids (abomination on base and head) are added as controls. Ids that did not
finish are in [harness/detector-nonzero.txt](../harness/detector-nonzero.txt).

Run, at load below 12 (native renders):

```
bash plans/issue-159-flat-other-abomination/harness/native-compare.sh \
  $TMPDIR/issue159-base.mjs $TMPDIR/issue159-head.mjs \
  plans/issue-159-flat-other-abomination/harness/survey-ids.txt $TMPDIR/issue159-survey
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) line for line,
apart from its two header lines (the planning run used the cf bundle as head):
every job `base=head:y`; svg, xdot, plain and cmapx `head~native:0`; json
`head~native:31` on `2759`/`2759_1` (#185's root name and #231's cluster `bb`
and `_draw_`), `:2` on `2870_0`, `2870_1`, `2723`, `2851` (#185), `:0` on the
rest. `2723` keeps `native-rc=1`. The empty rank -1 changes no corpus output:
that is the expected result, not a missed effect. Save the run as
`harness/execution-survey.txt`. Any other line: diagnose it, and halt unless it
equals native or passes a queue-rule exception.

## Follow-up, comments

1. File [harness/followup-selfloop-ports.md](../harness/followup-selfloop-ports.md)
   (strip the leading HTML comment) with `gh issue create --label bug --label
   follow-up --title "dot: a ported self-loop beside an unported one is routed
   unlike native"`. Re-run `probe-g5.gv` on base and head first and put
   the measured counts in. If the create is denied, journal it and put the
   text's path in the report. Don't halt on that.
2. Comment on #159: outcome; the survey table; ids for the maintainer's survey.

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. `.agent-notes/issue-159.md` for
   anything novel (candidate: C's `free_matrix` leaves `GD_rank(g)[r].flat`
   non-null, and C code reads that pointer as a flag).
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-159.md`.
4. `git tag issue-159/pre-squash`, `git reset --soft <base>`, one commit with
   the README's message.

## Write-set

Journals, README status/summary, `harness/execution-survey.txt`,
`plans/decision-journal.md`, `.agent-notes/issue-159.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the 49 smoke ids,
  then every changed job equals native or passes a queue-rule exception
  (expected: 0 changed).
- Given the survey ids, when `native-compare.sh` runs, then its output equals
  `planning-survey.txt`.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #159`, and the tag
  `issue-159/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
