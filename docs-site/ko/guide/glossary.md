---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# 용어집

용어마다 하나의 정의가 있으며, 영어 용어 기준 알파벳순으로 나열되어 있습니다. 각 항목은 해당
내용을 깊이 다루는 가이드 페이지(또는 소스)로 연결됩니다.

## 클러스터

이름이 `cluster`로 시작하는 서브그래프(예: `subgraph cluster_build`)입니다. Graphviz는
이를 소속 노드를 묶는 별도의 상자로 렌더링합니다. 내부적으로 @knowvah/dot-engine의 지오메트리
스냅샷은 모든 클러스터 서브그래프의 키를 DOT 소스의 이름이 아니라 `cluster6`과 같은 위치
기반 이름(`ClusterGeometry.name`)으로 다시 지정하므로, 원래 이름이 필요한 소비자는 레이아웃
전에 `idByName` 맵을 만들어 두었다가 이후에 `snapshot.clusters`의 키를 다시 지정합니다.
키를 다시 지정하는 패턴은 [레시피](/ko/guide/recipes)를, `addSubgraph`로 클러스터를 만드는
방법은 [코드로 그래프 만들기](/ko/guide/build-a-graph)를 참조하세요.

## 적합성

@knowvah/dot-engine의 렌더링 결과가 C 오라클과 "일치한다"는 주장 뒤에 있는, 기계적으로 검사되는
속성입니다. 두 SVG를 정규화된 요소 트리로 파싱한 뒤, 모든 숫자 값(좌표, 경로 데이터,
`points`)은 고정된 허용 오차 이내에서 일치해야 합니다 — 결정적 엔진(`dot`, `circo`, `twopi`,
`osage`, `patchwork`)은 **±0.01pt**, 반복적인 힘 기반 엔진(`neato`, `fdp`, `sfdp`)은
**±0.5pt**입니다 — 그리고 숫자가 아닌 모든 값(태그, 색상, 텍스트)은 완전히 같아야 합니다.
SVG 출력이 바이트 단위로 같다는 주장은 아닙니다. [적합성](/ko/conformance)을 참조하세요.

## 좌표계 / y축

Graphviz의 네이티브 좌표계는 **y-up**이며 원점은 왼쪽 아래 모서리입니다. 브라우저와 화면은
**y-down**이며 원점은 왼쪽 위입니다. `getLayout`은 기본값이 `yAxis: 'down'`이며(모든 y를
뒤집고 `bounds`를 `(0, 0)`으로 정규화합니다), `yAxis: 'up'`을 지정하면 네이티브 Graphviz
좌표를 그대로 반환합니다. (`getDrawOps`가 반환하는) xdot 그리기 연산은 항상 네이티브 y-up
좌표계입니다. [계산된 지오메트리 읽기](/ko/guide/geometry)를 참조하세요.

## 차이

@knowvah/dot-engine의 렌더링 결과와 오라클 사이의 차이 중 조사되어 근본 원인이 밝혀지고
목록화된 것으로, 조용히 묵인된 것과 구별됩니다. 목록화된 차이는 세 가지 부류 중 하나에
속합니다. 의도적으로 적합하게 만들지 않는 허용된 델타(예: 플랫폼 간 부동소수점
비결정성), 아직 해소 중인 추적 대상 롱테일, 그리고 명시적인 비목표입니다. 목록에 없는
차이는 허용된 동작이 아니라 결함으로 취급됩니다. [알려진 차이](/ko/divergences)를
참조하세요.

## DOT

그래프 기술 언어로, 노드, 에지, 속성 문장으로 이루어진 `digraph { ... }` / `graph { ... }`
형태입니다. @knowvah/dot-engine은 결과를 레이아웃 엔진에 넘기기 전에 이를 파싱합니다.
[시작하기](/ko/guide/getting-started)를 참조하세요.

## 이미지 크기 측정기 / 리졸버

외부 이미지(usershape 노드와 `<IMG>` HTML 레이블 셀)를 위한 두 개의 주입 가능한 교체
지점입니다. `ImageSizer`는 이미지의 고유 너비/높이를 보고하여 픽셀 데이터를 불러오지
않고도 노드 크기 계산과 레이블 레이아웃을 진행할 수 있게 하고, `ImageResolver`는 렌더링 시
삽입할 실제 이미지 바이트를 제공합니다. [이미지](/ko/guide/images)를 참조하세요.

