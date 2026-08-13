# Issue 09 (routesplines drops a record-port edge) — dot-engine is CORRECT

**Status: closed 2026-08-13. Not a defect.** The dropped edge is what graphviz's
own C does with this corridor, verified against the C library itself. PlantUML's
Smetana routes it; Smetana is not this port's reference and its divergence is
not a bug here. **Do not "fix" `src/pathplan/shortest.ts` to make this edge
route** — that would be a deliberate divergence from the C, which is the one
thing CLAUDE.md forbids outright.

## Observation: the port's Pshortestpath is faithful — C fails on the same input

- **Context**: plantuml-ts `docs/graphviz-issues/09-routesplines-drops-edge-on-
  record-ports.md`, fixture `json/gejena-99-veme626`, edge `n13->n14`. The
  filed discriminator is exact: with their `jarMeasurer` the layout emits `in
  routesplines, Pshortestpath failed` + `lost n13 n14 edge`; with their
  `DeterministicMeasurer`, neither.
- **Finding**: dumped the exact polygon and endpoints handed to `shortestPath`
  (existing `setRouteDump` hook plus a temporary print in `shortest.ts`, since
  reverted) and fed them to **C's own `libpathplan`**, linked from
  `~/git/graphviz/build/lib/pathplan`:

  | input | C `Pshortestpath` |
  |---|---|
  | polygon as-is (12 pts) | **rc = -1** |
  | duplicate vertex removed (11 pts) | **rc = -1** |
  | vertex order reversed | **rc = -1** |

  C's diagnostic is sharper than ours: `source point not in any triangle`
  (`shortest.c:182`). The source point is strictly *inside* the polygon by an
  independent point-in-polygon test, so it is the **triangulation** of this
  corridor that is degenerate, not the search. Given this corridor, graphviz
  loses this edge.
- **Confidence**: High — measured against the C library, not inferred.

## Observation: every layer feeding it is faithful too

- **The duplicate vertex** the port emitted (`(223.488, 261.546)` twice) is
  C-producible: `routespl.c:358-399` writes box corners unconditionally with no
  dedup guard, exactly as `addForwardCorner`/`addReverseCorner` do. Removing it
  does not change C's verdict (above), so it is not the cause either.
- **The far-left box** (`ll.x = -266.24`, against a node x-range of 10.2–424.2)
  looks like garbage and is not. `computeLeftBound` decrements `MINW` **once per
  rank inside the loop** — and so does C, at `dotsplines.c:278`, inside the
  `for (i = GD_minrank …)` loop that starts at `:272`. Faithful; leave it.
- **The failure handling** matches: `agerrorf` → return NULL → `map_edge` loses
  the edge, same warning text.
- **Confidence**: High.

## Scope of the verification, stated precisely

Faithfulness was established **layer by layer** — the routing primitive against
C's own library on identical input, and the polygon construction, left/right
bounds and failure handling by reading the C. It was *not* established
end-to-end, because this graph cannot be run through native `dot` at all: the
json family's record labels carry plantuml-ts's `_dim_<w>_<h>_` sentinel, which
is Smetana-only (upstream's `hackInitDimensionFromLabel`). Native graphviz has
no such decoding and measures the literal text — confirmed empirically, since
blanking the sentinels makes the failure disappear entirely as every node size
changes.

So the input is not expressible to the oracle, and no end-to-end oracle run is
possible for this family. What could be compared, was; all of it matches.

## For the record: the corridor

```
boxes  [158.756, 297.546]–[179.244, 322.836]
       [-266.244, 261.546]–[223.488, 297.546]
       [155.000, 130.773]–[223.488, 261.546]
start  (169.000, 310.191)     end  (174.000, 131.773)
```

Captured input: engine `-Tdot` of the built graph. If this resurfaces, re-run the
`libpathplan` harness before touching any routing code — the answer has already
been measured once.
