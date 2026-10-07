---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Randare proprie cu operații de desenare xdot

`getDrawOps` aranjează un graf, îl randează în formatul xdot și returnează un
tablou plat de operații de desenare tipizate. Folosiți-l pentru a pilota un
randator propriu (canvas, WebGL, PDF, interfață nativă) fără a analiza SVG.

## Semnătură

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Utilizare de bază

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

## Tipurile de operații

Uniunea `XdotOp` se discriminează după `op.kind`:

| `kind` | Câmpul de conținut | Descriere |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Umple o elipsă |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Trasează conturul unei elipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Umple un poligon închis |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Trasează conturul unui poligon închis |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Umple o curbă bezier închisă |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Trasează o curbă bezier deschisă |
| `'polyline'` | `op.polyline: XdotPolyline` | Desenează o linie poligonală |
| `'text'` | `op.text: XdotText` | Desenează o etichetă de text |
| `'fill_color'` | `op.color: string` | Setează culoarea curentă de umplere |
| `'pen_color'` | `op.color: string` | Setează culoarea curentă de contur |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Setează umplerea cu gradient |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Setează conturul cu gradient |
| `'font'` | `op.font: XdotFont` | Setează fontul curent |
| `'style'` | `op.style: string` | Setează stilul curent de desenare |
| `'image'` | `op.image: XdotImage` | Desenează o imagine încorporată |
| `'fontchar'` | `op.fontchar: number` | Setează masca de biți a caracterelor fontului |

### Tipuri-cheie

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coordonate

Coordonatele xdot sunt exprimate în **puncte**, în sistemul nativ al graphviz,
cu axa y orientată în sus (originea în colțul din stânga jos). Inversați
coordonatele y înainte de a desena pe o suprafață cu axa y orientată în jos:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operațiile sosesc în ordinea de pictare: mai întâi fundalul grafului, apoi
nodurile, apoi muchiile.

## Acoperire

`getDrawOps` expune fluxul complet de operații în ordinea de pictare pentru un
graf, inclusiv:
- Operații pentru forma nodurilor (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` etc.)
- Operații de text și de etichete (`text`)
- Operații de font (`font`)
- Operații de setare a culorii (`fill_color`, `pen_color`), inclusiv atributele
  personalizate `color`/`fillcolor` ale nodurilor
- Operații de desenare a muchiilor (`unfilled_bezier` pentru spline, plus
  `pen_color` / `fill_color` / `filled_polygon` pentru vârful de săgeată)

Pentru `digraph { a [color=red]; a -> b }`, geometria `_draw_`/`_hdraw_` și
valorile de culoare coincid exact cu cele din `dot -Txdot` nativ (elipsa
nodului, spline-ul muchiei, poligonul vârfului de săgeată și `color=red`
aplicat). Apelați `getDrawOps(g)` direct pe un graf proaspăt (încă nerandat) —
apelarea `render(g, ...)` și `getDrawOps(g)` pe *același* obiect graf execută
aranjarea de două ori și nu este un tipar acceptat; folosiți una sau alta
pentru fiecare graf.

## Exemplu cu canvas (doar etichetele nodurilor)

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
