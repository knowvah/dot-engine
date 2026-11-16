# Batch 1

The two tasks run in order: T2 trusts the widths that T1 confirms.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Native harness against 16.1.1's `libneatogen.a`. Confirm AD-1's widths and AD-3's fused balance bit for bit, and produce the unit-fixture vectors. | orchestrator (no subagent: a small C harness plus one comparison script) | `plans/issue-156-neato-double-laplacian/harness/native/` (new), journal | — | [x] |
| T2 | Port `conjugateGradientD`, the double Laplacian and the subspace switch. Retire the float path, and re-capture the `mode=hier` fixtures from 16.1.1. | orchestrator (one atomic numeric change; splitting it would leave a half-float pipeline) | `src/layout/neato/{conjgrad,matrix-ops,matrix-ops-dense,smart-ini-x,stress-subspace}.ts`, their tests, `__fixtures__/hier*`, journals | T1 | [x] |

Specs: [T1-native-harness.md](T1-native-harness.md), [T2-port-double-cg.md](T2-port-double-cg.md).
