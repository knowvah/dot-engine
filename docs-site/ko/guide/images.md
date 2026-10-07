---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# 이미지 다루기

`image="logo.png"`가 지정된 노드(또는 HTML 유사 레이블의 `<IMG SRC="logo.png">` 셀)는 기본적으로
픽셀이 삽입되지 않습니다. @knowvah/dot-engine은 소스를 **그대로** 출력합니다:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

SVG를 표시하는 쪽 — 브라우저의 `<img>`/인라인 `<svg>`, Electron 셸, 정적 사이트 빌드 — 이 그
`href`를 스스로 해석합니다. 이 페이지는 레이아웃 중에 그 href의 크기가 어떻게 정해지는지, 픽셀이
실제로 보이게 하는 세 가지 방법, 그리고 각각의 CSP 영향을 다룹니다.

## 이미지가 흐르는 방식 {#how-images-flow}

1. 그래프가 노드에 `image="logo.png"`를 선언하거나, HTML 유사 레이블에 `<IMG>` 셀이 들어
   있습니다.
2. HTML 유사 `<IMG>` 셀의 경우, Graphviz는 다른 무엇이든 레이아웃하기 전에 셀 크기를 정하려고
   이미지의 **고유 너비/높이**가 필요합니다 — 라이브러리는 이를 알아내기 위해 파일 시스템이나
   네트워크에 접근하지 않으므로, 여러분이 측정기(`setImageSizer`)를 등록합니다. 이는
   [브라우저에서 사용하기](/ko/guide/browser)에서 다루었고 아래에서 Node 기준으로 다시
   설명합니다. 노드의 `image=` 속성은 측정기로 크기가 정해지지 **않습니다**. 헤드리스 네이티브
   Graphviz와 마찬가지로 노드는 일반 상자를 유지하고 이미지는 그 안에 그려집니다.
3. 레이아웃은 각 `<IMG>`에 대해 측정기가 반환한 크기를 사용하여 실행됩니다.
4. SVG 출력기(`src/render/svg.ts`의 `usershape()`)는 3단계에서 계산된 상자로
   `<image xlink:href="...">`를 씁니다. 기본적으로 `href`는 XML 이스케이프만 거친 원본 `src`
   문자열이며, 그 외에는 아무것도 하지 않습니다.
5. 선택적으로 — `setImageResolver`를 호출하고 `{ inlineImages: true }`로 렌더링했다면 —
   출력기는 대신 `xlink:href="data:<mime>;base64,<bytes>"`, 즉 자체 완결형 `data:` URI를 씁니다.
   이는 추가 기능이며 네이티브 Graphviz가 하는 일이 아닙니다.

크기 측정과 인라인 처리는 서로 독립적이며 따로 등록되는 두 개의 교체 지점입니다. 이미지를
인라인하지 않고 크기만 측정할 수도 있고(흔한 경우 — 파일을 호스팅합니다), 둘 다 할 수도
있습니다(자체 완결형 SVG).

## Node와 브라우저에서의 크기 측정 {#sizing-in-node-vs-browser}

`setImageSizer`는 `(src: string) => { w: number; h: number } | null`을 받으며, 레이아웃 중에
`image=`/`<IMG>` 소스마다 한 번씩 호출됩니다. 아래의 `setImageResolver`와 같은 방식의 프로세스
전역 등록이므로, `render()`/`renderSvg()` 전에 한 번 호출하세요.

**브라우저** — 이미 `Image`와 `decode()`가 있으므로 실제 이미지를 측정하세요:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

`setImageSizer`는 동기 콜백입니다 — 안에서 `await`를 쓸 수 없습니다 — 따라서 브라우저에서는
레이아웃이 실행되기 전에 (`decode()`를 통해) 크기를 미리 확인하여 캐시에 담아 두고, 그 캐시를
동기적으로 읽습니다.

**Node** — DOM `Image`가 없고, 라이브러리가 파일 시스템을 대신 읽어 주지도 않습니다. 알려진
크기를 하드코딩하거나, 직접 읽어서(예: 매니페스트나 여러분이 제공하는 경량 PNG/JPEG 헤더
파서로) 같은 방식으로 결과를 전달하세요:

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

그래프가 외부 이미지를 전혀 참조하지 않는다면 이 부분은 완전히 건너뛰세요.

