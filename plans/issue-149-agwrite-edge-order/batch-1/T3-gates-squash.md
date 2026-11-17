# T3: gates 1-6, journal, squash

## Steps

1. **Gates 1-4** (README table). Record each in the journal.
2. **Gate 5** ([bytediff](#bytediff)) and **gate 6** ([targeted survey](#targeted-survey)).
   Check `uptime` first. Above 12, wait.
3. **Finish** (README, "Branch and commits"):
   - Update the README batch status, the overview checkboxes, and a
     `## Summary (<date>)` section at the end of the README, in the shape of
     `plans/issue-173-ranksep-int-division/README.md`'s.
   - Add the project journal row to `plans/decision-journal.md`.
   - Write `.agent-notes/issue-149.md` only if something was novel.
   - Commit the journal (`docs(T3): ...`), then tag `issue-149/pre-squash`,
     `git reset --soft <base>`, and make one commit.
   - Comment the result on #149: gates, the ids gate 6 moved (for the
     maintainer's survey, AD-5), and any accepted-row or toward-native changes.

## Bytediff

Queue rules, gate 5, with `dot` added to the formats, since `bytediff.ts`
leaves it out by default:

```
BD_FORMATS=svg,dot,xdot,json,plain,cmapx npx tsx test/tools/bytediff.ts \
  $TMPDIR/i149/base.mjs $TMPDIR/i149/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i149-smoke.json
```

Expected: every `svg`, `json`, `plain` and `cmapx` job is identical. A change
in one of those formats is stop condition 5: agwrite writes none of them. For
each changed `dot`/`xdot` key `<id>/<engine>/<fmt>`, run `compare.mjs` on
`<id>:<engine>`. Each changed row must be `eq` or `toward`, and each
`sortEq=yes` row must be `eq`. In the report, list `toward` rows under
"toward-native changes" with their native-missing line counts on base and
head. A capped job (TIMEOUT/OOM/CRASH) on both sides is not a change. Journal
the capped jobs.

## Targeted survey

The change reaches every `-Tdot`/`-Txdot` render with edges, so the selection
targets the two behaviours that can move bytes:

1. **Marker scan, no native.** Build a marker bundle from a `$TMPDIR` copy of the
   head. At the end of `writeBody`, compute the order the base would have
   written (each edge after its tail node, behind the old `edgeLW` test), and
   print to stderr `I149 R` when the body's edge order differs, and `I149 D` when
   the old code would have re-declared an edge that `edgesDone` now skips.
   Copy `plans/issue-173-ranksep-int-division/harness/mark.mjs` to this
   mission's `harness/mark.mjs`. Set its `ROOT` to `ORACLE_CORPUS_ROOT` from
   `test/corpus/oracle-paths.mjs`, and the job to `-Kdot -Tdot`, with a 45 s
   cap. Run it on the applicable corpus and golden ids (per
   `.agent-notes/issue-130.md`, about 3 minutes at normal load).
2. **Selection:** every `D` id, the 11 witnesses, and up to 30 `R` ids: the 30
   smallest inputs by byte size, one per distinct input file. Add one id per
   non-dot engine from the smoke list that changed in gate 5, as `<id>:<engine>`.
3. **Compare** with `compare.mjs` (`-Tdot` and `-Txdot`) for every selected id.

Journal the selection rule, the marker counts (`R`, `D`, capped), and the
result table. Pass: no `AWAY` row, and every `sortEq=yes` row is `eq`. A `D` id
that is not `eq` but has `sortEq=no` must be `toward`: its other differences
predate the mission.

## Write-set

- `plans/issue-149-agwrite-edge-order/harness/mark.mjs` (new)
- `plans/decision-journal.md`, this mission's `decision-journal.md`, `README.md`
  and `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-149.md` (only if novel)

## Observability / rollback

Observability: N/A. Rollback: Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the final head, when gates 1-4 run, then each passes as the README table
  says.
- Given the smoke bytediff with `dot` included, then only `dot`/`xdot` outputs
  change, and every changed row is `eq` or `toward`.
- Given the targeted survey, then no row is `AWAY`, and every `sortEq=yes` row
  is `eq`.
- Given the finished mission, when `git log <base>..` is listed, then there is
  exactly one commit, with footer `Refs: #149`, and tag `issue-149/pre-squash`
  holds the per-task history.
