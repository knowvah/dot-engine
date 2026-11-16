# Decisions: issue #160

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16, base `bd5ddf75`. No issue is `queue:planned`. The lowest
`queue:ready` issue, #159, was found at planning to depend on this one: with its
16.1.1 `ND_other` scan in, the port throws in `dotComputeBb` on the empty rank -1
that abomination makes, the site this issue guards (#159 comment 6930117553). So
`Blocked by #160` was added to #159's body, and #160 (whose one blocker, #147, is
closed) is next. Nobody confirmed these decisions. Each one names the rejected
options and the evidence, so the maintainer can audit it. "cf" below is the
planning counterfactual, the base plus
[harness/counterfactual.patch](harness/counterfactual.patch), which is AD-1.

### AD-1: port the five upstream guards in place, as C has them

- **Decision:** one guard per upstream commit, at the port function that mirrors
  the C site. No new module:
  - `ca3353d80` + `1a77ac9df`, `dotsplines.c:dot_splines_` self-loop `sizey`
    (oracle `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c`, the `r ==
    GD_maxrank(g) || GD_rank(g)[r + 1].v[0] == NULL` block):
    `computeSizey` (`src/layout/dot/self-loop.ts:113`) takes the max-rank branch
    when `r === maxrank` **or** rank `r + 1` has no leader, and the min-rank
    branch when `r === minrank` **or** rank `r - 1` has no leader.
    `sizeyAtMaxrank` (`:85`) uses the rank above only when the existing
    abomShift-adjusted `r > 0` test holds **and** rank `r - 1` has a leader;
    otherwise `ND_ht(n)`. Keep C's `||` short-circuit order: the port's
    `rank[r ± 1]` past the ends is `undefined`.
  - `8e06a6261`, `position.c:dot_compute_bb` (`position.c:885-894`):
    `dotComputeBb` (`src/layout/dot/position-bbox.ts:73`) sets `UR.y` from the
    first rank in `minrank..maxrank` of `root`'s rank array with `n > 0` and a
    leader. `LL.y` stays unguarded, as in C.
  - `9fca64d0f`, `position.c:set_ycoords` (`:793-797`): `setYcoordsInitial`
    (`src/layout/dot/position-ycoords.ts:166`) assigns rank `r`'s leader only
    when rank `r + 1` has a leader; `maxht` is still updated for every `r`.
  - `d49e3a529`, `position.c:make_LR_constraints` (`:240-243`):
    `makeLrRankConstraints` (`src/layout/dot/position-aux.ts:265`) returns at
    once when rank `r` has no leader. C's `continue` becomes `return`, because
    the port split the per-rank body into its own function.
- **"No leader"** is `rank.v[0] == null` (loose equality). The port's empty
  ranks show up both ways: `2759` throws on `null` (`reading 'info'` of null at
  `position-ycoords.ts:178`) and the #159 probe on `undefined` (in
  `dotComputeBb`). C's `v[0] == NULL` covers both.
- **`UR.y` when no rank qualifies:** C leaves it indeterminate. That can't
  happen, because `LL.y` has already read `rank[maxrank].v[0]` and would crash
  first. The port needs an initial value for definite assignment: pick one, and
  say in a comment why it can't be read (push-forward).
- **Why:** CLAUDE.md: port every branch, keep function boundaries and order. The
  oracle source is the spec. Measured on the cf: `2759` and `2759_1` stop
  throwing and equal native 16.1.1 in svg, xdot, plain and cmapx (README,
  Evidence).
