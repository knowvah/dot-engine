---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Läs beräknad geometri

`getLayout` returnerar en enkel, JSON-serialiserbar ögonblicksbild av grafens beräknade
nodpositioner, kantsplinepunkter och begränsningsruta — efter att layouten har körts.

## Grundläggande användning

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

`render` lägger ut grafen före renderingen. Den beräknade geometrin (`coord`,
`width`, `height` på varje nod; splinens `points` på varje kant) behålls på
grafobjektet efter att `render` har returnerat och kan läsas via `getLayout`.

## Ögonblicksbildens form

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

## Enheter

Alla koordinater och mått anges i **punkter** (1 tum = 72 punkter),
vilket är Graphviz inbyggda enhet.

Nodernas `width` och `height` lagras internt i tum i modellen;
`getLayout` räknar om dem till punkter innan de returneras.

## Koordinatsystem (`yAxis`)

Graphviz inbyggda koordinatsystem har y uppåt (origo i nedre vänstra hörnet).
Skärm- och webbläsarkontexter har y nedåt (origo i övre vänstra hörnet).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origo | y-riktning | Använd när |
|---|---|---|---|
| `'down'` (standard) | uppe till vänster | ökar nedåt | canvas, SVG, HTML |
| `'up'` | nere till vänster | ökar uppåt | inbyggd Graphviz-utdata, PDF |

I y-nedåt-läge normaliseras origo för `bounds` till `(0, 0)`. I y-uppåt-läge
speglar `bounds.x` och `bounds.y` det råa nedre vänstra hörnet av grafens
begränsningsruta.

## Signatur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` ändrar inte grafen. Anropa den så många gånger som behövs efter
layouten.