## 레이아웃 엔진

@knowvah/dot-engine이 등록하는 여덟 가지 레이아웃 알고리즘 중 하나로, 이름으로
선택합니다(`renderSvg(dot, engine)`): `dot`(계층형/레이어형), `neato`(스프링 모델,
Kamada–Kawai), `fdp`(힘 기반), `sfdp`(대형 그래프를 위한 다중 스케일 힘 기반),
`circo`(원형), `twopi`(방사형), `osage`(클러스터형), `patchwork`(스콰리파이드 트리맵)입니다.
[레이아웃 엔진](/ko/guide/engines)을 참조하세요.

## 오라클

표준 C 소스에서 빌드한 네이티브 C Graphviz `dot` 바이너리로, @knowvah/dot-engine의 모든
렌더링 결과가 이에 대해 검증됩니다. @knowvah/dot-engine은 참조 구현과 포팅 사이의 ABI
불일치를 피하기 위해 이 바이너리를 직접 실행하며(WASM 빌드는 결코 사용하지 않습니다),
오라클 비교가 어떻게 실행되고 보고되는지는 [적합성](/ko/conformance)과
[패리티](/parity)를 참조하세요.

## 랭크 / rankdir

`dot`의 계층형 레이아웃에서 **랭크**는 그림에서 같은 깊이에 놓이는 노드의 한 층입니다.
`rankdir`는 랭크가 흐르는 방향을 지정합니다 — 기본값 `TB`(위에서 아래로), 또는 `LR`,
`BT`, `RL` — 그래프 속성(`b.setAttr('rankdir', 'LR')`)으로 설정합니다.
[코드로 그래프 만들기](/ko/guide/build-a-graph)를 참조하세요.

## 스플라인 / 에지 라우팅

에지가 그려지는 곡선(베지어) 경로로, 노드와 클러스터 장애물을 피해 돌아가는 라우팅 코드가
계산합니다. @knowvah/dot-engine은 라우팅된 제어점을 `getLayout`의 `EdgeGeometry.points`
— 포인트 단위의 `{x, y}` 점이 순서대로 담긴 배열 — 로 제공합니다.
[계산된 지오메트리 읽기](/ko/guide/geometry)를 참조하세요.

## 텍스트 측정기

레이블의 너비/높이를 보고하여 레이아웃 전에 노드와 에지 레이블의 크기 계산을 진행할 수
있게 하는, 주입 가능한 교체 지점(`TextMeasurer`)입니다. @knowvah/dot-engine은 렌더링마다
하나를 자동으로 결정합니다 — 먼저 명시적인 `setTextMeasurer`, 그다음 사용할 수 있으면
브라우저의 `<canvas>`, 그다음 Node에서는 내장된 결정적 `EstimateTextMeasurer` 순이며 —
사용자 지정 구현을 받을 수도 있습니다. [텍스트 측정](/ko/guide/text-measurement)을
참조하세요.

## Usershape

노드의 모양이 그려진 다각형이나 타원이 아니라 (`image` 속성을 통해) 외부에서 제공된
이미지인 노드를 가리키는 Graphviz의 용어입니다. @knowvah/dot-engine은 라이브러리를
브라우저에서 안전하게 유지하기 위해 파일을 직접 읽지 않고, 주입 가능한 이미지 크기
측정기/리졸버 교체 지점을 통해 usershape를 해석합니다. [이미지](/ko/guide/images)를
참조하세요.

## xdot

확장 DOT 그리기 연산 형식입니다. 렌더링된 그래프를 어떻게 칠해야 하는지를 칠하는 순서대로
정확히 기술하는 구조화된 연산 스트림(채우기/선 색 설정, 글꼴 설정, 타원이나 다각형 채우기/선
그리기, 베지어 그리기, 텍스트 그리기)입니다. `getDrawOps`는 이 스트림을 타입이 지정된
`XdotOp` 값으로 반환하여, SVG를 파싱하지 않고도 사용자 지정 렌더러(캔버스, WebGL, PDF)를
구동할 수 있게 합니다. [xdot 그리기 연산으로 직접 렌더링](/ko/guide/xdot-drawops)을
참조하세요.
