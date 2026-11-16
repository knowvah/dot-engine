# Decisions: issue #161

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16, base `c55b4c66`. No issue is `queue:planned`. #161 is the
lowest-numbered `queue:ready` issue, and its one blocker, #147, is closed.
Nobody confirmed these decisions. Each one names the rejected options and the
evidence, so the maintainer can audit it. "cf" below is the planning
counterfactual: the base plus [harness/counterfactual.patch](harness/counterfactual.patch),
which is AD-1 plus AD-2.

### Background: what a dead end is, and what each side does today

On `2765`/`2765_1` (`concentrate=true`, record ports that do not exist), the
edge `Ho0er0tra0eTo0top -> Ho0er0est` (ranks 0 to 2) is held in `ND_other`.
Its `ED_to_virt` chain leads to a virtual node on rank 1 with no in edge and no
out edge (it is not in rank 1's `v[0..n)` either: `order` 2, `n` 2).
Concentration orphaned that node. C's `make_regular_edge` takes the hackflag
branch for the edge, and `fwdedgea`'s head is that orphan
(`dotsplines.c:1745-1748`). Graphviz 16.1.0 then read `ND_out(hn).list[0]`
(NULL) and crashed.

- **Native 16.1.1** (instrumented, [harness/detector-native.patch](harness/detector-native.patch)):
  `straight_len(hn)` returns 0 on the empty list (`5649d079c`). The loop body's
  `ND_out(hn).size > 0` guard fails (`4f9ef1d9e`), so the path is closed at the
  orphan. `maximal_bbox(hn, e, NULL)` runs `cl_bound` on a VIRTUAL node with no
  out edge, which takes the NORMAL branch (`f8e3f2100`). Then `endpath`,
  `completeregularpath` and `routesplines` run (4 points). `straight_path(NULL,
  0)` returns NULL. `recover_slack` resizes the orphan and stops at it
  (`f3da7c569`, the second exit), and `make_regular_edge` returns with no spline
  (`a79e42588`). All five markers fire once on each id, and nowhere else in the
  corpus (README, Evidence).
- **Port (base):** `chainSegments` (`src/layout/dot/edge-route-chain.ts:62-77`)
  stops at the orphan. `routeMultiRankEdgeFaithful` (`:328`) sees that the chain
  does not reach `e.head` and returns `null`. `routeFaithfulMultiRank` returns
  false, and the edge stays unsplined. So the drawing already equals native in
  every format (#148), but none of 16.1.1's dead-end work runs: no discarded
  route, no `recover_slack` resize of the dead chain's vnodes, and the edge is not
  marked consumed.

### AD-1: port 16.1.1's dead-end close in the shared chain walker

- **Decision:** a chain that ends at a VIRTUAL, non-merge node with no out edge
  (`isChainDeadEnd`) is routed to that node, as C routes it, and then dropped:
  - `routeChainSegmented` (`edge-route-chain.ts:209`): the loop body continues
    only when `(!smode || si) && nodeOutSize(head) > 0` (`4f9ef1d9e`).
    Otherwise, with `(!smode || si)` true (the dead end), close the path:
    `endSeg(w, ei === 0 ? beginEdge : segs[ei], segs[ei], undefined, true)`.
    That is C's `maximal_bbox(hn, e, ND_out(hn).list[0] = NULL)`, then `endpath`
    on C's current `e`, then `P->end` constrained. On a route failure return
    `null`, as C's `pn == 0` return does. Otherwise run
    `recoverSlack(segs.slice(segFirst), w.P)` and return `null`: C's
    `straight_path(NULL, 0)` gives no edge, and `make_regular_edge` returns
    before any `clip_and_install` (`a79e42588`). The `smode && !si` close stays
    `closeSmodeSeg`. At a dead end `sl` is always 0, because `straight_len(hn)`
    is 0 and smode is never entered there. Say so in a comment.
  - The three segment builders accept a dead end where they now decline:
    `routeMultiRankEdgeFaithful` (`:328`, tip `!== e.head`), `routeBackEdge`
    (`:478`, tip `!== e.tail`) and `entryRunSegments` (`:352`, `nxt ===
    undefined` becomes the end of the run, C's loop exit at `hn`). A chain that
    ends anywhere else is still declined as today.
  - Callers need no change: `null` from `routeChainSegmented` is already
    `'lost'` (`routeMultiRankEdgeFaithful`) or `e.info.lost = true`
    (`routeBackEdge`). That is C's "edge never routed again".
- **Why:** CLAUDE.md says to port every branch and not reorder side effects.
  16.1.1's dead end has two effects the base skips. First, `recover_slack`
  moves the dead chain's vnodes, which later edges read through `maximal_bbox`
  and `neighbor`. Second, the discarded route can print routing warnings. On
  the cf the port's discarded route equals native's bit for bit: the same 4
  points (`92.25,145.5 92.25,98.983707885314345 2.0000000000000027,139.01629211468565
  2,92.5`), and the same resized orphan (`x = 5.3425925925925908`,
  `lw = rw = 3.3425925925925908`; on the base it keeps `x = 2`, `lw = rw = 19`).
  [harness/dead-end-values.txt](harness/dead-end-values.txt) has both captures.
- **Rejected:**
  - Keep the base's decline and port only the three function-local guards
    (AD-2). The drawing is the same on the corpus, but it leaves out a C branch
    whose side effects (vnode resize, warnings) the port would then never
    reproduce on a dead end that runs through ranked vnodes.
  - Rewrite the port's walk as C's pointer walk (`ND_out(hn).list[0]` per
    step, no prebuilt `segs`). That is a larger restructure of working code,
    beyond #161.

### AD-2: the three function-local guards, in place

- **Decision:**
  - `straightLen` (`src/layout/dot/splines-route.ts:99`): loop `while
    (nodeOutSize(v) > 0)` and step through `v.info.out!.list[0].head`, as C's
    `5649d079c` does. The base steps through `straightNext` (`list[0]` present).
    That is equal only while every removal keeps C's NULL sentinel
    (`zapinlist`, `src/layout/dot/fastgr.ts:66-71`). `straightNext` then has no
    caller. Remove it, if `rg`/LSP finds no other reference.
  - `endpointClusters` (`src/layout/dot/edge-route-faithful.ts:95-99`, the
    `tcl`/`hcl` half of `cl_bound`): `nodeType(n) === NORMAL ||
    nodeOutSize(n) === 0` gives `[n.info.clust, n.info.clust]` (`f8e3f2100`).
    The base gives `[undefined, undefined]` for a VIRTUAL node with no out edge,
    so any real cluster of a neighbour counts as interfering and clamps the box.
  - `recoverSlack` (`edge-route-chain.ts:397`): C's two exits (`f3da7c569`).
    When the box lies above the vnode (`ur.y < y`), break if the vnode has no out
    edge, else continue. After a resize, break if it has no out edge.
- **Why:** these are the C sites, at the port functions that mirror them.
  `cl_bound`'s `adj` half still dereferences `ND_out(adj).list[0]` unguarded in
  16.1.1, so it stays as the port has it (out of scope, AD-5).
- **Rejected:** folding the guards into a "has out edge" helper shared with
  AD-1. The sites test different things (a loop condition, a branch, two
  exits), and C has no such helper.

### AD-3: TDD; the red tests and one corpus pin

- **Decision:** each guard gets a red-first test that asserts values:
  - `splines-route.test.ts`: `straightLen` on a node whose `out` is `{ size: 0,
    list: [staleEdge] }` returns 0. The base follows the stale `list[0]` and
    counts.
  - `edge-route-faithful.test.ts` (or a new `edge-route-faithful.branch.test.ts`,
    push-forward): `maximalBbox` on a VIRTUAL `vn` with no out edge, whose left
    neighbour is a NORMAL node in a real cluster equal to `vn.info.clust`, gives
    the unclamped `ll.x`. The base clamps it to `bb.ur.x + splinesep`.
  - `recoverSlack`: export it for tests only (not from `.`, `./api` or
    `./render`) and test it in `edge-route-chain.dead-end.test.ts`. `segs`
    `[s0, s1]`, where `s0.head` is VIRTUAL with no out edge: after a resize it
    stops, and `s1.head` keeps its coordinates. With the box above `s0.head`, it
    stops at once. The base resizes `s1.head` in both cases.
  - The dead-end close, in the same new file: on `2765` laid out by the port,
    the dead-end edge's route returns `'lost'` (base: `null`), and the orphan
    ends at native's values (AD-1, Why), compared at 1e-9. How the test reaches
    the orphan is push-forward (for example, the orig edge's `to_virt` after the
    port's splines pass, or `routeMultiRankEdgeFaithful` after position). If it
    cannot reproduce native's values, that is stop condition 3.
  - `src/layout/dot/no-out-edge-2765.test.ts`, after `empty-rank-2759.test.ts`:
    verbatim `tests/2765.dot` and `tests/2765_1.dot`, and `-Tplain` equal to
    native 16.1.1's stdout, captured in T1 (`GVBINDIR=/tmp/ghl1611`). This is a
    pin, not a red test: the base already equals native (#148). Stderr is not
    pinned. Native prints six `port 0 unrecognized` warnings the port lacks
    (#216); say so in the header.
- **Why:** testing.md (tests first, values asserted). Only `2765`/`2765_1`
  reach the guards in the corpus, so the branch cases must be hand-built.

### AD-4: how "equals native" is judged

- **Decision:** as #160's AD-3, with [harness/native-compare.sh](harness/native-compare.sh)
  unchanged: plain, xdot and cmapx byte for byte; svg from `<g id="graph0"`;
  json parsed, keys sorted, numbers at 3 decimals. The json of `2765`/`2765_1`
  differs from native by 2 lines on the base and on the cf alike: the root
  `"name"` (#185). Compare stderr between the base and the head on both ids
  (`bd-job.ts`, after `--stderr--`). It must be identical; the cf's is.
- **Rejected:** requiring stderr equal to native. #216 owns the missing port
  warnings.

### AD-5: scope

- **In:** AD-1, AD-2, AD-3; comments on #161 and #148.
- **Out:** #216 (`port … unrecognized` warnings); #187 and #188 (`lost`
  semantics, beyond using it as today); `cl_bound`'s unguarded `adj` branch
  (C 16.1.1 still dereferences `ND_out(adj).list[0]`); the stale `to_virt` that
  concentration leaves (C has it too, and it is what makes the dead end); corpus
  records and the ledger (`test/corpus/*`, `docs/known-divergences.md`,
  `docs-site/*/divergences.md`). Verdicts come from the maintainer's full
  survey, as #160's AD-4.

## Baseline

See README, "Baseline (Phase 8)".

## Rollback

Reversible: revert the squashed commit. No data, API or format contract
changes. Everything touched is internal (`recoverSlack` gains a test-only
export). Behaviour changes only on a chain that ends at a vnode with no out
edge (in the corpus, `2765`/`2765_1`, whose output does not change), and on
`straightLen`/`maximalBbox` inputs with a stale `list[0]` or a VIRTUAL node with
no out edge.

## Operational readiness (auto-confirmed)

Observability N/A: a library. C prints nothing on these paths beyond what
`routesplines` already may. No API, schema or format change. Load envelope: one
size test per chain step, and one discarded route per dead-end edge (as C).
