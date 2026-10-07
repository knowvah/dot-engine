---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 적합성: '일치'의 의미 {#conformance-what-match-means}

@knowvah/dot-engine은 표준 C Graphviz 바이너리를 오라클로 삼아 검증합니다.
이 프로젝트에서 어떤 그래프가 C와 **일치한다**고 말할 때 — 패리티 판정 이름은
`conformant`입니다 — 이는 기계적으로 검사되는 특정한 속성을 뜻하며,
SVG 텍스트가 바이트 단위로 완전히 같다는 뜻이 **아닙니다**.

> **정의.** 포팅 렌더링이 오라클 렌더링과 **적합**하다는 것은, 두 SVG를 정규화된
> 요소 트리로 파싱한 뒤 다음 조건이 성립한다는 뜻입니다.
>
> 1. 모든 **숫자** 값(좌표, 경로 데이터, `points`, `viewBox`,
>    `transform` 매개변수)이 고정된 **허용 오차** 이내에서 오라클과 일치하고,
> 2. 모든 **숫자가 아닌** 값(태그 이름, 색상, 텍스트 내용, 속성 키,
>    열거형 속성 값)이 **정확히 같다**.
>
> 숫자 값 중 하나라도 허용 오차를 넘거나 숫자가 아닌 값이 하나라도 다르면,
> 해당 렌더링은 적합하지 **않습니다**.

## 왜 바이트 단위가 아닌가? {#why-not-literal-bytes}

SVG는 부동소수점 좌표를 십진 텍스트로 직렬화합니다. 수학적으로 동등한 두 렌더링도
IEEE-754 반올림, 부동소수점 연산 순서, CPU와 JS 엔진에 따라 달라지는 플랫폼별
`libm`/FMA 동작 때문에 마지막으로 출력되는 자릿수가 다를 수 있습니다. 따라서
바이트 단위 기준은 단지 엄격한 것이 아니라, 이 라이브러리가 대상으로 하는 런타임
(브라우저, Node, 서로 다른 CPU) 전반에서 **검증할 수 없습니다**. 적합성은 뷰어가
실제로 보게 되는 지오메트리와 내용이라는 진짜 중요한 속성을, 눈으로는 구별할 수
없을 만큼 작은 범위로 고정합니다.

## 정확한 허용 오차 {#the-exact-tolerance}

허용 오차는 **엔진 클래스별**로 정해지며,
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)에 정의되어 있습니다.

| 클래스 | 허용 오차(pt) | 엔진 |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

결정적 엔진은 C의 정수/출력 좌표를 사실상 그대로 재현하므로, ±0.01은 십진 표기
노이즈만 흡수합니다. 반복형(힘 기반) 엔진은 초월 함수에 의존하는데, 그 마지막
비트 결과는 플랫폼 간에 재현되지 않으므로 더 느슨한 범위를 적용하며, 추가로
**구조적** 동등성(같은 요소 트리)도 검사합니다.

**plain/plain-ext** 출력에는 한 가지 주의할 점이 있습니다. plain은 좌표를 인치
단위로 유효숫자 5자리(`%.5g`)로 출력하므로, 크기가 100 이상이면 출력 단위(0.01)가
±0.01 허용 오차와 같아집니다. 매우 큰 그래프에서는 5번째 자릿수 반올림 경계에
걸친 ULP 미만의 레이아웃 차이가 0.01 한 칸의 차이로 출력되어 불일치로 표시되는데,
실제 기저 지오메트리는 약 1e-11 pt 수준까지 동일합니다(circo `2108` 수용 사례,
저널 2026-07-28 참고). 이 영역에서는 좌표를 포인트 단위로 출력하는 xdot/json
출력이 지오메트리 비교의 기준이 됩니다.

**코퍼스 패리티 조사**는 엔진과 관계없이 모든 그래프를 `deterministic` 모드(±0.01)로
평가합니다 — [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`)를 참고하십시오.

## 코드 읽기 {#read-the-code}

위의 정의는 바람을 적은 문장이 아니라 비교 코드가 실제로 수행하는 그대로입니다.
직접 확인하려면 다음을 보십시오.

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES`(±0.01 / ±0.5 표)와 `compareSvg`가 있습니다. `compareSvg`는 정규화된
  두 트리를 순회하며 속성 하나하나에 규칙 (1) 숫자는 허용 오차 이내, 규칙 (2)
  숫자가 아닌 값은 정확히 일치를 적용합니다.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — 원시 SVG를 비교 가능한 요소 트리로 파싱하는 방법.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — 아래 판정 중 하나를 부여하는 `diffVerdict`. `survey.ts`는 `dot` SVG 트랙만
  다룹니다.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — 엔진별 **xdot** 조사(`npx tsx test/corpus/engine-walk.ts <engine>`)로, 위 표와
  같은 클래스 구분(`neato`/`fdp`/`sfdp`는 `TOLERANCE = 0.5`, 나머지 모든 엔진은
  `0.01`)을 적용하며 SVG가 아니라 의미 단위의 그리기 연산 스트림(`compareXdot`)을
  비교합니다. `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` 트랙은 이
  방식으로 측정합니다. `dot` 자체의 xdot 트랙은 형제 격인
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts)를 사용합니다.

