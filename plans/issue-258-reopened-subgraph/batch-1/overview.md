# Batch 1

One task, one agent (the executor itself). No parallel work: the fix is in one
function family of one file, and every check reads the same probes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-merge-reopened-subgraph.md) | re-use a re-opened subgraph, endpoint expansion, tests, gates, squash | executor | `src/parser/builder.ts`, `src/parser/builder-reopen.test.ts` | — | [x] |
