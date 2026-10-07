---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Odczyt obliczonej geometrii

`getLayout` zwraca zwykły, serializowalny do JSON snapshot obliczonych pozycji
węzłów, punktów spline'ów krawędzi i ramki ograniczającej grafu — po wykonaniu układu.

## Podstawowe użycie

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

`render` liczy układ grafu przed renderowaniem. Obliczona geometria (`coord`,
`width`, `height` każdego węzła; `points` spline'u każdej krawędzi) jest przechowywana
w obiekcie grafu po powrocie z `render` i można ją odczytać przez `getLayout`.

## Kształt snapshotu

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

## Jednostki

Wszystkie współrzędne i wymiary są w **punktach** (1 cal = 72 punkty),
zgodnie z natywną jednostką Graphviz.

Szerokość i wysokość węzła (`width` i `height`) są wewnętrznie przechowywane w modelu
w calach; `getLayout` przelicza je na punkty przed zwróceniem.

## Układ współrzędnych (`yAxis`)

Natywny układ współrzędnych Graphviz ma oś y skierowaną w górę (początek w lewym dolnym rogu).
Konteksty ekranowe i przeglądarkowe używają osi y skierowanej w dół (początek w lewym górnym rogu).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Początek | Kierunek y | Użyj, gdy |
|---|---|---|---|
| `'down'` (domyślnie) | lewy górny | rośnie w dół | canvas, SVG, HTML |
| `'up'` | lewy dolny | rośnie w górę | natywne wyjście Graphviz, PDF |

W trybie y w dół początek `bounds` jest normalizowany do `(0, 0)`. W trybie y w górę
`bounds.x` i `bounds.y` odzwierciedlają surowy lewy dolny róg ramki ograniczającej grafu.

## Sygnatura

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` nie modyfikuje grafu. Wywołuj go tyle razy, ile trzeba, po wykonaniu układu.
