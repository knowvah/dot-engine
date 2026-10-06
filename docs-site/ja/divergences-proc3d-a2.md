---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — 代表的な A2 フォントメトリクスの差異（歴史的記録） {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip ステータス：解決済み — proc3d は現在適合しています
`EstimateTextMeasurer` への切り替え（`239c51b`、2026-06-25）以降、
ポートとヘッドレスの C オラクルの双方が、同じ `estimate_textspan_size` モデルでテキストを計測します。
以下の再現手順を現在のツリーに対して再実行すると、`tests/graphs/proc3d.gv` について
**差分 0、maxDelta 0** になります — このページに記録された差分はもはや再現しません。
A2 クラス全体としても、コーパス内の proc3d のインスタンスについては**消滅**しました。
最新の（固定されていない）件数は [既知の差異 §A2](/ja/divergences#a2-text-measurement-font-metrics-label-driven-layout)
と [パリティ](/parity) を参照してください。このページは歴史的な根本原因の解説として残されています —
以下のメカニズムは実在し、学ぶところが多いものですが、このグラフでは観測可能な差分を
もう生じないというだけです。
:::

`proc3d`（`graphs-proc3d` / `share-proc3d` / `windows-proc3d`）は、
[A2 フォントメトリクス](/ja/divergences#a2-text-measurement-font-metrics-label-driven-layout)の
典型例でした。サブピクセル単位のテキスト計測の差が、ノードの x 位置を数ポイントずらし、
グラフは **structural-match** にとどまりました。このページは、差異の一覧から参照される独立した詳細解説で、
計測器が統一される前に、*なぜ*そうなったのかを説明します。

## 入力 {#input}

| | |
|---|---|
| **エンジン** | `dot` |
| **ソース** | `tests/graphs/proc3d.gv`（上流の [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) テストコーパスより）— 443 行 |
| **主な属性** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## なぜ差異が生じたのか（当時の根本原因） {#why-it-diverged-root-cause-at-the-time}

x 方向のネットワーク単体法によるレイアウトは忠実でした。唯一の違いは、当時のポートのフォント計測器が、
一部の**幅の広いラベル**を、ネイティブオラクルの FreeType ベースの計測よりも
わずか数分の 1 ポイントだけ広く報告したことです。proc3d で最も幅の広いラベルは、ファイルパスの楕円です —
たとえば `/home/ek/work/src/lefty/lefty.c` は、
[`known-divergences.md` §A2](/ja/divergences#a2-text-measurement-font-metrics-label-driven-layout)
が **+0.75 pt (+0.43%)** と計測した、まさにその文字列です。ラベルが広くなるとノードもわずかに広くなり、
その半幅が `ROUND()` された左から右への間隔制約に入力されます。すると、ネットワーク単体法は
わずかに異なる（同じく最適な）整数の x 割り当てを選びました。その結果、約 2620 pt の図全体にわたって
ほぼ一様な **最大 3.55 pt** の x ずれが生じました — ランク、順序、トポロジー、y 座標は同一です。
修正は proc3d 専用のパッチではありませんでした。`EstimateTextMeasurer` への切り替えにより、
両側が同じヘッドレス計測モデルに揃い、このずれを生んでいた
幅の広いラベルの過大計測というギャップが解消されたのです。

## 差分 — ゴールデンと本実装を重ねて表示 {#the-delta-—-golden-vs-ours-overlaid}

ゴールデン（**緑**）と本実装（**赤**）を同じフレームに重ねています。
実寸では混ざって茶色に見えます — ずれは知覚できない程度です（だからこそ
*structural-match* なのです）。

![proc3d のゴールデンと本実装の重ね合わせ、図全体：緑 = C、赤 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

拡大すると、緑と赤の縁取りが現れるのは**ほぼ完全に、長いファイルパスの楕円ラベル**です — まさに計測器が
過大に計測する幅の広い文字列です。コード／ボックスのノードは一致したままです。

![幅の広いパスラベルの楕円を拡大した proc3d の重ね合わせ：緑 = C、赤 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## 図全体 — 先にゴールデン、次に本実装 {#full-drawings-—-golden-first-ours-second}

| ゴールデン — ネイティブの `dot` | 本実装 — @knowvah/dot-engine |
|---|---|
| ![C Graphviz でレンダリングした proc3d](/img/proc3d-golden.svg) | ![@knowvah/dot-engine でレンダリングした proc3d](/img/proc3d-ours.svg) |

## 数値（このページの執筆時点） {#numbers-at-the-time-this-page-was-written}

| 指標 | 値 |
|---|---|
| 判定 | structural-match |
| maxDelta（ポート対ネイティブ） | 3.55 pt |
| x がずれたラベル | 73 / 73（ほぼ一様） |
| 図の x 方向の広がり | 約 2620 pt → ずれは 0.13% |
| ランク / 順序 / トポロジー / y | C と同一 |

**現在の数値**（最新のツリーに対して再検証済み）：判定は
**conformant**、差分 0、maxDelta 0 です — このページ冒頭のステータス注記を参照してください。
上の重ね合わせ画像は、メカニズムのスナップショットとして残してあるものであり、
最新の比較ではありません。

## 再現 {#reproduce}

ネイティブオラクルはヘッドレスの `GVBINDIR`（`/tmp/ghl`、`test/corpus/gen-headless-gvbindir.sh` で生成）の下で実行されるため、
両側が同じ `estimate_textspan_size` 計測器を使います —
[§A2「アルゴリズムをフォントバックエンドから切り離す」](/ja/divergences#a2-text-measurement-font-metrics-label-driven-layout)
を参照してください。

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

現在これを実行すると、上で述べた 3.55pt の差ではなく、一致する SVG が得られます
（`deterministic` の ±0.01 許容誤差で差分 0）。
