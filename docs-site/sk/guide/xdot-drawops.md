---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Vlastné vykresľovanie pomocou kresliacich operácií xdot

`getDrawOps` vytvorí rozloženie grafu, vykreslí ho do formátu xdot a vráti
ploché pole typovaných kresliacich operácií. Použite ho na riadenie vlastného
vykresľovača (canvas, WebGL, PDF, natívne používateľské rozhranie) bez
spracúvania SVG.

## Signatúra

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Základné použitie

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

## Druhy operácií

Zjednotený typ `XdotOp` sa rozlišuje podľa `op.kind`:

| `kind` | Pole s dátami | Popis |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Vyplnená elipsa |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Obrys elipsy |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Vyplnený uzavretý polygón |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Obrys uzavretého polygónu |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Vyplnená uzavretá Bézierova krivka |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Obrys otvorenej Bézierovej krivky |
| `'polyline'` | `op.polyline: XdotPolyline` | Lomená čiara |
| `'text'` | `op.text: XdotText` | Textový popis |
| `'fill_color'` | `op.color: string` | Nastavenie aktuálnej farby výplne |
| `'pen_color'` | `op.color: string` | Nastavenie aktuálnej farby obrysu |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Nastavenie farebného prechodu výplne |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Nastavenie farebného prechodu obrysu |
| `'font'` | `op.font: XdotFont` | Nastavenie aktuálneho písma |
| `'style'` | `op.style: string` | Nastavenie aktuálneho štýlu kreslenia |
| `'image'` | `op.image: XdotImage` | Vložený obrázok |
| `'fontchar'` | `op.fontchar: number` | Nastavenie bitovej masky znakov písma |

### Kľúčové typy

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Súradnice

Súradnice xdot sú v **bodoch** v natívnom súradnicovom systéme Graphviz s osou
y smerujúcou nahor (počiatok vľavo dole). Pred kreslením na plochu s osou y
smerujúcou nadol súradnice y preklopte:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operácie prichádzajú v poradí vykresľovania: najprv pozadie grafu, potom uzly
a nakoniec hrany.

## Pokrytie

`getDrawOps` sprístupňuje úplný prúd operácií v poradí vykresľovania pre graf,
vrátane:
- operácií pre tvary uzlov (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` atď.)
- operácií pre text a popisy (`text`)
- operácií pre písmo (`font`)
- operácií nastavujúcich farbu (`fill_color`, `pen_color`), vrátane vlastných
  atribútov uzla `color`/`fillcolor`
- kresliacich operácií pre hrany (`unfilled_bezier` pre spline, plus
  `pen_color` / `fill_color` / `filled_polygon` pre hrot šípky)

Pre `digraph { a [color=red]; a -> b }` sa geometria `_draw_`/`_hdraw_`
a hodnoty farieb presne zhodujú s natívnym `dot -Txdot` (elipsa uzla, spline
hrany, polygón hrotu šípky a použité `color=red`). `getDrawOps(g)` volajte
priamo na čerstvom (ešte nevykreslenom) grafe — volanie `render(g, ...)`
a `getDrawOps(g)` na *tom istom* objekte grafu spustí rozloženie dvakrát
a nie je to podporovaný postup; pre každý graf použite jedno alebo druhé.

## Príklad pre canvas (iba popisy uzlov)

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
