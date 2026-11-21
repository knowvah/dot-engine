# Batch 1

One task, one agent (the executor itself), with no parallel work. The four
files form one return-code chain and must change together. An interface
change and all its call sites make one unit.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-flat-adj-rc.md) | rc from `makeFlatAdjEdges` to `dotSplines_`, tests, budgets, gates, squash | executor | `src/layout/dot/{splines-flat,edge-route,splines-groups,splines}.ts`, `src/layout/dot/splines-flat-adj-rc.test.ts` | — | [x] |
