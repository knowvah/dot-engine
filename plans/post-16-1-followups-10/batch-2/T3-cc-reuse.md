# T3: `ccomps` reuses a user's `_cc_N` subgraph (115, AD-7)

**Context:** `lib/pack/ccomps.c:147,162,205` create a component with `agsubg(g, name, 1)`, which returns an existing subgraph of that name, so its
nodes stay and the component's join them. `buildSubgraph` (`src/layout/pack/ccomps.ts:30`) always makes a fresh graph. On
`graph G { a -- b; subgraph _cc_0 { c } d -- e; }`, circo and neato match native; twopi and sfdp differ by 22 lines, and native twopi prints
`Error: twopi: use of weight=0 creates disconnected component.`

**Task:**
1. Tests first, from `src/layout/pack/__fixtures__/cc-reuse/`.
2. Make `ccomps` and `pccomps` reuse an existing subgraph of the component's name, as `agsubg` does: the same object, gaining the nodes and induced
   edges. `cccompsWithClusters` keeps using `buildSubgraph` unchanged.
3. Check what follows on each engine: `c` being in `_cc_0` changes component membership, which is why twopi errors. The message is not in `src/`
   today: port it and its branch from `lib/twopigen/`, and only that, in `src/layout/twopi/`.
4. Confirm `dot` output shows what native's does for the user's subgraph.

**Write-set:** `src/layout/pack/ccomps.ts`, `src/layout/twopi/` for the message only, a new `src/layout/pack/cc-reuse.test.ts`.

**Read-set:** `lib/pack/ccomps.c:83-110,140-210`; `lib/cgraph/subg.c:agsubg`; `decisions.md#ad-7`.

**Acceptance criteria:**
- *Given* the filed graph on circo, twopi, sfdp, neato and osage, *when* rendered, *then* output and stderr match the fixtures.
- *Given* a graph with no `_cc_N` subgraph, *when* bytediffed over the smoke ids, *then* output is byte-identical (stop 8).
- *Given* dot, *then* nothing changes: `src/layout/dot/pack-components.ts` is untouched.

**Commit:** `fix(T3): reuse a user's _cc_N subgraph in ccomps as agsubg does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
