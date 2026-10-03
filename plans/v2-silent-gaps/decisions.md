# Architecture decisions (pre-made, locked)

Approved by the owner 2026-10-03. Owner standing preference: **port the C code**.

## ADR-1: Port, don't silence

- **Context:** after v2-fidelity, several attribute values still select C code
  the port skips without any error.
- **Decision:** port each one faithfully. Loud (`RenderError
  UNSUPPORTED_FEATURE` at C's dispatch point) only when a port hits stop
  condition 4 and the owner chooses loud. `overlap=voronoi` (the Voronoi
  adjuster, `voronoi.c` + support) stays loud: out of scope.
- **Consequences:** graphs using these values change output (closer to
  native); README migration rows list them.

## ADR-2: Port `lib/neatogen/poly.c` first (T1)

- **Context:** C's overlap counting (`countOverlap` → `polyOverlap`) uses node
  polygons; v2-fidelity T7 approximated it with inflated bounding boxes.
- **Decision:** port `poly.c` (`makePoly`, `makeAddPoly`, `polyOverlap` and
  helpers, ~440 C LOC) as `src/layout/neato/poly.ts`. Everything that counts
  overlaps uses it.
- **Consequences:** `overlap=voronoi` stops throwing where C's exact test finds
  no overlap (rounded shapes).

## ADR-3: Honour the neato `mode` attribute; port KK (T3, T4)

- **Decision:** `parseMode` reads the attribute exactly as C `neatoMode`
  (neatoinit.c:634), including the warning for unknown values. `mode=KK` runs a
  port of `kkNeato` (neatoinit.c:1244) and its `stuff.c` path (~460 C LOC) in a
  new `kk.ts` (init.ts is over the 500-line cap and may only shrink).
  `mode=sgd` reaches the existing sgd port; Step 0 decides whether sgd needs a
  fidelity fix (e.g. RNG seeding), which is ported under stop condition 4.
- **Consequences:** mode=KK/sgd output changes to match native. v2-fidelity's
  loud checks for hier/ipsep/self/subset/circuit keep their conditions.

## ADR-4: Port `cAdjust` (T5)

- **Decision:** port `constraint.c` `cAdjust` and its helpers (lines 40-604:
  constraint graphs, `constrainX/Y`, `overlaps`, `initItem`; ~560 C LOC) as
  `src/layout/neato/constraint-adjust.ts`, solving with the port's existing
  network simplex `rank` (`src/layout/dot/ns.ts`) and cdt as C does.
  `scAdjust` is already ported (`sc-adjust.ts`); share nothing by editing it.
- **Consequences:** `overlap=ortho*` / `portho*` work on every engine that
  calls `removeOverlapWith`.

## ADR-5: One overlap dispatch (T6, T7, T9)

- **Decision:** `adjustNodesFull` (`src/layout/neato/fdp-adjust.ts`) is the single
  port of `removeOverlapWith` (adjust.c:898-997), used by neato, twopi, circo and
  sfdp. It dispatches prism, the scale family, `oscale` (`sAdjust`, ported in
  T6 with `makeInfo`/`countOverlap`/`chkBoundBox`/`rmEquality`/`rePos`/
  `updateGraph`), ortho*/portho* (`cAdjust`), `vpsc` (the existing VPSC adjuster,
  moved out of `neato/index.ts` into `vpsc-adjust.ts`), voronoi (loud) and
  C's "Unhandled adjust option" warning. fdp keeps its own throw site
  (`fdp/xlayout.ts`), as C's fdp has its own `removeOverlapAs` path.
- **Consequences:** engines cannot drift apart again; sfdp gains every non-prism
  mode C runs after layout (sfdpinit.c:272/283).

## ADR-6: circo multi-component overlap (T8)

- **Decision:** wire C's per-component `adjustNodes(sg)` (circularinit.c:212)
  faithfully. If Step 0 shows derived nodes cannot carry width/pos to the shared
  dispatch within the stop-4 budget, stop and propose (loud is the fallback only
  with owner approval).

## ADR-7: fdp `coords` declared graph-wide (T2)

- **Decision:** `hasCoords` mirrors `agattr_text(g, AGRAPH, "coords", NULL)`
  (fdpgen/layout.c:946): true when any (sub)graph declares `coords`
  (`root.declaredGraphAttrs`).

## ADR-8: Conventions and release

Same as v2-fidelity: native oracle, Step 0 gap re-confirmation before any change,
one commit per task, corpus gate vs a baseline bundle of 4fe3d1ca, no merge or
push. Tolerances: ±0.01 dot, ±0.5 neato/fdp/sfdp/twopi/circo. See
[conventions.md](conventions.md).
