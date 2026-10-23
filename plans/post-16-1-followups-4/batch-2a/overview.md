# Batch 2a: tooling, fitness reasons, walk nondeterminism, docs

Parallel worktrees after T0, alongside batch 2b. No `src/` writes; write-sets are disjoint
from each other and from 2b. T1's `probe` is the stderr-parity gate for 2b onward, so land
T1 first. T3's status is consumed by T29.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-tools.md) | Items 65, 66 + AD-10 normalization: tools to tsx, classify, probe | typescript-pro | `test/tools/**` | T0 | [ ] |
| [T2](T2-fitness-reasons.md) | Item 45: stale module-globals allowlist reasons | typescript-pro | `test/architecture/module-globals.fitness.test.ts` | T0 | [ ] |
| [T3](T3-walk-nondeterminism.md) | Item 69: `oracle-nondeterministic` walk status | typescript-pro | `test/corpus/{engine-walk,json-walk,oracle-env}.ts`, status readers, tests | T0 | [ ] |
| [T9](T9-docs-52-56.md) | Items 52, 56: documented closures | documentation-engineer | `docs/known-divergences.md`, `docs-site/*/divergences.md` | T0 | [ ] |
