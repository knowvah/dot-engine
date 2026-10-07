---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Berekende geometrie uitlezen

`getLayout` geeft een eenvoudige, naar JSON serialiseerbare momentopname terug van de berekende
knooppunten, kantspline-punten en omhullende rechthoek van de graaf —
nadat de lay-out is uitgevoerd.

## Basisgebruik

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

`render` deelt de graaf in voordat het rendert. De berekende geometrie (`coord`,
`width`, `height` op elke knoop; spline-`points` op elke kant) blijft na het
terugkeren van `render` op het graafobject bewaard en is leesbaar via `getLayout`.

## Vorm van de momentopname

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

## Eenheden

Alle coördinaten en afmetingen staan in **punten** (1 inch = 72 punten),
overeenkomstig de native eenheid van Graphviz.

`width` en `height` van knopen worden in het model intern in inches opgeslagen; `getLayout`
rekent ze vóór het teruggeven om naar punten.

## Coördinatenstelsel (`yAxis`)

Het native coördinatenstelsel van Graphviz is y-omhoog (oorsprong in de linkeronderhoek).
Scherm- en browsercontexten gebruiken y-omlaag (oorsprong in de linkerbovenhoek).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Oorsprong | y-richting | Gebruiken wanneer |
|---|---|---|---|
| `'down'` (standaard) | linksboven | neemt omlaag toe | canvas, SVG, HTML |
| `'up'` | linksonder | neemt omhoog toe | native Graphviz-uitvoer, PDF |

In de y-omlaag-modus wordt de oorsprong van `bounds` genormaliseerd naar `(0, 0)`. In de
y-omhoog-modus geven `bounds.x` en `bounds.y` de ruwe linkeronderhoek van de
omhullende rechthoek van de graaf weer.

## Signatuur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` wijzigt de graaf niet. Roep het na de lay-out zo vaak aan als
nodig is.
