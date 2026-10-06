---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Čtení vypočtené geometrie

`getLayout` vrací obyčejný snímek serializovatelný do JSON, který obsahuje vypočtené
pozice uzlů, body splinů hran a ohraničující obdélník — po provedení rozvržení.

## Základní použití

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

`render` graf před vykreslením rozvrhne. Vypočtená geometrie (`coord`,
`width`, `height` u každého uzlu; `points` splinu u každé hrany) zůstává uložena v
objektu grafu po návratu z `render` a je čitelná přes `getLayout`.

## Tvar snímku

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

## Jednotky

Všechny souřadnice a rozměry jsou v **bodech** (1 palec = 72 bodů),
tedy v nativní jednotce Graphviz.

Šířka a výška uzlu (`width` a `height`) se v modelu uchovávají interně v palcích;
`getLayout` je před vrácením převede na body.

## Souřadnicová soustava (`yAxis`)

Nativní souřadnicová soustava Graphviz má osu y nahoru (počátek v levém dolním rohu).
Obrazovka a prohlížeč používají osu y dolů (počátek v levém horním rohu).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Počátek | Směr osy y | Použít, když |
|---|---|---|---|
| `'down'` (výchozí) | vlevo nahoře | roste směrem dolů | canvas, SVG, HTML |
| `'up'` | vlevo dole | roste směrem nahoru | nativní výstup Graphviz, PDF |

V režimu s osou y dolů je počátek `bounds` normalizován na `(0, 0)`. V režimu s osou y nahoru
`bounds.x` a `bounds.y` odrážejí surový levý dolní roh ohraničujícího
obdélníku grafu.

## Signatura

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` graf nemění. Po rozvržení ho můžete volat tolikrát, kolikrát je třeba.
