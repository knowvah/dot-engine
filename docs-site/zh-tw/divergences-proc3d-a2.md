---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d——典型的 A2 字型度量差異（歷史） {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip 狀態：已解決——proc3d 現已一致
自 `EstimateTextMeasurer` 切換（`239c51b`，2026-06-25）起，移植版與
無頭的 C 參照程式都以同一個 `estimate_textspan_size` 模型量測文字。
對目前的程式樹重新執行下方的重現步驟，`tests/graphs/proc3d.gv` 得到 **0 項差異，
maxDelta 0**——本頁記載的差異已不再重現。A2 類別整體對語料庫的
proc3d 實例已**崩解**；目前未凍結的計數請見[已知差異 §A2](/zh-tw/divergences#a2-text-measurement-font-metrics-label-driven-layout)
與[對齊度](/parity)。本頁作為
歷史根本原因說明而保留——下方的機制是真實且具啟發性的，
只是它在這張圖上已不再產生可觀察的差異。
:::

`proc3d`（`graphs-proc3d`／`share-proc3d`／`windows-proc3d`）曾是
教科書式的 [A2 字型度量](/zh-tw/divergences#a2-text-measurement-font-metrics-label-driven-layout)
案例：次像素的文字量測差異使節點 x 位置偏移了
數個點，使這張圖落在 **structural-match**。本頁是差異清單所引用的獨立分析，
說明在量測器統一之前，那*為什麼*會發生。

## 輸入 {#input}

| | |
|---|---|
| **引擎** | `dot` |
| **來源** | `tests/graphs/proc3d.gv`（來自上游 [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) 測試語料庫）——443 行 |
| **主要屬性** | `fontname=Courier`、`orientation=land`、`size="10,7.5"`、`ranksep=1.0` |

## 為什麼會有差異（根本原因，當時） {#why-it-diverged-root-cause-at-the-time}

x 網路單純形版面配置是忠實的；唯一的差異在於，
當時移植版的字型量測器回報某些**寬標籤**，比原生參照程式以 FreeType 為基礎的量測
寬了零點幾個點。proc3d
最寬的標籤是檔案路徑橢圓——例如 `/home/ek/work/src/lefty/lefty.c`，
也就是 [`known-divergences.md` §A2](/zh-tw/divergences#a2-text-measurement-font-metrics-label-driven-layout)
量測為 **+0.75 pt (+0.43%)** 的那個字串。較寬的標籤使節點稍寬，
其半寬餵入經 `ROUND()` 取整的由左到右間隔約束；
網路單純形接著選出略有不同（同樣最佳）的整數
x 指派。結果是在約 2620 pt 的繪圖上出現近乎均勻的 **≤ 3.55 pt** x 位移——層級、
順序、拓撲與 y 座標都相同。修正
並不是針對 proc3d 的專屬補丁：`EstimateTextMeasurer` 的切換讓兩側
採用同一個無頭量測模型，從而消除了
造成此位移的寬標籤過度量測差距。

## 差異——黃金與我方，疊圖 {#the-delta-—-golden-vs-ours-overlaid}

黃金（**綠色**）與我方（**紅色**）疊在同一個畫面中。在完整
比例下，它們混成棕色——位移低於可察覺程度（因此是
*structural-match*）。

![proc3d 黃金與我方疊圖，完整繪圖：綠色 = C，紅色 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

放大後，綠／紅邊緣**幾乎全部出現在長的檔案路徑橢圓
標籤上**——正是量測器過度量測的寬字串。程式碼／方框
節點則保持重合：

![proc3d 疊圖，放大至寬路徑標籤橢圓：綠色 = C，紅色 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## 完整繪圖——先黃金，後我方 {#full-drawings-—-golden-first-ours-second}

| 黃金 — 原生 `dot` | 我方 — @knowvah/dot-engine |
|---|---|
| ![由 C Graphviz 轉譯的 proc3d](/img/proc3d-golden.svg) | ![由 @knowvah/dot-engine 轉譯的 proc3d](/img/proc3d-ours.svg) |

## 數字（撰寫本頁當時） {#numbers-at-the-time-this-page-was-written}

| 指標 | 值 |
|---|---|
| 判定 | structural-match |
| maxDelta（移植版與原生） | 3.55 pt |
| x 方向偏移的標籤 | 73 / 73（近乎均勻） |
| 繪圖 x 範圍 | ~2620 pt → 位移為 0.13% |
| 層級／順序／拓撲／y | 與 C 相同 |

**目前的數字**（已對現行程式樹重新驗證）：判定
**conformant**，0 項差異，maxDelta 0——見本頁最上方的狀態說明。
上方的疊圖保留作為該機制的快照，而不是
即時比較。

## 重現 {#reproduce}

原生參照程式在無頭的 `GVBINDIR`（`/tmp/ghl`，來自
`test/corpus/gen-headless-gvbindir.sh`）下執行，因此兩側使用同一個
`estimate_textspan_size` 量測器——見
[§A2「Isolating the algorithm from the font backend」](/zh-tw/divergences#a2-text-measurement-font-metrics-label-driven-layout)。

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

今天執行這個步驟會產生相符的 SVG（在 `deterministic`
±0.01 容許誤差下 0 項差異），而不是上述的 3.55pt 差異。
