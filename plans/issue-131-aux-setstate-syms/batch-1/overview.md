# Batch 1

One task, with no dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Probe the ten symbols against native; unbind `E_headlabel`, `E_taillabel`, `E_xlabel`, `N_xlabel` (and any field-only symbol a probe convicts) in the aux init; pin it in tests | orchestrator (no subagent: a small change plus a native probe matrix that needs the session's context) | `src/layout/dot/init.ts`, `src/common/edge-label-init.ts`, `src/common/nodeinit.ts`, `src/layout/dot/flat-adj-aux-syms.test.ts` (new), `src/common/edge-label-init.test.ts`, `src/common/nodeinit.test.ts`, `src/layout/dot/init.branch.test.ts`, `plans/post-16.1-followups/README.md` (item 141), `plans/decision-journal.md`, this mission's `decision-journal.md` and README summary, `.agent-notes/issue-131.md` (only if novel) | none | [x] |

Spec: [T1-aux-syms.md](T1-aux-syms.md).
