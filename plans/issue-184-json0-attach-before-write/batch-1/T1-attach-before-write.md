# T1: attach before the json0 write, tests, gates, squash

## Context

C runs `attach_attrs` in `json_begin_graph` for json0, and the write follows
in `json_end_graph` (`~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:56-67`).
The port runs `attachAttrs` after `buildJson` whenever the graph has no
cluster edges (`src/render/json.ts:686-689`,
`src/render/json-cluster-edge.ts:34-39`). json0 has no overlay for `bb` or
edge `pos`, so it prints neither (AD-1).
[../harness/prototype.diff](../harness/prototype.diff) is the working
prototype: it meets every check below except the new tests and the comments.

## Steps

1. **Red.** Write the AD-3 tests:
   - `src/render/json0-attach.test.ts`. It renders through
     `test/helpers/render-format.ts` (`renderFormat(parse(src), 'json0',
     engine)`) and reads `harness/probes/*.gv` and
     `harness/native/<probe>.gv.<engine>.json0`, as
     `src/render/json0-node-attrs.test.ts` reads issue 136's harness. Silence
     stderr with `agseterrf` (reset in `afterEach`): the `ortho` warning is
     #246's.
   - the `json-dup-cluster.test.ts:195` change (`it.each(JSON_FORMATS)`).

   Run on the base. Expected:
   - all 79 equality rows fail (each lacks at least the root `bb`);
   - the `concentrate`/sfdp row fails (missing keys);
   - the `a -> b` unit case fails;
   - the subgraph render passes for `json` and fails for `json0`.

   Journal the counts.
