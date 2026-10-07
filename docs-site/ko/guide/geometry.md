---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# 계산된 지오메트리 읽기

`getLayout`은 레이아웃이 실행된 이후의, 그래프에서 계산된 노드 위치, 에지 스플라인 점, 경계
상자를 담은 평범한 JSON 직렬화 가능 스냅샷을 반환합니다.

## 기본 사용법 {#basic-usage}

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

`render`는 렌더링 전에 그래프를 레이아웃합니다. 계산된 지오메트리(각 노드의 `coord`, `width`,
`height`와 각 에지의 스플라인 `points`)는 `render`가 반환된 뒤에도 그래프 객체에 유지되며
`getLayout`으로 읽을 수 있습니다.

## 스냅샷 형태 {#snapshot-shape}

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

## 단위 {#units}

모든 좌표와 크기는 Graphviz의 네이티브 단위에 맞춰 **포인트**(1인치 = 72포인트)입니다.

노드의 `width`와 `height`는 모델 내부에서 인치로 저장되며, `getLayout`이 반환하기 전에
포인트로 변환합니다.

## 좌표계(`yAxis`) {#coordinate-system-yaxis}

Graphviz의 네이티브 좌표계는 y-up입니다(원점은 왼쪽 아래 모서리). 화면과 브라우저 환경은
y-down을 사용합니다(원점은 왼쪽 위 모서리).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | 원점 | y 방향 | 사용할 때 |
|---|---|---|---|
| `'down'`(기본값) | 왼쪽 위 | 아래로 증가 | 캔버스, SVG, HTML |
| `'up'` | 왼쪽 아래 | 위로 증가 | 네이티브 Graphviz 출력, PDF |

y-down 모드에서는 `bounds`의 원점이 `(0, 0)`으로 정규화됩니다. y-up 모드에서는 `bounds.x`와
`bounds.y`가 그래프 경계 상자의 원래 왼쪽 아래 모서리를 반영합니다.

## 시그니처 {#signature}

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout`은 그래프를 수정하지 않습니다. 레이아웃 이후에 필요한 만큼 여러 번 호출하세요.
