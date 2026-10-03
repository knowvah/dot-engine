# Corpus gate (port-only, main vs branch)

Reuse the harness from error-hierarchy (scratch `gate/one.mjs`, `jobs.sh`,
`run.sh`; see `plans/error-hierarchy/corpus-gate.md` for the procedure). The
baseline is a bundle of **`feature/error-hierarchy` HEAD (ca7bf4d3)**, not
main, so only this mission's changes show. Same job set: 253 golden inputs ×
8 engines × {svg, xdot}, plus corpus dot/svg, skipping portMs ≥ 600000.

## Allowed changes

| After batch | Allowed |
|---|---|
| 1 | Graphs setting `nslimit` (dot) may change output; they must match native where checked. `2723` unchanged (InternalError). Nothing else. |
| 2 | Graphs setting a newly loud attribute (ADR-2) → `RenderError UNSUPPORTED_FEATURE`; graphs setting `start=regular` (neato) may change output. List each id. |
| 3 | neato and fdp graphs setting `inputscale` may change output (fdp added 2026-10-02, owner). |

Anything else: stop condition 6. A job that times out on one side only is
re-rendered alone on both bundles before it counts (CPU contention, as in
error-hierarchy: `2095_1`).
