---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Eigen rendering met xdot-tekenbewerkingen

`getDrawOps` legt een graaf uit, rendert die naar het xdot-formaat en geeft een
platte array van getypeerde tekenbewerkingen terug. Gebruik dit om een eigen
renderer (canvas, WebGL, PDF, native UI) aan te sturen zonder SVG te hoeven
parsen.

## Signatuur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Basisgebruik

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

## Soorten bewerkingen

De `XdotOp`-union onderscheidt op `op.kind`:

| `kind` | Payloadveld | Beschrijving |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Een ellips vullen |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | De omtrek van een ellips tekenen |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Een gesloten veelhoek vullen |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | De omtrek van een gesloten veelhoek tekenen |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Een gesloten bezierkromme vullen |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Een open bezierkromme tekenen |
| `'polyline'` | `op.polyline: XdotPolyline` | Een polylijn tekenen |
| `'text'` | `op.text: XdotText` | Een tekstlabel tekenen |
| `'fill_color'` | `op.color: string` | De huidige vulkleur instellen |
| `'pen_color'` | `op.color: string` | De huidige lijnkleur instellen |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Een kleurverloop als vulling instellen |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Een kleurverloop als lijnkleur instellen |
| `'font'` | `op.font: XdotFont` | Het huidige lettertype instellen |
| `'style'` | `op.style: string` | De huidige tekenstijl instellen |
| `'image'` | `op.image: XdotImage` | Een ingesloten afbeelding tekenen |
| `'fontchar'` | `op.fontchar: number` | Het bitmasker voor lettertype-eigenschappen instellen |

### Belangrijkste typen

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coördinaten

xdot-coördinaten zijn in **punten**, in het eigen y-omhoog-assenstelsel van
graphviz (oorsprong linksonder). Spiegel de y-coördinaten voordat u op een
y-omlaag-vlak tekent:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Bewerkingen komen aan in tekenvolgorde: eerst de grafachtergrond, dan de
knopen, dan de kanten.

## Dekking

`getDrawOps` levert de volledige stroom bewerkingen in tekenvolgorde voor een
graaf, onder andere:
- Bewerkingen voor knoopvormen (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon`, enzovoort)
- Tekst- en labelbewerkingen (`text`)
- Lettertypebewerkingen (`font`)
- Bewerkingen die kleuren instellen (`fill_color`, `pen_color`), inclusief
  eigen knoopattributen `color`/`fillcolor`
- Tekenbewerkingen voor kanten (`unfilled_bezier` voor de spline, plus
  `pen_color` / `fill_color` / `filled_polygon` voor de pijlpunt)

Voor `digraph { a [color=red]; a -> b }` komen de `_draw_`-/`_hdraw_`-geometrie
en de kleurwaarden exact overeen met die van de native `dot -Txdot` (knoopellips,
kantspline, pijlpuntveelhoek en de toegepaste `color=red`). Roep `getDrawOps(g)`
rechtstreeks aan op een verse (nog niet gerenderde) graaf: `render(g, ...)` en
`getDrawOps(g)` aanroepen op *hetzelfde* graafobject voert de lay-out twee keer
uit en is geen ondersteund patroon; gebruik per graaf het een of het ander.

## Canvasvoorbeeld (alleen knooplabels)

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
