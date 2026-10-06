---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Oma renderdus xdot-joonistusoperatsioonidega

`getDrawOps` paigutab graafi, renderdab selle xdot-vormingusse ja tagastab lameda
massiivi tüübitud joonistusoperatsioonidest. Kasutage seda oma renderdaja
(canvas, WebGL, PDF, natiivne kasutajaliides) juhtimiseks ilma SVG-d parsimata.

## Signatuur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Põhikasutus

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

## Operatsioonide liigid

Liit `XdotOp` eristatakse välja `op.kind` alusel:

| `kind` | Andmevälja nimi | Kirjeldus |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Ellipsi täitmine |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Ellipsi ääristamine |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Suletud hulknurga täitmine |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Suletud hulknurga ääristamine |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Suletud Bézier' kõvera täitmine |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Avatud Bézier' kõvera joonistamine |
| `'polyline'` | `op.polyline: XdotPolyline` | Murdjoone joonistamine |
| `'text'` | `op.text: XdotText` | Tekstisildi joonistamine |
| `'fill_color'` | `op.color: string` | Praeguse täitevärvi määramine |
| `'pen_color'` | `op.color: string` | Praeguse joonevärvi määramine |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Gradienttäite määramine |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Gradientjoone määramine |
| `'font'` | `op.font: XdotFont` | Praeguse fondi määramine |
| `'style'` | `op.style: string` | Praeguse joonistusstiili määramine |
| `'image'` | `op.image: XdotImage` | Manustatud pildi joonistamine |
| `'fontchar'` | `op.fontchar: number` | Fondi omaduste bitimaski määramine |

### Põhitüübid

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinaadid

xdot-koordinaadid on **punktides**, Graphvizi natiivses y-teljega ülespoole
suunatud koordinaadistikus (alguspunkt vasakul all). Pöörake y-koordinaadid
ümber, enne kui joonistate allapoole suunatud y-teljega pinnale:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operatsioonid saabuvad joonistusjärjekorras: kõigepealt graafi taust, seejärel
sõlmed, seejärel servad.

## Katvus

`getDrawOps` annab graafi kohta kogu joonistusjärjekorras operatsioonide voo,
sealhulgas:
- sõlmekujude operatsioonid (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` jne)
- teksti- ja sildioperatsioonid (`text`)
- fondioperatsioonid (`font`)
- värvide määramise operatsioonid (`fill_color`, `pen_color`), sealhulgas
  sõlmede enda `color`/`fillcolor` atribuudid
- servade joonistusoperatsioonid (`unfilled_bezier` splaini jaoks ning
  `pen_color` / `fill_color` / `filled_polygon` nooleotsa jaoks)

Graafi `digraph { a [color=red]; a -> b }` puhul langevad `_draw_`/`_hdraw_`
geomeetria ja värviväärtused täpselt kokku natiivse `dot -Txdot` väljundiga
(sõlme ellips, serva splain, nooleotsa hulknurk ja rakendatud `color=red`).
Kutsuge `getDrawOps(g)` otse värske, veel renderdamata graafi peal — `render(g,
...)` ja `getDrawOps(g)` kutsumine *sama* graafiobjekti peal käivitab
paigutuse kaks korda ega ole toetatud muster; kasutage ühe graafi kohta kas
üht või teist.

## Canvase näide (ainult sõlmesildid)

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
