# Batch 1

Two tasks, in sequence. T2 runs the gates over both changes and squashes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Red probe tests, then `Math.trunc(ranksep / 2)` at the six beginpath/endpath sites | orchestrator (small, needs the session's harness) | see [T1](T1-ranksep-boxes.md#write-set) | none | [x] |
| T2 | Red unit test, then the `position.c:276` sibling; gates 1-6; squash | orchestrator | see [T2](T2-sibling-gates.md#write-set) | T1 | [x] |

T1's output interface, which T2 consumes: a head bundle at
`$TMPDIR/i173/head.mjs`, a base bundle at `$TMPDIR/i173/base.mjs`, and a journal
row `T1` with the `compare.mjs` table (all `head` 0).

Specs: [T1-ranksep-boxes.md](T1-ranksep-boxes.md),
[T2-sibling-gates.md](T2-sibling-gates.md).
