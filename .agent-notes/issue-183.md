# issue-183 mission — observations (2026-11-17)

## Observation: how cgraph gives a subgraph its graph-attribute values
- **Context**: porting `is_a_cluster`'s read of an inherited `cluster` (#183).
- **Finding**: four functions decide what `agget(subgraph, name)` returns (graphviz 16.1.1).
  - `bindattrs` (`lib/cgraph/grammar.y:307`): an attribute name no graph has declared yet is first
    declared with `""` at the scope that uses it.
  - `setattr` (`lib/cgraph/attr.c:257`) has three branches. *New global definition*: a root symbol
    with that `defval`, applied to every existing graph (`agapply(root, ..., addattr, ...)`). *New
    local definition* (the name exists above, not here): a local symbol in this graph's dict whose
    `defval` is the value. *Update of an old local definition*: first `unviewsubgraphsattr`, then
    the `defval` changes.
  - `unviewsubgraphsattr` (`attr.c:232`): each existing direct subgraph without a local symbol gets
    one, holding its current value. `-Tdot` then prints it (`graph [cluster=""]` on a subgraph that
    opened before the root's `cluster=true`).
  - `agmakeattrs` (`attr.c:165`): a new subgraph copies every visible symbol's `defval` from its
    parent's dict, once.

  Net rule: a subgraph has the value in effect in its parent when it opened and never a later one,
  and a subgraph's own value is what its later children copy. Because `bindattrs` declares with
  `""` and the value is then set through the update branch, a root attribute's first assignment
  also pins the subgraphs that already exist. The builder's open-time `graphDefaultsSnapshot`
  (`src/parser/builder.ts`, `effectiveGraphDefaults`) gives the same result for every subgraph
  that is opened once. Probes `late`, `nestlate`, `off` in
  `plans/issue-183-inherited-cluster/harness/probes/` are byte-equal to native.
- **Impact**: any graph attribute C reads with `agget` on a subgraph is inherited this way; the
  port sees it only for keys in `GRAPH_INHERIT_SEED_KEYS` or through `graphAttrInherited`
  (#242 is the general case).
- **Confidence**: High (C read, 13 probes x 8 engines against native)

## Observation: dot's pack projection copies `attrs`, not the snapshot
- **Context**: choosing between seeding `cluster` into `attrs` and reading the snapshot in
  `isACluster`.
- **Finding**: `projectOne` (`src/layout/dot/pack-components.ts:111`) builds each component's
  subgraph with `proj.attrs = new Map(sub.attrs)`; `graphDefaultsSnapshot` is not copied. C's
  `agcopyattr` copies the effective values. With a snapshot read, `pack.gv` under dot stays 10
  lines off native (no subgraph `bb`); with the seeded key it is byte-equal.
- **Impact**: an inherited graph attribute that layout reads after a pack projection must be in
  `attrs` (seeded), or the projection must copy the snapshot.
- **Confidence**: High (`harness/prototype-a.diff` against `harness/prototype.diff`)

## Observation: a re-opened subgraph was replaced, with a fresh snapshot (fixed by #258)
- **Context**: extra probes for the path `unviewsubgraphsattr` covers
  (`harness/extra/probes/reopen{1..5}.gv`).
- **Finding**: `subgraph p {..} .. subgraph p {..}` in one parent: cgraph's `agsubg` returns the
  existing subgraph, which keeps its first-open values and gains the second body. The builder's
  `processSubgraph` builds a new `Graph` and replaces the old one (only `seq` is kept), so the
  first body's membership is lost and the snapshot is retaken. No row of the five probes equals
  native on the base. With `cluster` seeded, `reopen1` and `reopen3` also gain a cluster native
  does not have. No corpus input re-opens a named subgraph (`harness/extra/reopen-count.ts`: 0 of
  1320). Filed as #258; the rows as #259.
- **Impact**: fixed by #258 (2026-11-18): `processSubgraph` now builds a re-opened subgraph's
  body into the existing `Graph`, so its seeded and snapshot-read values are the first-open ones,
  as native's. See `.agent-notes/issue-258.md`. What stays off native on the re-open probes is
  the non-empty pin line (#262), which reproduces with no re-open.
- **Confidence**: High

## Observation: `irrelevant_subgraph` compares attribute strings, `bb` included
- **Context**: `harness/extra/probes/endpoint.gv` under neato, `-Tdot`.
- **Finding**: native omits an anonymous cluster from `-Tdot` when every graph attribute string
  equals its parent's. Under neato an anonymous cluster that spans the layout's extreme nodes has
  the root's `bb` string, so native writes its nodes at the root. The port's `irrelevantSubgraph`
  (`src/render/dot/agwrite.ts:122`) returns false for anything in the cluster tree. Reproduces on
  the base with a local `cluster=true`. Filed as #260. `-Txdot` is unaffected (`_draw_` differs).
- **Impact**: a `-Tdot` row with an anonymous cluster can differ from native by the whole block.
- **Confidence**: High

## Observation: sfdp differs from native on any input with a cycle
- **Context**: the `mixed`/sfdp residual of #183's probes.
- **Finding**: `graph G { a -- b; b -- c; a -- c }` under sfdp: native and the port both give an
  equilateral triangle of the same edge length, in different orientations. A 4-cycle and a
  triangle with a tail differ too; a path and a star are byte-equal. Not classified (A1 `pow`
  drift or a port difference). Filed as #257.
- **Impact**: an sfdp probe that must equal native should be a tree.
- **Confidence**: High for the observation, none for the cause

## Observation: finding the exact reach of a parser-side change
- **Context**: gate 6's selection rule was a `grep` for `cluster=`.
- **Finding**: the change alters output only where the builder seeds `cluster`, so parsing every
  corpus input and listing those with `seededAttrs.has('cluster')` gives the reach set directly
  (`harness/extra/reach.ts`: 0 of 1320 inputs, all 13 probes). It takes seconds and needs no
  layout.
- **Impact**: for a builder change, a parse-only predicate is a cheaper and stricter survey
  selection than a text search.
- **Confidence**: High

## Observation: the harness `compare.mjs` and json
- **Context**: stop condition 4 (`-Tjson` changes only toward native).
- **Finding**: the port's json is not formatted as native's (key order, one number per line), so
  every json row is "not byte-equal" on base and head, and more clusters means more differing
  lines. `test/golden/compare-json.ts` is the comparison to use
  (`harness/extra/json-compare.ts`: head equals native in 103 of 104 probe rows, base in 43). Also,
  `compare.mjs`'s `base`/`head` columns count native lines missing from the port, so a row whose
  head only gains a line native lacks shows no change there; read `headEqBase` as well.
- **Impact**: do not judge json with a line diff.
- **Confidence**: High

## Observation: the survey runs in lanes
- **Context**: gate 6, which the planning run could not finish in 40 minutes.
- **Finding**: `compare.mjs` takes `ENGINES`, so `2475_2` was run as four processes of two engines
  each beside one process for the three small inputs. All 64 rows finished in under 8 minutes at
  a load near 6. Native fdp stdout on `2475_2` differs between runs (22969 lines missing here,
  22980 at planning), as #182's notes say.
- **Impact**: split a long `compare.mjs` survey by engine and concatenate the TSVs in order.
- **Confidence**: High
