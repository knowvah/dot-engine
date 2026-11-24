# Decisions: issue #199

## Mechanism (planning's diagnosis)

- **Mechanism.** C's json writer walks a graph's nodes with
  `agfstnode`/`agnxtnode`, which follow the graph's `n_seq` dictionary: AGSEQ,
  the order the root created the nodes, in a subgraph too. The port walks
  `Graph.nodes`, a `Map` in the order nodes were inserted into *that* graph.
  For the root the two agree (`agnode` inserts at creation,
  `src/model/cgraph-ops.ts:94`, `src/parser/builder.ts:89`); for a subgraph
  they differ whenever the subgraph names its nodes in another order than
  their creation (`digraph { a; b; subgraph s { b; a } }`).
- **Origin.** Three walks in the json writer, one cause:
  1. `src/render/json-cluster-edge.ts:51` `jsonNodes`: `[...g.nodes.values()]`.
     `buildGraphObject` (`src/render/json.ts:613-616`) builds a subgraph's
     `nodes` list from it (C `write_nodes`,
     `plugin/core/gvrender_core_json.c:570`).
  2. `src/render/json.ts:377` `assignIds`: numbers the nodes (`_gvid`) over
     `g.nodes` (C `write_graph`, `gvrender_core_json.c:656`).
  3. `src/render/json.ts:224` `canonicalRootEdges`: numbers the edges over
     `g.nodes` then `outEdges` (C `write_graph`, `:656-665`).
- **Causal chain.** Root render: walk 1 on a subgraph prints the subgraph's
  insertion order (`[2, 1]`, native `[1, 2]`); walks 2 and 3 run on the root,
  whose map is in sequence order, so the gids already match. Render of a
  subgraph alone (API: `ctx.layout(sg)`, `render(ctx, sg, fmt)`): walks 2 and 3
  run on the subgraph, so node and edge gids follow insertion order too
  (`harness/subrender/`: native `a..d` = 2..5, port `c` = 2, `d` = 3,
  `a` = 4, `b` = 5).
- **Ruled out.**
  - The edge member list (the issue's "not checked"): `memberEdgeGids` sorts
    by `seq` (`json.ts:569`), C's `agseqasc` qsort (`:490`). Probe
    `edge-order` lists `edges` as native once `nodes` is fixed.
  - Root-render gids: probes `subgraph-first`, `root-edge-later`, `all-same`
    equal native on the base under all 8 engines.
  - `Node.id` as the sequence: ids come from the builder's counter or
    `freshNodeId` (max + 1), so id order is creation order; `nodesInSeq`
    (`src/layout/dot/decomp.ts:32`) already serves `map.ts` and `rank.ts` as
    `agfstnode` order.
  - Layout: after the prototype every probe row equals native under 8
    engines except sfdp on `edge-order` and `fdp-cluster-edge`, whose
    remaining lines are coordinates that differ identically on base and head
    (sfdp drift; the head only reorders the member list, to native's).
  - The corpus json track: `compareMemberLists` compares member lists as
    sorted sets (`test/golden/compare-json.ts`), so it never reported this;
    the smoke bytediff sees it because it compares bytes.

Evidence: `harness/results/probe-prototype.tsv` (8 engines: base 48/160, prototype
156/160, the 4 others sfdp coordinate drift), reproduced on the tip
`1f1e7961` against the carried oracle.

## AD-1: walk AGSEQ order at all three json node walks

**Context.** The issue names walk 1. Walks 2 and 3 have the same cause and
show only on a subgraph render; fixing walk 1 alone would print a subgraph
render's objects in sequence order with gids in insertion order. **Decision.**
`jsonNodes`, `assignIds` and `canonicalRootEdges` iterate `nodesInSeq(g)`,
the port's established `agfstnode` walk (`writePlain` uses it the same way).
`memberEdgeGids` keeps its `g.nodes` walk: its result is sorted by `seq`, and
the order of the walk cannot reach the output. **Consequences.** Member lists
and subgraph-render gids move to native; root renders' gids and edge keys
are unchanged (`canonicalRootEdges`' occurrence counter counts edges of one
tail-head pair, which all come from one node in the same `outEdges` order).

Rejected: walk 1 only (leaves the subgraph render wrong, and inconsistent);
making a subgraph's `nodes` map sequence-ordered in the model (C's `n_seq`
semantics, but every engine iterates `sg.nodes`: a cross-cutting change
far past this issue, with call sites that already compensate with
`nodesInSeq`).

## AD-2: test against carried fixtures

**Context.** No existing test checks member-list order (the full suite passes
on the base and the prototype alike, and the corpus comparator sorts member
lists). **Decision.** Create `src/render/json-node-seq.test.ts`, as in
`harness/prototype.diff`: 10 probes × dot, neato × json, json0, comparing the
ids json prints in printed order (`_subgraph_cnt`, each object's gid, name,
`subgraphs`, `nodes`, `edges`, each edge's gid, tail, head) with
`harness/native/` and stderr of json; the repro's literal `[1, 2]`; and the
subgraph render of `subrender/subrev.gv` against `subrender/native/` (44
tests). On the base 31 fail (`harness/results/tests-on-base.txt`).
**Consequences.** The ids surface, not the whole document, so coordinate
drift cannot make the test flaky; the test reads the committed brief
directory, as `json-dup-cluster.test.ts` reads #135's.

## AD-3: `json.ts` may not grow

**Context.** `src/render/json.ts` is 734 lines; the complexity hook blocks an
edit that makes a file over 500 lines longer. The prototype's own
`import { nodesInSeq } from '../layout/dot/decomp.js'` line adds one.
**Decision.** `json-cluster-edge.ts` (95 lines, already json's node helpers)
re-exports `nodesInSeq`, and `json.ts` takes it on its existing
`./json-cluster-edge.js` import line. **Consequences.** `json.ts` stays at
734 lines. T1 step 4 makes this edit on top of the prototype; the
prototype's behaviour is unchanged.

## Baseline

Phase 8 on `1f1e7961`: [decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
No API change (`render`'s signature is unchanged). json output changes in
member-list order and in subgraph-render gids, toward native; a consumer that
relied on the port's insertion order was relying on a divergence.

## Auto-confirmed (unattended)

| Phase | Decision | Rejected | Evidence |
|---|---|---|---|
| 2 | Blast radius: `src/render/json-cluster-edge.ts`, `src/render/json.ts` (two loops, one import list), new `src/render/json-node-seq.test.ts`; no data model, API or dependency change | the model's `Graph.nodes` | AD-1 |
| 3 | AD-1: all three walks | walk 1 only; a model change | subgraph-render harness, probe matrix |
| 3 | AD-2: ids-surface fixture test incl. a subgraph render | whole-document equality (sfdp drift) ; `compareJson` (sorts member lists) | #135's `ids` pattern |
| 3 | AD-3: re-export through `json-cluster-edge.ts` | a second import line (blocked); shortening an unrelated comment | hook rule, `wc -l` |
| 4 | Reversible; no observability (library); json member order changes toward native | — | — |
| 5 | One task, executor alone | splitting test and fix (the test is red until the fix) | — |
| 6 | Stop and push-forward lists in README | — | queue rules |
| 8 | Planning ran no 8-engine corpus survey: the 1-minute load was 150-210 from another project's `vitest --coverage`; the started run was stopped. Gate 6 is the executor's, with a load check | running it anyway | queue rule on load |
