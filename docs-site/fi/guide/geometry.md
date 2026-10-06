---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Lasketun geometrian lukeminen

`getLayout` palauttaa tavallisen, JSON-serialisoitavan tilannekuvan graafin lasketuista
solmujen sijainneista, kaarten splinipisteistä ja rajauslaatikosta — sen jälkeen, kun asettelu on ajettu.

## Peruskäyttö

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

`render` asettelee graafin ennen renderöintiä. Laskettu geometria (jokaisen solmun `coord`,
`width`, `height`; jokaisen kaaren splinen `points`) säilyy
graafiobjektissa `render`-kutsun palattua ja on luettavissa `getLayout`-funktiolla.

## Tilannekuvan rakenne

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

## Yksiköt

Kaikki koordinaatit ja mitat ovat **pisteinä** (1 tuuma = 72 pistettä),
vastaten graphvizin natiiviyksikköä.

Solmun `width` ja `height` tallennetaan mallissa sisäisesti tuumina;
`getLayout` muuntaa ne pisteiksi ennen palauttamista.

## Koordinaatisto (`yAxis`)

graphvizin natiivikoordinaatisto on y-ylös (origo vasemmassa alakulmassa).
Näyttö- ja selainkonteksteissa käytetään y-alas (origo vasemmassa yläkulmassa).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origo | y:n suunta | Käytä, kun |
|---|---|---|---|
| `'down'` (oletus) | vasen yläkulma | kasvaa alaspäin | canvas, SVG, HTML |
| `'up'` | vasen alakulma | kasvaa ylöspäin | natiivi graphviz-tuloste, PDF |

y-alas-tilassa `bounds`-arvon origo normalisoidaan pisteeseen `(0, 0)`. y-ylös-tilassa
`bounds.x` ja `bounds.y` heijastavat graafin rajauslaatikon raakaa vasenta alakulmaa.

## Allekirjoitus

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` ei muuta graafia. Kutsu sitä niin monta kertaa kuin tarvitaan asettelun
jälkeen.
