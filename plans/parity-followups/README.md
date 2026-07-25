<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: parity deferred-work follow-ups

## Objective

Resolve everything the format-parity-matrix mission deferred: the twopi/neato
`shape=plain` init defect, the nine (id, engine) layout blind-spot divergences,
and the four fdp imagemap timeout ids — after first refreshing the stale
`oracle-error` classifications on the per-engine xdot tracks so every diagnosis
has a working baseline. Bar per id: mechanism first (C is spec, instrument
before hypothesizing); misport → fix; proven irreducible drift → accept with a
mechanism-specific rationale replacing the "blind spot" placeholder. No
placeholder rationales survive this mission.

## Branch

`feat/parity-followups` off current `main` (which contains the merged
format-parity-matrix work). Merge-commit to main (not squash).

## Prior state (do NOT rebuild)

- All 30 parity tracks live in `test/corpus/PARITY.md`, 0 unexplained diverged.
- Acceptance registries: `accepted-divergences-{plain,json,map}.json` — the
  13 "follow-up"-flagged entries are this mission's B/A scope.
- Walkers support engine args, engine-scoped acceptance, JSONL resume.
- Oracle cache discipline: if a diverged verdict looks impossible, INVALIDATE
  the oracle cache and re-verdict from fresh double-run oracles before
  diagnosing (see repo journal 2026-07-24 anomaly entry).

## Constraints

- **C source is spec** (`~/git/graphviz`, oracle `build/cmd/dot/dot` +
  `GVBINDIR=/tmp/ghl`). State mechanism (file:line, causal chain, ruled-out)
  before any fix. Never edit `src/` while a sweep runs (pgrep first).
- Browser-safe library code only; SPDX header on new files.
- No silent drops; registry entries carry mechanisms.
- Perf work is quarantined — T6 classifies, never optimizes.

## Quality gates (before every commit)

```
npm run typecheck        # tsc --noEmit --stableTypeOrdering, exit 0
npm test                 # vitest, all green (currently 3271)
```
Per src fix additionally: fresh (stripped-row) re-verdict of the touched
(id, engine) pairs AND 0 regressions on that engine's plain/json/map/xdot
tracks. `npm run docs:build` at close (T7).

## Architecture decisions

See [decisions.md](./decisions.md) — AD-1 (baseline refresh first), AD-2
(A-class fix-or-accept bar), AD-3 (shape=plain fixed at init call-site),
AD-4 (timeout classify-only), AD-5 (targeted refresh). All approved.

## Journaling

Mechanisms and accepted divergences → repo-root `plans/decision-journal.md`.
Mission-flow decisions → [decision-journal.md](./decision-journal.md) here.

## Batches

| # | Focus | Tasks | Status |
|---|---|---|---|
| [1](./batch-1/overview.md) | Baseline refresh (stale oracle-errors) | T1 | [x] |
| [2](./batch-2/overview.md) | shape=plain init defect | T2 | [x] |
| [3](./batch-3/overview.md) | Blind-spot diagnoses (sequential) | T3 T4 T5 | [ ] |
| [4](./batch-4/overview.md) | fdp map timeout classification | T6 | [ ] |
| [5](./batch-5/overview.md) | Reconcile + report + close | T7 | [ ] |

## Stop conditions

- A fix needs files outside the task's declared engine module — especially
  `src/common/`, `src/pathplan/`, or anything shared with the **dot** path
  (dot fidelity is the top consumer priority): stop and confirm.
- 2 consecutive gate failures on the same check · an AD contradicted · same
  location changed 3+ times without resolving · divergence unclassifiable
  after instrumenting C (report ruled-outs, don't guess) · a src fix
  regresses any existing track · T1 reveals the stale oracle-errors are
  genuine widespread native crashes (premise broken — rescope).

## Push-forward

- Proven drift-class accepts (injection A/B evidence) + rationale upgrades ·
  stale-cache invalidate + fresh double-run oracles · deleting registry rows
  for ids that now pass · T6 timeout multiplier choice · one fix closing
  multiple family ids (judge by per-id verdict deltas, 0 regressions) ·
  stylistic harness choices.

## Diagrams

[data-flow](./diagrams/data-flow.md) · [component-map](./diagrams/component-map.md)
