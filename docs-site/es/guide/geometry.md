---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Leer la geometría calculada

`getLayout` devuelve una instantánea simple y serializable a JSON de las posiciones calculadas de los
nodos, los puntos de los splines de las aristas y la caja delimitadora del grafo, una vez ejecutado el diseño.

## Uso básico

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

`render` calcula el diseño del grafo antes de renderizar. La geometría calculada (`coord`,
`width`, `height` en cada nodo; los `points` del spline en cada arista) se conserva en
el objeto grafo después de que `render` retorne y se puede leer mediante `getLayout`.

## Forma de la instantánea

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

## Unidades

Todas las coordenadas y dimensiones están en **puntos** (1 pulgada = 72 puntos),
igual que la unidad nativa de graphviz.

El `width` y el `height` de los nodos se almacenan internamente en pulgadas en el modelo;
`getLayout` los convierte a puntos antes de devolverlos.

## Sistema de coordenadas (`yAxis`)

El sistema de coordenadas nativo de graphviz tiene el eje y hacia arriba (origen en la esquina inferior izquierda).
Los contextos de pantalla y navegador usan el eje y hacia abajo (origen en la esquina superior izquierda).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origen | Dirección de y | Úsalo cuando |
|---|---|---|---|
| `'down'` (por defecto) | arriba a la izquierda | aumenta hacia abajo | canvas, SVG, HTML |
| `'up'` | abajo a la izquierda | aumenta hacia arriba | salida nativa de graphviz, PDF |

En el modo con el eje y hacia abajo, el origen de `bounds` se normaliza a `(0, 0)`. En el modo con el eje y hacia arriba,
`bounds.x` y `bounds.y` reflejan la esquina inferior izquierda real de la caja
delimitadora del grafo.

## Firma

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` no modifica el grafo. Llámalo tantas veces como haga falta después del
diseño.
