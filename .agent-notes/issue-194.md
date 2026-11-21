# issue-194 mission — observations (2026-11-21)

## Observation: cgraph forgets a parsed `%` name when the parse ends
- **Context**: making `digraph "%foo"` and `subgraph "%bar"` print as native prints them.
- **Finding**: `agmapnametoid` (`lib/cgraph/id.c:104-131`) gives a graph name starting with `%` an
  anonymous id and records the name in the internal map; `endgraph` (`lib/cgraph/grammar.y:580-584`)
  calls `aginternalmapclearlocalnames`, which deletes every `%`-prefixed entry. After that
  `agnameof` has no string and prints `%<id>` from its static buffer. So for DOT input a `%x` graph
  prints `%<id>` everywhere (json, cmapx, warnings, `Two clusters named %5`). A graph built
  through the API never passes `endgraph` and keeps `%x`: #286.
- **Impact**: the port's parser stores `%<id>` as a local subgraph's name and `''` with
  `anonymous` for a local root; nothing after the parse can read the source name, as in C. The
  prefix test in `clust-map.ts` is right for parsed input.
- **Confidence**: High (22 probes x 2 engines x 7 formats against the carried oracle)

## Observation: one `%` name is one id, but not always one subgraph
- **Context**: the probes `reopen`, `two-parents`, `nested-same`, `sub-as-root`, `collide`.
- **Finding**: the internal map is per graph closure (root and all subgraphs), and `agsubg`
  (`lib/cgraph/subg.c:52-70`) looks the id up in the parent's own subgraphs only. A `%x` used twice
  in one parent is the same subgraph. Under two parents, or nested inside itself, it is two
  subgraphs that share the id and both print `%3`. `subgraph "%foo"` under `digraph "%foo"` takes
  the root's id 1. `subgraph "%3"` after an anonymous `%3` is a new subgraph `%5`: the source
  string is a map key, never an id.
- **Impact**: two subgraphs of one graph tree can carry the same `%N` name; a lookup by name is
  only safe within one parent.
- **Confidence**: High

## Observation: html and text keys differ, except for the root
- **Context**: planning's prototype keyed every local name raw, html marker included.
- **Finding**: the internal map compares string-pool pointers (`imap.c:namecmpf`), and the pool
  keeps html and text strings apart, so `"%a"` and `<%a>` get two ids and each is found again by
  its own form. The root is the exception: `agopen` maps its name before the new graph's
  dictionary holds an html ref, so `agstrdup` copies it as text (`refstr.c:401-415`). Under
  `digraph <%foo>`, `subgraph "%foo"` is `%1` and `subgraph <%foo>` is `%3`.
- **Impact**: `buildFromAst` records the root's text; `processSubgraph` records the raw name. The
  same asymmetry already applies to the root's printed name (`builder.ts`, the html root comment).
- **Confidence**: High (probes `html-root-text-sub`, `html-root-html-sub`, `text-root-html-sub`,
  `html-reopen`)

## Observation: a gate run leaves a load spike behind it
- **Context**: `uptime` before the smoke bytediff, straight after `gates.sh` and the corpus tests.
- **Finding**: the one-minute load read 33 (15-minute 11.7) from the session's own vitest runs;
  the bytediff still finished 2352 jobs in two minutes with 0 capped.
- **Impact**: read the 5- and 15-minute figures to tell another queue's sweep from the tail of
  one's own gates; a run that follows the gates directly will see the spike.
- **Confidence**: Medium (one run)
