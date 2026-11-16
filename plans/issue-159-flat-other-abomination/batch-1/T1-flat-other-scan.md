# T1: flat_edges' ND_other scan, its gate, and C's self-loop adjacency

## Context

Graphviz 16.1.1 (`4e50c9abd`, gitlab #2756) made `flat_edges`' abomination
check also scan `ND_other` for a labelled non-adjacent edge on rank 0
(`~/git/graphviz-16.1.1/lib/dotgen/flat.c:257-292`; read the change with
`git -C ~/git/graphviz show -w 4e50c9abd -- lib/`). The port scans only
`flat_out` and dropped C's gate. [decisions.md](../decisions.md) AD-1 to AD-3
say what changes and why; [harness/counterfactual.patch](../harness/counterfactual.patch)
is the planning version: the starting point, not the deliverable (no `@see`
lines, no tests, and the stale AD-1 note at `flat.ts:415-423` still there).

## Steps (TDD)

1. **Red.** Add or change these cases, each asserting a value (never only "does
   not throw"). Run them on the base code and journal the failure count.
   - `flat.branch.test.ts`, `checkFlatAdjacent`: a self-loop (one node, order 0)
     whose `to_virt` is another self-loop: neither gets `adjacent` (base: both
     get 1).
   - `rankHasNonAdjacentLabel`: true for a labelled non-adjacent edge in a
     node's `flat_in`; true for one in `other` (a self-loop, and a cross-rank
     edge: C has no filter); false when the only labelled non-adjacent edge is
     in `flat_out` alone (C reads `flat_in`; replace the existing `flat_out`
     "returns true" case, which pinned the port-only read).
   - `needsAbomination`: false with a labelled non-adjacent edge when
     `rank[mn].flat` is undefined and `n_cluster` is 0 or absent; true with
     `rank[mn].flat` set; true with `n_cluster: 1` and no matrix. Update the
     existing "returns true" case to set one of the two.
   - `mincross.branch.test.ts`, `cleanup2Ranks`: the matrix set before the call
     is still the same object after it (rename the "clears rank.flat" case).
2. **Green.** Make the AD-1 to AD-3 edits in `flat.ts` and `mincross.ts`. Each
   changed function carries an `@see` with the 16.1.1 line (e.g.
   `@see lib/dotgen/flat.c:flat_edges (16.1.1, 4e50c9abd) 274-291`). Replace the
   AD-1 note above `needsAbomination` with one that states C's gate and why the
   matrix survives cleanup2 (`mincross.c:415-420`, `:864`). On `cleanup2Ranks`,
   say why the field is kept. Edit no other function.
3. **Regression.** Capture native 16.1.1 `-Tplain` for `harness/probe-a.gv`,
   `probe-b.gv`, `probe-c.gv`, `tests/2756.dot`, `tests/2756_1.dot`
   (`GVBINDIR=/tmp/ghl1611`, oracle preflight first; `probe-c.gv` exits 1 with
   the `routesplines` and `lost a b edge` lines, the others exit 0). Write
   `src/layout/dot/flat-other-label.test.ts` in the pattern of
   `flat-2723.test.ts`: verbatim sources, captures, a header saying what each
   input reaches (a: gate open by a cluster, empty rank -1; b: gate closed;
   c: unlabelled flat rep with a labelled `other` edge, a label vnode on the new
   rank; 2756/2756_1: upstream's inputs) and why stderr is not pinned (#229).
   Check on a `git archive <base>` tree under `$TMPDIR` that `probe-c.gv` fails
   there, and journal it.
4. `npx vitest run src/layout/dot` and `npm run typecheck`; journal both.

## Write-set

- `src/layout/dot/flat.ts`, `src/layout/dot/flat.branch.test.ts`
- `src/layout/dot/mincross.ts`, `src/layout/dot/mincross.branch.test.ts`
- `src/layout/dot/flat-other-label.test.ts` (new)

## Read-set

- `~/git/graphviz-16.1.1/lib/dotgen/flat.c:209-292`, `mincross.c:415-420`,
  `:832-865`, `:1092-1110`, `dotsplines.c:350-376`
- `src/layout/dot/flat.ts:355-430`, `src/layout/dot/mincross.ts:240-253`
- `src/layout/dot/splines-groups.ts:43-60` (the reader AD-3 changes)
- `src/layout/dot/flat-2723.test.ts` (regression pattern)

## Acceptance criteria

- Given a self-loop edge, when `checkFlatAdjacent` runs, then neither it nor its
  `to_virt` chain gets `adjacent`.
- Given rank `mn` with a labelled non-adjacent edge only in a node's `other`,
  when `needsAbomination` runs with `rank[mn].flat` set or `n_cluster > 0`, then
  it returns true; with neither, false.
- Given a rank whose matrix was set by mincross, when `cleanup2Ranks` runs, then
  `rank.flat` is unchanged.
- Given the five regression inputs, when rendered `-Tplain`, then each equals
  its native 16.1.1 capture byte for byte; `probe-c.gv` throws on the base.

## Interface contracts

None: no exported signature changes. A private helper in `flat.ts` (the cf's
`hasNonAdjacentLabel`) is fine unexported.

## Observability

N/A (library; C prints nothing here).

## Rollback

Reversible: revert the commit.

## Commit

`fix(T1): scan nd_other for flat_edges' abomination as 16.1.1 does`, with a
body naming `4e50c9abd` and `Refs: #159`.
