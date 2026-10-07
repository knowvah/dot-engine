---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# 타입 참고 자료

공개 타입을 얻는 곳별로 묶은 개념 지도입니다. `createGraph`/`parse`(생성 + 검사),
`getLayout`(지오메트리 스냅샷), `render`/`getDrawOps`(출력), 루트 패키지(엔진, 이미지,
텍스트 측정, 오류)로 나뉩니다. 각 항목은 소스에서 복사한 구조 블록과 한 줄 설명을
보여 줍니다. 상속된 멤버와 모든 속성의 JSDoc을 포함한 필드별 전체 문서는 생성된
[TypeDoc 참고 자료](/reference/)를 참조하세요.

이 페이지는 좌표계 설명을 반복하지 않습니다. 그 내용은
[계산된 지오메트리 읽기](/ko/guide/geometry)를 참조하세요. 다만 타입의 필드가
좌표계에 좌우되는 곳에서는 y축에 관한 참고를 간단히 다시 적었습니다.

## 생성 + 검사(`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

내부 그래프 모델에 대한 불투명 핸들입니다. `parse()`와 `createGraph().graph`가
반환합니다. `render`, `getLayout`, `getDrawOps`에 전달하세요. 직접 생성하거나
들여다보지 마세요. 빌더와 파서가 이를 만드는 유일하게 지원되는 방법입니다.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph`의 옵션입니다. `directed`/`strict`는 네 가지 `GraphKind`(방향, 무방향,
strict 방향, strict 무방향) 중 하나를 선택하며, `name`은 그래프 이름을
설정합니다(기본값 `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addNode(...)`가 반환하는 그래프 노드의 불투명 핸들입니다. `setHtmlAttr`은
값을 HTML 유사 레이블로 표시하여(DOT 텍스트의 `label=<...>`와 동등) 레이아웃
엔진이 마크업으로 측정하게 합니다.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addEdge(...)`가 반환하는 그래프 에지의 불투명 핸들입니다.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

`createGraph(...)`가 반환합니다. `addSubgraph`는 해당 서브그래프로 범위가 한정된
중첩 빌더를 반환하며, 이를 통해 추가한 노드는 루트 그래프의 멤버이기도 합니다.
`.graph`는 `render`/`getLayout`/`getDrawOps`로 넘기는 인계 지점입니다.
[코드로 그래프 만들기](/ko/guide/build-a-graph)를 참조하세요.

## 지오메트리 스냅샷(`getLayout`)

