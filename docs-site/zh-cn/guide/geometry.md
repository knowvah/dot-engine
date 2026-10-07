---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# 读取计算出的几何信息

`getLayout` 返回图在布局运行之后计算出的节点位置、边样条点和边界框的纯 JSON 可序列化快照。

## 基本用法

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

`render` 会在渲染之前对图进行布局。计算出的几何信息（每个节点上的 `coord`、`width`、`height`，
以及每条边上的样条 `points`）在 `render` 返回之后仍保留在图对象上，并可通过 `getLayout` 读取。

## 快照结构

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

## 单位

所有坐标和尺寸的单位均为**点**（1 英寸 = 72 点），与 Graphviz 的原生单位一致。

节点的 `width` 和 `height` 在模型内部以英寸存储；`getLayout` 在返回之前会将它们转换为点。

## 坐标系（`yAxis`）

Graphviz 的原生坐标系是 y 轴向上（原点在左下角）。屏幕和浏览器环境使用 y 轴向下（原点在左上角）。

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | 原点 | y 方向 | 适用场景 |
|---|---|---|---|
| `'down'`（默认） | 左上角 | 向下增大 | canvas、SVG、HTML |
| `'up'` | 左下角 | 向上增大 | 原生 Graphviz 输出、PDF |

在 y 轴向下模式下，`bounds` 的原点被规范化为 `(0, 0)`。在 y 轴向上模式下，
`bounds.x` 和 `bounds.y` 反映图边界框原始的左下角。

## 签名

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` 不会修改图。布局之后可根据需要多次调用。
