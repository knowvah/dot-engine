---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API 참고 자료

공개 인터페이스는 의도적으로 작게 유지되어 있습니다. 대부분의 호출자는
`renderSvg`만 있으면 됩니다. 어떤 진입점을 쓸지는 [개요](/ko/guide/overview)를,
각 함수가 받고 돌려주는 구조는 [타입](/ko/guide/types)을, 모든 시그니처와 모든
필드, 모든 오버로드는 생성된 [참고 자료](/reference/)를 참조하세요.

> 타입 선언(`.d.ts`)은 `npm run build`가 생성합니다(`build:types` 단계가
> `tsc -p tsconfig.build.json`을 실행합니다). `package.json`의 `exports` 맵이
> 각 진입점에 `types` 조건을 연결하므로 `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api`, `@knowvah/dot-engine/render` 모두 편집기와 하위
> 빌드에서 타입이 해석됩니다.
>
> 빌드는 선언 맵(`.d.ts.map`)과 JS 소스 맵도 생성하며 패키지에 `src/` 소스가
> 포함되어 배포됩니다. 그래서 "정의로 이동"이 실제 TypeScript로 바로 연결되어
> 코드를 읽고 PR을 열기 쉽습니다.

이 페이지는 세 진입점별로 구성되어 있습니다(각각을 언제 사용하는지는
[개요](/ko/guide/overview)에 있습니다). 루트 `@knowvah/dot-engine` 패키지(파싱 +
렌더링을 한 번에 수행하며 프로세스 전역 설정 포함), `@knowvah/dot-engine/api`(코드로
그래프를 만들고 계산된 지오메트리를 읽어 옴), `@knowvah/dot-engine/render`(다중
형식 출력과 원시 그리기 연산)입니다. 아래의 모든 함수는 루트 패키지에서도 다시
내보냅니다(`src/index.ts`의 `export * from './api/index.js'` /
`export * from './render/index.js'`). 모든 것을 `@knowvah/dot-engine`에서 가져와도
동작하지만, 하위 경로 import가 어느 계층을 다루는지 더 명확하게 드러냅니다.

## `@knowvah/dot-engine`(루트)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

DOT 소스를 파싱하고 지정한 [레이아웃 엔진](/ko/guide/engines)을 실행해 SVG로
렌더링한 뒤 SVG 문자열을 반환합니다. 한 번의 호출로 끝나는 편의 래퍼입니다.
`GvcContext`를 만들고, 여덟 가지 내장 엔진과 SVG 렌더러를 등록하고, 레이아웃과
렌더링을 수행하고, 레이아웃을 해제합니다. 이 단계들을 분리해야 한다면 아래의
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)를
참조하세요.

- **`dotSource`** — DOT 언어로 작성된 그래프 소스.
- **`engine`** — `EngineName`: 내장 엔진(`dot`, `neato`, `fdp`, `sfdp`, `circo`,
  `twopi`, `osage`, `patchwork`) 중 하나 또는 사용자 지정으로 등록한 이름.
- **던지는 오류**: 입력에 문제가 있으면 `DotEngineError`를 던집니다. `dotSource`가
  유효하지 않으면 `ParseError`, 레이아웃이나 렌더링이 실패하면 `RenderError`,
  dot-engine 버그이면 `InternalError`(`cause` 포함)입니다. `dotSource` 또는
  `engine`이 유효하지 않으면(등록되지 않은 엔진 이름 포함) `code`가
  `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`인 `TypeError`를 던집니다.
  [오류와 예외](/ko/guide/errors)를 참조하세요.

