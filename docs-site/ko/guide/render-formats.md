---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# 다른 형식으로 렌더링

`render`는 그래프를 레이아웃한 뒤 요청한 형식의 문자열을 출력합니다.
`parse` 또는 `createGraph`가 만든 모든 `Graph`를 받을 수 있습니다.

## 시그니처

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine`의 기본값은 `'dot'`입니다. 전체 목록은 [레이아웃 엔진](/ko/guide/engines)을
참조하세요.

## 형식

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## 형식별 용도

| 형식 | 일반적인 용도 |
|---|---|
| `'svg'` | 웹 페이지에 삽입합니다. 사람이 읽을 수 있고 손실 없이 확대·축소됩니다 |
| `'dot'` | 디버깅용이며, 레이아웃을 유지한 채 다른 graphviz 도구에 다시 입력할 때 사용합니다 |
| `'xdot'` | `getDrawOps`를 통해 사용자 지정 렌더러에 전달합니다 |
| `'json'` | 도구나 검사에 쓰는 기계 판독 가능한 그래프 데이터입니다 |
| `'plain'` | 가벼운 지오메트리 출력이며 스크립트에서 파싱하기 쉽습니다 |
| `'plain-ext'` | `'plain'`과 같지만 에지의 포트 좌표가 추가됩니다 |
| `'imap'` | `<img>` 태그용 서버 측 클릭 가능 이미지 맵입니다 |
| `'cmapx'` | `<img>` 태그용 클라이언트 측 `<map>` 요소입니다 |

## 예제

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## 다른 엔진 사용하기

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## `renderSvg`와의 관계

`renderSvg(dot, engine)`는 `parse` + `render`를 한 번에 호출하는 편의 래퍼이며
SVG 출력으로 제한됩니다. SVG가 아닌 형식이 필요하거나 이미 `Graph` 객체를
가지고 있을 때는 `render`를 직접 사용하세요.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
