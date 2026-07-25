<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — fdp blind-spot family

## Context
Five fdp ids, json-track deltas: `graphs-b53` (1 diff: `[graph]/_ldraw_
[missing]` — the graph LABEL draw op is absent on one side), `1879` (Δ64k!),
`graphs-badvoro` (Δ4.7k), `2108` (Δ52k), `1652` (Δ6.9k). All were fdp-xdot
oracle-error (2108: timeout) — T1 refreshes those baselines first. 1879 +
1652 + badvoro + 2108 magnitudes suggest whole-layout divergence (different
component packing / overlap outcome), possibly one shared mechanism.

## Task
1. Start with `graphs-b53` — the missing graph `_ldraw_` is a small, likely
   distinct mechanism (graph label emission under fdp; compare with T-series
   graph-label memories). Mechanism → fix or accept.
2. For the big-delta ids: use T1's fresh xdot baselines. Check FIRST whether
   the divergence starts at component decomposition / initial placement
   (compare per-component bb) before descending into stress/PRISM.
   Remember: fdp coincident-node rand() fallback and overlap dispatch have
   established recipes (`.agent-notes/fdp-rand-fallback-rca.md`).
3. Injection A/B for chaotic candidates (feed C intermediates); drift-class
   accepts allowed per AD-2 only with that evidence.
4. One fix may close several ids — re-bucket by per-id verdict deltas, never
   counts. Re-verdict fdp plain/json/map/xdot each fix: 0 regressions.

## Write-set
- `src/layout/fdp/*` per mechanism (STOP if dot-shared code implicated)
- registries (fdp rows for these ids), fdp parity summaries/JSONLs

## Read-set
- T1 journal note; `~/git/graphviz/lib/fdpgen/`;
  `.agent-notes/fdp-*.md`, `flat-dotroot-pack.md`; repo journal fdp entries.

## Acceptance criteria
- Given each id, when resolved, then its registry rows carry a mechanism
  (fix + 0 regressions, or injection-proven irreducible/drift).
- Given b53, when diagnosed, then the graph-label mechanism is stated even
  if the verdict is accept.
- Given any fix, then no other fdp id regresses on any track.

## Observability / rollback
N/A. Reversible.

## Quality bar
typecheck + tests green; per-id journal rows; `timeout -s KILL` on 2108
(huge); oracle double-run before trusting any surprising verdict.
