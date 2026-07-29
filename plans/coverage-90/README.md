<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: coverage-90 — 90% statements / branches / functions / lines

## Objective

Drive unit-test coverage (vitest, v8 provider, `npm run coverage`) to >=90%
on all four global metrics, then ratchet `vitest.config.ts` thresholds so CI
holds the line. Baseline at mission start (branch test/coverage-90, 2 slices
landed): statements 86.13 / branches 73.72 / functions 91.06 / lines 89.23.
The wall is BRANCHES (~2,750 uncovered across ~30 modules at 50-75%).
Test-only mission: no `src/` behavior changes (deletions of proven-dead code
only). A new test that exposes a real port bug is a FINDING (journal +
`.todo`-skip with reference), not something to patch around.

## Branch

Continue `test/coverage-90` (already 2 commits ahead of main). Squash-merge
is fine at PR time.

## Quality gates (per batch)

- `npm run coverage` — journal all four global numbers + per-family deltas
- `npx tsc --noEmit` clean; full suite green; suite wall-clock < 60s
- Zero churn on EXISTING golden refs (`git status` on refs/ shows only adds)
- Iterative-tolerance fixtures pass the suite twice consecutively
- Per-task `git diff --name-only` matches the declared write-set
- Assertion spot-read: sample each agent's tests for concrete-value
  assertions (no no-throw/non-null-only tests)

## Shared-write rules

- `test/golden/manifest.json` + suite count pin: ORCHESTRATOR-ONLY (agents
  author `.dot` inputs and declare intended entries in their task output).
- `test/helpers/`: one designated owner per batch (batch-2: T2c; batch-3:
  T3c). Others read-only.
- Oracle ref generation (`GVBINDIR=/tmp/ghl` native dot + gen-xdot-refs):
  agents may generate refs for THEIR OWN new fixture ids only.

## Batches

| Batch | Purpose | Status |
|-------|---------|--------|
| [batch-1](./batch-1/T1-gap-map.md) — T1 gap map + prompt payloads (serial) | [x] |
| [batch-2](./batch-2/overview.md) — 6 parallel test-writer agents, top families | [ ] |
| [batch-3](./batch-3/overview.md) — 6 parallel agents, next families | [ ] |
| [batch-4](./batch-4/overview.md) — long-tail sweep, ratchet, closeout | [ ] |

## Index

- [decisions.md](./decisions.md) — D1–D6 + stop/push-forward conditions
- [diagrams/component-map.md](./diagrams/component-map.md) — family → module map
- [diagrams/data-flow.md](./diagrams/data-flow.md) — batch loop
- [decision-journal.md](./decision-journal.md)

## Executor notes

- Agent prompts follow parallelism.md structure; agents are SONNET
  (implementation tier); they use Serena tools, not LSP.
- Fixture recipe (proven this session): author `.dot` (< 50 nodes; pin
  positions `pos="x,y!"` for iterative engines), oracle `-Tsvg` ref,
  `DOT_BIN=~/git/graphviz/build/cmd/dot/dot npx tsx
  test/golden/gen-xdot-refs.ts` for deterministic entries, iterate the
  geometry until the suite passes; DROP (and journal) attr variants that
  do not conform rather than chasing them.
- Coverage-probe hazard (learned this session): a test importing src by
  ABSOLUTE path from outside the project measures 0% — always verify
  coverage with in-project test files and relative imports.
