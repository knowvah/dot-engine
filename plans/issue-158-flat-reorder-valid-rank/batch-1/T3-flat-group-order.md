# T3: route a non-adjacent flat group in edgecmp (seq) order

## Context

`dot_splines_` sorts every edge with `edgecmp` and hands `make_flat_edge` one
run; edge `i` of the run gets the `(i+1)`-th route out from the nodes
(`~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:330-419`, `:543-640`,
`:1574-1617`). Inside a run every `edgecmp` key but the last is equal, so the
run is in `AGSEQ` order. The port collects the group per node pair and sorts it
"tail is the left node first, then seq" (`src/layout/dot/splines-flat-multi.ts:109`).
After T1 the two rules disagree on `700813`. See
[AD-4](../decisions.md#ad-4-a-non-adjacent-flat-group-is-routed-in-edgecmp-order-seq-not-left-tail-first).

## Task (TDD)

1. **Red.** Add a describe block to `src/layout/dot/splines-flat-multi.test.ts`
   (its cases compare with native the same way) that renders
   `tests/700813.dot`'s source (inline it, with its comments dropped) `-Tplain`
   and compares the two flat-edge lines (`edge B C …`, `edge C B …`) with native
   16.1.1's, captured at execution start (`GVBINDIR=/tmp/ghl1611`, after
   `oraclePreflight`). Planning's native lines are in README, Evidence. Also
   assert the whole plain output equals native. Journal the failure (T1 must be
   in: before T1 both rules agree on this input).
2. **Green.** Sort by `a.seq - b.seq` only. Update the function's doc comment:
   the group is in `edgecmp` order, which within one run reduces to `AGSEQ`;
   cite `dotsplines.c:edgecmp` and nonadjacent-flat-multi AD-3's "follow C".
   `flatPortKey`/`lo` stay: they key the port match, not the order.
3. **Reach.** The planning detector flagged `P158SORT` on `700813` only, and
   only with AD-1 in (none on the base): T3 is expected to change that id
   alone. It is in the T4 survey list.
4. Run the file and `npx vitest run src/layout/dot`; journal; commit
   (`fix(T3): ...`).

## Write-set

- `src/layout/dot/splines-flat-multi.ts` (the sort line and the doc comment of
  `collectNonAdjacentFlatGroup`)
- `src/layout/dot/splines-flat-multi.test.ts`
- `plans/issue-158-flat-reorder-valid-rank/decision-journal.md`

## Read-set

- `src/layout/dot/splines-flat-multi.ts:1-230`
- `src/layout/dot/edge-route.ts:370-425` (the two callers)
- `src/layout/dot/splines.ts:194-300` (the port's `edgecmp`)
- `plans/nonadjacent-flat-multi/decisions.md` (AD-3)

## Interface contracts

None: `collectNonAdjacentFlatGroup(e, g): Edge[]` keeps its signature;
`routeFlatEdgeGroupFaithful` already forward-normalizes a lead whose tail is the
right node (`:173-186`).

## Acceptance criteria

- Given `700813` with T1 in, when rendered `-Tplain`, then the output equals
  native 16.1.1 byte for byte.
- Given every `P158SORT` id, when compared with native in T4, then each changed
  job equals native or meets the queue rules' toward-native exception.
- Given a group whose lowest-seq edge already has its tail on the left, when
  routed, then the order is unchanged (existing flat tests stay green).

## Observability

N/A.

## Rollback

Reversible with the squashed commit.
