# Batch 1

One task, run by the executor itself, with no parallel work. The field, its
writers, its reader and the tests that name it must change together (one
interface and all its uses).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-remove-lost.md) | remove `EdgeInfo.lost`, add the `s1` side-port case, gates, squash | executor | `src/model/edgeInfo.ts`, `src/layout/dot/{edge-route,edge-route-rank,edge-route-chain,splines-flat-labeled,splines-route}.ts`, two tests, one fixture | — | [x] |
