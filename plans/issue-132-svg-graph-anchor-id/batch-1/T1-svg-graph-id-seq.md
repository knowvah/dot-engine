# T1: a subgraph render's graph ids say graph<AGSEQ>

## Context

C names the graph being emitted with `getObjId` (`lib/common/emit.c:209-247`): DOT `id`
wins; else `"graph" + AGSEQ(obj)` with no `<gid>_` prefix (`root == obj`). That id
becomes `obj->id` in `emit_begin_graph` → `initObjMapData` (`emit.c:3578`, `:320-340`)
and is printed as the svg anchor `a_<id>` (`gvrender_core_svg.c:svg_begin_anchor`), the
cmapx/cmap graph area id (`gvrender_core_map.c:map_end_page`, `obj->id`), and the base of
HTML-label anchor ids `<id>_<n>` (`htmltable.c:395-399`).

The port: `svgGraphId` (`src/render/svg-id.ts:53-56`) hardcodes `graph0`; callers
`src/gvc/device.ts:235` (`setHtmlAnchorObj` for the graph label) and `:391`
(`resolveObjAnchor` → `obj.id`). `g.seq` is AGSEQ (`src/model/graph.ts:154-161`, root 0).
T9's `graphObjId` (`src/render/svg-graph.ts:235-245`) already computes the right id for
the top `<g>` (`:424`) and gradient ids (`:284`).

## Task (TDD)

1. File the follow-up issue in [../followup-cmapx-neg-zero.md](../followup-cmapx-neg-zero.md)
   (`gh issue create`, labels `bug`, `follow-up`); journal its number. If `gh` is
   denied, journal that and continue.
2. **Native refs:** preflight the oracle, then
   `GVBINDIR=/tmp/ghl bash plans/issue-132-svg-graph-anchor-id/harness/regen.sh`.
   Check render 2 of `out/dot.s.svg.url` holds `<g id="a_graph1">`,
   `out/dot.cluster_k.svg.url` holds `a_graph2`, and `out/dot.s.svg.html` holds
   `a_graph1_0` (stop condition 3 otherwise). Journal the abort status of the html runs.
3. **Red:** in `src/render/svg-subgraph-id.test.ts` add, per AD-2 and AD-3, a second
   `describe` over dot × {`s`, `cluster_k`} on `subg-url.gv`: svg from the first
   `<g id="graph` line equals native's render 2; cmapx `id="..."` list equals native's;
   and dot `s` on `subg-html.gv`: svg anchor ids matching `a_graph\d+_\d+` and cmapx
   area ids equal native's. Use a module-level `HARNESS_132` URL constant. Run the file;
   the new cases must fail on `graph0`.
4. **Green:** AD-1: change `svgGraphId`; update its doc (`graph<AGSEQ>`, why
   `isRoot = true`, `@see lib/common/emit.c:getObjId`); delete `graphObjId`; import
   `svgGraphId` in `svg-graph.ts` and use it at both call sites. Update the
   `device.ts:234` comment (`root graph → graph0` → `graph being emitted → graph<AGSEQ>`).
5. AD-4: in `src/gvc/layout-reset.edges.test.ts:81-90` replace the comment and slice from
   the first `<g id="graph`; rename the test accordingly.
6. Mark item 142 in `plans/post-16.1-followups/README.md` (line ~693)
   `**[DONE — issue #132: svgGraphId carries the seq; graphObjId deleted]**`, in the
   style of item 141.
7. Gates 1-6 (README), journal, `.agent-notes/issue-132.md`, then the squash.

## Write-set

- `src/render/svg-id.ts` (`svgGraphId` and its doc only)
- `src/render/svg-graph.ts` (delete `graphObjId`; import; two call sites)
- `src/gvc/device.ts` (the comment at line 234 only)
- `src/render/svg-subgraph-id.test.ts`
- `src/gvc/layout-reset.edges.test.ts` (the svg test at 81-90 only)
- `plans/issue-132-svg-graph-anchor-id/harness/out/*` (generated)
- `plans/post-16.1-followups/README.md` (item 142 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`
- `.agent-notes/issue-132.md`

## Read-set

- `src/render/svg-id.ts:1-56`; `src/render/svg-graph.ts:235-300,400-430`
- `src/gvc/device.ts:225-240,385-395`; `src/gvc/anchor.ts:157-190`
- `src/common/htmltable-emit-rules.ts:175-200`; `src/gvc/job.ts:309-323` (`objId`)
- `src/render/svg-subgraph-id.test.ts` (66 lines); `src/gvc/layout-reset.edges.test.ts:1-60,80-90`
- `src/gvc/anchor.test.ts:1-20` (root `a_graph0` must stay)
- `~/git/graphviz/lib/common/emit.c:209-247,320-340,3569-3590`
- `plans/post-16-1-followups-10/harness/T15/subg-after-free.c`
- `git show d0944c9a` (T9's precedent)

## Interface contracts

`svgGraphId(g: Graph, job: RenderJob): string` keeps its signature; its result changes
only when `g.seq !== 0` and `g` has no own `id`. No other exported symbol changes
(`graphObjId` was module-private).

## Acceptance criteria

- Given `subg-url.gv`, root rendered and freed, when subgraph `s` is laid out and
  rendered with dot as svg, then the output from the first `<g id="graph` line equals
  native's and holds `<g id="a_graph1">`; for `cluster_k`, `a_graph2`.
- Given the same, when rendered as cmapx, then the area ids equal native's
  (`graph1`; `graph2`).
- Given `subg-html.gv`, when `s` is rendered, then the HTML-cell anchor is `a_graph1_0`
  (svg) and the area id `graph1_0` (cmapx), equal to native's.
- Given any root graph, when rendered, then its anchor is still `a_graph0`
  (`anchor.test.ts` unchanged and green).
- Given `src/`, when grepping `graphObjId`, then nothing matches.

## Bytediff

`src/` changes, so gate 5 applies. Build base and head bundles (`npm run build:js`,
copy `dist/index.js` to `$TMPDIR/issue132-base.mjs` / `issue132-head.mjs`; build the
base from `git archive 88871494` in `$TMPDIR` with `node_modules` symlinked and
`npm run parser:regen`, as #129 did), then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue132-base.mjs $TMPDIR/issue132-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue132-bytediff.json
```

Expected: identical on every job (smoke renders roots; root seq is 0). Any difference
is a halt unless it equals native.

## Targeted survey

How to choose: the code path is the graph's `obj.id`, printed only when the graph has
an anchor (`URL`/`href`/`tooltip`/`target` on the root, or an HTML graph label with
`href`/`title`/`id` cells), in svg and cmapx. The CLI renders roots, so the survey
proves no root-render change. Grep `~/git/graphviz/tests` (and the corpus id list) for
inputs whose root graph sets `URL`, `href` or `tooltip` (graph attr statements or
`graph [...]`), take up to 12, render each `-Tsvg` and `-Tcmapx` with the head bundle
and the oracle, and compare (svg with the corpus comparator, cmapx ids exactly; a cmapx
`-0` vs `0` difference is the filed follow-up, not this change: confirm head = base on
those). Journal the ids and how chosen. The harness cases in step 2-3 are the
subgraph-render survey.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
