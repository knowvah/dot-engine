# T1: neato `dim` plumbing and output (114, AD-1, AD-2, AD-4, AD-11)

**Context:** the port fixes neato at `DFLT_DIM = 2` (`src/layout/neato/init.ts:78,347,354,359`). C reads `dimen`, then `dim`, and
clamps at `MAXDIM` (`lib/neatogen/neatoinit.c:597-600`). `ND_pos` has `ndim` entries (`:64`). `user_pos` parses a third coordinate or
reads `z` (`:86-110`). `addZ` writes `z` back (`:1305-1312`). `attach_attrs_and_arrows` prints `odim` coordinates (`lib/common/output.c:258,297`).
`neato/init.ts` is at 490 lines, so split along C boundaries (AD-11).

**Task:**
1. Tests first, from `src/layout/neato/__fixtures__/dim/` for the default solver (`dim=3`, `dimen=3`, `dim=3 dimen=3`, `dim=4 dimen=4`,
   the clamp, pins).
2. Port `neato_init_graph`'s reads into `root.info.ndim` and `odim`; `ND_pos` sized to `ndim`; `user_pos` for 3-D and `z`; `addZ`.
3. Replace `DFLT_DIM` at the solver calls with `root.info.ndim`.
4. Print `odim` coordinates in `pos` in the `dot`, `xdot` and `json` paths. `plain` and svg stay 2-D, as C.
5. Remove the "2-D only" comments you make false.

**Write-set:** `src/layout/neato/init.ts`, `src/layout/neato/init-dim.ts` (new), `src/render/dot/write-back.ts`, `src/render/dot/attrs.ts`,
`src/render/json.ts`, their tests.

**Interface output (batch 3a reads it):** `root.info.ndim: number` (2 to 10), `root.info.odim: number` (≤ `ndim`), set before any solver runs;
`node.info.pos: number[]` of length `ndim`. T6, T7, T8 and T13 read these and do not change `init.ts`.

**Read-set:** `lib/neatogen/neatoinit.c:55-115,590-605,1295-1312`; `lib/common/output.c:250-305`; `decisions.md#ad-2`.

**Acceptance criteria:**
- *Given* `dim=3 dimen=3`, *when* rendered to `dot` and `xdot`, *then* each `pos` has 3 coordinates, as native.
- *Given* `dim=11`, *then* `ndim` is 10. *Given* `dim=3` alone, *then* `pos` has 2 coordinates, and x and y differ from a 2-D layout as native's do.
- *Given* `pos="1,2,3!"`, `pos="4,5"` and `z=7`, *then* the coordinates native prints are reproduced.
- *Given* the smoke ids, *when* bytediffed, *then* every output is byte-identical (stop 8).

**Commit:** `feat(T1): read dim and dimen, and print n coordinates, in neato`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
