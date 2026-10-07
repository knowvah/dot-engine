---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# 用 xdot 自定义渲染

`getDrawOps` 会对图进行布局，将其渲染为 xdot 格式，并返回一个扁平的、带类型的绘制操作数组。用它来驱动自定义渲染器（canvas、WebGL、PDF、原生 UI），而无需解析 SVG。

## 签名

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## 基本用法

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

## 操作类型

`XdotOp` 联合类型以 `op.kind` 作为判别字段：

| `kind` | 载荷字段 | 说明 |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | 填充椭圆 |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | 描边椭圆 |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | 填充闭合多边形 |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | 描边闭合多边形 |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | 填充闭合贝塞尔曲线 |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | 描边开放贝塞尔曲线 |
| `'polyline'` | `op.polyline: XdotPolyline` | 绘制折线 |
| `'text'` | `op.text: XdotText` | 绘制文本标签 |
| `'fill_color'` | `op.color: string` | 设置当前填充颜色 |
| `'pen_color'` | `op.color: string` | 设置当前描边颜色 |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | 设置渐变填充 |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | 设置渐变描边 |
| `'font'` | `op.font: XdotFont` | 设置当前字体 |
| `'style'` | `op.style: string` | 设置当前绘制样式 |
| `'image'` | `op.image: XdotImage` | 绘制嵌入的图像 |
| `'fontchar'` | `op.fontchar: number` | 设置字体字符位掩码 |

### 关键类型

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## 坐标

xdot 坐标以**点（point）**为单位，采用 Graphviz 原生的 y 轴向上坐标系（原点位于左下角）。在 y 轴向下的绘图面上绘制之前，请先翻转 y 坐标：

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

操作按绘制顺序到达：先是图背景，然后是节点，最后是边。

## 覆盖范围

`getDrawOps` 会给出一张图完整的、按绘制顺序排列的操作流，包括：
- 节点形状操作（`filled_ellipse`、`filled_polygon`、`unfilled_polygon` 等）
- 文本与标签操作（`text`）
- 字体操作（`font`）
- 颜色设置操作（`fill_color`、`pen_color`），包括自定义的节点 `color`/`fillcolor` 属性
- 边绘制操作（样条用 `unfilled_bezier`，箭头则用 `pen_color` / `fill_color` / `filled_polygon`）

对于 `digraph { a [color=red]; a -> b }`，`_draw_`/`_hdraw_` 的几何数据和颜色值与原生 `dot -Txdot` 完全一致（节点椭圆、边样条、箭头多边形，以及生效的 `color=red`）。请在全新的（尚未渲染的）图上直接调用 `getDrawOps(g)`——在*同一个*图对象上既调用 `render(g, ...)` 又调用 `getDrawOps(g)` 会运行两次布局，不是受支持的用法；每个图请只选其一。

## Canvas 示例（仅节点标签）

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
