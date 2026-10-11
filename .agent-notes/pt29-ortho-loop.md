## Observation: splines=ortho self-loop dropped by ortho-adapter gather
- **Context**: plantuml-ts issue 29 (`digraph g { splines=ortho; a -> a; }`):
  port logs `lost a a edge`, emits no path, canvas 80x44; native draws a
  routed loop on 80x80.
- **Finding**:
  - Mechanism: the port's edge gather skips every edge with
    `tail === head` (comment: "Self-loops are routed elsewhere"), so the loop
    never reaches `orthoEdges`. Nothing else routes it under `et == ORTHO`, so
    the edge reaches postproc with no spline -> `map_edge` prints "lost".
    C has no such exclusion: `ortho.c:1207-1228` gathers every `agfstout`
    edge (only Nop==2 / Concentrate dedup skip), and `ortho.c:1246` calls
    `addLoop` when `start == dest`.
  - Origin: `src/layout/dot/ortho-adapter.ts:77`
    (`if (e.tail === e.head) continue;` in `buildEdges`; doc comment at :61).
  - Causal chain: gather skip -> OrthoGraph.edges lacks the loop -> no
    route/spline installed -> `src/common/postproc.ts:230` `lost a a edge`;
    canvas is 80x44 because no loop geometry extends the bbox.
  - Ruled out: `addLoop`/`shortPath`/`convertSPtoRoute` for start===dest
    (src/ortho/sgraph.ts, index.ts) -- with only line 77 removed (temporary,
    reverted), `a->a` renders path
    `M27,-54.42C27,-63.28 27,-72 27,-72 ... 27,-6.06` and an 80x80 canvas
    identical to the native ref, and `a->b; a->a` matches the pair ref
    paths and 80x134 canvas; no "lost" log. So src/ortho/* is correct.
    Dot's self-loop dispatch: C dot_splines calls orthoEdges(g) at
    dotsplines.c:250-257 before any self-loop branch; the port's equivalent
    (`dispatchOrthoEdges`) is fine once the gather includes loops.
- **Impact**: fix is a one-line removal in
  `src/layout/dot/ortho-adapter.ts` plus stale comments (docstring at :61,
  "tail!=head edges only" on buildOrthoGraph) and any ortho-adapter test
  asserting self-loops are excluded. Outside T4's write-set -> escalated.
- **Confidence**: High (controlled experiment against native refs).
