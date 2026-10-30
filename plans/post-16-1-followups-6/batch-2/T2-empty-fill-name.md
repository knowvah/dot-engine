# T2: empty colour name in node and cluster fills (item 92, AD-5)

**Context (native 16.1 probe, 2026-10-29):**

| Case | Native stderr | Native fill |
|---|---|---|
| `digraph{a[style=filled fillcolor=":red"]}` | `Warning:  is not a known color.` | ellipse `#000000` |
| `subgraph cluster_x{style=filled fillcolor=":red"; a}` | same, once | polygon `#000000` |
| `subgraph cluster_x{bgcolor=":red"; a}` | same, once | polygon `#000000` |
| `a[style=filled fillcolor="red:"]` | none | gradient (port already matches) |

The port prints nothing and fills `none` for the first three. Part 5 T11 fixed the HTML
path with `resolveFillColorName` (`src/render/color-resolve.ts`, used by
`htmltable-emit-fill.ts:200`); node fills resolve through `resolveRenderColor`
(`poly-gencode.ts:291-341`) and clusters through `device-cluster.ts`.

**Task:**
1. Find C's call chain for each case first (`shapes.c:poly_gencode` → `findFillDflt` /
   `findStopColor` → `gvrender_set_fillcolor`; `emit.c:emit_clusters` for fillcolor and
   bgcolor) and record where the empty name reaches `gvrender_set_fillcolor`.
2. Tests first from `$BASE/native/92*` for svg, xdot and json (stderr and fill).
3. Route the node and cluster fills through `resolveFillColorName` at the C-equivalent
   point, so the warning prints once and the fill is opaque black.

**Write-set:** `src/common/poly-gencode.ts` (fill resolution only),
`src/gvc/device-cluster.ts` (+ tests beside each). If the empty-name resolution must
change inside `color-resolve.ts`, stop (stop 1) and report: part 5 T11 owns that helper's
contract.
**Read-set:** `lib/common/shapes.c` (`findFillDflt`, poly_gencode fill),
`lib/common/emit.c` (`findStopColor`, `emit_clusters` fill), `lib/gvc/gvrender.c`
(`gvrender_set_fillcolor`, `gvrender_resolve_color`), `src/render/color-resolve.ts`
(`resolveFillColorName`), `$BASE/native/92*`, part-5 journal T11 row.

**Acceptance criteria:**
- *Given* each of the three cases, *when* rendered -Tsvg, -Txdot and -Tjson, *then* stderr
  is the single native line and the fill is `#000000`.
- *Given* `fillcolor="red:"`, *then* output is unchanged.
- *Given* the corpus, *then* bytediff is identical (stop 8 otherwise).

**Observability:** N/A. **Rollback:** reversible.
