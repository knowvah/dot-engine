# Batch 0 — setup and baselines

Sequential, orchestrator only. Everything later gates against what this batch
records.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T0 | Branch, oracle plugin dir, fresh survey baseline, perf baseline, native refs for all repros | orchestrator | `test/golden/inputs/pt-issue-*.dot`, `test/golden/refs/pt-issue-*.svg`, journal | — | [x] |

Spec: [T0-setup-baselines.md](T0-setup-baselines.md)