## 비동기 측정기와 리졸버(렌더링별) {#async-sizer-and-resolver-per-render}

`setImageSizer` / `setImageResolver`는 동기적인 프로세스 전역 등록이므로, 위의 브라우저 패턴은
캐시를 미리 채워야 합니다. 비동기 진입점은 훅을 **호출마다** 받아 대신 기다려 줍니다:

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- 각 훅은 레이아웃이 시작되기 전에 **고유한 `src`마다 최대 한 번**, 병렬로 호출됩니다. 그런 다음
  엔진은 수집된 결과를 대상으로 평소의 동기 레이아웃을 실행합니다.
- **예외를 던지거나 거부하는** 훅은 `null`을 반환하는 동기 훅과 똑같이 실패(`null`)로
  처리됩니다. 측정기는 크기 0, 리졸버는 원본 `src` 그대로 통과입니다.
- 비동기 훅이 주어진 경우, 실패해도 전역 `setImageSizer` / `setImageResolver`로 **폴백하지
  않습니다**. 주어지지 않으면 `renderSvg`에서처럼 전역 설정이 적용됩니다.
- 훅은 해당 렌더링 한 번에만 적용되며, 전역으로 등록되는 것은 없습니다.
- `imageResolver`는 `inlineImages`가 `true`일 때만 호출됩니다.
- `renderSvgInto`도 같은 옵션을 받습니다.

## 이미지가 보이게 하기 {#making-the-image-appear}

크기 측정은 레이아웃을 올바르게 만들어 주지만, SVG가 표시되는 곳에서 픽셀이 보이게 해 주지는
않습니다. 세 가지 방법 중 하나를 고르세요.

### 1. 파일 호스팅하기 {#1-host-the-file}

브라우저/소비자가 가져올 수 있는 URL(또는 SVG가 표시되는 위치에 상대적인 경로)로 이미지를
제공합니다. 가장 간단한 방법이며 렌더링 시점에 추가 작업이 필요 없습니다. 다만 표시하는
환경이 그 출처에 접근할 수 있어야 하고, 엄격한 `img-src` CSP가 있는 곳에 SVG를 표시한다면 그
출처도 거기서 허용 목록에 올라 있어야 합니다(아래 참조).

### 2. `data:` URI로 인라인하기 {#2-inline-as-a-data-uri}

인라인 처리 API를 사용하면 외부 가져오기가 전혀 없는 하나의 자체 완결형 SVG 문자열을 만들 수
있습니다. `setImageResolver`가 원시 바이트를 제공하고, `render(g, 'svg', { inlineImages: true })`가
이를 삽입합니다.

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

특정 MIME 타입을 명시하고 싶다면 `ImageResolver`가 `{ bytes: Uint8Array; mime?: string }`을
반환할 수도 있습니다(그렇지 않으면 출력기가 소스의 파일 확장자로 추론합니다 — `.png` →
`image/png`, `.svg` → `image/svg+xml` 등이며, 알 수 없는 확장자는 `application/octet-stream`으로
처리합니다). 등록을 지우려면 `setImageResolver(null)`을 호출하세요.

::: tip
SVG가 표시 시점에 외부 리소스를 가져올 수 없는 곳 — 이메일 클라이언트, 오프라인 문서, 엄격한
CSP 임베드, 또는 후속 네트워크 요청 없이 자체 완결형 문자열 하나를 원하는 모든 곳 — 으로
전달된다면 인라인 처리를 선택하세요. 대가는 출력 크기입니다. base64는 이미지를 약 33% 부풀리며,
이미지를 참조하는 모든 SVG에 중복으로 들어갑니다(렌더링 간에 브라우저 캐시를 재사용할 수
없습니다).
:::

`inlineImages`의 기본값은 `false`이며, 설정하지 않으면 출력은 인라인 처리 도입 이전의 그대로
통과 방식과 바이트 단위로 같습니다. `svg` 형식에만 영향을 주며 `json`/`xdot`/`dot`/기타 텍스트
형식에는 영향이 없습니다. 실패한 경우(등록된 리졸버가 없거나, 리졸버가 해당 `src`에 대해
`null`을 반환) 자동으로 원본 `src` 그대로 통과로 폴백합니다 — 인라인 처리는 우아하게 성능이
저하될 뿐 예외를 던지지 않습니다.

