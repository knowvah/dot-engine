<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — four independent port-bug fixes

All four tasks are independent: disjoint write-sets, no inter-task interface
contracts. Launch all four agents in parallel in a single response.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | parseString rejects truncated byte-counted strings | typescript-pro | src/xdot/parse.ts, src/xdot/parse.branch.test.ts | — | [ ] |
| T2 | attrBool delegates to mapbool (digit guard) | typescript-pro | src/common/record.ts, src/common/record.branch.test.ts | — | [ ] |
| T3 | TH is a row synonym (fixes infinite loop) | typescript-pro | src/common/htmltable-lex.ts, src/common/htmltable-lex.test.ts, src/common/htmltable-parse.ts, src/common/htmltable-parse.branch.test.ts | — | [ ] |
| T4 | DtBag.delete finds non-root duplicates | typescript-pro | src/cdt/bag.ts, src/cdt/bag.branch.test.ts, src/cdt/splay-core.ts (comment only) | — | [ ] |

Journal discipline: task agents do NOT write `decision-journal.md`; each agent
returns its journal-entry text and the orchestrator appends all entries after
the batch (single-writer rule).

After the batch: run the end-of-mission gates in
[../README.md](../README.md#quality-gates), then update checkboxes here and in
the README, then journal.
