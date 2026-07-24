<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Plain walker

## Context
Per-engine plain/plain-ext sweep, mirroring `engine-walk.ts`: size-sorted corpus,
oracle-cached, JSONL append (resumable), summary `plain-parity-<engine>.json` for
`parity-report.ts`.

## Task
For each corpus id: render port `plain` + `plain-ext` (via T2's
`render-one-plain.ts`), fetch oracle `dot -K<engine> -Tplain` / `-Tplain-ext`
(reuse the sha1 oracle-cache), compare via `comparePlain` (T1) with
`iterative = engine ∈ {neato,fdp,sfdp}` (AD-4). Verdict per AD-2: a cell passes
only if BOTH plain and plain-ext pass; else `diverged`. Honor
`accepted-divergences-plain.json` (id+engine → accepted). Track
`oracle-error`/`port-error`/`timeout` separately; exclude from pass ratio.

## Write-set
- `test/corpus/plain-walk.ts` (create)
- `test/corpus/accepted-divergences-plain.json` (create; `{}` or `[]` empty)

## Read-set
- `test/corpus/engine-walk.ts` — walk scaffold, oracle-cache, JSONL/resume,
  summary-write.
- `test/golden/compare-plain.ts` (T1 interface), `test/corpus/render-one-plain.ts`
  (T2 interface).
- `../decisions.md#ad-2`, `#ad-4`.

## Interface contract (consumed by T6, T9)
CLI: `tsx plain-walk.ts <engine> [outJsonl]` → `plain-parity-<engine>.json`
`{ counts: {pass,diverged,accepted,oracleError,portError,timeout}, results: [...] }`.

## Acceptance criteria
- Given `dot` on a 3-id sample, then `plain-parity-dot.json` written with
  per-item verdicts.
- Given an id listed in the accept registry, then verdict `accepted`, excluded
  from `diverged`.
- Given `neato`, then coord-only differences do not count as diverged (AD-4).
- Given a re-run, then already-recorded ids are skipped.

## Observability / rollback
N/A. Reversible.

## Quality bar
`tsc --noEmit` clean; `npm test` green. Do not commit large `plain-parity-*.json`
from a full run in this task — only the 3-id smoke proof; T6 produces the real
data.
