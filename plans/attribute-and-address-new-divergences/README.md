<!-- SPDX-License-Identifier: EPL-2.0 -->
# Mission: attribute and address the new json/map divergences

## Type: fix (evidence-gated, with a conditional fix tail)

## Objective

Resolve the 7 remaining `diverged` rows on the iterative json/map parity tracks
by earning them a verdict rather than asserting one: bring the xdot tracks level
with the corpus universe, run the injection-attribution harness over the newly
diverged ids, verify the exoneration transfers to the json surface, and let the
computed A1-drift class absorb what is genuinely drift. Anything that does NOT
exonerate gets a root-caused mechanism, and a fix only if it is bounded.

## Scope — 7 rows, 3 distinct ids

| id | diverged on |
|---|---|
| `2621` | neato json, fdp json, sfdp json, sfdp map |
| `tree-graphs-directed-arrows` | fdp json, sfdp json |
| `tree-doc-infosrc-fixed` | sfdp json |

These entered the walker universe for the first time in PR #37's re-walk; none
has ever been through the attribution harness.

## Two blockers this mission must clear first

1. **Attribution cannot see them.** `attribute-divergence.ts:441-450` builds its
   work list from `parity-<engine>.json` rows with `status === 'diverged'` — the
   **xdot** track. All 3 ids are absent from all 3 xdot tracks (905 rows each,
   missing `2621`, `tree-doc-dotguide-curve`, `tree-doc-dotguide-icurve`,
   `tree-doc-infosrc-fixed`, `tree-graphs-directed-arrows`). Running attribution
   today reports 0 new work. → **T2** brings the tracks to 910.
2. **`engine-walk.ts` hard-codes a 90s port timeout** (line ~150) with no
   scaling and no env override — the only walker like this. It already
   manufactures phantom timeouts (`2108` on all 3 tracks, `1652` on fdp). A
   `timeout` row is invisible to attribution, so `2621` would stay stuck
   forever. → **T1** must land before T2.

## Branch

`fix/new-divergence-attribution` off `main` (currently `b7d106e5`).
PR title must be **`test:` or `chore:`** unless a `src/` defect is actually
fixed — this repo squash-merges and semantic-release reads the title, so a
`fix:` title on a harness-only change publishes a no-op npm release.

## Quality gates

| command | pass condition | on fail |
|---|---|---|
| `npm run typecheck` | exit 0 | fix_and_rerun |
| `npm test` | exit 0 (6038+ tests) | fix_and_rerun |
| `npx tsx test/corpus/rules-gate.ts` | 0 regressions (only if `src/` changed) | stop |
| `git diff --name-only` | matches the task's declared write-set | stop |

There is **no linter** in this project (no eslint config, no lint script).

## Batches

| # | Task | Depends on | Done |
|---|---|---|---|
| 1 | [T1 — scale engine-walk's render budget](./batch-1/T1-engine-walk-budget.md) | — | [ ] |
| 2 | [T2 — resume-walk xdot for neato/fdp/sfdp](./batch-2/T2-xdot-rewalk.md) | T1 | [ ] |
| 3 | [T3 — attribute the newly diverged ids](./batch-3/T3-attribution.md) | T2 | [ ] |
| 4 | [T4 — verify json-surface transfer](./batch-4/T4-json-transfer-verify.md) | T3 | [ ] |
| 5 | [T5 — re-walk json/map so the class absorbs](./batch-5/T5-json-map-rewalk.md) | T4 | [ ] |
| 6 | [T6 — address not-cleared ids (CONDITIONAL)](./batch-6/T6-address-not-cleared.md) | T3, T4 | [ ] |
| 7 | [T7 — regenerate dashboards, final gates](./batch-7/T7-closeout.md) | T5, T6 | [ ] |

Every batch holds one task. They are strictly sequential — not because the
write-sets collide (they mostly don't) but because **concurrent sweeps produce
false verdicts on heavy graphs** (measured 3.8-5.7x inflation, PR #37). Run
engines sequentially, concurrency <= 4, oracle caches warm.

## Constraints

Full lists: [constraints.md](./constraints.md). The three that bite most often:

- **Never edit `src/` while a sweep is running** — the sweep reads live source.
- **A `src/` change requires a FRESH sweep** (deleted JSONL) with 0 regressions
  before commit; a resume sweep hides regressions.
- **Never hand-write a per-id acceptance row** to make a row go away. The
  computed class exists because hand rosters went stale (PR #37); re-adding one
  undoes that work. If an id can't earn class membership, it is T6's problem.

## Documents

- [decisions.md](./decisions.md) — D1-D5, approved 2026-07-30
- [constraints.md](./constraints.md) — stop + push-forward conditions
- [diagrams/data-flow.md](./diagrams/data-flow.md) — how a verdict is earned
- [diagrams/component-map.md](./diagrams/component-map.md) — harness/artifact map
- [decision-journal.md](./decision-journal.md) — appended during execution
- `evidence/` — T4 writes its json-transfer evidence here

## Background reading (do not load unless needed)

- `plans/decision-journal.md` rows dated 2026-07-29 — the whole prior context:
  the stale-class mechanism, the `GVTS_CLUST_BB` trap, the ULP-nondeterminism
  finding, and the survey budget/scheduling fix this mission mirrors.
- `test/corpus/accepted-class.ts` — the computed class resolver.
- `docs/known-divergences.md#a1-drift-iterative-engines` — the A1 class.
