# T4: circo root lookup (found in planning, AD-7)

**Context:** `blocktree.ts:165` searches `g.parent.nodes` for the graph's `root`, where C searches the
component (`blocktree.c:120`). A root in another component then throws in `doBlock`:
`graph G {root=a; a--b--c; d--e--f}` gives `InternalError: Cannot read properties of undefined (reading
'children')`. The port also has no node-level branch: `e[root=true]` misses native by 214 diffs.

**Task:**
1. Tests first, in a new `src/layout/circo/root.test.ts`, from T0's `src/layout/circo/__fixtures__/root/`.
2. Port `blocktree.c:119-132` in C's order: `rootname` searched in the component, then the first node with
   `late_bool(ORIGN(n), N_root, false)`, then the first node.
3. Add `N_root` to `CircState`, set where C sets it (`circular.c:30-36`). Read `agget(rootg, "root")` as C does.
4. Run the libm gate on the new test.

**Write-set:** `src/layout/circo/blocktree.ts`, `src/layout/circo/blocks.ts`, `src/layout/circo/circular.ts`
(the state setup only; T6 edits its `ccomps` call later), `src/layout/circo/root.test.ts` (new).
**Read-set:** `~/git/graphviz/lib/circogen/blocktree.c:110-135`, `~/git/graphviz/lib/circogen/circular.c:25-40`,
`src/layout/circo/blocktree.ts:155-175`, `src/layout/circo/circular.ts:125-145`.

**Acceptance criteria:**
- *Given* a graph-level `root` on a disconnected graph, *when* laid out, *then* it does not throw and
  xdot matches native at 0.01.
- *Given* `root` naming no node, *when* laid out, *then* it matches native.
- *Given* `e[root=true]` connected, or `g[root=true]` in a later component, *when* laid out, *then* it matches
  native.
- *Given* both a graph `root` and a node `root=true`, *when* laid out, *then* C's precedence holds.

**Commit:** `fix(T4): port circo root lookup per component and per node`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
