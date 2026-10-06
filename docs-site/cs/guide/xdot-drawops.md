---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Vlastní vykreslování pomocí kreslicích operací xdot

`getDrawOps` rozvrhne graf, vykreslí jej do formátu xdot a vrátí plochou
posloupnost typovaných kreslicích operací. Použijte ji k řízení vlastního
vykreslovače (canvas, WebGL, PDF, nativní UI) bez zpracování SVG.

## Signatura

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Základní použití

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

## Druhy operací

Sjednocení `XdotOp` se rozlišuje podle `op.kind`:

| `kind` | Pole s daty | Popis |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Vyplnit elipsu |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Obtáhnout elipsu |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Vyplnit uzavřený mnohoúhelník |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Obtáhnout uzavřený mnohoúhelník |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Vyplnit uzavřenou Bézierovu křivku |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Obtáhnout otevřenou Bézierovu křivku |
| `'polyline'` | `op.polyline: XdotPolyline` | Nakreslit lomenou čáru |
| `'text'` | `op.text: XdotText` | Nakreslit textový popisek |
| `'fill_color'` | `op.color: string` | Nastavit aktuální barvu výplně |
| `'pen_color'` | `op.color: string` | Nastavit aktuální barvu tahu |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Nastavit přechodovou výplň |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Nastavit přechodový tah |
| `'font'` | `op.font: XdotFont` | Nastavit aktuální písmo |
| `'style'` | `op.style: string` | Nastavit aktuální styl kreslení |
| `'image'` | `op.image: XdotImage` | Nakreslit vložený obrázek |
| `'fontchar'` | `op.fontchar: number` | Nastavit bitovou masku vlastností písma |

### Klíčové typy

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Souřadnice

Souřadnice xdot jsou v **bodech**, v nativním souřadnicovém systému Graphviz
s osou y směřující nahoru (počátek vlevo dole). Před kreslením na plochu s osou
y směřující dolů souřadnice y převraťte:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operace přicházejí v pořadí kreslení: nejprve pozadí grafu, pak uzly, pak hrany.

## Pokrytí

`getDrawOps` zpřístupňuje úplný tok operací v pořadí kreslení pro graf,
včetně:
- operací tvarů uzlů (`filled_ellipse`, `filled_polygon`, `unfilled_polygon`
  atd.)
- textových operací a operací popisků (`text`)
- operací písma (`font`)
- operací nastavení barev (`fill_color`, `pen_color`), včetně vlastních
  atributů uzlů `color`/`fillcolor`
- kreslicích operací hran (`unfilled_bezier` pro spline a navíc `pen_color` /
  `fill_color` / `filled_polygon` pro hrot šipky)

Pro `digraph { a [color=red]; a -> b }` geometrie `_draw_`/`_hdraw_` a hodnoty
barev přesně odpovídají nativnímu `dot -Txdot` (elipsa uzlu, spline hrany,
mnohoúhelník hrotu šipky a použité `color=red`). Funkci `getDrawOps(g)`
volejte přímo na čerstvém (dosud nevykresleném) grafu — volání `render(g, ...)`
a `getDrawOps(g)` na *stejném* objektu grafu spustí rozvržení dvakrát a není
podporovaným postupem; pro každý graf použijte jedno nebo druhé.

## Příklad s canvasem (pouze popisky uzlů)

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
