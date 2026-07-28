<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Parameterize json-walk by engine

## Context
`json-walk.ts` + `render-one-json.ts` are dot-only. Extend to accept an engine
(AD-3), mirroring `engine-walk.ts`'s engine argument and JSONL/resume model,
emitting `json-parity-<engine>.json`. Oracle: `dot -K<engine> -Tjson`.

## Task
Add an `engine` CLI argument (default `dot` for back-compat). Thread it into the
oracle command and the port renderer (`render-one-json.ts` gains an engine arg).
Output summary file becomes `json-parity-<engine>.json`; keep `json-parity.json`
as the alias for `dot` so existing consumers (`parity-report.ts`) don't break
until T9 updates them.

## Write-set
- `test/corpus/json-walk.ts` (modify)
- `test/corpus/render-one-json.ts` (modify)

## Read-set
- `test/corpus/engine-walk.ts` — the engine-arg + JSONL/resume/oracle-cache
  pattern to copy.
- `../decisions.md#ad-3`.

## Interface contract (consumed by T7, T9)
CLI: `tsx json-walk.ts <engine> [outJsonl]` → writes `json-parity-<engine>.json`
with `{ counts, results: [{ id, verdict, ... }] }` (same shape as today's
`json-parity.json`).

## Acceptance criteria
- Given no engine arg, when run, then behaves exactly as today (dot,
  `json-parity.json` still written) — no regression.
- Given `circo`, then `json-parity-circo.json` is written; oracle invoked with
  `-Kcirco`.
- Given a re-run, then ids already in the JSONL are skipped (resumable).

## Observability / rollback
N/A. Reversible. Do NOT run a full sweep in this task (plumbing only; T7 runs it).

## Quality bar
`tsc --noEmit` clean; `npm test` green; a 3-id smoke on `dot` and `circo` writes
both summary files.
