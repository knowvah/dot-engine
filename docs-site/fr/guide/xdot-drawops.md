---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Rendu personnalisé avec les opérations de dessin xdot

`getDrawOps` dispose un graphe, le rend au format xdot et renvoie un tableau
plat d’opérations de dessin typées. Utilisez-la pour piloter un moteur de rendu
personnalisé (canvas, WebGL, PDF, interface native) sans analyser de SVG.

## Signature

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Utilisation de base

```ts
import { createGraph, getDrawOps } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a', { shape: 'ellipse', label: 'Start' });
b.addNode('b', { shape: 'box',     label: 'End'   });
b.addEdge('a', 'b');

const ops = getDrawOps(b.graph);

for (const op of ops) {
  switch (op.kind) {
    case 'fill_color':
      // set fill color before drawing a filled shape
      setFillColor(op.color);
      break;
    case 'pen_color':
      setStrokeColor(op.color);
      break;
    case 'font':
      setFont(op.font.name, op.font.size);
      break;
    case 'filled_ellipse':
      fillEllipse(op.ellipse.x, op.ellipse.y, op.ellipse.w, op.ellipse.h);
      break;
    case 'unfilled_ellipse':
      strokeEllipse(op.ellipse.x, op.ellipse.y, op.ellipse.w, op.ellipse.h);
      break;
    case 'filled_polygon':
      fillPolygon(op.polygon.pts);
      break;
    case 'unfilled_polygon':
      strokePolygon(op.polygon.pts);
      break;
    case 'text':
      drawText(op.text.x, op.text.y, op.text.text, op.text.align);
      break;
  }
}
```

## Types d’opérations

L’union `XdotOp` se discrimine sur `op.kind` :

| `kind` | Champ de charge utile | Description |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Remplir une ellipse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Tracer le contour d’une ellipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Remplir un polygone fermé |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Tracer le contour d’un polygone fermé |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Remplir une courbe de Bézier fermée |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Tracer une courbe de Bézier ouverte |
| `'polyline'` | `op.polyline: XdotPolyline` | Tracer une polyligne |
| `'text'` | `op.text: XdotText` | Dessiner une étiquette de texte |
| `'fill_color'` | `op.color: string` | Définir la couleur de remplissage courante |
| `'pen_color'` | `op.color: string` | Définir la couleur de trait courante |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Définir un remplissage en dégradé |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Définir un trait en dégradé |
| `'font'` | `op.font: XdotFont` | Définir la police courante |
| `'style'` | `op.style: string` | Définir le style de dessin courant |
| `'image'` | `op.image: XdotImage` | Dessiner une image intégrée |
| `'fontchar'` | `op.fontchar: number` | Définir le masque de bits des caractéristiques de police |

### Types principaux

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coordonnées

Les coordonnées xdot sont exprimées en **points**, dans le repère natif de
graphviz où l’axe y est orienté vers le haut (origine en bas à gauche).
Inversez les coordonnées y avant de dessiner sur une surface où y est orienté
vers le bas :

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Les opérations arrivent dans l’ordre de peinture : d’abord l’arrière-plan du
graphe, puis les nœuds, puis les arêtes.

## Couverture

`getDrawOps` expose le flux complet d’opérations dans l’ordre de peinture pour
un graphe, notamment :
- Les opérations de forme des nœuds (`filled_ellipse`, `filled_polygon`, `unfilled_polygon`, etc.)
- Les opérations de texte et d’étiquette (`text`)
- Les opérations de police (`font`)
- Les opérations de définition de couleur (`fill_color`, `pen_color`), y compris
  les attributs personnalisés `color`/`fillcolor` des nœuds
- Les opérations de dessin des arêtes (`unfilled_bezier` pour la spline, plus
  `pen_color` / `fill_color` / `filled_polygon` pour la pointe de flèche)

Pour `digraph { a [color=red]; a -> b }`, la géométrie `_draw_`/`_hdraw_` et
les valeurs de couleur correspondent exactement à celles du `dot -Txdot` natif
(ellipse du nœud, spline de l’arête, polygone de la pointe de flèche et
`color=red` appliqué). Appelez `getDrawOps(g)` directement sur un graphe neuf
(pas encore rendu) — appeler `render(g, ...)` puis `getDrawOps(g)` sur le
*même* objet graphe exécute la disposition deux fois et n’est pas un usage
pris en charge ; utilisez l’une ou l’autre par graphe.

## Exemple avec canvas (étiquettes de nœuds uniquement)

```ts
import { parse, getDrawOps } from '@knowvah/dot-engine';

const g = parse(`digraph { a [label="A"]; b [label="B"]; a -> b }`);
const ops = getDrawOps(g);

// Draw on an HTML canvas
const canvas = document.querySelector('canvas')!;
const ctx = canvas.getContext('2d')!;

let font = '14px sans-serif';
for (const op of ops) {
  if (op.kind === 'font') {
    font = `${op.font.size}px ${op.font.name}`;
  } else if (op.kind === 'text') {
    ctx.font = font;
    ctx.fillText(op.text.text, op.text.x, canvas.height - op.text.y);
  } else if (op.kind === 'filled_ellipse') {
    ctx.beginPath();
    ctx.ellipse(
      op.ellipse.x, canvas.height - op.ellipse.y,
      op.ellipse.w / 2, op.ellipse.h / 2,
      0, 0, 2 * Math.PI,
    );
    ctx.fill();
  }
}
```
