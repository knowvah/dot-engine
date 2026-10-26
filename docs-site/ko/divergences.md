---
sourceHash: 0a68fd7d6b8dd40085337d733bd33392aa624e404444abc9e45e45a56b8072f4
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# C Graphviz와의 알려진 차이 {#known-divergences-from-c-graphviz}

@knowvah/dot-engine은 표준 C 구현에 최대한 가까운 충실도를 목표로 합니다.
C 소스가 곧 명세이며, 목록에 없는 차이는 수용된 동작이 아니라 결함으로
취급합니다.

> **여기서 '일치'의 의미.** 코퍼스 패리티 판정인 `conformant`는
> **엄격한 결정적 허용 오차**이며, SVG가 바이트 단위로 같다는 뜻이 *아닙니다*.
> 숫자 좌표와 경로는 **±0.01** 이내에서 일치해야 하고, 숫자가 아닌 모든
> 내용(태그, 색상, 텍스트)은 정확히 같아야 합니다
> (`compareSvg(…, 'deterministic')`). 이 문서 전체에서 '일치'와
> '적합'은 이 허용 오차 판정을 가리킵니다. 전체 정의:
> [적합성](./conformance.md).

출력이 *실제로* 다른 경우는 정확히 세 가지 클래스 중 하나에 속합니다.

1. **수용된 차이** — 조사를 마치고 근본 원인까지 이해했으며, **의도적으로
   적합하게 만들지 않기로 한** 차이입니다. 각각 범위가 한정되어 있고, 특성이 파악되어
   있으며, 아래에서 근거를 제시합니다. 이는 버그가 아니며, 별도로 범위가 정해진
   구체적인 이유 없이는 '수정'되지 않습니다.
2. **추적 중인 롱테일** — 반드시 해소할 알려진 격차로, 각각 오라클로 고정한
   수정안이 있습니다. 최신 집계와 함께
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)에
   정리되어 있습니다.
3. **비목표** — 의도적인 범위의 경계(재현하려고 한 적이 없는 형식과 메커니즘)입니다.

권위 있고 지속적으로 갱신되는 기록은
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(네이티브 `dot` 대비 입력별 패리티 대시보드)와
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(알고리즘 수준의 포팅 현황 목록)입니다.

어떤 그래프가 *수용*되는지(아래의 클래스 1)에 대한 **기계가 읽을 수 있는**
기준 원천은
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json)입니다.
도구가 보고서를 만들 때 이 파일을 결합합니다. `PARITY-dot.md`는 **수용된 차이**와
**추적 중인** 백로그를 나누고, 규칙 게이트는 허용 목록을 여기서 가져옵니다.
아래 본문 섹션이 각 항목을 설명합니다(A1은 현재 유효하며, A2·A3·A8은 종결되어
이력으로 남겨 두었고, A10은 엔진별 레지스트리의 포팅 오류 수용으로서 현재 유효합니다). 두 CI 테스트가
이 목록이 모르는 사이에 낡지 않도록 지킵니다. `accepted-divergences.test.ts`는 수용된 모든 그래프가
여전히 어긋나는지 검사하고, `registry-staleness.test.ts`는 엔진별 레지스트리의 항목이 커밋된 조사 행과
더 이상 일치하지 않으면 실패합니다.

---

## 수용된 차이(의도적으로 적합하게 만들지 않음) {#accepted-deltas-we-deliberately-do-not-make-conformant}

바이트 단위 패리티를 쫓는 대신 차이를 수용하는 것은 다음 조건을 **모두**
충족할 때뿐입니다.

- 근본 원인이 포팅의 논리 오류가 아니라 **이식성 제약**(JavaScript/브라우저
  런타임이 정확히 재현할 수 없는 것)이다.
- 차이가 **눈으로 구별할 수 없는 수준**이며 증명 가능하게 **한정**되어 있다.
- 수정에 드는 **비용과 파급 범위가 얻는 이득에 비해 과도하다**(보통은 이미 적합한
  수백 개 그래프가 쓰는 공용 기본 요소를 건드려야 해서, 1픽셀의 몇 분의 일을 얻자고
  회귀 위험을 떠안게 되는 경우).

차이를 수용할 때는 사용하는 쪽이 놀라지 않도록 여기에 그 특성을 기록합니다.
수용된 차이의 영향을 받는 그래프는 바이트 기준이 아니라 **구조 / 허용 오차** 기준으로
검증합니다.

### A1. 부동소수점 결정성(힘 기반 엔진) {#a1-floating-point-determinism-force-directed-engines}

**영향받는 엔진:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage`(반복형
스프링 모델 엔진). `dot` 엔진의 *레이아웃*은 이 반복형 모델의 결정성 문제의 영향을
받지 **않습니다**. 이전의 `dot` 스플라인 라우팅 부동소수점 델타(A3, A8)는 종결되어
아래에 이력으로 남아 있습니다.

> **범위 — 과거에는 측정되지 않은 단서였으나 지금은 부분적으로 측정됨.**
> **주 dot 엔진 SVG 조사**(`test/corpus/survey.ts`)는 여전히
> **dot 전용**입니다. 네이티브 오라클은 `core`와 `dot_layout` 플러그인**만**
> 심볼릭 링크한 `GVBINDIR=/tmp/ghl`에서 실행되며
> (`test/corpus/gen-headless-gvbindir.sh`는 정확히 `core dot_layout`만 순회하므로
> `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` 레이아웃 플러그인은 없습니다),
> 오라클과 포팅 모두 `dot` 엔진으로 호출됩니다. 따라서 `*_neato` / `*_circo` /
> `root_twopi` 같은 코퍼스 id는 그 조사에서 네이티브 엔진이 아니라 `dot`으로
> 레이아웃되는 *파일 이름*일 뿐이며, A1은 거기서 **0개** 그래프에 해당합니다 — 이
> 엔진들이 적합함이 증명되어서가 아니라, 그 조사가 이 엔진들을 아예 실행하지
> 않기 때문입니다.
>
> **그러나 A1의 여섯 엔진 모두 이제 자체 네이티브 엔진 조사를 갖습니다.**
> `test/corpus/engine-walk.ts` + `parity-report.ts`(`GVBINDIR`와 무관 — 각각
> `dot -K <engine> -Txdot`을 직접 실행)를 통해서이며, 서로 다른 두 엄밀도로 아래에
> 따로 문서화되어 있습니다. `circo`/`twopi`/`osage`는 dot 조사와 같은 **±0.01
> 결정적** 허용 오차로 id별 근본 원인 분류와 함께 실행합니다(아래 '엔진 트랙
> 수용'). `neato`/`fdp`/`sfdp`는 더 느슨한 **±0.5 특성화** 허용 오차로 실행하며
> 아직 id별 분류는 없습니다(아래 '반복형 엔진 특성화'). 엔진 전반의 현재 수치:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**특성화.** 이 엔진들은 결과가 부동소수점 반올림에 좌우되는 반복적 수치 레이아웃을
실행합니다. 구체적으로는 융합 곱셈-덧셈(FMA)과 `Math.pow`가 JavaScript 엔진과 CPU
아키텍처에 따라 다를 수 있습니다. 포팅은 가능한 곳에서 C의 연산 순서를 맞춥니다
(`src/common/fma.ts`, `src/common/arm-pow.ts`) — 예컨대 `sfdp`는 PRNG와 `fma`를
맞추면 네이티브 오라클 대비 유효숫자 약 6자리까지 일치합니다. 그러나 좌표가 똑같은
결과를 정확히 재현하는 것은 **플랫폼 간에 보장되지 않습니다**. 토폴로지는 보존되며,
어긋날 수 있는 것은 노드 좌표의 세부 값입니다.

**수용하는 이유.** 이는 설계상의 선택이 아니라 JS에서 실행하는 데 따른 엄연한
제약입니다 — (이후 종결된) A3/A8의 `hypot`/FMA 민감성과 같은 계열입니다. 모든 대상 런타임에서
초월 함수/FMA 결과가 비트 단위로 동일함을 보장할 방법이 없으므로, 바이트 기준은 단지
비싼 것이 아니라 검증할 수 없습니다. A1을 (단순히 단서를 붙이는 데 그치지 않고)
**평가**하려면 별도의 네이티브 엔진 패리티 트랙이 필요했고, 이는 2026-07-11에
`test/corpus/engine-walk.ts` + `parity-report.ts`로 만들어졌습니다. 각 입력을 `dot`이
아니라 자신의 엔진으로 조사합니다. 이 작업이 정직하게 도달할 수 있는 한계는 A1을
'기준 플랫폼에서는 활성 차이 없음'으로 **좁히는** 것이지, 플랫폼 간 단서를 없애는
것이 아닙니다. 지금까지의 결과(아래)는 그 한계 안에 있습니다. `circo`/`twopi`/`osage`는
각각 실제 A1/A9 사례 몇 건을 찾아 근본 원인을 규명했고, `neato`/`fdp`/`sfdp`는
929개 항목 전체(graphviz 16.1.0)에서 네이티브와 0.5pt 이내인 비율이 각각 90.5/96.5/68.1%입니다. 이는
포팅된 산술(`fma.ts`, `arm-pow.ts`, 일치시킨 PRNG)이 대부분의 그래프에서 유지된다는
뜻이며, 929개 항목 전체에서 남은 어긋난 id도 모두 분류되지 않은 드리프트로 방치되지 않고 주입(솔버
드리프트 대 포팅 결함)으로 개별 귀속되어 있습니다. 아래 반복형 엔진 특성화를
참고하십시오.

**엔진 트랙 수용: twopi 화살표 계열.** <a id="a1-twopi-arrows-family"></a>
위의 인용 블록은 A1이 0개 그래프에 해당하는 dot 엔진 SVG 조사를 설명합니다.
별도의 `twopi` **xdot 엔진 트랙**(`parity-twopi.json`, 네이티브
`dot -K twopi -Txdot` 오라클, `test/corpus/engine-walk.ts`)은 *실제로* 네이티브
엔진으로 실행되며, 코퍼스 id 9개에서 구체적이고 검증된 A1 사례를 드러냅니다.
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
그리고(2026-07-28에 추가, 905개 항목 전체에서 새로 등장) directed/ 형제인
`tree-graphs-directed-oldarrows`입니다. 각각 하나의 지배적인 에지(`Z->I` 또는
`i->Z`; 그리기 연산 차이 12–64건)에서 어긋납니다. 주입 A/B(결정 저널, 2026-07-10
'injection A/B verdicts: twopi arrows family EXONERATED...' 항목)가 메커니즘을
직접 증명했습니다. 네이티브 `spline_edges`의 진입 시점 `ND_pos`를 덤프해 포팅의
`splineEdgesShifted`에 주입하면 `graphs-arrows`에서 **완전히 적합한** 출력이
나옵니다(`Z->I`가 오라클과 바이트 단위로 같아지고, 스플라인도 같은 7/14점입니다).
즉 어긋남은 전적으로 `twopi`의 PRISM 겹침 제거 솔버에서 나오는 라우팅 이전의 노드
위치 드리프트이며, 포팅의 스플라인 라우팅/출력에는 문제가 없습니다. 8개 id 중 6개에서
눈에 보이는 증상은 베지어 점 개수의 뒤바뀜(`unfilled_bezier[ptCount]: 8 vs 14`)입니다.
`Proutespline`이 맞추는 조각 수는 드리프트된 노드 위치가 장애물 경계의 어느 쪽에
떨어지는지에 민감하므로, PRISM의 반복 풀이 하류에서 ULP 미만의 위치 차이가 맞춰진
스플라인의 세그먼트 수를 뒤집습니다(나머지 2개 id인
`graphs-arrowsize`/`nshare-arrows_dot`은 같은 드리프트가 조각 수 뒤바뀜 없이 더
작은 위치 차이로만 나타납니다). 엔진 트랙 수준에서
`test/corpus/accepted-divergences-engines.json`을 통해 수용되며, `parity-report.ts`가
이를 `PARITY-twopi.md`에 결합합니다 — `accepted.ts`가 dot 트랙의 `PARITY-dot.md`에
대해 수행하는 것과 같은 결합입니다.

`oldarrows` 근본 원인 분석(2026-07-28)은 이 계열의 점 개수 증상이 뒤바뀌는 정확한
지점을 특정했습니다. 그 `i`–`Z`–`I` 팬은 링의 지름 위에서 일직선이며, pathplan
`directVis`의 `intersect()`는 장애물 꼭짓점이 선분 '위에' 있으면 시선을 차단합니다.
여기서 `wind()`의 1e-4 공선성 허용 오차 때문에 선분에서 270pt 떨어진 노드조차
공선으로 간주되고, (공선을 가정하는) `inBetween()`은 결국 **x 투영만** 검사하는
것으로 퇴화합니다. 즉 꼭짓점의 x가 두 끝점 x 좌표 사이의 ULP 폭 구간 안쪽에 엄밀히
들어갈 때만 차단합니다. 따라서 서로 대칭인 두 방사형 에지 중 어느 쪽이 휘는지는
PRISM 풀이에서 나온 명목상 같은 세 x 값의 마지막 ULP 순서에 달려 있습니다 — C는
`Z->I`를 휘게 하고(노드 `i`의 축 꼭짓점이 자기 구간 안에 놓임), 포팅은 `i->Z`를
휘게 합니다(노드 `I`의 꼭짓점이 자기 구간 안에 놓임). 각 쪽에서 덤프한 장애물
집합에 대해 `directVis`를 오프라인으로 재현하면 각 쪽의 결정이 정확히 재현되며,
오라클의 라우팅 이전 `ND_pos`를 포팅에 주입하면 차이가 0건입니다
(`attribution-twopi.json`) — 라우팅과 출력은 바이트 단위로 충실합니다.

`1855`는 같은 라우팅 이전 PRISM 부동소수점 메커니즘의 방사형/별 모양 **거울**
변종입니다(2026-07-11 수용). 31개의 잎이 정확히 동원(cocircular)이라 별 모양 레이아웃은
반사 대칭이고 PRISM의 겹침 제거는 대칭 불안정 평형에 놓입니다. `circleLayout`의
`setAbsolutePos`에서 잎 5개의 각도에 생기는 V8 대 libm `cos`/`sin`의 1-ULP 차이가
반대쪽 거울 유역을 선택하게 하고, 방사형 레이아웃 전체가 오라클의 정확한 x축
거울상으로 귀결됩니다(최대 노드 변위 6.04pt, bb는 보존됨). 주입 A/B가 양방향을
증명했습니다. C의 정확한 `circleLayout` 위치를 포팅의 PRISM에 넣으면 오라클을 노드
단위로 재현하고(3e-14), ULP가 어긋난 잎 5개의 위치만 복원해도 전체 레이아웃이 포팅의
거울상으로 되돌아갑니다. 전체 근본 원인 분석: `.agent-notes/twopi-radial-drift-rca.md`
(결정 저널 2026-07-11).

같은 별 모양 그래프는 `circo` 트랙에서도 어긋납니다(2026-10-16 수용, 그리기 연산 차이 599개, 최대 0.71pt). 포팅은
`circpos.c`에서 clang의 FMA 축약과 평가 순서를 그대로 따르므로, PRISM에 들어가는 32개 위치 중 31개가 비트 단위로
정확합니다. 나머지 하나는 1 ULP 차이가 나는데, `positionChildren`의 세 자식 각도에서 V8과 Apple libm이
`cos`/`sin`을 다르게 반올림하기 때문입니다. 그러면 PRISM의 Delaunay 삼각분할이 대칭축 위의 거의 동원인 대각선 하나를
뒤집습니다. 주입 A/B: 네이티브 `cos`/`sin` 값을 주면 포팅이 오라클과 일치합니다. V8의 값을 주면 네이티브 빌드는 30회 실행
중 22회는 오라클의 레이아웃을, 나머지 8회는 포팅의 레이아웃을 생성하는데, GTS가 간선을 할당 주소 순으로 정렬하기 때문입니다.

**반복형 엔진 특성화: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
위의 `circo`/`twopi`/`osage` 엔진 트랙과 달리 `neato`/`fdp`/`sfdp`는 아직 id별
분류를 거치지 **않았습니다** — `engine-walk.ts`는 이 셋에 `tolerance: 0.5`
필드를 기록하고, `parity-report.ts`는 이를
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)의
별도 '반복형 엔진(±0.5 특성화)' 섹션에 표시하며, 이는 이 문서 다른 곳의 ±0.01
결정적 통과율과 명시적으로 비교할 수 **없습니다**. graphviz 16.1.0 기준 현재 집계(929개 항목 전체; 통과
%는 [적합성](./conformance.md)에 따라 C 오라클이 렌더링할 수 없는 입력을 제외):

| 엔진 | 조사 | ±0.5pt 이내 | 부적합 | 포팅 오류 / 타임아웃 | 오라클 오류 |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 840 (90.5%) | 86 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 294 | 1 | 0 |

(`fdp` 통과율이 77.5%에서
오른 것은 이전에 커밋된 조사가 직전 미션의 포팅 상태보다 앞선 것이었기 때문입니다.)

(첫 조사인 2026-07-11, 762개 항목에서는 ±0.5pt 이내가 263/311/260건이었습니다 —
현재 수치로의 도약은 그 이후 반영한 id별 수정, 주로 neato의 포팅되지 않았던
`user_pos`/`P_SET` 처리, 엔진 초기화 통합, `setEdgeType` 매크로 대 함수 수정에서
나왔습니다.)

첫 조사 때와 달리 929개 항목 전체의 어긋난 행은 모두 graphviz 16.1.0 기준으로 개별
귀속되었습니다. 주입 도구(`test/corpus/attribute-divergence.ts`)가 네이티브 오라클의
라우팅 이전 `ND_pos`를 포팅에 넣고 다시 비교하며, 현재 어긋난 모든 id는 두 건을 제외하고
`drift-exonerated`(솔버 드리프트를 제거하면 포팅의 라우팅과 출력이 오라클을 정확히
재현함)입니다. 두 건은 별도로 수용된 id별 잔여분으로, sfdp `241_0`의 호스트 libm `pow`
드리프트(T28이 재진단)와 sfdp `2556`의 NaN 레이아웃입니다. fdp `241_0`은
`fix(T9): start swapped cdt faces at the new diagonal as gts does` 이후 통과합니다(A9의 fdp 문단 참고). fdp `2471`과 sfdp `2371`은 이전에는 주입 후에도 엣지 레이블 위치(`lp`)가 달라져, xlabel 배치기가 다른 후보를 골랐습니다. `2471`은 포팅의 `dotneato_closest`가 clang의 융합된 de Casteljau 계산 및 DIST2와 같은 방식으로 반올림하게 되자 해소되었습니다. 그전에는 엣지 레이블 앵커가 1~2 ULP 달라져 배치기의 엄격한 포함 검사가 뒤집혔습니다. `2371`은 포팅의 R-트리가 C처럼 사각형을 값으로 복사하게 되자 해소되었습니다. `2471`의 네이티브 fdp 레이아웃은 실행마다 달라지므로 해당 행은 한 번의 실행을 기록한 것입니다. (sfdp `42`는
A1 드리프트이며 [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md) 참고.) 아래 클래스 수용은 면책된 집합을 공식화하며, 최신 집계는
엔진별 대시보드
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md))에
있습니다.

**A1-drift 클래스 수용(반복형 엔진, 계산된 멤버십).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`은
반복형 엔진(`neato`, `fdp`, `sfdp`)마다 `"A1-drift"` **클래스** 항목을 하나씩
가집니다 — `{ class: true, attributionFile, ref }` — 위의 `circo`/`twopi`/`osage`
트랙이 쓰는 id별 항목과 구별됩니다(D2, `plans/iterative-parity-campaign/decisions.md`).
id별 항목과 달리 클래스 멤버십은 레지스트리에 손으로 나열하지 않습니다.
`parity-report.ts`가 보고서 생성 시점에 해당 `attribution-<engine>.json`
(T1의 주입 귀속 도구, `test/corpus/attribute-divergence.ts`)에서 계산합니다 — 네이티브의
라우팅 이전 `ND_pos`를 포팅에 주입해 다시 비교했을 때 ±0.5에서 적합해지는, 어긋난 모든
id는 그 파일에서 `verdict: 'drift-exonerated'`를 받습니다. 이는 두 엔진의 반복형 솔버가
수치적으로는 다르지만 각자 내적으로 일관된 레이아웃으로 수렴했다는 뜻이며(위 A1
특성화에 따른 부동소수점 누적 차이이지 포팅의 라우팅이나 출력 결함이 아닙니다), id별
증거(버킷 형태, 기준 대 주입 차이 건수, 균일 평행이동/거울 감지)는 귀속 산출물 자체에
있고 이 문서나 레지스트리에 중복 기재하지 않습니다(D2). 이후 완전히 통과하기 시작하거나
재귀속에서 판정이 바뀐 id는 다음 보고서 재생성 때 자동으로 클래스에서 빠지므로, 낡은
수용 항목을 고칠 필요도 없고 가드 테스트가 실패하지도 않습니다. `attribution-<engine>.json`이
아직 생성되지 않은 엔진은 이 클래스가 멤버 0명인 '귀속 대기 중'으로 표시되어, 수용이
전혀 없는 것과 같습니다 — 클래스 항목이 데이터보다 먼저 존재해도 됩니다
(`test/corpus/accepted-divergences-engines.test.ts` 참고).

