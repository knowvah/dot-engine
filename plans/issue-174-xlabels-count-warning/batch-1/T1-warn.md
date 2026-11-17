# T1: red stderr tests, the warning, gates, squash

## Context

`runPlacement` (`src/common/xlabels-place.ts:448-464`) is the port of
`addXLabels`' body: count slots, build the arrays, `placeLabels`, then
`writeBackLabels` (`xlabels-place.ts:422-432`). C counts the placed labels in
that last loop and warns when any is left (`postproc.c:569-587`). T1 adds the
count and the warning (AD-1), without the `Verbose` line (AD-2) and without
any stored state (AD-3).

## Steps

1. **Red.** Add `src/common/xlabels-count-warning.test.ts` (AD-4). Inline the
   six probe sources from `../harness/probes/` and, per engine, native's
   stderr from `../harness/native/<probe>.<engine>.err` as constants, with a
   provenance comment (native 16.1.1, `-K<engine> -Tdot`, the plugin dir,
   captured 2026-11-17). One case per probe × engine except
   `headtail`/twopi (comment: #244). Reset `agseterrf(null)` in `afterEach`.
   Run on the base: the 12 warning cases fail (13 minus `headtail`/twopi), the
   35 silent ones pass. Journal it.
2. **Green.** In `xlabels-place.ts`: `writeBackLabels` returns the number of
   labels with `set`; `runPlacement` calls
   `agwarningf(\`${cnt} out of ${nLbls} exterior labels positioned.\`)` when
   `cnt !== nLbls`. Import `agwarningf` from `./agerr.js`. Extend the doc
   comments with `@see lib/common/postproc.c:addXLabels (569-587)` and AD-2's
   "Not ported" note. The file must stay under 500 lines. Run the new tests:
   all 47 pass.
3. **Check every probe.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js`). From the brief directory run
   `node harness/compare.mjs <base.mjs> <head.mjs> harness/probes/*.gv`
   (all eight engines, `dot,xdot`). Every `headErr` must be `same` except
   `headtail`/twopi, and `head` must equal `base` in every row. For
   `headtail`/twopi, confirm head stderr is exactly
   `Warning: 3 out of 12 exterior labels positioned.` and journal it against
   #244 (stop condition 3).
4. **Gates 1-6** (README). Record each in the journal.
5. **Diagnosis row.** Journal the artifact. Mechanism, origin
   (`postproc.c:581-587`; port `xlabels-place.ts:422-432` and `:463` on the
   base), causal chain, and ruled out: placement (stdout equal on 47 of 48
   cases, and on the one that is not, the difference is #244's placement, not
   the count), the aux graph (`repro`/dot warns once on both sides after the
   fix), a once-flag (C has none).
6. **Finish** (README, "Branch and commits"): tag, soft reset, one commit.

## Write-set

- `src/common/xlabels-place.ts` (`writeBackLabels` returns the count;
  `runPlacement` warns; doc comments)
- `src/common/xlabels-count-warning.test.ts` (new)
- `plans/issue-174-xlabels-count-warning/harness/extra/` (new probes, only if
  push-forward needs them)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and the summary)
- `.agent-notes/issue-174.md` (only if novel)

## Interface contracts

`writeBackLabels(gp: Graph, lbls: XLabelT[], nLbls: number): number`: the
number of `lbls[0..nLbls)` with `set`, after writing their positions back.
Private to the module; its only caller is `runPlacement`.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive <base>` in
`$TMPDIR` (`npm ci` or symlinked `node_modules`, `npm run parser:regen`,
`npm run build:js`, then copy `dist/index.js` to `base.mjs`). Build the head
bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i174-smoke.json
```

bytediff compares stdout only, so expect every output identical. Any changed
output is stop condition 4.

## Targeted survey

**Selection rule.** `addXLabels` is shared by all eight engines, and the
warning needs at least one unplaced exterior label. Two sets:

- every corpus input under `~/git/graphviz-16.1.1/tests` whose text matches
  `xlabel|headlabel|taillabel|forcelabels` (22 files at planning, from
  `grep -rlE ... --include=*.gv --include=*.dot`), under all eight engines;
- every corpus id the planning sweep found where native prints the warning:
  none at planning ([../harness/survey.md](../harness/survey.md)), so this set
  is empty unless a re-run of the sweep finds one.

Run them with `FORMATS=dot node harness/compare.mjs <base.mjs> <head.mjs>
<files...>` (set `ENGINES` per set; wait while `uptime` is above 12).

**Pass:** for every row, `head` equals `base` (stdout unchanged), and no
`headErr` is `DIFF` where `baseErr` is `same`. List the rows that move from
`DIFF` to `same`. For each row still `DIFF` on the head, diff its head stderr
with native's and apply stop condition 3. Journal the table.

## Observability / rollback

Observability: N/A (library: no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the 12 warning cases
  fail and the 35 silent cases pass.
- Given the fix, when `repro.gv` renders under dot, then stderr is exactly
  `Warning: 1 out of 2 exterior labels positioned.\n`, once (the aux graph
  stays silent).
- Given the fix, when `headtail.gv` renders under circo, then stderr is
  exactly `Warning: 0 out of 12 exterior labels positioned.\n`; and when
  `forced.gv` renders under any engine, stderr is empty.
- Given the fix, when `compare.mjs` runs over the six probes, then `head`
  equals `base` in every row and only `headtail`/twopi has `headErr` `DIFF`.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says. The finished log has exactly one commit after the base, with
  footer `Refs: #174`, and tag `issue-174/pre-squash` holds the per-task
  history.
