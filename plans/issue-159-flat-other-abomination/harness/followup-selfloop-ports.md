<!-- Filed by T2 of plans/issue-159-flat-other-abomination. Counts re-measured on base d6636b15 and head 48f29c2c on 2026-11-16. -->
Found while planning #159 (`plans/issue-159-flat-other-abomination/`, `chore/issue-queue`); diagnosed while executing it.

**Input** (`harness/probe-g5.gv` in that brief):

```
digraph G { a -> a:s [label="s"]; a -> a; a -> b; }
```

`-Tplain` differs from native 16.1.1 by 4 lines (the two loop `edge` lines), on
the base (`d6636b15`) and with #159's change alike. Native puts the unported
loop inside (right extent x 1.0) and the `:s` loop outside (x 1.25, label at
x 1.2878), both leaving from the node centre; the port has them the other way
round (`:s` loop at x 1.0 with its label at 1.0378, the unported loop at 1.25),
both ending at the `:s` port.

**Mechanism (measured, not fixed):** the port's self-loop edge-type constants
are not C's. `src/layout/dot/splines.ts:38-40` has `SELFNPEDGE = 3`,
`SELFWPEDGE = 4`, `EDGETYPEMASK = 7`; C has `SELFWPEDGE 4`, `SELFNPEDGE 8`,
`EDGETYPEMASK 15` (`lib/common/const.h:150-155`). `edgecmp`'s first key sorts
the larger type first (`lib/dotgen/dotsplines.c:edgecmp`, the port's
`splines.ts:247`), so C routes a node's unported loops before its ported ones
and the port routes them after. Every loop of a node shares one main edge
(`class2.c:206-210`, `merge_oneway`), and the group loop compares an unported
loop by its main edge's ports (`dotsplines.c:351-355`), so here both loops are
one group and `makeSelfEdge` takes the side and end points from the group's
first edge: the unported one in C, the `:s` one in the port.

**Evidence** (`-Tplain` diff lines against native 16.1.1; "consts" = the three
constants set to C's values in a scratch tree):

| input | base | base + consts | head (#159) | head + consts |
|---|---|---|---|---|
| `probe-g5.gv` | 4 | 0 | 4 | 0 |
| `probe-d.gv` (`a -> a:n [label="n"]; a -> a:s [label="s"]; a -> a; a -> b`) | 8 | 8 | 6 | 0 |
| `probe-e.gv` (`a -> a:n; a:e -> a:w; a -> a; a -> b`) | 14 | 14 | 4 | 0 |

`probe-d.gv` and `probe-e.gv` need both changes: #159 made a self-loop
non-adjacent, as C has it, so `groupSize` now splits a node's loops on
`portcmp` as C does; what is left on them is this ordering. `probe-a/b/c/h.gv`
of the brief stay equal to native with the constants changed.

**Not done:** the reach of the change over the corpus (the sort key orders
every unported loop of the graph before every ported one, not only loops of
one node) and its tests. Start with a detector for graphs that hold both a
ported and an unported self-loop.
