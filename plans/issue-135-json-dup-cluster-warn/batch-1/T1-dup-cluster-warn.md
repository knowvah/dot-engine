# T1: json and json0 warn on duplicate cluster names

## Context

C's json writer numbers every subgraph in `write_graph`'s top pass
(`plugin/core/gvrender_core_json.c:651-668`): `label_subgs` (`:626-639`) gives each
non-root subgraph `GD_gid = lbl++` in DFS preorder and, for a cluster
(`is_a_cluster`), calls `insert(map, agnameof(g), gid)` (`:611-623`). `insert` keeps the
first entry of a name and, on a later one with a different value, calls
`agwarningf("Duplicate cluster name \"%s\"\n", name)`. `lookup` (`:604-609`) then gives
each `IS_CLUST_NODE` the first cluster's gid. Both FORMAT_JSON and FORMAT_JSON0 run it,
once per render, from `json_end_graph`, so the warning follows the render's
`layers not supported` warnings.

The port: `assignIds` (`src/render/json.ts:372-389`) walks subgraphs with
`dfsSubgraphs` (`:362-368`) and gives cluster nodes `clusterNodeGid`
(`src/render/json-cluster-edge.ts:48-50`, a `findIndex`). Nothing warns.

Planning (16.1.0, refs in [../harness/out/](../harness/out/)): native warns on every
engine, json and json0, once per repeat in DFS order (`dup3`: four lines, one for a
cluster under a non-cluster subgraph), for clusters by name or by `cluster=true`
(`attr`), never for svg; the port prints nothing on any case.

`json.ts` contains two literal NUL bytes (lines 222, 225): use `grep -a` on it until
AD-3 is done.

## Task (TDD)

1. **Setup.** File the two drafts ([followup-fillmap-warning.md](../followup-fillmap-warning.md),
   [followup-inherited-cluster-attr.md](../followup-inherited-cluster-attr.md)) with
   `gh issue create --label bug --label follow-up`, title and body from each file
   (body: the part after `---`); journal the numbers and put each number in its
   draft's first line. If `gh` is refused, journal that and leave the drafts for the
   maintainer. Build the neato plugin dir (README, Oracle); preflight `/tmp/ghl` for
   dot and the new dir for neato, fdp, circo, twopi, osage, patchwork, sfdp. Run
   `GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<dir> bash plans/issue-135-json-dup-cluster-warn/harness/regen.sh`,
   then `git diff --exit-code plans/issue-135-json-dup-cluster-warn/harness/out`
   (stop condition 3 otherwise).
2. **Red.** Create `src/render/json-dup-cluster.test.ts` (SPDX header, `@see` lines,
   module-level `HARNESS_135` URL constant, a `stderrOf(src, format, engine)` helper
   shaped like `first-layer.test.ts`'s, `afterEach(vi.restoreAllMocks)`). Cases, each
   comparing captured lines with the ref's lines (trailing empty line dropped):
   - `dup`, `dup3`, `attr`, `lay` × {json, json0, svg}, engine dot (svg: empty).
   - `dup` × {neato, circo, twopi, osage, patchwork, sfdp} × {json, json0}.
   - `dup` × fdp × {json, json0}: the ref minus its first line
     (`Two clusters named ...`), comment naming the fillMap follow-up issue.
   - Unit: `insertCluster` with the same name and the same value warns nothing; a
     second value warns once and keeps the first (`lookupCluster` returns it);
     `lookupCluster` of an unmapped name is -1.
   - Gid pin: for `dup3`, json `_gvid`s of the subgraph objects are `0..sgcnt-1` in
     DFS order and `_subgraph_cnt` equals native's (read native's from a one-off
     oracle run and inline the number with a comment).
   Run the file; the json/json0 stderr cases and the unit cases must fail (the unit
   cases fail on the missing exports).
3. **Green (AD-1, AD-2).** Add `insertCluster`, `labelSubgs`, `lookupCluster` to
   `json-cluster-edge.ts` with `@see plugin/core/gvrender_core_json.c:insert` etc.,
   import `agwarningf` from `../common/agerr.js`; delete `clusterNodeGid` after
   `grep -rna clusterNodeGid src test`; rewrite `assignIds`, delete `dfsSubgraphs`.
   Update the file's header comment (it now also owns the json cluster map). Run the
   new file and every `src/render/json*.test.ts` green.
