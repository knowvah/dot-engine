# Batch 1: baselines and native references

Orchestrator only. Everything later depends on T0: the base bundle for byte-identity, the
native reference outputs for every diagnostics task, and `timings-T0.json` for the speed
gates.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | Branch, brief commit, oracle preflight, gate baseline, base bundle, native refs, timings | orchestrator | brief commit; scratchpad | — | [x] |
