# Batch 0 — oracle re-pin, ratchet, 16.1 baselines

Sequential. T1 can run in a worktree while T0 builds; T2 needs both.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T0 | Re-pin the oracle to 16.1.0 (keep 15.x worktree), homebrew equivalence check | orchestrator | `~/git/graphviz` (local branches), `~/git/graphviz-15`, `/tmp/ghl`, `/tmp/ghl15`, journal | — | [x] |
| T1 | Ratchet harness: `known-failing.json` + expected-failure wiring | typescript-pro | `test/golden/known-failing.json`, `test/helpers/known-failing.ts` (+ test), `test/golden/suite.test.ts` | — | [x] |
| T2 | Re-baseline at 16.1.0: golden refs, corpus manifest, survey/perf/walk baselines, ratchet entries | orchestrator | `test/golden/refs/*`, `test/corpus/corpus-manifest.json`, `test/golden/known-failing.json`, `test/corpus/parity-baseline.json`, journal | T0, T1 | [x] |

Specs: [T0](T0-oracle-repin.md) · [T1](T1-ratchet-harness.md) · [T2](T2-rebaseline.md)
