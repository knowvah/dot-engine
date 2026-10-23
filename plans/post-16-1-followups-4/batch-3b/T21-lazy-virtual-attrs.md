# T21: lazy `attrs` on dot virtual nodes and edges (item 68, AD-12)

**Context:** dot virtual nodes/edges cost 2,490 B per pair in the port vs ≈1,056 B in C
(`class2` chains). Each allocates an empty `attrs` Map (~372 B/pair; C virtual nodes have
no attribute record): `src/model/node.ts:70`, `src/model/edge.ts:101`
(`this.attrs = new Map()`). Virtual objects come from `src/layout/dot/fastgr.ts:355`
(`virtualNode`), callers `classify.ts:110,159,183`, `cluster-path.ts:76`,
`cluster.ts:375`.

**Task:**
1. Enumerate every direct `attrs` write reachable from a virtual node/edge
   (`.attrs.set(`, `.attrs.delete(`, `.attrs =`, helpers that write through `attrs`). If
   more than ~10 distinct write sites, stop and park with the list (AD-12).
2. Virtual objects start with no map; reads see one shared read-only empty map
   (`ReadonlyMap`, typed so a write through it fails to compile); the first write
   materialises a private `Map`. Real (non-virtual) nodes/edges unchanged.
3. Measure bytes/pair with T0's method; record T0 vs T21.

**Write-set:** `src/model/node.ts`, `src/model/edge.ts`, `src/layout/dot/fastgr.ts`, and the
write sites from step 1 (≤ ~10) (+ tests).
**Read-set:** `node.ts:50-90`, `edge.ts:80-120`, `fastgr.ts:330-380`; the callers above.

**Acceptance criteria:**
- *Given* a virtual node, *when* `attrs.get(x)` is read before any write, *then* it returns
  `undefined` and no `Map` is allocated (test via a construction counter or identity of the
  shared empty map).
- *Given* a write to a virtual node's attrs, *then* only that node's map holds the value.
- *Given* the corpus (dot, all formats), *then* bytediff identical and the batch survey
  shows 0 changes; speed p50 ≤ 1.05× (stop 7); bytes/pair recorded.

**Observability:** N/A. **Rollback:** reversible.
