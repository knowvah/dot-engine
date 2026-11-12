# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Trace fdp.gv to the first value where the port departs from native; classify it (AD-3) | orchestrator, or a `debugger` subagent given T1's file | `plans/issue-142-fdp-bb-drift/harness/**`, the mission journal; temporary traces under `$TMPDIR` and uncommitted in `src/` | — | [x] |

Spec: [T1-diagnose.md](T1-diagnose.md). Batch 2 starts only once T1 has journalled
the diagnosis artifact and the class.
