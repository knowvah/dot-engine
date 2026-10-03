# Corpus gate (port-only, base vs branch)

Reuse the v2-fidelity harness (`gate/one.mjs`, `jobs.sh`, `run.sh` in a scratchpad;
copy from plans/v2-fidelity/corpus-gate.md and plans/error-hierarchy/corpus-gate.md).
Baseline: an esbuild bundle of **4fe3d1ca** (`feature/v2-fidelity` head). Jobs:
every `test/golden/inputs` file × 8 engines × {svg, xdot} plus corpus `applicable`
ids under dot/svg, skipping `perf.json` portMs ≥ 600000 (world, 1652, 2475_1,
2621). Run detached (`nohup … &`); ~10 min. A job that times out on one side only
is re-rendered alone on both bundles before it counts (known: 2095_1, 2343).

## Allowed changes

| After batch | Allowed |
|---|---|
| 1 | fdp graphs setting `coords` only on subgraphs; neato graphs setting `mode`. |
| 2 | circo multi-component graphs setting a non-none `overlap`; sfdp graphs setting a non-prism `overlap`. |
| 3 | neato/twopi/circo/sfdp graphs setting `overlap` to voronoi, oscale, vpsc, ortho*, portho* (voronoi: loud ↔ render only). |

Anything else: stop condition 6. List each changed id in the journal.
