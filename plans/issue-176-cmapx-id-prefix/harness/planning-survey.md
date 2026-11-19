# Planning-time prototype results: issue #176

Base `a0338483`. The prototype was a scratch edit, reverted before the brief
was written: in `src/gvc/device.ts:render()`,
`job.drawingId = substObjAnchor(g.attrs.get('id') ?? '', g)` for every
renderer, and the `job.drawingId = ...` line removed from `svgBeginGraph`.
Both bundles were built with `npm run build:js`.

## Probes ([prototype-probes.tsv](prototype-probes.tsv))

`node rowcheck.mjs base.mjs proto.mjs probes/*.gv`, dot, neato, fdp ×
cmapx, cmapx_np, svg: 90 rows. `native` 36, `unchanged` 30, `toward` 12,
`AWAY` 12.

- `native`: `repro`, `html`, `ownid`, `glabel`, `clust-late`, `subst`, all
  cmapx and cmapx_np rows.
- `toward`: `subst` svg (6 lines to 4 against native; left: the 3 svg header
  lines the port always wraps, and the root `<g id="x\G">`, #249); `subst2`
  cmapx and cmapx_np (left: `id="i\N"`, #249) and svg (9 to 6; #249 lines and
  the header).
- `AWAY` (the strict line rule): `clust` cmapx and cmapx_np, cluster line
  `clust1` to `R_clust1` against native `R` (#242); `elabel` cmapx and
  cmapx_np, label lines `edge1` to `R_edge1` against native `R_edge1-label`
  and `R_edge1-headlabel` (#177). See AD-3.
- `unchanged`: every other svg row, and `noid` (byte-equal on both).

## Corpus inputs that set `id` ([prototype-rootid.tsv](prototype-rootid.tsv))

The 10 files of [survey-rootid.txt](survey-rootid.txt) other than `2854.dot`
(685 kB; it sets only node ids, so `drawingId` is `''` on base and head), dot,
neato, fdp × cmapx, cmapx_np, svg: 90 rows. `native` 6 (`2258.dot` cmapx and
cmapx_np under the three engines), `unchanged` 81, `timeout` 3 (`2239.dot`
under fdp: native hits the 120 s cap). No `toward`, no `AWAY`.

Of the eleven files, only `2258.dot` sets `id` on the root graph and has an
anchor; `2184.dot` sets it in a subgraph's `graph [...]`, `triedds.gv` on
edges, the rest on nodes or in label text.
