# Mission: issue #195: a record node with an html-like label is sized as native sizes it

## Objective

On `digraph { n [shape=Mrecord, label=<{ <TABLE BORDER="0"><TR><TD>abc</TD><TD>defgh</TD></TR></TABLE>|<TABLE BORDER="0"><TR><TD>second</TD></TR></TABLE> }>] }`
native gives `bb="0,0,81.304,66.6"`, `width=1.1292` and `height=0.925`, with
nothing on stderr. The port gives the default 0.75 x 0.51389 and prints
`Warning: no value for width of ASCII character 1`. For a record node, C's
`make_label` takes its `is_record` branch (`lib/common/labels.c:139-144`): raw
text, `html` set, nothing measured. `parse_reclbl` then builds each field as
an html label (`lib/common/shapes.c:3444`). The port measures the whole
marked value as plain text (`src/common/record.ts:418-422`) and builds every
field with `html` false (`:148`). The full diagnosis, with what was ruled
out, is in [decisions.md](decisions.md#mechanism-planning-s-diagnosis).

Planning reproduced it against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **Probe matrix** (14 in-scope probes × dot, neato, osage × dot, xdot,
  json, svg body, plain, stdout and stderr): base 0/210 equal native,
  prototype 210/210. The four `oos-*` probes still differ, for the issues
  named in AD-3 ([harness/survey.md](harness/survey.md)). Three `-Tdot` rows
  of `oos-bad-format` equalled native on base only by accident and differ on
  the head (one `rects` value): that is #287, exposed (AD-1 consequences).
- **Gates on the prototype:** typecheck clean; `npm test` 613 files, 15334
  tests; `gates.sh` 5/5; corpus and docs 27 files, 2887 tests.
- **Bytediff:** smoke and the targeted survey, in
  [decision-journal.md](decision-journal.md) rows 2 and 3.

Done means the issue's criterion: the repro's node size, `bb` and stderr
equal native under dot and osage, and the mechanism is stated. AD-1 does it,
and AD-2's tests pin it. The same change fixes #218 (its probe and
`graphs/b545.gv` are in the matrix). Type `fix`.

**Out of scope:** #269 (`bad label format`), and the three follow-ups filed at
planning: #287 (html `\N`), #288 (emit state after an empty label), #289
(record default label). See AD-3.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-record-html-label.md](batch-1/T1-record-html-label.md). Check
   finished work with `git log --oneline 6da5d4e1..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `6da5d4e1a3c4bbd7877181d1873f35a81d075026` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the probe matrix on it (T1 step 5), and journal it.
- Per-task commits while working: first `docs(mission): add issue-195 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-195/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(common): size a record's html-like label field by field

  <two to four lines: make_label's is_record branch keeps the raw text,
  sets html and measures nothing; parse_reclbl builds each field with
  lbl->html. The port measured the marked value whole and built plain
  fields, so the parse fell back to \N and warned about ASCII 1>

  Refs: #195, #218
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; the new file passes |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1 step 7](batch-1/T1-record-html-label.md#steps) | equals journal row 2 |
| 6 | Targeted survey | [T1 steps 5, 8](batch-1/T1-record-html-label.md#steps) | probe tally as planning's; survey equals journal row 3 |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(neato, osage). `harness/probe.ts` runs `oraclePreflight` for both. A missing
`config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gate 5, gate 6 and the matrix,
and wait if it is above 12.

Baseline at planning: [decision-journal.md](decision-journal.md) row 0.

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-record-html-label.md#write-set)
   must change, or `record.ts` must grow past 521 lines. Journal why and stop.
2. On the base (T1 step 3), the new test's failures differ from AD-2's
   consequences. The test does not reach the defect: journal and stop.
3. The probe matrix (T1 step 5) differs from the planning prototype's in any
   row, or gates 5 and 6 show a diff key planning did not classify, or a job
   capped twice. Diagnose it and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs #269, #287, #288 or #289 fixed (a
   brief error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names and structure inside `record-html-label.test.ts`, provided
  AD-2's checks are all there.
- More probes in `harness/probes/` for a path the matrix does not reach. Run
  them on base and head, and recapture their fixtures. A new non-equal head
  row that is also non-equal on the base, with the same diff, predates this
  mission: file a `follow-up` issue and name it `oos-*`. Any other new row is
  stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-3, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-record-html-label.md](batch-1/T1-record-html-label.md) | fixtures, tests, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe and corpus selection, planning results |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the test's native fixtures; planning's copies |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6's bytediff ids (every corpus input with a record) |
| [harness/results/](harness/results/) | planning TSV (base and prototype columns) |
| [harness/prototype.diff](harness/prototype.diff) | the prototype with its tests, reverted |
| [diagrams/data-flow.md](diagrams/data-flow.md) | a record label, attribute to output |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  origin, fix, files, gates, matrix counts, accepted-row changes and
  toward-native changes (as journal rows 2 and 3 classify them).
- Write `.agent-notes/issue-195.md` (novel). A record's `ND_label` is
  unmeasured raw text in C, and only its fields are measured, so any warning
  from measuring a record label whole is a port artifact (#218). The port's
  html marker `\u0001` is a control character, so a code path that measures
  a marked value prints `ASCII character 1`. That message is a marker leak,
  never a font problem. `poly-gencode.ts:renderLabel` is text-only: emit an
  html-capable label through `renderOneLabel`. From planning: `bytediff.ts`
  throws on a manifest id whose status is not `applicable` (filter id lists
  first). The 500-line write hook compares against the file's line count at
  `HEAD`, so an already-oversized file may be edited only without growing.
- On #218, comment that the #195 change fixes it, giving the mechanism (step 1)
  and the two probe rows. The issue closes when the branch merges.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-23)

- **Tasks:** 1 of 1 (T1). Base `6da5d4e1`, unmoved since planning.
- **Decisions:** journal rows 6-14; one flagged for review (row 10, #291).
- **Gates:** 1-4 green (613 files, 15334 tests; `gates.sh` 5/5; corpus and
  docs 2887). Gate 5: 2352/2352 identical. Gate 6: 924 identical, 18 diffs
  (all toward native, as row 3), 24 capped on both bundles (as row 4).
- **Probe matrix:** in-scope 210/210 equal native (base 0); every planning
  row equals `results/probe-prototype.tsv`.
- **Open:** #291 (`needs-ruling`): on an html record with `URL`/`tooltip`
  and table `HREF`s, the cell anchors now drawn show #250 and #253 (probes
  `oos-anchor-url`, `oos-anchor-tooltip`, svg and cmapx only). #269, #287,
  #288 and #289 stay out of scope (AD-3).
