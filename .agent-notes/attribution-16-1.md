# attribution-16-1 — observations (2026-10-14)

## Observation: port keeps one arrowhead per edge end; C draws one per bezier
- **Context**: fdp 2471 stays `not-cleared` after injection (37731 -> 1 diff).
- **Finding**: `n138 -> n40` carries two beziers, both with `eflag` (the
  `pos` strings are identical on both sides). C's `emit_edge_graphics`
  (`lib/common/emit.c:2669-2675`) runs `arrow_gen` per bezier, so `_hdraw_`
  has 2 polygons. The port stores a single `e.info.headArrowOps`, and
  `stashArrow` (`src/common/splines-clip.ts:347`) overwrites it on every
  `clipAndInstall`, so only the last bezier's arrow survives. The same
  applies to SVG, where the `headDone` guard (`src/render/svg-helpers.ts:473`)
  emits once per edge. The two beziers come from C's fallback: when
  `makeMultiSpline` fails partway, `neatosplines.c:683-701` re-routes with
  `makeSpline`, which appends to an already-installed spline.
- **Impact**: any edge with >1 arrow-flagged bezier loses arrowheads. The fix
  touches the ADR-1 data model (`plans/arrowhead-geometry/decisions.md`):
  per-bezier arrow ops instead of per-edge.
- **Confidence**: High (post-render trace: 2 beziers, 1 op list whose tip is
  the 2nd bezier's arrow).

## Observation: port genroute/pathplan emit none of C's routing warnings
- **Context**: same 2471 run.
- **Finding**: the oracle prints `shortest.c:182/193 ... not in any triangle`
  and three `Could not create control points for multiple spline` warnings.
  The port's `genroute` (`src/layout/neato/multispline.ts:341`) returns 1
  silently at every failure site, so stderr diverges while xdot matches.
- **Impact**: stderr-parity gap only; does not affect layout output.
- **Confidence**: High

## Observation: native fdp layout of 2471 differs run to run
- **Context**: scanning the xdot oracle cache for multi-flag edges.
- **Finding**: four runs of the same 16.1.0 binary on `tests/2471.dot`
  (`-K fdp -Txdot`, same GVBINDIR, with and without GVTS_POS_DUMP) gave
  bb widths 98653, 1.0031e5, 1.4437e5 and 4.3188e6 (the walk's cache). The
  cause is not identified (address-dependent ordering is a guess, untested).
- **Impact**: 2471's fdp base diff count is noise; compare only within one
  oracle run (injection does this: dump and xdot come from the same process).
- **Confidence**: High for the variation, Low for any cause.

## Observation: no cached oracle output has an edge flagged twice at one end
- **Context**: sizing the per-bezier arrowhead fix.
- **Finding**: across the xdot oracle caches (dot `6ab9762134bf`, the seven
  other engines `af7c069742bf`, ~925 graphs each), no edge `pos` has two or
  more segments carrying `e,` (or `s,`). Only a fresh fdp 2471 run produces
  one (`n138 -> n40`).
- **Impact**: the fix cannot change a committed walk verdict. The scan script
  is short: split each edge `pos` on `;`, count segments with `e,`/`s,`.
- **Confidence**: High

## Observation: fdp 2471 residual after the arrow fix is an edge-label candidate flip
- **Context**: re-attributing fdp 2471 with per-bezier arrows applied.
- **Finding**: three oracle+injection runs (`scratchpad/2471b/run.sh`): one
  (bb 1.0342e5) gave 0 diffs; two (bb 4.3188e6, 86089) gave exactly one edge
  each whose `lp.y` is 16.8 below the oracle's (one 14pt line x 1.2), same
  spline, same `lp.x` (`n138->n76`, `n137->n67`; HTML-table "INCLUDE"
  labels). Unset edge labels go through the xlabel placer
  (`postproc.c addXLabels`, anchor `edgeMidpoint`), so a different
  candidate won. The port's Hilbert key matches C (32-bit wrap at order 22).
  Which placer input differs is not yet identified; the twopi A9 entries
  document the same symptom from a 1-ULP node size through `floor()` in the
  R-tree load. The committed row (37731 -> 2, lp) is one run's luck.
- **Impact**: fdp 2471 stays not-cleared regardless of the arrow fix. sfdp
  2371 (433020 -> 318) has the same bucket signature (edge _ldraw_ + lp);
  same mechanism likely, unverified (its port render takes ~3h).
- **Confidence**: High for the symptom, Low for the cause.
