---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Własne renderowanie z operacjami rysowania xdot

`getDrawOps` układa graf, renderuje go do formatu xdot i zwraca płaską
tablicę typowanych operacji rysowania. Użyj jej do sterowania własnym
rendererem (canvas, WebGL, PDF, natywny interfejs użytkownika) bez parsowania
SVG.

## Sygnatura

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Podstawowe użycie

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

## Rodzaje operacji

Unia `XdotOp` jest rozróżniana po `op.kind`:

| `kind` | Pole ładunku | Opis |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Wypełnia elipsę |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Rysuje obrys elipsy |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Wypełnia zamknięty wielokąt |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Rysuje obrys zamkniętego wielokąta |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Wypełnia zamkniętą krzywą Béziera |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Rysuje obrys otwartej krzywej Béziera |
| `'polyline'` | `op.polyline: XdotPolyline` | Rysuje łamaną |
| `'text'` | `op.text: XdotText` | Rysuje etykietę tekstową |
| `'fill_color'` | `op.color: string` | Ustawia bieżący kolor wypełnienia |
| `'pen_color'` | `op.color: string` | Ustawia bieżący kolor obrysu |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Ustawia wypełnienie gradientem |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Ustawia obrys gradientem |
| `'font'` | `op.font: XdotFont` | Ustawia bieżącą czcionkę |
| `'style'` | `op.style: string` | Ustawia bieżący styl rysowania |
| `'image'` | `op.image: XdotImage` | Rysuje osadzony obraz |
| `'fontchar'` | `op.fontchar: number` | Ustawia maskę bitową znaków czcionki |

### Kluczowe typy

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Współrzędne

Współrzędne xdot są wyrażone w **punktach**, w natywnym układzie Graphviz z osią
y skierowaną w górę (początek w lewym dolnym rogu). Przed rysowaniem na
powierzchni z osią y skierowaną w dół odwróć współrzędne y:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operacje przychodzą w kolejności malowania: najpierw tło grafu, potem węzły,
na końcu krawędzie.

## Zakres

`getDrawOps` udostępnia pełny strumień operacji w kolejności malowania dla
grafu, w tym:
- Operacje kształtów węzłów (`filled_ellipse`, `filled_polygon`, `unfilled_polygon` itd.)
- Operacje tekstu i etykiet (`text`)
- Operacje czcionek (`font`)
- Operacje ustawiania kolorów (`fill_color`, `pen_color`), w tym własne
  atrybuty węzłów `color`/`fillcolor`
- Operacje rysowania krawędzi (`unfilled_bezier` dla splajnu oraz `pen_color` /
  `fill_color` / `filled_polygon` dla grota strzałki)

Dla `digraph { a [color=red]; a -> b }` geometria `_draw_`/`_hdraw_` i wartości
kolorów dokładnie odpowiadają natywnemu `dot -Txdot` (elipsa węzła, splajn
krawędzi, wielokąt grota i zastosowane `color=red`). Wywołuj `getDrawOps(g)`
bezpośrednio na świeżym (jeszcze niezrenderowanym) grafie — wywołanie
`render(g, ...)` i `getDrawOps(g)` na *tym samym* obiekcie grafu uruchamia układ
dwukrotnie i nie jest wspieranym wzorcem; dla każdego grafu używaj jednego albo
drugiego.

## Przykład z canvas (tylko etykiety węzłów)

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
