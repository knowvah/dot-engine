---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# 讀取計算出的幾何資訊

`getLayout` 會在版面配置執行之後，回傳圖中計算出的節點位置、邊樣條點與邊界框的
純資料、可序列化為 JSON 的快照。

## 基本用法 {#basic-usage}

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

`render` 會在轉譯之前先對圖進行版面配置。計算出的幾何資訊（每個節點的 `coord`、
`width`、`height`；每條邊的樣條 `points`）會在 `render` 回傳之後保留在圖物件上，
並可透過 `getLayout` 讀取。

## 快照的形狀 {#snapshot-shape}

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

## 單位 {#units}

所有座標與尺寸都以**點（points）** 為單位（1 英吋 = 72 點），
與 Graphviz 的原生單位一致。

節點的 `width` 與 `height` 在模型內部以英吋儲存；`getLayout`
會在回傳前將它們轉換為點。

## 座標系統（`yAxis`） {#coordinate-system-yaxis}

Graphviz 原生的座標系統是 y 軸向上（原點在左下角）。
螢幕與瀏覽器環境則使用 y 軸向下（原點在左上角）。

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | 原點 | y 方向 | 適用時機 |
|---|---|---|---|
| `'down'`（預設） | 左上 | 向下遞增 | canvas、SVG、HTML |
| `'up'` | 左下 | 向上遞增 | Graphviz 原生輸出、PDF |

在 y 軸向下模式中，`bounds` 的原點會被正規化為 `(0, 0)`。在 y 軸向上模式中，
`bounds.x` 與 `bounds.y` 反映圖形邊界框原始的左下角。

## 簽章 {#signature}

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` 不會修改圖。版面配置之後，您可以視需要呼叫它任意多次。