2. **Green.** In `src/render/json.ts`, apply AD-1:
   - `Json0Renderer.endGraph` attaches before `buildJson`;
   - its doc comment says C's `json_begin_graph` runs `attach_attrs` (with
     its cluster-edge undo) before `json_end_graph` writes, and json0 prints
     what that stored (`@see plugin/core/gvrender_core_json.c:json_begin_graph`);
   - the `buildNodeObject` fallback comment (`json.ts:521-522`) says the
     fallback serves a json render whose xdot re-render failed, and that for
     json0 it repeats what `attachAttrs` stored.

   In `src/render/json-cluster-edge.ts`:
   - correct the header paragraph ("A graph with no cluster edges keeps the
     usual order ... nothing there can differ"): json0 attaches first always;
     json defers its held write-back, because its xdot draw lookup overlays
     the same values;
   - correct the helper's doc comment to match.

   The new tests pass.
3. **Existing tests.** Run `npm test`. A test that pinned json0's old key order
   or absent `bb`/`pos` encodes the bug: update it to native's values and
   journal it (push-forward). Any other failure is a gate failure: diagnose
   it.
4. **Probes.** Build the head bundle (`npm run build:js`, copy `dist/index.js`
   to `$TMPDIR/head.mjs`) and the base bundle (see [Bytediff](#bytediff)).
   From the repository root run
   `npx tsx plans/issue-184-json0-attach-before-write/harness/json0-compare.ts $TMPDIR/base.mjs $TMPDIR/head.mjs plans/issue-184-json0-attach-before-write/harness/probes/*.gv > .../harness/results/probes-head.tsv`.
   Compare with
   [../harness/results/probes-planning.tsv](../harness/results/probes-planning.tsv).
   Pass:
   - `headDiffs` is 0 in 79 rows;
   - `concentrate`/sfdp has `unowned` 0;
   - no row goes `baseErr` `same` → `headErr` `DIFF` (`ortho`/dot and
     `ortho`/neato are `DIFF` on both: #246).
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** json0's write-back ran after the write on any graph with
     no cluster edges, and json0 has no overlay for `bb` or edge `pos`.
   - **Origin:** port `src/render/json.ts:686-689` and
     `src/render/json-cluster-edge.ts:34-39` (on the base); C
     `plugin/core/gvrender_core_json.c:56-67`.
   - **Causal chain:** `endGraph` → helper returns `attach` uncalled →
     `buildJson(g, false)` reads `attrs` with no `bb` or edge `pos` → the
     keys are absent → `attachAttrs` stores them too late.
   - **Ruled out:**
     - the formatting (the cluster-edge path, which attaches first, already
       matched native, and `write-back.ts` serves `-Tdot`);
     - `-Tjson` (its draw lookup overlays them; equal to native on the repro
       and the subgraph render on the base);
     - a missing write-back on subgraph renders (C attaches on
       `job->gvc->g`; the subgraph render equals native with the change).
7. **Finish** (README, "Branch and commits").

## Write-set

- `src/render/json.ts` (`Json0Renderer.endGraph`, two comments)
- `src/render/json-cluster-edge.ts` (comments only)
- `src/render/json0-attach.test.ts` (new)
- `src/render/json-dup-cluster.test.ts` (the subgraph render case)
- existing `*.test.ts` files that encoded the bug (push-forward, journalled)
- `plans/issue-184-json0-attach-before-write/harness/extra/` and `harness/results/`
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-184.md`, `.agent-notes/issue-135.md` (lines 46-48)

## Read-set

- `src/render/json.ts:194-320` (draw lookup), `:390-425` (`emitAttrs`),
  `:505-560` (node and edge objects), `:640-727` (`buildJson`, renderers)
- `src/render/json-cluster-edge.ts:1-40`
- `src/render/dot/write-back.ts:100-115` (`attachAttrs`)
- `src/gvc/layout-bb.ts:20-43` (`attrsWithoutLayoutBb`: the root's attached
  `bb` replaces the layout's string, so it prints)
- `~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:56-67, 342-362`
- `src/render/json0-node-attrs.test.ts` (pattern for reading a harness)

## Interface contracts

There is no new interface. After `Json0Renderer.endGraph` writes, the graph's
`attrs` hold exactly what they held before the change, after the same render.
What changes is that `buildJson` now sees them during the write.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive 89613a69` in
`$TMPDIR` (symlink `node_modules`, `npm run parser:regen`, `npm run build:js`,
copy `dist/index.js` to `base.mjs`). Then run:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i184-smoke.json
```

The default formats (`svg,xdot,json,plain,cmapx`) do not include json0, and
the change reaches json0 only. **Expect 0 changed outputs.** Any change is
stop condition 4. json0 is not byte-diffed: its bytes never equal native's
(key order, #185). Gate 6 judges it structurally instead (AD-2).

## Targeted survey

**Selection rule.** The change reaches every json0 render that has a layout
`bb` or an edge, which is every corpus input. So the survey takes the queue's
smoke list (the 49 ids in `~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt`,
mapped to files through `test/corpus/corpus-manifest.json` under
`ORACLE_CORPUS_ROOT`) under all 8 engines in json0. Planning mapped all 49;
`pack_neato1`/`pack_neato2` appear twice, from `linux.x86/` and `nshare/`.

```
node -e "<map ids to files, as harness/survey.md shows>" > $TMPDIR/i184-smoke-files.txt
npx tsx plans/issue-184-json0-attach-before-write/harness/json0-compare.ts \
  $TMPDIR/base.mjs $TMPDIR/head.mjs $(cat $TMPDIR/i184-smoke-files.txt) \
  > plans/issue-184-json0-attach-before-write/harness/results/survey-head.tsv
```

**Pass:**

- `unowned` is 0 in every row;
- no row goes `same`→`DIFF` on stderr;
- `headDiffs` is 0 in at least the planning run's 373 rows.

The planning run is
[../harness/results/survey-planning.tsv](../harness/results/survey-planning.tsv)
(about 3 minutes at load 8). The planning rows not equal to native:

- 17 sfdp rows: their `lost` diffs are all in base `-Tjson` (`parity-sfdp.json`
  `diverged`, #257's family);
- `polypoly`/osage: node `pos` on the base too;
- `2717`/fdp: native `SEGVx5`, head compared with base only.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given `digraph { a -> b }`, when it renders under dot as json0, then the root
  has `bb` `0,0,54,108` and edge 0 has `pos`
  `e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536`, and `compareJson`
  against native 16.1.1 reports no diff (base: 2 missing).
- Given #135's `sub.gv`, when subgraph `s` alone renders as json0, then
  `compareJson` against `harness/out/sub.s.json0` reports `[]` (base:
  `[graph]/bb`, `cluster:cluster_x/bb` and `edge:c->d#0/pos` missing).
- Given the 10 probes under 8 engines, when they render as json0, then 79 rows
  equal native through `compareJson`, and `concentrate`/sfdp's diffs are all
  in base `-Tjson`.
- Given `clusteredge.gv` under fdp (cluster edges), when it renders as json0,
  then the output is unchanged and still equals native.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says. The finished log has exactly one commit after the base, with
  footer `Refs: #184`, and tag `issue-184/pre-squash` holds the per-task
  history.
