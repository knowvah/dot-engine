---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Citirea geometriei calculate

`getLayout` returnează un instantaneu simplu, serializabil în JSON, al pozițiilor calculate ale
nodurilor, al punctelor spline ale muchiilor și al casetei de încadrare a grafului — după ce aranjarea a rulat.

## Utilizare de bază

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

`render` aranjează graful înainte de randare. Geometria calculată (`coord`,
`width`, `height` pentru fiecare nod; `points` ale spline-ului pentru fiecare muchie) este păstrată pe
obiectul graf după ce `render` returnează și poate fi citită prin `getLayout`.

## Structura instantaneului

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

## Unități

Toate coordonatele și dimensiunile sunt în **puncte** (1 inch = 72 de puncte),
potrivit unității native a graphviz.

`width` și `height` ale nodului sunt stocate intern în inchi în model;
`getLayout` le convertește în puncte înainte de a le returna.

## Sistemul de coordonate (`yAxis`)

Sistemul de coordonate nativ al graphviz are y în sus (originea în colțul din stânga jos).
Contextele de ecran și de browser folosesc y în jos (originea în colțul din stânga sus).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origine | Direcția y | Folosiți când |
|---|---|---|---|
| `'down'` (implicit) | stânga sus | crește în jos | canvas, SVG, HTML |
| `'up'` | stânga jos | crește în sus | ieșire graphviz nativă, PDF |

În modul y în jos, originea `bounds` este normalizată la `(0, 0)`. În modul y în sus,
`bounds.x` și `bounds.y` reflectă colțul brut din stânga jos al casetei de încadrare
a grafului.

## Semnătură

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` nu modifică graful. Apelați-o de câte ori este nevoie după
aranjare.
