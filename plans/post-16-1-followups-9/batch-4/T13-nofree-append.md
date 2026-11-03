# T13: a layout with no free appends its route (plantuml-ts 37, AD-12)

**Context:** T11 made a second layout after a free match native. A second layout with **no** free keeps stale records, as C does, and
C's `new_spline` then appends the new route (`lib/common/splines.c:216-220`). The port's dot router treats `e.info.spl !== undefined` as "already
routed", so the stale spline blocks the new one and only the translated old bezier prints. T11 proved the cause: hiding the stale `spl` before layout 2
produces native's appended bezier exactly. Read T11's rows in `plans/post-16-1-followups-9/decision-journal.md`.

**Task:**
1. Read each gate (`src/layout/dot/edge-route.ts:319,376,385,434,489`, `src/layout/dot/splines-flat-multi.ts:77`, `src/layout/dot/splines-flat-labeled.ts:404`) and search the
   router for any others. State what each protects on a first render, usually an edge a group or chain already routed in this pass.
2. Tests first: turn the `it.fails` no-free case in `src/gvc/rerender.test.ts` into a passing one. Add a native `nofree` fixture for render 2 and render 3 on the filing's graph, and
   for a multi-edge graph with flat edges, labels and parallel edges, so each gate is reached. Native crashes on no-free cluster graphs (T11: rc 139, rc 1), so do not pin those.
3. Make the gates mean "routed in this pass", not "has a spline". Track that per pass, in routing's own state: no module-level `let` (fitness test), and no new public API field (stop 11).
4. Measure the other engines' no-free runs against native on the same graphs. T11 reported their `new_spline` port as faithful and fixed nothing there. Fix what differs, if inside the write-set.

**Write-set:** `src/layout/dot/edge-route.ts`, `src/layout/dot/splines-flat-multi.ts`, `src/layout/dot/splines-flat-labeled.ts`, any other `src/layout/dot/` routing file with such a gate,
`src/gvc/rerender.test.ts`, `src/gvc/__fixtures__/rerender/`, `plans/post-16-1-followups-9/harness/T11/`.

**Acceptance criteria:**
- *Given* `ctx.layout` twice or three times with no `freeLayout`, *when* compared with native's `nofree` run on the filing's graph and the multi-edge graph, *then* the output matches at 0.01,
  appended beziers included.
- *Given* the smoke ids, *when* bytediffed, *then* every first render is byte-identical (stop 15).
- *Given* the matrix, *when* rerun, *then* native-same-but-port-not stays 0 on `plain`.

**Commit:** `fix(T13): append routes on a layout with no free as new_spline does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
