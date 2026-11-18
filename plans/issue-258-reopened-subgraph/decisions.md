# Decisions: issue #258

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/). Base `286912a4`.

## AD-1: a re-opened named subgraph is the existing `Graph`, as `agsubg` returns it

**Context.** `opensubg` calls `agsubg(S->g, name, 1)`
(`~/git/graphviz-16.1.1/lib/cgraph/grammar.y:586-595`). `agsubg` looks the name
up in the parent's own subgraph dict (`agfindsubg_by_id`, `lib/cgraph/subg.c:24-28,
52-60`) and returns the subgraph it finds; only a new name reaches `localsubg`
and `agopen1`. So the second body parses into the first subgraph: it keeps the
nodes, edges, local attributes and child subgraphs of the first body, and the
attribute values `agmakeattrs` copied when it first opened
(`lib/cgraph/attr.c:165`, the `rec->dict == NULL` branch, once). The port's
`processSubgraph` (`src/parser/builder.ts:311-320`) makes a new `Graph`,
carries only `seq`, retakes `graphDefaultsSnapshot`, re-seeds, and replaces
the old one in `graph.subgraphs` (`:340`).

**Decision.** When `graph.subgraphs.get(sgName)` returns a subgraph, build the
body into it and return it: no new `Graph`, no `assignSubgSeq`, no new
snapshot, no seeding loop. A new name keeps today's path unchanged. The lookup
stays on the direct parent (a same name under another parent is a separate
subgraph, `reopen13`, unchanged and equal to native). Anonymous subgraphs
never re-open (each takes a fresh `%N`).

**Rejected.**

- (A) Build a new `Graph` and merge the old one into it (copy nodes, edges,
  attrs, subgraphs, snapshot). A second copy of every membership rule, and the
  layout's identity-keyed maps would see two objects for one cgraph subgraph.
- (B) Keep the replacement but carry the snapshot and nodes over. Loses edges
  and child subgraphs (`reopen8`'s `q`) and still re-seeds.

**Consequences.** With the prototype every row of the 15 probes is equal to
native or in a residual owned by another issue (README, evidence). The `-Tdot`
empty pin (`graph [cluster=""]`) follows without writer changes: the kept
snapshot lacks `cluster`, which `eagerEmptyParts` (`src/render/dot/attrs.ts`)
already reads as "declared after this scope opened".

## AD-2: a key declared in a re-opened subgraph is no longer seeded

**Context.** Seeding runs after the first body and marks inherited keys in
`seededAttrs`, which the `-Tdot` writer hides (`graphInputParts`,
`src/render/dot/attrs.ts:288-300`). In a re-opened subgraph a body statement
`label=M` overwrites the seeded value in `attrs`, but the key would stay in
`seededAttrs` and `label=M` would vanish from `-Tdot`. C gives it a local
symbol (`setattr`'s new-local-definition branch, `attr.c:276-281`) that
`write_dict` prints. Probe `reopen14`.

**Decision.** `declareGraphAttr` (`builder.ts:247`), the one funnel for graph
attribute statements in a scope, deletes the key from `graph.seededAttrs`.
On a first open it is a no-op (seeding runs after the body).

**Rejected.** Re-running the seeding loop after a re-open: it would not undo
the stale mark and would re-add nothing (the snapshot is unchanged).

## AD-3: subgraph endpoints expand to the subgraph's nodes after the statement

**Context.** `endedge` and `edgerhs` (`grammar.y:449-530`) run once the whole
edge statement is parsed and walk `agfstnode(subg)` for each subgraph item:
the subgraph's full node set, in sequence order, at that moment. The port
expands each endpoint as it resolves it, from the endpoint body's own text
(`NameCollector.fromStmts(item.stmts)`, `builder.ts:399-402`). On a re-opened
subgraph that misses the first body's nodes (`reopen6`:
`subgraph p {a} subgraph p {b} -- c` gives native `a -- c` and `b -- c`) and
nodes a later endpoint of the same statement adds (`reopen15`:
`subgraph p {a} subgraph p {b} -- subgraph p {c}` gives native all 9 pairs).

**Decision.** `resolveEndpoint` returns the subgraph (`Graph`) for a subgraph
item and the node list for a node item. `processEdgeStmt` resolves every
endpoint first, then expands each `Graph` to `[...sg.nodes.values()]` sorted
by node id (cgraph's sequence order; the existing comment's `graphs-world`
and `1902` cases are kept by the sort and by `nodes` being a set). With
`NameCollector` no longer called, delete the class (exported from
`builder.ts` only; nothing else in `src/` or `test/` imports it, and the
package entry does not export it).

**Rejected.**

- (A) Use the membership only for a re-opened subgraph: two expansion rules
  for one C rule.
- (B) Keep `NameCollector` and add the prior members: still expands before the
  later endpoints open (`reopen15`).

**Consequences.** On all 1320 corpus inputs the parsed models (node ids and
order, edges with seq and attributes, subgraph trees) are identical on base
and prototype ([results/reach-planning.txt](harness/results/reach-planning.txt)),
so `sg.nodes` and the `NameCollector` set agree wherever a subgraph opens once.

## AD-4: scope boundary

- **#262** (filed at planning): `-Tdot` does not print a non-empty pin from
  `unviewsubgraphsattr` (`graph [cluster=false]`, `color=red`, `label=L`). It
  reproduces without any re-open. Its rows on `reopen3`, `5`, `10`, `12` stay;
  each misses exactly the one pinned pair and adds none
  ([results/residual-planning.tsv](harness/results/residual-planning.tsv)).
- **#257**: sfdp on cyclic inputs (`reopen11`, `reopen15`): structure (nodes,
  subgraphs, edge list) equal to native, positions differ.
- **#199**: json lists a subgraph's nodes in insertion order; the merge
  appends the second body's nodes, which `reopen7` shows under json only.
  Probes compare dot, xdot and svg, as #183's did.

## AD-5: tests

New `src/parser/builder-reopen.test.ts`:

- model cases: `reopen1` (`p.nodes` = `a`, `b`; root's direct nodes; `p` has
  no `cluster` in `attrs`; `p.graphDefaultsSnapshot` has no `cluster`);
  `reopen8` (one `q` holding `a`, `b`); `reopen14` (`label` = `M`, not in
  `seededAttrs`); `reopen6`, `reopen15` (edge lists as native); the seq case
  stays in `builder.test.ts`;
- render cases: `-Kdot -Tdot` byte-equal to
  [harness/native/](harness/native/) for the 11 probes outside #262
  (`reopen1`, `2`, `4`, `6`, `7`, `8`, `9`, `11`, `13`, `14`, `15`); for
  `reopen3`, `5`, `10`, `12` (one #262 line short of native), assert that
  native's node `pos` values, subgraph names and root `bb` appear in the
  port's output, with a comment citing #262 so its mission makes them
  byte-equal.

## Baseline

At planning on `286912a4`: `npm run typecheck` exit 0; `npm test` 602 files,
15041 tests passed.

## Rollback

Reversible: revert the one squashed commit. No data, API shape or published
contract changes; parse results change only for inputs that re-open a named
subgraph (none in the corpus).

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 | re-use the existing `Graph` | (A) merge into a new one; (B) carry snapshot and nodes | probes: 172 equal, 0 worse; `subg.c:52-60` |
| AD-2 | `declareGraphAttr` drops the seeded mark | re-seed after re-open | `reopen14` equal native with it |
| AD-3 | endpoints read `sg.nodes` after the statement; delete `NameCollector` | (A) reopen-only; (B) union at resolve time | `grammar.y:449-530`; `reopen6`, `reopen15`; reach 0 of 1320 |
| AD-4 | #262, #257, #199 out of scope | fold #262 in | #262 reproduces with no re-open (issue body) |
| AD-5 | new test file, 11 byte-equal probes + model cases | byte tests on #262 rows | residual TSV |
