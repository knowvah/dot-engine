# Batch 1 — fault-acceptance helper

One task. It defines the shared types and the single acceptance rule that
batch 2's three tasks consume, so it lands first.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-fault-helper.md) | `FaultAcceptance` types + `acceptsOutcome` / `validateFaultFields` | typescript-pro | `test/corpus/accepted-class.ts`, `accepted-class.test.ts` | — | [ ] |
