---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Egyéni renderelés xdot rajzolási műveletekkel

A `getDrawOps` elrendez egy gráfot, xdot formátumba rendereli, és típusos
rajzolási műveletek lapos tömbjét adja vissza. Ezzel egyéni renderelőt (canvas,
WebGL, PDF, natív felület) vezérelhet SVG feldolgozása nélkül.

## Szignatúra

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Alapvető használat

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

## Műveletfajták

Az `XdotOp` unió az `op.kind` alapján különböztethető meg:

| `kind` | Adatmező | Leírás |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Kitöltött ellipszis rajzolása |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Ellipszis körvonalának rajzolása |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Zárt sokszög kitöltése |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Zárt sokszög körvonalának rajzolása |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Zárt Bézier-görbe kitöltése |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Nyitott Bézier-görbe vonalának rajzolása |
| `'polyline'` | `op.polyline: XdotPolyline` | Töröttvonal rajzolása |
| `'text'` | `op.text: XdotText` | Szövegfelirat rajzolása |
| `'fill_color'` | `op.color: string` | Az aktuális kitöltőszín beállítása |
| `'pen_color'` | `op.color: string` | Az aktuális vonalszín beállítása |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Színátmenetes kitöltés beállítása |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Színátmenetes vonal beállítása |
| `'font'` | `op.font: XdotFont` | Az aktuális betűtípus beállítása |
| `'style'` | `op.style: string` | Az aktuális rajzolási stílus beállítása |
| `'image'` | `op.image: XdotImage` | Beágyazott kép rajzolása |
| `'fontchar'` | `op.fontchar: number` | A betűkarakter-bitmaszk beállítása |

### Fontos típusok

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordináták

Az xdot koordinátái **pontban** vannak megadva, a Graphviz natív, felfelé növekvő
y-tengelyű koordináta-rendszerében (az origó a bal alsó sarokban van). Mielőtt
lefelé növekvő y-tengelyű felületre rajzolna, tükrözze az y koordinátákat:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

A műveletek festési sorrendben érkeznek: először a gráf háttere, majd a csúcsok,
végül az élek.

## Lefedettség

A `getDrawOps` a gráf teljes, festési sorrendű műveletfolyamát felszínre hozza,
beleértve a következőket:
- Csúcsalakzat-műveletek (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` stb.)
- Szöveg- és felirat-műveletek (`text`)
- Betűtípus-műveletek (`font`)
- Színbeállító műveletek (`fill_color`, `pen_color`), beleértve az egyéni
  csúcsattribútumokat is (`color`/`fillcolor`)
- Élrajzolási műveletek (`unfilled_bezier` a splinehoz, valamint `pen_color` /
  `fill_color` / `filled_polygon` a nyílhegyhez)

A `digraph { a [color=red]; a -> b }` gráfra a `_draw_`/`_hdraw_` geometriája és
a színértékek pontosan megegyeznek a natív `dot -Txdot` kimenetével (csúcs-
ellipszis, élspline, nyílhegy-sokszög és az alkalmazott `color=red`). A
`getDrawOps(g)` függvényt közvetlenül egy friss, még nem renderelt gráfon hívja
meg — a `render(g, ...)` és a `getDrawOps(g)` ugyanazon a gráfobjektumon való
meghívása kétszer futtatja le az elrendezést, és nem támogatott minta; gráfonként
csak az egyiket használja.

## Canvas-példa (csak csúcsfeliratok)

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
