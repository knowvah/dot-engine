## Observation: HTML table pen color ignored declared defaults (894589)
- **Context**: Diagnosing 894589, the last tracked dot SVG divergence (26 cell
  border strokes `black` vs native `white`).
- **Finding**: `make-label.ts:getPenColor` read `obj.attrs` only. C's
  `getPenColor` uses `agget`, which sees declared defaults: a node's
  `node [...]` snapshot and a subgraph's inherited graph attrs. Edges were
  unaffected (the builder materializes edge defaults into `attrs`).
- **Impact**: Any HTML-table label whose border color comes from a default
  (`node [color=...]`, `node [pencolor=...]`, a root `color=` above a
  cluster) drew black borders. Fixed by resolving through `attr-get.ts`
  (`nodeAttr`, `graphAttrInherited`).
- **Confidence**: High (native probes for 6 order/precedence cases).

## Observation: cluster border color walks live parent attrs
- **Context**: Same probes.
- **Finding**: `src/gvc/device-cluster.ts:46` `clusterAttr` walks `g.parent`
  attrs live, so `digraph { subgraph cluster_x { a }; graph [color=white] }`
  draws a white cluster border; native draws black (agsubg snapshots the
  defaults when the subgraph opens; `graphAttrInherited` models that).
- **Impact**: Not exercised by any corpus id at the time (dot track 929/929
  conformant otherwise); a candidate follow-up, not fixed here.
- **Confidence**: High (native probe), scope of corpus exposure Medium.
