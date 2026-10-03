# Architecture decisions (pre-made, locked)

Approved by the owner 2026-10-02.

## ADR-1: No silent unported features in 2.0

- **Context:** several DOT attribute values select a Graphviz feature the port
  lacks. Today the port ignores them or runs a different algorithm, so output
  quietly differs from Graphviz.
- **Decision:** if the C is small and needs no new subsystem, port it now.
  Otherwise throw `new RenderError('<attr>=<value>: <what> is not supported yet',
  'UNSUPPORTED_FEATURE')` at the point where C would branch into the feature.
- **Consequences:** turning a loud failure into working output later is
  additive (2.x, no 3.0). Graphs that rendered approximately in 1.x now fail;
  this goes into the 2.0 migration notes.

## ADR-2: The split

| Port in 2.0 | C | ~LOC |
|---|---|---|
| dot `nslimit` | `lib/dotgen/position.c:nsiter2` | 10 |
| neato `start=regular` | `lib/neatogen/neatoinit.c:initRegular` + `checkStart` | 16 |
| neato/fdp `inputscale` | `lib/common/input.c:400-410` (`PSinputscale`), `neatoinit.c:88-101`, fdp equivalents | 20 |

| Loud in 2.0 (`UNSUPPORTED_FEATURE`) | C | why not now |
|---|---|---|
| neato `model=subset`, `model=circuit` | `neatoinit.c:kkNeato`, `majorization` | distance models / matrix solvers |
| neato `start=self` (and the `INIT_SELF` default of `mode=hier`) | `smart_ini_x.c`, `pca.c` | smart init |
| neato `mode=hier`, `mode=ipsep` | `constrained_majorization*.c` | ~1400 LOC |
| neato `overlap=voronoi` | `voronoi.c` + support | Voronoi stack |
| sfdp `quadtree=none` / `fast` | `spring_electrical_embedding_slow` / `_fast` | unported embeddings |
| sfdp `label_scheme>0` | `sfdpinit.c`, `stress_model.c` | edge-label nodes |
| fdp `splines=compound` | `lib/fdpgen/clusteredges.c:compoundEdges` | unported router |

Already loud since error-hierarchy T5: sfdp `smoothing`/`rotation`, fdp overlap
modes, unported special shapes.

**Amended 2026-10-02 at planning time (evidence, scope reduction only).** Native
comparisons (journal row 1) showed sfdp `beautify` and neato `model=mds` (uniform
and varied `len`) already match native, so they are removed from the
port list. The planning inventory (an Explore agent) was wrong about them and
about `clusteredges` (the real trigger is fdp `splines=compound`). Every
remaining item was confirmed as a real gap with a discriminating native diff
(Δ 0.8–9.0 against a 0.0022 baseline); `label_scheme=1` and `splines=compound`
were confirmed by output hash. Each task re-confirms its gap first (ADR-4).

## ADR-3: Loud checks sit at C's dispatch point, with C's precedence

Each check sits where C reads the attribute in that engine's init/dispatch
(`neatoModel`, `checkStart`, the mode switch, `sfdpinit.c`, `fdpSplines`,
`removeOverlapWith`). It fires only when C would actually run the unported code
for that engine. If C ignores the attribute for an engine (e.g. sfdp warns
"only supports start=random"), the port does exactly that. No central
validator.

## ADR-4: Faithful changes, proven against native Graphviz

**Step 0 of every port or loud-check task:** re-confirm the gap on a
discriminating fixture (one where the attribute changes native output) before
changing anything. If the port already matches native, journal it and skip that
item; that counts as success, not a stop.

Same rules as error-hierarchy. Every port is compared with native `dot -K<engine>`
([oracle.md](oracle.md)) on at least 2 inputs that use the attribute,
within the engine's conformance tolerance (±0.01 deterministic, ±0.5 for
neato/fdp/sfdp). Loud checks change control flow only for the attribute values
listed in ADR-2.

## ADR-5: The three small fixes

- **freeLayout:** `GvcContext.layout` stores `engine.cleanup` in `g.info.cleanup`
  after a successful layout. `freeLayout` calls it if set, then clears it
  (`gvlayout.c:88`, `:113-116`). The `engineName` parameter stays, for
  argument validation only: no public signature change.
- **gvXmlEscape:** build the `&#x…;` entity from the Unicode code point
  (`codePointAt`; it advances 2 UTF-16 units for astral characters). That is
  exactly C's decoded UTF-8 scalar. A lone surrogate keeps the existing
  `RenderError RENDER_ERROR` (C exits on malformed UTF-8).
- **2723:** the port's `InternalError` stands (C segfaults; upstream
  `test_2723` is `xfail`, issue 2723 open). Pin it with a test, add a note under
  A4 in `docs/known-divergences.md`, and make no port change.

## ADR-6: Release

Work on `feature/v2-fidelity` off `feature/error-hierarchy`; nothing is merged or
published. The docs (errors page list of unsupported attributes, README 2.0
migration rows, `plans/port-catalog` checkboxes) are updated in-mission (T10).

**Amended 2026-10-02 during execution (owner-approved).**
- ADR-2: neato `mode=ipsep` is loud **only when C builds constraints**:
  `diredgeconstraints` true or `hier*` (neatoinit.c:1132/1137), a cluster
  (constrained_majorization_ipsep.c:202), or `overlap=ipsep` (:1143). Without
  constraints the port already matches native (Δ ≤ 0.12 pt, 8 fixtures).
- T6 write-set gains `src/layout/neato/start.ts` and
  `src/layout/neato/start.fidelity.test.ts` (init.ts is over the 500-line cap
  and may only shrink), plus `src/layout/neato/init.branch.test.ts`, whose
  `solveModel` mode=hier test asserts the warn-and-fallback ADR-2 replaces.
- T9 write-set gains `src/layout/fdp/init.ts` and `src/layout/fdp/derive.ts` (2026-10-02, owner): fdp calls get_inputscale (fdpgen/layout.c:1082). Negative inputscale follows C (clamped to 0 → 72).
