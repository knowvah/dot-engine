# Survey design: issue #187

## Probes

The failure needs a flat-adjacent group with a port whose aux layout fails.
Aux `dotMincross` failures were not reached. Aux `dotPosition` fails when
`make_edge_pairs`'s aux edge exceeds `INT_MAX` (#162). The aux graph is
rotated, so a `:s`/`:n` port offset on a node with `height=40000000`
(2.88e9 pt) becomes an x offset there. In the main graph the same ports have
x offset 0, so the main layout succeeds. `p2` (huge `width`) is the
contrast: it fails in the main `dot_position` instead.

| Probe | Path it reaches | Native |
|---|---|---|
| `p1` | the minimal case | exit 1, edge unrouted, `bb` untranslated |
| `p2` | control: main position fails | exit 1, `bb="0,0,0,0"` |
| `p3` | control: one huge node, `:e`/`:w`, no failure | exit 0 |
| `p4` | a later cross-rank edge (`c -> a`) | exit 1, `c -> a` unrouted |
| `p5` | `dir=back`: `routeEdgeNonForward` | exit 1 |
| `p6` | `rankdir=LR` (`GD_flip`), huge `width`, `:e`/`:w` | exit 1 |
| `p7` | a successful flat-adj group before the failing one | exit 1; dot omits the first group's `pos` (#275); xdot segfaults |
| `p8` | control: labels make the aux layout succeed | exit 0, a reclaim warning (#276) |
| `p9` | undirected graph | exit 1 |
| `p10` | `compound=true`, a cluster, `lhead` | exit 1 |
| `p11` | two parallel ported edges plus an opposing `b -> a` | exit 1 |
| `p12` | `splines=polyline` | exit 1 |

Formats are dot, xdot and svg, on the dot engine only, since
`make_flat_adj_edges` is dot's.

## Reach

From #137 (`plans/issue-137-routedotedges-comments/decision-journal.md` row
10): a marker bundle over 1184 corpus and golden inputs (13 capped, none able
to reach the function) found 10 inputs calling `makeFlatAdjEdges`.
`reach-ids.txt` holds the 9 corpus ids, run on the dot engine only. The
golden `c90-dot-flat-adj-both-arrows` and #137's fixtures `f1`..`f8`
(`fixtures/`) run through `--file`. With the prototype every call there
succeeds, so the only output change possible is the rc path, and there is
none: 90 of 90 identical.
