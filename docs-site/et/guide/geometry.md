---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Arvutatud geomeetria lugemine

`getLayout` tagastab graafi arvutatud sõlmede asukohtade, servade splainipunktide
ja piirkasti lihtsa, JSON-iks serialiseeritava hetktõmmise — pärast paigutuse käivitamist.

## Põhikasutus

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

`render` paigutab graafi enne renderdamist. Arvutatud geomeetria (iga sõlme `coord`,
`width`, `height`; iga serva splaini `points`) jääb pärast `render`-i naasmist
graafiobjekti külge alles ja on loetav funktsiooniga `getLayout`.

## Hetktõmmise kuju

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

## Ühikud

Kõik koordinaadid ja mõõtmed on **punktides** (1 toll = 72 punkti),
vastavalt Graphvizi natiivsele ühikule.

Sõlme `width` ja `height` hoitakse mudelis sisemiselt tollides;
`getLayout` teisendab need enne tagastamist punktideks.

## Koordinaatsüsteem (`yAxis`)

Graphvizi natiivne koordinaatsüsteem on y-üles (alguspunkt alumises vasakus nurgas).
Ekraani- ja brauserikontekstid kasutavad y-alla (alguspunkt ülemises vasakus nurgas).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Alguspunkt | y suund | Kasutage, kui |
|---|---|---|---|
| `'down'` (vaikimisi) | üleval vasakul | kasvab allapoole | canvas, SVG, HTML |
| `'up'` | all vasakul | kasvab ülespoole | natiivne Graphvizi väljund, PDF |

y-alla režiimis normaliseeritakse `bounds` alguspunkt väärtusele `(0, 0)`. y-üles režiimis
kajastavad `bounds.x` ja `bounds.y` graafi piirkasti toorest alumist vasakut nurka.

## Signatuur

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` ei muuda graafi. Kutsuge seda pärast paigutust nii mitu korda, kui vaja.
