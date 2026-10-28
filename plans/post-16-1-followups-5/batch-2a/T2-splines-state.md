# T2: `State == GVSPLINES` (AD-5, item 87)

**Context:** `lib/common/postproc.c:153` `translate_drawing` calls `map_edge` only when the
global `State == GVSPLINES` (`globals.h:66`); C sets it at `dotsplines.c:477`,
`neatoinit.c:567`, `neatoinit.c:586`, `neatosplines.c:778`. `src/common/postproc.ts:224`
assumes it always holds, so patchwork (which never routes) prints `Error: lost a b edge`
per edge; native prints nothing. `src/layout/fdp/index.ts:80-104` already reasons about
`State` in comments.

**Task:** (1) New `src/common/layout-state.ts`: `State` (`GVBEGIN`…`GVSPLINES` as C's
`globals.h` enum, `@see`), `setState`, `registerRenderState` reset to C's initial value.
(2) Locate the port of each of the four C sites (grep `dotsplines.c`, `neatoinit.c:5`,
`neatosplines.c` in `src/layout/dot/*.ts`, `src/layout/neato/index.ts`,
`src/layout/neato/splines.ts`; stop 1 if a site is elsewhere) and set `GVSPLINES` at the
C position. (3) `translateDrawing` tests `State === GVSPLINES` before the edge loop,
keeping `map_edge`'s lost-edge warning. (4) Tests: patchwork stderr empty; dot lost-edge
still warns; `State` resets per render.

**Write-set:** `src/common/layout-state.ts` (new), `src/common/postproc.ts`, the four spline
site files (+ tests beside them).
**Read-set:** `lib/common/postproc.c:150-175`, `lib/common/globals.h:60-70`, the four C
sites; `$BASE/native/87.stderr`; `.agent-notes/post-16-1-followups-mission.md` (golden
"logs nothing" lists).

**Acceptance criteria:**
- *Given* `digraph{a->b}` -Kpatchwork -Tsvg, *then* stderr is empty (equals native).
- *Given* T0's dot lost-edge reference, *then* `Error: lost a b edge` still prints.
- *Given* the corpus ids for dot, neato, fdp, osage, patchwork, *then* bytediff identical
  (console included) except patchwork's removed lines, each explained.

**Observability:** N/A. **Rollback:** reversible.
