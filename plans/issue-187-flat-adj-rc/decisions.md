# Decisions: issue #187

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `98aa9373`.

## AD-1: the failure travels as return codes on C's path

**Context.** C carries the aux failure as an `int` return value:
`make_flat_adj_edges` → `make_flat_edge` → `dot_splines_` → `dotLayout`
(`~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:1211-1240`, `:1535-1536`,
`:418-424`; `dotinit.c`). In the port, the flat edge reaches its router
through a chain of port-only functions: `dispatchEdgeGroup` →
`routeLoneEdge` → `routeOneEdge` → `routeForwardEdge`/`routeEdgeNonForward`
→ `routeFlatEdge` → `routeFaithfulSidePort` → `makeFlatAdjEdges`.

**Decision.** Every function on that chain returns the rc. `routeLoneEdge`
and `routeOneEdge` return `number`, with `0` on every path that cannot fail.
`dispatchEdgeGroup` and `routeEdgeGroup` return the rc. `routeEdgeGroups`
returns `{ rc, runOrigs }` and stops at the first non-zero rc. `dotSplines_`
returns it.

**Rejected.**

- (A) A pass-scoped failure slot, set by the flat router and checked by the
  group loop (on `GroupRouteCtx` or `g.info`). It touches fewer signatures,
  but it is hidden state with no C counterpart, and a missed check would
  quietly route on.
- (B) Throwing a private sentinel and catching it in `dotSplines_`. C has no
  unwinding here. The failure-site registry's fitness test
  (`test/corpus/failure-sites.test.ts`) keys rows on port throws, and a
  thrown value would also skip code that runs between the throw and the
  catch.

**Consequences.** The prototype changes no output on the 90 reach jobs, and
`npm test` passes unedited.

## AD-2: flat routers return `number | null`; `null` is the port's decline

**Context.** "Declined" is a port idea. The port tries several flat routers
in turn, and C has one `make_flat_edge`. A boolean cannot tell declined from
failed.

**Decision.** `routeFlatEdge` and `routeFaithfulSidePort` return
`number | null`: `null` means declined (the caller tries the next router,
then the regular or fitter path), `0` means consumed, and a non-zero value
is C's rc, returned unchanged. Routers that cannot fail
(`makeFlatLabeledEdge`, `makeAdjFlatNoPortEdge`,
`routeFlatEdgeGroupFaithful`, `routeRegularEdgeFaithful`) keep their
signatures. Their callers map them to `0`/`null`.

**Rejected.** A three-member enum or object result. It is more code than C's
`int` for no gain, since `0`/non-zero already is C's contract.

## AD-3: `makeFlatAdjEdges` returns C's values and stops where C stops

**Decision.** Return `dotMincross`'s result, then `dotPosition`'s, then the
aux `dotSplines_`'s, each non-zero one at once. On failure, skip
`repositionFlatAux`, `dotSameports`, `gvPostprocess`, `copyFlatSplines` and
`cleanupCloneGraph`, as C skips all of them. The aux graph is garbage. C
leaks it, and its attribute-symbol globals stay pointed at it. The port has
no such globals: `cleanupCloneGraph` only clears the aux graph's own maps.

**Not decided here.** C's `cleanupCloneGraph` also restores `State`, and on
failure that restore is skipped. That belongs to #275, with the
`State >= GVSPLINES` gate it feeds.

## AD-4: `dotSplines_` returns before every post-loop step

**Decision.** On a non-zero rc from `routeEdgeGroups`, return it before
`normalizeRunOrigs` and `finalizeSplines`. C skips vnode label placement,
`edge_normalize`, port labels, `State = GVSPLINES` and
`EdgeLabelsDone = 1` (`dotsplines.c:427-484`). The callers stay unchanged:
`dotPhasePostNoFinish` (`src/layout/dot/index.ts:161-173`) already returns
the rc, skipping compound edges, and `dotPhasePost` skips `gvPostprocess`.
The ortho maze failure (`tests/2784.dot`) already takes this path.

**Evidence.** Probes `p1`, `p4`, `p5`, `p6`, `p9`..`p12` equal native in dot
and xdot on the prototype. That includes `p10`'s `compound=true` and the
untranslated `bb` (`-27,0,99,…`).

## AD-5: scope

- **In:** the chain in AD-1 to AD-4, and tests.
- **Out, filed at planning:** #274 (`Edge length` number), #275 (`State`
  gating, native xdot segfault on `p7`), #276 (reclaim warning).
- **Kept as is:** `routeFlatEdge`'s second `routeFaithfulSidePort` call. When
  the first returns `null` (declined, not failed), the second can run the aux
  pipeline again. That is today's behaviour, and no probe shows it.
- **Unreached:** the aux `dotMincross` failure, and a non-zero aux
  `dotSplines_` (the aux graph is never ortho, as #137 row 13 showed). Both
  are propagated, because C propagates them.

## Baseline

`98aa9373`: `npm run typecheck` exit 0 and `npm test` green (journal row 0).

## Rollback

**Reversible.** Revert the one squashed commit. No data, API shape or
dependency changes. Output changes only on inputs whose flat-adjacent aux
layout fails, and there it moves to native's.

## Irreversible changes

None.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 | return codes on the chain | failure slot (A), thrown sentinel (B) | prototype: 36-row probe TSV, 90/90 reach jobs, `npm test` unedited |
| AD-2 | `number \| null` | enum/object result | C's `int` contract |
| AD-3 | stop where C stops, no cleanup | cleanup on failure | `dotsplines.c:1211-1240` |
| AD-4 | return before post-loop | finalize anyway | `dotsplines.c:418-424`; probes `p4` (later edge unrouted) and `p10` (`compound=true`) equal native with it |
| AD-5 | #274-#276 out | widen scope | each reproduces apart from the rc path |
