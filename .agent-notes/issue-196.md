# issue-196 mission — observations (2026-11-23)

## Observation: `Agsym_t.print` is assigned by the grammar, and write_dict's guard reads literally
- **Context**: planning's prototype printed a root's `_ldraw_=""` whenever the root had a label that
  drew nothing, from a rule "observed" on probes; the comment on `writeDictSkips`
  (`src/render/dot/attrs.ts`) says `print` "is assigned nowhere in the tree".
- **Finding**: `lib/cgraph/grammar.y:388-389` (`attrstmt`): `if (S->g == G) sym->print = true`. Only
  a symbol that an attribute statement in the root's own body listed carries it (any kind: graph,
  node, edge). With it `lib/cgraph/write.c:275-283` is exact: the graph being written drops an
  empty value whose symbol lacks `print`; a subgraph drops its local empty value only when the
  symbol it would inherit (nearest up the dict view) is empty and carries `print`. Carried oracle:
  `digraph G { label="\n"; subgraph cluster_n { label="\n"; p } p -> q }` under `-Txdot` prints no
  root `_ldraw_` and `_ldraw_=""` on `cluster_n`; adding `_ldraw_="..."` to the root body flips
  both. The port carries the flag as `Graph.printGraphAttrs` (root only, `builder.ts`
  `declareGraphAttr`). `writeDictSkips` still uses the snapshot value: #294.
- **Impact**: before calling a C guard unreadable, grep the generated-parser sources
  (`grammar.y`, `scan.l`) too, not only `lib/cgraph/*.c`. A probe set that never varies the
  provenance of a value (declared in the root body or not) cannot see this flag.
- **Confidence**: High (C source, 6 added probes × 3 engines, and a two-render native control)

## Observation: xdot's store rule differs by object kind
- **Context**: the fix sites in `src/render/dot.ts` and `src/render/dot/write-back.ts`.
- **Finding**: nodes and edges store only a non-empty buffer (`gvrender_core_dot.c:240`,
  `:251-264`); a drawn cluster always stores `_draw_` (`:284`); a labelled cluster or root always
  stores `_ldraw_` (`:285-286`, `:436-437`), empty too. On a graph, `agxset` also makes or
  updates the graph's local dict symbol (`attr.c:agxset`), which is why a cluster that
  `xdot_end_cluster` ran for with `GD_label` "holds" `_ldraw_` for write_dict. The renderer
  records `''` only for that last case, so `renderedDraws` can use `??` for `ldraw` alone.
- **Impact**: a change to one kind's rule needs a probe per kind; `empty-buffer` and `stored-input`
  are the node/edge controls.
- **Confidence**: High

## Observation: an API change to a subgraph attribute needs `seededAttrs.delete(key)`
- **Context**: the two-render tests (`hide-cluster.c`: layout, xdot, `agsafeset(sg, "style",
  "invis")`, render again).
- **Finding**: `sg.attrs` holds seeded copies of inherited graph values, and the serializer does
  not print a seeded key. `sg.attrs.set('style', 'invis')` alone leaves the key seeded, so the new
  value is not printed; `agsafeset` creates a local symbol, which the port spells
  `sg.seededAttrs?.delete('style')`.
- **Impact**: a test that mutates a subgraph attribute between renders must clear the seed mark.
- **Confidence**: High

## Observation: a pinned subgraph symbol for a computed key is not printed (#305)
- **Context**: probe `oos-pinned-ldraw` (`_ldraw_="zz"` declared in the root after a cluster).
- **Finding**: `unviewsubgraphsattr` gives the existing subgraph a local empty `_ldraw_`, which
  native prints (`_ldraw_=""`) when the root's value is not empty. `eagerEmptyParts` skips every
  computed key and `clusterLdraw` sees an absent value. Same on base and head; plain subgraphs and
  `-Txdot` too.
- **Impact**: #305; a pinned key with no `attrs` entry is a held empty value.
- **Confidence**: High (base and head against the carried oracle)

## Observation: tooling
- **Context**: edits to `dot.ts` (505 lines) and `agwrite.ts` (533).
- **Finding**: both stay at their base line count; the 500-line write hook compares with `HEAD`.
  `recapture.sh` and `probe.ts` now treat every `probes/hide-*.gv` as a two-render case
  (`hide-cluster.c` needs the input to declare graph `style` before layout).
- **Impact**: add a two-render probe as `hide-<name>.gv`; it is captured as `.xdot-xdot` and
  `.xdot-json`.
- **Confidence**: High
