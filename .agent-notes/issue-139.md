# issue-139 mission — observations (2026-11-10)

## Observation: a name starting with `%` is no name in cgraph
- **Context**: the brief's AD-1 made the root header read `g.anonymous` alone.
- **Finding**: `agmapnametoid` (`lib/cgraph/id.c:104-131`) skips the string map when
  `str[0] == LOCALNAMEPREFIX`, so `digraph "%foo" {` is an anonymous root (`agnameof` is `%1`) and
  native writes `digraph {`. The base handled that through `isAnonymous`'s `%` test; the AD-1 edit as
  written would have printed `digraph "%foo" {`. The writer now tests `agNameOf(g)` for the prefix,
  for root and subgraph alike, which is `write_hdr`'s own test. The parser still stores `%foo` as the
  name (cmapx `<map id="%foo">`, json names): #194.
- **Impact**: an anonymity test in a writer is "`agnameof` starts with `%`", never "name is empty"
  and never the `anonymous` flag alone. No corpus input has a `%`-prefixed graph name, so only
  `harness/root-percent.gv` pins it.
- **Confidence**: High

## Observation: surveys cannot see a graph-name defect
- **Context**: gate 6 for a header-only change.
- **Finding**: `compareJson` skips the top-level `name` (`RESERVED_TOP`), and the dot-parity
  comparator passed `1896` with `digraph {` against native's `digraph "" {`. The smoke bytediff's
  default formats (`svg,xdot,json,plain,cmapx`) leave out `dot`; `BD_FORMATS=...,dot` adds it
  (2352 jobs, about three minutes at 5 lanes).
- **Impact**: a change to `write_hdr`-level text needs byte comparison of dot and xdot against
  native; the parity files will not move.
- **Confidence**: High

## Observation: `1864` and `2621` finish under osage, and `2621` under neato
- **Context**: the four corpus ids with a `""` graph or subgraph name are `1864`, `1896`, `2734`
  (root) and `2621` (subgraph).
- **Finding**: per render, 16.1.0 native and the port: `2621 -Kosage` 0.1 s and 0.7 s; `2621 -Kneato`
  5 s and 59 s; `1864 -Kosage` 1-5 s and 25-45 s. `2621` under dot and circo, and `1864` under dot,
  neato and circo, did not finish inside 60 s (120 s for `2621` circo) on either side; the port runs
  out of a 1536 MB heap on `1864 -Kdot` after 16 s. The long `-Kdot -Tdot` runs are in the decision
  journal row for #139.
- **Impact**: a writer-level check on these two ids can use osage; a dot-layout check cannot use
  them inside a queue session.
- **Confidence**: High

## Observation: `diff` line counts on a 250,000-line output are not minimal
- **Context**: `1864 -Kosage -Tdot`, base and head against native.
- **Finding**: base and head differ in line 1 only, and head's line 1 equals native's, yet plain
  `diff | grep -c '^[<>]'` gave 163768 for base and 163786 for head. A positional compare (the three
  outputs have the same line count) gives 81769 and 81768, and `diff -d` gives 163539 and 163537.
- **Impact**: do not read a growing plain-`diff` count on a large output as a regression; compare
  by position when the line counts match, else use `diff -d`.
- **Confidence**: High

## Observation: `LOCALNAMEPREFIX` is exported; two bare `'%'` tests remain
- **Context**: replacing `0x25` in `agwrite.ts`.
- **Finding**: `src/model/cgraph-ops.ts` now exports `LOCALNAMEPREFIX`. `src/render/svg-graph.ts:157`
  and `:373` still test `g.name[0] !== '%'` inline (SVG was out of scope). The parser's test-only
  `serialize()` (`src/parser/index.ts:serializeHeader`) prints the name by truthiness, so it writes
  `digraph {` for a root named `""`; it is not exported from `src/index.ts`.
- **Impact**: candidates for a cleanup commit; neither changes an output native compares.
- **Confidence**: High
