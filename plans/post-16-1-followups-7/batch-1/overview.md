# Batch 1: baselines and native probe fixtures

Orchestrator only. Everything later compares against T0's bundle and against the native
fixtures it commits. Part 6 lost probes that lived only in a scratchpad; this time the
inputs and native outputs are committed.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | Branch, brief commit, oracle preflight, gates, base bundle, native probe fixtures, ipsep probe test | orchestrator | brief commit; `src/layout/neato/__fixtures__/ipsep/**`, `src/gvc/__fixtures__/p7/**`; `src/layout/neato/ipsep-probes.test.ts`; scratchpad | — | [ ] |
