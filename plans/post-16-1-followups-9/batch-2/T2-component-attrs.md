# T2: components copy the root's attributes (item 111, AD-1)

**Context:** C's `agsubg` copies the parent's attribute values into a new subgraph. The port's
`buildSubgraph` leaves `sg.attrs` empty, so `g.attrs.get('maxiter')` on a component misses the root's
value (`init.ts:343,344,392`, `kk.ts:103,348`, `sgd.ts:474,476`, `stress.ts:55`). `src/layout/pack/index.ts`
is 574 lines, over the hook's limit, so it may not grow.

**Task:**
1. Move the `lib/pack/ccomps.c` ports (`dfsCollect` if nothing else needs it, `buildSubgraph`, `ccomps`,
   `cccomps`, `pccomps`, `isConnected`) unchanged to a new `src/layout/pack/ccomps.ts`. `index.ts`
   re-exports them, so no caller changes. Confirm that the move alone leaves the bundle's behaviour
   identical before going on.
2. Tests first, in a new `src/layout/neato/multi-component-attrs.test.ts`, from T0's fixtures, comparing
   xdot at 0.01 and stderr byte for byte. Copy the shape of `models-probes.test.ts`.
3. Copy the parent's attributes in `ccomps` and `pccomps`, with `@see lib/cgraph/subg.c:agsubg` and
   `lib/cgraph/attr.c:agmakeattrs`. `buildSubgraph` stays as it is, because dot uses it (AD-1).
4. Run the libm gate on the new test. Add any `pow`-sensitive case to a replay as `kk-large` does.
5. Audit: list every `attrs.get` reached from component layout in neato, twopi, circo and sfdp, and
   report any whose behaviour this changes.

**Write-set:** `src/layout/pack/ccomps.ts` (new), `src/layout/pack/index.ts`,
`src/layout/neato/multi-component-attrs.test.ts` (new), replay fixtures beside T0's if the libm gate needs them.
**Read-set:** `src/layout/pack/index.ts:380-470`, `src/layout/dot/pack-components.ts:160-235`,
`~/git/graphviz/lib/cgraph/attr.c` (`agmakeattrs`), `test/corpus/oracle-segfault-pack-newrank.test.ts`.

**Interface output (T6):** `ccomps` and `pccomps` return components holding a copy of the parent's
attributes, from `src/layout/pack/ccomps.ts`.

**Acceptance criteria:**
- *Given* a multi-component neato graph with root `maxiter`, `epsilon` or `stresswt`, *when* laid out on
  major, hier, sgd or KK with pack, *then* xdot matches native at 0.01 and stderr is equal.
- *Given* `maxiter=-1`, or `maxiter=3` with a cluster, *when* laid out, *then* it matches native.
- *Given* dot on the smoke ids, *when* bytediffed, *then* output is identical (stop 9).
- *Given* the other engines on the smoke ids, *when* bytediffed, *then* every change matches native.

**Commit:** `fix(T2): copy root attributes into neato components`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
