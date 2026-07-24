<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: format × engine parity matrix

## Objective

Establish full-fidelity oracle parity for the output formats that are not yet
covered per engine, and wire them into the existing `PARITY.md` track table.
Net-new tracks: **plain/plain-ext** (all 8 engines, none today), **json**
(extend dot-only → 7 non-dot), **imagemap** (extend dot-only → 7 non-dot).
Triage every divergence: fix real bugs (C is spec) or accept ULP/drift with a
registry entry + journal. This extends the harness; it does not rebuild it.

## Branch

`feat/format-parity-matrix` — already contains the plain fillcolor/edge-label
fix (`f4d6644`). Continue here. Merge-commit to main (not squash).

## Coverage today (what already exists — do NOT rebuild)

- **xdot geometry: all 8 engines** via `engine-walk.ts` → `parity-<engine>.json`.
- **SVG: dot dedicated** (`survey.ts`); non-dot covered by xdot + `format-walk.ts`
  structural smoke.
- **json / imagemap: dot only** (`json-walk.ts`, `map-walk.ts`).
- **plain / plain-ext: nothing.**
- `parity-report.ts` aggregates all tracks → `PARITY.md` (the matrix summary
  already exists — extend it, add tracks, don't invent a new one).

## Constraints

- **C source is spec.** Instrument the C (`~/git/graphviz`, oracle
  `~/git/graphviz/build/cmd/dot/dot` + `GVBINDIR=/tmp/ghl`) and dump actual
  values before hypothesizing on any divergence. See `../decision-journal.md`
  discipline in the repo root.
- **Browser-safe library code only.** All walkers/comparators are Node-only
  dev/test infra, never imported by `src/`.
- **SPDX header** (`EPL-2.0`) on every new file.
- **Never edit `src/` while a sweep runs** (sweeps read live source).
- **No silent drops** — exclude oracle-error / intractable inputs explicitly and
  list them.
- Stop/push-forward conditions: see below.

## Quality gates (before every commit)

```
npm run typecheck            # tsc --noEmit, exit 0
npm test                     # vitest, all green (currently 3255)
```
Plus per triage task: fresh (deleted-JSONL) sweep with **0 regressions** on the
touched track AND on existing tracks (SVG/xdot/json-dot must not drop).

## Architecture decisions

See [decisions.md](./decisions.md) — AD-1 (plain comparator), AD-2 (single plain
track), AD-3 (parameterize walkers in place), AD-4 (iterative engines →
structural). All approved.

## Journaling

Corpus fixes and accepted divergences → **repo-root `plans/decision-journal.md`**
(project convention: "the archaeology"). This mission's per-batch execution notes
→ [decision-journal.md](./decision-journal.md) here.

## Batches

| # | Focus | Tasks | Status |
|---|---|---|---|
| [1](./batch-1/overview.md) | Harness plumbing (parallel) | T1 T2 T3 T4 | [x] |
| [2](./batch-2/overview.md) | Plain walker | T5 | [x] |
| [3](./batch-3/overview.md) | Plain triage | T6 | [x] |
| [4](./batch-4/overview.md) | json triage (7 engines) | T7 | [ ] |
| [5](./batch-5/overview.md) | imagemap triage (7 engines) | T8 | [ ] |
| [6](./batch-6/overview.md) | Integrate report + docs + close | T9 T10 T11 | [ ] |

## Stop conditions

- File needed outside any task's write-set · 2 consecutive gate failures on the
  same check · an AD contradicted · same location changed 3+ times without
  resolving · a divergence unclassifiable after instrumenting C (don't guess) ·
  a src fix regresses an existing track · oracle broadly errors for an
  engine+format.

## Push-forward

- ULP/drift on iterative engines → accept + registry + one-line journal · clear
  C-referenced mechanism + contained fix → fix + journal · pre-existing
  oracle-error / intractable input → exclude + list · stylistic harness choices.

## Diagrams

[data-flow](./diagrams/data-flow.md) · [component-map](./diagrams/component-map.md)
