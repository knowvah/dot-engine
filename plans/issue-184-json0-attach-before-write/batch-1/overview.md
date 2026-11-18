# Batch 1

One task, one agent (the executor itself). No parallel work: the fix is two
lines in one renderer, and every test reads the same probes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-attach-before-write.md) | attach before the json0 write, tests, gates, squash | executor | `src/render/json.ts`, `src/render/json-cluster-edge.ts` (comment), `src/render/json0-attach.test.ts`, `src/render/json-dup-cluster.test.ts` | — | [x] |