### A2. 텍스트 측정(폰트 메트릭) → 레이블 주도 레이아웃 — 종결 <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**상태(2026-07-01): 종결.** 이 클래스로 수용되는 코퍼스 id는 더 이상 없습니다.
이 섹션은 그 메커니즘과 이를 무력화한 주입 가능한 `TextMeasurer` 교체 지점에 대한
역사적 문서로 남겨 둡니다. 연이은 텍스트 측정 수정(`EstimateTextMeasurer` 전환,
폰트를 인식하는 세로 메트릭, 비 ASCII UTF-8 바이트 수정)이 여기에 있던 레이블 주도
레이아웃 차이의 거의 전부를 해결했습니다. 예전의 대표적인 A2 사례였던 **`proc3d`**는
코퍼스의 세 디렉터리(`graphs-`/`share-`/`windows-proc3d`) 모두에서 완전히
**`conformant`**입니다. bbox가 일치하고, 경로 데이터 차이 0건, 레이블 앵커 차이 0건입니다.

**마지막 구성원이 퇴출됨(2026-07-01).** **`NaN` 계열**
(`graphs-NaN` / `share-NaN` / `windows-NaN`)은 노드 지오메트리가 이미 C와 정확히
일치(기준점 76/76)한 뒤에도 오랫동안 여기에 남아 있었습니다. 실제 잔여분인 서로 반대
방향의 2-사이클 쌍 네 개(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`)에 있는 직선 에지 끝점 8개가 6–14 pt 어긋나 있었는데, 다시
진단해 보니 **폰트 메트릭 효과는 전혀 아니었고** dot의 다중 에지 라우팅에 있던 포팅
결함 두 가지였습니다(미션 `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`).

1. **반대 방향 쌍의 레인 순서.** 포팅은 Multisep 레인 오프셋을 배정하기 전에 각 병렬 에지
   그룹을 원래 생성 seq 순으로 다시 정렬했습니다. C는 edgecmp가 수집한 순서대로
   레인을 배정합니다(MAINGRAPH의 정방향 대표가 먼저, AUXGRAPH의 역방향 멤버가
   두 번째 — `dotsplines.c:419`, `make_regular_edge:1885-1907`). 역방향 멤버가 먼저
   선언된 2-사이클은 각 에지를 상대의 18 pt 통로에 그렸습니다.
2. **랭크 간 병합 에지의 잘못된 flat 인접성.** `markAdjacent`가 C의 같은 랭크 가드
   (`flat.c:272-276`) 없이 `ND_other` 항목에 표시를 하여, `groupSize`의 flat 인접
   단락 평가가 portcmp 그룹 경계를 삼켜 버렸습니다.

두 가지를 충실하게 수정하자 이 계열은 세 디렉터리 모두에서 **`conformant`**가
되었고(요소별: 노드 0, 에지 0개 차이), 같은 메커니즘이 `42`, `clust2`, `ngk10_4`
(structural-match → conformant)를 해결했으며 `b124`를 diverged에서 structural-match로
옮겼습니다 — 모두 2-사이클/병렬 쌍에서 나온 결과입니다.

**조사의 양쪽이 같은 추정기를 실행합니다 — 측정은 무력화되었습니다.**
네이티브 `dot` 오라클은 `core`와 `dot_layout` 플러그인만 심볼릭 링크한 헤드리스
`GVBINDIR`(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`)에서 실행되며,
`gd`/`pango`/`quartz` 텍스트 레이아웃 플러그인은 없습니다. 그 자리가 비어 있으면
graphviz는 내장된 `estimate_textspan_size`로 되돌아갑니다. TypeScript 포팅의
`EstimateTextMeasurer`(`src/common/textmeasure.ts`)는 같은 루틴을 충실히 포팅한 것이며
`createMeasurer()`(`src/common/textmeasure-factory.ts`)가 결정하는 Node의 기본값입니다.
**따라서 모든 패리티 비교의 양쪽이 동일한 추정기로 텍스트를 측정합니다** — 실제
FreeType/pango 글리프 진행 폭은 비교에 전혀 들어오지 않습니다. 그래서 여기서
판정이 후퇴하면 폰트가 아니라 레이아웃 코드를 가리키며, 추정기 자체의 버그(UTF-8 바이트
계산, 세로 메트릭의 폰트 인식)를 고친 것이 폰트 메트릭 격차를 단순히 좁히는 데 그치지
않고 이 클래스 대부분을 곧바로 해소한 이유이기도 합니다.

**주입 가능한 `TextMeasurer` 교체 지점.** 이런 무력화가 가능한 것은 텍스트 측정이 어느
엔진에도 하드와이어링되지 않은, 의도된 교체 지점이기 때문입니다. `TextMeasurer`는
메서드가 하나인 인터페이스(`measure(text, font, size, flags) → {w, h, …}`)로,
레이블 크기를 계산하는 모든 호출 지점 — `polyInit`, `recordInit`, `initEdgeLabels`,
`buildNodeLabel` — 에 매개변수로 의존성 주입됩니다. 전역으로 텍스트를 측정하는 곳은
없습니다. 테스트/CI에서는 `setTextMeasurer(...)` 또는 `GV_TEXT_MEASURER=estimate`로
고정합니다. 이 교체 지점 덕분에 잔여분이 측정 때문임을 *증명*할 수도 있습니다.
C가 측정한 정확한 너비(오라클에서 캡처)를 포팅에 주고 레이아웃이 C를 정확히
재현하는지 확인하는 것입니다. 이 실험이 애초에 `proc3d`의 A2 판정을 정당화했으며(아래
역사적 부록 참고), 이 기법은 여전히 유효합니다. 그 역은 이 클래스를 퇴출시켰습니다.
조사 양쪽에서 측정이 증명 가능하게 무력화되었으므로 `NaN` 에지 잔여분은 폰트 메트릭
효과일 수 없었고, 그 점이 위의 라우팅 결함 두 가지를 찾아낸 재진단을 이끌었습니다.

::: details 역사적 분석(2026-06-30 이후 폐기됨) — 기록을 위해 보존
아래 내용은 `EstimateTextMeasurer` 전환, 폰트를 인식하는 세로 메트릭, 비 ASCII
UTF-8 바이트 수정이 이 클래스의 대부분을 해소하기 전, 이전 상태를 설명합니다. 더 이상
현재 동작을 설명하지 않으며, 여기에 이르게 한 논리가 사라지지 않도록 남겨 둔 것뿐입니다.
특히 다음에 유의하십시오. (1) 아래 측정 표의 '네이티브 C' 너비 수치는 실제 폰트 렌더링
경로의 **FreeType** 값입니다. 패리티 조사는 그 경로를 전혀 실행하지 않으며 — 양쪽이
`estimate_textspan_size`를 실행합니다(위 참고) — 따라서 이 표는 패리티를 현재 측정하는
방식을 반영하지 않습니다. (2) 아래의 오버레이 그림과 골든/우리 결과 렌더링은 패리티
조사에 속하지 않는 **비코퍼스** `proc3d`(`graphs/directed/proc3d.gv`, 약 2620 pt)를
나타냅니다. 코퍼스의 `proc3d` 변형은 이제 차이 0건으로 적합하므로 보여 줄 오버레이가
없습니다. (3) 아래의 `NaN`/`ratio=compress` 노드 x 서술은 폐기되었습니다 — 현재
측정은 76개 노드 점이 모두 정확히 일치함을 보여 주므로, 그것이 설명하는 너비 오차 →
노드 이동의 연쇄는 `NaN`에 더 이상 성립하지 않습니다.

