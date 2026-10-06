---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Renderizado propio con operaciones de dibujo xdot

`getDrawOps` calcula el diseño de un grafo, lo renderiza al formato xdot y
devuelve un array plano de operaciones de dibujo tipadas. Úsalo para dirigir un
renderizador propio (canvas, WebGL, PDF, interfaz nativa) sin analizar SVG.

## Firma

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Uso básico

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

## Tipos de operación

La unión `XdotOp` se discrimina por `op.kind`:

| `kind` | Campo de carga | Descripción |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Rellena una elipse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Traza el contorno de una elipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Rellena un polígono cerrado |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Traza el contorno de un polígono cerrado |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Rellena una curva bézier cerrada |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Traza una curva bézier abierta |
| `'polyline'` | `op.polyline: XdotPolyline` | Dibuja una polilínea |
| `'text'` | `op.text: XdotText` | Dibuja una etiqueta de texto |
| `'fill_color'` | `op.color: string` | Establece el color de relleno actual |
| `'pen_color'` | `op.color: string` | Establece el color de trazo actual |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Establece un relleno con degradado |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Establece un trazo con degradado |
| `'font'` | `op.font: XdotFont` | Establece la fuente actual |
| `'style'` | `op.style: string` | Establece el estilo de dibujo actual |
| `'image'` | `op.image: XdotImage` | Dibuja una imagen incrustada |
| `'fontchar'` | `op.fontchar: number` | Establece la máscara de bits de caracteres de la fuente |

### Tipos principales

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coordenadas

Las coordenadas xdot están en **puntos**, en el sistema nativo de Graphviz con
el eje y hacia arriba (origen en la esquina inferior izquierda). Invierte las
coordenadas y antes de dibujar sobre una superficie con el eje y hacia abajo:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Las operaciones llegan en orden de pintado: primero el fondo del grafo, luego
los nodos y después las aristas.

## Cobertura

`getDrawOps` expone el flujo completo de operaciones en orden de pintado de un
grafo, incluyendo:
- Operaciones de forma de nodo (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon`, etc.)
- Operaciones de texto y etiquetas (`text`)
- Operaciones de fuente (`font`)
- Operaciones que establecen color (`fill_color`, `pen_color`), incluidos los
  atributos `color`/`fillcolor` personalizados de los nodos
- Operaciones de dibujo de aristas (`unfilled_bezier` para el spline, más
  `pen_color` / `fill_color` / `filled_polygon` para la punta de flecha)

Para `digraph { a [color=red]; a -> b }`, la geometría `_draw_`/`_hdraw_` y los
valores de color coinciden exactamente con los de `dot -Txdot` nativo (elipse
del nodo, spline de la arista, polígono de la punta de flecha y el
`color=red` aplicado). Llama a `getDrawOps(g)` directamente sobre un grafo
nuevo (aún no renderizado): llamar a `render(g, ...)` y a `getDrawOps(g)` sobre
el *mismo* objeto de grafo ejecuta el diseño dos veces y no es un patrón
admitido; usa una u otra por grafo.

## Ejemplo con canvas (solo etiquetas de nodo)

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
