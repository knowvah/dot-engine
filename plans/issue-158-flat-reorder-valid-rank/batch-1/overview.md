# Batch 1

Four tasks, in order (each needs the one before). Orchestrator only, no
subagent: each task is one function or one set of fixtures, and they share the
journal.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port `valid_rank` in `flat_reorder`; shrink the known-failing ratchet | orchestrator | `mincross-flat.ts`, its two test files, `known-failing.json` | — | [x] |
| T2 | Re-capture the 16.1.0 fixtures T1 turns red; diagnose 2723's stderr | orchestrator | rerender fixtures, five dot test files | T1 | [x] |
| T3 | Route a non-adjacent flat group in seq (edgecmp) order | orchestrator | `splines-flat-multi.ts`, its test | T1 | [x] |
| T4 | Gates 1-6, 2239 trace, report, squash | orchestrator | journals | T1-T3 | [x] |

Specs: [T1](T1-valid-rank.md), [T2](T2-recapture-fixtures.md),
[T3](T3-flat-group-order.md), [T4](T4-gates-finish.md).
