# T1: print the json root name through agNameOf, tests, gates, squash

## Context

C's `write_hdr` prints `agnameof(g)`
(`~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:364-370`), which is
`%1` for a nameless root. The port's `buildGraphObject` prints `g.name`
(`src/render/json.ts:581-582`), which is `''` for one (AD-1).
[../harness/prototype.diff](../harness/prototype.diff) is the working
prototype. It meets every check below except AD-2's line count and the tests.

## Steps

1. **Red.** Write the AD-4 tests:
   - `src/render/json-root-name.test.ts`. Read
     `plans/issue-185-json-anon-root-name/harness/native-root-names.tsv`
     (skip `#` lines; columns probe, engine, format, native name JSON-quoted)
     and the probe sources in `harness/probes/`, as
     `src/render/json0-attach.test.ts` reads issue 184's harness. Render with
     `renderFormat(parse(src), format, engine)` (`test/helpers/render-format.ts`)
     and compare `JSON.stringify(JSON.parse(out).name)` with the native column.
     Silence stderr with `agseterrf` (reset in `afterEach`). Add the two API
     cases (`createGraph()` → `%1`, `createGraph({ name: '' })` → `""`, both
     under `json` and `json0`, dot engine).
   - the `empty-graph-name.test.ts` and `rerender.test.ts` tightenings (AD-4).

   Run on the base. Expected: 48 table rows fail (`bare`, `repro`, `strict` ×
   8 engines × 2 formats); 32 pass (`empty`, `named`); the `createGraph()` cases
   fail and the `name: ''` cases pass; both tightened tests fail on the root
   name. Journal the counts.
2. **Green.** In `src/render/json.ts`, apply AD-1 and AD-2: import `agNameOf`
   from `../model/cgraph-ops.js`; `buildGraphObject` sets
   `o.name = agNameOf(g);` with the `write_hdr` comment folded onto that line.
   `wc -l src/render/json.ts` must print 734 or less. The new and tightened
   tests pass.
3. **Existing tests.** `npm test`. Planning found no test pinning `""`. A
   failure that pinned the empty root name encodes the bug: update it to
   native's value and journal it (push-forward). Any other failure is a gate
   failure: diagnose it.
