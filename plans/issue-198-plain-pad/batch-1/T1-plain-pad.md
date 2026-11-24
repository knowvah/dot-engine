# T1: plain's graph-line scale reads `job.pad`; test, gates, squash

## Context

`writePlain` fits the drawing into `size=` with a pad of `{ x: 0, y: 0 }`,
where C's `init_job_viewport` uses `job->pad` (`pad=`, else plain's
`default_pad` of 0). So plain and plain-ext print the wrong scale on the
`graph` line when the graph sets `pad=` and the zoom depends on it
([../decisions.md](../decisions.md#mechanism-plannings-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the fix (AD-1) with
its test (AD-2).

## Write-set

| File | Action |
|---|---|
| `src/render/map.ts` | Modify: `writePlain`'s `jobViewport` pad and doc comment (AD-1); stays ≤ 797 lines |
| `src/render/plain-pad.test.ts` | Create (AD-2) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-198.md` | Create, only if something novel turns up |

Read-set: `lib/common/output.c:130-150` (write_plain),
`lib/common/emit.c:3249-3263` (init_job_pad), `:3311-3350`
(init_job_viewport); `src/render/map.ts:410-440`, `src/gvc/device.ts:450-456`,
`src/gvc/viewport.ts:250-275`, `src/gvc/viewport-attr.test.ts:1-80` (the
fixture-test pattern).

## Steps

1. **Start.** Run `git log --oneline 25b341d3..`. If the tip has moved, the
   tip at start is the base: journal it, check `git apply --check` of the
   diff, and build the base bundle from it in step 5. Check `uptime` (above
   12, wait before steps 5-7) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`; a
   missing one: `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** `bash plans/issue-198-plain-pad/harness/recapture.sh $TMPDIR/i198/native`,
   then `diff -r $TMPDIR/i198/native plans/issue-198-plain-pad/harness/native`.
   Any difference: stop 4.
3. **Test first** (AD-2).
   `git apply --include='src/render/plain-pad.test.ts' plans/issue-198-plain-pad/harness/prototype.diff`,
   then `npx vitest run src/render/plain-pad.test.ts`. Pass: 33 failed, 33
   passed, and the failing names (the part after `(#198) > `, sorted) equal
   `harness/results/tests-on-base.txt`. Otherwise stop 2. Do not commit
   yet: the test and the fix go in one `fix(T1): ...` commit after step 4.
4. **Fix** (AD-1). `git apply --exclude='src/render/plain-pad.test.ts' plans/issue-198-plain-pad/harness/prototype.diff`
   (or the same edit by hand if the base moved). `npx vitest run src/render src/gvc`:
   all pass. `wc -l src/render/map.ts` ≤ 797.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i198/head.mjs`) and the base bundle (step 6's
   gate 5 method). From `plans/issue-198-plain-pad/harness/`:
   `ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork npx tsx probe.ts probes $TMPDIR/i198/base.mjs $TMPDIR/i198/head.mjs > results/probe-head.tsv`.
   Pass: `diff results/probe-head.tsv results/probe-prototype.tsv` is empty
   (head 256/256, base 132/256). Otherwise stop 3.
6. **Gates 1-5** (README table), in order; record each in the journal.
   Gate 5's base bundle: `git archive <base> | tar -x -C $TMPDIR/i198/base-src`,
   symlink `node_modules`, `npm run parser:regen`, `npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i198/base.mjs` (never `git stash`). Then
   `npx tsx test/tools/bytediff.ts $TMPDIR/i198/base.mjs $TMPDIR/i198/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i198/smoke.json`
   (default engines and formats). Pass: 1960 identical, 0 diffs. A capped
   job means load: re-run it alone.
7. **Gate 6: targeted survey.** Run [../harness/survey.md](../harness/survey.md#re-running)
   into `results/survey-head.tsv`. Pass: it equals `results/survey.tsv`
   (only `1879` × dot × plain, plain-ext move, to `eq`). List `1879` × dot
   under "toward-native changes" (graph line: 1 differing line against native
   on base, 0 on head); no accepted-row changes. Anything else: stop 3.
8. **Journals and notes** (README "Session end").
9. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `digraph { pad=1; size="1,1"; a -> b }`, when rendered to plain and
  plain-ext under dot, then the first line is `graph 0.28571 0.75 1.5`, as
  native.
- Given the 8 pad-sensitive probes (`repro`, `pad-xy`, `pad-pushes-over`,
  `pad-negative`, `filled`, `empty`, `landscape`, `clusters`), when rendered
  under any of the 8 engines, then plain and plain-ext equal native.
- Given the 8 pad-insensitive probes, when rendered, then output is unchanged
  from the base and equals native.
- Given corpus `1879` under dot, when rendered to plain, then the graph line
  is native's `graph 0.42766 346.74 43.028`.
- Given the smoke list, every job is byte-identical between base and head.

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit.
