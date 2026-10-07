---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Čítanie vypočítanej geometrie

`getLayout` vracia obyčajný snímok serializovateľný do JSON s vypočítanými
polohami uzlov, bodmi splajnov hrán a ohraničujúcim rámcom grafu — po tom, čo sa rozloženie vykonalo.

## Základné použitie

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

`render` pred vykreslením graf rozloží. Vypočítaná geometria (`coord`,
`width`, `height` pri každom uzle; `points` splajnu pri každej hrane) zostáva po návrate z `render`
uložená v objekte grafu a dá sa prečítať cez `getLayout`.

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

Všetky súradnice a rozmery sú v **bodoch** (1 palec = 72 bodov),
v súlade s natívnou jednotkou graphviz.

Šírka a výška uzla (`width` a `height`) sa v modeli ukladajú interne v palcoch;
`getLayout` ich pred vrátením prevedie na body.

## Súradnicová sústava (`yAxis`)

Natívna súradnicová sústava graphviz má os y smerom nahor (začiatok v ľavom dolnom rohu).
Kontexty obrazovky a prehliadača používajú os y smerom nadol (začiatok v ľavom hornom rohu).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Začiatok | Smer y | Použite, keď |
|---|---|---|---|
| `'down'` (štandardne) | vľavo hore | rastie nadol | canvas, SVG, HTML |
| `'up'` | vľavo dole | rastie nahor | natívny výstup graphviz, PDF |

V režime y-nadol sa začiatok `bounds` normalizuje na `(0, 0)`. V režime y-nahor
`bounds.x` a `bounds.y` odrážajú surový ľavý dolný roh ohraničujúceho rámca
grafu.

## Signatúra

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` graf nemení. Po rozložení ho môžete volať ľubovoľne veľakrát.
