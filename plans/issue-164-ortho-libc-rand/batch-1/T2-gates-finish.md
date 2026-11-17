# T2: gates, survey, comments, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts. Gate 2's passed
count moves by design: two `SEED` tests go, AD-3's new tests come in.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue164-head.mjs`. Base: `git archive <base>` under
`$TMPDIR`, with `node_modules` symlinked, then `npm run parser:regen`,
`npm run build:js`, and copy to `$TMPDIR/issue164-base.mjs`. Then, at load
below 12:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue164-base.mjs $TMPDIR/issue164-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue164-bytediff.json
```

**Expected at planning: exactly 4 changed jobs, all `2643|twopi|{svg,xdot,plain,json}`.**
`2643` is the only smoke id that sets `splines=ortho`, and the reach bytediff
moved only its twopi rows (cmapx unchanged). Judge them with
[engine-compare.sh](../harness/engine-compare.sh) (the survey below covers
them):

- svg, xdot, plain: `head~native:0` (were 4, 8, 4).
- json: 18 → 2 diff lines, `toward:ok`. The 2 left are `"name": ""` against
  native's `"name": "%1"`, issue #185, which predates this mission. The row is
  `diverged` in `json-parity-twopi.json`, not accepted, so it is a
  **toward-native change** under the queue rules: list it in the report with
  18 → 2.

Any other changed job, or a different set, is a halt unless it equals native:
diagnose which id and which ortho call reached it.

## Targeted survey (gate 6)

**How the inputs were chosen.** The change alters behaviour only where ortho
runs: `splines=ortho`, under an engine that routes edges (dot, neato, fdp,
sfdp, circo, twopi, osage; patchwork does not). Every applicable corpus id
whose file sets `splines=ortho` (23) × those 7 engines is the reach
([harness/reach-ids.txt](../harness/reach-ids.txt), 805 jobs). The 8 goldens
that set it are added.

Two steps, both at load below 12:

1. **Reach, port only.**
   `BD_LANES=4 npx tsx test/tools/bytediff.ts $TMPDIR/issue164-base.mjs
   $TMPDIR/issue164-head.mjs plans/issue-164-ortho-libc-rand/harness/reach-ids.txt
   $TMPDIR/issue164-reach.json`. **Pass:** the `diffs` list equals
   [planning-reach-bytediff.txt](../harness/planning-reach-bytediff.txt)'s (39
   jobs), and the capped list is the same 50 `2783`/`2784` non-dot jobs, OOM on
   both sides. Then the 8 goldens with `BD_ENGINES=dot ... --file <input>`: 0
   changed jobs.
2. **Native.**

   ```
   LANES=3 bash plans/issue-164-ortho-libc-rand/harness/engine-compare.sh \
     $TMPDIR/issue164-base.mjs $TMPDIR/issue164-head.mjs \
     plans/issue-164-ortho-libc-rand/harness/survey-list.txt $TMPDIR/issue164-survey \
     > plans/issue-164-ortho-libc-rand/harness/execution-survey.txt
   ```

   **Pass:** `diff planning-survey.txt execution-survey.txt` is empty (95
   lines). In it:

   | rows | base → head |
   |---|---|
   | circo `1880` | svg 40, xdot 66, plain 20 → 0; json 290 → 2, cmapx 22 → 2 (`toward:ok`; #185, and #175's `-0`) |
   | circo `1990` | svg 16, xdot 24, plain 8, json 142 → 0; stderr equal to native |
   | twopi `2168_5`, `2183`, `2643` | svg, xdot, plain, json → 0, except json `2168_5` 10 → 2, `2643` 18 → 2 (#185) |
   | dot `2783` | svg 12, xdot 16, plain 6 → 0, json 24 → 2 (#185); stderr 0 → native's two trapezoid failure lines |
   | osage `2783` | output unchanged; stderr 0 → native's two lines |
   | circo `1447`, `1658` | native crashes (rc 139); port output changes, `toward:FAIL` against native's empty output (see below) |
   | every other row | `base=head:y` |

**Native-crash rows.** On circo `1447` and `1658` native 16.1.1 exits 139, so
there is no native output to move toward. `1447` crashes in native 16.1.0 too
(the crash is not this change's); `1658` renders in 16.1.0 and crashes in 16.1.1
(the #147 finding: NULL `dtmatch` in `chanSearch`). These rows pass when native
still exits 139 and the line equals the planning line (the head output is
deterministic). List both in the report under "native-crash rows". Recording
them is the maintainer's (decisions AD-6).

## Comments

1. On #164: the outcome; `b99490ece`; the survey table above; the C harness
   proof (port equals 16.1.1's `partition()` on 10 cases); the native-crash rows;
   the native heap overflow (AD-5), follow-up #239.
2. On #148: #164 is on the branch; `2783` under dot now equals native 16.1.1
   (stderr included, json up to #185), as that issue's comment predicted.

## Finish

1. Journal rows for every gate; README batch status and Summary, with
   "toward-native changes" (the json/cmapx rows above, with their counts) and
   "native-crash rows".
2. One row in `plans/decision-journal.md`. Write `.agent-notes/issue-164.md` for
   anything novel. Candidates: native's UB on degenerate cells (AD-5), and that
   bytediff's whole-output compare catches stderr-only changes that a
   drawing compare misses (osage `2783`).
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-164.md`.
4. Delete `.plan-mission-progress.md` if it is still present.
5. `git tag issue-164/pre-squash`, `git reset --soft <base>`, and one commit with
   the README's message.

## Write-set

Journals, README status/summary, `harness/execution-survey.txt`,
`plans/decision-journal.md`, `.agent-notes/issue-164.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the smoke ids, then
  exactly the 4 `2643|twopi` jobs differ, 3 equal to native and json 18 → 2
  `toward:ok`.
- Given the reach ids, when bytediff runs, then the changed and capped sets
  equal the planning record.
- Given the survey list, when `engine-compare.sh` runs, then its output equals
  `planning-survey.txt`.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #164`, and the tag
  `issue-164/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
