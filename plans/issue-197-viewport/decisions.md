# Decisions: issue #197

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `fa380cee`. Oracle:
the carried build (ADR-0003). The issue has no `upstream-16.1.1` label.

## Mechanism (planning's diagnosis)

Two defects, one feature. The second is reachable only once the first is
fixed, and the issue's repro needs both for cmapx.

### 1. `viewport=` is never read

- **Mechanism.** `init_job_viewport` (`lib/common/emit.c:3311-3386`) sets
  `job->view`, `job->zoom` and `job->focus`; the user's `viewport` overrides
  the default view (Z × padded bb), Z and focus (the bb's centre) through
  three `sscanf` formats (`:3355-3375`). `init_job_pagination` takes the page
  size from the view (`pageSize = view / zoom`, `:1171`, `:1261`),
  `setup_page` centres `job->clip` on the focus (`:1532-1537`), and the
  emitters skip what the clip excludes. The port never reads `viewport`, and
  it does not model view or focus at all: every consumer derives them from
  the bb.
- **Origin.** `src/gvc/viewport.ts:169-215` (base): `initJobViewportZoom`,
  `setupPageClip` and `setupPageSize` take `(bb, size, pad, z)`, so the focus
  is always the bb's centre and the view always Z × sz. Their callers repeat
  the same derivation: `src/gvc/emit-xdot.ts:40` (`deviceClip`, the job clip
  for every format), `src/gvc/device.ts:479` (Z for `job.scale`),
  `src/render/svg-graph.ts:77-80` (SVG width, height and viewBox from the bb
  extent), `src/render/map.ts:611` (`buildMapCtx`) and `:417`
  (`writePlain`'s scale, which is `job->zoom`).
- **Causal chain.** Repro `digraph G { viewport="60,60,1,30,30"; ... }`: C's
  view is 60 × 60 and the focus (30, 30), so the clip is (0,0)-(60,60), the
  SVG is 60pt × 60pt, and only node `d` and edge `c -> d` overlap the clip.
  The port's clip is the bb ± pad, so it sizes the page from the bb and draws
  everything. xdot's canvas `_draw_` polygon is the clip, and json reads the
  xdot text. Plain prints `job->zoom`, so a viewport Z of 2 prints
  `graph 2 ...` where the port prints 1 (`zoom2`, `whz`, `with-size-z`).

### 2. `emit_edge`'s `edge_in_box` gate is per renderer, and map lacks it

- **Mechanism.** C gates the whole of `emit_edge` on
  `edge_in_box(e, job->clip) && edge_in_layer(job, e)`
  (`lib/common/emit.c:3005`): comments, style parse, begin, graphics, end.
  The port's walk tests only the layer half (`src/gvc/emit-walk.ts:31`
  `edgeShown`). `renderEdge` (`src/gvc/device.ts:183`) then runs for every
  edge. `emitEdgeComments` (`src/gvc/emit-gates.ts:75`), the SVG renderer
  (`src/render/svg.ts:115`) and the xdot renderer (`src/render/dot.ts:196`)
  each re-test `edge_in_box` themselves. The map renderer does not, and
  `renderEdge`'s colour resolution reports warnings for the edge.
- **Causal chain.** With no `viewport`, the clip is the bb ± pad and holds
  every routed edge, so nothing showed it. Once (1) is fixed, an edge wholly
  outside the view gets a cmapx `<area>` (probe `urls`: `edge1`), and an
  out-of-view edge with a bad colour warns where native is silent (probe
  `edge-color-warn`, stderr).

### Ruled out

- **Layout.** In the repro, `bb`, `pos` and every node and edge attribute are
  equal in native and base xdot. Only the canvas polygon and which objects
  draw differ. `-Tdot` is identical in native and port, and agwrite never
  reads `viewport`.
- **Engine.** The defect sits in the emitter. The 8 sampled probes move from
  different to equal on all 7 other engines (280 rows, 182 moved), as on dot.
- **Clusters.** `emit_clusters` does not test the clip: native draws a
  cluster outside the view (`clusters`), and so does the prototype.
- **The default path's arithmetic.** The prototype computes sz as C does,
  `(UR + pad) - (LL - pad)`, where the base wrote `UR - LL + 2 * pad` in the
  zoom fit and the SVG dims. The SVG dims are now `view × dpi / 72`, where
  the base had `sz × (Z × dpi / 72)`. Smoke and survey bytediffs are
  identical (journal rows 2 and 3), so no corpus row moves.
- **`%lf` parsing.** `scanStrtod` (`src/xdot/strtod.ts:160`) is the macOS
  strtod grammar the oracle uses, including hex floats, inf and nan. `sscanf`'s
  `%lf` skips leading whitespace, and its literal `,` matches only a comma.
  Probes `hex-float`, `spaces` and `space-before-comma` equal native.

## AD-1: one `init_job_viewport`, every consumer reads it

**Decision.** As [harness/prototype.diff](harness/prototype.diff):

- `src/gvc/viewport.ts`:
  - `JobViewport { view, zoom, focus }` (GVJ_s's three fields).
  - `initJobViewport(bb, size, pad)`: C's body up to the override, with sz
    from the padded bb.
  - `applyViewportAttr(vp, g)`: the override.
  - `jobViewport(g, bb, size, pad)`: the two together.
  - `setupPageSize(vp)` returns `view / zoom`. `setupPageClip(vp)` centres
    the clip on `focus`.
  - `initJobViewportZoom` goes. Its tests move to `initJobViewport(...).zoom`.
  - `init_job_viewport` is split in two only because `applyViewportAttr`
    pushes the function past the hook's 30-line, CCN-10 limit. Say so in the
    comment.
- `RenderJob.view` (`src/gvc/job.ts`, GVJ_s.view), set in `render`
  (`device.ts`). `job.zoom` stays 1, and Z stays in `job.scale` (D4).
- Consumers: `deviceClip`, `render`'s Z, `emitSvgTag` (page extent
  `job.view × job.dpi / 72`), `buildMapCtx` and `writePlain`'s zoom.
  `writePlain` keeps its pad of 0, which is #198's question.

**Rejected.** (a) Patch each consumer for `viewport` while keeping the
bb-derived helpers. That is five copies of the override, and the focus would
still be implicit. (b) Store view, zoom and focus on the job and have each
renderer read the job. `buildMapCtx` and `writePlain` compute their own pad,
and `job.zoom` has to stay 1 (D4/ADR-2), so they would need their own
copies anyway.

**Consequences.** Dot probe matrix (34 probes × 5 formats): base 66/170
equal native, prototype 170/170. The three `rtest-*` probes under neato:
base 5/15, prototype 15/15. The other 7 engines, 8 probes: base 98/280,
prototype 280/280. Smoke 2352/2352 identical, so no default-path row moves.
`map.ts` stays at 797 lines and `device.ts` at 508. The 500-line write hook
blocks growth past the base count, so do not add lines to either.

## AD-2: port the three `sscanf` formats on `scanStrtod`

**Decision.** `scanCommaDoubles` (`%lf` joined by literal `,`), `scanSet`
(`%[^c]`, at least one character) and `viewportNodeName` (format 1
`W,H,Z,'name'` with rv == 4, so no closing quote is needed; else format 2
`W,H,Z,name` with nothing after the name). C's partial assignment is
modelled as "each value read overrides its field, in order". So `"W,H"`
keeps the `size=` fit's Z, `"W,H,Z,x"` reads x as a node name (not found:
default focus), and `"W,H,Z,name,5"` falls through to format 3, which fails
on the name. The node is looked up as `agfindnode(g->root, name)` would:
`g.root.nodes.get(name)`, then `info.coord`.

