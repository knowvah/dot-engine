# T1: json walks nodes in sequence order; test, gates, squash

## Context

The json writer walks `Graph.nodes` (the order a graph was told its nodes)
where C walks `agfstnode`/`agnxtnode` (AGSEQ). A subgraph's `nodes` list
prints in the wrong order, and a render of a subgraph alone numbers its nodes
and edges in the wrong order
([../decisions.md](../decisions.md#mechanism-plannings-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the fix (AD-1, AD-3)
with its test (AD-2).

## Write-set

| File | Action |
|---|---|
| `src/render/json-cluster-edge.ts` | Modify: import and re-export `nodesInSeq`; `jsonNodes` walks it (AD-1, AD-3) |
| `src/render/json.ts` | Modify: `canonicalRootEdges` and `assignIds` walk `nodesInSeq(g)`; `nodesInSeq` joins the `./json-cluster-edge.js` import line; stays at 734 lines |
| `src/render/json-node-seq.test.ts` | Create (AD-2) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-199.md` | Create, only if something novel turns up |

Read-set: `plugin/core/gvrender_core_json.c:465-495` (write_edges),
`:535-580` (write_nodes), `:642-670` (write_graph) in
`~/git/sseely/graphviz-carried`; `src/render/json.ts:219-233`, `:366-385`,
`:557-620`; `src/render/json-cluster-edge.ts:1-60`;
`src/layout/dot/decomp.ts:32-34`; `src/render/json-dup-cluster.test.ts:160-200`
(the `ids` pattern and the subgraph render).

## Steps

1. **Start.** Run `git log --oneline 1f1e7961..`. If the tip has moved, the
   tip at start is the base: journal it, check
   `git apply --check plans/issue-199-json-subgraph-node-order/harness/prototype.diff`,
   and build the base bundle from it. Check `uptime` (above 12, wait before
   steps 2, 5, 6's gate 5 and 7) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`; a
   missing one: `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** `bash plans/issue-199-json-subgraph-node-order/harness/recapture.sh $TMPDIR/i199/native`
   and `bash plans/issue-199-json-subgraph-node-order/harness/subrender/build.sh $TMPDIR/i199/subnative`;
   then `diff -r $TMPDIR/i199/native plans/issue-199-json-subgraph-node-order/harness/native`
   and `diff -r $TMPDIR/i199/subnative plans/issue-199-json-subgraph-node-order/harness/subrender/native`.
   Any difference: stop 4.
3. **Test first** (AD-2).
   `git apply --include='src/render/json-node-seq.test.ts' plans/issue-199-json-subgraph-node-order/harness/prototype.diff`,
   then `npx vitest run src/render/json-node-seq.test.ts --reporter=verbose`.
   Pass: 31 failed, 13 passed, and the failing names (the part after
   `(#199) > `, timing dropped, sorted) equal `harness/results/tests-on-base.txt`.
   Otherwise stop 2. Do not commit yet: the test and the fix go in one
   `fix(T1): ...` commit after step 4.
4. **Fix** (AD-1, AD-3). `git apply --exclude='src/render/json-node-seq.test.ts' plans/issue-199-json-subgraph-node-order/harness/prototype.diff`
   (or the same edits by hand if the base moved; use Edit, and keep the
   `json.ts` import on one line: a second line is blocked by the hook).
   `npx vitest run src/render`: all pass. `wc -l src/render/json.ts` = 734.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i199/head.mjs`) and the base bundle (step 6's
   gate 5 method). From `plans/issue-199-json-subgraph-node-order/harness/`:
   `ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork npx tsx probe.ts probes $TMPDIR/i199/base.mjs $TMPDIR/i199/head.mjs > results/probe-head.tsv 2> results/probe-head.tally`.
   Pass: `diff results/probe-head.tsv results/probe-prototype.tsv` is empty
   (head 156/160, base 48/160). Then `npx tsx subrender/port.ts $TMPDIR/i199/base-src/src subrender/native`
   (both rows `out`) and `npx tsx subrender/port.ts ../../../src subrender/native`
   (both rows `eq`). Otherwise stop 3.
6. **Gates 1-5** (README table), in order; record each in the journal.
   Gate 5's base bundle: `git archive <base> | tar -x -C $TMPDIR/i199/base-src`,
   symlink `node_modules`, `npm run parser:regen`, `npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i199/base.mjs` (never `git stash`). Then
   `npx tsx test/tools/bytediff.ts $TMPDIR/i199/base.mjs $TMPDIR/i199/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i199/smoke.json`
   (default engines and formats) and, from the harness directory,
   `npx tsx toward-native.ts $TMPDIR/i199/smoke.json > results/smoke-head-toward.tsv`.
   Pass: 1960 jobs, 1915 identical, 45 diffs, 0 capped;
   `results/smoke-diff-index.txt` lists the same 45 keys (order aside);
   `smoke-head-toward.tsv` equals `results/smoke-toward.tsv` after sorting.
   A capped job means load: re-run it alone.
7. **Gate 6: targeted survey.** Run [../harness/survey.md](../harness/survey.md#re-running).
   Pass as stated there. List every `toward` and `SHAPE` row under
   "toward-native changes" with its base and head counts; rows on an
   accepted divergence go under "accepted-row changes" too. Anything else:
   stop 3.
8. **Journals and notes** (README "Session end").
9. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given `digraph { a; b; subgraph s { b; a } }`, when rendered to json or
  json0 under any engine, then subgraph `s` prints `"nodes": [1, 2]`, as
  native.
- Given the 7 out-of-order probes, when rendered under the 8 engines, then
  every row equals native except sfdp on `edge-order` and
  `fdp-cluster-edge`, whose member lists equal native's and whose other
  lines are unchanged from the base.
- Given the 3 in-order probes, when rendered, then output is unchanged from
  the base and equals native.
- Given subgraph `s` of `subrender/subrev.gv` rendered alone, when written to
  json or json0, then the node gids are `a..d` = 2..5 and the edges print as
  native's.
- Given the smoke list, every changed job is json, on the 6 reach ids, and
  moves to or toward native (`results/smoke-toward.tsv`).

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit.
