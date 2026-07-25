<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architecture decisions (approved)

## AD-1 — Baseline refresh before diagnosis
- **Context:** the 9 blind-spot ids were accepted because their engine xdot
  tracks list them oracle-error/timeout — but at least one (circo 2095_1
  -Txdot) succeeds when run fresh, and the 2619/2516 family shows
  oracle-error on every engine (classification artifact smell).
- **Decision:** T1 first refreshes every oracle-error/timeout row on the 7
  engine xdot tracks (targeted, per AD-5); diagnoses run only for ids that
  still diverge with a working oracle. Ids whose xdot now passes close their
  blind-spot accepts immediately.
- **Consequences:** diagnoses get the established xdot geometry surface;
  some blind-spot entries may close with zero layout work.

## AD-2 — A-class fix-or-accept bar for blind-spot ids
- **Decision:** mechanism first (instrument C, injection A/B where needed);
  misport → contained fix; proven irreducible drift/ULP amplification →
  accept with a mechanism-specific rationale replacing the placeholder.
- **Consequences:** consistent with the project's A-class taxonomy; no
  forced fixes on chaotic-amplification ids (measured drift regimes).

## AD-3 — shape=plain fixed at the init call-site
- **Context:** dot sizes a `width=0,height=0,shape=plain` pos-pinned node
  0×0 (matching native); twopi/neato fall back to 0.75×0.5 defaults. Known
  "engine-init defect class": C inits centrally (common_init_node →
  poly_init IS_PLAIN), the port scattered init per engine.
- **Decision:** align the deviating engines' init call-sites with the
  central path; no downstream sizing patches (plain emission stays as-is).
- **Consequences:** fixes the class instance at its origin; a shared-path
  change that would touch the dot pipeline triggers the stop condition.

## AD-4 — fdp map timeouts: classify only
- **Decision:** one raised-timeout run per id → classify: completes+passes /
  completes+diverges (→ AD-2 treatment) / ≥10x-oracle slow (→ perf-quarantine
  entry, 2621 style with `timeout -s KILL` discipline). No optimization.
- **Consequences:** perf stays quarantined; verdicts become stable.

## AD-5 — Targeted refresh, no full re-sweeps
- **Decision:** strip only the oracle-error/timeout rows from each engine's
  parity JSONL, re-run those ids via the resume model, regenerate summaries.
- **Consequences:** minutes not hours; pass/diverged rows stay untouched, so
  regression comparison stays per-id valid.

## Operational (Phase 4)
- **Rollback:** Reversible (git-only; src fixes + regenerated test artifacts).
- **Observability / on-call / scalability:** N/A (Node-only dev infra).
  Observable surface = parity summaries + PARITY.md; "broken" = diverged > 0
  or an existing track's pass count dropping — gated per commit.
- **Backwards compat:** layout fixes change `render()` output for affected
  (id, engine) pairs toward oracle-correctness — output-changing bug-fix
  class, non-breaking in spirit, pre-1.0; note in commits + journal.
