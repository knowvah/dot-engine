---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# `dot` 명령줄 도구에서 마이그레이션

C로 작성된 `dot`/`neato`/`fdp`/... 바이너리는 `.dot` 파일(또는 stdin)을 읽어
렌더링된 파일(또는 stdout)을 씁니다. @knowvah/dot-engine에는 파일 시스템이
없습니다. DOT **문자열**을 입력으로 받아 렌더링된 **문자열**을 반환합니다(또는
`getLayout`을 사용하면 파싱해야 하는 문자열 대신 평범한 JavaScript 지오메트리
객체를 반환합니다).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

위의 파일 읽기/쓰기는 라이브러리가 아니라 여러분의 코드입니다.
@knowvah/dot-engine은 디스크에 접근하지 않습니다. 그 덕분에 읽을 `input.dot`이
없는 브라우저 탭에서도 수정 없이 동작합니다.

## `-K<engine>` — 레이아웃 엔진

`-K`는 레이아웃 엔진을 선택합니다. @knowvah/dot-engine은 같은 이름을
`renderSvg`의 `engine` 인수 또는 `render`의 `opts.engine` 필드로 받습니다. 여덟
가지 엔진이 모두 포팅되어 있습니다.

| `-K` 값 | @knowvah/dot-engine `engine` 문자열 |
|---|---|
| `-Kdot` | `'dot'`(`engine`을 생략했을 때 `render`의 기본값이기도 합니다) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

각 엔진의 동작과 적합성 등급은 [레이아웃 엔진](/ko/guide/engines)을
참조하세요.

## `-T<format>` — 출력 형식

`renderSvg`는 SVG 전용이며, 그 밖의 형식에는 `render(g, format, opts?)`를
사용합니다. @knowvah/dot-engine의 `OutputFormat` 유니온은 다음 `-T` 대상을
포함합니다.

| `-T` 값 | @knowvah/dot-engine `format` 문자열 | 비고 |
|---|---|---|
| `-Tsvg` | `'svg'` | `renderSvg`의 유일한 출력이기도 합니다 |
| `-Tdot` | `'dot'` | 레이아웃 속성(`pos`, `bb`, ...)이 추가된 DOT 소스 |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot 명령 |
| `-Tjson` | `'json'` | 전체 그래프를 JSON으로 출력 |
| `-Tplain` | `'plain'` | 공백으로 구분된 노드/에지 지오메트리 |
| `-Tplain-ext` | `'plain-ext'` | `plain`에 에지의 포트 좌표 추가 |
| `-Timap` | `'imap'` | 서버 측 HTML 이미지 맵 |
| `-Tcmapx` | `'cmapx'` | 클라이언트 측 HTML `<map>` 요소 |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**지원하지 않음:** 래스터 형식(`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps`, GUI/대화형 백엔드. 이는 의도한 범위의 경계입니다. 전체
비목표 목록은 [알려진 차이](/ko/divergences)를 참조하세요. 래스터가 필요하면
`'svg'`로 렌더링한 뒤 후속 단계에서 변환하세요(헤드리스 브라우저, `resvg` 등).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — 속성

CLI의 전역 속성 플래그는 명령줄에서 모든 그래프/노드/에지의 기본값을
설정합니다. @knowvah/dot-engine에는 명령줄 플래그가 없습니다. 같은 속성을 DOT
소스에 직접 설정하거나, 코드에서 그래프를 구성한다면 빌더 API로 설정하세요.

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

빌더 API 전체는 [코드로 그래프 만들기](/ko/guide/build-a-graph)를
참조하세요.

## CLI가 직접 제공하지 못하는 지오메트리 얻기

`-Tplain`은 스크립트가 텍스트 출력에서 노드/에지 좌표를 긁어낼 수 있도록 만든
것입니다. @knowvah/dot-engine은 이 왕복 과정을 건너뜁니다. `render` 뒤에
`getLayout(g)`을 호출하면 모든 노드 위치, 에지 스플라인, 전체 바운딩 박스를
담은, 타입이 지정되고 JSON으로 직렬화할 수 있는 스냅샷을 얻습니다. 파싱할 텍스트
형식이 없습니다.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

스냅샷의 전체 구조와 `yAxis` 옵션(네이티브 graphviz는 y축이 위쪽, 브라우저는
아래쪽)은 [계산된 지오메트리 읽기](/ko/guide/geometry)를 참조하세요.

## 글꼴과 이미지: CLI는 파일 시스템을 읽지만 @knowvah/dot-engine은 읽지 않습니다

네이티브 `dot`은 컴퓨터에 설치된 글꼴로 텍스트를 측정하고, 작업 디렉터리를
기준으로 파일을 읽어 `image="..."` 속성을 해석합니다. @knowvah/dot-engine은
파일 시스템에 접근할 수 없으므로 둘 다 디스크에서 읽지 않고 호스트
애플리케이션이 주입합니다.

- **텍스트 측정** — `setTextMeasurer`가 `TextMeasurer`를 설치합니다. 지정하지
  않으면 라이브러리가 적절한 기본값(브라우저 캔버스, 또는 Node에서는 결정적
  메트릭 모델)을 자동으로 선택합니다. [텍스트 측정](/ko/guide/text-measurement)을
  참조하세요.
- **이미지** — `setImageSizer`(그리고 인라이닝용 `setImageResolver`)로 이미지의
  고유 크기와 이미지 데이터를 직접 제공합니다. @knowvah/dot-engine은 여러분을
  대신해 파일 정보를 조회할 수 없기 때문입니다. [이미지 다루기](/ko/guide/images)를
  참조하세요.

## 함께 보기

- [레이아웃 엔진](/ko/guide/engines)
- [다른 형식으로 렌더링](/ko/guide/render-formats)
- [계산된 지오메트리 읽기](/ko/guide/geometry)
- [알려진 차이](/ko/divergences)
- [시작하기](/ko/guide/getting-started)
