# T2: gates, survey, comments, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts. Gate 2's passed
count rises by T1's new tests (planned: 9).

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue165-head.mjs`. Base: `git archive <base>` under
`$TMPDIR`, with `node_modules` symlinked, then `npm run parser:regen`,
`npm run build:js`, and copy to `$TMPDIR/issue165-base.mjs`. Then, at load
below 12:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue165-base.mjs $TMPDIR/issue165-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue165-bytediff.json
```

**Expected at planning: 0 changed jobs, 0 capped beyond the base's own.** The
planning probe (below) ran every smoke id under all 8 engines with the
instrumented head, and none reached a comparison whose outcome the tolerance
changes. Layout does not depend on the output format, so no format can differ.
Any changed job is a halt unless it equals native: find which comparison it
reached with the instrumented bundle.

## Targeted survey (gate 6)

**How the inputs were chosen.** The change can alter output only inside
`splineintersectsline`, reached from `Proutespline`: every dot edge route, and
neato, fdp, sfdp, circo, twopi and osage when `splines=true|spline` (patchwork
does not route). So the probe set
([harness/probe-ids.txt](../harness/probe-ids.txt)) is every applicable corpus
id whose file sets `splines=true|spline|yes|compound` (30) under those 7
engines, plus the 49 smoke ids under all 8: 602 svg jobs. A job "reaches" the
change when an instrumented head
([harness/instrument.patch](../harness/instrument.patch): a `console.error`
whenever `eq` and `===` disagree at any of the three sites) prints a line.

Three steps, at load below 12:

1. **Reach probe (port only).** On the head, `git apply
   plans/issue-165-sil-tolerance/harness/instrument.patch`, `npm run build:js`,
   copy to `$TMPDIR/issue165-instr.mjs`, then `git apply -R` the same patch
   (check `git status`: clean apart from the mission's files). Run
   `BD_FORMATS=svg BD_LANES=4 npx tsx test/tools/bytediff.ts
   $TMPDIR/issue165-base.mjs $TMPDIR/issue165-instr.mjs
   plans/issue-165-sil-tolerance/harness/probe-ids.txt $TMPDIR/issue165-probe.json`.
   **Pass:** 602 jobs, the sorted `diffs` equal
   [planning-probe.txt](../harness/planning-probe.txt) (`2168|circo|svg`,
   `2168|fdp|svg`, `2168_2|fdp|svg`), 0 capped, and in each of the three saved
   diff pairs (`issue165-probe.json.d/<n>.{a,b}.txt`) the svg before
   `--stderr--` is identical: only `ISSUE165 coeff` lines differ (near-vertical
   barriers with x-extent 7.1e-15 and 1.4e-14).
2. **Reached jobs, all formats (port only).**
   `printf '2168 circo,fdp\n2168_2 fdp\n' > $TMPDIR/issue165-hit.txt` and
   bytediff base against head over it. **Pass:** 15 jobs, 15 identical (the
   planning run of base against the counterfactual gave this).
3. **Native.**

   ```
   LANES=3 bash plans/issue-165-sil-tolerance/harness/engine-compare.sh \
     $TMPDIR/issue165-base.mjs $TMPDIR/issue165-head.mjs \
     plans/issue-165-sil-tolerance/harness/survey-list.txt $TMPDIR/issue165-survey \
     > plans/issue-165-sil-tolerance/harness/execution-survey.txt
   ```

   **Pass:** `diff <(grep -v '^#' harness/planning-survey.txt)
   harness/execution-survey.txt` is empty (15 lines), and every line reads
   `base=head:y`. At planning, every svg, xdot, plain and cmapx line equals
   native (`head~native:0`); each json line has 2, the `"name": ""` against
   native's `"name": "%1"` of #185, which predates this mission.

Why nothing in the corpus moves: on those three jobs the near-vertical barrier
takes `silGeneral` on the base and `silXzeroYnonzero` on the head, and both give
the same inside/outside answer for every candidate spline. This matches #147's
measurement (no verdict change from `d3ab9ba47`). The change is observable only
on T1's synthetic inputs, where the head equals native 16.1.1.

## Comments

1. On #165: the outcome; `d3ab9ba47`; the C harness proof (port equals 16.1.1's
   `Proutespline` on 48 cases and its `splineintersectsline` on 17, roots to
   1e-15, AD-3); the corpus reach (3 jobs, no output change); the libm note
   (AD-3).
2. On #148: #165 is on the branch; no corpus output changed.

## Finish

1. Journal rows for every gate; README batch status and Summary, with
   "toward-native changes: none" and "accepted-row changes: none" unless the
   gates found otherwise.
2. One row in `plans/decision-journal.md`. Write `.agent-notes/issue-165.md` for
   anything novel. Candidates: solve3's roots differ from the oracle's in the
   last bit through libm `acos`/`cbrt` (AD-3), and a C harness can `#include`
   `route.c` to call its static functions, but must be compiled with the
   oracle's `-O3` so clang's fp-contract matches (an `-O0` build gave different
   `points2coeff` bits).
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-165.md`.
4. Delete `.plan-mission-progress.md` if it is still present.
5. `git tag issue-165/pre-squash`, `git reset --soft <base>`, and one commit with
   the README's message.

## Write-set

Journals, README status/summary, `harness/execution-survey.txt`,
`plans/decision-journal.md`, `.agent-notes/issue-165.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the smoke ids, then
  no job differs.
- Given the instrumented head, when the probe runs, then exactly the three
  planning jobs print `ISSUE165` lines and their svg is unchanged.
- Given the survey list, when `engine-compare.sh` runs, then its output equals
  `planning-survey.txt`.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #165`, and the tag
  `issue-165/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
