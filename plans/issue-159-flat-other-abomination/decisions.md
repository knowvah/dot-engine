# Decisions: issue #159

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16, base `d6636b15`. No issue is `queue:planned`. #159 is the lowest
`queue:ready` issue; its blockers are #147 (closed) and #160 (`queue:on-branch`).
Nobody confirmed these decisions. Each one names the rejected options and the
evidence, so the maintainer can audit it. "cf" below is the planning
counterfactual, the base plus
[harness/counterfactual.patch](harness/counterfactual.patch) (AD-1 to AD-3
together). Native = graphviz 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8`
present).

The C being ported (`~/git/graphviz-16.1.1/lib/dotgen/flat.c:257-292`, upstream
`4e50c9abd`, gitlab #2756):

```c
for (n = GD_nlist(g); n; n = ND_next(n)) {        /* mark adjacency */
    for e in ND_flat_out(n): checkFlatAdjacent(e);
    for e in ND_other(n): if (ND_rank(aghead(e)) == ND_rank(agtail(e)))
                              checkFlatAdjacent(e);
}
if (GD_rank(g)[0].flat || GD_n_cluster(g) > 0) {   /* the gate */
    for n in GD_rank(g)[0].v until found:
        for e in ND_flat_in(n): if (ED_label(e) && !ED_adjacent(e)) abomination
        for e in ND_other(n):   if (ED_label(e) && !ED_adjacent(e)) abomination  /* new */
}
```

### AD-1: the gate is C's, with `rank.flat` kept after mincross

- **Decision:** `needsAbomination` (`src/layout/dot/flat.ts:424`) returns false
  unless `rank[mn].flat !== undefined || (g.info.n_cluster ?? 0) > 0`, then scans.
  `cleanup2Ranks` (`src/layout/dot/mincross.ts:241-253`) stops clearing
  `rank[r].flat`.
- **Why:** C's `cleanup2` calls `free_matrix(GD_rank(g)[r].flat)`
  (`mincross.c:864`) and `free_matrix` (`mincross.c:415-420`) frees without
  nulling the field. So at `flat_edges` the pointer is non-null exactly when some
  `flat_breakcycles(root)` run (`mincross.c:1092-1106`, pass 0 of each
  component) saw a rank-0 node with a flat out-edge, FLATORDER edges included.
  The port's clear (from the first mincross port, `983f8328`, no stated reason)
  is why the existing AD-1 note at `flat.ts:415-423` calls the matrix
  "unreliable at position-time" and dropped the gate. The flat-out scan did not
  need it; the `ND_other` scan does: `probe-b.gv` (labelled self-loop on rank 0,
  no cluster, no flat edge) throws with the scan and no gate (#159 comment), and
  equals native on the cf.
- **Matrix readers after cleanup2:** only `needsAbomination` (grep of `\.flat\b`
  in `src/`: `mincross-cross.ts:90` `left2right` and `mincross-flat.ts:101-108`
  run during mincross only; a relayout builds fresh rank entries,
  `mincross-build.ts:49`).
- **Rejected:**
  - A separate boolean (`flatSeen`) set in `flatBreakcyclesRank`. That is new
    state C does not have.
  - Recomputing the gate at `flat_edges` from the current `flat_out`. Not C's
    value: FLATORDER edges are deleted in cleanup2, and the matrix reflects each
    component's pass-0 view.
  - Keeping the gate dropped (the old AD-1). `probe-b.gv` throws.

### AD-2: scan `flat_in` and `ND_other` per rank-0 node, as C does

- **Decision:** `rankHasNonAdjacentLabel` (`flat.ts:404`) walks the rank's nodes
  and, per node, checks `flat_in` and then `other` for a labelled edge with
  `!adjacent`. No rank filter and no self-loop filter on `other` (C has none).
  The port's `flat_out` read becomes C's `flat_in`.
- **Why:** C reads `ND_flat_in` and `ND_other` (`flat.c:276-289`). Every flat
  edge has both ends on its rank, so over a whole rank `flat_in` and `flat_out`
  hold the same edges and the boolean cannot differ; the planning detector
  confirms it (`P159INOUT` never fired, README Evidence). Reading what C reads
  keeps that true without the argument.
- **Rejected:** keeping `flat_out` (equivalent today, one more port-only
  argument to maintain); filtering `other` by rank or loop (C does not).

### AD-3: a self-loop is never flat-adjacent, as in C

- **Decision:** `checkFlatAdjacent` (`flat.ts:361`) returns without marking when
  `hi <= lo`. Otherwise it is unchanged (`hasInterveningNode`, then mark the
  `to_virt` chain).
- **Why:** C's loop `for (i = lo + 1; i < hi; i++)` ends with `i == lo + 1` when
  `lo == hi`, so `i == hi` is false and a self-loop is never marked
  (`flat.c:224-236`; `:234` and `:317` are the only writes to `ED_adjacent`).
  The port's `hi - lo <= 1` marks every self-loop and its `to_virt` chain. With
  AD-2's unfiltered `other` scan, the port would then miss every labelled
  rank-0 self-loop that C counts (`probe-a.gv`).
- **Readers of `.adjacent` checked** (`grep -rn '\.adjacent' src`):
  - `splines-groups.ts:53` `groupSize`: C's `dot_splines_` group loop
    (`dotsplines.c:366`) runs over self-loops too. With adjacent = 1 the port
    groups every loop of a node into one `makeSelfEdge` call; C breaks the group
    on `portcmp`. This is the one reader that changes output: `probe-e.gv` goes
    from 14 to 4 diff lines against native, `probe-d.gv` from 8 to 6 (README
    Evidence; AD-6 for the rest).
  - `splines-flat-labeled.ts:114,190`, `splines-flat.ts:410`: flat routers;
    `dispatchEdgeGroup` (`splines-groups.ts:103`) sends loops to
    `routeSelfEdgeGroup` first, so they never see a loop.
  - `edge-route-rank.ts:169` `staleAdjacent`: relayout only, and its `samePair`
    test on a loop resolves to the loop's own chain.
  - `flat.ts:455,468-470`: `processOtherLabel` skips loops (`flat.c:314`);
    `processFlatOutLabel` never sees one.
- **Rejected:** a loop filter inside the scan only (keeps the port's wrong
  adjacency and its wrong self-loop grouping; not C).

### AD-4: abomination's renumbering stays as it is

- **Decision:** no change to `abomination` (`flat.ts:293`, the old AD-2
  insert-rank-at-index-0 scheme).
- **Why:** the issue asks whether the scheme still maps to C's rank -1. With
  this change abomination also fires when nothing goes onto the new rank (a
  labelled self-loop: `processOtherLabel` skips loops, so no `flat_node`). The
  port then has an empty rank 0 above every other rank, as C has an empty
  rank -1. #160's guards handle that rank (`dotComputeBb`, the self-loop `sizey`).
  Measured: `probe-a.gv` and `probe-h.gv` (`ranksep="0.5 equally"`) equal native
  on the cf, and `2723` (abomination with a label vnode) is unchanged.
- **Rejected:** skipping abomination when no vnode will be placed (C does not).

### AD-5: TDD at the function level, one regression file

- Red-first branch tests in `flat.branch.test.ts` (gate both ways, the
  `flat_in`/`other` scan, a labelled self-loop in `other`, a self-loop never
  adjacent) and `mincross.branch.test.ts` (cleanup2 keeps `rank.flat`).
- `src/layout/dot/flat-other-label.test.ts` (new): `probe-a.gv`, `probe-b.gv`,
  `probe-c.gv`, `tests/2756.dot`, `tests/2756_1.dot` rendered `-Tplain`, equal
  to native 16.1.1 captures. `probe-c.gv` throws on the base (`reading 'v'`).
  Stderr is not pinned: native prints a `routesplines` line on `probe-c.gv`
  that the port lacks (#229).

### AD-6: how "equals native" is judged

- Gates 5 and 6 use the queue rules' two exceptions. The self-loop grouping
  change can leave a row closer to native but not equal (`probe-d.gv`: one
  loop moves onto native's line, two change and still differ). That is a
  pre-existing defect in routing a node's loops that sit in different `portcmp`
  groups: `probe-g5.gv` (`a -> a:s [label]; a -> a`) differs from native by 4
  lines on the base and on the cf alike, with no grouping change.
- A changed row passes gate 5/6 only under the queue rules (equal to native, or
  every changed line equal to native's). A row like `probe-d.gv` on a smoke or
  survey id is a stop (README stop condition 5). At planning no corpus id can
  show one: the `P159GROUP` marker never fired over the 965 ids that finished
  (README Evidence).
- The `g5` residual is filed as a follow-up in T2 (`harness/followup-selfloop-ports.md`).

### AD-7: scope

- **In:** AD-1 to AD-5 and the follow-up.
- **Out:** the `g5` self-loop routing defect (follow-up), #229 (stderr), #185
  (json root name), #225, corpus records and the ledger (the maintainer's survey
  over the queue branch updates them).

## Rollback

Reversible: revert the squashed commit. No data, API or format change.

## Readiness

Library code: no SLIs, alerts, traces or dashboards. No flag. No on-call
surface. Backwards compatible: only layouts change, toward native.
