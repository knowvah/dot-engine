---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# 브라우저에서 사용하기

@knowvah/dot-engine은 Node 전용 API를 사용하지 않으며 브라우저용으로 번들링해도 안전합니다.
이 페이지는 클라이언트 측에서 실행할 때 알아야 할 두 가지를 다룹니다.

## 번들링 {#bundling}

이 라이브러리는 평범한 ES 모듈입니다. 최신 번들러(Vite, esbuild, Rollup, webpack)라면 어느
것이든 포함할 수 있습니다. 외부로 분리해야 할 런타임 의존성도, 호스팅해야 할 WASM
산출물도 없습니다.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

바로 이 사이트의 [플레이그라운드](/ko/playground)가 정확히 이렇게 동작합니다. 엔진을 임포트하여
브라우저에서 `renderSvg`를 호출하며, 서버 왕복은 없습니다.

## 텍스트 측정 {#text-measurement}

Graphviz는 레이블 크기를 정하기 위해 텍스트 크기가 필요합니다. @knowvah/dot-engine은 이를
자동으로 처리합니다:

- **브라우저에서**(`document`가 있을 때) 네이티브 `<canvas>` 2D 컨텍스트로 텍스트를
  측정합니다. 브라우저가 SVG를 렌더링할 때 쓰는 것과 같은 글꼴이므로 호스트에 충실합니다.
- **Node에서는** 내장 **Estimate** 측정기가 기본값입니다. 이는 Graphviz 자체의
  `estimate_textspan_size`를 그대로 따르는 결정적이고 헤드리스에서도 안전한 모델입니다.
  Node에서 올바른 레이아웃을 얻기 위해 `canvas` 설치나 글꼴 파일이 필요하지 않습니다.
  네이티브 캔버스 의존성 없이 호스트에 더 가깝게 크기를 맞추고 싶다면 선택적으로 사용할 수
  있는 힌팅된 조회 테이블(LUT) 측정기도 있습니다. 측정기를 명시적으로 선택하는 방법은
  [텍스트 측정](/ko/guide/text-measurement)을 참조하세요.

어느 경우에도 레이아웃에 글꼴 파일은 필요하지 않습니다.

## 웹 폰트: 미리 불러오기가 중요한 이유 {#web-fonts-why-prefetching-matters}

레이블 크기는 글꼴로 텍스트를 측정해서 얻습니다. 글꼴이 `@font-face`로 선언되었지만 아직
로딩이 끝나지 않았다면 브라우저는 **대체** 글꼴로 측정하고, 실제 글꼴이 도착하면 레이아웃이
틀어집니다. JetBrains Mono로 Chromium에서 측정한 결과, 레이블 상자의 너비는 글꼴이 로드되기
전(대체 글꼴)에 측정하면 **70.68 pt**, 로드된 후에는 **124.8 pt**였습니다.

