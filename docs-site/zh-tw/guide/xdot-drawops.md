---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# 以 xdot 繪製操作自訂轉譯

`getDrawOps` 會對圖進行版面配置、轉譯為 xdot 格式，並回傳一個扁平的、具型別的繪製操作陣列。您可以用它來驅動自訂轉譯器（canvas、WebGL、PDF、原生 UI），而無需解析 SVG。

## 簽章

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

## 操作種類

`XdotOp` 聯集型別以 `op.kind` 作為辨別欄位：

| `kind` | 酬載欄位 | 說明 |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | 填滿橢圓 |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | 描繪橢圓外框 |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | 填滿封閉多邊形 |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | 描繪封閉多邊形外框 |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | 填滿封閉貝茲曲線 |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | 描繪開放貝茲曲線 |
| `'polyline'` | `op.polyline: XdotPolyline` | 繪製折線 |
| `'text'` | `op.text: XdotText` | 繪製文字標籤 |
| `'fill_color'` | `op.color: string` | 設定目前的填滿色彩 |
| `'pen_color'` | `op.color: string` | 設定目前的描繪色彩 |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | 設定漸層填滿 |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | 設定漸層描繪 |
| `'font'` | `op.font: XdotFont` | 設定目前的字型 |
| `'style'` | `op.style: string` | 設定目前的繪製樣式 |
| `'image'` | `op.image: XdotImage` | 繪製內嵌影像 |
| `'fontchar'` | `op.fontchar: number` | 設定字型字元位元遮罩 |

### 主要型別

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## 座標

xdot 座標單位為**點**（points），採用 graphviz 原生的 y 軸朝上座標系（原點位於左下角）。若要在 y 軸朝下的繪圖面上繪製，請先翻轉 y 座標：

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

操作依繪製順序抵達：先是圖的背景，接著是節點，最後是邊。

## 涵蓋範圍

`getDrawOps` 會提供圖的完整繪製順序操作串流，包括：
- 節點形狀操作（`filled_ellipse`、`filled_polygon`、`unfilled_polygon` 等）
- 文字與標籤操作（`text`）
- 字型操作（`font`）
- 設定色彩的操作（`fill_color`、`pen_color`），包括自訂的節點 `color`/`fillcolor` 屬性
- 邊的繪製操作（樣條使用 `unfilled_bezier`，箭頭則使用 `pen_color` /
  `fill_color` / `filled_polygon`）

對於 `digraph { a [color=red]; a -> b }`，`_draw_`/`_hdraw_` 的幾何與色彩值會與原生 `dot -Txdot` 完全一致（節點橢圓、邊樣條、箭頭多邊形，以及套用的 `color=red`）。請直接對全新（尚未轉譯）的圖呼叫 `getDrawOps(g)`——對*同一個*圖物件先呼叫 `render(g, ...)` 再呼叫 `getDrawOps(g)` 會執行兩次版面配置，這不是受支援的用法；每個圖請擇一使用。

## Canvas 範例（僅節點標籤）

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
