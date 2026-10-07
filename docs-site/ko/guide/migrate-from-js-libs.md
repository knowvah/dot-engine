---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# 다른 JS Graphviz 라이브러리에서 마이그레이션

viz.js / `@viz-js/viz`, `@hpcc-js/wasm`(`@hpcc-js/wasm-graphviz`),
`d3-graphviz`는 모두 실제 C Graphviz를 **WebAssembly**로 컴파일해 호출하는
방식으로 JavaScript에서 Graphviz를 사용할 수 있게 해 줍니다.
@knowvah/dot-engine은 처음부터 새로 작성한 **TypeScript 포팅**입니다. 레이아웃
엔진, 파서, SVG 출력기가 컴파일된 바이너리가 아니라 TypeScript 소스입니다.

이 차이는 주석이 아니라 핵심입니다.

| | WASM 래퍼(viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| 구현 | `.wasm` 바이너리로 컴파일한 실제 C Graphviz | 순수 TypeScript 포팅, 컴파일된 산출물 없음 |
| 모듈 초기화 | 비동기 — 처음 사용하기 전에 WASM 모듈을 인스턴스화하고 await해야 함 | 없음 — `import`한 뒤 동기적으로 호출 |
| 번들 | JS와 함께 `.wasm` 에셋(수백 KB에서 수 MB)을 배포 | JS만 필요, 트리 셰이킹 가능 |
| 디버깅 | WASM 덩어리(또는 C 소스가 있다면 C 소스)를 따라가며 디버깅 | 소스 맵으로 실제 TypeScript를 따라가며 디버깅 |
| 스레딩 모델 | 일부 빌드는 Web Worker에서 레이아웃 실행 | 다른 TS 함수처럼 호출한 스레드에서 실행 |
| 출력 형식 | 기반 C 빌드가 컴파일된 대로 — 보통 래스터/PDF를 포함한 Graphviz 전체 집합 | SVG + DOT/json/xdot/plain/imagemap 텍스트 형식 — 아래 참조 |

"함수를 호출하면 SVG가 돌아오고, 비동기 절차도 없고, 호스팅할 WASM 에셋도 없다"가
여러분의 사용 사례라면 @knowvah/dot-engine이 바로 그 용도입니다. 래스터나 PDF
출력에 의존한다면 아래의 [WASM을 계속 써야 하는 경우](#when-to-stay-on-wasm)를
참조하세요.

## API 차이

세 라이브러리는 형태가 서로 다릅니다. 아래 표는 일반적인 마이그레이션
경우입니다(대략적인 내용이므로 각 라이브러리의 공식 문서로 확인하세요. 각 행
아래의 인용을 참조하세요).

| 라이브러리 | 일반적인 호출 | @knowvah/dot-engine 대응 코드 |
|---|---|---|
| `@viz-js/viz`(viz.js의 후속) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — 비동기이며 `Viz.instance()`가 Promise를 반환 | `renderSvg(dot, 'dot')` — 동기식이며 인스턴스/초기화 단계 없음 |
| viz.js 2.x(레거시, `new Viz()`) | `new Viz().renderString(dot)` — `Promise<string>` 반환 | `renderSvg(dot, 'dot')` — 동기식 |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()`를 한 번 호출한 뒤 `graphviz.dot(dot)`(로드 후에는 동기식) | `renderSvg(dot, engine)` — 로드/워밍업 단계가 전혀 없음 |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — 출력을 DOM에 바인딩하고 전환 애니메이션 적용 | `renderSvg(dot, engine)`는 SVG **문자열**을 반환하며, DOM에는 직접 삽입(예: `el.innerHTML = svg`) |

오른쪽 열의 모든 @knowvah/dot-engine 호출은 **동기식**입니다. 인스턴스화할 WASM
바이너리가 없으므로 await할 모듈도 없습니다. @knowvah/dot-engine 호출을 감싸고
있는 `await`/`.then()`은 모두 제거하세요. 애초에 필요하지 않았습니다.

- `@viz-js/viz`의 `Viz.instance()` → Promise와 `renderSVGElement()` 메서드는
  viz-js.com에 문서화되어 있으며, 작성 시점의 프로젝트 공개 사용 예제로
  확인했습니다.
- viz.js 2.x의 `new Viz().renderString(dot)`는 (지금은 대체된) 해당 릴리스
  계열에 문서화된 API입니다. 현재 설치본을 사용 중이라면 실제로
  `@viz-js/viz`를 쓰고 있는지 확인하세요.
- `@hpcc-js/wasm-graphviz`의 `Graphviz.load()` / `graphviz.dot()` 조합은
  작성 시점의 패키지 공개 사용 예제로 확인했습니다. 별개의 더 오래된
  `@hpcc-js/wasm` 패키지는 과거 릴리스에서 `graphviz.layout(dot, format, engine)`
  호출도 추가로 제공했습니다. 정확한 시그니처에 의존하기 전에 설치된 버전의
  공식 문서를 확인하세요.
- `d3-graphviz`의 `.graphviz().renderDot(dot)` 체인과, 내부적으로 `@hpcc-js/wasm`
  위에 만들어졌다는 점은 작성 시점의 프로젝트 공개 README로 확인했습니다.

### `renderDot`의 DOM 바인딩은 여기서 다루지 않습니다

`d3-graphviz`는 SVG 렌더링 이상의 일을 합니다. 결과를 D3 선택에 바인딩하고,
다시 렌더링할 때 차이를 비교하며, 레이아웃 사이의 전환을 애니메이션으로
보여줍니다. @knowvah/dot-engine은 DOM에 대해 전혀 관여하지 않습니다.
`renderSvg`/`render`는 평범한 문자열을 반환합니다. 두 레이아웃 사이의
d3-graphviz 방식 전환 애니메이션이 필요하다면, `renderSvg` 호출 두 번과
직접 구현한 DOM 비교 로직 위에 만들어야 하는 기능입니다(또는 그 특정 기능에는
계속 d3-graphviz를 사용하세요. 아래 참조).

## 문자열 형식을 파싱하지 않고 레이아웃 데이터 얻기

세 WASM 라이브러리 모두 Graphviz 고유의 JSON 또는 plain 텍스트 형식을 요청할
수 있으며, 노드/에지 좌표를 얻으려면 그 문자열을 직접 파싱해야 합니다.
@knowvah/dot-engine은 텍스트 왕복 과정을 건너뜁니다. (`render` 뒤에)
`getLayout(g)`을 호출하면 타입이 지정되고 JSON으로 직렬화할 수 있는 스냅샷을
바로 얻으며, 파싱할 `-Tjson`/`-Tplain` 문자열이 없습니다.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

스냅샷의 전체 구조, 단위, `yAxis` 옵션은 [계산된 지오메트리 읽기](/ko/guide/geometry)를
참조하세요.

## WASM을 계속 써야 하는 경우 {#when-to-stay-on-wasm}

범위에 대해 솔직하게 생각하세요. @knowvah/dot-engine은 SVG와
`dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx` 텍스트 형식을 대상으로
합니다. 래스터 형식(PNG/JPEG/GIF/...)이나 PostScript/PDF/EPS는 출력하지
**않으며**, 이는 아직 끝내지 못한 공백이 아니라 의도한 범위의 경계입니다. 정확한
비목표 목록은 [알려진 차이](/ko/divergences)를 참조하세요.

애플리케이션에 레이아웃 엔진이 직접 출력하는 `-Tpng`나 `-Tpdf`가 필요하다면,
위의 WASM 기반 라이브러리가 여전히 그 경우를 지원합니다. 실제 C Graphviz를
실행하므로 해당 빌드가 컴파일된 모든 출력 형식을 지원하기 때문입니다. 그런
경우에는 그 코드 경로 하나에만 WASM 라이브러리를 계속 사용하거나,
@knowvah/dot-engine으로 `'svg'`로 렌더링한 뒤 별도의 도구로 SVG를 래스터/PDF로
변환하세요.

## 함께 보기

- [레이아웃 엔진](/ko/guide/engines)
- [다른 형식으로 렌더링](/ko/guide/render-formats)
- [계산된 지오메트리 읽기](/ko/guide/geometry)
- [알려진 차이](/ko/divergences)
- [시작하기](/ko/guide/getting-started)