**`ratio=compress` 아래의 `NaN`(역사적).**
`NaN.gv` 계열(`orientation=landscape; ratio=compress; size="16,10"`)은 당시
판정이 *structural-match*가 아니라 *diverged*에 머물렀던 A2 사례였습니다. compress
x 네트워크 심플렉스 경로는 충실했습니다 — 모든 제약 입력이 C와 일치했습니다(너비 제약
값, `containNodes` minlen, 보조 에지 개수 471/wt 1612, `lrBalance`, 랭크 순서가 모두
동일). 다만 노드 9개의 반너비는 예외로, 측정기가 C보다 0.5–1.03 pt 넓게 보고했습니다.
`ratio=compress`의 가중치 1000 패킹이 평소에는 여유가 있던 좌에서 우로의 간격 제약을
**구속 상태**로 만들었으므로, compress가 없으면 보이지 않던 그 서브픽셀 너비 오차가 내부
x 이동 −3..−5 pt로 드러났습니다. 그 이동이 `Target<->TThread` 직선 스플라인을 노드 박스
벽 너머 0.55 pt 쪽으로 밀어, 라우터가 그것을 추가 베지어 조각으로 꺾었습니다(C의 4점 대
7점) — *구조적* 델타이므로 *diverged*였습니다. 9개 너비를 C의 값으로 강제하자 C를 정확히
재현했고(노드 x 어긋남 53/76→0/76, 스플라인 7→4점), 그 *예전 차이*의 잔여분이 compress나
스플라인 코드가 아니라 전적으로 상류의 폰트 메트릭 때문이었음이 확인되었습니다.
전체 증거(시각적인 골든/우리 결과 나란히 보기와 4점 대 7점 스플라인 델타 오버레이 포함):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html`(서술 문서:
`…/nan-compress-xcoord.md`).

**폰트 메트릭 측정 예시(역사적 — FreeType 대 추정).**
네이티브 Graphviz는 (패리티 조사가 사용하는 헤드리스 오라클이 아니라) 실제 텍스트 레이아웃
플러그인과 함께 실행하면 FreeType/libgd 글리프 진행 폭으로 텍스트를 측정합니다. 포팅의
`EstimateTextMeasurer`는 글리프 래스터라이저를 복제하지 않습니다. 대부분의 문자열에서는
둘이 정확히 일치하지만, 일부는 1포인트의 일부만큼 다릅니다. 측정 예시 — Times-Roman
14 pt, 문자열 `"/home/ek/work/src/lefty/lefty.c"`(31자):

| | 너비 |
|---|---|
| 네이티브 C(FreeType) | 176.00 pt |
| @knowvah/dot-engine(추정) | 176.75 pt |
| 차이 | **+0.75 pt (+0.43%)** |

같은 노드의 다른 레이블 줄 `"93736-32246"`은 **똑같이** 측정되었습니다(둘 다 96.00 pt) —
오차는 문자열에 따라 달라지고 글리프마다 누적되며, 균일한 배율 계수가 아닙니다.
이 FreeType 대 추정 격차는 실제이지만 패리티 조사가 측정하는 것은 **아닙니다**(양쪽이
`estimate`를 실행합니다). @knowvah/dot-engine 출력을 이 조사 밖에서 실제 폰트의 C
렌더링과 비교할 때에만 의미가 있습니다.

**예전 `proc3d` 차이에 대한 하류 효과(역사적).** 레이블 너비는 노드 크기에, 노드 크기는
레이아웃에 영향을 줍니다.

1. 더 넓은 레이블 → 약간 더 넓은 노드 박스(*타원* 노드는 너비가 추가로 √2배 되므로, 텍스트
   +0.75 pt는 반너비 +0.53 pt가 됩니다).
2. 노드 반너비가 x 좌표 네트워크 심플렉스의 좌에서 우로의 간격 제약을 정하며, 이 제약은
   `ROUND()`로 정수화되므로 서브픽셀 너비 변화가 제약을 *N*에서 *N+1*로 넘길 수 있습니다.
3. 그러면 네트워크 심플렉스가 다른 — 그러나 똑같이 최적인 — 정수 x 배정을 선택하여 일부
   노드 x 위치를 1–2 단위 이동시킵니다.

비코퍼스인 `proc3d.gv`(`graphs/directed/proc3d.gv`, 약 2620 pt, 패리티 조사 구성원
아님)에서는 x 범위에 **≤ 3.55 pt**(**0.13%**)의 차이가 생겼으며, 아래에 겹쳐 놓았습니다 —
**초록 = 네이티브 C `dot`(골든), 빨강 = @knowvah/dot-engine(우리 결과)**.

![proc3d 골든 대 우리 결과 오버레이: 초록 = C, 빨강 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

확대하면 경계는 거의 전적으로 긴 파일 경로 타원 레이블에서 나타났습니다.

![넓은 경로 레이블 타원을 확대한 proc3d 오버레이: 초록 = C, 빨강 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| 골든 — 네이티브 `dot` | 우리 결과 — @knowvah/dot-engine |
|---|---|
| ![C Graphviz로 렌더링한 proc3d](/img/proc3d-golden.svg) | ![@knowvah/dot-engine으로 렌더링한 proc3d](/img/proc3d-ours.svg) |

독립된 분석 문서(근본 원인, 지표별 수치, 재현 명령)는 별도 페이지에 있습니다.
[**proc3d — 대표적인 A2 폰트 메트릭 차이(역사적 기록)**](/ko/divergences-proc3d-a2).
이 페이지는 비코퍼스 입력에서 해결된 차이를 설명하며, 현재 코퍼스의 `proc3d` 변형은
적합합니다.

**당시 이를 수용한 이유.** FreeType의 글리프별 진행 폭을 모든 폰트와 문자열에서 바이트
단위로 맞추려면 그 메트릭 테이블, 힌팅, 반올림을 복제해야 했을 것이며, 이는 크고 취약하고
그래도 정확하다는 보장이 없습니다. 텍스트 측정기는 공용 기본 요소입니다. 코퍼스의 모든
레이블이 이를 거치므로, 한 문자열을 겨냥한 수정은 눈에 띄지 않는 이득을 위해 다른
문자열들을 퇴행시킬 위험이 있었습니다.
:::

### A3. 스플라인 라우팅의 `hypot` 동점 처리(`dot`) — 종결 {#a3-hypot-tie-break-in-spline-routing-dot}

**상태(2026-10-12): 종결.** 이 클래스로 수용된 코퍼스 id는 더 이상 없으며, 이 섹션은
메커니즘의 이력 문서로 남겨 둡니다. 이전 구성원(`2368`, `graphs-b100`, `graphs-b104`,
`241_1`, `2413_1`, `2413_2`, `graphs-decorate`, `2371`)은 새 조사
(`test/corpus/parity-probe.json`)에서 모두 **`conformant`**입니다.

**메커니즘과 종결 경위.** 스플라인 피터(`Proutespline` -> `findMaxDev`,
`src/pathplan/route.ts`)는 맞춘 베지어를 편차가 최대인 내부 경로 점에서 분할합니다.
기하학적으로 대칭인 채널에서는 후보 편차가 약 1 ULP 차이라서, 승자는 마지막 비트의 산술로
결정됩니다. 포팅에는 환원 불가능한 격차가 있다고 보았고("Apple `hypot`은 어떤 이식 가능한
`hypot`과도 일치하지 않는다"), 허용 오차를 둔 평행이동 등변 동점 처리로 보정했습니다. 이
귀속은 반증되었습니다. 동점은 C의 *정확한* 산술로 결정되며, 이는 재현할 수 있습니다. 커밋
`cdf597bc`(`fix(pathplan): split splines at C's max-deviation point bit for bit`)가 이를
포팅했습니다. 거리에는 libm `hypot`(`route.c:448`), C의 엄격한 `>` 비교(`route.c:139`),
그리고 베지어 계산(`route.c:137-138`), `mkspline` 행렬식(`route.c:181-183`), `dot`(459),
`normv`(413), `B01`(488), `B23`(494)에 대한 clang의 `fp-contract` 융합입니다. 허용 오차를 둔
동점 처리는 사라졌고, C는 그런 동점에서 평행이동 등변이 아니므로 `241_0` 매듭은 C의 라우팅
좌표계에 고정됩니다. 이로써 `2368`, `2371`, `2413_1`, `2413_2`, `graphs-b100`,
`graphs-b104`, `graphs-decorate`가 종결되었습니다.

`241_1`은 `hypot` 동점이 아니었고, `87347711`(`fix(dot): match port-less edge endpoints in
flat-adjacent aux layout`)로 종결되었습니다. C는 주 에지를 공유하는 인접 flat 에지를 모두 하나의
`make_flat_adj_edges` 호출로 묶고 그룹 전체에서 포트 여부를 검사하므로, 포트가 있는 에지의
포트 없는 형제는 보조 그래프를 거쳐 라우팅됩니다. 포팅은 포트 여부로 그룹을 나누고 형제를
`makeSimpleFlat`으로 라우팅했는데, 그 클립은 다른 `bezier_clip` 지점에 떨어집니다(54.28 대
네이티브 54.46).

두 수정 모두 퇴행 없이 새 코퍼스 조사로 검증되었습니다(저널 행 "T5 land"와 "T6 land",
`plans/plantuml-tracker-2/decision-journal.md`).

**수정 전 증거(역사적).** `2368`이 기준 구성원이었습니다. 그 `376->76` 호는 C와 반대쪽
모서리로 분할되었으며, 그래프와 그 호의 수정 전 C 및 포팅 경로는 기록을 위해 남겨 둡니다.

::: details 그래프 정의(`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```


### A4. 오라클이 알려진 고장 상태에 있음(init_rank / pathplan 계열) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**영향받는 대상(graphviz 16.1 조사):** `1435`(structural-match, 스플라인 제어점 하나에서
maxΔ 0.39. 15.x 오라클에서는 503이었으며, 이 감소의 원인은 이분 탐색으로 규명하지
않았습니다)와 `1581`(diverged: 최상위 자식 개수 39 대 22, maxΔ 0). 같은 계열의
`1939`와 `2825`는 **conformant**이며 항목이 없고, `2470`과 `graphs-structs`도 2026-07-11에
이들과 합류했습니다(ortho 인접성 넘침/chancmpid, fmadd `polylineMidpoint`, half-even
동점 반올림 수정이 반영된 뒤 둘 다 conformant로 수렴했습니다 — 포팅은 이제 동일하게 잃어버린
에지를 포함해 오라클의 복구 출력을 정확히 재현합니다). 이들의 수용 항목은 퇴출되었습니다. **`2796`과 `2471`이 graphviz 16.1에서 이들과
합류했습니다**(새 조사에서 둘 다 `conformant`이며 수용 항목은 퇴출): 포팅과 16.1 오라클이
잃어버린 에지를 포함해 `init_rank` 복구 출력에 대해 이제 일치합니다. 원인은 이분 탐색으로
규명하지 않았습니다(후보는 16.1 dotgen 포팅 `3cfbf55c`과 잃어버린 에지 소비 수정
`5b6b9bfc`). 아래 `init_rank` 설명은 클래스의 메커니즘으로 남겨 두며, 두 id는 패리티
조사로 conformant로 고정되어 있습니다.

`1581`과 `2825`는 크래시 복구 사례였습니다(fix-element-count-bucket 미션).
업스트림 테스트가 dot이 크래시하지 **않는다는 것만** 단언하는 퍼저/퇴화 입력입니다
(`test_1581`: ASan 위반 없음, `test_2825`: `rebuild_vlists`가 -1을 반환할 때 크래시 없음).
C는 내부 `Error:`(`install_in_rank` / `rebuild_vlists: lead is null`)에 부딪히고 복구 과정에서
레이아웃 내용을 버립니다. 포팅은 **동일한 랭크셋 삭제 결정**에 도달합니다(경고 패리티를
검증했습니다. `mark_clusters`의 'already in a rankset' 경고에 같은 노드/그래프 이름이
나옵니다, cluster.c:317-320).

