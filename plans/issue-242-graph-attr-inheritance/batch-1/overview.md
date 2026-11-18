# Batch 1

One task, one agent (the executor itself). No parallel work: the change is one
loop in the builder plus two writer guards that only make sense together (the
loop alone breaks 19 json tests), and every check reads the same bundles.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-seed-inherited-attrs.md) | seed every inherited graph attribute; writers skip seeded keys; tests, gates, squash | executor | `src/parser/builder.ts`, `src/model/cgraph-ops.ts`, `src/render/json.ts`, `src/render/dot/attrs.ts`, `src/model/graph.ts`, `src/parser/builder-inherit.test.ts`, `src/model/cgraph-ops.test.ts` | — | [x] |
