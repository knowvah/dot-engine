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
| [batch-2](./batch-2/overview.md) — 6 parallel test-writer agents, top families | [x] |
| [batch-3](./batch-3/overview.md) — 6 parallel agents, next families | [x] |
| [batch-4](./batch-4/overview.md) — long-tail sweep, ratchet, closeout | [x] |

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

## Mission summary (closed 2026-07-28)

- Globals: statements 86.13 -> 95.54, branches 73.72 -> 90.64,
  functions 91.06 -> 97.36, lines 89.23 -> 96.87. Thresholds ratcheted
  to 90/90/90/90 in vitest.config.ts (gate-bite proven).
- Tasks: 15/15 planned tasks completed (T1; T2a-f; T3a-f incl. two
  transient-API-error agent resumes; T4 sweep as 6 agents; T5; T6).
- Suite: 3406 -> 6015 tests (337 files), ~9s wall. 10 golden fixtures
  added (manifest 238 -> 247); zero churn on existing refs throughout.
- Findings (4 real port bugs, .todo-skipped, NOT patched — follow-up
  src fixes needed):
  1. xdot/parse.ts parseString accepts truncated byte-counted strings
     (C returns NULL) — corrupt xdot survives parsing.
  2. common/record.ts attrBool lacks C mapBool's digit guard —
     attrBool('abc') is true, C says false.
  3. common/htmltable-parse.ts: `<TH>` in an HTML label hangs the
     parser (C treats TH as a row synonym, port opens an unclosable
     cell). Dormant but a DoS-shaped input.
  4. cdt DtBag.delete misses non-root duplicates (bagInsert threads
     .right, lookups walk .left). Latent, no production caller.
- Deletions (T1, evidence journaled): gvc/textlayout.ts,
  layout/pack/test-helpers.ts, layout/patchwork/tree-node.ts.
