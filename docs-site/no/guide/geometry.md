---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Les beregnet geometri

`getLayout` returnerer et vanlig, JSON-serialiserbart øyeblikksbilde av grafens beregnede
nodeposisjoner, kantsplinepunkter og avgrensningsboks — etter at layout har kjørt.

## Grunnleggende bruk

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

`render` legger ut grafen før den rendres. Den beregnede geometrien (`coord`,
`width`, `height` på hver node; spline-`points` på hver kant) beholdes på
grafobjektet etter at `render` har returnert, og kan leses via `getLayout`.

## Øyeblikksbildets form

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

Alle koordinater og dimensjoner er i **punkter** (1 tomme = 72 punkter),
i samsvar med Graphviz' native enhet.

Nodens `width` og `height` lagres internt i tommer på modellen;
`getLayout` konverterer dem til punkter før den returnerer.

## Koordinatsystem (`yAxis`)

Graphviz' native koordinatsystem er y-opp (origo i nedre venstre hjørne).
Skjerm- og nettleserkontekster bruker y-ned (origo i øvre venstre hjørne).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origo | y-retning | Bruk når |
|---|---|---|---|
| `'down'` (standard) | øverst til venstre | øker nedover | canvas, SVG, HTML |
| `'up'` | nederst til venstre | øker oppover | native Graphviz-utdata, PDF |

I y-ned-modus normaliseres origo for `bounds` til `(0, 0)`. I y-opp-modus
gjenspeiler `bounds.x` og `bounds.y` det rå nedre venstre hjørnet av grafens
avgrensningsboks.

## Signatur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` endrer ikke grafen. Kall den så mange ganger du trenger etter
layout.
