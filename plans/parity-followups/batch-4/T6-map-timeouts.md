<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — fdp map timeout classification

## Context
`graphs-root`, `graphs-b103`, `nshare-root_twopi`, `linux.x86-root_twopi`
flip between diverged and timeout across map-walk passes depending on load
(registry rows exist for their diverged form). AD-4: classify, never
optimize (perf is quarantined; cf. id 2621's ~10-16x per-op class).

## Task
1. For each id: run the port map render once with a raised timeout (env
   override / walker timeout multiplier; pick the value autonomously and
   journal it) and time it against the oracle (`standalone-time` first,
   compareSvg-style discipline — measure before comparing).
2. Classify: completes+passes → registry row deleted; completes+diverges →
   AD-2 treatment (mechanism; likely covered by T4's fdp findings);
   ≥10x-oracle slow → perf-quarantine entry in the established style
   (`timeout -s KILL`, journaled).
3. Re-verdict `map-parity-fdp` so the four ids hold stable verdicts.

## Write-set
- `test/corpus/accepted-divergences-map.json` (row updates/removals)
- `test/corpus/map-parity-fdp.json(l)`

## Read-set
- `.agent-notes/2621-perf-quarantine` memory (class + measurement recipe);
  `test/corpus/map-walk.ts` timeout mechanism; T4 outcomes for these ids.

## Acceptance criteria
- Given each id, when classified, then its verdict is stable across two
  consecutive map-walk passes and its registry/quarantine row states which
  class it is.
- Given a ≥10x-slow id, then no optimization was attempted (AD-4).

## Observability / rollback
N/A. Reversible.

## Quality bar
typecheck + tests green; classifications + timeout choice journaled.
