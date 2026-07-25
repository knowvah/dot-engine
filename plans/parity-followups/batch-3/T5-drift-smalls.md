<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — small-delta iterative ids

## Context
sfdp `2619_1` (Δ1.44, 100 diffs), sfdp `1879` (Δ7.6k — but sfdp is the
chaotic engine; magnitude alone doesn't imply misport), neato `2619_2`
(Δ0.81, 8 diffs). All engine-track oracle-error before T1's refresh. The
2619 family being oracle-error on EVERY engine suggests T1 may reclassify
them entirely (input renders huge — dpi 2619 family per memory).

## Task
1. Consume T1's fresh baselines. Ids now passing → close registry rows
   (T1 may have done this already; verify).
2. neato 2619_2 (Δ0.81 on a bounded-drift engine — neato drift is ~1e-6, so
   0.81pt is NOT automatic drift): find the first divergent object, state
   the mechanism. Bounded-drift engines get real diagnosis, not a wave-off.
3. sfdp ids: chaotic regime — injection A/B against C intermediates; if the
   divergence enters at a known ULP-amplification point (V8-vs-libm sin/cos
   class), accept as A1 with that specific rationale; else fix.
4. Re-verdict sfdp/neato tracks after any change: 0 regressions.

## Write-set
- `src/layout/sfdp/*`, `src/layout/neato/*` per mechanism (STOP if
  dot-shared code implicated)
- registries (these ids' rows), sfdp/neato parity summaries/JSONLs

## Read-set
- T1 journal note; `.agent-notes/sfdp-*.md`, `2619-dpi-balign` notes;
  repo journal sfdp/neato drift-regime entries (bounded ~1e-6 for neato
  stress; sfdp spring chaotic).

## Acceptance criteria
- Given each id, when resolved, then registry rows carry the specific
  mechanism (no "blind spot" placeholder remains anywhere).
- Given neato 2619_2, then its 0.81pt is explained by a stated mechanism —
  drift-class acceptance requires injection evidence, not magnitude.

## Observability / rollback
N/A. Reversible.

## Quality bar
typecheck + tests green; per-id journal rows.
