---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# 計算済みジオメトリを読む

`getLayout` は、レイアウトの実行後に、グラフの計算済みのノード位置、エッジのスプラインの点、
バウンディングボックスを、JSON にシリアライズ可能なプレーンなスナップショットとして返します。

## 基本的な使い方 {#basic-usage}

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

`render` はレンダリングの前にグラフをレイアウトします。計算されたジオメトリ
（各ノードの `coord`、`width`、`height`、各エッジのスプラインの `points`）は、`render` が返った後も
グラフオブジェクトに保持され、`getLayout` で読み取れます。

## スナップショットの形 {#snapshot-shape}

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

## 単位 {#units}

すべての座標と寸法は、Graphviz ネイティブの単位に合わせた**ポイント**
（1 インチ = 72 ポイント）です。

ノードの `width` と `height` は、モデル内部ではインチで保持されています。
`getLayout` は、返す前にそれらをポイントに変換します。

## 座標系（`yAxis`） {#coordinate-system-yaxis}

Graphviz ネイティブの座標系は y 軸が上向きです（原点は左下隅）。
画面やブラウザーでは y 軸が下向きです（原点は左上隅）。

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | 原点 | y の方向 | 使う場面 |
|---|---|---|---|
| `'down'`（既定） | 左上 | 下向きに増加 | canvas、SVG、HTML |
| `'up'` | 左下 | 上向きに増加 | Graphviz ネイティブの出力、PDF |

y 軸下向きモードでは、`bounds` の原点は `(0, 0)` に正規化されます。y 軸上向きモードでは、
`bounds.x` と `bounds.y` は、グラフのバウンディングボックスの元の左下隅をそのまま反映します。

## シグネチャ {#signature}

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` はグラフを変更しません。レイアウトの後なら、何度でも必要なだけ呼び出せます。