비동기 진입점(`renderSvgAsync`, `renderAsync`, `renderSvgInto`)은 이 문제를 피합니다. 그래프가
요청할 글꼴을 수집하고, `document.fonts`를 통해 불러온 다음에야 레이아웃을 실행합니다.
`renderSvgAsync`는 로드 후에 측정했을 때와 같은 124.8 pt를 만들어 냈습니다.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`**(기본값 `3000`)는 글꼴별이 아니라 모든 글꼴이 공유하는 하나의
  마감 시간입니다.
- **`fontIssues`**는 `{ face, reason }`의 목록입니다. `reason: 'failed'`는 글꼴에서
  오류가 났거나(예: 404) 로드가 거부되었다는 뜻이고, `reason: 'timeout'`은 `fontTimeoutMs`
  안에 로드되지 않았다는 뜻입니다. 두 경우 모두 레이아웃은 대체 글꼴로 진행됩니다. 각
  문제는 `console.warn`으로도 출력됩니다. 글꼴 문제로 프라미스가 거부되는 일은 없습니다.
- **제한 사항:** `@font-face`로 선언된 패밀리만 보고할 수 있습니다. 시스템 글꼴이나 알 수 없는
  패밀리 이름은 "로드됨"으로 처리되므로(기다릴 대상이 없기 때문입니다), 철자가 틀린
  `fontname`은 `fontIssues`에 나타나지 않습니다.
- **Node와 Workers**에는 `document.fonts`가 없으므로 글꼴 미리 불러오기는 건너뛰고
  `fontIssues`는 `[]`입니다. 이미지 훅은 여전히 동작합니다. 직접 만든 글꼴 집합을 제공하려면
  `fontSet`(`load(font)`를 가진 모든 것)을 전달할 수 있습니다.

## 페이지에 렌더링하기: `renderSvgInto` {#rendering-into-a-page-rendersvginto}

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

주어진 id를 가진 요소의 자식을 렌더링된 `<svg>`(`element`로 반환)로 교체하며,
`innerHTML`은 사용하지 않고 `DOMParser`와 `importNode`를 사용합니다. 존재하지 않는 id는
`ERR_INVALID_ARG_VALUE`로 거부됩니다. SVG는 기본적으로 정화(scrub)되며, 직접 만든 정화기를
쓰려면 `sanitize`를, 정화를 건너뛰려면 `trusted: true`를 전달하세요. 정화기가 무엇을 제거하고
무엇을 남기는지는 README의 "Security" 절을 참조하고, Content-Security-Policy를 반드시
유지하세요.

## 외부 이미지: `setImageSizer` {#external-images-setimagesizer}

HTML 유사 레이블에 외부 이미지(`<IMG SRC="logo.png"/>`)가 들어 있으면, Graphviz는 셀 크기를
정하기 위해 그 이미지의 고유 크기가 필요합니다. (노드의 `image=` 속성은 크기 측정 대상이
아닙니다. 헤드리스 네이티브 Graphviz와 마찬가지로 노드는 일반 상자를 그대로 유지합니다.)
라이브러리는 파일 시스템을 읽을 수 없으므로 크기 측정기를 직접 제공합니다:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

그래프가 외부 이미지를 전혀 참조하지 않는다면 이를 호출할 필요가 없습니다. 이미지를
비동기로(예: 불러와서) 측정하려면 대신 `renderSvgAsync`에 비동기 `imageSizer`를 전달하세요.
[이미지](/ko/guide/images)를 참조하세요.

## Web Workers {#web-workers}

레이아웃은 동기적으로 실행되므로 큰 그래프는 실행 중인 스레드를 막습니다. 페이지의 반응성을
유지하려면 Worker에서 실행하세요. Worker 안에는 `document`가 없으므로 라이브러리는
`OffscreenCanvas`로 텍스트를 측정하고, 비동기 API는 Worker 자체의 글꼴 집합(`self.fonts`)을
통해 글꼴을 불러옵니다.

Worker의 글꼴은 페이지의 글꼴과 별개입니다. Worker 안에서 `FontFace` API로 등록하세요(CSS
`@font-face` 규칙은 Worker에 적용되지 않습니다).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Worker에서는 적어도 각 웹 폰트가 로드될 때까지는 `renderSvg`가 아니라 `renderSvgAsync`(또는
`renderAsync`)로 렌더링하세요. Chromium은 글꼴이 로드되기 전에 Worker에서 정확히 같은 글꼴
문자열을 측정한 적이 있으면, 로드된 이후에도 그 문자열을 대체 글꼴로 계속 측정합니다.
비동기 API는 측정하기 전에 글꼴을 불러오므로 이 문제를 겪지 않습니다.

## 기대하지 말아야 할 것 {#what-not-to-expect}

이 라이브러리는 **SVG**(그리고 `json` / `xdot` / `dot` / 이미지 맵 텍스트 형식)를 대상으로
합니다. 래스터 출력(PNG/JPG), PostScript/PDF, 대화형/GUI 백엔드는 범위 밖입니다. 다른 형식이
필요하면 SVG를 후처리 단계에서 변환하세요. 범위의 전체 경계는
[알려진 차이](/ko/divergences)를 참조하세요.

## 대형 그래프: SVG로 미리 렌더링하기 {#large-graphs-pre-render-to-svg}

아주 큰 그래프 — 대략 **노드 1만 개 초과 또는 수 MB의 DOT 소스** — 는 브라우저에서 런타임에
레이아웃하기가 현실적이지 않습니다. 레이아웃(mincross, 랭킹, 스플라인 라우팅)은
초선형이므로, 이는 이 엔진만의 한계가 아니라 **업스트림 Graphviz와 공유하는 규모의
한계**입니다. 이런 입력에서는 네이티브 `dot`, WASM 빌드(`@hpcc-js/wasm-graphviz`), 그리고 이
엔진 모두 똑같이 시간 초과되거나 메모리가 부족해집니다. (이 엔진은 메모리를 누수하지
**않습니다** — 렌더링당 힙은 일정하며, 한계는 오직 그래프 크기입니다. 측정 비교는
[성능 대시보드](/perf)를 참조하세요.)

이 규모의 그래프는 보기마다 브라우저에서 레이아웃하는 대신 **빌드 시점에 한 번 렌더링하여
결과 `.svg`를 제공**하세요. 네이티브 `dot`도 요청마다 실행하기에는 너무 느리기 때문에
똑같이 사용하게 되는 방식입니다.

[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins)(NPM에 게시됨)의 빌드 시점 사이트
어댑터가 바로 이 일을 합니다:

- `@knowvah/vitepress-plugin-dot` — VitePress(markdown-it), 빌드 시점
- `@knowvah/eleventy-plugin-dot` — Eleventy(markdown-it), 빌드 시점
- `@knowvah/docusaurus-plugin-dot` — Docusaurus(MDX/remark), 빌드 시점
- `@knowvah/dot-markdown-it` — 프레임워크에 독립적인 markdown-it 통합

빌드 시점 렌더링이 불가능한, 사용자가 제공하는 동적 그래프의 경우에는 대화형 렌더링을 적당한
크기의 그래프로 제한하고 출력된 SVG를 캐시하세요.
