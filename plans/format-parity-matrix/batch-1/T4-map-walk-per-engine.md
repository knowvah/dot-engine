<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Parameterize map-walk by engine

## Context
Twin of T3 for the imagemap track. `map-walk.ts` + `render-one-map.ts` are
dot-only. Extend by engine (AD-3), emitting `map-parity-<engine>.json`. Oracle:
`dot -K<engine> -Tcmapx` (and/or `-Timap` per the existing walker's format).

## Task
Same shape as T3: add an `engine` CLI arg (default `dot`), thread into oracle +
`render-one-map.ts`, output `map-parity-<engine>.json`, keep `map-parity.json`
as the `dot` alias until T9.

## Write-set
- `test/corpus/map-walk.ts` (modify)
- `test/corpus/render-one-map.ts` (modify)

## Read-set
- `test/corpus/engine-walk.ts` — engine-arg pattern.
- `test/corpus/map-walk.ts` — current dot-only flow + which format(s) it compares.
- `../decisions.md#ad-3`.

## Interface contract (consumed by T8, T9)
CLI: `tsx map-walk.ts <engine> [outJsonl]` → `map-parity-<engine>.json`
(`{ counts, results }`, same shape as today).

## Acceptance criteria
- Given no engine arg, then dot behavior unchanged, `map-parity.json` still
  written.
- Given `twopi`, then `map-parity-twopi.json` written; oracle invoked `-Ktwopi`.
- Given a re-run, then resumable via JSONL.

## Observability / rollback
N/A. Reversible. No full sweep here (T8 runs it).

## Quality bar
`tsc --noEmit` clean; `npm test` green; 3-id smoke on `dot` + `twopi`.