::: tip 좌표계
네이티브 graphviz 좌표는 y축이 위쪽입니다(원점은 왼쪽 아래). `getLayout`은 기본값이
`yAxis: 'down'`(원점은 왼쪽 위, 화면 관례)이며 모든 y 좌표를 뒤집습니다. 네이티브
graphviz 좌표가 필요하면 `{ yAxis: 'up' }`을 전달하세요. 전체 설명:
[계산된 지오메트리 읽기](/ko/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout`의 옵션입니다. 기본값은 `yAxis: 'down'`입니다.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

`getLayout(g, opts?)`가 반환하는, 그래프의 계산된 지오메트리를 담은 평범하고
JSON으로 직렬화할 수 있는 스냅샷입니다. `clusters`는 모든 클러스터 서브그래프를
재귀적으로 나열하며(중첩된 클러스터도 각각 자체 항목을 가짐), 클러스터가 없는
그래프에서는 비어 있습니다.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

포인트 단위의 전체 바운딩 박스입니다. `yAxis: 'down'`에서는 `x`/`y`가 `(0, 0)`으로
정규화됩니다. `yAxis: 'up'`에서는 `x`/`y`가 그래프 바운딩 박스의 원래 왼쪽 아래
모서리입니다.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

노드별 지오메트리입니다. `x`/`y`는 노드의 중심입니다. `width`/`height`는 **포인트**
단위입니다. 모델은 이를 인치(`ND_width`/`ND_height`)로 저장하며, `getLayout`이
반환하기 전에 72를 곱합니다.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

에지별 지오메트리입니다. `points`는 라우팅된 스플라인의 모든 베지어 제어점을
순서대로 이어 붙인 것입니다(에지에 라우팅된 스플라인이 없으면 비어 있음). `label`은
에지에 중앙 레이블이 있을 때만 존재합니다.

`tailLabel`과 `headLabel`은 `taillabel`/`headlabel` 포트 레이블의 위치입니다. 각각은
레이아웃이 위치를 배정한 뒤에만 존재하며(`render()`가 `<text>`를 출력하는 조건과
같습니다), 따라서 위치를 배정하지 못한 포트 레이블(예를 들어 라우팅된 스플라인이
없는 에지)은 원점의 레이블이 아니라 없는 것으로 보고됩니다.

`xlabel`은 `xlabel` 외부 레이블의 위치입니다. `label`과 달리 에지 주변의 후보 위치에
대한 graphviz의 강제 배치 탐색으로 선택되므로 `label`이나 스플라인 중간점에서
유도할 수 없습니다. 배정된 경우에만 존재한다는 같은 조건이 적용됩니다. 탐색이
맞추지 못한 선언된 xlabel은 `render()`가 그리지 않는 것과 똑같이 없는 것으로
보고됩니다.

`sp`와 `ep`는 꼬리와 머리 끝의 화살표 부착점입니다. 한쪽 끝에 화살표가 있으면
스플라인이 화살표를 위한 공간을 남기도록 짧아지고, 화살표는 끝 제어점에서 이 점까지
뻗습니다. 따라서 자체 화살촉을 그리는 소비자는 끝을 외삽하는 대신 여기서 끝점을
읽습니다. 각각은 해당 끝에 실제로 화살표가 있을 때만 존재하므로, 평범한
`digraph { a -> b }` 에지는 `ep`만 보고하고 `sp`는 없으며, `arrowhead=none`이면 둘 다
없습니다.

이들은 노드 경계의 부착점입니다. Graphviz 자체 렌더러는 그리는 화살표 다각형을
펜 두께에 따라 달라지는 양만큼 이 점에서 안쪽으로 들여 그리므로, `ep`는 렌더링된
끝점의 복사본이 아니라 화살표를 *그려 넣을* 지점입니다.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

클러스터별 바운딩 박스입니다. `name`은 클러스터 서브그래프의 이름(예:
`cluster6`)입니다. 중첩된 클러스터는 계층을 이름에 인코딩하므로 명시적인 부모 링크는
노출하지 않습니다. `BoundsGeometry`와 같은 좌표계 관례를 따릅니다.

`label`은 클러스터 제목의 배치이며 클러스터가 제목을 선언했을 때만 존재합니다.
`x`/`y`는 위쪽의 상자 모서리 `x`/`y`가 아니라 `EdgeGeometry.label`과 마찬가지로
레이블 공간의 **중심**이고, `width`/`height`는 측정된 텍스트 크기이므로 레이블 상자는
`[x - width/2, x + width/2] × [y - height/2, y + height/2]`이며 항상 클러스터 상자
안에 놓입니다. 이것은 레이블의 *중심*이고, `render()`가 출력하는 `<text>`는
기준선을 가지며 기준선은 더 아래에 있다는 점에 유의하세요.

## 렌더링(`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

`render(g, format, opts?)`가 받는 형식의 닫힌 유니온입니다.
[다른 형식으로 렌더링](/ko/guide/render-formats)을 참조하세요.

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render`의 옵션입니다. `engine`의 기본값은 `'dot'`입니다. `inlineImages`(신규)의
기본값은 `false`이며, `true`이면 SVG 출력기가 `setImageResolver`로 등록된 리졸버를
참조해 외부 이미지(`image=`/HTML `<IMG>`)를 `data:` URI로 인라인합니다. 리졸버가
조회에 실패하거나 등록되지 않았다면 원시 `src` 그대로 내보내기로 폴백합니다. SVG가
아닌 형식에는 효과가 없습니다. [이미지 다루기](/ko/guide/images)를 참조하세요.

::: warning `yAxis`는 `RenderOptions`의 필드가 아닙니다
좌표 방향은 `getLayout`에만 해당하는 사항입니다. `render`가 만드는 원시 형식
문자열은 네이티브 y축 위쪽 좌표를 담고 있습니다. `getLayout`을 거치지 않고 y축
아래쪽이 필요하다면 후처리에서 뒤집으세요.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps`의 옵션입니다. `engine`의 기본값은 `'dot'`입니다.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

하나의 xdot 속성 스트림을 파싱한 결과입니다. 디코딩된 그리기 연산 배열과 파싱 상태
플래그 비트마스크로 이루어집니다. `getDrawOps`는 그래프의 모든 그리기 속성에 걸친
평탄화된 `XdotOp[]`만 그리기 순서(그래프 → 노드 → 에지)대로 반환합니다. 연산 종류
전체 표와 캔버스 예제는 [xdot으로 직접 렌더링](/ko/guide/xdot-drawops)을
참조하세요.

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

디코딩된 단일 xdot 그리기 연산이며 `kind`로 구분됩니다. 각 변형은 자신의 모양에서
이름을 딴 하나의 페이로드 속성을 가지며, `switch`에서 `kind`로 좁혀 안전하게
접근하세요. 좌표는 포인트 단위이고 네이티브 y축 위쪽 좌표계입니다(y축이 아래쪽인
캔버스에서는 뒤집으세요. 위에 링크한 가이드를 참조하세요).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

해석된 xdot 채우기/펜 색입니다. 단색이거나 선형/방사형 그라디언트입니다
(`XdotLinearGrad`/`XdotRadialGrad`는 각각 `x0,y0,x1,y1[,r0,r1]`과
`stops: { frac: number; color: string }[]` 배열을 가집니다).

## 루트 패키지(`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

레이아웃 엔진 이름입니다. 레지스트리는 열려 있어서(`GvcContext`에 사용자 지정
엔진을 등록할 수 있음) 모든 문자열을 받아들이며, `(string & {})`는 집합을 닫지
않으면서 내장 엔진에 대한 편집기 자동 완성을 유지합니다.
[레이아웃 엔진](/ko/guide/engines)을 참조하세요.

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

레이아웃 크기 계산을 위해 `image=` 또는 HTML `<IMG>` 셀이 참조하는 외부 이미지의
고유 크기를 반환하는 콜백을 등록합니다. 크기를 알 수 없으면 `null`을 반환하세요(C의
이미지 누락 동작, 즉 크기 0인 셀과 경고에 대응합니다). 이전에 설정한 크기 측정기를
해제하려면 `setImageSizer`에 `null`을 전달하세요.
[브라우저에서 사용하기](/ko/guide/browser)를 참조하세요.

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

외부 이미지의 원시 바이트를 반환하는 콜백을 등록하며, `RenderOptions.inlineImages`가
`true`일 때 참조됩니다. 순수 `Uint8Array`를 반환하면 `src` 파일 확장자에서 MIME
타입을 추론합니다. (리졸버가 반환했거나 리졸버가 등록되지 않아서) `null`이면 원시
`src` 그대로 내보내기로 폴백합니다. [이미지 다루기](/ko/guide/images)를 참조하세요.

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

교체 가능한 텍스트 측정이며 `setTextMeasurer`로 설치합니다(세 가지 내장 구현
`EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`가 제공됩니다).
`yoffsetCenterline`/`yoffsetLayout`은 선택적 세로 메트릭(기준선→중심선,
기준선→어센트)이며, 생략하면 pango로 보정된 기본값으로 폴백합니다.
[텍스트 측정](/ko/guide/text-measurement)을 참조하세요.

### `RenderResult`와 오류

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)`는 `renderSvg`의 결과 반환 방식 짝입니다. 던지는
대신 성공하면 `{ svg }`, 첫 번째 실패에서는 `{ errors: [one] }`을 반환합니다. 어떤 DOT
입력에 대해서도 반환하며 유효하지 않은 인수에 대해서만 던집니다. `errors`의 항목은
`cause`와 스택이 없는 평범한 데이터입니다.

던져지는 모든 dot-engine 오류는 추상 클래스 `DotEngineError`를 상속하고 `GvError`를
구현합니다.

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg`는 유효하지 않은 DOT 소스에 `ParseError`를, 레이아웃/렌더링 단계 실패에
`RenderError`를, dot-engine 버그에 `InternalError`를 던집니다. 호출자의 실수는
`code`가 `UsageErrorCode`(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`)인 표준 `TypeError` / `RangeError` /
`Error`를 던지며, 이들은 `GvError`가 아닙니다. `try`/`catch` 없이 구조화된 오류를
원하는 호출자는 대신 `tryRenderSvg`를 사용해야 합니다. 모든 코드는
[오류와 예외](/ko/guide/errors)를 참조하세요.

## 관계

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## 어떤 호출에서 어떤 타입이 나오는가

| 호출 | 반환값 |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder`(중첩) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string`(`DotEngineError` 또는 사용 오류 `TypeError`를 던짐) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

위의 모든 타입의 모든 필드는, 이 페이지가 요약한 것들을 포함해 생성된
[TypeDoc 참고 자료](/reference/)를 참조하세요. 좌표계 심층 설명(실제 예제 포함)은
[계산된 지오메트리 읽기](/ko/guide/geometry)를 참조하세요.
