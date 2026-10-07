---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# 텍스트 측정

dot 레이아웃은 노드 크기를 정하고 에지를 배치하기 위해 모든 레이블의 너비와 높이가 필요합니다.
@knowvah/dot-engine은 교체 가능한 단일 교체 지점인 `TextMeasurer`를 통해 텍스트를 측정하며,
어떤 것을 사용할지 자동으로 결정합니다 — 직접 지정할 수도 있습니다.

## 계약 {#the-contract}

서로 다른 두 가지 목표가 있으며, 각각 다른 측정기를 필요로 합니다:

| 목표 | 측정기 | 결정적인가? | 커닝 / 셰이핑 |
|------|----------|----------------|-------------------|
| **재현 가능한 레이아웃**(어디서나 같은 출력) | 내장 메트릭 모델 | 예 | 아니요 |
| **호스트에 충실한 레이아웃**(렌더링 글꼴과 일치) | 플랫폼의 캔버스 | 아니요(글꼴에 따라 다름) | 예 |

네이티브 Graphviz 자체는 호스트에 충실합니다. 출력은 그것을 실행하는 머신에 설치된 글꼴에
좌우됩니다. @knowvah/dot-engine에서는 선택할 수 있습니다. 기본값은 결정적이며, 선택하면
호스트에 충실해집니다.

## 자동 결정 {#automatic-resolution}

측정기를 지정하지 않으면 @knowvah/dot-engine은 렌더링마다 하나를 고릅니다:

1. `setTextMeasurer`로 지정한 명시적 측정기(있으면 우선합니다);
2. **브라우저**(`document` 사용 가능) → 페이지의 `<canvas>` — 호스트에 충실하며, 브라우저가
   SVG 텍스트를 렌더링할 때 쓰는 것과 같은 글꼴로 측정합니다;
3. **Node** → 내장된 결정적 메트릭 모델.

이 라이브러리는 **런타임 의존성이 없고** 글꼴 라이브러리나 `canvas`를 직접 임포트하지 않으므로,
브라우저 번들은 작게 유지되고 Node 기본값은 파일 시스템을 읽지 않습니다.

## Node에서의 호스트 충실 측정 {#host-faithful-measurement-in-node}

특정 글꼴에 맞는 상자(실제 커닝과 셰이핑)를 갖는 Node 출력을 원한다면, 선택적 `canvas` 피어를
설치하고 시작 시 한 번 연결하세요:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas`는 **선택적 피어 의존성**으로 선언되어 있어, 요청하지 않으면 설치되지 않습니다. 대화형
터미널에서 Node가 내장 모델로 대체될 때 @knowvah/dot-engine은 이 안내를 한 번 출력하며,
`GV_FONT_QUIET=1`로 끌 수 있습니다.

## 사용자 지정 측정기 {#custom-measurers}

`setTextMeasurer`는 `TextMeasurer`를 구현한 것이라면 무엇이든 받습니다:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

내장 구현은 재사용할 수 있도록 내보내져 있습니다: `CanvasTextMeasurer`(임의의 2D 컨텍스트를
감쌉니다), `EstimateTextMeasurer`(헤드리스 Graphviz의 `estimate_textspan_size`와 일치하는,
결정적이고 힌팅되지 않은 기준 구현 — **Node의 기본값입니다**), `LutTextMeasurer`(글꼴 패밀리별로
힌팅된 조회 테이블로, 네이티브 `canvas` 의존성 없이 더 가까운 크기를 얻고 싶을 때 선택적으로
사용할 수 있습니다).

## 이렇게 나눈 이유 {#why-this-split}

커닝, 합자, 비ASCII 글리프 너비는 실제 글꼴의 셰이핑 테이블에 좌우됩니다 — 문자별 너비 표로는
이를 표현할 수 없고, 올바른 값은 글꼴마다 다릅니다(고정폭 글꼴은 `<=`를 두 칸으로 렌더링하고,
비례폭 글꼴은 `VA`를 더 붙여서 커닝합니다). 따라서 재현 가능한 레이아웃은 고정된 메트릭 모델을
사용하고, 실제 렌더링 글꼴에 맞추려면 그 글꼴로 측정해야 하며, 이것이 캔버스 기반 측정기가
하는 일입니다.