4. **AD-3.** Replace the two NUL bytes in `json.ts` with `'\0'` (a scripted edit, e.g.
   `perl -pi -e 's/\x00/\\0/g' src/render/json.ts`; then confirm the two lines read
   `'\0'` and `grep -naP '[\x00-\x08]' src/render/json.ts` prints nothing). Check
   `wc -l src/render/json.ts` ≤ 730. Re-run the json tests.
5. Mark item 146 in `plans/post-16.1-followups/README.md` (line 703)
   `**[DONE — issue #135: json's label_subgs/insert/lookup ported, warning included]**`,
   in item 145's style.
6. Gates 1-6 (README), journal, `.agent-notes/issue-135.md`, then the squash.

## Write-set

- `src/render/json-cluster-edge.ts` (three new functions, `clusterNodeGid` removed, header)
- `src/render/json.ts` (`assignIds`, `dfsSubgraphs` removed, imports, lines 222/225)
- `src/render/json-dup-cluster.test.ts` (new)
- `plans/issue-135-json-dup-cluster-warn/harness/out/*` (regenerated; must not change)
- `plans/issue-135-json-dup-cluster-warn/followup-*.md` (issue numbers only)
- `plans/post-16.1-followups/README.md` (item 146 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README/overview checkboxes
- `.agent-notes/issue-135.md`

## Read-set

- `~/git/graphviz/plugin/core/gvrender_core_json.c:580-700`
- `src/render/json.ts:200-240,300-390,650-730`; `src/render/json-cluster-edge.ts`
- `src/render/json-cluster-edge.test.ts` (an fdp json test to mirror)
- `src/gvc/first-layer.test.ts` (console-spy helper)
- `src/common/agerr.ts:150-200`; `src/layout/dot/rank.ts:85-93` (`isACluster`)
- `.agent-notes/issue-129.md` (plugin dir; no trailing `\n` in agerr messages)

## Interface contracts

`labelSubgs(g, lbl, map, out): number` returns the next label (the subgraph count when
called on the root with 0), fills `out` in DFS preorder and `map` with each cluster
name's first gid. `insertCluster(map, name, v): void`. `lookupCluster(map, name): number`
(-1 when absent). `clusterNodeGid` and `dfsSubgraphs` leave the codebase (no importer
outside `json.ts`). No public API (`src/index.ts`) change; json stdout unchanged.

## Acceptance criteria

- Given `harness/dup.gv`, when rendered `-Tjson` or `-Tjson0` with any engine but fdp,
  then the port's stderr equals native's ref; with fdp, it equals the ref minus the
  fillMap line.
- Given `harness/dup3.gv`, when rendered json or json0 with dot, then four warnings in
  native's order.
- Given `harness/lay.gv`, when rendered json or json0, then the duplicate warning
  follows the layers warnings, as native.
- Given any harness graph, when rendered svg, then no duplicate warning.
- Given any graph, when rendered json, then stdout is byte-identical to the base's.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from `git archive 71e9e0ea` in
`$TMPDIR/issue135-base` (`node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`) and the head bundle from the worktree; copy each `dist/index.js` to
`$TMPDIR/issue135-{base,head}.mjs`, then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue135-base.mjs $TMPDIR/issue135-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue135-bytediff.json
```

Expected: `graphs-b7` (in the smoke list; two `cluster_1`s) changes on its 8 json jobs
and nothing else. How to judge a changed job: the bd-job output is
`<stdout>\n--stderr--\n<lines>`. The stdout part must be identical base vs head; the
stderr part must equal native's stderr for that engine and `-Tjson`
(`GVBINDIR=/tmp/ghl` for dot, the neato dir otherwise), for fdp minus native's
`Two clusters named` line. Any other change, or a stderr that differs from native
that way, is a halt.

## Targeted survey

How chosen: the only reachable path is a json/json0 render of a graph with two
clusters of one name. At planning, a scan of every applicable manifest file for a
`subgraph cluster...` name used twice found three: `1436`, `1902`, `graphs-b7`; native
`-Tjson` warns on all three (5, 1, 1 lines). Re-run the scan (any name matching
`/subgraph\s+("?)(cluster[^\s"{]*)\1/i` twice in one file) and add any new id.
Render each id × 8 engines × {json, json0} with base, head (one `bd-job.ts` process
each) and native (`timeout 120`). Pass: head stdout equals base stdout on every row;
head stderr equals native stderr (fdp: minus `Two clusters named` lines) on every row
native finishes; journal ids, counts and any row native did not finish.

## Observability

N/A: no new observable operations beyond the native warning itself.

## Rollback

Reversible: revert the commit.
