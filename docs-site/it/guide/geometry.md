---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Leggere la geometria calcolata

`getLayout` restituisce un'istantanea semplice e serializzabile in JSON delle posizioni
calcolate dei nodi, dei punti delle spline degli archi e del riquadro di delimitazione del grafo — dopo l'esecuzione del layout.

## Uso di base

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

`render` esegue il layout del grafo prima del rendering. La geometria calcolata (`coord`,
`width`, `height` su ogni nodo; `points` delle spline su ogni arco) resta conservata nell'oggetto
grafo dopo il ritorno di `render` ed è leggibile tramite `getLayout`.

## Forma dell'istantanea

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

## Unità

Tutte le coordinate e le dimensioni sono in **punti** (1 pollice = 72 punti),
in linea con l'unità nativa di Graphviz.

Larghezza (`width`) e altezza (`height`) dei nodi sono memorizzate internamente in pollici nel modello;
`getLayout` le converte in punti prima di restituirle.

## Sistema di coordinate (`yAxis`)

Il sistema di coordinate nativo di Graphviz ha la y verso l'alto (origine nell'angolo in basso a sinistra).
I contesti schermo e browser usano la y verso il basso (origine nell'angolo in alto a sinistra).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origine | Direzione di y | Da usare quando |
|---|---|---|---|
| `'down'` (predefinito) | in alto a sinistra | cresce verso il basso | canvas, SVG, HTML |
| `'up'` | in basso a sinistra | cresce verso l'alto | output nativo di Graphviz, PDF |

In modalità y verso il basso l'origine di `bounds` è normalizzata a `(0, 0)`. In modalità y verso l'alto
`bounds.x` e `bounds.y` riflettono l'angolo grezzo in basso a sinistra del riquadro
di delimitazione del grafo.

## Firma

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` non modifica il grafo. Chiamala tutte le volte che serve dopo
il layout.
