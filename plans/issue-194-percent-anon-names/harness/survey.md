# Survey: what #194 can change, and how the probes were chosen

## Reach

The fix changes the parser's model only when a graph or subgraph name's text
starts with `%`: a quoted `"%x"` or an html-like `<%x>` (`%` cannot start an
unquoted DOT ID). It then changes every reader of that name (json/json0
`name`, cmapx/imap `<map>`, svg titles, dot/xdot `subgraph` headers, the
neato `in graph %s` warnings, `clust-map.ts`'s aliasing) and the numbering of
every later anonymous subgraph.

**Corpus:** 0 of 1007 manifest ids reach it:
`grep -rlE '(graph|subgraph)[[:space:]]+("|<)%' ~/git/graphviz-16.1.1/tests`
finds no file. The only `"%..."` strings in the corpus are labels (`2343`,
`2834`, `1411`). So the smoke bytediff must be 0 diffs (planning: 2352/2352,
formats `svg,xdot,json,plain,cmapx,dot`), and a corpus survey has nothing to
compare. The targeted survey is the probe matrix.

## Probes (`probes/*.gv`), chosen by code path

| Probe | Reaches |
|---|---|
| `repro` | the issue's repro: `%` root and two `%` subgraphs |
| `reopen` | a reopened `%x` in one parent, a keyless edge between, then an anonymous subgraph |
| `collide` | `"%3"` after an anonymous `%3` (base wrongly reopens it) |
| `two-parents` | one `%q` under two parents: one id, two subgraphs |
| `sub-as-root` | `subgraph "%foo"` under `digraph "%foo"`: the root's id |
| `edges-between` | keyless edges and `%` subgraphs interleaved (counter order) |
| `clusters` | `%`-named clusters: fillMap's alias warning, `lhead` to a renamed cluster |
| `html-root` | `<%foo>` root and `<%bar>` subgraph |
| `html-vs-text` | `"%a"` and `<%a>`: two ids |
| `strict-undirected` | `strict graph "%g"` with a labelled `%h` subgraph |
| `neato-warn` | `agNameOf(root)` in neato's `mode`/`model` warnings |
| `html-root-text-sub`, `html-root-html-sub`, `text-root-html-sub` | (execution) the root's name is recorded as text: `"%foo"` under `<%foo>` takes id 1, `<%foo>` under either root takes a new id |
| `html-reopen` | (execution) `<%a>`, `"%a"`, `<%a>`, `"%a"`: two ids, each found again |
| `nested-same` | (execution) `%x` inside `%x`: two subgraphs with one id |
| `edge-rhs` | (execution) a reopened `%x` as two endpoints of one edge statement |
| `concat`, `bare-percent`, `percent-ids` | (execution) `"%"+"x"`; a name that is `%` alone; source names of the `%N` form on root and subgraphs |
| `ctl-infix`, `ctl-empty` | controls: `%` not first, and `""` names (unchanged) |
| `oos-node` | out of scope (#284): a `%` node name; reported, not counted |

Engines `dot`, `neato` (the two the readers differ on); formats `dot, xdot,
json, json0, cmapx, svg, plain`. json is compared parsed with sorted keys, and
svg only on its name-bearing lines (`probe.ts` header says why).

## Planning results

| | base | prototype |
|---|---|---|
| in-scope rows equal native (stdout and stderr) | 104 / 182 | 175 / 182 |
| rows left | 78 | 7: `clusters -Kdot`, one stderr line each (#285) |

Files: [results/probe-base.tsv](results/probe-base.tsv),
[results/probe-prototype.tsv](results/probe-prototype.tsv).

## Execution results

22 in-scope probes, 308 rows: 301 equal native on the head (base 172). The
182 planning rows equal `results/probe-prototype.tsv`. The 126 rows of the
nine added probes are all equal on the head (68 were equal on the base). The
7 left are `clusters -Kdot` (#285). File:
[results/probe-head.tsv](results/probe-head.tsv).
