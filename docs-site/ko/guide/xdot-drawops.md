---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# xdot 그리기 연산으로 직접 렌더링

`getDrawOps`는 그래프를 레이아웃하고 xdot 형식으로 렌더링한 다음, 타입이 지정된
그리기 연산의 평탄한 배열을 반환합니다. SVG를 파싱하지 않고 사용자 지정
렌더러(캔버스, WebGL, PDF, 네이티브 UI)를 구동할 때 사용하세요.

## 시그니처

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## 기본 사용법

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

## 연산 종류

`XdotOp` 유니온은 `op.kind`로 구분됩니다.

| `kind` | 페이로드 필드 | 설명 |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | 타원을 채웁니다 |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | 타원의 윤곽선을 그립니다 |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | 닫힌 다각형을 채웁니다 |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | 닫힌 다각형의 윤곽선을 그립니다 |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | 닫힌 베지어 곡선을 채웁니다 |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | 열린 베지어 곡선의 윤곽선을 그립니다 |
| `'polyline'` | `op.polyline: XdotPolyline` | 폴리라인을 그립니다 |
| `'text'` | `op.text: XdotText` | 텍스트 레이블을 그립니다 |
| `'fill_color'` | `op.color: string` | 현재 채우기 색을 설정합니다 |
| `'pen_color'` | `op.color: string` | 현재 윤곽선 색을 설정합니다 |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | 그라디언트 채우기를 설정합니다 |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | 그라디언트 윤곽선을 설정합니다 |
| `'font'` | `op.font: XdotFont` | 현재 글꼴을 설정합니다 |
| `'style'` | `op.style: string` | 현재 그리기 스타일을 설정합니다 |
| `'image'` | `op.image: XdotImage` | 포함된 이미지를 그립니다 |
| `'fontchar'` | `op.fontchar: number` | 글꼴 문자 비트마스크를 설정합니다 |

### 주요 타입

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## 좌표

xdot 좌표는 **포인트** 단위이며 graphviz 고유의 y축 위쪽 방향 좌표계(원점은
왼쪽 아래)를 따릅니다. y축이 아래쪽으로 향하는 표면에 그리기 전에 y 좌표를
뒤집으세요.

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

연산은 그리기 순서대로 도착합니다. 그래프 배경이 먼저, 그다음 노드, 마지막으로
에지입니다.

## 포함 범위

`getDrawOps`는 그래프의 전체 그리기 순서 연산 스트림을 제공하며, 다음을
포함합니다.
- 노드 모양 연산(`filled_ellipse`, `filled_polygon`, `unfilled_polygon` 등)
- 텍스트 및 레이블 연산(`text`)
- 글꼴 연산(`font`)
- 색 설정 연산(`fill_color`, `pen_color`). 사용자 지정 노드
  `color`/`fillcolor` 속성도 포함합니다
- 에지 그리기 연산(스플라인에는 `unfilled_bezier`, 화살촉에는 `pen_color` /
  `fill_color` / `filled_polygon`)

`digraph { a [color=red]; a -> b }`의 경우 `_draw_`/`_hdraw_` 지오메트리와 색
값이 네이티브 `dot -Txdot`과 정확히 일치합니다(노드 타원, 에지 스플라인, 화살촉
다각형, 적용된 `color=red`). 아직 렌더링하지 않은 새 그래프에 `getDrawOps(g)`를
직접 호출하세요. *같은* 그래프 객체에 `render(g, ...)`와 `getDrawOps(g)`를 모두
호출하면 레이아웃이 두 번 실행되며 지원되는 패턴이 아닙니다. 그래프마다 둘 중
하나만 사용하세요.

## 캔버스 예제(노드 레이블만)

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