### 3. `imagepath` 방식의 기준 디렉터리 {#3-imagepath-style-base-directories}

네이티브 Graphviz의 `imagepath` 그래프 속성은 C 바이너리에게 상대 `image=` 값을 해석할 때 기준이
되는 파일 시스템/`GDFONTPATH` 방식의 검색 디렉터리를 알려 줍니다. @knowvah/dot-engine은
`imagepath`를 구현하지 않습니다 — 이 포팅은 디스크에서 이미지 데이터를 직접 읽지 않으므로
해석할 경로가 없습니다(범위의 전체 경계는 [알려진 차이](/ko/divergences)를 참조하세요). 그래프가
상대 `image=` 경로를 사용한다면, DOT 소스를 만드는 계층이나 `setImageSizer`/`ImageResolver`
콜백에서 여러분의 기준 디렉터리/URL을 기준으로 해석하세요 — 둘 다 그래프에 쓰인 그대로의 원본
`src` 문자열을 받으므로, 조회 전에 기준 경로를 문자열 앞에 붙이는 것은 정상적이고 권장되는
패턴입니다.

## CSP 안내 {#csp-guidance}

그래프를 사용자가 제공한다면(플레이그라운드, 임의의 DOT를 렌더링하는 임베드) 페이지의 `img-src`
정책을 처음부터 고려하세요.

**인라인된 이미지(`data:` URI)**에는 다음만 있으면 됩니다:

```
img-src 'self' data:
```

HTTP 응답 헤더로는:

```
Content-Security-Policy: img-src 'self' data:
```

또는 SVG를 호스팅하는 페이지의 메타 태그로는:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

이는 엄격한 설정입니다 — 바이트가 이미 SVG 문자열에 삽입되어 있으므로 외부 이미지 호스트에는
전혀 접속하지 않습니다.

반면 **호스팅된 이미지(위의 1번 방법)**는 표시하는 환경이 그 이미지가 실제로 있는 곳에서 가져올
수 있어야 합니다. 사용자가 제공한 그래프가 임의의 `image=` URL을 참조할 수 있다면 가능한 모든
호스트를 허용 목록에 올리는 것은 대개 비현실적이므로, 플레이그라운드/임베드 페이지는 느슨한
설정이 필요할 수 있습니다:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
`img-src *`(또는 그만큼 느슨한 `img-src`)를 **사이트 전체**의 기본값으로 삼지 마세요. 임의의
사용자 제공 그래프를 렌더링해야 하는 특정 플레이그라운드/임베드 페이지로 범위를 한정하고, 그
페이지에 한한 의도적이고 문서화된 완화로 취급하며, 다른 모든 페이지의 CSP는 엄격하게
유지하세요. 느슨한 `img-src`는 악의적인 그래프가 이미지 URL 부채널(예: 공격자가 제어하는
호스트로 보내는 쿼리 매개변수에 데이터를 담는 방식)로 데이터를 유출하거나 바람직하지 않은 원격
콘텐츠를 불러오게 할 수 있습니다. 이미지 집합을 직접 관리한다면 인라인 처리(`data:`)를 선호하고
모든 곳에서 `img-src 'self' data:`를 유지하세요.
:::

## 누락된 이미지 {#missing-images}

참조된 소스에 대해 `setImageSizer`가 `null`을 반환하면(또는 등록된 측정기가 없으면),
@knowvah/dot-engine은 네이티브 Graphviz의 `gvusershape` 실패와 똑같은 C 충실 경로를 따릅니다.
경고를 출력하고 이미지를 **크기 0**으로 취급하며, 이는 그 주변에서 계산되는 노드 상자
레이아웃에 영향을 줍니다. `setImageResolver`/`inlineImages`를 사용 중에 리졸버가 실패하면
출력기는 인라인하는 대신 원본 `src` 그대로 통과로 폴백합니다 — `href`는 여전히 기록되지만,
페이지의 다른 무언가가 그것을 가져올 수 없다면 해석되지 않습니다. 이미지/래스터 처리 전반에서
무엇이 범위 안이고 밖인지는 [알려진 차이](/ko/divergences)를 참조하세요.
