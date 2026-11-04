# T6: `ccomps` names (item 112, AD-6)

**Context:** C's callers pass no prefix (`twopiinit.c:102`, `sfdpinit.c:268`, `circularinit.c:126`), which gives
`_cc_0`. The port passes `_twopi`, `_sfdp_cc` and `_cc`, and `ccomps` inserts `_` before the index where C appends
it directly. Part 8 T7's first attempt changed only the form and moved circo's name away from native's, so the
form and the callers change together. Nothing native prints reads these names today.

**Task:**
1. Tests first, in `src/layout/pack/index.branch.test.ts`: names for no prefix, a legal prefix and an illegal one.
2. Port `setPrefix` and `isLegal` (`ccomps.c:85-109`). `ccomps(g: Graph, pfx?: string | null): Graph[]`; `pccomps` and
   `cccomps` follow the same rule.
3. twopi, sfdp and circo pass no prefix. `isConnected` passes none. neato keeps `_neato_cc`.
4. Update `circo/circular.ts:derivedComponents`' own `_cc_${i}` only if it no longer agrees.
5. Probe a user `subgraph _cc_0 { ... }` on twopi, circo and sfdp against native: C's `agsubg(g, name, 1)` reuses it.
   If the port differs, report a follow-up rather than fixing it here.

**Write-set:** `src/layout/pack/ccomps.ts`, `src/layout/pack/index.branch.test.ts`, `src/layout/twopi/index.ts`,
`src/layout/sfdp/index.ts`, `src/layout/circo/circular.ts`.
**Read-set:** `~/git/graphviz/lib/pack/ccomps.c:85-215`, `src/layout/dot/pack-components.ts:160-175`,
`src/layout/neato/models-probes.test.ts:103-110` (the `_neato_cc0` stderr case).

**Interface output:** `ccomps(g: Graph, pfx?: string | null): Graph[]`.

**Acceptance criteria:**
- *Given* `ccomps` with no prefix or an illegal one, *when* it names components, *then* they are `_cc_0`, `_cc_1`.
- *Given* `pccomps` with `_neato_cc`, *when* it names components, *then* they are `_neato_cc0`, `_neato_cc1`.
- *Given* dot on the smoke ids, *when* bytediffed, *then* output is identical (stop 9).
- *Given* all other engines on the smoke ids, *when* bytediffed, *then* output is identical.

**Commit:** `fix(T6): name connected components as ccomps.c does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