**Rejected.** The existing `FLOAT` regex of `parseDrawingSize`. It has no hex,
inf or nan, and it lets whitespace through before a comma, which `sscanf`
does not (`space-before-comma`).

## AD-3: move `edge_in_box` into the walk's edge gate

**Decision.** `edgeShown` (`src/gvc/emit-walk.ts`) tests
`edgeHasDrawableContent(e, job.clip)` before the layer test, as C's
`emit_edge` condition does. `emitEdgeComments` drops its own copy, which can
no longer fail. The re-tests in `svg.ts:115` and `dot.ts:196` now always pass.
They are left alone: no other change touches those files, and removing them
is cleanup, not a fix (`.agent-notes/issue-197.md`).

**Rejected.** (a) Add the gate to the map renderer only. That is the symptom
site, and `renderEdge`'s warnings would still print for an out-of-view edge
(`edge-color-warn`). (b) Gate in `renderEdge`. `device.ts` is at its line cap,
and the walk is where C's condition lives.

**Consequences.** `device.test.ts` AC3 builds an edge with no spline, which
C would never emit. Its fixture gains a spline bb that meets the clip.

## AD-4: tests

**Decision.** New `src/gvc/viewport-attr.test.ts`:

- **Fixture rows.** Every `harness/probes/*.gv` (34) × svg, xdot, json,
  cmapx, plain against `harness/native/`, under dot, or neato for `rtest-*`.
  svg is compared from `<svg` on with the tag's whitespace collapsed, json
  parsed with keys sorted (#184), and svg's agerr output against `.err`.
- **Unit cases.** 15 `applyViewportAttr` cases, one per form above, and a
  clip check.

Existing tests change only where they build a job by hand:
`svg-graph.test.ts` (`job.view`, `job.dpi`, the new `setupPageClip`
signature), `viewport.test.ts` and `viewport.branch.test.ts`
(`initJobViewport(...).zoom`), and `device.test.ts` (AD-3).

The `rtest-*` probes port the C suite's `viewport` cases (`tests/tests.txt:208-215`,
`test_rtest.py:238-245`): `graphs/viewport.gv` with `-Gviewport=300,300`,
`300,300,1,200,620` and `300,300,2,200,620`, the value set in the file. They
run under neato without `-n2` (the port has no `-n` mode) and in the port's
formats, not png and ps.

