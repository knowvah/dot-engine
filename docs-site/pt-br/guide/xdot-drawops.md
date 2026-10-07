---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Renderização própria com operações de desenho xdot

`getDrawOps` calcula o layout de um grafo, renderiza-o no formato xdot e devolve
um array plano de operações de desenho tipadas. Use-o para alimentar um
renderizador próprio (canvas, WebGL, PDF, UI nativa) sem precisar analisar SVG.

## Assinatura

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

## Tipos de operação

A união `XdotOp` é discriminada por `op.kind`:

| `kind` | Campo de carga | Descrição |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Preencher uma elipse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Traçar o contorno de uma elipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Preencher um polígono fechado |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Traçar o contorno de um polígono fechado |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Preencher uma curva de Bézier fechada |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Traçar uma curva de Bézier aberta |
| `'polyline'` | `op.polyline: XdotPolyline` | Desenhar uma polilinha |
| `'text'` | `op.text: XdotText` | Desenhar um rótulo de texto |
| `'fill_color'` | `op.color: string` | Definir a cor de preenchimento atual |
| `'pen_color'` | `op.color: string` | Definir a cor de traço atual |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Definir o preenchimento em gradiente |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Definir o traço em gradiente |
| `'font'` | `op.font: XdotFont` | Definir a fonte atual |
| `'style'` | `op.style: string` | Definir o estilo de desenho atual |
| `'image'` | `op.image: XdotImage` | Desenhar uma imagem incorporada |
| `'fontchar'` | `op.fontchar: number` | Definir a máscara de bits de caracteres da fonte |

### Tipos principais

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Coordenadas

As coordenadas xdot são em **pontos**, no referencial nativo do graphviz com o
eixo y apontando para cima (origem no canto inferior esquerdo). Inverta as
coordenadas y antes de desenhar em uma superfície com y para baixo:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

As operações chegam na ordem de pintura: primeiro o fundo do grafo, depois os
nós, depois as arestas.

## Cobertura

`getDrawOps` expõe o fluxo completo de operações na ordem de pintura de um
grafo, incluindo:
- Operações de forma de nó (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` etc.)
- Operações de texto e de rótulo (`text`)
- Operações de fonte (`font`)
- Operações de definição de cor (`fill_color`, `pen_color`), incluindo
  atributos personalizados de nó `color`/`fillcolor`
- Operações de desenho de aresta (`unfilled_bezier` para a spline, mais
  `pen_color` / `fill_color` / `filled_polygon` para a ponta da seta)

Para `digraph { a [color=red]; a -> b }`, a geometria de `_draw_`/`_hdraw_` e os
valores de cor correspondem exatamente a `dot -Txdot` nativo (elipse do nó,
spline da aresta, polígono da ponta da seta e o `color=red` aplicado). Chame
`getDrawOps(g)` diretamente em um grafo novo (ainda não renderizado) — chamar
`render(g, ...)` e `getDrawOps(g)` sobre o *mesmo* objeto de grafo executa o
layout duas vezes e não é um padrão suportado; use um ou outro por grafo.

## Exemplo de canvas (apenas rótulos de nó)

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