`2825`는 이제 완전히 종결되었습니다. fix-2825-rebuild-vlists 미션(1581 이후)은 먼저
격차를 한 계층 닫았습니다. 포팅은 C의 *정확한* 내부 오류 상태에 도달합니다 — 메시지
순서를 포함해 바이트 단위로 동일한 stderr(`Error: rebuild_vlists: lead is null for rank 1`
다음에 접두어 없는 `agerr(AGPREV, ...)` 연속 메시지 `concentrate=true may not work
correctly.`)이며, `dotLayoutPipeline`이 `dot_position`의 실패를 올바르게 전파하여
`dot_splines`/`dotneato_postprocess`를 건너뜁니다. 이는 C의 `dotLayout`과 같습니다
(`dot_position` 뒤의 `if (r != 0) return r;`, dotinit.c:322-325). 후속 작업(2부)이 남은
렌더 계층의 격차를 닫았습니다. C의 `emit_node`는 모든 노드를 `node_in_box(n,
job->clip)`으로 걸러내는데(emit.c:1806-1809), 이 중단 경로에서는 `set_aspect`(건너뛴
`dot_position` 꼬리 부분 안에 있음)가 `GD_bb`를 설정하지 않아 `job->clip`이 퇴화되어
있습니다. 그래서 C는 노드를 *하나도* 내보내지 않고 (역시 퇴화된) 클러스터 프레임만
내보냅니다. 포팅은 같은 `node_in_box` 게이트를 포팅했고(`src/gvc/device.ts:renderNode`,
`job->clip`의 단일 페이지 등가물로 `job.bb`/`job.pad` 사용), `g.info.bb`가 설정되지 않았을 때
살아 있는 노드 위치로부터 그럴듯한 bbox를 다시 계산하던 동작을 멈췄습니다
(`src/gvc/device.ts:render`, `job.bb = g.info.bb`를 그대로 사용하며, `init_gvc`의
`gvc->bb = GD_bb(g)`, emit.c:3272를 반영). 모든 레이아웃 엔진은 중단이 아닌 모든 경로에서
`render()`가 실행되기 전에 `g.info.bb`를 스스로 이미 설정하므로, 정상 그래프에서는
바이트 단위로 동일하며 이 중단 경로에서만 출력이 바뀝니다. `2825`는 이제 `conformant`입니다
(4개 요소의 출력, 오라클과 바이트 단위로 동일). 두 부분의 전체 메커니즘 추적은
`.agent-notes/2825-rebuild-vlists-abort.md`를 참고하십시오. `1581`은 불일치 상태에 아예
도달하지 않으므로(`rebuild_vlists`가 아닌 *다른* 업스트림 클러스터 윈도 버그) 살아남은
그래프를 전부 레이아웃하며 — 그 격차는 열려 있습니다. `1581`의 오라클 출력은 업스트림이
정의한 의미가 없는 복구 잔해입니다. 증거:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
이 입력들 모두에서 고장 난 것은 graphviz 스스로의 설명에 따라 **C 오라클**입니다.
`2471`, `1939`, `1435`는 업스트림에서
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)입니다
(이슈
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), 참고:
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)). 유일한 수정 시도인
[초안 MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849)는
병합되지 않은 초안으로 남아 있습니다(마지막 편집 2026-03-20). `graphs-structs`는
안정 버전 graphviz 15.0.0이 올바르게 렌더링하는 오래된 레코드 라우팅 손실
클래스(#102/#242/#274/#1323)로, 개발 빌드 오라클의 회귀입니다.

**C가 하는 일.** `init_rank` 구성원(`2796`, `2471`, `1939`)에서 네이티브 dot의 x 좌표 보조
그래프는 클러스터 벽 제약 에지를 통해 방향 순환을 닫습니다. 그
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)는
모든 노드를 스캔하지 못하고 `Error: trouble in init_rank`를 출력하며, 레이아웃은 그 복구
상태에서 계속 진행합니다 — `2471`/`2796`에서는 `Pshortestpath` 삼각분할 잔해와 잃어버린
에지로 끝납니다. `1435`와 `graphs-structs`에서는 고장 난 단계가 pathplan 자체입니다
(귀 자르기 삼각분할의 막다른 길, 잃어버린 레코드 포트 에지).

**입력을 검증한 뒤 충실하게 만듦(이것이 핵심입니다).**
`verify-oracle-bug-family` 미션
([브리프](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))은
이 계열의 모든 구성원에 대해 양쪽이 네트워크 심플렉스에 넣는 제약 그래프를 한 줄씩
덤프했고, 이 계열에서 포팅이 이전에 보이던 '깨끗한' 동작이 **실제 포팅 결함 네 가지**에서
비롯되었음을 발견하여 모두 수정했습니다.

1. `flatEdges`가 C의
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   호출을 건너뛰어, flat 레이블 vnode 삽입 뒤 클러스터 랭크 윈도가 낡은 채로 남았습니다
   (이것만으로 포팅은 `2471`에서 C가 잃는 6개 대신 **9**개의 에지를 잃었습니다).
