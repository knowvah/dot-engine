<!-- SPDX-License-Identifier: EPL-2.0 -->

# Method decisions (approved 2026-07-28)

## D-scope: perf gap stays quarantined

The ~10–16× per-op render gap (memory `2621-perf-quarantine`) is NOT in scope.
This mission closes the correctness divergence only. Correctness work must not
silently morph into optimization work; if a fix incidentally needs a hot-path
change, log it and keep it behaviorally faithful.

## D1: Localization — hybrid staged-dump + isolated replay

ONE instrumented full render per side capturing staged route dumps to files
(reuse the honda-era `GV_XDUMP` (C) / `__XDUMP` (port) infrastructure).
Localize the first diverging stage OFFLINE. Then replay the diverging edge's
stage inputs through the port's stage function in isolation (the
arrayRects-style A/B). Minimal-subgraph extraction only if the divergence is
upstream of routing. Never blind-bisect the input first.

## D2: Iteration surface — raw dumps, not renders

Iterate on `%.17g` stage dumps (comparator-free). The official SVG comparator
runs only at end gates. Full-graph re-renders are never an iteration loop.

## D3: Instrumentation policy

Reuse existing env-gated hooks. A missing C stage gets a temporary printf
(reverted) or an env-gated dump (documented). Native tree clean at mission end
(`git -C ~/git/graphviz status` unchanged, modulo pre-existing GVTS_POS_DUMP
instrumentation already in the tree).

## D4: Fix-vs-accept bar

Fix for logic misports. Accept ONLY for a documented irreducible class
(libm ULP tie, fp-contract/FMA, unstable-qsort tie) with injection-grade
evidence: injecting the upstream C values into the port produces 0 diffs.
Signature match alone is never sufficient (polypoly precedent).

## D5: Render budget

All full port renders: background, `timeout -s KILL`, never parallel with the
oracle, orphan check after. Hard cap: 3 for the mission (baseline dump,
post-fix verify, one spare). T1 times the baseline to recalibrate — the last
sweep recorded a COMPLETED diverged verdict for 2621, so the >30min quarantine
figure may be stale.

## Rollback classification

Reversible (git revert; no deploy, no data). Registry changes additive.

## Stop conditions

1. Write-set escape: files outside `src/layout/dot/`, `src/pathplan/`,
   `src/common/splines*`, tests, registries, docs, this plan dir — except a
   file the RCA names (log the resolution first, then proceed).
2. Two consecutive quality-gate failures on the same check.
3. Fix would contradict a faithful-port rule (no reordering, no
   simplification of C oddities) or decisions D1–D5.
4. Render budget (3 full port renders) exhausted with diagnosis incomplete.
5. Localization recurses >2 stages upstream of routing (into mincross/rank).
6. Calibration render exceeds 3h or never completes.
7. Acceptance verdict but D4 evidence cannot be produced.
8. Same site changed 3+ consecutive times without resolving the same check.

## Push-forward conditions

- Adding/adjusting env-gated dump stages either side (per D3).
- Choosing/iterating minimal-subgraph extraction until reproduction.
- Temporary exports for the replay harness (removed or justified by end).
- Fix smaller than estimated; mechanism in an already-suspected file.
- Journal wording, scratchpad organization.
- Oracle re-runs with longer timeouts (not budget-capped).
