# Decisions: issue #188

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `cf38d077`.

## AD-1: remove `EdgeInfo.lost`; keep every writer's control flow

**Context.** `lost` has no C counterpart. Its one reader is
`routeLoneEdge`'s skip. The skip guarded against the post-loop backstop,
and part 11 T8 removed that. C's `dot_splines_` routes each collected entry
once. The port's loop also offers each original to `routeLoneEdge` at most
once per pass ([harness/survey.md](harness/survey.md#why-the-skip-cannot-fire)).

**Decision.** Delete the field and its doc, the `lost: undefined` slot in
`makeEdgeInfo`'s pre-declared keys, the clear in `beginRoutingPass` with
its doc sentence, the skip's `|| e.info.lost === true` term with its
comment, and the seven assignments. Each writer returns what it returns
today: `true`, `0` or a bare `return`, so the edge stays consumed with no
spline, as C leaves it. Where a comment justifies the assignment ("so the
backstop sweep does not re-route", "its `lost` skip keeps a later call
from…", "no later group may re-attempt"), it goes. A one-line C reference
stays: `make_regular_edge` (pn == 0 return) or `make_flat_labeled_edge`.

**Rejected.**

- (A) Keep the field and pin it with a fixture, as the issue's first option
  offers. No fixture reaches the skip: 0 fires over 1184 + 35 inputs,
  including `c1`-`c4`, built to take path 2. The collection argument says
  none can. A test cannot pin a path no input takes.
- (B) Keep it as a defensive guard with better comments. It is port-only
  state with no reader that ever runs. CLAUDE.md's YAGNI rule and
  `code-principles.md` ("no guards for states that cannot occur", with the
  proof stated in survey.md) both argue against it.
- (C) Replace the skip with a throw on "lost edge offered again". That adds
  a port throw site with no C counterpart, and
  `test/corpus/failure-sites.test.ts` keys its rows on port throws. It
  would also turn a hypothetical extra warning into a crash.

**Consequences.** The prototype was byte-identical to base on 105 of 105
jobs, stdout and stderr, in dot, xdot and svg. `npm test` passed with two
assertions removed (AD-2). Each touched function gets shorter, so no
complexity budget is at risk.

## AD-2: tests

**Decision.**

- `edge-route-chain.dead-end.test.ts:164,225`: delete the two
  `e.info.lost` assertions and the comments that introduce them ("Only the
  merged edge is routed, so only it is marked lost"; "As on 2765: …"). The
  `spl` assertions next to them, and the native-plain equality, already pin
  what C does: no spline on either edge.
- `routing-failure-once.test.ts`: the header says "The port's routers must
  skip edges whose routing already failed". Reword it to C's contract (one
  `make_regular_edge` per group, so one report per failing group). Keep
  every existing case and expectation; #278 covers the 2796 case's
  provenance.
- **New case** in the same file: `tests/graphs/structs.gv`, copied to
  `src/layout/dot/__fixtures__/` with a provenance comment. It goes through
  the side-port writer, which no case covers. Expected values are the
  carried 16.1.1 oracle's (`harness/native/s1-structs-sideport-lost.stderr`):
  1 failure, lost `['struct1 struct3']`. The header names both oracles (the
  old cases' 16.1.0, this case's carried 16.1.1).

**Rejected.** A test asserting that `EdgeInfo` has no `lost` key. It tests
the type, not behaviour, and typecheck already enforces it.

## AD-3: scope

- **In:** the field, its writes, its clear, its reader, the comments and
  agent notes that describe them, and the tests in AD-2.
- **Out:** #278. Also out: the `'lost'` return value of the faithful
  routers (`routeRegularEdgeFaithful`, `routeMultiRankEdgeFaithful`,
  `baseSplineForGroup`). It is a routing outcome that the callers branch
  on, not the flag.
- **Kept as is:** `routeParallelEdgeGroup` and `routeEntryRun` neither read
  nor write any "already routed" state. That is today's behaviour, and
  nothing here changes it.

## Baseline

`cf38d077`: `npm run typecheck` exit 0 and `npm test` green (journal row 0).

## Rollback

**Reversible.** Revert the one squashed commit. No data, API shape or
dependency changes. No entry point (`src/index.ts`, `src/api/index.ts`,
`src/render/index.ts`) names `EdgeInfo`. The `Graph` type is exported, and
the emitted `.d.ts` reaches `EdgeInfo` through it, but `src/api/index.ts:16-19`
(ADR-1) defines that type as an opaque handle whose internals are not API.
So dropping an optional, port-only field is not a contract change. Checked
at planning.

## Irreversible changes

None.

## Auto-confirmed (unattended)

The issue asked the maintainer to choose. The project's instructions do not
reserve the choice: no signed ruling is involved and no divergence is
added. The removal changes no output (105/105). So planning chose, and
recorded it here.

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 | remove the field, keep control flow | keep and pin (A), keep as guard (B), throw (C) | marker 0 skips over 1184 (#137) + 35 inputs; collection argument (survey.md); prototype 105/105 identical, `npm test` 608/15191 |
| AD-2 | drop the field assertions; add the `s1` side-port case | type-shape test | `s1` native stderr equals the port's; the side-port writer is unpinned |
| AD-3 | #278 and the `'lost'` return values out | widen scope | #278 reproduces with or without the field |
