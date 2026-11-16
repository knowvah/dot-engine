# Decisions: issue #149

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. No issue was labelled `queue:planned`. #149 is the lowest-numbered
`queue:ready` issue, and its only blocker, #147, is closed. Nobody confirmed
the decisions below. Each one names the options it rejected and the evidence,
so the maintainer can audit it.

### AD-1: port `write_body`/`write_edges` as the C has them; no separate diagnosis task

- **Decision:** T1 ports 16.1.1's `write_body` and the new `write_edges`
  (`lib/cgraph/write.c:662-716`, 16.1.1 checkout). The node walk is unchanged.
  Each out-edge whose seq is not in `edgesDone` goes into `edgesTodo`, a
  `Map<number, Edge>` keyed on `Edge.seq` (`AGSEQ(e)`; `dtinsert` into a
  `Dtoset` keyed on seq dedupes). After the walk, a new `writeEdges(g, ctx)`
  method writes them in ascending seq order, adds each seq to `edgesDone`
  (`bitarray_set`), and clears the map (`dtclear`). `writeEdgeTest` and
  `SerCtx.edgeLW` go, as `write_edge_test` and `edge_last_written` did.
  `SerCtx` gains `edgesTodo` and `edgesDone`. The class comment (`:61-69`) and
  the `writeBody` comment are rewritten to say this.
- **Rejected:** an `Edge[]` sorted at flush. It works, but the C keys a
  dictionary on seq. A `Map` keyed on seq dedupes the same way and reads like
  the C. The C's dictionary is a speed fix, and either choice gives the same
  output.
- **Rejected:** a T0 diagnosis task. The mechanism is the upstream diff itself
  (`230a65310`, `61e599d14`, `072a4d3ef`), read at planning against the 16.1.1
  checkout. Planning built a throwaway head from a `$TMPDIR` copy with the
  change and measured it (README, "Evidence"): all 9 witness ids and 5 probes
  are byte-equal to native in `-Tdot` and `-Txdot`, and the base differs on
  each.
- **Function boundaries:** `write_edges` is its own C function, so it gets its
  own method. That also keeps `writeBody` under the complexity limits.

### AD-2: keep `writeEdge`'s `attrsWritten` gate; add no `write_edge_name` branch

- **Decision:** `writeEdge` keeps `if (!ctx.attrsWritten.has(e))`, which mirrors
  `if (!attrs_written(e))` (`write.c:650`). The C `else` (`write_edge_name(e,
  …, true)`, a bare `[key=…]`) is not ported. A comment says why: since
  16.1.1, each edge is written exactly once per `agwrite` (`edges_done` is
  global, and `set_attrwf` clears every flag first), so that branch cannot run.
- **Rejected:** porting the `else`. It is unreachable code with no test that
  could cover it, against `testing.md`.

### AD-3: re-capture exactly the 47 fixture files the change turns red, and only when the change is line order alone

- **Decision:** ADR-0002 decision 7 says each port issue re-captures the
  fixtures it touches against 16.1.1. The planning throwaway head turned 47
  assertions in 10 test files red, and every one compares with a stored 16.1.0
  capture. `harness/recapture.sh apply` re-captures exactly the files those
  assertions read (47 files, listed in the script), using each source's own
  regen command pointed at 16.1.1. It copies nothing unless every file differs
  from its committed copy in line order only (sorted lines equal). Planning ran
  it in `check` mode on base `2c362ef0`: 47/47 `order`, exit 0. Applied to a
  `$TMPDIR` copy with the throwaway head, the 10 files went green except the
  hackflag test (AD-4).
- **Rejected:** re-running each source's `regen.sh` wholesale. Planning did it
  in scratch copies. `rerender` changes content in 25 files (plain layouts from
  16.1.1's other unported changes, such as #158, and SVG banners). That would
  break tests for reasons that are not #149's.
- **Rejected:** making the 10 tests order-insensitive. They pin native byte for
  byte on purpose, and #149 is the change that makes byte order matter.
- **Provenance:** each touched test's header comment, and each touched
  `regen.sh` header, gets one line naming the files that are now 16.1.1's,
  "re-captured by #149 (plans/issue-149-agwrite-edge-order/harness/recapture.sh)".
  `regen.sh` code is not changed. The two instrumented sources run unchanged
  with `G=~/git/graphviz-16.1.1` (and `GV_SOVER=8.0.16` for T7b), as #147
  parameterized them.

### AD-4: the hackflag test's inline order follows native 16.1.1

- **Decision:** `src/layout/dot/edge-route-chain.hackflag.test.ts`'s first case
  pins five `pos` values in output order. The old walk wrote `sh0006`'s
  out-edges (edges 1, 2, 3, 5) before `sh0007`'s (edge 4, `sh0007:q->sh0006`).
  16.1.1 writes all five in creation order, so the last two entries swap.
  Planning checked: the head's order equals native 16.1.1's, and the five values
  are the same set as on the base. T2 swaps the two entries and adds a line to
  the header: values are 16.1.0's and unchanged at 16.1.1, order is 16.1.1's.
- **Rejected:** comparing as a set. The test pins which edge gets which route,
  and order is how it identifies the edge.

### AD-5: corpus registries and `docs/known-divergences.md` stay as they are

- **Decision:** the mission does not edit `test/corpus/*-parity*.json`, the
  accepted-divergence files, or the #149 row of `docs/known-divergences.md`.
  Their verdicts come from the full survey, and the queue rules reserve that
  survey for the maintainer, run once over the branch. The issue comment lists
  the ids the mission moved, for that survey.
- **Rejected:** editing the row by hand. Its counts must come from a survey.

## Out of scope

- `-Tcanon`: the port has no `canon` output format (`src/render/public.ts:28`).
- #225: the "already in a rankset … cluster %1" warning names an anonymous graph
  `''`. That is why `1514`/`1581` stderr differ on base and head alike.
- Fixtures whose 16.1.1 capture changes content (any `CONTENT` line from
  `recapture.sh`): they stay at 16.1.0 for the issue that owns that change.

## Baseline

On `2c362ef0` at planning: `npm run typecheck` exit 0. `npm test`: 576 files,
13547 passed, 18 expected fail. Oracle preflight: `/tmp/ghl1611/config8` and
`/tmp/ghl1611-all/config8` present. `dot -V`: `graphviz version 16.1.1
(20261109.2225)`.

## Rollback

Reversible: revert the one squashed commit. That restores the 16.1.0 fixtures
with it. There is no data, API or format contract change. `SerCtx` is internal:
it is not exported from `.`, `./api` or `./render`. `-Tdot`/`-Txdot` bytes
change only toward native 16.1.1.

## Size

`agwrite.ts` is 513 lines (Gate 4 caps at 600). The change adds about 15. The
`types.ts` change swaps one field for two.
