---
sourceHash: 99b4b2dbb78519ce217fac77bfc9de7ee4acf66c29bd6275126747107b60968f
---
# Lire la géométrie calculée

`getLayout` renvoie un instantané simple et sérialisable en JSON des positions calculées des
nœuds, des points de spline des arêtes et de la boîte englobante du graphe — une fois la disposition exécutée.

## Utilisation de base

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

`render` dispose le graphe avant le rendu. La géométrie calculée (`coord`,
`width`, `height` sur chaque nœud ; `points` de spline sur chaque arête) est conservée sur
l’objet graphe après le retour de `render` et peut être lue via `getLayout`.

## Forme de l’instantané

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

## Unités

Toutes les coordonnées et dimensions sont en **points** (1 pouce = 72 points),
conformément à l’unité native de graphviz.

Les `width` et `height` des nœuds sont stockées en interne en pouces dans le modèle ;
`getLayout` les convertit en points avant de les renvoyer.

## Système de coordonnées (`yAxis`)

Le système de coordonnées natif de graphviz a y vers le haut (origine dans le coin inférieur gauche).
Les contextes d’écran et de navigateur utilisent y vers le bas (origine dans le coin supérieur gauche).

```ts
// Default: y-down — origin top-left, y increases downward (screen convention)
const screen = getLayout(g);

// y-up — native graphviz coordinates, origin bottom-left
const native = getLayout(g, { yAxis: 'up' });
```

| `yAxis` | Origine | Sens de y | À utiliser quand |
|---|---|---|---|
| `'down'` (par défaut) | en haut à gauche | croît vers le bas | canvas, SVG, HTML |
| `'up'` | en bas à gauche | croît vers le haut | sortie graphviz native, PDF |

En mode y vers le bas, l’origine de `bounds` est normalisée à `(0, 0)`. En mode y vers le haut,
`bounds.x` et `bounds.y` reflètent le coin inférieur gauche brut de la boîte englobante
du graphe.

## Signature

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

`getLayout` ne modifie pas le graphe. Appelez-la autant de fois que nécessaire après
la disposition.
