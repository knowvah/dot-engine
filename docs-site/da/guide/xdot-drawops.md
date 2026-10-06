---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Egen rendering med xdot-tegneoperationer

`getDrawOps` lægger en graf ud, renderer den til xdot-format og returnerer et
fladt array af typede tegneoperationer. Brug det til at styre en egen renderer
(canvas, WebGL, PDF, native brugerflade) uden at parse SVG.

## Signatur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Grundlæggende brug

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

`XdotOp`-unionen diskrimineres på `op.kind`:

| `kind` | Nyttelastfelt | Beskrivelse |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Udfyld en ellipse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Optegn omridset af en ellipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Udfyld en lukket polygon |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Optegn omridset af en lukket polygon |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Udfyld en lukket bezierkurve |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Optegn en åben bezierkurve |
| `'polyline'` | `op.polyline: XdotPolyline` | Tegn en polylinje |
| `'text'` | `op.text: XdotText` | Tegn en tekstetiket |
| `'fill_color'` | `op.color: string` | Angiv aktuel udfyldningsfarve |
| `'pen_color'` | `op.color: string` | Angiv aktuel stregfarve |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Angiv gradientudfyldning |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Angiv gradientstreg |
| `'font'` | `op.font: XdotFont` | Angiv aktuel skrifttype |
| `'style'` | `op.style: string` | Angiv aktuel tegnestil |
| `'image'` | `op.image: XdotImage` | Tegn et indlejret billede |
| `'fontchar'` | `op.fontchar: number` | Angiv bitmaske for skrifttegn |

### Centrale typer

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinater

xdot-koordinater er i **punkter**, i graphviz' oprindelige y-op-koordinatsystem
(origo nederst til venstre). Vend y-koordinaterne, før du tegner på en flade,
hvor y peger nedad:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operationerne ankommer i tegnerækkefølge: først grafens baggrund, derefter
knuder, derefter kanter.

## Dækning

`getDrawOps` leverer den fulde operationsstrøm i tegnerækkefølge for en graf,
herunder:
- Operationer for knudeformer (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` osv.)
- Tekst- og etiketoperationer (`text`)
- Skrifttypeoperationer (`font`)
- Operationer, der angiver farver (`fill_color`, `pen_color`), også for egne
  `color`/`fillcolor`-attributter på knuder
- Tegneoperationer for kanter (`unfilled_bezier` til splinen, plus `pen_color` /
  `fill_color` / `filled_polygon` til pilespidsen)

For `digraph { a [color=red]; a -> b }` stemmer geometrien i `_draw_`/`_hdraw_`
og farveværdierne præcist overens med den native `dot -Txdot` (knudeellipsen,
kantsplinen, pilespidsens polygon og den anvendte `color=red`). Kald
`getDrawOps(g)` direkte på en frisk (endnu ikke renderet) graf — at kalde
`render(g, ...)` og `getDrawOps(g)` på det *samme* grafobjekt kører layout to
gange og er ikke et understøttet mønster; brug det ene eller det andet pr. graf.

## Canvas-eksempel (kun knudeetiketter)

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