- **Rejected:**
  - One shared "first non-empty rank" helper used at every site. The sites
    differ (bb scans forward, sizey tests one neighbour, set_ycoords tests the
    rank below), and C has no such helper.
  - Guarding the `exact_ranksep` re-assign (`position.c:828-830`) and the copy
    loop (`:834-835`) too. C does not guard them; `2761`/`2761_1` crash native
    16.1.1 there (`oracle-crash`, quarantined by #148). Keep the port's throw.

### AD-2: TDD at the function level; one corpus regression test

- **Decision:** each guard gets a red-first branch test in the function's
  existing test file, on a hand-built rank array (the files already build ranks
  that way): `self-loop.branch.test.ts` (empty rank below, empty rank above, max
  rank with empty rank above), `position.test.ts` or a new
  `position-bbox.branch.test.ts` (empty min rank), `position-ycoords.branch.test.ts`
  (empty rank below a non-empty one), `position-aux.branch.test.ts` (`v[0]`
  absent with `n` 0, and `v[0]` null). Then add one corpus regression,
  `src/layout/dot/empty-rank-2759.test.ts`, after `flat-2723.test.ts`: the
  verbatim `tests/2759.dot` and `tests/2759_1.dot`, and the head's `-Tplain`
  equal to native 16.1.1's stdout, captured in T1 with `GVBINDIR=/tmp/ghl1611`.
  Stderr isn't pinned: native prints `deleted from cluster %1` where the port
  prints an empty name (#225). Say so in the file header.
- **Why:** the detector (README, Evidence) lists which guard sites any corpus
  input reaches. The sites no input reaches before #159 lands (the empty min
  rank in `dot_compute_bb`, the empty rank above in `sizey`) can only be tested
  on hand-built ranks. testing.md: tests before code, asserting values.
- **Rejected:** pinning the full stderr (it would pin #225's bug); testing only
  through the corpus (leaves the bb and `sizey` branches unexercised).

### AD-3: how "equals native" is judged

- **Decision:** with [harness/native-compare.sh](harness/native-compare.sh)
  (copied unchanged from #158): plain, xdot and cmapx byte for byte; svg from
  `<g id="graph0"` on; json parsed, keys sorted, numbers at 3 decimals. A json
  root `"name": ""` against native's `"%1"` is #185. A changed job that is not
  equal goes through [harness/toward.mjs](harness/toward.mjs).
- **`2759`, `2759_1` json:** the base threw, so there is no base line to
  predate anything. On the cf, json differs from native by #185's root name
  (one head line) and by the cluster's `_draw_` and `"bb"` (native lines the
  head lacks: a json writer defect from before this mission, reproduced on the
  base with `digraph{ a->b {subgraph cluster{ x }} }`, see
  [harness/followup-json-cluster-bb.md](harness/followup-json-cluster-bb.md)).
  That is exactly the case #230 asks the maintainer to rule on (base threw; the
  head differs only by pre-existing defects). T2 adds these two rows to #230 in
  a comment and does not halt on them. Every other format of both ids must
  equal native.
- **Rejected:** halting on json. #230 already holds the question, and the queue
  rules say a question that blocks part of the work is filed and the rest
  finished.

### AD-4: corpus records and the ledger stay as they are

- **Decision:** no edit to `test/corpus/*` (parity files, accepted-divergence
  lists, the manifest), `docs/known-divergences.md` or the
  `docs-site/*/divergences.md` pages. The #160 comment lists `2759` and `2759_1`
  for the maintainer's survey (they move from port-error to conformant in four
  formats).
- **Why:** as #158 AD-5 and #149 AD-5: verdicts come from the full survey, which
  the queue rules reserve for the maintainer.

### AD-5: scope

- **In:** the five upstream guards (AD-1), their tests (AD-2), the json
  follow-up filed in T2, the #230 comment.
- **Out:** #159 (it lands next; its scan is what makes the empty min rank and
  the empty rank above reachable); #225 (the warning's cluster name); #185;
  #199; the json cluster defect (filed, not fixed); `2761`/`2761_1` (native
  crashes).

## Baseline

See README, "Baseline (Phase 8)". Measured at planning on `bd5ddf75`.

## Rollback

Reversible: revert the squashed commit. No data, API or format contract
changes. The four functions are internal (exported for tests only, not from
`.`, `./api` or `./render`). The only behaviour change is on inputs that threw
`InternalError` before.

## Operational readiness (auto-confirmed)

Observability N/A: a library, and C prints nothing on these paths (the `#ifdef
DEBUG` line in `set_ycoords` is not compiled in). No API, schema or format
change. Load envelope: one null check per rank per site, plus the bb scan, which
stops at the first non-empty rank.
