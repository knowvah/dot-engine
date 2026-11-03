# Batch 1: baselines and native fixtures

Orchestrator only. Everything later compares against T0's bundle and the native fixtures
it commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | Branch, brief commit, preflight, gates, base bundle, model/image fixtures, VPSC native runs, model probe test | orchestrator | brief commit; `src/layout/neato/__fixtures__/models/**`, `src/gvc/__fixtures__/p8/**`; `src/layout/neato/models-probes.test.ts`; `plans/post-16-1-followups-8/harness/**`; scratchpad | — | [x] |
