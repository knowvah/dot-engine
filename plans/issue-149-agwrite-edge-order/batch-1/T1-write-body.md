# T1: red probe tests, then 16.1.1's `write_body` and `write_edges`

## Context

C 16.1.1 (`~/git/graphviz-16.1.1/lib/cgraph/write.c`):

- `info_t` (`:59-65`) drops `edge_last_written` and gains `edges_todo` (a
  `Dtoset` keyed on `pending_edge_t.seq`, `:51-56`, `:793-801`) and `edges_done`
  (a bitarray by edge seq, `:811`).
- `write_body` (`:680-716`): `write_subgs`, then the node walk, unchanged for
  nodes (`write_node_test`, and the `prev`/head logic). Each out-edge with
  `!bitarray_get(edges_done, AGSEQ(e))` is `dtinsert`ed (`:703-707`).
  `write_edges` runs after the walk (`:710-713`).
- `write_edges` (`:668-678`): in ascending seq, `write_edge`, then
  `bitarray_set(edges_done, seq)`. Then `dtclear`.
- `write_edge` (`:636-660`) still gates attributes on `attrs_written(e)`.

The port (`src/render/dot/agwrite.ts`) writes each edge right after its tail
node, behind `writeEdgeTest` (`:302-305`, `edgeLW`), and records `edgeLW` in
`writeEdge` (`:354`).

## Steps

1. **Bundles.** Build `$TMPDIR/i149/base.mjs` from the base before any edit
   (`npm run build:js`, then copy `dist/index.js`).
2. **Red.** Add `src/render/dot/write-body-order.test.ts`. For each probe in
   `plans/issue-149-agwrite-edge-order/harness/probes/` (`after-nodes`,
   `seq-order`, `no-redeclare`, `sibling-once`, `strict-undirected`) and each of
   `dot`, `xdot`: lay out with dot on a fresh context, render, and `toBe` the
   file in `harness/native/<probe>.<fmt>`. Use the pattern of
   `src/render/dot/name-canon.test.ts:18-31` (`createDefaultContext`, `parse`,
   `deviceRender`; read the harness through `new URL(..., import.meta.url)`).
   The header comment says what each probe pins, cites `write.c:write_body`,
   `write_edges`, and says the refs are native 16.1.1's (`dot -V` 20261109.2225).
   Run it: all 10 cases must fail. Journal it.
3. **Green.** In `src/render/dot/types.ts`, replace `edgeLW` with
   `edgesTodo: Map<number, Edge>` (`edges_todo`, keyed on `Edge.seq` =
   `AGSEQ(e)`) and `edgesDone: Set<number>` (`edges_done`), each with a `/** */`
   citing its C field. In `agwrite.ts`:
   - `serialize` initialises both.
   - `writeBody` keeps the node walk. In place of
     `if (this.writeEdgeTest(...)) this.writeEdge(...)`, it does
     `if (!ctx.edgesDone.has(e.seq)) ctx.edgesTodo.set(e.seq, e);`, and after
     the walk it calls `this.writeEdges(g, ctx)`.
   - A new `private writeEdges(g, ctx)` (`@see write.c:write_edges`): walk
     `[...ctx.edgesTodo.keys()].sort((a, b) => a - b)`, `writeEdge`, add the seq
     to `edgesDone`, then `ctx.edgesTodo.clear()`.
   - Delete `writeEdgeTest`, and the `edgeLW.set` in `writeEdge`.
   - `writeEdge` keeps its `attrsWritten` gate, with a comment for AD-2.
   - Rewrite the stale comments: `serialize` (`:61-69`, which describes the
     16.1.0 re-declaration), `writeBody` (`:263`), and the misplaced
     `/** @see write.c:write_edge */` that sits on `portSuffix` (`:318`): move it
     to `writeEdge`.
   - Every new symbol carries `@see lib/cgraph/write.c:<fn>`.
   Run the probe test: green.
4. **Witnesses.** Build `$TMPDIR/i149/head.mjs`. Run
   `node plans/issue-149-agwrite-edge-order/harness/compare.mjs $TMPDIR/i149/base.mjs $TMPDIR/i149/head.mjs 1514 1581 linux.i386-radius_dot linux.x86-radius_dot linux.x86-shapes_dot macosx-radius_dot nshare-radius_dot nshare-shapes_dot windows-radius_dot 2860 2860_1`.
   Every row must be `eq`. If one is not, that is stop condition 1. Journal the
   table.
5. **Red list.** Run `npm test`. Journal the failing assertions. They must be
   exactly the 10 files and 47 assertions of AD-3/AD-4 (planning's list:
   node-in-box-pad 5, rerender-nestedclust 2, edge-in-box 8, pt-issue-36 1,
   hackflag 1, ipsep-probes 7, sfdp dim 4, echo-attr-wrap 4, name-canon 8,
   stored-draws 7).
6. **Commit** `fix(T1): write a body's edges after its nodes, in seq order`.

## Write-set

- `src/render/dot/agwrite.ts`
- `src/render/dot/types.ts`
- `src/render/dot/write-body-order.test.ts` (new)
- this mission's `decision-journal.md`

## Read-set

- `~/git/graphviz-16.1.1/lib/cgraph/write.c:40-70,560-716,793-830`
- `src/render/dot/agwrite.ts:61-95,250-355`
- `src/render/dot/types.ts`
- `src/model/edge.ts:37-55,103` (`Edge.seq`, a process-wide monotone counter:
  relative order within one graph matches `AGSEQ`)
- `src/render/dot/name-canon.test.ts:1-45` (test pattern)

## Interface contract

`SerCtx` (internal, not exported from any package entry):
`{ out; preorder; nodeLW; edgesTodo: Map<number, Edge>; edgesDone: Set<number>; attrsWritten; level }`.
At the start of every body's node walk, `edgesTodo` is empty. Nested bodies
flush their own before they return, as in C.

## Observability / rollback

Observability: N/A. This is a library with no logs, metrics or traces.
Rollback: Reversible (revert the squashed commit).

## Acceptance criteria

- Given the base, when `write-body-order.test.ts` runs, then all 10 cases fail.
- Given T1's change, when it runs, then all 10 pass, and each output is byte-equal
  to native 16.1.1.
- Given `sibling-once` (a strict graph whose edge `a -> b` is in two sibling
  subgraphs), when rendered, then `a -> b` appears once, in the first
  subgraph, with no bare re-declaration in the second.
- Given the 11 witness ids, when `compare.mjs` runs, then every row is `eq`.
- Given `npm test` after T1, then the failing set is exactly AD-3/AD-4's 47
  assertions.
