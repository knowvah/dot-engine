# Decisions: issue #193

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `670a47d9`.

## Mechanism (planning's diagnosis)

- **Mechanism.** C's `neato_layout` runs `compute_bb(g)` after `spline_edges`
  only in its `Pack >= 0` branch (`lib/neatogen/neatoinit.c:1380,1416`).
  `mode=KK` with no `pack` and no `packmode` leaves `Pack < 0`
  (`neatoinit.c:1375`: only a non-KK `layoutMode` turns packing on), so the
  `else` branch (`neatoinit.c:1431-1436`) keeps the bb that `spline_edges` made:
  `compute_bb` at its entry (`neatosplines.c:840`), shifted to the origin,
  scaled by `neato_set_aspect`, then grown by `update_bb_bz` in
  `clip_and_install` (`lib/common/splines.c:290`). The port's `neatoLayout`
  recomputes the bb from the nodes and every bezier after routing on every
  path, the `Pack < 0` one included.
- **Origin.** `src/layout/neato/index.ts:222`
  (`g.info.bb = computeSubgraphBB(g, 0);`, unconditional).
- **Causal chain.** On a no-free relayout the edges still hold layout 1's
  beziers. `compute_bb` at `spline_edges` entry counts them. On the triangle
  they sit above the new node box, so the entry bb is 121.35 pt high, not
  103.80 pt. Native keeps that height (`graph 1 1.7338 1.6854`). The port
  computes the same entry bb (`STRESS_DEBUG` at `src/layout/neato/splines.ts:990`
  prints `ur.y` 63.47 on layout 1 and 81.03 on layout 2, with `ll` unchanged).
  The new routes repeat layout 1's, so `computeSubgraphBB` after routing gives
  back layout 1's box, and the port prints `1.4416` again. On a single layout
  the same line drops `neato_set_aspect`'s scale: `ratio=fill; size="3,3!"`
  differs from native on render 1 (14 diff lines in plain), as the comment
  at `src/layout/neato/splines.ts:1000-1003` says it would.
- **Ruled out.**
  - The port's `compute_bb` dropping stale beziers: `computeBBFromPos`
    (`src/layout/neato/splines.ts:842`) walks `e.info.spl`, and the
    `STRESS_DEBUG` dump above shows the stale beziers in layout 2's entry bb.
  - `clipAndInstall` not growing the bb: it calls `copyToBezier(..., g.info.bb)`
    for `update_bb_bz` (`src/common/splines-clip.ts:480-481`).
  - Node placement: node and edge lines are equal on all three renders
    (the issue; the plain rows of
    [results/native-planning-base.tsv](harness/results/native-planning-base.tsv)
    differ by 2 lines, the `graph` line on each side).
  - The `Pack >= 0` path: `kk-pack` (`mode=KK; pack=true`), `major-tri` and
    `sgd-tri` are identical to native on the base. C runs `compute_bb` there
    too (`neatoinit.c:1416`), and the port's recompute is correct for it.
  - The registered per-render resets and the RNG: the issue's evidence (#138's
    reset-skip probe; native `seq:...r...` still prints 1.6854).

## AD-1: recompute the bb after routing only when C does (`Pack >= 0`)

**Context.** Two other shapes were possible: drop the stale beziers before
`compute_bb` (C does not), or add an `update_bb_bz` pass over the new beziers
on the `Pack < 0` path (duplicates `clipAndInstall`, which already grows
`g.info.bb`).

**Decision.** Keep `neatoPack`'s result in `neatoLayout` and guard the
post-routing `computeSubgraphBB` with `pack >= 0`, as
[harness/prototype.diff](harness/prototype.diff) does. The comment above it
cites `neatoinit.c:1416` (`compute_bb` in the `Pack >= 0` branch) and
`neatoinit.c:1431-1436` (the `else` branch, which keeps `spline_edges`' bb).

**Consequences.** The no-free matrix goes from 6/24 to 24/24 identical. One
single-layout output changes on probe inputs, toward native: `mode=KK` with
`ratio=fill` (`kk-ratio`, render 1). No corpus input uses `mode=KK` (0 of 1007
manifest ids), so the smoke bytediff should show no change. `npm test` passes
on the prototype with no test edits (journal row 0). `addClusters` stays
unconditional: that is #283 (AD-3).

## AD-2: tests

**Decision.** Add two no-free cases to `NOFREE_CASES` in
`src/gvc/rerender.test.ts`: `['kk-tri', 'neato']` (the issue) and
`['kk-ratio', 'neato']` (render 1 pins the single-layout change). Their inputs
and the carried oracle's renders come from
[harness/recapture.sh](harness/recapture.sh) into
`src/gvc/__fixtures__/rerender/`, and `regen.sh`'s header gets one line naming
them, as #190 did for `relabel.*`.

**Consequences.** Both cases fail on the base (`kk-tri` renders 2-3,
`kk-ratio` renders 1-3) and pass on the head. The fixtures equal
[harness/native/](harness/native/) byte for byte.

## AD-3: out of scope

- **#283** (filed at planning): under `mode=KK` with no pack, C never calls
  `addCluster` (`neatoinit.c:1428` sits inside `Pack >= 0`), so native draws
  no cluster. The port calls `addClusters` on every path
  (`src/layout/neato/index.ts:221`). It is a separate visible change, so it
  waits for its own mission. No matrix probe has a cluster.
- `addZ`'s order on the `Pack < 0` path (C calls it before `spline_edges`,
  `neatoinit.c:1433`; the port after) is inert: `addZ` writes the `z`
  attribute from `ND_pos[2]`, and `spline_edges` shifts only `[0]` and `[1]`.
- `computeSubgraphBB`'s `refineSplines = true` branch
  (`src/layout/pack/index.ts:121`) has no production caller, and its comment
  says native never re-runs `compute_bb` on a single component, which holds
  only for `Pack < 0`. It is in a file outside the write-set: note it in
  `.agent-notes/issue-193.md`, do not edit it.

## Baseline (Phase 8)

On `670a47d9`: `npm run typecheck` exit 0; `npm test` exit 0, 611 files,
15211 tests. Prototype: see journal row 0.

## Rollback

Reversible: revert the one squashed commit. No data, API or schema change.
Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 fix shape | guard the recompute with `pack >= 0` | clear stale beziers; extra `update_bb_bz` pass | `neatoinit.c:1380-1436`; prototype matrix 24/24 (base 6/24) |
| AD-2 test home | two `NOFREE_CASES` rows + carried fixtures | new test file | `rerender.test.ts` already runs no-free plain fixtures per case |
| AD-3 scope | #283 out; `addZ` order inert; dead `refineSplines` noted only | fix `addClusters` here | separate visible change; no probe reaches it |
