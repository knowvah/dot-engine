# issue-242 mission — observations (2026-11-18)

## Observation: every inherited graph attribute is seeded into a parsed subgraph
- **Context**: #242, `digraph G { ordering=out; subgraph cluster_a { … } … }`.
- **Finding**: `processSubgraph` (`src/parser/builder.ts`) seeds every key of the open-time
  `graphDefaultsSnapshot` the first body did not set into the subgraph's `attrs`, marked in
  `seededAttrs`. A parsed subgraph's `attrs.get(k)` is now what C's `agget(subg, k)` returns for
  any graph attribute (`ordering`, `rank`, `style`, `URL`, `margin`, `area`, `K`, …), not only
  the label family and `cluster`.
- **Impact**: a read of a graph attribute on a subgraph needs no snapshot fallback. Code that
  tests `sg.attrs.has(k)` to mean "the subgraph declared k" is wrong: use
  `sg.attrs.has(k) && !sg.seededAttrs?.has(k)`, or `localGraphAttrs(sg)`.
- **Confidence**: High (9 probes + 25 extra × 8 engines against native 16.1.1)

## Observation: writers that copy a subgraph's local attributes must skip `seededAttrs`
- **Context**: AD-2; the prototype without it failed 19 json tests.
- **Finding**: a seeded value has no local dict symbol in C, so `write_dict` does not print it.
  Three port writers take a subgraph's `attrs` as local: `graphInputParts` and `echoGraphAttr`
  (`src/render/dot/attrs.ts`) and json's cluster correlation (`src/render/json.ts`, through
  `localGraphAttrs` in `src/model/cgraph-ops.ts`). json's `-Tjson` re-parses the port's own xdot
  output, and that parse seeds too: the xdot root's `xdotversion`, `bb` and `_draw_` strings land
  in every re-parsed cluster's `attrs`.
- **Impact**: a new writer or copier of subgraph attributes must go through `localGraphAttrs`
  (or skip `seededAttrs`) unless it wants effective values (`agcopyattr`, `agmakeattrs`).
- **Confidence**: High

## Observation: what a new subgraph copies is the nearest local symbol, not the parent's values
- **Context**: extra probe `x01-reopen-nested` regressed with every key seeded.
- **Finding**: `agmakeattrs(parent, subg)` iterates the parent's dict VIEW, so for each key it
  copies the `defval` of the nearest local symbol from the parent up to the root. Local symbols
  come from a declaration in that graph, or from `unviewsubgraphsattr`, which `setattr` calls only
  on its update branch (the scope already holds a symbol for the key: the root for any declared
  key; the scope that declares a key first anywhere, because `bindattrs` declares it `""` there
  first and `agxset` gives that scope a symbol; a scope that declared or was pinned before). The
  update gives each existing direct subgraph without a symbol one holding its current value (a
  pin). A "new local definition" (the key exists above, this scope has no symbol) pins nothing,
  and the subgraphs below it keep their record values while their dict view now shows the new
  value. So a subgraph opened later inside one of them copies a value its parent does not have
  (`x21`, `x26`: native strokes `cluster_c` blue inside a red or default `cluster_p`).
  The port: `src/parser/graph-attr-syms.ts` (`effectiveGraphDefaults`, `hasLocalGraphSym`,
  `pinSubgraphsAttr`) and `Graph.pinnedAttrs`. The parent's record value and the nearest symbol
  differ only after a re-open; without one the old walk over current `attrs` gave the same map.
- **Impact**: `declareGraphAttr` must run before the value is stored (it tests whether the scope
  held a symbol). `pinnedAttrs` is the set #262's non-empty pin line needs: a pinned key whose
  `attrs` value is non-empty prints in native (`graph [color=red]`); no writer reads it yet.
- **Confidence**: High (native's cluster colours on `x21`, `x24`-`x28`; C read)

## Observation: the four snapshot fallbacks are now redundant on parsed graphs
- **Context**: AD-3.
- **Finding**: `graphAttrInherited` (`src/common/attr-get.ts:40`, 6 callers), `nslimit`
  (`src/layout/dot/position.ts:118`), `nslimit1` (`src/layout/dot/rank.ts:474`) and `label`
  (`src/async/collect.ts:165`) fall back to `graphDefaultsSnapshot` when `attrs` lacks a key. A
  parsed subgraph's `attrs` now holds every snapshot key, and a hand-built graph has no snapshot,
  so the fallback never changes a value.
- **Impact**: a cleanup can read `attrs` directly at those four sites; no output changes.
- **Confidence**: Medium (by construction; not removed and re-surveyed)

## Observation: inherited values that changed output outside the planning probes
- **Context**: `harness/extra/probes/` (25 inputs, 8 engines, dot/xdot/svg/plain/cmapx).
- **Finding**: rows that moved to native: a root `URL`/`tooltip`/`target` on clusters (cmapx, svg),
  a root `margin`/`K` on fdp clusters, `area`/`inset` on patchwork clusters, a root `rank=sink` on
  a plain subgraph. An anonymous subgraph whose parent changed a value after it opened is no
  longer inlined by `irrelevantSubgraph` (`x02`: 9 lines off native on the base, 1 on the head,
  the #262 pin line).
- **Impact**: these attributes need no per-key work; a divergence on one of them on a subgraph is
  something else.
- **Confidence**: High

## Observation: detached long runs in a headless session
- **Context**: gates 5 and 6 (a 9000-job bytediff) with a 10-minute foreground cap.
- **Finding**: start the run with `nohup bash -c '…; echo $? > done' &` and poll with a bounded
  `until [ -f done ]; do sleep 5; done` loop in a foreground call. A bare foreground `sleep` is
  refused; the loop is not.
- **Impact**: a run longer than one tool call does not need a background task that outlives the
  turn.
- **Confidence**: High
