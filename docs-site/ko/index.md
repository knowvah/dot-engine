---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: 순수 TypeScript로 만든 Graphviz
  tagline: DOT를 넣으면 SVG가 나옵니다 — C는 필요 없습니다. 네이티브 Graphviz 바이너리도, WASM도 없습니다. 브라우저에서 실행되는 순수 TypeScript입니다.
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/guide/getting-started
    - theme: alt
      text: 플레이그라운드 열기
      link: /ko/playground
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/knowvah/dot-engine
features:
  - title: C Graphviz에 충실
    details: 표준 C 구현을 한 줄씩 옮긴 포팅입니다. dot 엔진은 골든 코퍼스에서 네이티브 바이너리와 엄격한 결정적 허용 오차(좌표는 ±0.01, 숫자가 아닌 내용은 완전 일치) 안에서 일치합니다.
  - title: 브라우저 네이티브, 런타임 의존성 없음
    details: C가 없습니다 — 네이티브 Graphviz 바이너리도, WASM 포팅도, 렌더링 서버도 없습니다. 레이아웃 엔진 자체가 TypeScript이므로 번들링해서 그대로 배포하면 됩니다.
  - title: 여덟 가지 레이아웃 엔진 전체 지원
    details: dot, neato, fdp, sfdp, circo, twopi, osage, patchwork를 SVG로 렌더링합니다.
  - title: 프로그래밍 방식 레이아웃과 지오메트리
    details: 렌더링만 하는 것이 아닙니다 — 계산된 노드 위치, 에지 스플라인, 클러스터 경계를 getLayout()으로 JSON 직렬화가 가능한 평범한 스냅샷으로 읽어 올 수 있어 -Tplain 파싱이 필요 없습니다.
---

## 직접 해 보기

아래 에디터는 실제 라이브러리를 브라우저에서 실행합니다. 왼쪽의 DOT를 편집하면
SVG가 실시간으로 갱신됩니다.

<Playground height="360px" />

## 시작할 길 고르기

처음이신가요? 지금 하려는 일에 맞는 문을 고르세요:

| 하고 싶은 일 | 여기서 시작하세요 |
| --- | --- |
| 각 부분이 어떻게 맞물리는지 이해하기 | [개요 — 멘탈 모델](/ko/guide/overview) |
| 설치하고 첫 그래프 렌더링하기 | [시작하기](/ko/guide/getting-started) |
| 구체적인 작업 해결하기 | [레시피 모음](/ko/guide/recipes) |
| 함수나 타입 찾아보기 | [API 참고 자료](/ko/guide/api) · [타입](/ko/guide/types) |
| 설치 없이 실험하기 | [플레이그라운드](/ko/playground) |

다른 도구에서 오셨나요? [C `dot` CLI에서](/ko/guide/migrate-from-c-cli)
또는 [JS Graphviz 라이브러리에서](/ko/guide/migrate-from-js-libs)를 참조하세요.

자동 생성된 전체 시그니처는
[생성된 API 참고 자료](/reference/)를 참조하세요. 렌더링된 그래프를 페이지에 삽입하시나요?
이미지 인라인 처리와 CSP 안내는 [이미지 다루기](/ko/guide/images)를 읽어 보세요.
