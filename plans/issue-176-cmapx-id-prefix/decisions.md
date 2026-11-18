# Decisions: issue #176

## Confirmed (planned unattended)

Confirmed by the maintainer on 2026-11-18, after review against native 16.1.1:
the probe re-run of #178-#180 and the 6f593c50..9336a55c bytediff
classification.

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17. No issue was labelled `queue:planned`. #176 was the
lowest-numbered open `queue:ready` issue, and it has no "Blocked by"
references. Nobody confirmed the decisions below. Each one names the options it
rejected and the evidence, so the maintainer can audit it.

Filed during planning (queue rules, new defects): #249 (an object's own `id`
is not `\`-substituted as `initMapData` does).

### AD-1: set `job.drawingId` once in `render()`, for every renderer

- **Decision:** `src/gvc/device.ts:render()` assigns `job.drawingId` before
  `renderGraph`, for every renderer, and `svgBeginGraph`
  (`src/render/svg-graph.ts:342`) stops assigning it. The value comes from a
  helper `drawingIdOf(g: Graph): string` in `src/render/svg-id.ts` (the
  module that already holds the port's `getObjId` pieces), imported through
  the existing `svg-id.js` import line of `device.ts` so the file does not
  grow. `@see lib/common/input.c:graph_init (786-788) ;
  lib/common/emit.c:getObjId`.
- **Rejected:** assigning it in the map renderer's `beginGraph` as well.
  C's field is renderer-independent; a second per-renderer copy would leave
  the next renderer that prints ids with the same defect.
- **Rejected:** porting the timing too, a `WeakMap` set beside `initXdot` at
  layout start (`src/gvc/context.ts:344`, the port's `graph_init` site) and
  read at render. It differs from a render-time read only when a caller
  changes `id` between layout and render; the svg path already reads at render
  time, and no corpus input or test does that. Moving the read point is a
  separate change with no reach here.
- **Rejected:** giving `RenderJob.objId` the graph to read lazily. It changes
  the signature of a method with four callers for no output difference.
- **Evidence:** `harness/planning-survey.md` (prototype); C at the lines named.

### AD-2: the prefix is substituted as `graph_init` substitutes it

- **Decision:** `drawingIdOf(g)` returns `substObjAnchor(id, g)` (C's
  `strdup_and_subst_obj`, `src/common/subst.ts:100`) when the root's `id` is
  non-empty, else `''`.
- **Rejected:** keeping the raw value. Native prints `xG_node1` for root
  `id="x\G"`, the port `x\G_node1` in svg and nothing in cmapx (probe
  `subst`); the substitution is part of the very assignment being moved.
- **Rejected:** substituting an object's own `id` in the same change
  (`<g id="x\G">`, `id="i\N"`). That is C's `initMapData` (`emit.c:171`), a
  different site, filed as #249.
- **Risk:** svg output changes for a root `id` holding a `\` escape. No corpus
  input has one (`grep` at planning); the `subst` and `subst2` svg rows move
  toward native.

### AD-3: probe lines owned by #242 and #177 change without reaching native

- **Decision:** accept that `clust` (cluster line `clust1` to `R_clust1`,
  native `R`) and `elabel` (label lines `edge1` to `R_edge1`, native
  `R_edge1-label`/`-headlabel`) change to lines that are not native's. Pin
  neither in a test; name both in the test file with the issue numbers.
- **Why:** after the fix each line carries C's prefix exactly as `getObjId`
  builds it; what is left is owned elsewhere. `clust-late` (cluster opened
  before the root `id`, so it inherits nothing) is byte-equal on the
  prototype, which isolates `clust`'s remainder to cgraph's attribute
  inheritance (#242). `R_clust1` is also what the port's svg already prints
  for the same input. `elabel`'s remainder is the suffix (#177). Keeping the
  old line would need a branch C does not have.
- **Rejected:** filing a `needs-ruling` issue. Neither shape occurs in the
  corpus (only `2258.dot` has a root `id` with anchors, and it has no
  cluster or edge label), so gates 5 and 6 never meet it; stop condition 3
  covers a corpus row of this kind.
- **Rejected:** folding #177 into this mission. It is its own queue entry
  with its own mechanism (`emitEdgeLabel`, `src/render/map.ts:751`).

### AD-4: one task; new tests in a new file

- **Decision:** a single task T1: red tests, the fix, the gates, the squash.
  New tests go in `src/render/map-id-prefix.test.ts` (new): unit cases for
  `drawingIdOf` (unset, empty, plain, `\G`), and probe cases that render
  `repro`, `html`, `ownid`, `glabel`, `clust-late`, `subst` under dot, neato
  and fdp in `cmapx` and `cmapx-np` through
  `test/helpers/render-format.ts:renderFormat` and compare with
  `plans/issue-176-cmapx-id-prefix/harness/native/<probe>.gv.<engine>.<fmt>`
  (read from disk; precedent: issue-175's probe cases and
  `src/gvc/node-in-box-pad.test.ts`). For `elabel`, `clust` and `subst2`,
  assert only the lines that must equal native (node and edge areas).
- **Rejected:** separate diagnose and fix tasks. Planning traced the mechanism
  and ran a prototype on both sides; the journal still records the artifact.
- **Evidence:** `wc -l` at base: `device.ts` 510, `svg-id.ts` 85,
  `svg-graph.ts` 450, `job.ts` 414.

## Baseline

At `a0338483` on 2026-11-17: `npm run typecheck` exit 0. `npm test`: 592
files, 13974 tests, all passed. There is no lint script, so typecheck is the
lint bar.

## Rollback

Reversible: revert the one squashed commit. It changes `cmapx` and `cmapx-np`
area ids when the root graph has an `id` (a `<id>_` prefix, as native), and
svg ids only when that `id` holds a `\` escape. No API or data change:
`drawingIdOf` and `RenderJob.drawingId` are internal.

## Operational readiness

A library, so there are no SLIs, dashboards or on-call. Users of `cmapx` with
a root `id` see area ids that now match the svg ids of the same graph and
native graphviz; a page that addressed the old unprefixed area ids by
`id` would need the prefix. Backwards compatible at the API level.
