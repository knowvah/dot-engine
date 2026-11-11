# Batch 1

Two tasks, run in sequence: T2 needs T1's origin.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Trace the aux mincross window on native and the port; state the mechanism | orchestrator (no subagent: the native build and the traces need the session's context) | this mission's `decision-journal.md`, `.agent-notes/issue-170.md` | none | [x] |
| T2 | Red tests, the fix at T1's origin, gates, squash | orchestrator | see [T2](T2-fix.md#write-set) | T1 | [x] |

T1's output interface, which T2 consumes: a journal row headed `diagnosis` that
holds the mechanism, the origin as a C `file:line` plus its port `file:line`, the
causal chain, what was ruled out, and the first divergent value with both sides'
numbers.

Specs: [T1-diagnose.md](T1-diagnose.md), [T2-fix.md](T2-fix.md).