## 판정 {#the-verdicts}

조사는 각 그래프에 정확히 하나의 판정을 부여합니다. 트랙별 최신 집계는
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)가
모든 엔진 × 출력 트랙(결정적, 반복형 모두)을 종합하며,
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)는
`dot` SVG 대시보드입니다. 다른 엔진에는 각각 `test/corpus/`에 나란히 놓인
`PARITY-<engine>.md` 대시보드가 있습니다.

| 판정 | 의미 |
|---|---|
| **`conformant`** | 위 정의에 따라 오라클과 일치합니다(숫자는 허용 오차 이내, 숫자가 아닌 값은 정확히 일치). |
| **`structural-match`** | 요소 트리는 같지만, 하나 이상의 숫자 값이 허용 오차를 넘습니다. |
| **`diverged`** | 요소 트리가 다릅니다(요소가 빠졌거나 더 있거나, 숫자가 아닌 값이 불일치). |
| **`errored` / `timeout`** | 포팅이 입력을 렌더링하지 못했거나(`errored`, 엔진별 트랙에서는 `port-error`) 시간 예산을 초과했습니다(`timeout`). 실패로 채점되며, 통과율의 분모에 포함되고 통과로 계산되지 않습니다. |
| **`oracle-error`** | C 오라클이 입력을 렌더링하지 못해 비교할 기준이 없습니다. 범위 밖이며 통과율의 분모에서 제외됩니다. |

모든 대시보드의 **통과율**은 `conformant / (surveyed − oracle-error)`입니다.

'Conformant'는 기준선이고, 'structural-match'는 의미 있는 진전(모양은 맞고 좌표만
아직 어긋남)이며, 'diverged', 'errored', 'timeout'은 실제 격차입니다.
이 중 어느 것도 출력이 바이트 단위로 같다는 주장이 아닙니다.

일부 그래프는 특정 엔진에서 **판정 자체가 없습니다**. 아래 *엔진 제외*를 참고하십시오.

### 엔진 제외 {#engine-exclusions}

제외된 `(그래프, 엔진)` 쌍은 순회하지 않으므로 적합도 아니고 차이도 아닙니다 — 그
엔진에서는 단지 측정되지 않을 뿐입니다. 이는 비교가 *이루어졌고* 문서화된 원인과
함께 차이를 용인하는 수용된 차이와는 다릅니다.

기준은 의도적으로 높습니다. 검사하지 않은 그래프는 알려진 비용이 아니라
커버리지의 구멍이기 때문입니다. 항목이 되려면 세 가지를 모두 충족해야 합니다.
엔진의 알고리즘이 해당 입력에서 작동할 수 없다는 것이 증명되어야 하고, 건너뛰면
실제로 시간이 절약되어야 하며, 같은 동작이 더 저렴한 트랙에서 검증되어야 합니다.
*느리다*는 것만으로는 명시적으로 충분하지 않습니다 — 포팅과 오라클의 비율이 나쁜
것이야말로 실제 성능 결함이 보이는 모습이며, 그것을 이유로 제외하면 코퍼스가 존재하는
바로 그 목적을 가리게 됩니다.

모든 제외 항목은 그 메커니즘과 함께
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions)에
나열되어 있으며, 레지스트리는 `test/corpus/engine-exclusions.json`입니다. 계기가 된
사례는 `2222`로, 노드 28,303개를 선언하고 에지는 없습니다. 서로 연관시킬 대상이
없으므로 모든 힘 기반 엔진과 방사형 엔진은 공용 컴포넌트 패커에 위임하며 각자의
알고리즘은 하나도 실행되지 않습니다 — 이들의 오라클 출력이 바이트 단위로 동일하다는
점으로 확인됩니다. `dot`은 다른 경로를 취하며 이를 6초 만에 적합하게 처리합니다.
