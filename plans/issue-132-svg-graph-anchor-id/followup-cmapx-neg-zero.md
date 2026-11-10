# Draft follow-up issue (file it in T1 step 1; the planner could not)

Title: `cmapx: print -0 in area coords as native's %.0f does`
Labels: `bug`, `follow-up` (not `queue:ready`)

---

Found while planning #132. Native 16.1.0 prints `coords="0,-0,83,59"` for the
graph's area in `-Tcmapx`; the port prints `coords="0,0,83,59"`.

Repro (root render, no subgraph involved):

```
echo 'digraph{URL="x"; a}' | GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -Tcmapx
<area shape="rect" id="graph0" href="x" alt="" coords="0,-0,83,59"/>
```

The port's area line for the same input ends `coords="0,0,83,59"`. The same
difference shows on subgraph renders (`plans/issue-132-svg-graph-anchor-id/harness/`).

**Suspected mechanism (not yet instrumented):** C's `map_output_shape`
(`plugin/core/gvrender_core_map.c:34`) prints each coordinate with `%.0f`, which
prints `-0` for `-0.0` and for any value in `(-0.5, 0)`. The port's
`cmapxCoordsRect`, `cmapxCoordsCircle` and `cmapxCoordsPoly`
(`src/render/map.ts:470-487`) use `String(Math.round(v))`: `String(-0)` is `"0"`,
and `Math.round` rounds halves up where printf `%.0f` rounds exact halves to
even. The imap and ismap branches (same C function, same `%.0f`) need the same
check.

Diagnose before fixing: confirm the y value reaching the formatter is `-0` or a
small negative, and check whether any exact `.5` coordinate reaches it.
