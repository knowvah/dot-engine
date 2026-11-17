# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Drop `fdpTLayout`'s `ctr != 0` guard; test it on a pinned `-0` | orchestrator (no subagent: one statement and one test block) | `src/layout/fdp/tlayout.ts`, `src/layout/fdp/fdp.test.ts`, journals | — | [x] |

Spec: [T1-fdp-ctr-always-add.md](T1-fdp-ctr-always-add.md).
