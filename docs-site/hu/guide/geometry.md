---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# A kiszámított geometria kiolvasása

A `getLayout` egyszerű, JSON-ba szerializálható pillanatképet ad vissza a gráf
kiszámított csúcspozícióiról, élspline-pontjairól és befoglaló téglalapjáról — az
elrendezés lefutása után.

## Alapvető használat

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render runs layout and mutates the graph in place.
// Geometry is retained on the graph after render returns.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
// layout.bounds  → { x: 0, y: 0, width: ..., height: ... }
// layout.nodes   → [{ name: 'a', x: ..., y: ..., width: ..., height: ... }, ...]
// layout.edges   → [{ tail: 'a', head: 'b', points: [{x,y}, ...] }]
```

A `render` renderelés előtt elrendezi a gráfot. A kiszámított geometria (minden
csúcson a `coord`, `width`, `height`; minden élen a spline `points`) a `render`
visszatérése után is a gráfobjektumon marad, és a `getLayout`-tal olvasható.

## A pillanatkép alakja

```ts
interface LayoutSnapshot {
  bounds:   BoundsGeometry;        // overall bounding box
  nodes:    NodeGeometry[];        // one entry per node
  edges:    EdgeGeometry[];        // one entry per edge
  clusters: ClusterGeometry[];     // one entry per cluster, nested included
}

interface BoundsGeometry {
  x: number; y: number;            // origin (0,0 in y-down mode)
  width: number; height: number;   // in points
}

interface NodeGeometry {
  name:   string;
  x:      number;   // centre x, in points
  y:      number;   // centre y, in points
  width:  number;   // in points (converted from model inches × 72)
  height: number;   // in points (converted from model inches × 72)
}

interface EdgeGeometry {
  tail:       string;
  head:       string;
  points:     { x: number; y: number }[];  // bezier control points, in points
  label?:     { x: number; y: number };    // centre label position (if present)
  tailLabel?: { x: number; y: number };    // taillabel position (if placed)
  headLabel?: { x: number; y: number };    // headlabel position (if placed)
  xlabel?:    { x: number; y: number };    // xlabel position (if placed)
  sp?:        { x: number; y: number };    // tail arrow attachment (if arrowed)
  ep?:        { x: number; y: number };    // head arrow attachment (if arrowed)
}

interface ClusterGeometry {
  name:   string;   // cluster subgraph name (e.g. cluster6); encodes nesting
  x:      number;   // box corner, same frame convention as bounds
  y:      number;
  width:  number;
  height: number;
  label?: {         // cluster title, if declared
    x: number; y: number;          // centre of the label space
    width: number; height: number; // measured text size
  };
}
```

## Mértékegységek

Minden koordináta és méret **pontban** van megadva (1 hüvelyk = 72 pont), a
Graphviz natív mértékegységében.

A csúcs `width` és `height` értékét a modell belül hüvelykben tárolja; a
`getLayout` visszaadás előtt pontra váltja át őket.

## Koordinátarendszer (`yAxis`)

A Graphviz natív koordinátarendszere y felfelé növekvő (az origó a bal alsó
sarokban van). A képernyő- és böngészőkörnyezetek y lefelé növekvőt használnak
(az origó a bal felső sarokban van).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origó | Az y iránya | Mikor használja |
|---|---|---|---|
| `'down'` (alapértelmezett) | bal felső | lefelé nő | canvas, SVG, HTML |
| `'up'` | bal alsó | felfelé nő | natív Graphviz-kimenet, PDF |

Y lefelé módban a `bounds` origója `(0, 0)`-ra van normalizálva. Y felfelé módban a
`bounds.x` és a `bounds.y` a gráf befoglaló téglalapjának nyers bal alsó sarkát
tükrözi.

## Szignatúra

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

A `getLayout` nem módosítja a gráfot. Az elrendezés után akárhányszor hívhatja.
