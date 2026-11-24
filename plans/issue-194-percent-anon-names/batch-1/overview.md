# Batch 1

The executor runs this one task itself, with nothing in parallel. The fix
touches one parser file and one helper, and the test file pins it. Splitting
them would leave a red test between commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-local-names.md) | `%` graph names take cgraph's anonymous id in the parser; tests on carried fixtures; two comments; gates; squash | executor | `src/parser/builder.ts`, `src/model/cgraph-ops.ts`, `src/parser/builder-local-names.test.ts`, comments in `clust-map.ts` and `empty-graph-name.test.ts` | — | [x] |