전체 시그니처, JSDoc, `GvError` 필드 목록은 [참고 자료](/reference/)에 있습니다.

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg`의 결과 반환 방식 짝입니다. 어떤 DOT 입력에 대해서도 던지지 않고
반환합니다. 성공하면 `{ svg }`, 첫 번째 실패에서는 `{ errors: [one] }`이며,
`svg`와 `errors`는 서로 배타적입니다. 유효하지 않은 인수(`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`)에 대해서만 던집니다. `errors`의 각
항목은 평범하고 JSON으로 직렬화할 수 있는 데이터(`type`, `code`, `message`,
`friendlyMessage`, 그리고 있으면 `location` / `expected`. `cause`와 스택 트레이스는
없음)이므로 워커/postMessage 경계를 넘겨 보내거나 로그로 직렬화해도 안전합니다.
호출자가 예외를 잡는 대신 `code` / `type`으로 분기하고 싶다면 `renderSvg` +
`try`/`catch`보다 이것을 사용하세요. [오류와 예외](/ko/guide/errors)와
[참고 자료](/reference/)를 참조하세요.

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

그래프를 레이아웃하지 **않고** DOT를 메모리 내 그래프 모델로 파싱합니다. 렌더링
전에 그래프를 검사하거나 변환하거나, `@knowvah/dot-engine/api`의 `getLayout` /
`@knowvah/dot-engine/render`의 `render`에 넘길 때 유용합니다.

- **던지는 오류**: 구문 오류나 에지 방향 위반(예: 무방향 그래프의 `->`)에는
  `ParseError`를 던집니다. `ParseError`는 `DotEngineError`를 상속하고
  `type: 'syntax'`로 `GvError`를 구현하며 `location: { line, column, offset? }`를
  가집니다. `dotSource`가 문자열이 아니면 `TypeError` `ERR_INVALID_ARG_TYPE`입니다.
  [오류와 예외](/ko/guide/errors), [참고 자료](/reference/)를 참조하세요.

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError`는 dot-engine이 이 입력에서 실패했다는 뜻입니다.
`RenderError`는 알려진 레이아웃/렌더링 실패를 다룹니다(`UNKNOWN_LAYOUT`과
`UNSUPPORTED_FEATURE`의 `type`은 `semantic`). `InternalError`는 dot-engine
버그이며, 감싼 오류가 있으면 `cause`에 원래 오류가 들어 있습니다. 호출자의
실수는 대신 `code`가 있는 표준 `TypeError` / `RangeError` / `Error`를 던집니다.
`isGvError`는 문자열 `type`과 `code`를 확인하므로 중복된 번들 사이에서도
동작합니다. 모든 코드와 각 함수가 던질 수 있는 오류는 [오류와 예외](/ko/guide/errors)에,
`GvError`의 구조는 [타입](/ko/guide/types)에, `GvErrorCode`의 멤버 목록은
[참고 자료](/reference/)에 있습니다.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

레이아웃 중 레이블 크기를 계산할 때 참조하는 프로세스 전역 텍스트 측정기를
등록합니다(`null`로 해제). 해제하면 라이브러리 기본값으로 돌아갑니다(브라우저:
`CanvasTextMeasurer`, 헤드리스/Node: LUT 측정기가 연결되어 있지 않다면
`EstimateTextMeasurer`). 전체 결정 순서와 이 함수들과 함께 내보내는
`CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` 구현은
[텍스트 측정](/ko/guide/text-measurement)을 참조하세요.
[참고 자료](/reference/).

### `setImageSizer` / `setImageResolver`

관련은 있지만 서로 다른 두 가지 이미지 설정용 교체 지점입니다. 둘 다 같은
패턴(콜백을 등록하고 `null`을 전달해 해제)을 따르는 프로세스 전역 레지스트리이며,
호출자가 등록하기 전까지는 둘 다 아무 동작도 하지 않습니다.

- **`setImageSizer`** — 레이아웃 엔진이 렌더링 전에 HTML `<IMG>` 셀이나 노드
  `image=` 속성을 위한 공간을 확보할 수 있도록 외부 이미지의 *고유 크기*를
  보고합니다. `null`을 반환하거나(또는 크기 측정기를 등록하지 않으면) 네이티브
  Graphviz의 이미지 누락 동작, 즉 경고와 크기 0을 그대로 재현합니다.
