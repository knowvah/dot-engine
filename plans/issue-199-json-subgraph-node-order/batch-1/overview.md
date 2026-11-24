# Batch 1

One task, run by the executor itself. The fix is three loops and an import;
its test is red until the fix lands, so splitting them would leave a red
commit.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-json-node-seq.md) | json's three node walks go in sequence order; fixture test on 10 probes × dot, neato × json, json0 and a subgraph render; gates; squash | executor | `src/render/json-cluster-edge.ts`, `src/render/json.ts`, `src/render/json-node-seq.test.ts` | — | [x] |
