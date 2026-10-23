# Batch 1: baselines, tooling import, native references

Orchestrator only. Everything later depends on T0: the base bundle and `test/tools/` for
byte-identity and stderr parity, the disassembly for T10–T13, the clang-harness setup for
T15–T17/T22, the native reference outputs for every diagnostics task, and
`timings-T0.json` for the speed gates.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | Branch, brief commit, oracle preflight, tools into `test/tools/`, base bundle, disassembly, native refs, timings, bytes/pair | orchestrator | brief commit; `test/tools/**` (verbatim copies); scratchpad | — | [ ] |
