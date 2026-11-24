# T1: make the node label on every layout, tests, docs, gates, squash

## Context

`buildNodeLabel`'s guard (`src/common/poly-init.ts:94`) keeps a stale label
on a no-free relayout. C's `common_init_node` makes it again every time
([../decisions.md](../decisions.md#mechanism-planning-s-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1). It passes every check below, but its comments are placeholders
(`PROTOTYPE:`).

## Write-set

| File | Action |
|---|---|
| `src/common/poly-init.ts` | Modify: `makeNodeLabel` (new, exported, no guard); `buildNodeLabel` keeps the guard and calls it |
| `src/common/nodeinit.ts` | Modify: import and call `makeNodeLabel` in `initNodeFromLabel` |
| `src/async/collect.ts` | Modify: the header `@see` names `makeNodeLabel` (it mirrors the layout-time call site) |
| `src/gvc/rerender-relabel.test.ts` | Create (AD-2) |
| `src/gvc/__fixtures__/rerender/relabel.gv`, `relabel.{dot,neato}.plain.relabel.{1,2}` | Create via `harness/recapture.sh` |
| `src/gvc/__fixtures__/rerender/regen.sh` | Modify: one header line (AD-2) |
| `docs/process-statics.md` | Modify: two rows (AD-3) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status | Modify |
| `.agent-notes/issue-190.md` (create), `.agent-notes/issue-138.md` (one observation) | Modify |

Read-set: `src/common/record.ts:410-440`, `src/gvc/device.ts:500-512`,
`src/common/htmltable-warn-state.test.ts` (warning-capture style),
`src/gvc/rerender.test.ts:27-60` (fixture reading), `lib/common/utils.c:390-413`.

## Steps

1. **Start.** Check `git log --oneline 67f46a36..`. If the tip has moved, the
   tip at start is the base: journal it, and re-run step 6's matrix on it
   before the change (as `native-planning-base.tsv` was). Run
   `npx tsx plans/issue-190-node-relabel/harness/preflight.ts` and
   `bash plans/issue-190-node-relabel/harness/build.sh`. Check `uptime`.
2. **Fixtures.** `bash plans/issue-190-node-relabel/harness/recapture.sh src/gvc/__fixtures__/rerender`.
   `relabel.dot.plain.relabel.2` must equal
   `harness/native/relabel.dot.plain.relabel.2`, and the same for neato. A
   mismatch means the oracle moved: stop 4.
3. **Tests first** (AD-2). Write `src/gvc/rerender-relabel.test.ts`. Run it on
   the base: cases 1 (both engines) and 2 fail, case 3 passes. Journal the
   failure lines. If case 1 or 2 passes on the base, the test does not reach
   the guard: fix the test, not `src/`.
4. **Fix** (AD-1). `git apply plans/issue-190-node-relabel/harness/prototype.diff`
   (or make the same edits by hand if the base moved), then write the final
   comments:
   - `makeNodeLabel`: "common_init_node's make_label: runs on every layout,
     so a no-free relayout rebuilds the label from the current attributes."
     Include `/** @see lib/common/utils.c:common_init_node */`.
   - `buildNodeLabel`: "Render-time (polyInit) only: build the label when
     layout made none (no layout measurer). C has no render-time make_label;
     a second render of one layout keeps the layout's label." Keep the stray
     orphan doc block above it (`Initialise shape descriptor and label...`,
     `@see lib/common/shapes.c:poly_init`) attached to `polyInit` where it
     belongs: move it down above `polyInit` if `polyInit` has no doc of its
     own. That is a 1-3 line fix in a file being edited, so it is allowed.
   - `initNodeFromLabel`: no comment change beyond the call.
   Run the new test: 3 cases pass. `grep -rn "buildNodeLabel" src` shows only
   `poly-init.ts` (definition, `polyInit` call).
5. **Docs** (AD-3): the two `docs/process-statics.md` rows, and the
   `regen.sh` header line.
6. **Native matrix.** `bash plans/issue-190-node-relabel/harness/native-compare.sh > $TMPDIR/i190/native-head.tsv`.
   Pass means it equals `results/native-planning-prototype.tsv` row for row:
   41/46 identical, with exactly these 5 rows not identical:
   `relabel`, `relabel-record` and `relabel-xlabel` on fdp (stderr only,
   native 1 line, #256), and `nonascii` on dot and neato (stderr only,
   native 1, port 3, AD-3). Any other row is stop 3. Copy the file to
   `harness/results/native-head.tsv`.
7. **Marker.** Re-apply `harness/marker.patch` by hand: add the one
   `ISSUE190_REMAKE` line at the top of `makeNodeLabel`. Then
   `npm run build:js` and copy `dist/index.js` to `$TMPDIR/i190/marker.mjs`.
   Revert with `git checkout src/common/poly-init.ts` and re-check
   `git diff` against your fix. Run
   `bash plans/issue-190-node-relabel/harness/marker-run.sh $TMPDIR/i190/marker.mjs > harness/results/marker-head.tsv`.
   Pass: `# remakes 0` and no `capped yes` row. Else stop 2.
8. **Gates 1-4** (README table). Record each in the journal.
9. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i190/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i190/base.mjs` (the #188 method; never `git stash`). Build the
   head bundle from the working tree to `$TMPDIR/i190/head.mjs`. Then
   `npx tsx test/tools/bytediff.ts $TMPDIR/i190/base.mjs $TMPDIR/i190/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i190/smoke.json`.
   Pass: 0 diffs (bytediff compares stderr too), 0 capped (AD-1: no single
   layout can change). A capped job means load: re-run it alone.
10. **Gate 6: targeted survey.** `BD_FORMATS=plain,xdot npx tsx test/tools/bytediff.ts $TMPDIR/i190/base.mjs $TMPDIR/i190/head.mjs plans/issue-190-node-relabel/harness/reach-ids.txt $TMPDIR/i190/reach.json`
    (40 ids × 8 engines × 2 formats = 640 jobs). Pass: 0 diffs, 0 capped.
    Together with step 6 (the no-free matrix against native) and step 7, this
    is the survey. [../harness/survey.md](../harness/survey.md) says how the
    ids were chosen.
11. **Notes and journals** (README "Session end").
12. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `digraph { a [label="short"]; a -> b }` laid out with dot, when `a`'s
  label is set to `a much longer label than before` and it is laid out again
  with no free, then `-Tplain` equals the carried oracle's render 2 (node a
  width 3.7104), and the same holds for neato.
- Given a node whose HTML label has a fixedsize cell too small for its text,
  when it is laid out three times with no free, then the port prints
  `Warning: cell size too small for content` / `in label of node a` three
  times, as native does.
- Given the same input, when it is laid out once and rendered three times,
  then the pair prints once (the render-time guard holds).
- Given any corpus input and a single layout, when base and head are
  compared, then the outputs are byte-identical (smoke bytediff and reach set).
- Given the 46-case no-free matrix, when the head is compared with native,
  then exactly the 5 rows that AD-3 and AD-4 name differ, on stderr only.

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSV results
under `harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
