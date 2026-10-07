---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Ler a geometria calculada

`getLayout` retorna um snapshot simples e serializável em JSON das posições
calculadas dos nós, dos pontos de spline das arestas e da caixa delimitadora do
grafo — depois que o layout foi executado.

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

`render` executa o layout do grafo antes de renderizar. A geometria calculada
(`coord`, `width`, `height` em cada nó; `points` da spline em cada aresta) fica
retida no objeto de grafo depois que `render` retorna e pode ser lida por meio de
`getLayout`.

## Formato do snapshot

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

Todas as coordenadas e dimensões estão em **pontos** (1 polegada = 72 pontos),
conforme a unidade nativa do Graphviz.

A `width` e a `height` dos nós são armazenadas internamente em polegadas no
modelo; `getLayout` as converte para pontos antes de retornar.

## Sistema de coordenadas (`yAxis`)

O sistema de coordenadas nativo do Graphviz tem y para cima (origem no canto
inferior esquerdo). Contextos de tela e de navegador usam y para baixo (origem no
canto superior esquerdo).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origem | Direção de y | Use quando |
|---|---|---|---|
| `'down'` (padrão) | canto superior esquerdo | aumenta para baixo | canvas, SVG, HTML |
| `'up'` | canto inferior esquerdo | aumenta para cima | saída nativa do Graphviz, PDF |

No modo y para baixo, a origem de `bounds` é normalizada para `(0, 0)`. No modo y
para cima, `bounds.x` e `bounds.y` refletem o canto inferior esquerdo bruto da
caixa delimitadora do grafo.

## Assinatura

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` não modifica o grafo. Chame-o quantas vezes forem necessárias depois
do layout.
