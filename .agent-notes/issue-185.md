# issue-185 mission — observations (2026-11-18)

## Observation: `src/render/json.ts` sits at its Gate 4 line cap
- **Context**: #185 added one import to `json.ts` for a one-line fix.
- **Finding**: the file has 734 lines, exactly its entry in
  `test/golden/line-limit-baseline.txt`, and Gate 4 of `test/golden/gates.sh` is a ratchet: a
  listed file must not grow. #185 paid for the import by folding the `// write_hdr` comment onto
  the assignment (`buildGraphObject`).
- **Impact**: any net growth of `json.ts` fails Gate 4. A change there needs a compensating line,
  or code moved out to a sibling (`json-cluster-edge.ts` is the existing one).
- **Confidence**: High

## Observation: `compareJson` never compares the root graph name
- **Context**: #185's gap (`"name": ""` where native prints `"name": "%1"`) passed every golden
  and corpus json comparison.
- **Finding**: `name` is in `RESERVED_TOP` (`test/golden/compare-json.ts:114-117`) and
  `GRAPH_STRUCTURAL_FIELDS` (`:468`) holds only `directed`, `strict`, `_subgraph_cnt`. Subgraph
  names are compared (objects match by name); the root's is not. Filed as #261.
- **Impact**: until #261 lands, a root-name check has to read the name directly, as
  `src/render/json-root-name.test.ts` and
  `plans/issue-185-json-anon-root-name/harness/root-name-survey.ts` do. #194 (`%`-prefixed root
  names) is the known remaining root-name difference.
- **Confidence**: High

## Observation: three readers of a nameless root's name, one stored form
- **Context**: checking whether the fix belonged in the model or the json writer.
- **Finding**: a nameless root is stored as `name: ''`, `anonymous: true`
  (`src/parser/builder.ts:496`, `src/api/builder.ts:349`; no subgraph is ever constructed
  `anonymous`, an anonymous subgraph carries its `%N` name). The dot and xdot writers read the
  flag to print `digraph {`; everything that prints cgraph's name (json and json0 since #185, the
  map writer's `<map id/name>`, the neato warnings) goes through `agNameOf`
  (`src/model/cgraph-ops.ts`), which returns `%1` for it.
- **Impact**: a new writer or message that prints a graph name calls `agNameOf(g)`, not `g.name`,
  wherever C calls `agnameof`.
- **Confidence**: High (80 probe rows and 136 corpus rows against native 16.1.1)

## Observation: `%%` in a vitest `it.each` title does not print a literal percent before a digit
- **Context**: a title `'... prints %%1 as %s'` over an array of format names.
- **Finding**: vitest 4.1.12 rendered it as `prints % json1 as undefined`: the format name
  landed where the `%%` was, and the `%s` after it printed `undefined`.
- **Impact**: keep `%` out of `it.each` titles that also use a placeholder; name the value in
  words.
- **Confidence**: Medium (one title, one vitest version; the formatter's rule was not read)

## Observation: the targeted survey's slow shard
- **Context**: #185's survey (139 ids, dot, json, one native run and two port renders per row).
- **Finding**: eight shards of 18 ids, four at a time: seven finished in 6 minutes or less; the
  one holding `2343`, `2371` and `2475_1` took 19 minutes. `1864` runs the port out of memory
  and `2475_1` past 300 s in json on any bundle, and native passes 120 s on both.
- **Impact**: a headless session (10-minute cap after a turn ends) should give those three ids
  their own shard and keep the turn open while it runs.
- **Confidence**: High
