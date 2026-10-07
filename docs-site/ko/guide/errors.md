---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 오류와 예외

dot-engine은 두 종류의 오류를 던집니다. 어느 종류를 잡았는지에 따라 누가 무언가를
바꿔야 하는지 알 수 있습니다.

## 두 가지 계열, 하나의 규칙

| 계열 | 식별 방법 | 의미 | 조치 주체 |
|--------|---------------------|---------|----------|
| dot-engine 실패 | `err instanceof DotEngineError` | dot-engine이 이 입력에서 실패했습니다. 잘못된 DOT, Graphviz도 보고했을 치명적 오류, 지원되지 않는 Graphviz 기능, 또는 dot-engine 버그입니다 | DOT 작성자, 또는 버그 보고 |
| 사용 오류 | `err.code`가 `ERR_`로 시작하는 표준 `TypeError` / `RangeError` / `Error` | 호출이 잘못되었습니다. 잘못된 인수 타입, 알 수 없는 엔진 또는 형식 이름, 잘못된 호출 순서입니다 | 호출하는 코드 |

메시지 텍스트가 아니라 `.code`로 분기하세요. 메시지는 릴리스 사이에 바뀔 수
있지만 코드는 안정적입니다.

사용 오류는 `DotEngineError`가 아니며 `GvError`를 구현하지 않습니다. `name`은
Node.js와 마찬가지로 `TypeError`, `RangeError`, `Error` 그대로 유지됩니다.

## 클래스 참고 자료

아래 네 클래스는 모두 `DotEngineError`를 상속하고 `GvError` 구조(`type`, `code`,
`message`, `friendlyMessage`, 선택적 `location`과 `expected`)를 구현합니다.

### `DotEngineError`(추상) {#dotengineerror}

공통 기반 클래스입니다. dot-engine이 입력에 대해 발생시키는 모든 오류에
`instanceof DotEngineError`가 참입니다. 직접 생성할 수 없습니다. `type`, `code`,
`friendlyMessage`는 하위 클래스가 정의합니다.

### `ParseError`

| 항목 | 값 |
|------|-------|
| 던져지는 경우 | DOT 소스가 유효하지 않거나 그래프 종류에 맞지 않는 에지 연산자를 사용한 경우 |
| `type` | `syntax` |
| 코드 | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| 필드 | `location`(`{ line, column, offset? }`), `expected`(파서가 기대한 항목, `SYNTAX_*`에만 해당), `line` 및 `column` 게터 |
| 호출자 조치 | DOT 소스를 수정합니다. 작성자에게 `location`과 `friendlyMessage`를 보여 줍니다 |

`ParseError`의 `GENERIC_ERROR`는 소스가 너무 깊게 중첩되어 파서의 스택이 바닥났다는
뜻입니다.

### `HtmlParseError`

| 항목 | 값 |
|------|-------|
| 던져지는 경우 | 현재는 호출자에게 도달하지 않음(아래 참조) |
| `type` | `semantic` |
| 코드 | `HTML_PARSE_ERROR` |
| 필드 | `tag`(문제가 된 토큰). `location`과 `expected`는 없음 |
| 호출자 조치 | 없음. 잘못된 레이블을 찾으려면 렌더링 출력을 기대한 결과와 비교하세요 |

HTML 유사 레이블 파서는 알 수 없는 요소, 잘못된 형식의 속성, 잘못된 위치의
`<TABLE>`, `<HR>`, `<VR>`에 대해 `HtmlParseError`를 발생시킵니다. 레이아웃
단계에서 이를 잡아 Graphviz처럼 레이블에 내용을 주지 않습니다. 그래프는 빈
레이블로 그대로 렌더링됩니다. 공개 함수 중 이를 전파하는 것은 없습니다.

`HtmlParseError`는 패키지 루트에서 내보내지 않습니다. 혹시라도 하나가 호출자에게
도달한다면 `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`로
식별할 수 있습니다.

### `RenderError`