4. **Probes.** Build head and base bundles (see [Bytediff](#bytediff)), then
   from the repository root:

   ```
   ENGINES=dot,neato,fdp,circo,twopi,osage,sfdp,patchwork npx tsx \
     plans/issue-185-json-anon-root-name/harness/root-name-survey.ts \
     $TMPDIR/base.mjs $TMPDIR/head.mjs \
     plans/issue-185-json-anon-root-name/harness/probes/*.gv \
     > plans/issue-185-json-anon-root-name/harness/results/probes-head.tsv
   ```

   Pass: identical to
   [../harness/results/probes-planning.tsv](../harness/results/probes-planning.tsv)
   (80 rows `eq`, 48 `moved` `y`, `err` `same` everywhere).
5. **Gates 1-6** (README). Record each in the journal.
6. **Follow-up** (AD-3). `gh issue create --label follow-up` titled
   "compareJson skips the root graph name", citing `RESERVED_TOP`
   (`test/golden/compare-json.ts:115-118`), this mission and #194. Journal the
   number.
7. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** the json builder printed the model's stored root name,
     `''` for a nameless root, where C prints `agnameof`'s `%1`.
   - **Origin:** port `src/render/json.ts:582` (base `9336a55c`); C
     `plugin/core/gvrender_core_json.c:367` (`write_hdr`), `lib/cgraph/id.c:145-169`.
   - **Causal chain:** the parser keeps `name: ''`, `anonymous: true` for
     `digraph {` (`src/parser/builder.ts:496`) so the dot writer prints
     `digraph {` → `buildGraphObject` copies `g.name` → `"name": ""`.
   - **Ruled out:** the parser's anonymous id counter (anonymous subgraphs
     already print native's `%3`, and `named.gv`'s `%1`); a root named `""`
     (`empty.gv` prints `""` on both sides; `parse('digraph "" {}').anonymous`
     is false); other formats (cmapx already prints `%1` via the map writer,
     and svg/xdot/dot/plain bytes are unchanged in the smoke bytediff); the
     subgraph path (no subgraph is constructed `anonymous`).
8. **Finish** (README, "Branch and commits").

## Write-set

- `src/render/json.ts` (import, `buildGraphObject` name line)
- `src/render/json-root-name.test.ts` (new)
- `src/render/dot/empty-graph-name.test.ts` (the `root-anon` json case and its
  comment)
- `src/gvc/rerender.test.ts` (the second json render case)
- existing `*.test.ts` files that encoded the bug (push-forward, journalled)
- `plans/issue-185-json-anon-root-name/harness/results/` and `harness/extra/`
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-185.md`, `.agent-notes/issue-184.md` (line 33)

## Read-set

- `src/render/json.ts:575-625` (`buildGraphObject`)
- `src/model/cgraph-ops.ts:28-47` (`agNameOf`)
- `src/model/graph.ts:45-60` (`anonymous`)
- `src/parser/builder.ts:485-500` (nameless root)
- `src/render/json0-attach.test.ts` (pattern for reading a harness)
- `~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:364-372`,
  `~/git/graphviz-16.1.1/lib/cgraph/id.c:145-169`

## Interface contracts

No new interface. `agNameOf(g)` returns `%1` for `g.anonymous`, else `g.name`;
unchanged.

## Bytediff

Queue gate 5. Build the base bundle from `git archive 9336a55c` in `$TMPDIR`
(symlink `node_modules`, `npm run parser:regen`, `npm run build:js`, copy
`dist/index.js` to `base.mjs`); the head bundle the same way from the working
tree (`npm run build:js`, copy to `head.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i185-smoke.json
npx tsx plans/issue-185-json-anon-root-name/harness/toward-native.ts \
  $TMPDIR/i185-smoke.json \
  > plans/issue-185-json-anon-root-name/harness/results/toward-native-head.tsv
```

**Expect** 1960 jobs, 1864 identical, 96 diffs, 0 capped. The 96 are `json` on
these 12 ids × all 8 engines: `1514`, `2458`, `2572`, `2592`, `2613`, `2639`,
`2643`, `2682`, `2683`, `graphs-flatedge`, `graphs-sides`,
`tree-graphs-directed-arr_none`. Every row of `toward-native-head.tsv` has
`changed` `2` and `towardNative` `y`, and `headDiff` < `baseDiff` (planning:
`baseDiff − 2` in 89 rows, `− 6` in the 7 `graphs-flatedge` rows, where `diff`
realigns a hunk). These are queue-rule "toward-native changes": list them in the
report with the base and head counts from the TSV. Any non-json diff, any other
id, or any row not `y` is stop condition 3.

## Targeted survey

**Selection rule.** The change reaches a json or json0 render of a graph whose
root has no name. The survey takes every applicable corpus id whose root header
has no name (129), the 3 whose root is named `""` (`1864`, `1896`, `2734`, the
control), and the 7 whose header the planning regex could not parse
([../harness/survey-ids.txt](../harness/survey-ids.txt), 139 ids; how they were
chosen: [../harness/survey.md](../harness/survey.md)). Engine dot, format json
only: json0 goes through the same `buildGraphObject`, and the probes cover
json0 under all 8 engines. The planning run took about 30 rows per 10 minutes
in one process, so planning ran it in four shards of 35 ids
(`awk '{c=int((NR-1)/35); print > ("ids." c)}'`) and concatenated them in id
order, one header; do the same, splitting a slow shard further if needed. A
native run past 120 s or a port render past 300 s ends as `TIMEOUT` and the row
as `skip` (the inputs that hit it are large: `1864`, 14 MB, runs the port out of
memory; `share-b545` is a plain-format file both sides reject).

```
IDS=plans/issue-185-json-anon-root-name/harness/survey-ids.txt FORMATS=json npx tsx \
  plans/issue-185-json-anon-root-name/harness/root-name-survey.ts \
  $TMPDIR/base.mjs $TMPDIR/head.mjs \
  > plans/issue-185-json-anon-root-name/harness/results/survey-head.tsv
```

Check `uptime` first; above 12, wait. **Pass:** no `NE` row, no `err` `DIFF`
row, and the `native`, `verdict` and `moved` columns equal
[../harness/results/survey-planning.tsv](../harness/results/survey-planning.tsv)
row for row (`skip` rows stay `skip`).

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given `digraph { subgraph { a } subgraph cluster_x { b } a -> b }`, when it
  renders under dot as json and as json0, then the root `name` is `%1` and the
  anonymous subgraph's is `%3`, as native 16.1.1 prints.
- Given `digraph "" { a }`, when it renders as json, then the root `name` is
  `""` (unchanged, native's value).
- Given the 5 probes under 8 engines in json and json0, when they render, then
  all 80 root names equal native's.
- Given the smoke bytediff, when it runs base against head, then only the 96
  json rows change, each only its root name line, each toward native.
- Given gates 1-6, when they run on the head, then each passes as the README
  says; the log has exactly one commit after the base, footer `Refs: #185`, and
  tag `issue-185/pre-squash` holds the per-task history.
