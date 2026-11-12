# Decisions: issue #137

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-10.
Nobody confirmed these. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: remove the port-only `placeRegularEdgeLabels(aux.auxg)` call

- **Decision:** delete `src/layout/dot/splines-flat.ts:372-376`, the four-line comment
  and the call. Drop `placeRegularEdgeLabels` from the `splines-label.js` import at
  `:44`. `updateBB` stays: `:264` uses it. `makeFlatAdjEdges` then runs
  `dotSplines_` → `gvPostprocess`, which is C's `dot_splines_` → `dotneato_postprocess`
  (`dotsplines.c:1236-1240`). Pass condition: gates 5 and 6 are byte-identical base to
  head.
- **Fallback:** if any job changes, the call is not a no-op. Enter diagnosis mode and
  find which state differs between the two `placeRegularEdgeLabels` calls. Restore the
  call. Write a comment that states that mechanism and does not name the backstop. File
  a `follow-up` issue saying the port runs a step C does not, with the evidence. The
  commit type becomes `docs`.
- **Rejected:**
  - (a) Change only the comment and keep the call as "harmless". The comment would have
    to say the call is redundant, and the project's rules say port-only steps C lacks do
    not stay (CLAUDE.md "Keep function boundaries", pr-workflow dead-code rule for a file
    being edited).
  - (b) Change only the comment and file the removal as a follow-up. That costs a second
    mission for a 5-line, output-neutral change on the same lines.
- **Evidence:** `finalizeSplines` (`splines.ts:487-494`) runs `placeRegularEdgeLabels(g)`
  after `routeEdgeGroups`, inside the same `dotSplines_(aux.auxg, false)` call. After
  it, only `placePortLabels`, `setState` and the `edgeLabelsDone` flag run
  (`normalize` is false). `placeVnlabel` (`splines-label.ts:69-80`) writes `l.pos` from
  `n.info.coord` and `labelXPos(n, l)`, and `l.set`. `updateBB` only grows the box. So a
  second call with unchanged coords writes the same values. The call came in with
  `2e13de28` (DOT-12) to run after the backstop. T8's journal row records the backstop
  making 0 routes over 921 dot manifest ids and 412 `tests/` files on first renders.

### AD-2: `lost` stays; its comments name the live reader

- **Decision:** keep `EdgeInfo.lost` and every write to it. The comments at
  `splines-flat-labeled.ts:153-154` and `edgeInfo.ts:175-177` name `routeLoneEdge`'s
  skip (`edge-route.ts:464`) and the per-pass reset in `beginRoutingPass`
  (`edge-route-rank.ts:133`).
- **Rejected:** removing `lost`. `dispatchEdgeGroup` calls `routeLoneEdge` for every
  member of a flat group (`splines-groups.ts:121`). The flat routers route sibling
  members themselves ("gather their own group and skip routed members"). A member that
  an earlier call lost has no spline, so without `lost`, `routedThisPass` alone would
  let a later call route it again and warn twice. That is the 2x-stderr defect
  `.agent-notes/followup-14-flat-labeled-lost.md` records, which the backstop also
  caused. Removing it is outside a comment issue in any case.
- **Evidence:** `grep -rn "info\.lost" src` at planning: 7 writes, 1 read
  (`edge-route.ts:464`), 1 reset.

### AD-3: survey scope is every corpus id that reaches `makeFlatAdjEdges`

- **Decision:** the comments cannot change output, and AD-1 can change it only where
  `makeFlatAdjEdges` runs. Gate 6 finds those ids with a marker bundle: a base checkout
  under `$TMPDIR` with one `console.error` marker at the top of `makeFlatAdjEdges`. Run it
  over every dot-applicable corpus input, render head and base on the ids that print the
  marker, and record native's result for each.
- **Rejected:** a fixed id list chosen by grepping for labeled same-rank edges. The
  route to `makeFlatAdjEdges` depends on adjacency after mincross, so a text grep both
  misses inputs and over-includes others. #134 used a marker bundle for the same reason.

## Follow-ups found at planning

None filed. `makeFlatAdjEdges` discards `dotSplines_`'s return (`splines-flat.ts:371`),
where C returns `rc` (`dotsplines.c:1236-1239`). The executor checks whether `rc` can be
non-zero on that path (ortho is dispatched elsewhere) and files a `follow-up` only if
it can.

## Baseline

On `9466ec3f`, 2026-11-10 during planning: `npm run typecheck` exit 0; `npm test` exit
0, 562 files, 13275 tests. There is no lint script;
typecheck is the static gate.

## Rollback

Reversible: revert the one commit. No output change is expected (gates 5 and 6 require
byte identity).
