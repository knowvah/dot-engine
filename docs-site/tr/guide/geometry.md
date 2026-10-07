---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Hesaplanan geometriyi okuma

`getLayout`, yerleşim çalıştıktan sonra grafın hesaplanan düğüm konumlarının, kenar
spline noktalarının ve sınırlayıcı kutusunun düz, JSON'a serileştirilebilir bir anlık
görüntüsünü döndürür.

## Temel kullanım

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

`render`, işlemeden önce grafı yerleştirir. Hesaplanan geometri (her düğümde `coord`,
`width`, `height`; her kenarda spline `points`), `render` döndükten sonra graf nesnesi
üzerinde saklanır ve `getLayout` ile okunabilir.

## Anlık görüntü şekli

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

## Birimler

Tüm koordinatlar ve boyutlar, graphviz'in yerel birimiyle eşleşen **nokta (point)**
cinsindendir (1 inç = 72 nokta).

Düğüm `width` ve `height` değerleri modelde dahilen inç olarak saklanır; `getLayout`
bunları döndürmeden önce noktaya çevirir.

## Koordinat sistemi (`yAxis`)

graphviz'in yerel koordinat sistemi y-yukarı yönlüdür (başlangıç noktası sol alt köşe).
Ekran ve tarayıcı bağlamları y-aşağı yönlü düzen kullanır (başlangıç noktası sol üst köşe).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Başlangıç noktası | y yönü | Ne zaman kullanılır |
|---|---|---|---|
| `'down'` (varsayılan) | sol üst | aşağı doğru artar | canvas, SVG, HTML |
| `'up'` | sol alt | yukarı doğru artar | yerel graphviz çıktısı, PDF |

y-aşağı kipinde `bounds` başlangıç noktası `(0, 0)` olarak normalleştirilir. y-yukarı
kipinde `bounds.x` ve `bounds.y`, graf sınırlayıcı kutusunun ham sol alt köşesini yansıtır.

## İmza

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` grafı değiştirmez. Yerleşimden sonra gerektiği kadar çağırabilirsiniz.
