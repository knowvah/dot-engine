# T24: `transparent` pen under a colorscheme (item 63, AD-9)

**Context:** under a `colorscheme`, `transparent` is looked up in the scheme and reported
as `Warning: transparent is not a known color.` for non-SVG renderers (the SVG renderer
knows it natively). The port reports it only for the root background (part 3 T10,
`src/render/color-resolve.ts:148`). Native also reports it for the `transparent` pen of
`peripheries=0` filled nodes and of clusters (`emit.c` cluster pen at `:3888`, `:3901`,
node pen in `shapes.c` `poly_gencode` when `peripheries == 0`).

**Task:** route those pens through the same reporting path for the renderers where native
reports it (probe each format with T0's cases); include the striped-cluster pen T14 added.
Also add `in cluster %s` AGPREV after a cluster `parseSegs` error if T6 recorded it as
missing.

**Write-set:** `src/gvc/device-cluster.ts`, the node-pen emit site (confirm with
`grep -rn "'transparent'" src/common/poly-gencode.ts src/render src/gvc`; one file
expected) (+ tests).
**Read-set:** `src/render/color-resolve.ts:120-160`; `lib/common/emit.c:3870-3910`;
`lib/common/shapes.c` `poly_gencode` peripheries branch; part 3 T10 journal rows.

**Acceptance criteria:**
- *Given* `digraph{colorscheme=blues9;a[style=filled;peripheries=0]}` as xdot, *then*
  stderr equals native's.
- *Given* a filled cluster with `peripheries=0` under a colorscheme as xdot and plain,
  *then* stderr equals native's.
- *Given* the same as svg, *then* no new line (native prints none).

**Observability:** N/A. **Rollback:** reversible.
