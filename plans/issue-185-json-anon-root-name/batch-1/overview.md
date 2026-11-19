# Batch 1

One task, one agent (the executor itself). No parallel work: the fix is one
line in one renderer, and every test reads the same probes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-agnameof-root.md) | json root name through `agNameOf`, tests, gates, squash | executor | `src/render/json.ts`, `src/render/json-root-name.test.ts`, `src/render/dot/empty-graph-name.test.ts`, `src/gvc/rerender.test.ts` | — | [x] |
