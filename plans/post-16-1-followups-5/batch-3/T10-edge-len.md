# T10: `setEdgeLen` on every neato mode (item 73)

**Context:** `lib/neatogen/stuff.c:scan_graph_mode` calls `setEdgeLen(G, np, lenx, dfltlen)`
for every node in every mode (KK, SGD and the `else` branch for major/hier/ipsep), so a
bad `len` warns `bad edge len "x" in %s - setting to 1.00` and `ED_dist` falls back to 1.0;
`neatoinit.c:makeGraphData:814-826` then reads `ED_dist(ep)`. The port's
`src/layout/neato/edge-len.ts:35` runs `setEdgeLen` only on the KK/SGD paths, and
`make-graph-data.ts:132` reads `lateDouble(len, 1.0, 0)` straight from the attribute,
so major-mode distances differ for negative, zero and non-numeric `len`.

**Task:** (1) Call `setEdgeLen` where `scan_graph_mode`'s `else` branch does on the
major/hier/ipsep path (`init.ts`), keeping C's node iteration order. (2) `makeGraphDataC`
reads `ep.info.dist` where C reads `ED_dist`. (3) `lenattr`: confirm the sscanf prefix
rule, the `*val == 0 && !Nop` condition, and that the warning is one `agwarningf` with the
graph name from `agNameOf` (T4). (4) Tests from `$BASE/native/73*` for each mode and for
fdp.

**Write-set:** `src/layout/neato/init.ts`, `make-graph-data.ts`, `edge-len.ts` (+ tests).
**Read-set:** `lib/neatogen/stuff.c:155-300`, `lib/neatogen/neatoinit.c:755-830`;
`src/layout/neato/edge-len.ts` (whole); T4's hand-back.

**Acceptance criteria:**
- *Given* `graph{a--b[len=x]}` -Kneato (default mode), *then* stderr equals native.
- *Given* `len=-2` under `mode=major`, *then* xdot matches native at 0.01 (distance 1.0).
- *Given* the neato and fdp walks, *then* no pass→worse; bytediff changes only on ids with
  a bad `len`, each explained.

**Observability:** N/A. **Rollback:** reversible.
