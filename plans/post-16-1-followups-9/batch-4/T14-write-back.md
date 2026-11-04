# T14: rendering writes layout attributes back (plantuml-ts 37, AD-12)

**Context:** native's `attach_attrs_and_arrows` and the xdot writer put `pos`, `width`, `height`, `bb` and the draw attributes into the graph
(`lib/common/output.c:254`, `plugin/core/gvrender_core_dot.c:434`), and `gvLayout` writes `bb` even on `plain`. `init_xdot` replays the graph's draw attribute through the renderer, and the next
layout reads the rest (`lib/common/emit.c:75,1528`, `lib/common/input.c:784`). The port's `src/render/dot.ts` and `src/render/dot/agwrite.ts` overlay computed values at output and never write them
to the graph. T11 traced this with `harness/T11/twice.c` (`restore`, `keep:<a>`): 1 of 280 second `xdot` renders match native at 0.01, 171 differ only in graph `_draw_`, 108 otherwise.
Read T11's rows in `plans/post-16-1-followups-9/decision-journal.md`.

**This is a visible behaviour change, and the user chose it (AD-12):** `g.attrs` changes after a `dot` or `xdot` render, a later layout reads those values, and the port stops repeating on
`xdot`, as native does. A first render must not change (stop 15).

**Task:**
1. Trace C's write-back in order: which renderers and formats write, which objects and attributes, whether empty values are written, how symbols get declared, and when `bb` is written. State
   what `init_xdot` replays and what each engine's next layout reads.
2. Tests first: turn the 10 `it.fails` `xdot` cases in `src/gvc/rerender.test.ts` into passing ones. Add native-fixture sequences for: layout once then `xdot` then `svg`; layout once then `xdot` twice; `xdot`
   then `plain` with a layout between; `plain` then `xdot`; and a neato case where `pos` read back moves the layout.
3. Implement the write-back at C's points in the render path, then port the replay. Keep output order and attribute declaration order native's on the first render: declare what C declares, when C declares it.
4. Run the libm gate on the new cases.
5. Rerun the matrix, and report the port's second `xdot` against native's second at 0.01, with the same breakdown as T11's. Read inputs as `render` callers do: T11's latin1 read may have inflated its count.
   Classify every remaining miss: native not repeating across runs, a first-render miss already present, or a real write-back miss. Only the last counts against this task.
6. Audit any test or `src/` reader that assumed `g.attrs` is unchanged by rendering, and report each one.

**Write-set:** `src/render/**`, `src/gvc/**`, `src/common/emit*`, `src/common/output*`, the tests of those files, `src/gvc/__fixtures__/rerender/`, `plans/post-16-1-followups-9/harness/T11/`. Any other file is stop 1.

**Acceptance criteria:**
- *Given* any engine and format `xdot` or `dot`, *when* rendered twice with a free between, *then* the second output matches native's second at 0.01, apart from misses classified as native nondeterminism or
  as first-render misses already present, each listed.
- *Given* one layout then several renders, *when* compared with native, *then* each render matches at 0.01.
- *Given* the smoke ids, *when* bytediffed, *then* every first render is byte-identical, stderr included (stop 15).
- *Given* `render` then `getLayout`, *when* read, *then* the geometry is the layout's.
- *Given* the matrix, *when* rerun, *then* `plain` stays at native-same-but-port-not 0, except where native's own `bb` write-back now applies and the output matches native.

**Commit:** `fix(T14): write layout attributes back as attach_attrs does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
