---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — 대표적인 A2 폰트 메트릭 차이(역사적 기록) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip 상태: 해결됨 — proc3d는 이제 적합합니다
`EstimateTextMeasurer` 전환(`239c51b`, 2026-06-25) 이후 포팅과 헤드리스 C 오라클은 모두
같은 `estimate_textspan_size` 모델로 텍스트를 측정합니다.
아래 재현 절차를 현재 트리에서 다시 실행하면 `tests/graphs/proc3d.gv`에 대해
**차이 0건, maxDelta 0**이 반환됩니다 — 이 페이지에 기록된 델타는 더 이상 재현되지
않습니다. 코퍼스의 proc3d 인스턴스에 대해서는 A2 클래스 전체가 **사라졌습니다**.
고정되지 않은 최신 집계는 [알려진 차이 §A2](/ko/divergences#a2-text-measurement-font-metrics-label-driven-layout)와
[패리티](/parity)를 참고하십시오. 이 페이지는 역사적인 근본 원인 분석으로 남겨 둡니다 —
아래의 메커니즘은 실제이며 시사하는 바가 크지만, 이 그래프에서는 더 이상 관찰 가능한
델타를 만들지 않을 뿐입니다.
:::

`proc3d`(`graphs-proc3d` / `share-proc3d` / `windows-proc3d`)는
[A2 폰트 메트릭](/ko/divergences#a2-text-measurement-font-metrics-label-driven-layout)의
교과서적인 사례였습니다. 서브픽셀 수준의 텍스트 측정 차이가 노드의 x 위치를 몇 포인트
어긋나게 해, 그래프가 **structural-match**에 머물렀습니다. 이 페이지는 차이 목록에서
참조하는 독립된 분석 문서로, 측정기가 통합되기 전에 *왜* 그런 일이 일어났는지를
설명합니다.

## 입력 {#input}

| | |
|---|---|
| **엔진** | `dot` |
| **소스** | `tests/graphs/proc3d.gv`([Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) 업스트림 테스트 코퍼스에서 가져옴) — 443줄 |
| **주요 속성** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## 왜 어긋났는가(당시의 근본 원인) {#why-it-diverged-root-cause-at-the-time}

x 네트워크 심플렉스 레이아웃은 충실했습니다. 유일한 차이는 당시 포팅의 폰트 측정기가
일부 **폭이 넓은 레이블**을 네이티브 오라클의 FreeType 기반 측정보다 1포인트의 일부만큼
더 넓게 보고했다는 점입니다. proc3d에서 가장 넓은 레이블은 파일 경로 타원입니다 — 예를
들어 `/home/ek/work/src/lefty/lefty.c`는
[`known-divergences.md` §A2](/ko/divergences#a2-text-measurement-font-metrics-label-driven-layout)에서
**+0.75 pt(+0.43%)**로 측정된 바로 그 문자열입니다. 레이블이 넓어지면 노드가 약간 넓어지고,
그 절반 너비가 `ROUND()`로 반올림되는 좌에서 우로의 간격 제약에 반영되었습니다. 그러면
네트워크 심플렉스가 약간 다른(똑같이 최적인) 정수 x 배정을 골랐습니다. 그 결과 약 2620 pt
너비의 그림 전체에 걸쳐 거의 균일한 **≤ 3.55 pt**의 x 이동이 생겼으며, 랭크, 순서, 토폴로지,
y 좌표는 동일했습니다. 해결책은 proc3d 전용 패치가 아니었습니다. `EstimateTextMeasurer`
전환으로 양쪽이 같은 헤드리스 측정 모델을 쓰게 되었고, 이 이동을 일으키던 넓은 레이블의
과대 측정 간극이 사라졌습니다.

## 델타 — 골든과 우리 결과를 겹쳐 보기 {#the-delta-—-golden-vs-ours-overlaid}

골든(**초록**)과 우리 결과(**빨강**)를 같은 프레임에 겹쳐 놓았습니다. 전체 크기에서는
갈색으로 섞여 보이며 — 이동은 눈에 띄지 않습니다(그래서 *structural-match*입니다).

![proc3d 골든 대 우리 결과 오버레이, 전체 그림: 초록 = C, 빨강 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

확대하면 초록/빨강 경계는 **거의 전적으로 긴 파일 경로 타원 레이블**에서만 나타납니다 —
측정기가 과대 측정하는 바로 그 넓은 문자열입니다. 코드/박스 노드는 그대로 겹칩니다.

![넓은 경로 레이블 타원을 확대한 proc3d 오버레이: 초록 = C, 빨강 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## 전체 그림 — 먼저 골든, 다음에 우리 결과 {#full-drawings-—-golden-first-ours-second}

| 골든 — 네이티브 `dot` | 우리 결과 — @knowvah/dot-engine |
|---|---|
| ![C Graphviz로 렌더링한 proc3d](/img/proc3d-golden.svg) | ![@knowvah/dot-engine으로 렌더링한 proc3d](/img/proc3d-ours.svg) |

## 수치(이 페이지를 작성하던 당시) {#numbers-at-the-time-this-page-was-written}

| 지표 | 값 |
|---|---|
| 판정 | structural-match |
| maxDelta(포팅 대 네이티브) | 3.55 pt |
| x 방향으로 이동한 레이블 | 73 / 73(거의 균일) |
| 그림의 x 범위 | 약 2620 pt → 이동은 0.13% |
| 랭크 / 순서 / 토폴로지 / y | C와 동일 |

**현재 수치**(현재 트리에서 다시 검증함): 판정은 **conformant**, 차이 0건, maxDelta 0입니다 —
이 페이지 맨 위의 상태 안내를 참고하십시오. 위의 오버레이 이미지는 실시간 비교가 아니라
메커니즘의 스냅숏으로 남겨 둔 것입니다.

## 재현 {#reproduce}

네이티브 오라클은 헤드리스 `GVBINDIR`(`/tmp/ghl`, `test/corpus/gen-headless-gvbindir.sh`로
생성)에서 실행되므로 양쪽이 같은 `estimate_textspan_size` 측정기를 사용합니다 —
[§A2 “Isolating the algorithm from the font backend”](/ko/divergences#a2-text-measurement-font-metrics-label-driven-layout)를
참고하십시오.

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

오늘 이것을 실행하면 위에서 설명한 3.55pt 델타가 아니라 일치하는 SVG(`deterministic`
±0.01 허용 오차에서 차이 0건)가 만들어집니다.
