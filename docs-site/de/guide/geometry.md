---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Berechnete Geometrie auslesen

`getLayout` gibt einen schlichten, JSON-serialisierbaren Snapshot der berechneten
Knotenpositionen, Kanten-Spline-Punkte und des Begrenzungsrahmens des Graphen zurück —
nachdem das Layout gelaufen ist.

## Grundlegende Verwendung

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

`render` ordnet den Graphen an, bevor es rendert. Die berechnete Geometrie (`coord`,
`width`, `height` an jedem Knoten; Spline-`points` an jeder Kante) bleibt nach der
Rückkehr von `render` am Graph-Objekt erhalten und ist über `getLayout` lesbar.

## Form des Snapshots

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

## Einheiten

Alle Koordinaten und Abmessungen sind in **Punkt** angegeben (1 Zoll = 72 Punkt) und
entsprechen damit der nativen Einheit von Graphviz.

`width` und `height` von Knoten werden im Modell intern in Zoll gespeichert; `getLayout`
rechnet sie vor der Rückgabe in Punkt um.

## Koordinatensystem (`yAxis`)

Das native Koordinatensystem von Graphviz ist y-aufwärts (Ursprung in der unteren linken
Ecke). Bildschirm- und Browserkontexte verwenden y-abwärts (Ursprung in der oberen linken
Ecke).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Ursprung | y-Richtung | Verwenden, wenn |
|---|---|---|---|
| `'down'` (Standard) | oben links | wächst abwärts | Canvas, SVG, HTML |
| `'up'` | unten links | wächst aufwärts | native Graphviz-Ausgabe, PDF |

Im y-abwärts-Modus wird der Ursprung von `bounds` auf `(0, 0)` normalisiert. Im
y-aufwärts-Modus spiegeln `bounds.x` und `bounds.y` die rohe untere linke Ecke des
Graph-Begrenzungsrahmens wider.

## Signatur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` verändert den Graphen nicht. Rufen Sie es nach dem Layout so oft auf, wie
nötig.
