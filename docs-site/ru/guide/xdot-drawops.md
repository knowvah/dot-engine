---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Собственный рендеринг с операциями рисования xdot

`getDrawOps` выполняет компоновку графа, рендерит его в формат xdot и возвращает
плоский массив типизированных операций рисования. Используйте его, чтобы
управлять собственным рендерером (canvas, WebGL, PDF, нативный UI), не разбирая
SVG.

## Сигнатура

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Базовое использование

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

## Виды операций

Объединение `XdotOp` различает варианты по полю `op.kind`:

| `kind` | Поле данных | Описание |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Залить эллипс |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Обвести эллипс |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Залить замкнутый многоугольник |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Обвести замкнутый многоугольник |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Залить замкнутую кривую Безье |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Обвести разомкнутую кривую Безье |
| `'polyline'` | `op.polyline: XdotPolyline` | Нарисовать ломаную |
| `'text'` | `op.text: XdotText` | Нарисовать текстовую метку |
| `'fill_color'` | `op.color: string` | Задать текущий цвет заливки |
| `'pen_color'` | `op.color: string` | Задать текущий цвет обводки |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Задать градиентную заливку |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Задать градиентную обводку |
| `'font'` | `op.font: XdotFont` | Задать текущий шрифт |
| `'style'` | `op.style: string` | Задать текущий стиль рисования |
| `'image'` | `op.image: XdotImage` | Нарисовать встроенное изображение |
| `'fontchar'` | `op.fontchar: number` | Задать битовую маску символов шрифта |

### Основные типы

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Координаты

Координаты xdot заданы в **пунктах** в родной для graphviz системе с осью y,
направленной вверх (начало координат в левом нижнем углу). Перед рисованием на
поверхности с осью y вниз отразите координаты y:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Операции приходят в порядке отрисовки: сначала фон графа, затем узлы, затем
рёбра.

## Охват

`getDrawOps` возвращает полный поток операций в порядке отрисовки для графа,
включая:
- Операции форм узлов (`filled_ellipse`, `filled_polygon`, `unfilled_polygon` и
  т. д.)
- Операции текста и меток (`text`)
- Операции шрифта (`font`)
- Операции установки цвета (`fill_color`, `pen_color`), включая пользовательские
  атрибуты узлов `color`/`fillcolor`
- Операции рисования рёбер (`unfilled_bezier` для сплайна, плюс `pen_color` /
  `fill_color` / `filled_polygon` для стрелки)

Для `digraph { a [color=red]; a -> b }` геометрия `_draw_`/`_hdraw_` и значения
цветов в точности совпадают с нативным `dot -Txdot` (эллипс узла, сплайн ребра,
многоугольник стрелки и применённый `color=red`). Вызывайте `getDrawOps(g)`
непосредственно для свежего (ещё не отрендеренного) графа: вызов `render(g, ...)`
и `getDrawOps(g)` для *одного и того же* объекта графа выполняет компоновку
дважды и не является поддерживаемым сценарием; используйте что-то одно для
каждого графа.

## Пример с canvas (только метки узлов)

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
