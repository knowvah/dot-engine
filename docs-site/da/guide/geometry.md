---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Læs beregnet geometri

`getLayout` returnerer et almindeligt, JSON-serialiserbart snapshot af grafens beregnede
knudepositioner, kantsplinepunkter og afgrænsningsramme — efter at layout er kørt.

## Grundlæggende brug

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

`render` laver layout af grafen, før den renderes. Den beregnede geometri (`coord`,
`width`, `height` på hver knude; splinens `points` på hver kant) bevares på
grafobjektet, efter `render` er returneret, og kan læses via `getLayout`.

## Snapshottets form

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

## Enheder

Alle koordinater og dimensioner er i **points** (1 tomme = 72 points),
svarende til graphviz' native enhed.

Knudens `width` og `height` gemmes internt i tommer på modellen;
`getLayout` konverterer dem til points, før de returneres.

## Koordinatsystem (`yAxis`)

Graphviz' native koordinatsystem har y opad (origo i nederste venstre hjørne).
Skærm- og browserkontekster bruger y nedad (origo i øverste venstre hjørne).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origo | y-retning | Brug når |
|---|---|---|---|
| `'down'` (standard) | øverst til venstre | vokser nedad | canvas, SVG, HTML |
| `'up'` | nederst til venstre | vokser opad | native graphviz-output, PDF |

I y-nedad-tilstand normaliseres `bounds`' origo til `(0, 0)`. I y-opad-tilstand
afspejler `bounds.x` og `bounds.y` det rå nederste venstre hjørne af grafens
afgrænsningsramme.

## Signatur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` ændrer ikke grafen. Kald den så mange gange som nødvendigt efter
layout.