- **`setImageResolver`**(신규 — 아래 [`inlineImages`](#inlineimages) 참조) —
  SVG 렌더러가 `xlink:href="src"`를 그대로 내보내는 대신 `data:` URI로 인라인할 수
  있도록 실제 이미지 *바이트*를 제공합니다.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver`는 순수 `Uint8Array`를 반환할 수 있으며(MIME은 `src`의 파일
확장자인 `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`에서 추론하고 그 밖의
경우 `application/octet-stream`으로 폴백합니다), MIME 타입을 명시하려면
`{ bytes, mime }`을 반환합니다. `src`를 해석할 수 없으면 `null`을 반환하세요.
렌더러는 리졸버가 등록되지 않은 것과 마찬가지로 원시 `src` 그대로 내보내기로
폴백합니다. 리졸버를 등록하는 것만으로는 아무 효과가 없으며, `render`의
`inlineImages` 옵션이 `true`일 때만 참조됩니다(아래). 실제 예제는
[이미지 다루기](/ko/guide/images)를, 두 콜백 타입은 [참고 자료](/reference/)를
참조하세요.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync`는 `renderSvg`의 비동기 짝입니다. 그래프에 필요한 웹 글꼴과 이미지
데이터를 미리 가져온 뒤 레이아웃과 렌더링을 수행합니다. `renderSvgInto`는 렌더링한
다음 id가 `id`인 요소의 자식을 교체하며, 기본적으로 SVG를 정화합니다(`trusted:
true`는 이를 건너뛰고, `sanitize`는 내장 정화기를 대체합니다). 잘못된 인수를 포함한
실패는 `renderSvg`와 같은 오류 클래스를 가진 프로미스 거부로 나타나며, 존재하지
않는 요소 id는 `ERR_INVALID_ARG_VALUE`로 거부됩니다. 글꼴 문제는 거부되지 않고
`fontIssues`로 돌아옵니다. [브라우저에서 사용하기](/ko/guide/browser)와
[이미지 다루기](/ko/guide/images), [참고 자료](/reference/)를 참조하세요.

### `GvcContext` / `renderWithContext` {#gvccontext-renderwithcontext}

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

레이아웃과 렌더링을 별도의 단계로 직접 구동해야 하는 호출자를 위한 하위 수준
오케스트레이션입니다. `renderSvg`는 바로 이것을 감싼 편의 래퍼입니다. 컨텍스트를
만들고, 엔진/렌더러를 등록하고, `layout`, `renderWithContext`, `freeLayout`을
호출합니다. 그런 제어가 필요할 때만 직접 사용하세요. 예를 들어 엔진의 일부만
등록하거나, 사용자 지정 `LayoutEngine` 또는 `RendererPlugin`을 추가하거나,
레이아웃을 다시 실행하지 않고 같은 레이아웃 결과를 여러 형식으로 렌더링할 때입니다
(`layout`을 한 번 호출한 다음 형식마다 `renderWithContext`를 호출하고 마지막에
`freeLayout`을 호출합니다). [참고 자료](/reference/).

## `@knowvah/dot-engine/api`

프로그래밍 방식 구성, 안전한 에지 삽입, 계산된 지오메트리 읽기입니다. DOT 텍스트를
손으로 쓰지 않고 그래프를 만들고 그 레이아웃을 평범한 데이터로 읽어 오기 위한
계층입니다. `LayoutSnapshot`과 그 중첩 구조는 [타입](/ko/guide/types)을
참조하세요.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

`render` / `getLayout` / `getDrawOps`에 넘길 준비가 된 새 그래프를 만듭니다.
기본값은 `directed: true`, `strict: false`, `name: ''`입니다. `GvGraphBuilder`를
반환하며, 여기에는 `addNode`, `addEdge`, `addSubgraph`, `setAttr`/`getAttr`,
`setHtmlAttr`(HTML 테이블 레이블용), 그리고 불투명한 `Graph` 핸들을 노출하는
`.graph` 속성이 있습니다. `GvGraphBuilder`/`GvNode`/`GvEdge` 인터페이스 전체는
[코드로 그래프 만들기](/ko/guide/build-a-graph)와 [참고 자료](/reference/)를
참조하세요.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

`GvGraphBuilder.addEdge`의 기반이 되는 하위 수준 에지 삽입 헬퍼입니다. 빌더의
불투명한 `GvNode`/`GvEdge` 핸들이 아니라 내부 `Node`/`Edge` 참조(예: `parse()`가
반환한 그래프에 추가하는 에지)를 다루는 호출자를 위해 직접 내보냅니다. 대부분의
호출자는 대신 `createGraph(...).addEdge(tail, head, attrs?)`를 사용해야 합니다.

- **`name`** — 에지 키이며 기본값은 `''`(익명)입니다. strict 그래프의 중복 제거는
  `(tail, head)`만으로 일치 여부를 판단하므로(무방향 그래프에서는 대칭) 이 값은
  무시됩니다.
- **반환값**: 새 에지이며, `g`가 strict이고 `(tail, head)` 에지가 이미 있으면
  기존 에지를 반환합니다(`cflag=1`인 `agedge`와 동일).

[코드로 그래프 만들기](/ko/guide/build-a-graph)와 [참고 자료](/reference/)를
참조하세요.

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

그래프의 계산된 지오메트리, 즉 노드 위치, 에지 스플라인 제어점, 에지 레이블,
클러스터 바운딩 박스, 전체 그래프 경계를 모두 포인트 단위로 담은 평범하고 JSON으로
직렬화할 수 있는 스냅샷을 반환합니다.

- **`g`** — 이미 레이아웃되어 있어야 합니다(`render(g, ...)`, `getDrawOps(g)`,
  `ctx.layout(g, engine)`를 통해). 아직 레이아웃되지 않은 그래프에 `getLayout`을
  호출하면 모두 0인 지오메트리를 조용히 반환하지 않고 오류를 던집니다.
- **`opts.yAxis`** — 기본값은 `'down'`입니다. 화면 좌표이며 원점은 왼쪽 위, y는
  아래쪽으로 증가하고 `bounds`는 `(0, 0)`으로 정규화됩니다. `'up'`은 네이티브
  Graphviz 좌표(원점은 왼쪽 아래, y는 위쪽으로 증가)를 반환하며 `bounds.x`/`bounds.y`는
  원래의 왼쪽 아래 모서리입니다.
- **던지는 오류**: `g`가 레이아웃되지 않았으면 `code`가 `ERR_INVALID_STATE`인
  `Error`, `g`나 `opts`가 잘못되었으면 `TypeError` `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE`를 던집니다. [오류와 예외](/ko/guide/errors)를 참조하세요.

노드 `width`/`height`는 포인트로 변환됩니다(내부 모델은 인치로 저장). 그 밖의 모든
좌표는 이미 포인트 단위입니다. 좌표계 설명은
[계산된 지오메트리 읽기](/ko/guide/geometry)를, `LayoutSnapshot`, `NodeGeometry`,
`EdgeGeometry`, `ClusterGeometry`, `BoundsGeometry`의 전체 필드 목록은
[타입](/ko/guide/types) / [참고 자료](/reference/)를 참조하세요.

### `Graph`

내부 모델에서 다시 내보내는 불투명 핸들 타입입니다. *타입*만 노출되며(변경 가능한
클래스는 노출되지 않음), 빌더의 `.graph`나 `parse()` 결과를 담은 변수에 타입
주석으로 사용하세요. 필드를 직접 생성하거나 들여다보지 말고, 상태를 다시 읽어
내려면 빌더, `getLayout`, `getDrawOps`를 사용하세요. [참고 자료](/reference/).

## `@knowvah/dot-engine/render`

다중 형식 출력과 원시 그리기 연산 접근입니다. 이미 `parse`했거나 빌더로 구성한
그래프를 렌더링하기 위한 계층입니다.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

그래프를 레이아웃하고 요청한 형식의 문자열로 렌더링합니다.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — 레이아웃 엔진(기본값 `'dot'`).
- **`opts.inlineImages`** — [아래](#inlineimages)를 참조하세요.
- **던지는 오류**: 레이아웃 또는 렌더링 실패에는 `RenderError`, dot-engine 버그에는
  `InternalError`, 잘못된 인수(등록되지 않은 엔진 또는 형식 포함)에는 `code`가 있는
  `TypeError`를 던집니다. [오류와 예외](/ko/guide/errors)를 참조하세요.

`opts.engine`은 `renderSvg`의 `engine` 매개변수와 대응하며, `format`은 `renderSvg`가
노출하지 않는 축입니다(`renderSvg`는 `'svg'`로 고정되어 있습니다).
[다른 형식으로 렌더링](/ko/guide/render-formats)과, `OutputFormat` 유니온 전체와
`RenderOptions` 구조는 [참고 자료](/reference/)를 참조하세요.

#### `inlineImages`

`RenderOptions.inlineImages`(기본값 `false`)는 외부 이미지를 원시
`xlink:href="src"` 그대로 내보내는 대신 `data:` URI로 인라인합니다. 위의
`setImageResolver`로 리졸버를 등록하지 않으면 효과가 없고, SVG가 아닌 형식에도
효과가 없습니다. 설정하지 않으면 출력은 이 옵션이 생기기 전과 바이트 단위로
동일합니다.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

브라우저에서 `fetch`로, Node에서 파일 시스템으로 해석하는 방법을 포함한 전체
안내는 [이미지 다루기](/ko/guide/images)를 참조하세요.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

`render`의 비동기 짝입니다. 같은 형식과 `engine`/`inlineImages` 옵션에 더해 호출별
비동기 이미지 훅과 글꼴 미리 가져오기를 제공합니다. 각 이미지 훅은 서로 다른
`src`마다 최대 한 번 실행되며, throw나 reject는 조회 실패로 처리됩니다. 마크업
형식의 출력은 정화되지 않은 마크업입니다. README의 "Security" 절을 참조하세요.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

`g`를 레이아웃하고 xdot로 렌더링한 뒤, 타입이 지정된 평탄한 그리기 연산 배열을
반환합니다. 노드 모양, 텍스트 스팬, 색, 글꼴이 판별 유니온 값으로 들어 있으며
(`switch`에서 `op.kind`로 좁힙니다), SVG나 xdot의 문자열 인코딩을 다루지 않고
사용자 지정 캔버스/WebGL/PDF 렌더러에 공급하기 위한 것입니다. `opts.engine`의
기본값은 `DEFAULT_DRAW_ENGINE`(`'dot'`)입니다.

- **던지는 오류**: 중간 xdot 출력을 다시 파싱하지 못하면 `ParseError`(dot-engine
  버그이며 실제로는 기대되지 않음), 레이아웃/렌더링 실패에는 `RenderError`, 그 밖의
  dot-engine 버그에는 `InternalError`, 잘못된 인수에는 `code`가 있는 `TypeError`를
  던집니다. [오류와 예외](/ko/guide/errors)를 참조하세요.

연산 종류 목록과 캔버스 예제는 [xdot으로 직접 렌더링](/ko/guide/xdot-drawops)을,
`XdotOp` 유니온 전체와 `Xdot`/`XdotColor` 구조는 [타입](/ko/guide/types) /
[참고 자료](/reference/)를 참조하세요.
