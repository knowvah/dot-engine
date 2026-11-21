# T1: `%` graph names take cgraph's anonymous id; tests, gates, squash

## Context

A graph or subgraph name whose text starts with `%` is anonymous in cgraph.
It takes (or finds again) an anonymous id, and `endgraph` drops the string
when the parse ends, so `agnameof` prints `%<id>`. The port keeps the string
([../decisions.md](../decisions.md#mechanism-planning-s-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1), with the comments written.

## Write-set

| File | Action |
|---|---|
| `src/parser/builder.ts` | Modify: `localGraphIds`, `localGraphId`, the `processSubgraph` name branch, `buildFromAst` local root (AD-1) |
| `src/model/cgraph-ops.ts` | Modify: export `isLocalName` (AD-1) |
| `src/parser/builder-local-names.test.ts` | Create (AD-2) |
| `src/common/clust-map.ts` | Modify: comment at `:22` only (AD-3) |
| `src/render/dot/empty-graph-name.test.ts` | Modify: comment at `:66-67` only (AD-3) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-194.md` | Create |

Read-set: `lib/cgraph/id.c:104-169`, `lib/cgraph/imap.c:84-182`,
`lib/cgraph/grammar.y:568-596`, `lib/cgraph/subg.c:52-70`,
`src/parser/builder.ts:100-180,250-320,440-462`, `src/model/cgraph-ops.ts:1-50`,
`src/render/dot/empty-graph-name.test.ts:1-120` (the `jsonNames` helper),
`src/parser/builder-reopen.test.ts:1-40` (the harness-fixture pattern).

## Steps

1. **Start.** Check `git log --oneline cbd6ba50..`. If the tip has moved, the
   tip at start is the base: journal it and re-run step 5's matrix on a base
   bundle before the change. Check `uptime` (above 12, wait) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`; if one
   is missing, `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** `bash plans/issue-194-percent-anon-names/harness/recapture.sh $TMPDIR/i194/native`,
   then `diff -r $TMPDIR/i194/native plans/issue-194-percent-anon-names/harness/native`.
   Any difference means the oracle moved: stop 4.
3. **Tests first** (AD-2). Write `src/parser/builder-local-names.test.ts`
   reading `plans/issue-194-percent-anon-names/harness/{probes,native}/`
   (resolve with `new URL('../../plans/...', import.meta.url)`, as
   `builder-reopen.test.ts` does). Render with `renderFormat` from
   `test/helpers/render-format.ts`. Capture warnings with `agseterrf`, and
   restore the default in `afterEach`, as `builder-reopen.test.ts` does. The
   in-scope probes are every `probes/*.gv` not starting with `oos-`. Run
   `npx vitest run src/parser/builder-local-names.test.ts` on the base and
   journal the counts. Pass: every non-control case fails as AD-2's
   consequences say, and the `ctl-*` cases pass. Otherwise stop 2.
4. **Fix** (AD-1, AD-3). `git apply plans/issue-194-percent-anon-names/harness/prototype.diff`
   (or the same edits by hand if the base moved). Then edit the
   `empty-graph-name.test.ts:66-67` comment (AD-3). Run the new test file and
   `npx vitest run src/parser src/render/dot src/common`: all pass.
   `wc -l src/parser/builder.ts` must be ≤ 500.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i194/head.mjs`) and the base bundle (step 7's
   method). Run
   `npx tsx plans/issue-194-percent-anon-names/harness/probe.ts $TMPDIR/i194/base.mjs $TMPDIR/i194/head.mjs > plans/issue-194-percent-anon-names/harness/results/probe-head.tsv`.
   Pass: the tally is `base=eq head=eq` 104, `base=out head=eq` 67,
   `base=err head=eq` 4, `base=out head=err` 3, `base=err head=err` 4, and
   its rows equal `results/probe-prototype.tsv`. Any other row is stop 3.
6. **Gates 1-4** (README table). Record each in the journal.
7. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i194/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i194/base.mjs` (never `git stash`). Then
   `BD_FORMATS=svg,xdot,json,plain,cmapx,dot npx tsx test/tools/bytediff.ts $TMPDIR/i194/base.mjs $TMPDIR/i194/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i194/smoke.json`.
   Pass: 2352 jobs, 0 diffs, 0 capped. If a job is capped, the machine is
   loaded: re-run that job alone.
8. **Gate 6: targeted survey.** Step 5's matrix is the survey;
   [../harness/survey.md](../harness/survey.md) says why (0 corpus ids reach
   the path). Re-run the grep there and journal the count (expected 0).
9. **Notes and journals** (README "Session end").
10. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `digraph "%foo" { subgraph "%bar" { a } subgraph "%baz" { node [color=red]; b } }`,
  when rendered with dot to cmapx and json, then the map is
  `<map id="%1" name="%1">` and the json names are `%1`, `%3`, `%5`, as in
  native.
- Given a `%` name reused in one parse (`reopen`, `two-parents`,
  `sub-as-root`), when parsed, then it maps to the id it got first: one
  subgraph per parent, named `%<id>`, and later anonymous subgraphs are
  numbered as in native.
- Given `subgraph "%3"` after an anonymous `%3` (`collide`), when parsed, then
  it is a new subgraph `%5`, not the anonymous one reopened.
- Given `graph "%n" { mode=bogus; model=bogus; ... }` laid out with neato,
  then both warnings name `graph %1`.
- Given any name not starting with `%` (controls, every smoke id), then
  output is unchanged (smoke 0 diffs).

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