**Consequences.** On the base, with export-only stubs (T1 step 3), the file
fails 117 of 189 tests: 102 fixture rows and the 15 parse checks.
`results/tests-on-base.txt` lists them. The prototype passes all 189.

## AD-5: out of scope

- `margin=` with dpi ≠ 72 in the SVG page size, viewBox and translate. This
  is a pre-existing defect found at planning, and none of the probes set both.
  The issue text is in [harness/follow-up-margin-dpi.md](harness/follow-up-margin-dpi.md):
  planning could not file it (the permission classifier refused).
- #198 (plain's scale ignores `pad=`). `writePlain` keeps its pad of 0.
- `GVDEVICE_EVENTS` (`setup_page`'s view-centred clip) and `page=`
  pagination. Neither is ported, and no port device has events.
- A `viewport` node named with an html-like label: #206's marker may make
  `nodes.get` miss it. No probe covers this.

## Baseline (Phase 8)

On `fa380cee`: see [decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. There is no data, API or schema
change. `RenderJob` gains a `view` field, and the `viewport.ts` exports
change (`initJobViewportZoom` goes; `setupPageClip` and `setupPageSize` take
a `JobViewport`). `src/index.ts`, `api` and `render` do not re-export any of
them (checked: `grep -rn viewport src/index.ts src/api src/render/index.ts`
finds none). Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 shape | `JobViewport` from one `jobViewport`; `setupPageClip`/`setupPageSize` take it; `RenderJob.view` | per-consumer override; all state on the job | `emit.c:3311-3386`, `:1171-1261`, `:1532-1537`; probe matrix 170/170 dot (base 66), 15/15 rtest neato, 280/280 other engines; smoke 2352/2352 |
| AD-2 parser | `scanStrtod`-based `sscanf` port | `FLOAT` regex | probes `hex-float`, `space-before-comma`, `four-numbers`, `name-then-number`, `unclosed-quote`, `empty-quotes` |
| AD-3 edge gate | `edge_in_box` in `edgeShown` | map-only gate; gate in `renderEdge` | `emit.c:3005`; probes `urls` (cmapx), `edge-color-warn` (stderr) |
| AD-4 tests | one new file on carried fixtures, including tests.txt's three cases | unit tests only | Port-the-tests rule (CLAUDE.md); `tests.txt:208-215` |
| AD-5 scope | margin×dpi, #198, events and pagination out | fix margin×dpi here | separate formulas (`svgBeginPage`, `emitSvgTag` margin terms); no probe sets both |
