# Issue #163: ignore the removed `compact` attribute (graphviz 16.1.1)

## Observation: 16.1.1 has no weak/strong clusters; the older note is history
- **Context**: Deleting `xgWeak`, `isAStrongCluster` and `compileClusters`
  from `src/layout/dot/rank-dot2.ts` (upstream `d5061e47c`, `731f7c560`).
- **Finding**: `.agent-notes/newrank-compact-strong-cluster-weak-path.md`
  describes the TOP/BOT dedup fix made against 16.1.0. None of that code
  exists after this mission. `makeXnode` keeps its by-name dedup because C's
  `agnode(G, name, 1)` has it, but its only fixed-name caller left is
  `connectComponents` (ROOT, at most once per Xg).
- **Impact**: A `newrank=true` graph with `compact=true` clusters ranks like
  any other. The five `dot-newrank-compact-*` goldens now pin "`compact` is
  ignored"; their descriptions still say otherwise (#238).
- **Confidence**: High (48 survey jobs equal native 16.1.1, stderr empty).

## Observation: the port never inherited a root-level `compact`
- **Context**: Control probe
  `plans/issue-163-remove-compact/harness/probe-root-compact.dot`
  (`compact=true` on the root, two plain clusters, `newrank=true`).
- **Finding**: Native 16.1.0 ranks it in 3 levels (`agget(clust, "compact")`
  returns the root's value, so both clusters were strong); native 16.1.1 ranks
  it in 5. The port base already gave 5: `isAStrongCluster` read
  `g.attrs.get('compact')` on the cluster alone. So the port diverged from
  16.1.0 there and equalled 16.1.1 by accident.
- **Impact**: Moot for `compact`. The same `agget`-inherits versus
  `attrs.get`-does-not gap applies to any other subgraph attribute read this
  way (the family of #183).
- **Confidence**: High (measured on both native builds and the base bundle).

## Observation: `known-failing.json` is empty after this mission
- **Context**: Un-listing the two goldens (the `test.fails` ratchet in
  `test/helpers/known-failing.ts` goes red when a listed test passes).
- **Finding**: `npm test` reports 0 expected-fail tests; both lists
  (`goldens`, `ptIssue`) are `[]`.
- **Impact**: Any expected-fail count above 0 in a later run is a new entry.
- **Confidence**: High.
