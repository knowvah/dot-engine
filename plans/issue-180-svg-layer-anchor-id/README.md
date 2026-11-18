# Mission: issue #180: the layer prefix in every object id

## Objective

Take the graph from the issue:

```
digraph G { layers="l1:l2"; URL="x"; a [layer=l1 URL="na"]; b [layer=l2 URL="nb"]; subgraph cluster_c { URL="c"; layer=l2; b } a -> b [URL="e" layer=l2] }
```

In `-Tsvg`, native writes the anchors inside layer `l2` as `a_l2_graph0`,
`a_l2_clust1`, `a_l2_node2` and `a_l2_edge1`. The port writes `a_graph0`,
`a_clust1`, `a_node2` and `a_edge1`. The group ids (`l2_node2_l2`, ...)
already equal native. Make the port print what native prints.

**Mechanism (traced at planning, base `2eea1a9f`, graphviz 16.1.1).** C's
`getObjId` (`lib/common/emit.c:204-245`) starts every object id with
`layerPagePrefix` (`:194-202`). That function writes `<layerIDs[layerNum]>_`
when `job->layerNum > 1`, then `page<x>,<y>_` when the page is not the first.
It writes the prefix before the explicit-`id` check, so an explicit `id` gets
it too. The root graph's id gets the same prefix in `emit_page` (`:3556-3561`,
`NotFirstPage`). So `obj->id` carries the prefix, and every string built from
`obj->id` carries it as well: the svg groups (`svg_print_id_class`), the
anchors `a_<id>`, the edge label anchors `<id>-label`, the HTML cell anchors
`<id>_<n>` (`htmltable.c:747`), the gradient ids `<id>_l_<n>` and `<id>_r_<n>`
(`gvrender_core_svg.c:172-182, 592, 632`), and the map area ids. The port's
getObjId is `RenderJob.objId` (`src/gvc/job.ts:323-327`), reached through
`svgNodeId`, `svgEdgeId`, `svgClusterId` and `svgGraphId`
(`src/render/svg-id.ts`). It leaves the prefix out. Four group writers add
it back themselves (`job.idLayerPrefix() +` at `svg-cluster.ts:17`,
`svg-graph.ts:410`, `svg-helpers.ts:189` and `:228`). Every other id string is
built from the unprefixed id. The issue's suspected mechanism is confirmed. The
origin is `job.ts:323-327`.

The issue's probe misses one case. Under `layerselect`, a device without
layers (`cmapx`) still starts at the selected layer (`firstlayer`,
`emit.c:1109-1128`). Native `-Tcmapx` of `harness/probes/select.gv` therefore
prints `l3_node1`, `l3_edge1` and `l3_graph0`. The port prints them without the
prefix. The same fix covers it.

**Evidence ([harness/](harness/)).** There are 10 probes, rendered under all
8 engines in svg, cmapx, cmapx_np, imap, imap_np and xdot (480 rows). Native
stdout is in `harness/native/<probe>.gv.<engine>.<fmt>`. A scratch prototype
of AD-1 (diff at `$TMPDIR/i180/proto.diff`, then reverted) gave:

