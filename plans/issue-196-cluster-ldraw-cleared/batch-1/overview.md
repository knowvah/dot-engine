# Batch 1

The executor runs this one task itself, with nothing in parallel. The fix is
three edits that only work together (record the empty value, carry it through
the write-back, print it under agwrite's rule), and the test file pins all
three. Splitting them would leave a red test between commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-cluster-ldraw.md) | set a labelled cluster's or root's `_ldraw_` from an empty buffer; write-back and serializer; tests on carried fixtures; gates; squash | executor | `src/render/dot.ts`, `src/render/dot/write-back.ts`, `src/render/dot/agwrite.ts`, `src/render/dot/cluster-ldraw.test.ts`, `src/render/json-stored-draws.test.ts` | — | [x] |
