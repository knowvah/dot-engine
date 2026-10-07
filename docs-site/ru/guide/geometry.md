---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Чтение вычисленной геометрии

`getLayout` возвращает обычный, сериализуемый в JSON снимок вычисленных позиций узлов,
точек сплайнов рёбер и ограничивающего прямоугольника графа — после того как
компоновка выполнена.

## Базовое использование

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

`render` выполняет компоновку графа перед рендерингом. Вычисленная геометрия (`coord`,
`width`, `height` у каждого узла; `points` сплайна у каждого ребра) сохраняется в
объекте графа после возврата из `render` и читается через `getLayout`.

## Форма снимка

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

## Единицы

Все координаты и размеры задаются в **пунктах** (1 дюйм = 72 пункта), как в нативной
единице Graphviz.

Ширина и высота узла (`width` и `height`) хранятся в модели внутри в дюймах;
`getLayout` переводит их в пункты перед возвратом.

## Система координат (`yAxis`)

Нативная система координат Graphviz направлена вверх по оси y (начало — в нижнем левом
углу). В экранных и браузерных контекстах ось y направлена вниз (начало — в верхнем
левом углу).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Начало | Направление y | Когда использовать |
|---|---|---|---|
| `'down'` (по умолчанию) | вверху слева | растёт вниз | canvas, SVG, HTML |
| `'up'` | внизу слева | растёт вверх | нативный вывод Graphviz, PDF |

В режиме y вниз начало `bounds` нормализуется к `(0, 0)`. В режиме y вверх `bounds.x`
и `bounds.y` отражают необработанный нижний левый угол ограничивающего прямоугольника
графа.

## Сигнатура

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` не изменяет граф. Вызывайте его сколько угодно раз после компоновки.
