<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — json triage (7 non-dot engines)

## Context
Run `json-walk.ts <engine>` for neato, fdp, sfdp, circo, twopi, osage,
patchwork. Resolve every divergence (fix-or-accept), same discipline as T6. dot
is already covered (leave it green).

## Task
1. Fresh sweep per non-dot engine → `json-parity-<engine>.json`.
2. Instrument the C json writer (`plugin/core/gvrender_core_json.c`) before
   hypothesizing on any divergence; state the mechanism first.
3. Real bug → fix in the port's json serializer (locate via
   `grep -rl "json" src/render`); ULP/drift → accept + journal (AD-4 for
   iterative engines: structural comparison already suppresses coord drift, so a
   surviving diverged is likely real).
4. Re-run to 0 unexplained divergences; confirm dot json + other tracks unchanged.

## Write-set
- json serializer source under `src/render/` (whichever file emits `json`)
- `test/corpus/accepted-divergences-json.json` (create if absent)
- `test/corpus/json-parity-*.json` (7 non-dot summaries)
- repo-root `plans/decision-journal.md`

## Read-set
- `plugin/core/gvrender_core_json.c` (oracle authority).
- `test/corpus/json-walk.ts` (T3), the port's json emitter, `../decisions.md#ad-4`.

## Acceptance criteria
- Given 7 fresh non-dot sweeps, then 0 unexplained `diverged` (all pass /
  accepted / excluded error).
- Given each accepted item, then registry entry + journal mechanism.
- Given dot json track, then its pass count is unchanged.

## Observability / rollback
N/A. Reversible. One commit per fix; accepted-only → one `test(corpus)` commit.

## Quality bar
Per commit `tsc` + `npm test` green; touched-track fresh sweep 0 regressions.
Stop conditions apply.
