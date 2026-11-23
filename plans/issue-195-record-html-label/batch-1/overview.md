# Batch 1

The executor runs this one task itself, with nothing in parallel. The fix is
three small edits that only work together (label, fields, emit), and the test
file pins all three. Splitting them would leave a red test between commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-record-html-label.md) | port `make_label`'s `is_record` branch; html field labels and their emit; plain `lbl.html`; tests on carried fixtures; gates; squash | executor | `src/common/make-label.ts`, `src/common/record.ts`, `src/render/map.ts`, `src/common/record-html-label.test.ts`, `src/common/record.branch.test.ts:257-261` | — | [x] |
