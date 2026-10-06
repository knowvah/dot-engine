---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Lesa reiknaða rúmfræði

`getLayout` skilar einfaldri, JSON-raðanlegri skyndimynd af reiknuðum staðsetningum
hnúta, splínupunktum leggja og umgjörð grafsins — eftir að uppsetning hefur keyrt.

## Grunnnotkun

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

`render` raðar grafinu upp áður en það teiknar. Reiknaða rúmfræðin (`coord`,
`width`, `height` á hverjum hnút; splínu-`points` á hverjum legg) er geymd á
grafhlutnum eftir að `render` skilar og er læsileg með `getLayout`.

## Lögun skyndimyndar

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

## Einingar

Öll hnit og víddir eru í **punktum** (1 tomma = 72 punktar),
sem er upprunaleg eining graphviz.

Breidd (`width`) og hæð (`height`) hnúta eru geymd í tommum í líkaninu;
`getLayout` umbreytir þeim í punkta áður en það skilar.

## Hnitakerfi (`yAxis`)

Upprunalegt hnitakerfi graphviz er y-upp (upphafspunktur í neðra vinstra horni).
Skjá- og vafrasamhengi nota y-niður (upphafspunktur í efra vinstra horni).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Upphafspunktur | Stefna y | Notaðu þegar |
|---|---|---|---|
| `'down'` (sjálfgefið) | efst til vinstri | eykst niður á við | canvas, SVG, HTML |
| `'up'` | neðst til vinstri | eykst upp á við | upprunalegt graphviz-úttak, PDF |

Í y-niður ham er upphafspunktur `bounds` staðlaður á `(0, 0)`. Í y-upp ham
sýna `bounds.x` og `bounds.y` hráa neðra vinstra horn umgjarðar
grafsins.

## Undirskrift

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` breytir ekki grafinu. Kallaðu á það eins oft og þarf eftir
uppsetningu.
