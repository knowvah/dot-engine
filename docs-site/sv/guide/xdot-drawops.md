---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Egen rendering med xdot-ritoperationer

`getDrawOps` lägger ut en graf, renderar den till xdot-format och returnerar en
platt array av typade ritoperationer. Använd den för att styra en egen
renderare (canvas, WebGL, PDF, inbyggt användargränssnitt) utan att tolka SVG.

## Signatur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Grundläggande användning

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

## Operationstyper

Unionen `XdotOp` särskiljs på `op.kind`:

| `kind` | Nyttolastfält | Beskrivning |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Fyll en ellips |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Rita konturen av en ellips |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Fyll en sluten polygon |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Rita konturen av en sluten polygon |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Fyll en sluten bézierkurva |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Rita en öppen bézierkurva |
| `'polyline'` | `op.polyline: XdotPolyline` | Rita en linjekedja |
| `'text'` | `op.text: XdotText` | Rita en textetikett |
| `'fill_color'` | `op.color: string` | Ange aktuell fyllningsfärg |
| `'pen_color'` | `op.color: string` | Ange aktuell linjefärg |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Ange gradientfyllning |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Ange gradientlinje |
| `'font'` | `op.font: XdotFont` | Ange aktuellt teckensnitt |
| `'style'` | `op.style: string` | Ange aktuell ritstil |
| `'image'` | `op.image: XdotImage` | Rita en inbäddad bild |
| `'fontchar'` | `op.fontchar: number` | Ange bitmask för teckensnittstecken |

### Viktiga typer

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinater

xdot-koordinater anges i **punkter**, i graphvizs egna koordinatsystem med
y-axeln uppåt (origo i nedre vänstra hörnet). Vänd y-koordinaterna innan du
ritar på en yta där y pekar nedåt:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operationerna kommer i målarordning: först grafens bakgrund, sedan noder och
därefter kanter.

## Täckning

`getDrawOps` ger hela strömmen av operationer i målarordning för en graf,
inklusive:
- Nodformsoperationer (`filled_ellipse`, `filled_polygon`, `unfilled_polygon`
  med flera)
- Text- och etikettoperationer (`text`)
- Teckensnittsoperationer (`font`)
- Färgoperationer (`fill_color`, `pen_color`), även för egna
  nodattribut som `color`/`fillcolor`
- Kantoperationer (`unfilled_bezier` för splinen, plus `pen_color` /
  `fill_color` / `filled_polygon` för pilspetsen)

För `digraph { a [color=red]; a -> b }` stämmer geometrin i `_draw_`/`_hdraw_`
och färgvärdena exakt överens med inbyggda `dot -Txdot` (nodens ellips, kantens
spline, pilspetsens polygon och det tillämpade `color=red`). Anropa
`getDrawOps(g)` direkt på en ny graf som ännu inte renderats — att anropa
`render(g, ...)` och `getDrawOps(g)` på *samma* grafobjekt kör layouten två
gånger och är inget mönster som stöds; använd det ena eller det andra per graf.

## Canvas-exempel (endast nodetiketter)

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
