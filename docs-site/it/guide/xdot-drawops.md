---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Rendering personalizzato con le operazioni di disegno xdot

`getDrawOps` calcola il layout di un grafo, lo renderizza in formato xdot e
restituisce un array piatto di operazioni di disegno tipizzate. Usalo per
pilotare un renderer personalizzato (canvas, WebGL, PDF, interfaccia nativa)
senza dover analizzare l'SVG.

## Firma

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Uso di base

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

## Tipi di operazione

L'unione `XdotOp` si discrimina su `op.kind`:

| `kind` | Campo del payload | Descrizione |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Riempie un'ellisse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Traccia il contorno di un'ellisse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Riempie un poligono chiuso |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Traccia il contorno di un poligono chiuso |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Riempie una curva di Bézier chiusa |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Traccia una curva di Bézier aperta |
| `'polyline'` | `op.polyline: XdotPolyline` | Disegna una spezzata |
| `'text'` | `op.text: XdotText` | Disegna un'etichetta di testo |
| `'fill_color'` | `op.color: string` | Imposta il colore di riempimento corrente |
| `'pen_color'` | `op.color: string` | Imposta il colore del tratto corrente |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Imposta il riempimento a gradiente |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Imposta il tratto a gradiente |
| `'font'` | `op.font: XdotFont` | Imposta il carattere corrente |
| `'style'` | `op.style: string` | Imposta lo stile di disegno corrente |
| `'image'` | `op.image: XdotImage` | Disegna un'immagine incorporata |
| `'fontchar'` | `op.fontchar: number` | Imposta la maschera di bit dei caratteri |

### Tipi principali

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coordinate

Le coordinate xdot sono espresse in **punti**, nel sistema di riferimento
nativo di Graphviz con l'asse y verso l'alto (origine in basso a sinistra).
Inverti le coordinate y prima di disegnare su una superficie con l'asse y verso
il basso:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Le operazioni arrivano nell'ordine di disegno: prima lo sfondo del grafo, poi i
nodi, poi gli archi.

## Copertura

`getDrawOps` espone l'intero flusso di operazioni nell'ordine di disegno per un
grafo, tra cui:
- Operazioni delle forme dei nodi (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon`, ecc.)
- Operazioni di testo ed etichette (`text`)
- Operazioni sul carattere (`font`)
- Operazioni che impostano i colori (`fill_color`, `pen_color`), compresi gli
  attributi `color`/`fillcolor` personalizzati dei nodi
- Operazioni di disegno degli archi (`unfilled_bezier` per la spline, più
  `pen_color` / `fill_color` / `filled_polygon` per la punta della freccia)

Per `digraph { a [color=red]; a -> b }`, la geometria `_draw_`/`_hdraw_` e i
valori dei colori coincidono esattamente con quelli del `dot -Txdot` nativo
(ellisse del nodo, spline dell'arco, poligono della punta della freccia e
`color=red` applicato). Chiama `getDrawOps(g)` direttamente su un grafo nuovo
(non ancora renderizzato): chiamare `render(g, ...)` e `getDrawOps(g)` sullo
*stesso* oggetto grafo esegue il layout due volte e non è un uso supportato;
usa l'una o l'altra per ciascun grafo.

## Esempio con canvas (solo etichette dei nodi)

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