| Probe | What it covers | svg body on the prototype (exact, from the first `<g id=`) |
|---|---|---|
| `repro` | the issue's input | anchors now native's; 7 lines left on layer 1 under 5 engines (#181: the cluster is drawn on every layer) |
| `html` | HTML labels with cell `href` on graph, cluster, node and edge | byte-equal (was not) |
| `gradient` | linear and radial fills on the background, a cluster and nodes | byte-equal (was not) |
| `explicitid` | explicit `id` on root, cluster, node and edge; edge label, head and tail URLs; 3 layers | byte-equal (was not) |
| `gid` | a root `id` declared after the cluster (the `<gid>_` prefix) | byte-equal (was not) |
| `edgelabels` | `label`, `headlabel`, `taillabel` and `xlabel` anchors | byte-equal (was not) |
| `select` | `layerselect=l3` | byte-equal (was not); cmapx and cmapx_np byte-equal too |
| `list` | `layerselect="l1,l3"` | byte-equal (was not) |
| `nolayers` | anchors, an HTML label and a gradient, without layers | unchanged, byte-equal |
| `gid-inherit` | a root `id="G\G"` declared before the cluster | layer anchors now native's except the cluster's (AD-4: #242, #249) |

Tallies: [harness/prototype-body-equal.tsv](harness/prototype-body-equal.tsv)
(svg, exact body) and [harness/prototype-probes.tsv](harness/prototype-probes.tsv)
(`rowcheck.mjs` verdicts, all formats). In the second table, every cmapx,
imap and xdot row is `unchanged`, except `select.gv` cmapx and cmapx_np under
all 8 engines, which are `native`. The verdict column reads svg rows whose
only remaining difference is the header as `AWAY`. That is an LCS artefact
of the wrapped `<svg>` lines (`.agent-notes/issue-178.md`), so svg is judged
by the exact-body table. Unit tests on the prototype
(`src/render src/gvc src/common`): 201 files, 4473 tests, all pass. The
corpus survey ([harness/prototype-survey-layers.tsv](harness/prototype-survey-layers.tsv)):
144 rows, all `unchanged`. See [decision-journal.md](decision-journal.md), rows 0-1.

Done means:
- `html`, `gradient`, `explicitid`, `gid`, `edgelabels`, `select`, `list` and
  `nolayers` svg bodies are byte-equal to native under all 8 engines.
- `select` cmapx and cmapx_np are byte-equal to native under all 8 engines.
- `repro`'s remaining lines are only #181's layer-1 cluster block, and
  `gid-inherit`'s only the #242/#249 lines (AD-4).
- No other probe row changes, and the survey passes as
  [T1](batch-1/T1-layer-prefix.md#targeted-survey) says.

Type `fix`, a patch release.

**Out of scope:**
- #181: a cluster is drawn on every layer (`clust_in_layer` not ported).
- #242: subgraphs do not inherit root graph attributes (`id` included).
- #249: an object's own `id` is not `\`-substituted.
- The `page<x>,<y>_` half of `layerPagePrefix` (AD-2: no device the port has
  pages).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, then [decisions.md](decisions.md), then
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 2eea1a9f..`.
4. Read `.agent-notes/issue-178.md` and `.agent-notes/issue-132.md`. In
   `rowcheck.mjs` only the verdict `native` means byte equality, and svg rows
   are judged with `harness/bodyeq.mjs`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `2eea1a9f0b37ce87b377e9dc61d9348dce8ff52c` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-180 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** run `git tag issue-180/pre-squash`, then
  `git reset --soft <base>`, then make one commit:

  ```
  fix(svg): prefix every object id with its layer as getObjId does

  <two to four lines: C's getObjId starts each object id with layerPagePrefix,
  so obj->id, and the anchors, HTML cell anchors and gradient ids built from
  it, carry <layer>_ after the first layer; the port added the prefix only
  where it wrote group ids>

  Refs: #180
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-layer-prefix.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-layer-prefix.md#targeted-survey) | see T1 |

The oracle comes from ADR-0002, the newest accepted ADR:
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` for
dot or `/tmp/ghl1611-all` for the other engines, as
`test/corpus/oracle-paths.mjs` says. `harness/rowcheck.mjs` imports it.
Before trusting native output, run
`oraclePreflight(ORACLE_DOT_BIN, <gvbindir>, <engine>)`
(`test/corpus/oracle-env.ts`) for `dot` and for `neato`. `$TMPDIR/i180/pf.ts`
does both, and both passed at planning. Fix a missing `config8` with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6, and wait while it is above 12.

Baseline at planning: see [decision-journal.md](decision-journal.md), row 0.

## Stop conditions

1. A `src/` file outside [T1's write-set](batch-1/T1-layer-prefix.md#write-set)
   must change, for example `anchor.ts`, `device.ts`, `poly-gencode.ts` or
   `htmltable-emit*.ts`. Journal why and stop.
2. `src/render/svg-helpers.ts` (597 lines at base) grows. The complexity hook
   blocks growth of a file over 500 lines.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, or a changed line does not equal native's line. Write
   the diagnosis artifact and stop.
4. After the fix, a probe row that Done names as byte-equal still differs, or
   `repro`/`gid-inherit` differ in lines other than those Done allows.
   Diagnose it to a mechanism, then stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.
   Examples: an output without `layers` changes, so the prefix leaked onto a
   first or only layer; or the group ids gain a doubled prefix.

## Push-forward (decide alone, journal it)

- Test names, comment wording, and the shape of `objId`, within the
  write-set.
- More probes in `harness/extra/` for paths the 10 probes do not reach, for
  example: layer names that need XML escaping, `labelaligned` edge text
  paths (`<id>_p`), records with URLs, and `layersep`.
- A row that differs for a reason older than this change (base and head
  differ from native in the same lines): note it, and link or open a
  `follow-up` issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-layer-prefix.md](batch-1/T1-layer-prefix.md) | red tests, fix, gates, close-out, squash |
| [harness/probes/](harness/probes/) | the 10 inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict |
| [harness/bodyeq.mjs](harness/bodyeq.mjs), [harness/render1.mjs](harness/render1.mjs) | exact svg body equality with native for base and head |
| [harness/prototype-body-equal.tsv](harness/prototype-body-equal.tsv) | planning-time svg body equality (80 rows) |
| [harness/prototype-probes.tsv](harness/prototype-probes.tsv) | planning-time verdicts, all formats (480 rows) |
| [harness/survey-layers.txt](harness/survey-layers.txt), [harness/prototype-survey-layers.tsv](harness/prototype-survey-layers.tsv) | the gate-6 selection and its planning verdicts |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the prefixed id flows after T1 |
| [diagrams/component-map.md](diagrams/component-map.md) | the modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, the files, the gates.
- Write `.agent-notes/issue-180.md` only for something novel. Otherwise say
  in the journal row that nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1). Base `2eea1a9f`; no stop condition hit.
- **Result:** `html`, `gradient`, `explicitid`, `gid`, `edgelabels`, `select`,
  `list` and `nolayers` svg bodies are byte-equal to native under all 8
  engines (59 rows were not on the base), and `select` cmapx and cmapx_np are
  byte-equal under all 8. `repro` keeps only #181's layer-1 cluster block;
  `gid-inherit` keeps only the #249 and #242 lines. No xdot, imap or other
  map row changed.
- **Decisions:** AD-1 to AD-4 held. Journal rows 4 (the brief's `repro`
  anchor list missed #181's layer-1 `a_clust1`; the test leaves it out by
  name), 7 (`harness/extra/classify.mjs`: changed lines judged by position
  against native), 8 (7 extra probes), 9 (24 probe rows whose changed line
  gains the prefix but is still not native's, through #242 or #181: reported
  on #251). For review: row 9.
- **Gates:** typecheck exit 0; `npm test` 597 files, 14305 tests; golden
  gates 5/5; corpus + docs 25 files, 2863 tests; smoke bytediff 1960 jobs,
  1960 identical; survey 144 rows `unchanged`.
- **Follow-ups:** #254 (`labelaligned` not ported in svg), new. Comments on
  #251 (ruling rows) and #181 (cell anchor numbers shift with the extra
  cluster). #250 owns `record`'s remaining lines.
- **Notes:** `.agent-notes/issue-180.md`.
