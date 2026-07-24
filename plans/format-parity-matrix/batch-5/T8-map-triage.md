<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — imagemap triage (7 non-dot engines)

## Context
Run `map-walk.ts <engine>` for neato, fdp, sfdp, circo, twopi, osage, patchwork.
Resolve every divergence (fix-or-accept), same discipline as T6/T7. dot imagemap
already covered.

## Task
1. Fresh sweep per non-dot engine → `map-parity-<engine>.json`.
2. Instrument the C map writer (`plugin/core/gvrender_core_map.c`) before
   hypothesizing; state the mechanism first.
3. Real bug → fix in `src/render/map.ts` (imagemap helpers live here alongside
   the plain writer); ULP/drift → accept + journal (AD-4).
4. Re-run to 0 unexplained divergences; confirm dot imagemap + plain (also in
   map.ts) tracks unchanged — a map-helper change must not regress plain.

## Write-set
- `src/render/map.ts` (fixes)
- `test/corpus/accepted-divergences-map.json` (create if absent)
- `test/corpus/map-parity-*.json` (7 non-dot summaries)
- repo-root `plans/decision-journal.md`

## Read-set
- `plugin/core/gvrender_core_map.c` (oracle authority).
- `test/corpus/map-walk.ts` (T4), `src/render/map.ts` cmapx/imap helpers,
  `../decisions.md#ad-4`.

## Acceptance criteria
- Given 7 fresh non-dot sweeps, then 0 unexplained `diverged`.
- Given each accepted item, then registry entry + journal mechanism.
- Given dot imagemap AND plain tracks, then their pass counts are unchanged
  (regression guard — both share map.ts).

## Observability / rollback
N/A. Reversible. One commit per fix.

## Quality bar
Per commit `tsc` + `npm test` green; touched-track fresh sweep 0 regressions;
plain track re-verified. Stop conditions apply.
