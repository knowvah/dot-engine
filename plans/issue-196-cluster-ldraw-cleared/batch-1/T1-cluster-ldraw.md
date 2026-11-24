# T1: set a labelled cluster's or root's empty _ldraw_; tests, gates, squash

## Context

C's `xdot_end_cluster` and `xdot_end_graph` set `_ldraw_` whenever the cluster
or root has a `GD_label`, from an empty buffer too. The port records it only
when the buffer is non-empty, so a stored string survives and `_ldraw_=""` is
never printed ([../decisions.md](../decisions.md#mechanism-plannings-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1) with its tests (AD-2).

## Write-set

| File | Action |
|---|---|
| `src/render/dot.ts` | Modify: `endGraph`, `endCluster` (AD-1); ≤ 505 lines |
| `src/render/dot/write-back.ts` | Modify: `renderedDraws`, `attachClusterDraws`, `attachXdotAttrs`; add `attachRootDraws`, `clusterLdraw` and the `graph-attr-syms.js` import (AD-1) |
| `src/render/dot/agwrite.ts` | Modify: `graphAttrs`, `clusterAttrs`, one import (AD-1); ≤ 533 lines |
| `src/render/dot/cluster-ldraw.test.ts` | Create (AD-2 item 1) |
| `src/render/json-stored-draws.test.ts` | Modify: the #196 describe only (AD-2 item 2) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-196.md` | Create |

Read-set: `plugin/core/gvrender_core_dot.c:218-300,340-370,425-445`,
`lib/cgraph/write.c:268-315`, `lib/common/input.c:830-845`,
`src/render/dot.ts:80-135,290-315`, `src/render/dot/write-back.ts:115-185`,
`src/render/dot/agwrite.ts:370-410`, `src/render/dot/attrs.ts:370-395`
(`writeDictSkips`), `src/parser/graph-attr-syms.ts:10-25`,
`src/render/json.ts:236-300,395-420`, `src/render/json-stored-draws.test.ts`.

## Steps

1. **Start.** Run `git log --oneline 77f433ff..`. If the tip has moved, the tip
   at start is the base: journal it, and build the base bundle from it in
   step 5. Check `uptime` (above 12, wait) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`. If one
   is missing, run `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** Run `bash plans/issue-196-cluster-ldraw-cleared/harness/recapture.sh $TMPDIR/i196/native`,
   then `diff -r $TMPDIR/i196/native plans/issue-196-cluster-ldraw-cleared/harness/native`.
   Any difference means the oracle moved: stop 4.
3. **Tests first** (AD-2). Apply the prototype diff's two test files
   (`git apply --include='src/render/dot/cluster-ldraw.test.ts' --include='src/render/json-stored-draws.test.ts' <diff>`).
   On the base, prove they reach the defect: append an export-only stub to
   `write-back.ts`:
   `export const clusterLdraw = (_sg: Graph, ld: string | undefined, _d: readonly Graph[], _f: (g: Graph) => string | undefined): string | undefined => ld || undefined;`
   (the base's rule). Run
   `npx vitest run src/render/dot/cluster-ldraw.test.ts src/render/json-stored-draws.test.ts`,
   then remove the stub. Pass: 28 failed, 27 passed, the failures as AD-2's
   consequences list them. Otherwise stop 2.
4. **Fix** (AD-1). `git apply` the diff's three source files
   (`--include` each), or make the same edits by hand if the base moved. Run
   `npx vitest run src/render`: all pass. `wc -l`: `dot.ts` ≤ 505,
   `agwrite.ts` ≤ 533. `json.ts` and `attrs.ts` are not touched.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i196/head.mjs`) and the base bundle (step 7's
   method). Run
   `npx tsx plans/issue-196-cluster-ldraw-cleared/harness/probe.ts $TMPDIR/i196/base.mjs $TMPDIR/i196/head.mjs > plans/issue-196-cluster-ldraw-cleared/harness/results/probe-head.tsv`.
   Pass: the stderr tally is `base=out head=eq` 66, `base=eq head=eq` 96,
   `base=out head=out` 6, and every row, `oos-*` included, equals
   `results/probe-prototype.tsv`. Any other row is stop 3.
6. **Gates 1-4** (README table). Record each in the journal.
7. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i196/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i196/base.mjs` (never `git stash`). Then run
   `BD_FORMATS=svg,xdot,json,plain,cmapx,dot npx tsx test/tools/bytediff.ts $TMPDIR/i196/base.mjs $TMPDIR/i196/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i196/smoke.json`.
   Pass: equals planning's result (journal row 2). Any diff must be one
   planning classified, and must still equal native or pass a queue-rule
   exception. A job capped once means the machine is loaded: re-run that job
   alone.
8. **Gate 6: targeted survey.** Run the two bytediffs of
   [../harness/survey.md](../harness/survey.md). Pass: the same diff keys and
   capped jobs as planning (journal row 3), each diff re-checked against
   native as row 3 checked it. A key or a one-sided cap planning did not see
   is stop 3. Wait until `uptime` ≤ 12 before starting.
9. **Notes and journals** (README "Session end").
10. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `ldraw-cleared.gv` (invisible labelled clusters with input `_ldraw_`),
  when rendered to xdot and json under dot, then each output equals native:
  xdot `_ldraw_=""` on `cluster_x` and `cluster_zz`, json with no `_ldraw_`.
- Given `ldraw-newline.gv` (root and cluster label `"\n"`), when rendered,
  then the root prints `_ldraw_=""` and `cluster_n` prints no `_ldraw_` line,
  as native.
- Given `ldraw-fresh.gv`, when rendered to xdot, then `cluster_x` prints
  `_ldraw_=""`, as native.
- Given `hide-cluster.c`'s sequence, when the second render is json or xdot,
  then `cluster_l` has no `_ldraw_` (json) or `_ldraw_=""` (xdot), as native.
- Given `src/render/json-stored-draws.test.ts`, then its #196 lists are empty
  (the issue's done condition), and every smoke id equals planning's result.

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
