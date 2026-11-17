# T1: port the 16.1.1 no-out-edge guards

## Context

Graphviz 16.1.1 (upstream #2765) guards five reads of `ND_out(v).list[0]` on a
virtual node with no out edge: `straight_len` (`5649d079c`), `cl_bound`
(`f8e3f2100`), `recover_slack` (`f3da7c569`), and `make_regular_edge`'s loop
body and `straight_path` result (`4f9ef1d9e`, `a79e42588`). Read them with
`git -C ~/git/graphviz show -w <sha> -- lib/`, and the 16.1.1 source with the
Read tool at `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c` (`:1708-1888`
`make_regular_edge`, `:2038-2094` `straight_len`/`straight_path`/`recover_slack`,
`:2150-2161` `cl_bound`). `sed` on that tree is denied by the session rules, so
use Read.

[decisions.md](../decisions.md), Background, explains the dead end and what each
side does today. AD-1 and AD-2 say what to port.
[harness/counterfactual.patch](../harness/counterfactual.patch) is the planning
version: the starting point, not the deliverable (no `@see` lines, no tests, and
`straightNext` still in place).

## Steps (TDD)

1. **Red.** Write the AD-3 tests, each asserting a value, never just "does not
   throw":
   - `straightLen` with a stale `list[0]` and `size: 0` returns 0.
   - `maximalBbox` on a VIRTUAL `vn` with no out edge, whose left neighbour is a
     NORMAL node in `vn.info.clust` (a real cluster with a `bb`), returns the
     unclamped `ll.x` (compute both expected values in the test from the inputs).
   - `recoverSlack` (test-only export): the two exits, as AD-3 says.
   - The dead-end close on `2765`: `'lost'` and the orphan at native's values
     ([harness/dead-end-values.txt](../harness/dead-end-values.txt)).

   Run them and journal the failure counts. Each must fail on the base.
2. **Green.** Port AD-2's three guards, then AD-1's close and the three builders.
   Put one `@see` per site naming the upstream sha and the 16.1.1 function, e.g.
   `@see lib/dotgen/dotsplines.c:recover_slack (16.1.1, f3da7c569)`. Update the
   doc comments that say a chain ending at a virtual node is "broken"
   (`routeMultiRankEdgeFaithful`, `entryRunSegments`, `routeBackEdge`). Keep
   every function's structure apart from these sites.
3. **Pin.** Capture native 16.1.1 `-Tplain` for `tests/2765.dot` and
   `tests/2765_1.dot` (oracle preflight first; exit 0 expected). Write
   `src/layout/dot/no-out-edge-2765.test.ts` as `empty-rank-2759.test.ts` is
   written. The header covers the input, what 16.1.0 and 16.1.1 do, that the
   base already equalled native (a pin, not a red test), and why stderr is not
   pinned (#216). Trailing blank lines: compare as `empty-rank-2759.test.ts`
   does.
4. `npx vitest run src/layout/dot` and `npm run typecheck`; journal both.

## Write-set

- `src/layout/dot/edge-route-chain.ts`, `src/layout/dot/edge-route-chain.dead-end.test.ts` (new)
- `src/layout/dot/edge-route-faithful.ts`, and `src/layout/dot/edge-route-faithful.test.ts`
  or a new `src/layout/dot/edge-route-faithful.branch.test.ts` (push-forward)
- `src/layout/dot/splines-route.ts`, `src/layout/dot/splines-route.test.ts`
- `src/layout/dot/no-out-edge-2765.test.ts` (new)

## Read-set

- the 16.1.1 `dotsplines.c` ranges above, and the five upstream commits
- `src/layout/dot/empty-rank-2759.test.ts` (pin pattern),
  `edge-route-faithful.test.ts` (laying a graph out through position)
- `src/layout/dot/fastgr.ts:66-71` (`zapinlist` keeps C's NULL sentinel)

## Acceptance criteria

- Given a node whose `out` has `size` 0 and a stale `list[0]`, when
  `straightLen` runs, then it returns 0.
- Given a VIRTUAL node with no out edge whose neighbour is in the node's own
  cluster, when `maximalBbox` runs, then the box is not clamped to that
  cluster.
- Given `segs` whose first head has no out edge, when `recoverSlack` runs, then
  it stops at that vnode (after a resize, or at once when the box lies above
  it), and later heads keep their coordinates.
- Given `2765` laid out by the port, when its dead-end edge is routed, then the
  result is `'lost'` and the orphan has `x = 5.3425925925925908`,
  `lw = rw = 3.3425925925925908` (1e-9).
- Given `tests/2765.dot` and `tests/2765_1.dot`, when rendered `-Tplain`, then
  the output equals native 16.1.1's capture.

## Interface contracts

None: no signature changes. `recoverSlack` gains `export` for tests only. Say so
in its doc comment, and do not re-export it from `src/index.ts`,
`src/api/index.ts` or `src/render/index.ts`.

## Observability

N/A (library; C prints nothing new here).

## Rollback

Reversible: revert the commit.

## Commit

`fix(T1): handle virtual nodes with no out edge as graphviz 16.1.1 does`, with a
body naming the five upstream shas and `Refs: #161`.