| 항목 | 값 |
|------|-------|
| 던져지는 경우 | Graphviz도 보고했을 방식으로 레이아웃이나 렌더링이 실패한 경우, 그래프가 사용할 수 없는 레이아웃 엔진을 지정한 경우, 또는 그래프가 dot-engine이 포팅하지 않은 Graphviz 기능을 사용한 경우 |
| `type` | `RENDER_ERROR`는 `render`, `UNKNOWN_LAYOUT`과 `UNSUPPORTED_FEATURE`는 `semantic` |
| 코드 | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| 필드 | 실패가 다른 오류를 감싼 경우 `cause`. `location`은 없음 |
| 호출자 조치 | `RENDER_ERROR`: 그래프를 변경합니다. `UNKNOWN_LAYOUT`: `layout=` 속성을 수정합니다. `UNSUPPORTED_FEATURE`: 해당 기능을 피합니다(예: `rotation=45`인 sfdp, [표](#unsupported-feature-reference) 참조) |

### `InternalError`

| 항목 | 값 |
|------|-------|
| 던져지는 경우 | dot-engine 내부의 단언 또는 불변 조건이 실패한 경우, 또는 dot-engine이 아닌 오류가 레이아웃/렌더링 파이프라인을 빠져나온 경우 |
| `type` | `render` |
| 코드 | `INTERNAL_ERROR` |
| 필드 | `cause`(감싼 경우 원래 오류) |
| 호출자 조치 | 오류를 유발한 DOT 소스와 함께 버그를 보고합니다 |

DOT 작성자가 무엇을 바꾸어도 `InternalError`를 확실하게 피할 수는 없습니다.

## 코드 참고 자료

### `GvErrorCode`

| 코드 | 클래스 | `type` | 의미 | 일반적인 원인 | 호출자 조치 | 발생 위치 |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | 예기치 않은 토큰 | 오타, `;` 또는 `}` 누락 | `location`의 DOT를 수정 | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | 문장 중간에 소스가 끝남 | 닫히지 않은 `{`, `[` 또는 문자열 | `location`의 DOT를 수정 | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | 무방향 그래프에서 `->` 사용 | `graph { a -> b }` | `--` 사용 | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | digraph에서 `--` 사용 | `digraph { a -- b }` | `->` 사용 | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | 소스가 너무 깊게 중첩되어 파싱할 수 없음 | 극단적으로 중첩된 서브그래프 | DOT를 평탄화 | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | 잘못된 형식의 HTML 유사 레이블 | 알 수 없는 요소, 잘못된 속성 | 없음: 레이블이 빈 상태로 렌더링됨 | 없음(내부에서 처리됨) |
| `RENDER_ERROR` | `RenderError` | `render` | Graphviz도 보고했을 치명적인 레이아웃 또는 렌더링 오류 | 레이아웃 단계에 잘못된 입력 | 그래프를 변경 | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | 그래프의 `layout=` 속성이 등록된 엔진을 지정하지 않음 | `layout="foo"` | 속성을 수정 | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | 그래프가 dot-engine이 포팅하지 않은 Graphviz 기능을 요청함 | `rotation=45`인 sfdp | 해당 기능을 피함 | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine 버그 | 단언 실패, 외부 throw | 버그 보고 | `renderSvg`, `render`, `getDrawOps`, 빌더 메서드, `GvcContext.layout`(감싸지 않음) |

### `UsageErrorCode`

| 코드 | 클래스 | 의미 | 일반적인 원인 | 호출자 조치 | 발생 위치 |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | 잘못된 타입, `null`, 또는 필수 인수 누락 | `renderSvg(undefined, 'dot')`, `getLayout(null)` | 호출 수정 | 인수를 받는 모든 공개 함수 |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | 타입은 맞지만 알 수 없는 값 | 등록되지 않은 엔진 또는 형식 이름, `getLayout(g, { yAxis: 'other' })` | 등록된 이름 또는 허용된 값 사용 | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | 숫자 인수가 범위를 벗어남 | 예약됨 | 호출 수정 | 현재 이를 발생시키는 공개 함수 없음 |
| `ERR_INVALID_STATE` | `Error` | 잘못된 상태에서 호출함 | 레이아웃 전에 `getLayout` 호출 | 먼저 레이아웃 수행(`render(g, ...)` 또는 `ctx.layout`) | `getLayout` |

등록되지 않은 엔진 인수는 DOT 소스에 유효한 `layout=` 속성이 설정되어 있어도
거부됩니다. 인수를 먼저 검사하기 때문입니다.

## `UNSUPPORTED_FEATURE` 참고 자료 {#unsupported-feature-reference}

아래의 모든 속성 값은, 네이티브 Graphviz라면 dot-engine이 포팅하지 않은
알고리즘을 실행했을 상황에서 레이아웃이 코드 `UNSUPPORTED_FEATURE`인
`RenderError`를 던지게 합니다. 대안은 Graphviz와 다른 레이아웃을 아무 말 없이
렌더링하는 것이었습니다. 검사는 "발생 조건" 열의 조건이 성립할 때만 작동하며,
다른 곳에서 같은 속성은 정상적으로 렌더링됩니다. 오류를 피하려면 속성을
제거하거나 지원되는 값으로 바꾸세요.

| 엔진 | 속성과 값 | 발생 조건 | 필요한 Graphviz 기능 |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | 항상(그래프에 노드가 2개 이상이고 `maxiter`가 음수가 아닌 경우) | 계층적 스트레스 매저라이제이션(`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Graphviz가 제약 조건을 구성하는 경우에만: `diredgeconstraints`가 true이거나 `hier*`, `overlap=ipsep`이거나 그래프에 최상위 클러스터가 있는 경우. 제약 조건이 없으면 Graphviz와 마찬가지로 스트레스 매저라이제이션으로 실행됩니다 | 제약 조건 매저라이제이션(`stress_majorization_cola`) |
| neato | `start=self` | `mode`가 `major`(기본값) 또는 `ipsep`인 경우 | 스마트 초기화(`smart_ini`). `mode=KK` 또는 `mode=sgd`에서는 Graphviz와 마찬가지로 렌더링당 한 번 `start=0 not supported with mode=self - ignored`를 기록합니다 |
| neato | `model=subset` | `mode`가 `major` 또는 `KK`인 경우 | 부분 집합 거리 모델 |
| neato | `model=circuit` | `mode`가 `major`이거나, 연결된 그래프에서 `KK`인 경우. `pack`이나 `packmode`가 없는 비연결 그래프의 `KK`는 Graphviz와 마찬가지로 경고를 기록하고 최단 경로를 사용합니다 | 회로 거리 모델(`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi`(대소문자 구분 없음) | 그래프(twopi는 컴포넌트, sfdp는 전체 그래프 또는 컴포넌트)에 노드가 2개 이상이고 Graphviz 자체의 겹침 개수(`countOverlap`, 노드 다각형을 검사함)가 0보다 큰 경우. 바운딩 박스로만 닿는 노드는 해당하지 않습니다. circo는 단일 컴포넌트 그래프에서만 도달합니다(컴포넌트가 여러 개이면 Graphviz도 `overlap`을 무시합니다). sfdp는 `overlap`이 prism 모드가 아닐 때만 도달합니다 | 보로노이 겹침 제거(`vAdjust`) |
| fdp | `overlap=` 다음 중 하나: `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | `N:` 힘 반복 시도 뒤에 해당 모드에 도달하는 경우, 즉 그 시도로 겹침이 모두 제거되지 않은 경우(또는 `N`이 0이거나 없는 경우). `N:` 접두사는 허용됩니다(예: `3:voronoi`) | 대응하는 `removeOverlapWith` 조정 알고리즘 |
| fdp | `splines=compound` | 클러스터 유무와 상관없이 항상 | 클러스터 회피 에지 라우팅(`compoundEdges`) |
| sfdp | `smoothing=` `none` 또는 `0`을 제외한 모든 값 | 항상 | `post_process_smoothing` |
| sfdp | `rotation=` 0이 아닌 모든 숫자 | 항상 | 겹침 제거 전의 `rotate()` |
| sfdp | `label_scheme=1`에서 `4` | `|edgelabel|...`이라는 이름의 노드가 있고, `overlap`이 `prism` 모드로 결정되며, 스킴이 3 또는 4이거나 스킴이 1 또는 2이면서 prism 시도 횟수가 0보다 큰 경우(기본값 `prism0`이 아니라 횟수가 지정된 `overlap=prism`). 4를 넘는 값은 0으로 간주합니다. 일반 에지 레이블은 이 조건을 유발하지 않습니다 | 에지 레이블 노드 처리(`edge_labeling_scheme`) |
| sfdp | `quadtree=none`(`0`, `false`도 해당) | 노드가 하나 이상인 모든 그래프. 메시지에는 결정된 스킴 이름이 표시됩니다 | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast`(`2`도 해당) | 노드가 하나 이상인 모든 그래프. 메시지에는 결정된 스킴 이름이 표시됩니다 | `spring_electrical_embedding_fast` |
| 모든 엔진 | 포팅되지 않은 특별한 `round_corners` 경우로 그려지는 노드 모양 | 노드가 해당 모양을 사용하는 경우. 메시지: `special shape N not yet ported` | 해당 모양의 `round_corners` 그리기 분기. 그리기 경우가 없는 모양 번호에 대한 내부 방어 장치이며, 이에 도달하는 이름 있는 모양은 알려져 있지 않습니다 |

대부분의 메시지는 `<attribute>=<value>: <what> is not supported yet` 형태입니다.
예외는 `smoothing`과 `rotation`(누락된 루틴 이름을 표시함), fdp 행, 모양 행이며,
위 표에 적힌 문구를 사용합니다. 텍스트가 아니라 `err.code === 'UNSUPPORTED_FEATURE'`로
분기하세요.

기본값을 선택하는 값(예: `quadtree=normal`, `true`, `yes`, `1`)과, Graphviz가
받아들이며 포팅된 값(예: `start=regular`, `start=random`, `model=mds`, `mode=KK`,
`mode=sgd`, `overlap=prism`, `scale` 계열, 그리고 neato, twopi, circo, sfdp에서의
`overlap=oscale`, `vpsc`, `ortho*` / `portho*` 모드)은 정상적으로 렌더링됩니다.

## 함수별 참고 자료

"사용"은 다른 코드를 명시한 행이 아닌 한 `ERR_INVALID_ARG_TYPE`인
`TypeError`를 뜻합니다.

| 함수 | 던질 수 있는 오류 |
|----------|-----------|
| `renderSvg(dotSource, engine)` | 사용(`dotSource` 또는 `engine`이 문자열이 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(엔진이 등록되지 않음), `ParseError`, `RenderError`, `InternalError` |
| `tryRenderSvg(dotSource, engine)` | 사용(`dotSource` 또는 `engine`이 문자열이 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(엔진이 등록되지 않음). 그 외에는 없음: DOT 입력으로 인한 모든 실패는 `errors`로 반환됩니다 |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE`(`dotSource`가 문자열이 아님), `ParseError` |
| `render(g, format, opts?)` | 사용(`g`, `format` 또는 `opts`의 타입이 잘못됨), `TypeError` `ERR_INVALID_ARG_VALUE`(엔진 또는 형식이 등록되지 않음), `RenderError`, `InternalError` |
| `getDrawOps(g, opts?)` | 사용(`g` 또는 `opts`의 타입이 잘못됨), `TypeError` `ERR_INVALID_ARG_VALUE`(`opts.engine`이 등록되지 않음), `RenderError`, `ParseError`(중간 xdot를 다시 파싱하지 못함: dot-engine 버그), `InternalError` |
| `createGraph(opts?)` 및 빌더 메서드(`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | 사용(잘못된 인수 타입, 문자열이 아닌 속성 값 포함), `InternalError`(그래프 모델이 노드 또는 서브그래프를 생성하지 못함) |
| `addEdge(g, tail, head, name?)`(`/api`에서) | 사용(객체가 아닌 `g`, `tail` 또는 `head`, 문자열이 아닌 `name`) |
| `getLayout(g, opts?)` | 사용(`g` 또는 `opts`가 객체가 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(`opts.yAxis`가 `'up'` 또는 `'down'`이 아님), `Error` `ERR_INVALID_STATE`(그래프가 레이아웃되지 않음) |
| `new GvcContext(measurer, options?)` | 사용(`measurer`에 `measure` 함수가 없음, `options`가 객체가 아님) |
| `ctx.register(plugin)` | 사용(렌더러 플러그인 또는 레이아웃 엔진이 아님) |
| `ctx.layout(g, engine)` | 사용(`g`가 객체가 아님, `engine`이 문자열이 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(엔진이 등록되지 않음), `RenderError` `UNKNOWN_LAYOUT`. 엔진 실패는 감싸지 않고 전파됩니다 |
| `ctx.freeLayout(g, engine)` | 사용, `TypeError` `ERR_INVALID_ARG_VALUE`(엔진이 등록되지 않음). 엔진 실패는 감싸지 않고 전파됩니다 |
| `ctx.bestRenderer(format)` | 사용(`format`이 문자열이 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(`format`에 대한 렌더러가 없음) |
| `renderWithContext(ctx, g, format, inlineImages?)` | 사용(`ctx`가 `GvcContext`가 아님, `g`가 객체가 아님, `format`이 문자열이 아님), `TypeError` `ERR_INVALID_ARG_VALUE`(`format`에 대한 렌더러가 없음). 렌더링 실패는 감싸지 않고 전파됩니다 |
| `setImageSizer(sizer)` | 사용(함수 또는 `null`이 아님) |
| `setImageResolver(fn)` | 사용(함수 또는 `null`이 아님) |
| `setTextMeasurer(measurer)` | 사용(`TextMeasurer` 또는 `undefined`가 아님) |

### 외부 throw를 감싸는 함수

| 함수 | 예기치 않은(dot-engine이 아닌) throw에 대한 동작 |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | `InternalError`로 감쌉니다. `cause`는 원래 오류입니다 |
| `renderWithContext` 및 모든 `GvcContext` 메서드 | **감싸지 않습니다.** 엔진 버그는 엔진이 던진 것 그대로, 예를 들어 `code`가 없는 평범한 `TypeError`로 호출자에게 도달합니다 |

`GvcContext`를 직접 사용한다면 `DotEngineError`도 사용 오류도 아닌 오류는
dot-engine 버그로 취급하세요.

## `tryRenderSvg`와 `renderSvg` 중 선택

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| 잘못된 DOT 또는 레이아웃 실패 | `DotEngineError`를 던짐 | `{ errors: [one] }`을 반환 |
| 잘못된 인수 | 사용 오류를 던짐 | 사용 오류를 던짐 |
| 오류 값 | 스택과 `cause`가 있는 `Error` | 평범한 데이터: `type`, `code`, `message`, `friendlyMessage`, 그리고 있으면 `location` / `expected` |
| 사용 시점 | 실패가 호출자를 중단시켜야 할 때 | `code`로 분기하거나 오류를 `postMessage`로 보내거나 로그에 남길 때 |

`tryRenderSvg`는 어떤 DOT 입력에 대해서도 던지지 않습니다. 인수 자체가 유효하지
않을 때만 던지며, 이는 호출하는 코드의 버그입니다. 반환하는 오류 객체에는
`cause`와 스택 트레이스가 없습니다.

## 감싸진 실패와 `cause`

`renderSvg`, `render`, `getDrawOps`가 dot-engine이 발생시키지 않은 오류를 잡으면,
`cause`가 원래 오류인 `InternalError`를 던집니다. `message`는 원래
메시지입니다.

`cause`는 열거 불가능하므로 `JSON.stringify(err)`에서 생략됩니다. 로그를 남길 때는
체인을 명시적으로 따라가세요(아래 마지막 예제 참조).

## 번들 간 검사

`instanceof DotEngineError`는 라이브러리의 한 복사본 안에서만 동작합니다. 복사본이
둘 이상 로드될 수 있다면(중복 번들, 플러그인 호스트) `isGvError(e)`를 사용하세요.
문자열 `type`과 `code`를 확인하며 복사본 사이에서도 동작합니다. `tryRenderSvg`가
반환하는 평범한 객체도 받아들입니다.

## 예제

두 계열을 구분합니다.

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

`tryRenderSvg` 결과를 처리합니다.

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

`InternalError`를 원인과 함께 기록합니다.

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## 함께 보기

- 각 함수의 시그니처는 [API 참고 자료(엄선)](/ko/guide/api)에 있습니다.
- `GvError`와 `RenderResult`의 구조는 [타입](/ko/guide/types)에 있습니다.
- `GvErrorCode`와 `UsageErrorCode` 유니온 전체는 [생성된 API(TypeDoc)](/reference/)에 있습니다.
