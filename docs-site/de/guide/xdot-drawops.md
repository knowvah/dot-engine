---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Eigenes Rendering mit xdot-Zeichenoperationen

`getDrawOps` legt einen Graphen aus, rendert ihn ins xdot-Format und gibt ein
flaches Array typisierter Zeichenoperationen zurück. Damit steuern Sie einen
eigenen Renderer (Canvas, WebGL, PDF, native Oberfläche), ohne SVG zu parsen.

## Signatur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Grundlegende Verwendung

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

## Operationsarten

Die Union `XdotOp` unterscheidet sich über `op.kind`:

| `kind` | Nutzlastfeld | Beschreibung |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Eine Ellipse füllen |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Eine Ellipse umranden |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Ein geschlossenes Polygon füllen |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Ein geschlossenes Polygon umranden |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Eine geschlossene Bézierkurve füllen |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Eine offene Bézierkurve zeichnen |
| `'polyline'` | `op.polyline: XdotPolyline` | Einen Linienzug zeichnen |
| `'text'` | `op.text: XdotText` | Eine Textbeschriftung zeichnen |
| `'fill_color'` | `op.color: string` | Aktuelle Füllfarbe setzen |
| `'pen_color'` | `op.color: string` | Aktuelle Strichfarbe setzen |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Farbverlaufsfüllung setzen |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Farbverlaufsstrich setzen |
| `'font'` | `op.font: XdotFont` | Aktuelle Schrift setzen |
| `'style'` | `op.style: string` | Aktuellen Zeichenstil setzen |
| `'image'` | `op.image: XdotImage` | Ein eingebettetes Bild zeichnen |
| `'fontchar'` | `op.fontchar: number` | Bitmaske der Schriftmerkmale setzen |

### Wichtige Typen

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinaten

xdot-Koordinaten sind in **Punkt** angegeben, im nativen Koordinatensystem von
Graphviz mit nach oben zeigender y-Achse (Ursprung unten links). Spiegeln Sie
die y-Koordinaten, bevor Sie auf eine Zeichenfläche mit nach unten zeigender
y-Achse zeichnen:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Die Operationen treffen in Zeichenreihenfolge ein: zuerst der Graphhintergrund,
dann die Knoten, dann die Kanten.

## Abdeckung

`getDrawOps` liefert den vollständigen Strom der Operationen in
Zeichenreihenfolge für einen Graphen, darunter:
- Operationen für Knotenformen (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` usw.)
- Text- und Beschriftungsoperationen (`text`)
- Schriftoperationen (`font`)
- Operationen zum Setzen von Farben (`fill_color`, `pen_color`), einschließlich
  eigener Knotenattribute `color`/`fillcolor`
- Zeichenoperationen für Kanten (`unfilled_bezier` für den Spline sowie
  `pen_color` / `fill_color` / `filled_polygon` für die Pfeilspitze)

Für `digraph { a [color=red]; a -> b }` stimmen die Geometrie von
`_draw_`/`_hdraw_` und die Farbwerte exakt mit dem nativen `dot -Txdot`
überein (Knotenellipse, Kanten-Spline, Pfeilspitzenpolygon und das angewendete
`color=red`). Rufen Sie `getDrawOps(g)` direkt auf einem frischen, noch nicht
gerenderten Graphen auf — `render(g, ...)` und `getDrawOps(g)` auf demselben
Graphobjekt aufzurufen, führt das Layout zweimal aus und ist kein unterstütztes
Muster; verwenden Sie pro Graph nur das eine oder das andere.

## Canvas-Beispiel (nur Knotenbeschriftungen)

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
