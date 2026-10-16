# T5: `fix(T5)`: warn when multispline cannot create control points

**Context:**
- C `lib/neatogen/multispline.c` prints `Could not create control points for multiple
  spline for edge (%s,%s)` at :703, :723, :740, :759 and :778, each before a fallback
  or failure.
- The port's `src/layout/neato/multispline.ts` (`makeMultiSpline`, around
  `mkCtrlPts`:139 and `routeMember`:309) prints none of them.
- Journal row 2026-10-14 (follow-up 3): fdp 2471 edge `n138 -> n40` takes C's fallback
  (`neatosplines.c:683-701`). That is a known case where native prints this.

**Task:**
- Add the warning at each of the 5 C sites, after mapping each to its port branch, with
  tail and head names as C's `agnameof` gives them.
- Write tests first: one per site where reachable. Name any site you cannot reach, with
  the reason, in the hand-back.

**Write-set:** `src/layout/neato/multispline.ts`, `src/layout/neato/multispline*.test.ts`.
**Read-set:** `~/git/graphviz/lib/neatogen/multispline.c:690-790`;
`src/layout/neato/multispline.ts:139-372`.

**Acceptance criteria:**
- *Given* an edge whose control points cannot be created, *when* it is routed, *then* the
  warning names `(tail,head)` exactly as C does.
- *Given* fdp 2471 (and every neato/fdp/sfdp id in T0's native capture), *then* the port's
  warning count per id equals native's.
- *Given* the batch-2 shared criteria, *then* SVG is byte-identical.

**Observability:** new stderr lines only. **Rollback:** reversible.
