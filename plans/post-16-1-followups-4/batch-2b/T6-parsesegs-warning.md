# T6: `Total size > 1` color-spec warning (item 57)

**Context:** `lib/common/emit.c:470` `parseSegs` prints
`agwarningf("Total size > 1 in \"%s\" color spec ", clrs)` (rval 3) once per process
(`static atomic_flag warned`, shared with its `Illegal value … float expected after ';'`
error, rval 2). Callers add the object: `multicolor` (`emit.c:1985-1989`) prints
`agerr(AGPREV, "in edge %s%s%s\n", …)` (` -> ` or ` -- `) for rv > 1; the cluster caller
(`emit.c:3904`) prints `in cluster %s`. The port never prints the Total-size warning.

**Task:** port the warning and its once-only flag in the port of `parseSegs`
(`src/common/multicolor.ts`), sharing the flag with the existing Illegal-value error
exactly as C does; register the flag with `registerRenderState` (part 3 AD-4); make each
caller of `parseSegs` print its AGPREV context line as its C caller does (edge, cluster;
check the node `stripedBox`/`wedgedEllipse` callers `emit.c:556,603` and `4343`).

**Write-set:** `src/common/multicolor.ts` and the callers that need their AGPREV context
line: `src/render/svg-edge-split.ts:163`, `src/render/svg-multicolor.ts:235,291`,
`src/render/svg-parallel-edge.ts:117`, `src/gvc/device-cluster.ts:127`, and the xdot/json
path's equivalent if separate (find with `grep -rn "parseSegs\|segs, error" src`), + tests.
**Read-set:** `lib/common/emit.c:440-620,1975-1995,3890-3910,4335-4350`.

**Interface output (T25):** `parseSegs` signature unchanged; the warning is printed inside
it; callers print their own context line.

**Acceptance criteria:**
- *Given* `digraph{a->b[color="red;0.7:blue;0.6"]}`, *when* rendered, *then* stderr equals
  native's `Warning: Total size > 1 in "red;0.7:blue;0.6" color spec in edge a -> b`.
- *Given* two such edges, *then* the warning prints once, as native.
- *Given* the corpus ids with `;` color lists, *then* bytediff main outputs identical.

**Observability:** N/A. **Rollback:** reversible.