2. 같은 `group` 에지 페널티가 같은 비어 있지 않은 그룹의 끝점이 아니라 자기 루프에서
   발동했습니다
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS`가 C의 `_WIN32` 값 100을 사용했는데, 오라클 플랫폼은 1000을 씁니다
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. 삼각분할의 막다른 길이 C의 경고 후 계속 + 직선 대체 대신 `Pshortestpath`를 중단시켰습니다
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

수정 후 이 계열의 NS 제약 덤프는 C와 **줄 단위로 동일**하며(`2471`의 rank2 호출 253건,
`1939`/`1435`/`graphs-structs`의 모든 호출), 포팅은 알려진 고장 상태의 복구 과정에서도
C를 따릅니다. 잃어버린 에지도 같고(2796의 `3->16`, 2471의 동일한 6개), 요소 트리도
같습니다. `1939`는 완전히 conformant가 되었습니다. 남은 수치 델타(그리고 1435의 서로 다른
pathplan 잔해)는 복구 상태 *안에서의* 동작이며, 프로젝트 정책상 의도적으로 쫓지 않습니다.

**`2723`(세그폴트; 고정해 두고 쫓지 않음).** 네이티브 `dot`은 `tests/2723.dot`
(무방향, `rank=same` 그룹, 레이블이 있는 에지)에서 세그폴트(종료 코드 139)를 일으키므로,
C에는 맞출 출력이 없습니다. 업스트림
[이슈 #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723)은 열려 있고
`tests/test_regression.py:test_2723`은 `xfail`입니다. 포팅은 `InternalError`
(`INTERNAL_ERROR`, 원인은 `src/layout/dot/flat.ts:flatLabelYpos`의 `TypeError`로, 거기서
`rank[r-1]`이 undefined입니다)를 던집니다. 올바른 오라클이 없으므로 정직한 실패를 그대로
두고 포팅은 바꾸지 않으며, `src/layout/dot/flat-2723.test.ts`가 이를 고정합니다.
업스트림이 이슈를 고치면 그 테스트를 갱신하십시오.

**정책 메모.** 이전의 A4 입장('포팅이 이슈의 기대를 충족하므로 복제하지 않는다')은 포팅의
비순환 보조 그래프가 무해한 로컬 변형에서 나왔다는 믿음에 근거했습니다. 그렇지 않았습니다 —
그것은 결함 (1)에서 나왔고, 그 결함이 `2471`을 명백히 잘못 배치했습니다. C 소스에 대한
충실성이 이겼습니다. 포팅은 이제 검증으로 동일함이 확인된 입력에서 C의 알려진 고장
결과를 재현하며, 여기의 모든 항목은 **업스트림이 해당 이슈를 고칠 때 다시 측정해야**
합니다(오라클 출력이 바뀝니다. 그 업그레이드 시점에 이 id들이 회귀로 켜질 것을 예상하십시오 —
이는 낡은 것이 아니라 설계입니다).

**증거.** id별 비교 페이지(나란히 놓은 렌더링 + 증거 기록):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 수정 후 부록`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(수정 전 기준선은
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)에
보존).
진단 산출물: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. 잘못된 입력 바이트(인코딩 표현) {#a5-invalid-input-bytes-encoding-representation}

**영향받는 대상:** `1367`(diverged, maxΔ 0 — 구조적 차이가 정확히 하나).

**무엇이 다른가.** 입력 파일의 노드 이름 안에 단독 UTF-8 후행 바이트(`0x80`)가 있습니다.
C는 단독 후행 바이트 0x80–0xBF를 '자기 자신을 나타내는 유효한 문자'로 취급하며
(`lib/common/utils.c:1200-1207`, 경고 없음), 노드 이름 `<title>` 텍스트는 문자셋 변환을
완전히 건너뜁니다(`agnameof` 바이트가 곧바로 `gvputs_xml`로 흘러갑니다). 따라서 오라클
SVG에는 원시 바이트가 들어 있으며, 선언된 인코딩과 달리 **유효한 UTF-8이 아닙니다**.
포팅은 유효하지 않은 UTF-8 입력을 latin1 대체(`0x80 → U+0080`)로 디코딩하고 올바른
형식의 UTF-8(`\xc2\x80`)을 내보냅니다.

**수용하는 이유.** 포팅의 I/O 경계는 JS 문자열(브라우저 라이브러리)입니다. 잘못된 원시
바이트는 `renderSvg`의 문자열 반환값을 통해 왕복할 수 없으며, C와 바이트 단위로 맞추려면
모든 사용자에 대해 출력 인코딩을 망가뜨려야 합니다. latin1 대체는 C 자신의 '라틴-1로
취급' 복구 의미(`utils.c:1249`)를 반영합니다. 이는 이식 가능한 동작을 포팅하지 않기로 한
것이 아니라, 코드 아래의 표현 계층에 있는 제약입니다. 1367의 나머지는 모두 conformant입니다.
장식(T6) 수정 뒤에는 요소 개수(polyline 23 / text 103 / polygon 44 / path 24)와 모든
좌표가 일치합니다.

**HTML `SIDES` 경고에도 같은 내용이 적용됩니다.** `sidesfn`(`lib/common/htmllex.c`)은 값에서 `l`,
`t`, `r`, `b`가 아닌 바이트마다 한 번씩 경고합니다. 바이트는 `%c`로, 부호 있는 `char` 값은 `%d`로 출력합니다.
ASCII가 아닌 글자(`é`는 `0xC3 0xA9`)의 경우 네이티브는 홀로 놓인 바이트 두 개를 쓰므로 그 stderr도 유효한 UTF-8이
아닙니다. 포팅은 같은 숫자(`-61`, `-87`)로 같은 경고 두 개를 출력합니다. 포팅의 경고는 JS 문자열이므로 각 바이트를 해당
Latin-1 코드 포인트의 문자(`Ã`, `©`)로 표시합니다.

**레이블의 일부 숫자 문자 참조에도 같은 내용이 적용됩니다.** `htmlEntityUTF8`(`lib/common/utils.c`)는 참조 값을 직접 1~3바이트로 씁니다. `&#127;`, `&#2047;`, 서로게이트(`&#55296;`~`&#57343;`), 그리고 `0xFFFF`보다 큰 모든 값(`&#128512;`은 `FF 98 80`이 됨)의 경우 이 바이트들은 유효한 UTF-8이 아니며, 네이티브 버전은 그대로 씁니다. 포트는 참조가 가리키는 문자를 씁니다. 텍스트 너비는 바이트 단위로 추정되므로 레이블 너비도 달라질 수 있습니다. HTML 레이블은 영향을 받지 않습니다. expat이 참조를 유효한 UTF-8로 디코딩하기 때문입니다.

**증거.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
비교 페이지(나란히 놓은 렌더링 + 증거 기록).

---

### A6. 퇴화 입력에서 `unsigned int` 캔버스 오버플로 {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**영향받는 대상:** sfdp `2556`(NaN 레이아웃. 엔진 트랙 항목 참고). `1314` — 터무니없는 폰트 크기(`fontsize="991836031967s8"`)가
그림을 약 2.75e11 pt로 부풀리는, 퍼저에서 만들어진 입력으로, graphviz 16.1에서
**conformant**이며 수용은 퇴출되었습니다. 포팅이 이제 네이티브 `ROUND` 변환과 같은 방식으로
페이지 크기를 좁히고(`47f3165d`) `setup_page` 순서로 페이지 클립을 구성합니다(`da6c4a53`).
아래 메커니즘 단락은 원래의 차이를 설명합니다.

**무슨 일이 일어나는가.** C는 `job->width` / `job->height`를 **`unsigned int`**로
저장합니다(`gvcjob.h:327-328`). 거대한 포인트 크기의 `ROUND(...)`(`emit.c:1249-1250`)가
32비트를 넘쳐 mod 2³²으로 되감기고, SVG 백엔드는 이를 **부호 있는** `%d`로
출력하므로(`gvrender_core_svg.c:258-259`) C는 `height="-425618343"`을 출력합니다.
포팅은 수학적으로 일관된(되감기지 않은) 값을 유지합니다. 다른 모든 값 — 노드 타원
`cx/cy/rx/ry`, 루트 `translate`, 다각형, 텍스트 `font-size` — 은 바이트 단위로
동일하며, 최상위 `<svg>`의 width/height만 다릅니다.

**쫓지 않는 이유.** C의 32비트 정수 오버플로를 복제하는 것은 포팅할 만한 레이아웃 동작이
아니며 입력도 퇴화되어 있습니다. 업스트림이 오버플로를 고치면(예: 필드를 넓히거나 크기를
제한하면) 다시 검토하십시오.

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. 퇴화된 NaN 레이아웃(`sfdp`, 병적인 `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**영향받는 대상:** `2556` — `repulsiveforce=100`(⇒ 반발력이 `pow(dist, 101)`을 사용)은
스프링-전기 솔버를 **두 엔진 모두에서 NaN**으로 몰아갑니다. 네이티브 오라클 자체가
모든 노드/에지 위치를 `nan`으로, 경계 상자를 퇴화된 값으로 내보냅니다.

**무슨 일이 일어나는가.** 모든 좌표가 NaN이면 두 구현은 그 쓰레기 값을 다르게 직렬화합니다.
(1) 그래프 bb / 배경 다각형 — C는 `NaN`을 `int`로 반올림하는데, arm64에서는 `INT_MIN`
규모의 쓰레기 값이 나옵니다(`bb="0,0,-4.295e+09,
-4.295e+09"`). 포팅은 `0`을 유지합니다. (2) 에지 그리기 연산 — 네이티브의 출력 단계는
NaN 스플라인의 `_draw_`/`_hdraw_`를 억제하고(`pos`만 내보냄), 포팅은 NaN 제어점으로 이를
내보냅니다. 노드 그리기는 일치합니다(둘 다 억제). 어느 쪽에도 실제 레이아웃은 없습니다.

**쫓지 않는 이유.** 포팅은 이미 네이티브와 *같은* NaN 폭주를 재현합니다 — 거기에 이르게 한
수정은 진짜입니다(아래 참고). 남은 것은 각자 NaN 쓰레기 값을 어떻게 직렬화하느냐뿐입니다.
C의 `(int)NaN` 미정의 동작과 NaN 스플라인 그리기 억제를 복제하는 것은, 양쪽 엔진 모두에서
레이아웃이 퇴화된 입력에 대해 의미 있는 레이아웃 충실도가 아닙니다. 업스트림이
`repulsiveforce`를 제한하거나 NaN 위치를 정리하면 다시 검토하십시오.

**이를 도달 가능하게 만든 포팅 수정(쫓아낸 것이 아니라 진짜 버그).** 이전에는 포팅이
퇴화 상태에 도달조차 할 수 없었습니다. (1) `armPow`(`src/common/arm-pow.ts`)는 빠른 경로가
아닌 모든 인자에서 예외를 던졌는데, 이제 ARM `pow.c`의 전체 특수 사례 분기를 포팅하여
libm처럼 `pow(NaN, y) = NaN`이 됩니다. (2) `bezierClip`(`src/common/splines-geom.ts`)은
수렴 검사가 C의 `while (ABS > .5)`를 단순 부정한 것(유한 값에서는 동등하지만 NaN에서는
아님)이었기 때문에 NaN 제어점에서 무한 루프를 돌았는데, 이제 C를 정확히 반영하여 NaN에서
종료합니다. 둘 다 C에 충실하며 NaN 입력에만 영향을 줍니다.

---

### A7. `round()` 박스 벽 반올림 경계(`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**영향받는 대상:** `graphs-honda-tokoro`와(2026-07-28에 추가, 905개 항목 전체에서 새로
등장) 그 `graphs/directed/` 형제인 `tree-graphs-directed-honda-tokoro`(둘 다
structural-match, 단일 에지 `n012->n011`에서 maxΔ ≈ 1 pt). 형제는 `samearrowhead`
속성만 다르며, 이는 이 쌍의 라우팅에 영향을 주지 않습니다 — 그 `n012->n011` 지오메트리는
포팅과 오라클 양쪽에서 수용된 id와 바이트 단위로 같으므로, 아래 메커니즘이 그대로
적용됩니다.

**무엇이 다른가.** 두 `n012->n011` 병렬 에지가 공유하는 `samehead` 포트에 대해
`maximal_bbox`의 머리 쪽 통로 박스 벽이 C에서는 내부 x=90에, 포팅에서는 x=89에 놓입니다.
공유 포트 구성(`buildSharedPort`)과 병렬 그룹화는 둘 다 C와 바이트 단위로 적합하며,
1 px 차이는 순전히 `round()` 반올림 경계의 산물입니다 — 상류의 약 1e-14 부동소수점
노이즈가 정확히 `.5` 경계에 놓인 값을 이웃한 정수로 넘깁니다. 포팅의 `maximal_bbox` 공식은
이미 C의 것을 정확히 반영합니다.

**쫓지 않는 이유.** `round()`는 코퍼스에서 라우팅되는 모든 에지가 거치는 기본 요소입니다.
이 한 사례에 맞추려고 경계 동작을 조정하면 에지 2개의 1 px을 위해 코퍼스 전체에
회귀 위험을 만들게 됩니다 — `bbox-class-control-hull-vs-curve`에서 언급한 제어 외곽선
반올림과 같은 공용 기본 요소 제약입니다. 전체 진단:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA 반올림 대 엄격한 IEEE(`dot`) — 종결 {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**상태(2026-10-12): 종결.** 이 클래스로 수용된 코퍼스 id는 더 이상 없으며, 이 섹션은 이력
문서로 남겨 둡니다. 알려진 두 사례는 모두 **`conformant`**입니다: `2620`(2026-07-11)과
`2646`(2026-10-12).

**클래스.** clang arm64는 오라클 바이너리를 `-ffp-contract=on`으로 컴파일하여 일부 곱셈-덧셈
시퀀스를 단일 FMA 명령으로 융합합니다. 포팅은 엄격한 IEEE-754 반올림을 수행하는 V8에서
실행됩니다. 비트 단위로 동일한 입력에서도 둘은 컴파일러가 융합하기로 한
식마다 1-2 ULP씩 어긋납니다. 알려져 있던 사례는 두 곳의 서로 다른 지점에서 서로 다른 증폭 메커니즘으로
나타나는 두 가지였습니다.

- **2646** — ULP가 `Proutespline`의 `points2coeff`/`solve3` 3차 풀이 내부에서 생겨
  스플라인 피터의 근 개수를 직접 뒤집었습니다.
- **2620** — ULP가 `poly_init`의 다각형 꼭짓점 범위 루프(노드 크기 계산)에서 생겨, `ortho`의
  충실한 릴랙스별 정수 절삭에 의해 하류에서 비용이 같은 미로 통로 동점 뒤바뀜으로 증폭되었습니다.

**종결: `2646`(`0cc05181`, `fix(pathplan): mirror clang fma contraction in spline
intersection`).** smode 긴 에지의 세 구간(`edge2575`, `edge3905`, `edge15467`)이 접선이 평행한
장벽 벽에서 끝나므로, `splinefits` 교차 3차식은 거의 이중근을 가집니다. `points2coeff`는 그
3차식을 파국적 소거로 구성하고, 오라클은 `route.c:397-398`과 `solvers.c:43`을 융합하므로,
엄격한 IEEE인 포팅은 서로 다른 `solve3` 근 개수, 가짜 교차, 그리고 한 번 더의 `a` 반감을
얻었습니다(maxΔ 42.09). 이것이 환원 불가능하다는 이전 결론("스플라인 피터 전체에 걸친
소프트웨어 FMA 에뮬레이션", 부분 수정은 반증됨)은 반증되었습니다. 융합 지점은 유한하고 열거할 수
있습니다. 포팅은 이제 `points2coeff`(`route.c:397-398`), `splineintersectsline`(371-372, 374,
360-361, 383-384), `solve3`(`solvers.c:41, 43, 46`)와 인라인된 `solve2`(80, 85)의 모든 융합을
그대로 반영하며, `solve3`/`solve2`/`solve1`은 C의 형태로 다시 포팅되었습니다. `2646`에서 캡처된
42,432번의 `Proutespline` 호출은 모두 오라클과 비트 단위로 동일합니다(저널 행 "T7 land"). 원래
진단(메커니즘에 대해서는 여전히 유효): `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**영향받는 대상(역사적):** `2620`(과거에는 structural-match, maxΔ 585, 에지 경로 24개와
화살촉 22개에서 차이 423건). **2026-07-11에 conformant로 수렴했습니다.** 충실한 `sgraph`
인접 버퍼 넘침 + `chancmpid` 양방향 포함 포팅(`.agent-notes/ortho-maze-circo-rca.md` 참고)이
차이를 제거했고, 수용 항목은 퇴출되었으며 이 섹션은 A8 클래스의 문서로 남겨 둡니다.

**무엇이 다른가.** `ortho`(`splines=ortho`) 파이프라인은 동일한 입력이 주어지면 C와 바이트
단위로 적합합니다 — C의 정확한 미로 입력(좌표, `xsize`/`ysize`)을 포팅의 ortho 단계에
주입해 증명했습니다. 라우팅된 세그먼트 378/378개가 바이트 단위로 동일하게 나오므로
`src/ortho`에는 잘못이 없습니다. 실제 차이는 미로 *입력*의 1-2 ULP입니다. C의 `poly_init`
다각형 꼭짓점 범위 루프(`shapes.c`)에서 계산되는 노드 `ysize`(그리고 랭크 내 누적에 의해
`ND_coord.y`)가 `-ffp-contract=on`에서 `R.x += sidelength*cosx`를 FMA로 융합하여, 포팅의
엄격한 IEEE 산술보다 약 1 ULP 커집니다(양쪽 모두 산술적으로 동일한 식을 구현합니다).
`2620`에는 소수 너비의 다각형 노드가 173개 있으며, 모두 C ≥ 포팅이 1-2 ULP입니다. 그
ULP는 `ortho`의 Dijkstra 릴랙스에 의해 증폭될 뿐 — 거기서 생기는 것이 아닙니다. 릴랙스는
원시 셀 범위에서 유도한 가중치(`maze.c:257`)에 대해 누적 거리를 단계마다 충실하게
절삭합니다(`sgraph.c:165`, 포팅은 `Math.trunc`로 반영). ULP만큼 이동한 지오메트리가
라우팅된 에지 4개(경로와 그 화살촉)에서 비용이 같은 통로 동점을 뒤집으며, 나머지 차이는
그 4번의 뒤바뀜에서 따라 나온 ±1 트랙 재번호 매김입니다.

**수용하는 이유(통제된 실험으로 환원 불가능성이 증명됨).** `-ffp-contract`만 바꾼 독립
C 하니스가 어긋난 육각형 꼭짓점에서 양쪽을 재현했습니다. `-ffp-contract=on` →
`310.29250168188713`(오라클과 일치), `-ffp-contract=off` → `310.29250168188707`(포팅과
일치)이며, 어긋나는 연산은 꼭짓점 `i=3`으로 분리되었습니다(융합하면 `R.x=-0.50000000000000011`,
융합하지 않으면 `-0.5`). 두 번째 입력 주입 실험(변수는 ortho 입력 값뿐)이 증폭기를
확인했습니다. 포팅 자신의 `orthoEdges`에 C의 정확한 `coord`/`xsize`/`ysize`를 주면 통로
차이 4건이 모두 0으로 사라집니다 — ortho 코드에는 결함이 없고, 단지 (C 자신의 미로 비용
라우팅이 그렇듯) 입력의 1-2 ULP 이동에 민감할 뿐입니다. 맞추려면 `poly_init`의 컴파일된
식 트리 하나에 대한 clang의 구체적인 FMA 융합을 에뮬레이션해야 하는데 — 이는 소스 의미를
포팅하는 것이 아니라 컴파일된 산물을 쫓는 일입니다. 전체 진단:
`plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**에뮬레이션한 예외(수용하지 않음): `triang.c:ccw`.** 한 융합 지점은 수용하지 않고 비트
단위로 재현합니다. pathplan의 `ccw`는 `fnmul`+`fmadd`(정확한 첫 곱 − 반올림된 둘째 곱)로
컴파일되므로, 선분 끝점과 비트 단위로 같은 질의 점은 ISON이 아니라 ISCW/ISCCW로
판정됩니다. 그러면 `shortest.c:pointintri`가 다각형 꼭짓점 끝점을 거부하고('destination
point not in any triangle') `makeMultiSpline`은 병합된 모든 2-사이클에 대해 일반 라우팅으로
되돌아갑니다 — 포팅이 맞춰야 하는 크고 이산적인 코퍼스 전체의 동작입니다. 위의
`solve3`/`poly_init` 지점(컴파일된 식 트리 깊숙한 곳, 수정이 반증됨)과 달리 `ccw`는 의미가
깔끔한, 독립된 단일 컴파일 함수이므로 `src/pathplan/triang.ts`가 이를 에뮬레이션합니다.
일반 double 빠른 경로는 일반 부호와 융합 부호가 증명 가능하게 일치하는 곳에서 보수적인 오차
한계를 사용하고, 0에 가까운 경우에는 정확한 Dekker 곱 + 이진 유리수 BigInt 경로를 씁니다.

---

### A9. libm 삼각함수 1-ULP → CDT 동원 동점 뒤바뀜(`circo`/`twopi` 멀티스플라인) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**클래스.** V8의 `Math.sin`/`Math.cos`는 Apple libm의 `sin`/`cos`와 비트 단위로 같지
않습니다(증명됨: 타원 장애물의 여덟 모서리 각도 중 하나인 `2π·4.5/8`에서 1-ULP 불일치). V8의 삼각함수 반올림은 CPU와 Node 버전에도 좌우됩니다. 그 각도에서 arm64의 Node 22–26은 1 ULP 어긋난 값을 반환하는 반면, x64의 Node 26과 arm64의 Node 20은 올바르게 반올림된 값을 반환합니다. 이 대장의 워크와 RCA는 오라클의 macOS arm64 호스트에서 오라클과 나란히 실행되었습니다.
`makeObstacle`의 외접 8각형 모서리가 그 ULP를 물려받으므로, 삼각형 라우터의 입력 좌표는
오라클과 최대 6e-14 차이가 납니다. 대칭 레이아웃(랭크/링 위의 같은 크기 노드)은 라우터의
사각형을 실수 산술에서 **정확히 동원**으로 만들어, 정확한 내접원 판정식이 칼날 위에
놓입니다. 입력 ULP가 그 부호를 뒤집고, 제약 들로네 대각선이 뒤집히며, 오라클에서
`Pshortestpath`가 실패하던 통로 다각형('destination point not in any triangle' → 일반 스플라인
대체)이 포팅에서는 성공합니다(또는 그 반대). 그 결과 스플라인은 약 0.2–0.5pt 다릅니다.
(이제 종결된) **A3**/**A8**의 형제입니다. C 소스 의미 아래에 있는 환원 불가능한 부동소수점 이식성
제약이며, 맞추려면 Apple libm의 정확한 `sin`/`cos` 반올림을 JS에서 재현해야 합니다.

**16.1 재기준선.** 멀티스플라인 통로 지오메트리에 clang의 FMA 융합(타원 모서리 피개방수,
`mkCtrlPts`, `DIST` = sqrt(fmadd), `line_intersect` 내적)이 빠져 있었고, `f66ac638`(`fix(neato):
mirror fma contraction in multispline routing geometry`)이 이를 반영했습니다. 이 클래스가 아래의
동원 동점으로 귀속했던 twopi와 neato의 `241_0`은 **conformant**가 되었고(수용 퇴출), sfdp `42`에는
동점이 전혀 없었음이 밝혀졌습니다(A1 드리프트입니다. [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)
참고). fdp의 `241_0`은 이후 삼각분할에 대한 포팅 측의 두 번째 수정(에지 교환 뒤 면의 꼭짓점 순서; 아래 fdp 문단 참고)으로 **conformant**가 되었습니다. circo의 `241_0`은 `fix(T28): use host libm cos/sin for the
ellipse obstacle 8-gon`으로 **conformant**가 되었습니다(수용 퇴출). arm64에서 V8의
`Math.sin(9π/8)`이 올바르게 반올림된 libm 값에서 1 ULP 벗어나 있어 모든 타원 장애물의
한 모서리를 옮기고 통로를 뒤집었습니다. 포팅은 이제 아홉 개의 모서리 값을 모두 호스트 libm 표에서 읽으므로 결과가 런타임의 `Math.sin`에 더 이상 좌우되지 않습니다. sfdp의 `241_0`은 같은 작업에서 재진단되어
이제 A1입니다(아래 sfdp 문단 참고).

**영향받는 대상:** `2343`, `2239`, `share-b29`, `windows-b29`(twopi, 각각 에지 레이블 위치 차이 1–2건 —
libm 1-ULP는 `poly_init`의 단위 꼭짓점 삼각함수(`hypot`/`atan2`/`sin`)에서 생겨 한 노드의
계산된 높이를 오라클이 정확히 걸리는 최소 크기 클램프보다 1 ULP 넘기고, xlabel R-트리
적재의 `floor()`를 통해 연쇄되어 레이블 후보 하나를 뒤집습니다. 정확히 반올림되는
hypot 수정을 시도했으나 반증되었습니다. `2343`은 고쳤지만 `2168_3`을 퇴행시켰는데,
그 8각형 크기 계산은 오라클의 값이 정확히 반올림된 값이 아닌 같은 호출을 거치기 때문입니다 —
어떤 결정적 hypot 정책도 둘 모두에서 오라클과 일치하지 않습니다).
`2168_1`은 원래 이 클래스에 있었지만, 포팅이 오라클의 fp-contract된 `ccw`(pathplan
`triang.ts`)를 에뮬레이션하자 conformant가 되었습니다. 그 통로 실패는 FMA된 `pointintri`
꼭짓점 끝점 거부가 좌우하는데 포팅이 이제 이를 비트 단위로 재현하므로, CDT 대각선 ULP
동점이 더 이상 거기서 드러나지 않습니다.

**수용하는 이유(통제된 실험으로 환원 불가능성이 증명됨).** CDT 자체는 문제가 없습니다.
포팅의 `mkSurface`는 GTS 0.7.6의 점진적 삽입(`cdt.c`: 1→3 분할 + 재귀
`swap_if_in_circle`, 미리 만들어지고 교환 불가능한 제약 에지, `remove_intersected_*` +
`triangulate_polygon` 제약 강제)을 충실하게 포팅한 것이며, **실제 GTS 라이브러리**를
링크하고 포팅의 비트 단위로 정확한 라우터 입력을 넣은 독립 C 하니스가 포팅의 삼각분할을
면 단위로 재현합니다(2168_1: 22/22, 241_0: 185/185). 두 입력 집합에 대한 내접원 행렬식의
정확한 유리수 계산이 부호 뒤바뀜을 확인합니다(포팅의 입력에서는 +1, 오라클의 입력에서는
−1). 남은 변수인 1-ULP 삼각함수 차이는 `Math.sin`/`sin`의 비트 패턴을 직접 비교하여
분리했습니다.

**엔진 트랙 수용(`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> twopi/circo **xdot 엔진
트랙**(`parity-twopi.json` / `parity-circo.json`, 네이티브 `dot -K <engine>
-Txdot` 오라클, `test/corpus/engine-walk.ts`, ±0.01에서의 의미 단위 그리기 연산 비교 —
`test/golden/compare-xdot.ts` 참고)은 위에서 인용한 dot 엔진 SVG 조사와 별개로 같은
메커니즘을 드러냅니다. twopi `2239`(그리기 연산 차이 1건 — `_ldraw_` 에지 레이블 텍스트
위치 뒤바뀜으로, `floor()` xlabel R-트리 연쇄를 통해 전파되는 같은 `poly_init` 단위 꼭짓점
삼각함수 ULP입니다. 이 항목으로 원래 수용되었던 `2343`, `share-b29`, `windows-b29`는
2026-07-11에 `polylineMidpoint`의 충실한 fmadd 융합으로 *수정되었습니다* — 아래 b29 계열
문단 참고)와 circo `241_0`(그리기 연산 차이 41건, 에지 `1->2`의 라우팅된 베지어에서
Δ≈0.2pt — 같은 CDT 대각선 통로 뒤바뀜. 결정 저널 2026-07-10 'CDT rewritten as faithful
GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9 filed' 항목, **2026-10-23 퇴출** — 포팅이 장애물 8각형에 호스트 libm의
`cos`/`sin`을 쓰게 되어 conformant, 위의 16.1 재기준선 참고). 엔진 트랙
수준에서 `test/corpus/accepted-divergences-engines.json`을 통해 수용되며,
`parity-report.ts`가 이를 `PARITY-twopi.md`/`PARITY-circo.md`에 결합합니다 —
`accepted.ts`가 dot 트랙의 `PARITY-dot.md`에 대해 수행하는 것과 같은 결합입니다.

**circo `2475_2` 및 `2095_1` — 동원 closestNode hypot 동점 (수정됨).** 노드 10762개짜리 이
그래프의 28노드 컴포넌트 하나에서, circo의 `getRotation`(`circpos.c:73-92`)은 서브 블록의 회전을 정하기 위해
`hypot`으로 레이아웃 원점에 가장 가까운 블록 노드를 고릅니다. 동원인 두 노드는 사실상 같은 거리이며, V8의 정확히 반올림되는
`Math.hypot`과 Apple libm의 `hypot`은 그 거리를 2 ULP 다르게 반올림하여 엄격한 `<`을 뒤집고, 다른 노드를
선택해 서브 블록을 약 20° 회전/반사시킵니다(노드 18개가 이동, 최대 296.7pt. 나머지 10744개 노드는 블록 트리, 원 순서,
모든 `centerAngle`과 마찬가지로 비트 단위로 동일). `2095_1`도 같은 동점에 걸렸습니다(그리기 연산 차이 2197개, 블록의
강체 회전 3회). 둘 다 2026-10-16까지 수용되어 있었으나, 그날 가장 가까운 노드 탐색이 포팅의 비트 단위로 정확한 Apple
`hypot` 모델(`src/common/libm-hypot.ts`)로 바뀌어 이제 둘 다 적합합니다. 독립 재현:
`.agent-notes/circo-2475-590-repro.dot`, 전체 근본 원인 분석:
`.agent-notes/circo-b81-2475-rca.md`.

**twopi `2470` — xlabel R-트리가 증폭한 방사 좌표 ULP.**
2470은 140개 에지 그래프로, HTML `<table>` 에지 레이블이 거의 일치하는 방사 앵커에
몰려 있습니다. neato 계열에서 에지 레이블은 탐욕적 xlabel 배치기(`label/xlabels.c`)가
외부 레이블로 배치하며, 힐베르트 순서 R-트리를 통해 겹침이 가장 적은 후보 모서리를
고릅니다. 포팅의 스플라인과 노드 좌표는 출력 정밀도까지 오라클과 일치하지만(1e-7에서도
스플라인/노드/bbox 차이 0건), 한 노드의 방사 `ND_coord.y`가 약 2 ULP 다릅니다(Apple
libm `sin`/`cos` 대 V8 `Math`) — 적합성 기준에는 한참 못 미치지만 `objplpmks`에서
`floor(pos.y − sz.y/2)` 경계를 정확히 0에서 걸쳐 그 객체의 R-트리 사각형을 한 단위
뒤집습니다. 힐베르트 순서/트리 그룹화 변화로 `RTreeSearch`가 다른 가지를 가지치기하므로,
레이블 약 140개가 각각 이웃한 후보 모서리로 달라붙습니다(각 차이는 고정된 (+너비,
−줄 높이) 단계). 배치기, 객체 순서, 사각형 반올림, (C의 min-min 특이점을 충실히
반영하는) `CombineRect`, int32 힐베르트 키는 각각 충실함이 검증되었습니다. 차이는 상류의
방사 삼각함수 ULP이며, twopi `1855`와 같은 이유로 환원 불가능합니다. 2026-07-11 수용,
전체 근본 원인 분석: `.agent-notes/twopi-2470-rca.md`(이 id의 오전 '통과'가 포팅 회귀가
아니라 낡은 오라클 바이너리의 산물이었다는 점도 기록되어 있습니다).

**osage `1855` — 장애물 꼭짓점 fp-contract 번짐.** 위의 twopi `1855` 방사 거울 항목과
다릅니다. osage에서는 노드 중심이 오라클과 비트 단위로 정확하며, 110개의 그리기 연산
차이는 노드 행의 거울 쪽에 놓인 장애물 라우팅 에지 세 개입니다(X는 비트 단위로 정확, Y는
거울상). `circumscribed_polygon_corner_about_ellipse`(`neatosplines.c:301`)의 8각형 장애물
꼭짓점은 C와 3–4 ULP 다릅니다. clang의 `-ffp-contract=on`이 `ellipse_tangent_slope`/
`line_intersection`의 `a·b±c` 연쇄를 단일 반올림 FMA로 융합하는 반면 V8은 연산마다
반올림하기 때문입니다. C의 융합 반올림은 모서리 x 값의 거터 열을 비트 단위로 동일한 하나의
double로(정확히 공선) 수렴시키지만, 포팅은 이를 1 ULP 떨어진 두 값으로 나눕니다. 그러면
가시성 `clear()` 접선 검사가 뒤집혀 — 거터가 더 이상 막히지 않으므로 — 가시성 에지가 약
20개 늘고, 다익스트라는 위/아래 호모토피 동점을 거울 쪽으로 해소합니다. 통제된 실험: 그 외에는
손대지 않은 포팅에 C의 정확한 장애물 좌표를 주입하면 어긋나는 에지가 **0개**여서,
합법 배치, 가시성, 다익스트라, 스플라인 연쇄 전체가 면책됩니다. C의 libm `cos`/`sin`만
주입하는 것은 효과가 없습니다. 2026-07-11 수용, 전체 근본 원인 분석:
`.agent-notes/osage-spline-family-rca.md`.

**b29 계열(twopi, 수정됨).** 네 가지 b29 변종은 칼날 하나를 공유했습니다. `EqmtTyp` 에지 레이블
(`Node14732->Node14731`)이 정확한 placeLabels 쪽 선택 동점 위에 놓여 있었고, 그 결과는 주변 객체의 1-ULP
twopi 레이아웃 드리프트에 좌우되었습니다. `polylineMidpoint`의 충실한 fmadd 융합 (states 계열 수정,
2026-07-11)으로 포팅의 레이블 앵커는 오라클과 비트 단위로 동일해졌지만, 동점은 네 변종 중 둘(`graphs-b29`,
`linux.i386-b29`)에서 여전히 반대로 해소되었고 나머지 둘(`share-b29`, `windows-b29`)은 적합했습니다 —
그리고 `2343`의 수용된 A9 레이블 차이는 완전히 사라졌습니다. 한계: 그리기 연산 1건, 레이블 y Δ12pt. 2026-10-20에
포트의 모든 Bezier 평가가 clang이 graphviz의 `Bezier`를 수축하는 방식 그대로 융합된 단일 `bezier()`를 거치게
되었습니다(`e37e72f0`). 이로써 상류 드리프트가 제거되어 `graphs-b29`와 `linux.i386-b29`도 이제 적합하며,
이들의 수용은 철회되었습니다. 전체 근본 원인 분석: `.agent-notes/twopi-states-rca.md`.

같은 placeLabels 칼날이 **osage** 트랙에서도 나타났습니다(2026-07-11 수용, 전체 근본 원인 분석:
`.agent-notes/osage-small-tail-rca.md`). `linux.i386-b29`와 `share-b29`(각각 그리기 연산
차이 2건 — 에지 레이블 하나의 x 앵커가 878.28 대 841.06에 놓이며, 비트 단위로 동일한 스플라인 중점 859.67을 기준으로
대칭, 즉 ±레이블 너비의 절반이고, 두 변종은 서로의 거울상입니다)과 `1652`(그리기 연산 차이 2건 — 에지 두 개가 각각 동일한 중점을
기준으로 레이블 앵커 하나씩을 뒤집으며, 하나는 x, 하나는 y이고 스플라인과 화살촉은 비트 단위로 동일합니다. 오라클은 완전히 렌더링하므로
알려진 네이티브 타임아웃 불안정 현상이 아닙니다). 모든 경우에서 에지 지오메트리는 비트 단위로 정확했으며, 1-ULP 드리프트가 있는 주변
환경에서 레이블 쪽 선택 동점만 반대로 해소되었습니다. 2026-10-20의 융합된 `bezier()`(`e37e72f0`)가 그 드리프트도
제거했습니다. 세 건 모두 이제 적합하며, 수용되지 않았던 osage `2371`도 마찬가지이고, 이들의 수용은 철회되었습니다.

osage 트랙에는 `polypoly` 삼총사(`graphs-polypoly`, `share-polypoly`,
`windows-polypoly`, 2026-07-11 수용, 전체 근본 원인 분석은
`.agent-notes/patchwork-tail-rca.md`)가 있습니다. 어긋나는 연산은 일그러진 사각형의
방향 180 꼭짓점에서의 순수 초월 함수 `cos(π+θ)` 하나뿐입니다 — V8의 `Math.cos`는 정확히
반올림되는 반면 Apple libm의 `cos`는 인자에 따라 ±1 ULP의 오차를 가지므로(그래서 libm에서만
`|cos(π+θ)| ≠ |cos(θ)|`입니다), 1-ULP 노드 크기 차이가 pack의 `GRID`/`ceil`에 들어가
둘레 동점을 기울이고, qsort가 두 컴포넌트를 서로의 패킹 셀에 배치합니다 — 모양이나 라우팅
오류 없이 노드 전체가 통째로 맞바뀝니다. 정확히 반올림되지 않는 libm 초월 함수를 재현하는
결정적 재작성은 없으며, 교과서적인 A9 형태입니다.

같은 메커니즘이 2026-07-28에 더 큰 형제인 `tree-graphs-directed-polypoly`
(`graphs/directed/polypoly.gv`, 905개 항목 전체에서 새로 등장, 그리기 연산 차이 112건,
osage만)에서 확인되었습니다. 어긋나는 연산은 동일한 노드 `9004`의 `cos(π+θ)` 1-ULP
지점이며 — C와 포팅의 `bb.x` 값이 원래 근본 원인 분석과 바이트 단위로 일치합니다 — 다만
이 76노드 입력에서는 전파가 대신 osage의 `arrayRects`를 거칩니다. `acmpf`가 패킹 셀을
원시 `width+height` 합으로 정렬하는데, libm의 1-ULP 큰 너비 때문에 `9004`가 회전된 형제
`9000/9002/9006`보다 엄밀히 앞에 정렬되는 반면, V8의 정확히 반올림되는 값은 불안정한
qsort가 다르게 정렬하는 정확한 4자 동점을 남깁니다 — 행 우선 셀이 달라지고, `9002`/`9006`이
맞바뀌며, 열 너비 `fmax` 연쇄가 이웃 8개를 x로 이동시킵니다. 포팅 자신의 `arrayRects`에
C의 노드 크기와 포팅의 노드 크기를 각각 주면 조사에서 이동한 노드 10개가 바이트 단위로
일치하는 x 델타와 함께 재현되어 인과 사슬이 닫힙니다.

2026-07-11에 엔진 트랙 사례 두 건이 더 근본 원인 규명 후 수용되었습니다(전체 근본 원인
분석: `.agent-notes/circo-edge-tail-rca.md`). twopi `241_0`(그리기 연산 차이 6건, 당시에는 위 circo 항목과 같은 CDT 동원 내접원 동점으로
귀속됨, **graphviz 16.1에서 퇴출** — `f66ac638` 이후 conformant이므로 14점 대 8점 통로 뒤바뀜은
동점이 아니라 반영되지 않은 FMA 융합이었음)과 circo `windows-tree`(팬 에지 하나에서
그리기 연산 차이 10건 — circo의 배치 삼각함수가 `node2.y`를 정확히 대칭인 값 18.0 부근에서
`node8.y`보다 단 1 ULP 위에 놓으며, `closestSide`의 dyna 머리 포트 선택이 바로 그 정확한
동점에서 TOP/BOTTOM을 뒤집습니다. 노드 위치와 박스는 그 외에는 오라클과 비트 단위로
동일합니다. **2026-10-18 폐기** — 포팅의 DIST2가 clang의 융합 형태를 사용해 이 정확한 동점을 C와 같이 결정하므로 일치합니다).

**sfdp 엔진 트랙 — `241_0`(A9 → A1로 재분류, 2026-10-23).**
<a id="a9-sfdp-fp-ties"></a> sfdp xdot 엔진 트랙(`parity-sfdp.json`,
네이티브 `dot -Ksfdp -Txdot`, ±0.5)은 여기에 `241_0`을 CDT 동원 내접원 동점으로
나열했습니다. `fix(T28)`이 계측한 네이티브 sfdp로 이를 재진단했습니다.

- `241_0` — 에지 1->2에서 그리기 연산 차이 7건, `ptCount 8 vs 20`. 레이아웃은 macOS
  libm의 `pow(dist, 2)`가 올바른 반올림보다 1 ULP 작은 값을 반환하는 첫 번째 척력 항
  (가장 거친 수준, 반복 22; 레이아웃 충실도 격차 아래의 호스트 libm `pow` 항목 참고)에서
  어긋나기 시작하고, 적응형 냉각이 이를 칼날 위의 위치로 증폭해 에지 1->2가 다르게
  라우팅됩니다. 네이티브 `pow` 값을 주입하면 모든 추적 줄과 최종 xdot이 일치합니다.
  주입한 위치에서 보인 라우팅 잔여분은 일부는 주입 산물이었고 일부는 장애물 8각형의
  V8 `Math.sin(9π/8)`(arm64에서 1 ULP 어긋남)이었으며, 포팅은 이제 이를 호스트 libm에서 가져옵니다(circo
  `241_0`도 conformant로 만든 수정). 남은 것은 A1 드리프트입니다.

> **sfdp `42`를 A9 → A1-drift로 재분류(graphviz 16.1 동기화).** 이전에는 여기에 CDT/libm
> 내접원 동점으로 나열되어 있었습니다. 미션은 다른 사실을 확인했습니다
> ([`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). 과거의 통로 뒤바뀜은 멀티스플라인 통로
> 지오메트리에서 포팅 쪽의 FMA 포팅 오류였고 `f66ac638`(`fix(neato): mirror fma contraction in
> multispline routing geometry`)으로 고쳐졌으며, 네이티브 위치를 주입하면 포팅은 이제 네이티브
> xdot를 정확히 재현합니다. 남은 잔여분(노드 오프셋 0.06-0.65 pt)은 가장 거친 수준에서 Apple
> libm `pow(dist, 2)`와 포팅의 ARM `pow` 사이의 1-ULP 불일치에서 시작되어 더 세밀한 수준에서
> 증폭된 반복형 드리프트입니다 — A1([A1](#a1-floating-point-determinism-force-directed-engines)
> 참고).

> **`2095`를 A9 → A1-drift로 재분류(2026-07-22).** 이전에는 여기에 'hypot 형제'(이름이
> 빈 노드 `""->"4"`의 에지에서 0.7pt 미만의 드리프트)로 나열되어 있었습니다. 그 잔여분은
> **도구 산물**이었습니다. 귀속 주입기의 `GVTS_POS` 정규식이 이름 문자를 1개 이상 요구해서
> `""`라는 이름의 노드가 주입되지 않았고, 그것에 닿은 두 에지를 끌고 갔습니다.
> 주입기가 빈 이름도 일치시키도록 고치자(`(.+)`→`(.*)`, `src/layout/neato/splines.ts`),
> sfdp `2095`는 **잔여 0**으로 주입됩니다 — 순수한 힘 드리프트이며 계산된 A1-drift
> 클래스에 해당하고, 라우팅 FP 동점이 아닙니다. id별 수용은
> `accepted-divergences-engines.json`에서 제거했습니다. (아래 fdp `2095`와 같은 발견입니다.)

**새로운 통제 실험(2026-07-21).** 네이티브 대 V8 `hypot` 탐침
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): 시스템 C `hypot`을 컴파일해
대표적인 flat 에지 편차 입력에서 Node `Math.hypot`과 비교하면 6건 중 2건에서 1-ULP 불일치가
나타납니다(Δ 7.1e-15와 5.7e-14) — 세분 개수를 뒤집는 분할 임계값의 칼날입니다.
환원 불가능합니다. 어떤 이식 가능한 hypot도 Apple libm을 재현하지 못합니다(같은 경계에 대한
`arm-pow.ts` 선례). `sfdp.241_0`은 한때 이 클래스로 수용되었으나
T28 이후 A1 드리프트입니다(위 참고). `sfdp.42`는 이 클래스에 **속하지
않습니다**. 그 레지스트리 항목은 A1(`comparisons/sfdp-42.md`)이며, 위 탐침은 이를 설명하지
못했습니다.

**fdp** xdot 엔진 트랙(`parity-fdp.json`, 네이티브 `dot -Kfdp -Txdot`,
±0.5)은 이전에는 같은 그래프 `241_0`을 이 클래스로 보여 주었습니다. 오라클의 정확한 라우팅
이전 위치를 주입해도 한 에지(`0->1#0`, maxΔ 3.39pt)에 숫자
`unfilled_bezier` 차이 11건이 남았고, 이는 동원 내접원 동점으로 귀속되었습니다.
그 귀속은 틀렸습니다. `fix(T9): start swapped cdt faces at the new diagonal as gts does`
(2026-10-22)가 포팅 측의 잘못된 이식을 찾았습니다. GTS의 `swap_if_in_circle`은 두 새 면을
`gts_face_new(en, e5, e2)`와 `gts_face_new(en, e3, e4)`로 만들고(`cdt.c:509-511`),
`gts_triangle_vertices`는 면을 그 에지 순서에서 읽으므로 네이티브는 이를
(v3, v4, v2)와 (v4, v3, v1)로 나열합니다. 포팅은 둘 다 한 칸씩 회전해 저장했고,
멀티스플라인 라우터의 `triCenter`는 그 순서로 꼭짓점을 합산했습니다. 순서를 고치자
fdp `241_0`은 모든 트랙에서 네이티브와 일치하며(xdot 통과, json conformant, plain과 stderr 동일),
`accepted-divergences-engines.json`과 `accepted-divergences-json.json`의 항목은 퇴출되었습니다. 반면 fdp의
`2095`는 **A9가 아니라 A1-drift**입니다. 이름이 빈 단일 노드를 주입하면(귀속 주입기가
`""`라는 이름의 노드와 일치하도록 고쳐진 뒤) 잔여분이 0으로 수렴합니다 — 앞서의 'A9 꼬리'는
주입되지 않은 빈 노드가 그에 닿은 에지를 끌고 가던 것이었습니다. sfdp `2095` 수용도 같은 맹점이었습니다 —
고쳐진 주입기로 새로 생성한 sfdp 귀속 재생성(2026-07-22)이 역시 0으로 주입됨을 확인하여
수용이 제거되었습니다(위의 `2095 reclassified` 메모 참고).

**sfdp `2168_3` — `poly_init`의 Apple libm `sin` 1 ULP 차이(종결, 환원 불가).** **영향:** sfdp `2168_3`(stderr만: 포트가 `Pshortestpath` 경고를 하나 더 출력한다. 양쪽 모두 직선으로 폴백하므로 xdot 엔진 트랙 워크는 통과한다). **차이점:** `shapes.c:2329`는 `temp = GAP / sin(gamma)`를 계산한다(포트 `src/common/poly-sizing.ts:379`). gamma = 1.0092081171617377일 때 macOS libm은 0.8464104077694533, V8은 올바르게 반올림된 0.8464104077694532를 반환한다(1 ULP). 이 차이는 multispline 라우터(`neatosplines.c:428,444` → `multispline.c:598`)에 라우터 점 10/18, y 28.391789367446776 대 …78로 도달하고, 공원(cocircular) 사다리꼴(점 9, 10, 15, 16)이 다른 Delaunay 대각선으로 삼각분할되어 간선 1의 코리도 다각형이 달라지며 포트의 다각형에서 `Pshortestpath`가 실패한다. **수용 이유:** 해당 `sin` 값만 주입하는 통제 실험에서 stderr, 삼각형, 다각형, xdot이 네이티브와 동일해진다(`atan2`만으로는 그렇지 않다). sfdp 위치는 비트 단위로 같고, incircle 술어, pathplan, `makeObstacle`의 hypot, 윤곽 링 연산 순서는 배제되었다. 일치시키려면 소스가 공개되지 않은 Apple `sin`의 비트 단위 정확한 모델이 필요하며, 이식 가능한 코드로는 재현할 수 없다(`arm-pow.ts` 선례와 같은 경계). **근거:** [`plans/post-16-1-followups-2/decision-journal.md`](https://github.com/knowvah/dot-engine/blob/main/plans/post-16-1-followups-2/decision-journal.md), 2026-10-20 T13 행.

---

### A10. 폴리오미노 패킹에서의 V8 `Map` 크기 한계(`2784`, 패킹 기반 다섯 엔진) {#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}

**영향받는 대상:** `circo`, `twopi`, `neato`, `fdp`, `sfdp`에서의 `2784`. 포팅은 다섯 엔진 모두의
xdot 및 imagemap 조사와 `circo`의 `json` 조사에서 오류를 던집니다. `twopi`, `neato`, `fdp`, `sfdp`의
`json` 조사와 다섯 엔진 모두의 `plain` 조사에서는 네이티브 오라클 자체가 조사의 시간 예산 안에 끝나지
않으므로 해당 행은 오라클 오류입니다. `dot`, `osage`, `patchwork`에서는 통과합니다.

**무슨 일이 일어나는가.** `lib/pack/pack.c`는 컴포넌트가 차지하는 셀을 `PointSet`에 기록합니다.
`2784`(높이 3e16 pt의 단일 노드, `splines="ortho"`)에서는 충실한 정수 `step`/배치 산술에
2,011,656,764개의 셀이 필요합니다. 네이티브 16.1.0은 상주 메모리 67.3 GB(최대 101 GB)를 사용해
482초에 완료합니다. 포팅의 `PointSet`은 JavaScript `Map`이며 V8은 이를 2^24개 항목으로
제한하므로 `Map maximum size exceeded`를 던집니다.

**수용하는 이유.** 코드 아래에 있는 런타임 한계이며 논리 결함이 아닙니다. 원인은 `97fcccd8`의
충실한 산술입니다(그 이전에는 포팅이 작고 틀린 레이아웃을 계산해 한계에 도달하지 않았습니다).
수용되는 결과는 `diverged` 판정이 아니라 던져진 오류이므로, `accepted-divergences-engines.json`,
`accepted-divergences-json.json`, `accepted-divergences-map.json`의 항목은 `verdict: "port-error"`와
`errIncludes: "Map maximum size exceeded"`를 선언합니다. 즉, 그 메시지를 담은 경우에만 포팅 오류를
수용합니다. `2784`에서 다른 실패가 일어나면 수용되지 않은 결함으로 드러나고,
`registry-staleness.test.ts`가 그 항목을 낡은 것으로 표시합니다. 증거: [`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md).

### A11. 퇴화 입력에서 GTS Delaunay 면의 순서 — 환원 불가 {#a11-gts-delaunay-face-order-on-degenerate-input}

**영향받는 대상:** 입력이 퇴화된 경우(변 위의 점, 공원(共圓) 격자) GTS를 통해 삼각분할하는 레이아웃(`lib/neatogen/delaunay.c`; 16.1 오라클은 GTS 0.7.6을 링크한다).

**무엇이 다른가.** 포트는 Delaunay 면의 번호와 각 면의 이웃(`neigh`) 순서를 생성 순서로 매긴다. 네이티브 GTS는 면을 `GHashTable` 순서로 번호 매긴다. `closest_face`가 포인터를 키로 하는 테이블을 순회하므로 면 ID와 이웃 순서는 힙 주소에 좌우되며 실행마다 달라진다. 따라서 면 순서에서 파생되는 모든 것은 특정 네이티브 실행과 다를 수 있다.

**수용하는 이유.** 결정적인 목표는 존재하지 않는다. 퇴화된 입력 하나에 네이티브 바이너리를 60회 실행하자 ASLR을 끄고 `MallocNanoZone=0`으로 해도 22가지의 서로 다른 출력이 나왔다. 이 변동은 코드 아래에 있는 오라클의 속성이며 포트의 결함이 아니다. 면은 ID가 아니라 꼭짓점 집합으로 비교해야 한다. 근거: 3부의 GTS 메모(`.agent-notes/post-16-1-followups-3.md`, "GTS face vertex order and nondeterminism").

### A12. 렉서 오류에 `<stdin>: ` 접두사가 붙지 않음 {#a12-no-stdin-prefix-on-lexer-errors}

**영향받는 대상:** 렉서(`aagerror`)가 stderr로 보고하는 DOT 구문 오류.

**무엇이 다른가.** 표준 입력을 읽는 네이티브 `dot` CLI는 `<stdin>: syntax error in line N …`을 출력한다. 포트는 같은 메시지를 `<stdin>: ` 접두사 없이 출력한다.

**수용하는 이유.** `aagerror`(`lib/cgraph/scan.l:157`)는 `InputFile`이 설정된 경우에만 `InputFile: `을 덧붙인다. CLI는 표준 입력을 읽을 때 이를 `<stdin>`으로 설정하지만, 포트가 그대로 따르는 라이브러리 진입점 `agmemread`는 설정하지 않은 채 두므로 접두사를 출력하지 않는다. 포트에는 CLI가 없어 보고할 `InputFile`이 없다. stderr 프로브는 비교 시 이 접두사를 정규화한다.

---

## 추적 중인 롱테일(`dot` 속성 및 예외 사례) {#tracked-long-tail-dot-attribute-edge-case}

**기본값**에서 `dot` 엔진은 골든 코퍼스에 대해 C 바이너리와 엄격한 결정적 허용 오차로
일치합니다(`conformant` 판정, 맨 위의 안내 참고). 남은 차이는 **속성과 예외 사례의
롱테일**로, Graphviz 포팅에서 역사적으로 가장 어려운 부분입니다. 위의 수용된 차이와
달리 이것들은 *반드시 해소됩니다*. 개수와 함께
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)에서
실시간으로 추적됩니다.

| 범주 | 무엇이 다른가 |
|---|---|
| **path-structure** | 특정 구성의 에지 스플라인 라우팅(예: 일부 flat 에지와 밀집 통로 사례). |
| **element-count** | 특정 그래프에서 기능이 C보다 SVG 요소를 더 많이/적게 내보냄. |
| **color-stroke** | 특정 스타일 속성의 선/채우기 출력 차이. |
| **parser-gap** | 파서가 아직 완전히 받아들이지 못하는 소수의 DOT 입력. |

그래프가 일반적인 속성과 `dot` 엔진만 사용한다면 결정적 허용 오차 일치 경로에 있을 가능성이
거의 확실합니다. 레이아웃이 이상해 보이면 해당 입력 유형에 대해 `PARITY-dot.md`를
확인하십시오 — 알 수 없는 문제가 아니라 오라클로 고정한 수정 미션이 있는 추적 항목일
가능성이 높습니다.

> **레이블 주도 사례에 대한 참고.** 텍스트 측정 클래스(A2)는 종결되었으며 — 이제 이
> 클래스로 수용되는 `dot` 그래프는 없습니다. 오늘 structural-match에 있는 그래프는
> 폰트 메트릭 델타가 아니라 추적 중인 격차입니다.

### `concentrate=true` 반대 방향 에지 화살촉 {#concentrate-true-opposing-edge-arrowheads}

`concentrate=true`가 서로 반대 방향인 쌍(`A->B; B->A`)을 살아남는 에지 하나로 병합할 때,
그 에지는 **양쪽** 끝에 화살촉을 그려야 합니다. 이는 이제 포팅되어 있으므로(`arrow_flags`의
`conc_opp_flag` 분기, `src/common/splines-clip.ts:arrowFlags` 참고) `graphs-b135`, `167`,
`2087`이 일치합니다(화살촉 누락 `element-count` 차이와 클리핑되지 않은 스플라인의 `@d`
부작용이 모두 사라졌습니다).

일부 concentrate 그래프에는 화살촉 수정이 해결하지 **못하는, 기존의 별도 잔여분**이
남아 있습니다 — 화살촉 결함이 아니라 노드 **x 좌표** 위치 델타(x 네트워크 심플렉스 /
컴퍼스 포트)입니다.

- **`graphs-b15`, `graphs-b69`** — 큰 레코드/클러스터 '엘리베이터' 그래프. Concentrate는
  활성화되어 올바르게 병합합니다. 잔여분은 `element-count`/스플라인 `@d` 차이로 증폭되는 약
  1pt의 노드 x 델타입니다. 화살촉 출력 자체는 이제 올바릅니다(b69는 누락된 화살촉 다각형을
  얻습니다). x 좌표 근본 원인은 `b69-concentrate-undermerge` 에이전트 노트를 참고하십시오.
- **`1453`** — conc_opp_flag 화살촉과 무관한 최상위 `element-count` 원인으로 여전히
  어긋납니다.
- **`2825`** — 이 화살촉 수정 당시 conc_opp_flag와 무관한 최상위 `element-count` 원인으로
  어긋났습니다(거기서는 반대 방향 쌍 병합이 일어나지 않음). 이후 fix-2825-rebuild-vlists
  미션으로 종결되었습니다. 위의 A4를 참고하십시오.

이것들은 추적 중인 x 좌표 / 구조 항목이며, 화살촉 버그가 **아닙니다**.

### 2.0 충실도 미션의 레이아웃 충실도 격차(neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0 충실도 미션은 포팅되지 않은 속성 값이 조용히 넘어가지 않고 큰 소리로 실패하게
만들었습니다([오류와 예외](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)의
`UNSUPPORTED_FEATURE` 표 참고). 다음 항목은 남겨져 `plans/v2-fidelity/decision-journal.md`에
기록되어 있습니다.

**큰 소리로 실패, 미포팅.** 노드가 겹치는 `overlap=voronoi`는 neato, twopi, circo, sfdp에서
여전히 `UNSUPPORTED_FEATURE`를 던집니다. 보로노이 조정기 자체(`vAdjust`의 알고리즘)가
포팅되지 않았습니다. 던질지 여부를 정하는 겹침 검사는 C의 것 그대로입니다(`poly.c` 노드
다각형에 대한 `countOverlap`).

**알려진 격차, 여전히 조용함.** 포팅은 이것들을 오류 없이 렌더링하며 네이티브 Graphviz와
다릅니다. `v2-silent-gaps` 미션(`plans/v2-silent-gaps/decision-journal.md`)이 찾아낸
것이며, 수용된 차이가 아닙니다.

- **`getAdjustMode`의 'Unrecognized overlap value' 경고가 출력되지 않습니다.**
- **회전된 다각형 꼭짓점이 네이티브와 마지막 비트에서 다를 수 있습니다(환원 불가능: 호스트
  수학 라이브러리).** `poly_init`는 `atan2`, `hypot`, `sin`, `cos`로 각 꼭짓점의 방향을
  정합니다. 비트 단위로 동일한 입력에서도 macOS libm과 V8은 서로 다른 마지막 비트를
  반환하므로(예: `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`, 다음 꼭짓점의 `hypot`:
  libm `…fffd`, V8 `…fffe`), `orientation=20`인 박스는 꼭짓점 y가 포팅에서는 `-18`,
  네이티브에서는 `-17.999999999999996`입니다. 네이티브 Graphviz 자신도 플랫폼의 libm에 따라
  달라지며, 브라우저는 이를 호출할 수 없습니다. 포팅 자신의 산술은 C와 일치합니다(`RADIANS`
  순서 고정, 표본 추출한 꼭짓점 좌표 1664개 중 776개가 비트 단위로 동일하며 나머지는 libm
  때문에만 다릅니다). 영향: 정확히 맞닿는 `polyOverlap` 판정이 뒤집힐 수 있으며, 네이티브
  꼭짓점을 쓰면 모든 판정이 일치합니다.
- **sfdp는 macOS에서 네이티브와 다를 수 있습니다(환원 불가능: 호스트 libm `pow`).**
  계측한 네이티브 sfdp로 진단했습니다. 반발력 항 하나인 `pow(dist, 1 - p)`
  (`spring_electrical.c`, `p = -1`이므로 `pow(x, 2)`)가 macOS libm에서 `x*x`보다 1 ulp 작은
  값을 반환하기 전까지 위치는 비트 단위로 동일합니다(`pow(1.4116727416983157, 2)`: libm
  `1.9928199296540394`, 정확히 반올림하면 `…396`, macOS의 `pow(v, 2) != v*v`는 표본 추출한
  `v` 16201개 중 20개). 이는 반복의 `Fnorm`을 마지막 비트에서 바꾸며, sfdp의 적응형 냉각이
  이를 (흔히 거울상인) 다른 레이아웃으로 증폭시킵니다. 포팅의 `armPow`는 ARM의
  optimized-routines `pow`(glibc ≥ 2.28), 즉 Linux Graphviz가 계산하는 것이며, macOS
  오라클이 예외입니다. 배제된 것: 시딩(명시적 `start=` 값이 일치함), `pcp_rotate`(같은 입력이
  같은 출력을 냄), 위치와 인력 항(비트 단위로 동일). 예: 기본 시드의 단독 삼각형
  `a--b; a--c; b--c`.
- **fdp는 호스트 libm `cos`/`sin` 때문에 네이티브와 다를 수 있습니다.** fdp는 15.0.0 이후의
  Graphviz(hypot 거리 반발, `Mlimit`)를 따르며, 호스트 libm의 `hypot`을 비트 단위로
  재현합니다(`src/common/libm-hypot.ts`, 40만 표본에서 불일치 0건). fdp로 렌더링 가능한
  골든 입력 252개 중 251개가 네이티브 빌드와 정확히 일치합니다. 나머지 하나
  (`parallel-cluster-ldbxtried`)는 클러스터 포트 노드를 `T_Wd * cos(alpha)`로 배치하는데,
  macOS libm의 `cos(-2.3840764867756761)`은 V8의 `Math.cos`와 1 ulp 다르고 fdp의 힘 루프가
  이를 약 3인치로 증폭합니다. Apple의 `cos`는 `hypot`처럼 짧은 모델로 재현할 수 없습니다.
- **포팅이 정의하는 네이티브 크래시.** 네이티브 Graphviz는 `model=mds`이면서 에지 `len`이
  있는 neato `mode=KK`(`mds_model`이 `GD_dist`를 1부터 시작하는 순번으로 인덱싱: 힙
  오버플로)와, 연결되지 않은 그래프의 `model=circuit`에서 139로 종료합니다. 포팅은 첫 번째
  경우에는 범위를 벗어난 셀을 버리고 두 번째 경우에는 최단 경로로 되돌아갑니다. 비교할
  네이티브 출력은 없습니다.

---

## 의도적으로 포팅하지 않은 것(비목표) {#intentionally-not-ported-non-goals}

이것들은 버그가 아니라 의도적인 범위의 경계입니다. 이 라이브러리는 **SVG**(그리고
`json` / `xdot` / `dot` / 이미지맵 중간 텍스트 형식)를 대상으로 합니다.

- **다른 출력 형식.** 래스터(PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS, GUI/대화형 백엔드는
  범위 밖입니다. 래스터가 필요하면 SVG 출력을 사용해 이후 단계에서 변환하십시오.
- **SVG의 `page=` 페이지 분할.** 네이티브 `dot`도 SVG를 분할하지 않으므로(SVG 디바이스가
  분할 플래그를 설정하지 않음), 두 구현 모두 이 경로에서 `page=`는 아무 동작도 하지 않습니다 —
  흔히 혼동하는 지점이라 여기에 문서화할 뿐입니다.
- **`-Tplain` 텍스트 출력.** 제외된 것이 아니라 보류되었습니다(충실한 텍스트 형식).
- **`gvpr`**(그래프 처리 스크립트 언어) — 범위 밖.
- **C++ 편의 래퍼**(`cgraph++`, `gvc++`) — C API를 먼저 포팅했으며, 필요하다면 TypeScript
  관용에 맞는 편의 계층은 별도 패키지가 됩니다.
- **브라우저 텍스트 측정의 `fontnames=svg|ps`.** 브라우저에서 캔버스 측정기는 PostScript
  별칭의 `fontnames=native` 패밀리 목록(`Times-Roman` → `Times, serif`)으로 폰트를 만들며,
  이는 SVG 출력기가 기본으로 렌더링하는 것과 같은 글꼴입니다. `TextMeasurer`에는 그래프
  컨텍스트가 없으므로, `fontnames=svg` 또는 `fontnames=ps`를 설정한 그래프는 SVG가 svg/ps
  패밀리 이름을 쓰더라도 네이티브 목록 기준으로 측정됩니다. CSS가 정의하지 않는 별칭 굵기
  (`book`, `demi`, `light`, `medium`, `roman`)는 C에서처럼 그대로 출력되며, 브라우저는 이를
  무시하고 보통 굵기로 렌더링하고 측정기도 이에 맞게 보통 굵기로 측정합니다. Node 출력은
  영향을 받지 않습니다(캔버스 측정기를 쓰지 않습니다).
- **다중 그래프 입력과 빈 입력의 `NULL`.** `parse`와 `renderSvg`는 cgraph의 `agmemread`와 같은
  방식으로 DOT 문자열 하나를 읽습니다. 첫 번째 그래프의 닫는 중괄호 뒤에서
  `endgraph`(`lib/cgraph/grammar.y`)가 `aglexeof`(`lib/cgraph/scan.l`)를 호출하여 파일 끝
  토큰을 되돌려 놓으므로, 그 중괄호 이후로는 아무것도 렉싱되지 않습니다. 뒤따르는 텍스트, 종료되지 않은 문자열이나 주석, 추가 그래프는
  오류나 경고 없이 무시됩니다. 반면 `dot` CLI는 `agread`를 다시 호출하여 파일의 모든 그래프를 렌더링하므로, 그래프 두 개가
  든 파일은 CLI에서는 SVG 문서 두 개를, 여기서는 하나를 만듭니다(다중 그래프 코퍼스 파일 `1845`, `2835`,
  `graphs-multi`에서 포팅의 렌더링은 CLI의 첫 번째 문서와 일치하며, 이 파일들은 격리 상태로 남습니다). 여러 그래프를
  렌더링하려면 소스를 나누어 그래프마다 한 번씩 `renderSvg`를 호출하십시오. 비어 있거나 주석만 있는 입력에 대해
  `agmemread`는 `NULL`을 반환하고 CLI는 아무것도 출력하지 않습니다. `parse`는 대신 빈 무방향 그래프를 반환하고
  `renderSvg`는 이를 렌더링하는데, API가 호출마다 `Graph` 하나와 SVG 하나를 반환하기 때문입니다.
- **브라우저에서 안전한 대응물로 대체된 네이티브 전용 메커니즘**: 동적 플러그인 로딩
  (`dlopen`)은 정적 엔진/렌더러 등록으로, 파일 시스템 읽기(폰트, 이미지, 설정)는 호출자가
  제공하는 콜백(예: `setImageSizer`)으로 대체됩니다. 동작은 보존되며 메커니즘만 다릅니다.

---

## 차이 보고하기 {#reporting-a-divergence}

C와 다른 출력을 발견했는데 위의 수용된 차이도 아니고, `PARITY-dot.md`에도 없고, 비목표도
아니라면, 그것은 보고할 가치가 있는 버그입니다 — C 소스가 명세이며, 목록에 없는 차이는
수용된 동작이 아니라 결함으로 취급합니다.
