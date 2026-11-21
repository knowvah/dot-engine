# T1: keep spline_edges' bb on the Pack < 0 path, tests, gates, squash

## Context

`neatoLayout` recomputes the graph bb after routing on every path
(`src/layout/neato/index.ts:222`). C does that only when `Pack >= 0`
(`lib/neatogen/neatoinit.c:1416`). On `mode=KK` with no pack, native keeps the
bb `spline_edges` made, stale beziers and aspect scale included
([../decisions.md](../decisions.md#mechanism-planning-s-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1). Its comment needs writing.

## Write-set

| File | Action |
|---|---|
| `src/layout/neato/index.ts` | Modify: keep `neatoPack`'s result; guard the post-routing `computeSubgraphBB` with `pack >= 0`; comment (AD-1) |
| `src/gvc/rerender.test.ts` | Modify: two `NOFREE_CASES` rows (AD-2) |
| `src/gvc/__fixtures__/rerender/kk-tri.gv`, `kk-tri.neato.plain.nofree.{1,2,3}`, `kk-ratio.gv`, `kk-ratio.neato.plain.nofree.{1,2,3}` | Create via `harness/recapture.sh` |
| `src/gvc/__fixtures__/rerender/regen.sh` | Modify: one header line (AD-2) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status | Modify |
| `.agent-notes/issue-193.md` | Create |

Read-set: `lib/neatogen/neatoinit.c:1341-1440`, `lib/neatogen/neatosplines.c:835-850`,
`src/layout/neato/index.ts:180-235`, `src/layout/neato/splines.ts:987-1005`,
`src/gvc/rerender.test.ts:210-238`.

## Steps

1. **Start.** Check `git log --oneline 670a47d9..`. If the tip has moved, the
   tip at start is the base: journal it, and re-run step 5's matrix on it
   before the change (as `native-planning-base.tsv` was). Run
   `npx tsx plans/issue-193-neato-kk-bb/harness/preflight.ts` and
   `bash plans/issue-193-neato-kk-bb/harness/build.sh`. Check `uptime`.
2. **Fixtures.** `bash plans/issue-193-neato-kk-bb/harness/recapture.sh src/gvc/__fixtures__/rerender`.
   Each of the 8 files must equal its namesake in `harness/native/` (`cmp`).
   A mismatch means the oracle moved: stop 4.
3. **Tests first** (AD-2). Add `['kk-tri', 'neato']` and `['kk-ratio', 'neato']`
   to `NOFREE_CASES`. Add one line to `regen.sh`'s header: `kk-tri.*` and
   `kk-ratio.*` are the carried oracle's, captured by #193
   (`plans/issue-193-neato-kk-bb/harness/recapture.sh`). Run
   `npx vitest run src/gvc/rerender.test.ts` on the base: exactly the two new
   cases fail. Journal the failing `graph` lines (`kk-tri` render 2:
   port `graph 1 1.7338 1.4416`, native `graph 1 1.7338 1.6854`; `kk-ratio`
   render 1: port `graph 1.2198 2.4523 2.4595`, native `graph 1 3 3`).
4. **Fix** (AD-1). `git apply plans/issue-193-neato-kk-bb/harness/prototype.diff`
   (or the same edits by hand if the base moved), then replace the comment
   above the guarded line with one that says: C runs `compute_bb` after
   routing only in the `Pack >= 0` branch; the `Pack < 0` branch (`mode=KK`
   with no pack) keeps the bb `spline_edges` made, which counts a no-free
   relayout's stale beziers and carries `neato_set_aspect`'s scale. Cite
   `@see lib/neatogen/neatoinit.c:1416` and `neatoinit.c:1431-1436`. Keep
   the `addClusters` comment as it is (#283). Run the test file: all pass.
5. **Native matrix.** `bash plans/issue-193-neato-kk-bb/harness/native-compare.sh > plans/issue-193-neato-kk-bb/harness/results/native-head.tsv`.
   Pass: it equals `results/native-planning-prototype.tsv` (24/24 identical).
   Any other row is stop 3.
6. **Gates 1-4** (README table). Record each in the journal.
7. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i193/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i193/base.mjs` (the #188 method; never `git stash`). Build the
   head bundle from the working tree to `$TMPDIR/i193/head.mjs`. Then
   `npx tsx test/tools/bytediff.ts $TMPDIR/i193/base.mjs $TMPDIR/i193/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i193/smoke.json`.
   Pass: 0 diffs, 0 capped (no corpus input uses `mode=KK`). A capped job
   means load: re-run it alone.
8. **Gate 6: targeted survey.** Step 5's matrix is the survey for the path
   the fix reaches; [../harness/survey.md](../harness/survey.md) says why.
   Also re-run the fixture graph-line check over
   `src/layout/neato/__fixtures__/{models,dim}/*.gv` (single layout, native
   `-Kneato -Tplain` line 1 against `I193_N=1 probe.ts` line 2): pass means
   every file native renders is equal, as at planning (journal row 1).
9. **Notes and journals** (README "Session end").
10. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `graph { mode=KK; a -- b -- c -- a }` laid out three times with neato
  and no free, when each layout is rendered to plain, then the renders equal
  the carried oracle's (`graph 1 1.7338 1.4416`, then `1.6854` twice).
- Given `graph { mode=KK; ratio=fill; size="3,3!"; a -- b -- c -- a }` laid
  out once, when rendered to plain, then it equals native (`graph 1 3 3`).
- Given any `Pack >= 0` input (`pack=true`, the default mode, `sgd`), when
  laid out with or without a free, then output is unchanged from the base
  (`kk-pack`, `major-tri`, `sgd-tri` rows; smoke bytediff 0 diffs).
- Given the 24-row no-free matrix, when the head is compared with native, then
  every row is identical.

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSV results
under `harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
