---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# xdot による独自レンダリング

`getDrawOps` はグラフをレイアウトして xdot 形式にレンダリングし、型付きの描画オペレーションをフラットな配列として返します。SVG を解析せずに、独自のレンダラー（canvas、WebGL、PDF、ネイティブ UI）を駆動するために使います。

## シグネチャ

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## 基本的な使い方

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

## オペレーションの種類

`XdotOp` ユニオンは `op.kind` で判別されます。

| `kind` | ペイロードのフィールド | 説明 |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | 楕円を塗りつぶす |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | 楕円の輪郭を描く |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | 閉じた多角形を塗りつぶす |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | 閉じた多角形の輪郭を描く |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | 閉じたベジェ曲線を塗りつぶす |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | 開いたベジェ曲線の輪郭を描く |
| `'polyline'` | `op.polyline: XdotPolyline` | 折れ線を描く |
| `'text'` | `op.text: XdotText` | テキストラベルを描く |
| `'fill_color'` | `op.color: string` | 現在の塗りつぶし色を設定する |
| `'pen_color'` | `op.color: string` | 現在の線の色を設定する |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | グラデーションの塗りつぶしを設定する |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | グラデーションの線を設定する |
| `'font'` | `op.font: XdotFont` | 現在のフォントを設定する |
| `'style'` | `op.style: string` | 現在の描画スタイルを設定する |
| `'image'` | `op.image: XdotImage` | 埋め込み画像を描く |
| `'fontchar'` | `op.fontchar: number` | フォント文字のビットマスクを設定する |

### 主な型

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## 座標

xdot の座標の単位は**ポイント**で、graphviz 本来の y 軸上向きの座標系（原点は左下）です。y 軸下向きの描画面に描く前に、y 座標を反転してください。

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

オペレーションは描画順に届きます。最初にグラフの背景、次にノード、最後にエッジです。

## カバー範囲

`getDrawOps` は、グラフの描画順のオペレーションストリーム全体を提供します。含まれるものは次のとおりです。

- ノード形状のオペレーション（`filled_ellipse`、`filled_polygon`、`unfilled_polygon` など）
- テキストとラベルのオペレーション（`text`）
- フォントのオペレーション（`font`）
- 色設定のオペレーション（`fill_color`、`pen_color`）。ノードのカスタム `color` / `fillcolor` 属性も含む
- エッジの描画オペレーション（スプラインには `unfilled_bezier`、矢印の先端には `pen_color` / `fill_color` / `filled_polygon`）

`digraph { a [color=red]; a -> b }` では、`_draw_` / `_hdraw_` のジオメトリと色の値が、ネイティブの `dot -Txdot` と完全に一致します（ノードの楕円、エッジのスプライン、矢印の先端の多角形、適用された `color=red`）。`getDrawOps(g)` は、まだレンダリングしていない新しいグラフに対して直接呼び出してください。*同じ*グラフオブジェクトに対して `render(g, ...)` と `getDrawOps(g)` を呼ぶと、レイアウトが二重に実行されます。これはサポート対象外のパターンなので、グラフごとにどちらか一方だけを使ってください。

## Canvas の例（ノードのラベルのみ）

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
