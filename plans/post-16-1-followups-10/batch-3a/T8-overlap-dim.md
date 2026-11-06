# T8: `overlap` under `dim` (114, AD-3)

**Context:** `lib/neatogen/adjust.c:514-522,590-622` sizes and copies positions by `Ndim` for `remove_overlap`, and only x and y are set in `sizes`; other overlap modes read x and y.
`overlap-prism.ts` already takes `dim`.

**Task:**
1. Tests first, from the `overlap=false` fixture with `dim=3 dimen=3`; add `overlap=scale` and `overlap=vpsc` fixtures through `regen.sh`.
2. Pass `root.info.ndim` where C passes `Ndim`. Check that the z coordinate survives each mode as native's does.

**Write-set:** `src/layout/neato/adjust-info.ts`, `sc-adjust.ts`, `vpsc-adjust.ts`, `simple-scale.ts`, `fdp-adjust.ts`, `overlap-prism.ts`, a new `src/layout/neato/overlap.dim.test.ts`, the new cases in `src/layout/neato/__fixtures__/dim/`.

**Read-set:** `lib/neatogen/adjust.c:505-630`.

**Acceptance criteria:**
- *Given* `overlap=false`, `scale` and `vpsc` with `dim=3 dimen=3`, *when* rendered, *then* `pos` matches native to AD-3's bar, z included.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `feat(T8): keep every coordinate through overlap removal`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
