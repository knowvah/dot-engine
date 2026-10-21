# T13: `fix(T13)` or park: sfdp 2168_3 multispline corridor polygon (item 17)

Diagnosis-led (AD-3 budget ~2 h). Agent: debugger (opus).

**Context:**
- sfdp 2168_3 (`~/git/graphviz/tests/2168_3.dot`): xdot matches native (walk `pass`), but
  the port prints 2 routing warnings where native prints 1.
- Previous mission (`.agent-notes/post-16-1-followups-mission.md`, "sfdp 2168_3's extra
  warning"): feeding the port's two corridor polygons to native `libpathplan`
  `Pshortestpath` through a C harness also fails on both. So the polygon differs, not
  pathplan: `mkRouter` / `triPath` / `mkPoly` (C `lib/neatogen/multispline.c:556`, `:1104`,
  `:953`; port `src/layout/neato/multispline-router.ts:126,388` and `mkPoly` in
  `src/layout/neato/multispline.ts`).

**Task:**
1. Build an instrumented native copy **in the scratchpad** (copy or worktree of
   `~/git/graphviz` at `oracle/16.1.0`, its own build dir; never touch
   `~/git/graphviz/build` or `/tmp/ghl`, stop 11). Dump, for the failing edge: the router's
   points and triangles, the `triPath` result, and `mkPoly`'s polygon.
2. Dump the same from the port (env-gated, removed before commit), and find the first
   value that differs. Name it with `file:line` on both sides.
3. Fix at the origin (tests first), or park with the full diagnosis artifact.

**Write-set:** `src/layout/neato/multispline-router.ts`, `src/layout/neato/multispline.ts`,
`src/layout/neato/cdt-surface.ts` (only if the origin is there), colocated tests. Any other
file needs a journaled extension (stop 1).
**Read-set:** the ranges above; `.agent-notes/post-16-1-followups-mission.md`.

**Acceptance criteria:**
- *Given* both dumps, *then* the journal names the first divergent value, its port and C
  origin, and the causal chain to the extra warning.
- *Given* a fix, *when* sfdp 2168_3 renders, *then* the warning count equals native's and
  the sfdp walk has no pass→worse.
- *Given* the budget is spent first, *then* the item is parked with mechanism (or best
  current), ruled-out list and the next instrument.

**Observability:** N/A. **Rollback:** reversible.
