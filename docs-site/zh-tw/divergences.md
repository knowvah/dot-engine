---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 與 C 版 Graphviz 的已知差異 {#known-divergences-from-c-graphviz}

@knowvah/dot-engine 力求與標準的 C 實作達到最高程度的忠實度。C 原始碼就是規格；
未列出的差異會被視為缺陷，而不是被接受的行為。

> **此處「相符」的意義。** 語料庫對齊判定 `conformant` 是一種**嚴格的決定性容許誤差**，
> *不是* SVG 逐位元組完全相同：數值座標與路徑必須在 **±0.01** 內一致，
> 所有非數值內容（標籤、顏色、文字）必須完全相等
> （`compareSvg(…, 'deterministic')`）。在本文件中，「相符」與「一致」
> 皆指這項容許誤差判定。完整定義：
> [一致性](./conformance.md)。

輸出*確實*有差異時，恰好落入三類之一：

1. **已接受的差異** — 我們已經調查、釐清根本原因，並且**刻意選擇不使其一致**的差異。
   每一項都有界限、有特徵描述，並在下方說明理由。這些不是錯誤，除非有另行界定範圍的具體理由，
   否則不會被「修正」。
2. **持續追蹤的長尾** — 已知且*將會*補上的缺口，每一項都有以參照程式為基準的修正方案。
   它們連同即時計數列於
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)。
3. **非目標** — 刻意劃定的範圍邊界（我們從未打算重現的格式與機制）。

具權威性、持續更新的紀錄為
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
（針對原生 `dot` 的逐輸入對齊度儀表板）與
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
（演算法層級的移植狀態清單）。

哪些圖屬於*已接受*（下方第 1 類）的**機器可讀**權威來源是
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json)。
工具會在產生報告時將它合併進來：`PARITY-dot.md` 將**已接受的差異**與**持續追蹤的**待辦項目分開，
規則閘門的允許清單也由它而來。下方的文字段落說明每一個條目（A1 與 A3 為現行；
A2 已結案，作為歷史保留）；一項 CI 測試（`accepted-divergences.test.ts`）確保
每一張已接受的圖仍然存在差異，因此這份清單不會悄悄腐化。

---

## 已接受的差異（我們刻意不使其一致） {#accepted-deltas-we-deliberately-do-not-make-conformant}

只有在下列條件**全部**成立時，我們才會接受差異——而不是追求逐位元組一致：

- 根本原因是**可攜性限制**（JavaScript／瀏覽器執行環境無法精確重現的事物），
  而不是移植版中的邏輯錯誤。
- 差異**低於可察覺程度**，且可證明是**有界的**。
- 相對於回報，修正會有**不成比例的成本與影響範圍**（通常是：它會動到被數百張
  已一致的圖共用的基礎元件，為了只差零點幾個像素的收益而冒著迴歸的風險）。

當我們接受某項差異時，會在此描述其特徵，讓使用者不會感到意外。
受已接受差異影響的圖，是以**結構／容許誤差**的標準而非逐位元組的標準來驗證。

### A1. 浮點數決定性（力導向引擎） {#a1-floating-point-determinism-force-directed-engines}

**受影響：** `neato`、`fdp`、`sfdp`、`circo`、`twopi`、`osage`（迭代式的彈簧模型引擎）。
`dot` 引擎的*版面配置***不受**這種迭代模型決定性的影響；另一項範圍狹窄的
`dot` 樣條繞線浮點差異，則在下方的 **A3** 中說明。

> **範圍，歷史上是一項未量測的但書——現在已部分量測。**
> **主要的 dot 引擎 SVG 調查**（`test/corpus/survey.ts`）仍然**只涵蓋 dot**：
> 原生參照程式在 `GVBINDIR=/tmp/ghl` 下執行，該目錄**只**以符號連結
> `core` + `dot_layout` 外掛
> （`test/corpus/gen-headless-gvbindir.sh` 只迴圈處理 `core dot_layout`
> ——不存在 `neato`／`fdp`／`circo`／`twopi`／`osage`／`sfdp` 的版面配置外掛），
> 而參照程式與移植版都是以 `dot` 引擎呼叫。因此像 `*_neato`／`*_circo`／`root_twopi`
> 這類語料庫 id，在該調查中只是以 `dot` 排版的*檔名*，並非使用其原生引擎，
> A1 在那裡符合**零**張圖——並不是因為這些引擎已被證明一致，
> 而是因為該特定調查從未執行過它們。
>
> **但所有六個 A1 引擎現在都有各自使用原生引擎的調查**，透過
> `test/corpus/engine-walk.ts` + `parity-report.ts`（與 `GVBINDIR` 無關——
> 每個都直接啟動 `dot -K <engine> -Txdot`），並有兩種不同的嚴謹程度，於下方分別記載：
> `circo`／`twopi`／`osage` 採用與 dot 調查相同的 **±0.01 決定性**容許誤差，
> 並逐 id 進行根本原因分級處理（見下方「引擎軌道接受」）；
> `neato`／`fdp`／`sfdp` 則採用較寬鬆的 **±0.5 特徵描述**容許誤差，
> 目前尚未逐 id 分級處理（見下方「迭代式引擎的特徵描述」）。目前各引擎的整體數字：
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)。

**特徵描述。** 這些引擎執行迭代式數值版面配置，其結果取決於浮點數捨入——特別是
融合乘加（FMA）與 `Math.pow`，這兩者在不同的 JavaScript 引擎與 CPU 架構之間可能有所不同。
移植版在可能之處與 C 的運算順序一致（`src/common/fma.ts`、
`src/common/arm-pow.ts`）——例如 `sfdp` 在使用相符的 PRNG 與 `fma` 時，
與原生參照程式相符到約 6 位有效數字——但**不保證跨平台**能精確重現出完全相同的座標。
拓撲會被保留；可能的差異在於細微的節點座標。

**為何接受。** 這是在 JS 中執行的硬性限制，而不是設計上的選擇
——與 A3 的 Apple `hypot` 敏感性屬同一族。無法保證在所有目標執行環境中
超越函數／FMA 的結果位元相同，因此逐位元組的標準不只是昂貴，而是無法測試。
要**評估 A1**（而不只是附註但書），需要一條獨立的原生引擎對齊軌道——
於 2026-07-11 建成，即 `test/corpus/engine-walk.ts` + `parity-report.ts`，
以每個輸入自己的引擎而非 `dot` 進行調查。這項工作誠實的上限，是把 A1
**縮小**為「在參考平台上沒有現行差異」，而絕不是消除跨平台的但書；
目前的結果（見下）都守住了這個上限：`circo`／`twopi`／`osage` 各自揭露並找出了
少數真正的 A1／A9 案例的根本原因，而 `neato`／`fdp`／`sfdp` 如今在 910 項的範圍內，
與原生版相差 0.5pt 以內的比例分別為 90.8／77.5／68.0%，
意味著移植的算術（`fma.ts`、`arm-pow.ts`、相符的 PRNG）對大多數圖成立——
而且每個其餘的差異 id 都是透過注入個別歸因（求解器漂移 vs. 移植缺陷），
而不是留作未分級處理的漂移；請見下方迭代式引擎的特徵描述。

**引擎軌道接受：twopi 箭頭家族。** <a id="a1-twopi-arrows-family"></a>
上方的引言區塊描述的是 dot 引擎的 SVG 調查，其中 A1 符合零張圖；
而獨立的 `twopi` **xdot 引擎軌道**（`parity-twopi.json`，原生
`dot -K twopi -Txdot` 參照程式，`test/corpus/engine-walk.ts`）*確實*在其原生引擎下執行，
並在 9 個語料庫 id 上揭露了一個具體、經驗證的 A1 案例：
`graphs-arrows`、`graphs-newarrows`、`graphs-arrowsize`、`linux.x86-arrows_dot`、
`macosx-arrows_dot`、`nshare-arrows_dot`、`share-newarrows`、`windows-newarrows`，
以及（2026-07-28 新增，屬於 905 項範圍內的新成員）directed/ 中的同類項目
`tree-graphs-directed-oldarrows`——每一個都在單一主要邊上出現差異
（`Z->I` 或 `i->Z`；12–64 個繪製操作差異）。注入 A/B（決策日誌，2026-07-10 的
「injection A/B verdicts: twopi arrows family EXONERATED...」條目）直接證明了其機制：
傾印原生 `spline_edges` 入口處的 `ND_pos`，並將它注入移植版的
`splineEdgesShifted`，會在 `graphs-arrows` 上產生**完全一致**的輸出
（`Z->I` 與參照程式逐位元組相同，同樣是 7/14 個點的樣條）——
因此，差異 100% 是來自 `twopi` 的 PRISM 重疊移除求解器、發生在繞線之前的節點位置漂移，
移植版的樣條繞線與輸出則被免責。8 個 id 中有 6 個的可見症狀是貝茲點數翻轉
（`unfilled_bezier[ptCount]: 8 vs 14`）：`Proutespline` 擬合出的段數，
對漂移後的節點位置落在障礙物邊界的哪一側很敏感，所以在 PRISM
迭代求解之後、低於 1 ULP 的位置差異，就會翻轉擬合樣條的段數
（另外 2 個 id，`graphs-arrowsize`／`nshare-arrows_dot`，呈現相同的漂移，
只是較小的純位置差異，並未發生段數翻轉）。透過
`test/corpus/accepted-divergences-engines.json` 在引擎軌道層級被接受，
並由 `parity-report.ts` 合併進 `PARITY-twopi.md`——這與 `accepted.ts`
對 dot 軌道的 `PARITY-dot.md` 所做的合併相同。

`oldarrows` 的 RCA（2026-07-28）找出了該家族點數症狀確切的翻轉位置。
其 `i`–`Z`–`I` 扇形共線於環的直徑上，而 pathplan `directVis` 的 `intersect()`
在障礙物頂點「位於」線段上時會阻擋視線——其中 `wind()` 的 1e-4 共線容許誤差，
讓距離線段 270pt 的節點都被視為共線，而 `inBetween()`（假設共線）隨之退化為
只測試 **x 投影**：頂點阻擋視線，若且唯若它的 x 嚴格落在兩個端點 x 座標之間、
寬度僅一個 ULP 的區間內。因此，兩條鏡像的放射狀邊中哪一條會彎曲，取決於
PRISM 求解所得、名義上相等的三個 x 值在最後一個 ULP 上的順序——
C 彎曲 `Z->I`（節點 `i` 的軸頂點落入其區間），移植版彎曲 `i->Z`
（節點 `I` 的頂點落入它自己的區間）。在雙方各自傾印出的障礙物集合上離線重現
`directVis`，可以精確重現雙方各自的決策，而將參照程式繞線前的 `ND_pos`
注入移植版會得到 0 個差異（`attribution-twopi.json`）——繞線與輸出都與原版位元組忠實一致。

`1855` 是同一個繞線前 PRISM 浮點機制的放射狀／星形**鏡像**變體
（2026-07-11 接受）：它的 31 片葉節點恰好共圓，因此星形版面配置具有反射對稱性，
而 PRISM 的重疊移除處於一個對稱不穩定的平衡點；`circleLayout` 的
`setAbsolutePos` 中，5 個葉節點角度上 V8 與 libm 的 `cos`／`sin` 相差 1 ULP，
就選到了相反的鏡像盆地，使整個放射狀版面配置成為參照程式版面在 x 軸上的精確鏡像
（最大節點位移 6.04pt，bb 不變）。注入 A/B 證明了兩個方向：
把 C 精確的 `circleLayout` 位置餵給移植版的 PRISM，會逐節點重現參照程式（3e-14），
而只還原那 5 個存在 ULP 差異的葉節點位置，就會讓整個版面配置翻回移植版的鏡像。
完整 RCA：`.agent-notes/twopi-radial-drift-rca.md`（決策日誌 2026-07-11）。

**迭代式引擎的特徵描述：neato/fdp/sfdp。** <a id="a1-iterative-characterization"></a>
與上方的 `circo`／`twopi`／`osage` 引擎軌道不同，`neato`／`fdp`／`sfdp`
**尚未**逐 id 分級處理——`engine-walk.ts` 為這三者記錄 `tolerance: 0.5`
欄位，而 `parity-report.ts` 將它們呈現於
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
中獨立的「Iterative engines (±0.5 characterization)」章節，
明確**不可**與本文件其他地方 ±0.01 決定性的通過率相比較。目前的計數
（910 項範圍；通過率排除 C 參照程式無法轉譯的輸入，依據[一致性](./conformance.md)）：

| 引擎 | 調查數 | ±0.5pt 內 | 不一致（皆已歸因、已接受） | 移植版錯誤／逾時 | 參照程式錯誤 |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

（2026-07-11 在 762 項時進行的第一次掃描，量得 ±0.5pt 內的數量為 263/311/260
——躍升到目前的比率，來自此後落地的逐 id 修正，
主要是 neato 未移植的 `user_pos`／`P_SET` 處理、引擎初始化的整併，
以及 `setEdgeType` 巨集與函式的修正。）

與第一次掃描時不同，現在每一列差異都已個別歸因：
注入工具（`test/corpus/attribute-divergence.ts`）將原生參照程式繞線前的
`ND_pos` 餵給移植版並重新比對，而目前每個差異 id 若不是
`drift-exonerated`（一旦移除求解器漂移，移植版的繞線與輸出就能精確重現參照程式），
就是少數幾個另行接受的逐 id 殘留項之一（`241_0` 在三個引擎上的 CDT 內切圓平手，
neato 的 `2239`，sfdp 的 `42`／`2556`）。
下方的類別接受將被免責的集合正式化；即時計數見各引擎儀表板
（[`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md)、
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md)、
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)）。

**A1-drift 類別接受（迭代式引擎，成員為計算得出）。**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
為每個迭代式引擎（`neato`、`fdp`、`sfdp`）各帶有一個 `"A1-drift"` **類別**條目
——`{ class: true, attributionFile, ref }`——有別於上方 `circo`／`twopi`／`osage` 軌道所用的
逐 id 條目（D2，`plans/iterative-parity-campaign/decisions.md`）。與逐 id 條目不同，
類別成員從不在登錄檔中手動列舉：`parity-report.ts` 於產生報告時，
從對應的 `attribution-<engine>.json`
（T1 的注入歸因工具，`test/corpus/attribute-divergence.ts`）計算出來
——每個差異 id，只要將其原生繞線前的 `ND_pos` 注入移植版並重新比對後，在 ±0.5 內達成一致，
就會在該檔案中得到 `verdict: 'drift-exonerated'`，意思是兩個引擎的迭代式求解器收斂到
數值上不同、但各自內部一致的版面配置（依上方 A1 的特徵描述，屬於浮點數累加差異，
而不是移植版的繞線或輸出缺陷）。逐 id 的證據——分組形態、基準與注入後的差異數、
均勻平移／鏡像偵測——都在歸因產物本身，不重複寫進本文件或登錄檔（D2）。
之後開始完全通過、或重新歸因後判定改變的 id，會在下次報告重新產生時自動退出該類別
——不需要修改過時的接受條目，也不會導致防護測試失敗。尚未產生
`attribution-<engine>.json` 的引擎，會將該類別呈現為
「attribution pending」且成員數為零，與完全沒有任何接受條目相同
——類別條目可以先於其資料存在（見
`test/corpus/accepted-divergences-engines.test.ts`）。

### A2. 文字量測（字型度量）→ 由標籤驅動的版面配置 — 已結案 <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**狀態（2026-07-01）：已結案。** 目前沒有任何語料庫 id 在此類別下被接受；
本節作為該機制，以及用來化解它的可注入 `TextMeasurer` 替換點的歷史文件而保留。
陸續進行的文字量測修正（`EstimateTextMeasurer` 切換、感知字型的垂直度量、
非 ASCII UTF-8 位元組修正）解決了過去歸於此處的幾乎所有由標籤驅動的版面配置差異。
**`proc3d`**——先前典型的 A2 範例——在三個語料庫目錄
（`graphs-`／`share-`／`windows-proc3d`）上已完全**一致**（`conformant`）：
外框相符、路徑資料零差異、標籤錨點零差異。

**最後的成員已退場（2026-07-01）。** **`NaN` 家族**
（`graphs-NaN`／`share-NaN`／`windows-NaN`）在其節點幾何早已與 C 完全相符
（76/76 個參考點）之後，仍長期被列在此處。它真正的殘留——四組相對的 2-環邊對
（`Target↔TThread`、`Interp↔InterpF`、`Event↔Target`、
`AtomProperties↔NRAtom`）上 8 個直線邊端點偏移了 6–14 pt——經重新診斷後，
結果**完全不是字型度量的影響**，而是 dot 多重邊繞線中的兩個移植缺陷
（任務 `plans/fix-nan-a2-retire/`、
`.agent-notes/nan-edge-endpoint-diagnosis.md`）：

1. **相對邊對的車道順序。** 移植版在分配 Multisep 車道偏移之前，
   會依原始建立序號重新排序每個平行邊群組；C 則依 edgecmp 收集的順序分配車道
   （MAINGRAPH 的正向代表邊在前，AUXGRAPH 的反向成員在後——`dotsplines.c:419`、
   `make_regular_edge:1885-1907`）。若 2-環中的反向成員先被宣告，
   就會讓每條邊都畫在對方那條 18 pt 的通道上。
2. **跨層級合併邊上的偽同層相鄰。** `markAdjacent`
   在標記 `ND_other` 條目時，沒有 C 的同層級防護
   （`flat.c:272-276`），讓 `groupSize` 的同層相鄰短路吞掉了 portcmp 群組分界。

忠實地修正這兩者之後，該家族在三個目錄上都**一致**（逐元素：節點 0、邊 0 個不同），
同一機制也解決了 `42`、`clust2`、`ngk10_4`（structural-match → conformant），
並讓 `b124` 從 diverged 變成 structural-match——全都是在 2-環／平行邊對上。

**調查的兩側都執行同一個估算器——量測已被化解。**
原生 `dot` 參照程式在無頭（headless）的 `GVBINDIR`
（`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`）下執行，該目錄只以符號連結
`core` 與 `dot_layout` 外掛——沒有 `gd`／`pango`／`quartz` 文字版面配置外掛。
該位置為空時，graphviz 會退回其內建的
`estimate_textspan_size`。TypeScript 移植版的 `EstimateTextMeasurer`
（`src/common/textmeasure.ts`）是同一常式的忠實移植，並且是 Node 的預設值，
由 `createMeasurer()`（`src/common/textmeasure-factory.ts`）解析。
**因此每一次對齊度比對的兩側，都以相同的估算器量測文字**——真實的
FreeType／pango 字形前進寬度從未進入比對。這就是為什麼此處的判定迴歸
指向的是版面配置程式碼，而非字型，也是為什麼修正估算器本身的錯誤
（UTF-8 位元組計數、垂直度量對字型的感知）能直接解決此類別的大部分，
而不只是縮小字型度量的差距。

**可注入的 `TextMeasurer` 替換點。** 這種化解之所以可行，
是因為文字量測是一個刻意設計的替換點，而不是寫死在任一引擎之中。
`TextMeasurer` 是一個只有單一方法的介面（`measure(text, font, size,
flags) → {w, h, …}`），以相依性注入的方式傳入每一個標籤尺寸計算的呼叫點——
`polyInit`、`recordInit`、`initEdgeLabels` 與 `buildNodeLabel` 都以參數接收量測器；
沒有任何東西透過全域變數量測文字。在測試／CI 中，可透過 `setTextMeasurer(...)`
或 `GV_TEXT_MEASURER=estimate` 固定它。
這個替換點也讓殘留差異可以被*證明*純屬量測所致：把 C 實際量到的精確寬度
（從參照程式擷取）餵給移植版，再檢查版面配置是否因此精確重現 C。
該實驗最初就是 `proc3d` 的 A2 判定所依據（見下方的歷史附錄）——這項技術仍然有效。
它的反向用法則讓此類別退場：因為兩側的量測都已被證明被化解，
`NaN` 的邊殘留不可能是字型度量效應，這迫使我們重新診斷，
並找出了上述兩個繞線缺陷。

::: details 歷史分析（2026-06-30 起已被取代）— 保留作為紀錄
以下內容描述此類別較早的狀態，當時 `EstimateTextMeasurer` 切換、
感知字型的垂直度量，以及非 ASCII UTF-8 位元組修正，尚未解決其中大部分。
它已不再描述目前的行為——保留僅為了不遺失導出現狀的推理過程。特別是：
(1) 下方量測表中的「原生 C」寬度數字是來自真實字型轉譯路徑的 **FreeType** 數值；
對齊度調查從未執行該路徑——兩側都執行 `estimate_textspan_size`（見上文）——
因此該表並不反映目前對齊度的量測方式；(2) 下方的疊圖與黃金／我方轉譯圖，
描繪的是一個**非語料庫**的 `proc3d`（`graphs/directed/proc3d.gv`，約 2620 pt），
它並不屬於對齊度調查；語料庫中的 `proc3d` 各變體現已一致、零差異，
所以沒有可展示的疊圖；(3) 下方關於 `NaN`／`ratio=compress` 節點 x 的敘述已被取代
——目前的量測顯示全部 76 個節點點位都完全相符，因此其所描述的
寬度誤差 → 節點偏移的因果鏈，對 `NaN` 已不再成立。

**`ratio=compress` 下的 `NaN`（歷史）。** `NaN.gv` 家族
（`orientation=landscape; ratio=compress; size="16,10"`）是一個 A2 案例，
當時的判定結果落在 *diverged* 而不是 *structural-match*。compress 的
x 網路單純形路徑是忠實的——每一項約束輸入都與 C 相符（寬度約束值、
`containNodes` 的 minlen、輔助邊數 471／wt 1612、`lrBalance`，以及層內順序全部相同），
*唯獨* 9 個節點的半寬例外，量測器回報的寬度比 C 寬 0.5–1.03 pt。
`ratio=compress` 的權重 1000 打包方式，使通常有餘裕的由左到右間隔約束變成**緊繃**，
於是這個在沒有 compress 時看不見的次像素寬度誤差，浮現為 −3..−5 pt 的內部 x 位移。
該位移讓 `Target<->TThread` 的直線樣條超出節點方框邊界 0.55 pt，
路由器因此把它彎成多出一段貝茲曲線（7 個點，而 C 是 4 個）——一個*結構性*差異，
因而是 *diverged*。把這 9 個寬度強制設為 C 的值就能精確重現 C
（節點 x 偏差 53/76→0/76；樣條 7→4 個點），
證實**對於那項先前的差異**，殘留 100% 是上游的字型度量，而不是 compress 或樣條程式碼。
完整證據（附有黃金與我方並排的視覺比較，以及 4 對 7 個點的樣條差異疊圖）：
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html`
（文字說明：`…/nan-compress-xcoord.md`）。

**字型度量量測範例（歷史——FreeType 與估算）。**
原生 Graphviz 在搭配真實文字版面配置外掛執行時（而非對齊度調查所用的無頭參照程式），
以 FreeType／libgd 的字形前進寬度量測文字。移植版的 `EstimateTextMeasurer`
並不複製字形點陣化器。對大多數字串，兩者完全一致；對某些字串，
則相差零點幾個點。實測範例——Times-Roman 14 pt，字串
`"/home/ek/work/src/lefty/lefty.c"`（31 個字元）：

| | 寬度 |
|---|---|
| 原生 C（FreeType） | 176.00 pt |
| @knowvah/dot-engine（估算） | 176.75 pt |
| 差異 | **+0.75 pt (+0.43%)** |

同一節點的另一行標籤 `"93736-32246"`，量測結果**完全相同**
（兩者皆為 96.00 pt）——誤差取決於字串，並且逐字形累積，
而不是一個均勻的縮放係數。這項 FreeType 與估算之間的差距確實存在，但
**不是**對齊度調查所量測的對象（兩側都執行 `estimate`）；
只有在把 @knowvah/dot-engine 的輸出與本調查之外、使用真實字型的 C 轉譯結果比較時，
它才會有影響。

**對先前 `proc3d` 差異的下游影響（歷史）。** 標籤寬度會影響節點尺寸，
節點尺寸又會影響版面配置：

1. 較寬的標籤 → 節點方框稍寬（對*橢圓*節點，寬度還會再乘以 √2，
   因此 +0.75 pt 的文字 → +0.53 pt 的半寬）。
2. 節點半寬決定 x 座標網路單純形的由左到右間隔約束；這些約束會經過 `ROUND()`
   取整為整數，所以次像素的寬度變化就可能把約束從 *N* 推到 *N+1*。
3. 網路單純形接著選出另一組——但同樣最佳的——整數 x 指派，
   使某些節點的 x 位置偏移 1–2 個單位。

對於非語料庫的 `proc3d.gv`（`graphs/directed/proc3d.gv`，約 2620 pt，
不是對齊度調查的成員），這造成 x 範圍上 **≤ 3.55 pt** 的差異
（**0.13%**），疊圖如下——**綠色 = 原生 C `dot`（黃金），紅色 =
@knowvah/dot-engine（我方）**：

![proc3d 黃金與我方疊圖：綠色 = C，紅色 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

放大後，邊緣的差異幾乎全部出現在長的檔案路徑橢圓標籤上：

![proc3d 疊圖，放大至寬路徑標籤橢圓：綠色 = C，紅色 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| 黃金 — 原生 `dot` | 我方 — @knowvah/dot-engine |
|---|---|
| ![由 C Graphviz 轉譯的 proc3d](/img/proc3d-golden.svg) | ![由 @knowvah/dot-engine 轉譯的 proc3d](/img/proc3d-ours.svg) |

獨立的撰寫說明（根本原因、各項度量數字、重現指令）
在它自己的頁面：
[**proc3d——典型的 A2 字型度量差異（歷史）**](/zh-tw/divergences-proc3d-a2)。
該頁面描述的是一個非語料庫輸入上已解決的差異；目前語料庫中的
`proc3d` 各變體皆已一致。

**當時為何接受。** 要與 FreeType 在每種字型與每個字串上的逐字形前進寬度達成位元組相符，
就必須複製它的度量表、hinting 與捨入——龐大、脆弱，而且仍不保證精確。
文字量測器是共用的基礎元件：語料庫中的每個標籤都會流經它，
所以針對某一個字串的修正，會為了低於可察覺程度的回報而冒著讓其他字串迴歸的風險。
:::

### A3. 樣條繞線中的 `hypot` 平手判定（`dot`） {#a3-hypot-tie-break-in-spline-routing-dot}

**受影響：** 邊繞線通道**幾何上對稱**的 `dot` 圖——通常是短而對稱的同層邊弧線。
觀察到的範例：`2368`，維持在 *structural-match*（**一條**邊 `376->76` 上 maxΔ ≈ 10.2 pt）。
同一個平手判定，也會出現在進入高扇入樞紐的**長**（跨多層級）邊上，
只要通道恰好鏡像對稱：`graphs-b100`／`graphs-b104`（來源相同）在
`Node23730->Node23729` 的單一結點上相差 maxΔ 20（恰好一個層級列）——
每個節點位置以及所有上游的方框／多邊形／拉緊路徑結構都與 C 位元組相同；
只有 `findMaxDev` 在「哪個鏡像對稱的內部點成為貝茲結點」上約 1 ULP 的選擇不同。
短同層邊的形式也出現在 `241_1`（structural-match，maxΔ ≈ 2.4 pt）——
它是以參照程式固定的 `241_0` 的相異同類項，而 C 的雜訊讓 `241_0` 改為保留先到者。
同一個平手判定，在 `2413_1`（structural-match，maxΔ 67.65）與
`2413_2`（一旦 T11 swapBezier-reverse 修正落地，maxΔ ≤99.55——在那之前，
該檔案回報的 maxΔ 1922.26 主要來自一個無關、另行追蹤的缺陷）造成帶標籤 2-環
回邊的狹縫通道分割，並在 `graphs-decorate` 造成單一叢集內帶標籤邊
（maxΔ 43.54）；在每個案例中，兩個候選分割角點在位置相依的 Apple `hypot` 雜訊選出勝者之前，
彼此都平手到 5.7e-13（2413 家族）／3e-14（decorate）之內。`2371`
（structural-match，maxΔ 16.8）在兩條無關的邊
（`g[9263]` `r6837mid--r9687mid`、`g[23859]` `r38mid--r8699mid`）上呈現相同的特徵：
移植版在兩者上都輸出與參照程式控制點序列完全鏡像的結果，
結點 y 以相同的 Δ16.8 翻轉（上／下分割比例互換）。
其來源的可信度標示為 **MEDIUM**，而不像其他成員那樣是 CONFIRMED：
`2371` 打包了約 199 個元件，使 pathplan 區域座標與頁面座標脫鉤，
因此在三次插樁嘗試中，都無法將該平手即時對應到 `route.ts:209`；
不能完全排除直線模式分段，或裁剪後 `recover_slack` 才是來源。
完整診斷：`plans/residual-cleanup/analysis/2371-mirror.md`。
大多數被繞線的邊都不受影響。

::: details 圖定義（`2368.dot`）
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

**特徵描述。** 樣條擬合器（`Proutespline` → `findMaxDev`，
`src/pathplan/route.ts`）會在偏差最大的內部路徑點處，分割擬合出的貝茲曲線。
當通道對稱時，兩個候選分割點是**精確的數學平手**，勝負便取決於
絕對座標貝茲求值中約 1e-14 的浮點數抵銷雜訊，其**符號取決於絕對位置**。

C 的偏差距離是 libm 的 `hypot`，而產生參照輸出的 macOS Apple `hypot` 是專有實作，
與**任何**可攜的 `hypot` 都不是位元相符（針對 graphviz 座標範圍與之比較所得的位元
相同率：V8 `Math.hypot` ≈ 63%、正確捨入／Arm 風格的 `hypot`
≈ 84%、fdlibm `hypot` ≈ 90%、`sqrt(dx²+dy²)` ≈ 94%）。由於這種 ULP 雜訊，
**C 本身並不一致**：它會把兩段*平移全等*的弧線分割向**相反**的角點。
在 `2368` 內，`376->76` 弧線是幾何上完全相同的 `256->436` 弧線的鏡像：

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

整體差異的疊圖（`376->76`／`to1` 弧線放大 12 倍）——**綠色 = C
Graphviz，紅色 = @knowvah/dot-engine**。兩者是同樣位於相同節點邊界之間的淺向下弧；
它們在弧腹（貝茲中間控制點）處相差約 1–2 pt，那裡 C 的平手判定偏向了相反的角點：

![2368 376->76 弧線：綠色 = C，紅色 = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

其餘一切都在容許誤差內相符——相同的外框（608×148）、節點位置、
標籤、箭頭，以及所有其他邊。完整的轉譯圖在視覺上無法區分：

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![由 C Graphviz 轉譯的 2368](/img/2368-c.png) | ![由 @knowvah/dot-engine 轉譯的 2368](/img/2368-port.png) |

移植版使用**平移等變**的平手判定（真正的平手一律解析為第一個索引），
因此不論位置如何，它都以相同方式繪製*每一條*這類弧線——它是自我一致的，
並在 C 的雜訊同樣保留先到者的弧線上與 C 相符（例如 `256->436`，以及 `241_0 5:ne->8:nw`），
只在 C 的雜訊翻向另一邊之處出現差異（`376->76`）。端點、箭頭目標、其他邊、
所有節點、標籤與外框，都在容許誤差內相符；只有那一條弧線的內部控制點會移動
（弧腹處約 1–2 pt）。

**為何接受。** Apple 的 `hypot` 在不同 JS 引擎與 CPU 之間，
並不比 **A1** 的 FMA／`pow` 更可重現——這是同一種可攜性限制，只是出現在 `dot` 的樣條路由器中。
要比對 C 的*位置相依*選擇，就得採用 C 嚴格的平手判定，而它位於每一條被繞線的邊都會流經的
**共用基礎元件**中：這麼做是用 `376->76` 的相符，去換 C 落在另一邊的弧線上*新的*不符
（它會讓 `241_0` 與一個 `cnt=3` 的同層邊參照案例發生迴歸），淨效果持平，
還會犧牲移植版的平移等變性。所以我們保留一致（等變）的路由器。
這是一項有界、低於可察覺程度的 `dot` 差異——不是未解決的錯誤。完整調查：
`.agent-notes/2368-residual-flat-label-ranksep.md`。

### A4. 參照程式處於已知損壞狀態（init_rank／pathplan 家族） {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**受影響：** `2796`（structural-match，maxΔ 49）、`2471`（structural-match，
maxΔ ~9063）、`1435`（structural-match，maxΔ 503）、`1581`（diverged，maxΔ 465）。
家族成員 `1939` 與 `2825` 為**一致**，不帶任何條目；`2470`
與 `graphs-structs` 於 2026-07-11 加入它們的行列（兩者在 ortho 相鄰溢出／chancmpid、
fmadd `polylineMidpoint`，以及 half-even 平手捨入的修正落地後，都變成一致——
移植版現在能精確重現參照程式的復原輸出，包括相同的遺失邊）；它們的
接受條目已退場。

`1581` 與 `2825` 是當機復原案例（fix-element-count-bucket
任務）：fuzzer／退化輸入，上游測試**只**斷言 dot 不會當機
（`test_1581`：無 ASan 違規；`test_2825`：當 `rebuild_vlists` 回傳 -1 時不當機）。
C 遇到內部的 `Error:`（`install_in_rank`／`rebuild_vlists: lead is null`），
其復原機制會丟棄版面配置內容；移植版做出**完全相同的 rankset 刪除決策**
（警告對等已驗證：`mark_clusters` 的「already in a rankset」警告中出現相同的
節點／圖名稱，cluster.c:317-320）。

`2825` 現已完全結案。fix-2825-rebuild-vlists 任務（接續 1581 之後）
先在一個層面上縮小了差距：移植版到達 C *完全相同*的內部錯誤狀態
——stderr 逐位元組相同，包括訊息順序
（`Error: rebuild_vlists: lead is null for rank 1`，接著是沒有前綴的
`agerr(AGPREV, ...)` 續行 `concentrate=true may not work
correctly.`）——且 `dotLayoutPipeline` 正確傳遞
`dot_position` 的失敗，以略過 `dot_splines`／`dotneato_postprocess`，
與 C 的 `dotLayout` 一致（`dot_position` 之後的 `if (r != 0) return r;`，
dotinit.c:322-325）。後續（第 2 部分）接著補上了剩餘的轉譯層差距：
C 的 `emit_node` 以 `node_in_box(n,
job->clip)` 把關每個節點（emit.c:1806-1809），而在這條中止路徑上，
`job->clip` 是退化的，因為 `GD_bb` 從未被 `set_aspect`（位於被略過的
`dot_position` 尾端）設定——所以 C *不輸出任何*節點，只輸出（同樣退化的）
叢集外框。移植版移植了同一個 `node_in_box` 閘門
（`src/gvc/device.ts:renderNode`，以 `job.bb`／`job.pad` 作為
`job->clip` 的單頁等價物），並且在 `g.info.bb` 未設定時，
不再依據即時節點位置重新計算一個看似合理的外框
（`src/gvc/device.ts:render`，`job.bb = g.info.bb` 原樣沿用，對應
`init_gvc` 的 `gvc->bb = GD_bb(g)`，emit.c:3272）——每個版面配置引擎
在每條非中止路徑上、於 `render()` 執行之前，都已自行設定 `g.info.bb`，
因此這對健康的圖是位元組相同的，只會改變這條中止路徑上的輸出。
`2825` 現在是 `conformant`（4 個元素的輸出，
與參照程式位元組相同）。兩個部分完整的機制追蹤請見
`.agent-notes/2825-rebuild-vlists-abort.md`。`1581` 根本不會到達那個不一致的狀態
（是*另一個*上游叢集視窗錯誤，而非 `rebuild_vlists`），所以它會完整排出它倖存的圖
——該差距仍然開放。`1581` 的參照輸出是沒有上游定義語意的復原殘骸。證據：
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md)。
在這些輸入上，依 graphviz 自己的說法，損壞的都是 **C 參照程式**：`2471`、`1939` 與 `1435` 在上游是
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
（議題
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471)、
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939)、
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435)，參見
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)）；唯一的修正嘗試，
[草稿 MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849)，
仍是未合併的草稿（最後編輯於 2026-03-20）。`graphs-structs` 是
古老的 record 繞線遺失類別（#102/#242/#274/#1323），穩定版
graphviz 15.0.0 能正確轉譯——這是開發版建置參照程式的迴歸。

**C 做了什麼。** 在 `init_rank` 成員（`2796`、`2471`、`1939`）上，
原生 dot 的 x 座標輔助圖會經由叢集牆約束邊閉合出一個有向環；其
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
無法掃描每個節點，會印出 `Error: trouble in init_rank`，而版面配置從該復原狀態繼續進行
——在 `2471`／`2796` 上，最終得到 `Pshortestpath` 三角剖分殘骸與遺失的邊。在 `1435` 與
`graphs-structs` 上，損壞的階段是 pathplan 本身（耳切三角剖分走進死路；
一條 record 連接埠邊遺失）。

**先驗證輸入，再使其忠實（這是承重的部分）。**
`verify-oracle-bug-family` 任務
（[簡報](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md)）
逐行傾印了兩側餵給網路單純形的約束圖，涵蓋家族中的每個成員——並發現移植版先前在這個家族上
「乾淨」的行為，來自**四個真正的移植缺陷**，全部已修正：

1. `flatEdges` 略過了 C 的
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   呼叫，導致在同層邊標籤虛擬節點插入之後，叢集層級視窗仍是過期的
   （光是這點就讓移植版在 `2471` 上遺失 **9** 條邊，而 C 遺失 6 條）。
2. 同 `group` 邊懲罰在自環上觸發，而不是在端點屬於同一個非空群組時觸發
   （[`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)）。
3. `CL_CROSS` 使用了 C 的 `_WIN32` 值 100；參照程式平台使用 1000
   （[`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)）。
4. 三角剖分死路讓 `Pshortestpath` 中止，而不是 C 的
   警告後繼續 + 直線後備
   （[`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)）。

修正之後，該家族的 NS 約束傾印與 C **逐行相同**
（`2471` 上 253 次 rank2 呼叫；`1939`／`1435`／`graphs-structs` 上所有呼叫），
而移植版會沿著 C 走過已知損壞的復原過程：相同的遺失邊
（2796 上的 `3->16`；2471 上相同的 6 條）、相同的元素樹。
`1939` 變成完全一致。其餘的數值差異（以及 1435 不同的 pathplan 殘骸）屬於復原狀態
*之中*的行為，專案政策刻意不去追逐。

**`2723`（segfault；已固定，不追逐）。** 原生 `dot` 在
`tests/2723.dot`（無向、`rank=same` 群組、帶標籤的邊）上發生 segfault（結束碼 139），因此 C
沒有可比對的輸出。上游
[議題 #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) 仍開放，
且 `tests/test_regression.py:test_2723` 為 `xfail`。移植版擲出
`InternalError`（`INTERNAL_ERROR`，附帶來自
`src/layout/dot/flat.ts:flatLabelYpos` 的 `TypeError` 成因，其中 `rank[r-1]` 為 undefined）。
在沒有正確參照程式的情況下，誠實的失敗保持原狀，移植版不予更動；
`src/layout/dot/flat-2723.test.ts` 將它固定下來。若上游修正了該議題，請更新該測試。

**政策說明。** 先前 A4 的立場（「移植版符合該議題的期望；不要複製」）
是基於一個信念：移植版的無環輔助圖來自某個無害的局部變體。事實並非如此——它來自
缺陷 (1)，而該缺陷明確地讓 `2471` 走錯了路。對 C
原始碼的忠實獲勝：移植版現在從驗證為相同的輸入，重現 C 已知損壞的結果，
而這裡的每個條目都應該在
**上游修正對應議題時重新量測**（參照輸出會改變；預期這些 id 會在該次升級時
亮起迴歸警示——這是設計使然，不是腐化）。

**證據。** 逐 id 的比較頁面（並排轉譯圖 + 證據紀錄）：
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md)、
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md)、
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md)、
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md)、
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
（修正前的基準保留於
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)）。
診斷產物：`.agent-notes/2471-stale-cluster-windows-missing-reset.md`、
`.agent-notes/1939-group-penalty-clcross-misports.md`。

### A5. 無效的輸入位元組（編碼表示） {#a5-invalid-input-bytes-encoding-representation}

**受影響：** `1367`（diverged，maxΔ 0——恰好一項結構差異）。

**差異之處。** 輸入檔案在某個節點名稱內含有一個裸露的 UTF-8 尾位元組（`0x80`）。
C 將 0x80–0xBF 的裸露尾位元組視為「代表它們自身的有效字元」
（`lib/common/utils.c:1200-1207`，無警告），而節點名稱的 `<title>` 文字完全繞過字元集轉換
（`agnameof` 的位元組直接流向 `gvputs_xml`）。因此參照程式輸出的 SVG
含有原始位元組，且儘管宣告了編碼，它**並非有效的 UTF-8**。移植版以 latin1 後備
解碼無效的 UTF-8 輸入（`0x80 → U+0080`），並輸出格式正確的 UTF-8（`\xc2\x80`）。

**為何接受。** 移植版的 I/O 邊界是 JS 字串（瀏覽器函式庫）。
原始的無效位元組無法經由 `renderSvg` 回傳的字串往返；
與 C 逐位元組相符，意味著要為每位使用者破壞輸出編碼。
latin1 後備反映了 C 自己「視為 Latin-1」的復原語意
（`utils.c:1249`）。這是程式碼之下——表示層——的限制，
而不是我們拒絕移植的可攜行為。
1367 中的其他一切都是一致的：元素數量（23 個 polyline／
103 個 text／44 個 polygon／24 個 path），且所有座標在 decorate（T6）修正後都相符。

**證據。**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
比較頁面（並排轉譯圖 + 證據紀錄）。

---

### A6. 退化輸入時的 `unsigned int` 畫布溢位 {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**受影響：** `1314`——一個由 fuzzer 衍生的輸入（`fontsize="991836031967s8"`），
其荒謬的字型大小使繪圖膨脹到約 2.75e11 pt。

**發生什麼事。** C 將 `job->width`／`job->height` 儲存為 **`unsigned int`**
（`gvcjob.h:327-328`）。巨大點數大小的 `ROUND(...)`（`emit.c:1249-1250`）
會溢位 32 位元並以 2³² 為模回繞，而 SVG 後端透過**有號**的 `%d`
輸出它（`gvrender_core_svg.c:258-259`）——所以 C 印出
`height="-425618343"`。移植版保留數學上一致（未回繞）的值。
其他所有值——節點橢圓的 `cx/cy/rx/ry`、根的 `translate`、
多邊形、文字的 `font-size`——都位元組相同；只有最上層 `<svg>` 的
width/height 不同。

**為何我們不去追逐它。** 重現 C 的 32 位元整數溢位不是值得移植的版面配置行為，
而且輸入本身是退化的。若上游修正了溢位（例如加寬該欄位或箝制大小），請重新檢視。

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. 退化的 NaN 版面配置（`sfdp`，病態的 `repulsiveforce`） {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**受影響：** `2556`——`repulsiveforce=100`（⇒ 斥力使用
`pow(dist, 101)`），這使彈簧電力求解器在**兩個引擎中都變成 NaN**。
原生參照程式本身輸出全是 `nan` 的節點／邊位置，以及退化的外框。

**發生什麼事。** 當每個座標都是 NaN 時，兩個實作以不同方式序列化這堆垃圾：
(1) 圖的 bb／背景多邊形——C 將 `NaN` 捨入為 `int`，在 arm64 上會得到 `INT_MIN` 量級的垃圾
（`bb="0,0,-4.295e+09,
-4.295e+09"`）；移植版保留 `0`。(2) 邊的繪製操作——原生的輸出階段
會抑制 NaN 樣條的 `_draw_`／`_hdraw_`（只輸出 `pos`），
而移植版則以 NaN 控制點輸出它們。節點的繪製相符（兩者都會抑制）。
兩側都不存在真正的版面配置。

**為何我們不去追逐它。** 移植版已經重現了與原生*相同*的 NaN 爆炸——
讓它做到這點的修正是真實的（見下）；剩下的只是兩邊各自如何序列化 NaN 垃圾。
在一個於兩個引擎中版面配置都退化的輸入上，重現 C 的 `(int)NaN` 未定義行為
及其 NaN 樣條繪製抑制，並不是有意義的版面配置忠實度。若上游箝制
`repulsiveforce` 或清理 NaN 位置，請重新檢視。

**使此情形得以到達的移植版修正（不是被追逐掉的——是真正的錯誤）。** 在這些修正之前，
移植版甚至無法到達退化狀態：(1) `armPow`
（`src/common/arm-pow.ts`）遇到任何非快速路徑的引數就擲出例外；它現在移植了 ARM
`pow.c` 完整的特殊情況分支，因此 `pow(NaN, y) = NaN`，與 libm 相同。(2)
`bezierClip`（`src/common/splines-geom.ts`）在 NaN 控制點上會無限迴圈，
因為它的收斂測試是 C 的 `while (ABS > .5)` 的單純否定
（對有限值等價，對 NaN 則不然）；它現在與 C 完全一致，並在 NaN 時終止。
兩者都忠於 C，且只影響 NaN 輸入。

---

### A7. `round()` 方框牆捨入邊界（`dot`） {#a7-round-box-wall-rounding-boundary-dot}

**受影響：** `graphs-honda-tokoro`，以及（2026-07-28 新增，屬於 905 項範圍內的新成員）
其 `graphs/directed/` 中的同類項目 `tree-graphs-directed-honda-tokoro`
（兩者皆為 structural-match，單一條邊 `n012->n011` 上 maxΔ ≈ 1 pt）。
該同類項目僅在 `samearrowhead` 屬性上不同，這不影響這對邊的繞線——
它的 `n012->n011` 幾何在移植版與參照程式兩側，都與已接受的 id 位元組相同，
因此下方的機制可以原封不動地套用。

**差異之處。** 對於兩條 `n012->n011` 平行邊共用的 `samehead` 連接埠，
`maximal_bbox` 的頭端通道方框牆在 C 中落在內部
x=90，而在移植版中是 x=89。共用連接埠的建構（`buildSharedPort`）與
平行邊分組都與 C 位元組一致；這 1 px 的差距純粹是 `round()`
捨入邊界的假象——約 1e-14 的上游浮點雜訊，
把恰好位於 `.5` 邊界上的值推向相鄰的整數。
移植版的 `maximal_bbox` 公式本來就與 C 的完全一致。

**為何我們不去追逐它。** `round()` 是語料庫中每條被繞線的邊都會流經的基礎元件；
為了符合這一個案例而微調它的邊界行為，是為了 2 條邊上的 1 px，而冒整個語料庫迴歸的風險——
與 `bbox-class-control-hull-vs-curve` 中所記載的控制凸包捨入
屬於同一種共用基礎元件的限制。完整診斷：
`.agent-notes/honda-samehead-shared-port.md`。

---

### A8. `fp-contract`／FMA 捨入與嚴格 IEEE 的差異（`dot`） {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**類別。** clang arm64 以 `-ffp-contract=on` 編譯參照程式二進位檔，
將選定的乘加序列融合成單一 FMA 指令；
移植版執行於 V8，後者執行嚴格的 IEEE-754 捨入，且無法發出
`fma`。在位元相同的輸入上，兩者會在編譯器選擇收縮的任何運算式上相差 1-2 ULP。
移植版這一側永遠是嚴格 IEEE-754 的結果；參照程式這一側永遠是 FMA 收縮後的
結果。這是低於 C
原始碼語意的編譯器／執行環境可攜性限制，而不是移植版中的邏輯缺陷——
除非在軟體中模擬 clang 特定的收縮選擇，否則無法消除。已知有兩個案例，
位於兩個不同的位置，具有兩種不同的放大機制：

- **2646**——ULP 出現在 `Proutespline` 的 `points2coeff`／`solve3`
  三次方程求解內，直接翻轉樣條擬合器的根數。
- **2620**——ULP 出現在 `poly_init` 的多邊形頂點範圍迴圈
  （節點尺寸計算）中，並被下游 `ortho` 忠實的逐次鬆弛
  整數截斷，放大為等成本迷宮通道的平手翻轉。

**受影響：** `2646`（structural-match，在 21,216 條邊中的 3 條上 maxΔ 42.09：
`edge2575` `g[4639]`、`edge3905` `g[7777]`、`edge15467` `g[30201]`——全都是
record 連接埠 `:c->:nb_part` smode 長邊繞線）。**A3** 的同類：兩者
都是 `Proutespline` 內無法消除的浮點數可攜性平手，
但機制不同——是編譯器的 `fp-contract`
假象，而不是 libm 的 `hypot`。

**差異之處。** 在這三條邊上，只有最後一次 `routesplines` 呼叫
（朝向頭端連接埠的直線段）出現差異。它的端點位元精確地落在
障礙多邊形的底牆上，且其切線與該牆平行
（`evs[1]=(1,-1.22e-16)`），所以每個 `splinefits` 候選在 `t=1` 處都與障礙相切——
這是交點三次方程的近重根。
`points2coeff` 透過災難性抵銷計算該三次方程（約 ~7446 的項
塌縮為 ~0.099）。參照程式（clang/arm64，
`-ffp-contract=on`）將 `v3 + 3*v1 - (v0 + 3*v2)` 收縮為融合
乘加，而 V8 執行嚴格的 IEEE 捨入——兩者在**位元相同的輸入**上相差
約 9.1e-13，而這個雜訊翻轉了
`solve3` 判別式的符號：C 找到 1 個根（866.7，在線段內）；移植版
找到 3 個根，並有一個虛假的搭檔根位於 `t=0.9999975 < 1-EPSILON2`。
該虛假的根觸發了額外一次 `a` 減半迭代，使
最後一段的切線大小翻轉為 2 倍（在這三條邊上方向不一定相同），
於是裁剪後產生 maxΔ 42.09（26 項 SVG 差異）。

**為何接受（無法消除性已由對照實驗證明）。** 兩側的全部六次
`routesplines` 呼叫都被傾印出來——方框、多邊形、`PL`、起點、
終點與 `evs` 位元組相同，較早（非最後一次）呼叫的
輸出樣條也相同；唯一的差異在最後一次呼叫的 `solve3` 之內。一個
獨立的原版 C 測試工具隔離出單一變數：以
`-ffp-contract=off` 編譯，會在所有 3 條邊上位元精確地重現**移植版**；
預設（`on`）的收縮，則在所有 3 條邊上位元精確地重現**參照程式**。
因此移植版本來就與嚴格 IEEE-754 的 C 一致；
差異完全來自參照程式編譯器的 FMA 收縮選擇，位於
C 原始碼語意之下——沒有任何原始碼層級的不忠實需要修正。
針對性的修正（在 `points2coeff` 中以手工模擬收縮）已被嘗試並被推翻：
它能修正 3 條邊中的 2 條，但無法修正第三條，
後者的翻轉源自 `solve3` 自身內部的收縮。完整的修正
需要在整個樣條擬合器中進行軟體 FMA 模擬——這是熱迴圈的成本，
並帶來整個語料庫範圍的捨入影響，換來的只是次像素、3 條邊的回報。
完整診斷：`plans/residual-cleanup/analysis/2646-fp-contract.md`。

**受影響（歷史）：** `2620`（曾為 structural-match，maxΔ 585；24 條邊路徑與 22 個箭頭上共
423 項差異）。**於 2026-07-11 轉為一致**：
忠實的 `sgraph` 鄰接緩衝區溢出 + `chancmpid` 雙向
包含關係移植（見 `.agent-notes/ortho-maze-circo-rca.md`）消除了
該差異；接受條目已退場，本節保留作為
A8 類別的文件。

**差異之處。** 在輸入相同時，`ortho`（`splines=ortho`）管線與 C 位元組一致
——透過將 C 精確的迷宮輸入（座標、`xsize`／`ysize`）注入移植版的 ortho 階段來證明：
378/378 條被繞線的線段都位元組相同地輸出，因此 `src/ortho` 沒有任何錯誤。
真正的差異是迷宮*輸入*上的 1-2 ULP：節點的 `ysize`（以及透過
層內累積而影響 `ND_coord.y`）是在 C 的 `poly_init`
多邊形頂點範圍迴圈（`shapes.c`）中計算的，該迴圈在
`-ffp-contract=on` 之下，將 `R.x += sidelength*cosx` 融合成一個 FMA，其結果比移植版
嚴格 IEEE 的算術大約 1
ULP（兩邊實作的都是算術上完全相同的運算式）。`2620` 有 173 個小數寬度的
多邊形節點；全都顯示 C ≥ 移植版 1-2 ULP。該 ULP 被 `ortho` 的 Dijkstra 鬆弛
放大——而不是由它引入——後者忠實地對其執行中的距離逐步截斷
（`sgraph.c:165`，移植版對應為
`Math.trunc`），所用的權重源自原始單元格範圍
（`maze.c:257`）。受 ULP 偏移的幾何，使 4 條被繞線的邊（路徑及其箭頭）
翻轉了等成本通道的平手；其餘的差異是這 4 次翻轉
引發的 ±1 軌道重新編號連鎖效應。

**為何接受（無法消除性已由對照實驗證明）。** 一個
獨立的 C 測試工具僅改變 `-ffp-contract`，就在有差異的六邊形頂點上重現了兩側：
`-ffp-contract=on` → `310.29250168188713`
（與參照程式相符），`-ffp-contract=off` → `310.29250168188707`（與移植版相符），
有差異的運算被隔離到頂點 `i=3`
（`R.x=-0.50000000000000011` 融合 vs. `-0.5` 未融合）。第二個
輸入注入實驗（唯一變數：ortho 輸入值）證實了放大器：把 C 精確的
`coord`／`xsize`／`ysize` 餵給移植版自己的 `orthoEdges`，會讓全部 4 個通道差異降為 0——
ortho 程式碼沒有缺陷，它只是對輸入中 1-2 ULP 的偏移很敏感（C 自己的迷宮成本
繞線也一樣）。要比對，就意味著要模擬
clang 對 `poly_init` 中某一棵已編譯運算式樹的特定 FMA 收縮——
這是在追逐編譯產物，而不是移植原始碼語意。
完整診斷：`plans/ortho-2620-residual/analysis/2620-ortho-route.md`。

**已模擬的例外（不被接受）：`triang.c:ccw`。** 有一個收縮位置
*確實*被逐位元重現，而不是被接受：pathplan 的 `ccw`
編譯為 `fnmul`+`fmadd`（精確的第一個乘積 − 捨入後的第二個乘積），因此與線段端點
位元相等的查詢點，會被判為 ISCW/ISCCW 而不是
ISON。`shortest.c:pointintri` 隨後會拒絕多邊形頂點端點
（「destination point not in any triangle」），而 `makeMultiSpline`
對每個合併的 2-環都退回一般繞線——這是一項龐大、離散、
涵蓋整個語料庫的行為，移植版必須與之相符。與上述的 `solve3`／`poly_init`
位置（深藏於已編譯的運算式樹之中，修正已被推翻）不同，`ccw` 是
單一獨立的已編譯函式，語意明確，所以
`src/pathplan/triang.ts` 模擬了它：純 double 的快速路徑，附帶保守的誤差界限，
在純運算與融合運算的符號可證明一致時使用；
而在接近零的情況，則使用精確的 Dekker 乘積 + 二進位有理數 BigInt 路徑。

---

### A9. libm 三角函數 1 ULP → CDT 共圓平手翻轉（`circo`/`twopi` 多重樣條） {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**類別。** V8 的 `Math.sin`/`Math.cos` 與 Apple libm 的
`sin`/`cos` 並非位元相同（已證明：在 `2π·4.5/8` 處有 1 ULP 的差異，這是八個
橢圓障礙角度之一）。`makeObstacle` 的外切八邊形角點
繼承了該 ULP，因此三角形路由器的輸入座標與
參照程式的相差 ≤6e-14。對稱的版面配置（同一層級／環上大小相同的節點）使
路由器的四邊形在實數運算中**恰好共圓**，所以精確的
內切圓判定處於刀口上：輸入的 ULP 翻轉了它的符號，
受限 Delaunay 對角線隨之翻轉，而在參照程式中使 `Pshortestpath` 失敗的通道多邊形
（「destination point not in any triangle」→
退回一般樣條）在移植版中成功了（或反之）。最終的
樣條相差約 0.2–0.5pt。**A3**／**A8** 的同類：這是低於 C 原始碼語意的
無法消除的浮點數可攜性限制——要比對，就需要在 JS 中重現 Apple libm 精確的 `sin`/`cos` 捨入。

**受影響：** `241_0`（circo Δ≈0.2／twopi 畫布 Δ≈9，經由
邊 `5:ne->8:nw` 上的通道翻轉）；`2343`、`2239`、`share-b29`、`windows-b29`（twopi，
各有 1–2 項邊標籤位置差異——libm 的 1 ULP 出現在
`poly_init` 的單位頂點三角函數（`hypot`/`atan2`/`sin`），使某個節點
計算出的高度比參照程式恰好落點的最小尺寸箝制值高出一個 ULP，
並經由 xlabel R-tree 載入中的 `floor()` 串連，造成單一
標籤候選位置的翻轉。曾嘗試正確捨入 hypot 的修正，結果
被推翻：它修正了 `2343`，卻讓 `2168_3` 發生迴歸，後者的八邊形尺寸計算
流經同一個呼叫，而參照程式的值並非正確
捨入的結果——沒有任何決定性的 hypot 策略能在兩者上都與參照程式相符）。
`2168_1` 原本歸於此類，但在移植版模擬了參照程式經 fp-contract 的 `ccw`
（pathplan `triang.ts`）之後，就變成了
一致：它的通道失敗是由經 FMA 的
`pointintri` 頂點端點拒絕所決定，移植版現在已逐位元重現，
因此 CDT 對角線的 ULP 平手不再出現在那裡。

**為何接受（無法消除性已由對照實驗證明）。**
CDT 本身已被免責：移植版的 `mkSurface` 是 GTS
0.7.6 增量插入的忠實移植（`cdt.c`：1→3 分割 + 遞迴的
`swap_if_in_circle`、預先建立且不可交換的約束邊、
`remove_intersected_*` + `triangulate_polygon` 約束強制執行），
而一個連結**真實 GTS 函式庫**、並餵入移植版位元精確路由器輸入的
獨立 C 測試工具，會逐面重現移植版的三角剖分
（2168_1：22/22；241_0：185/185）。對兩組輸入的內切圓行列式進行精確有理數求值，
證實了符號翻轉（移植版輸入為 +1，參照程式輸入為 −1）。其餘的變數——1 ULP 的
三角函數差異——是透過直接比較 `Math.sin`/`sin` 的位元模式而被隔離出來的。

**引擎軌道接受（`accepted-divergences-engines.json`）。**
<a id="a9-engine-track-twopi-circo"></a> twopi／circo 的 **xdot 引擎
軌道**（`parity-twopi.json`／`parity-circo.json`，原生 `dot -K <engine>
-Txdot` 參照程式，`test/corpus/engine-walk.ts`，在
±0.01 下進行語意繪製操作比對——見 `test/golden/compare-xdot.ts`）獨立於上述引用的
dot 引擎 SVG 調查，揭露了同一個機制：twopi 的 `2239`（1 項
繪製操作差異——`_ldraw_` 邊標籤文字位置翻轉，同樣是
`poly_init` 單位頂點三角函數的 ULP，經由 `floor()` xlabel
R-tree 鏈串連；`2343`、`share-b29` 與 `windows-b29` 原本在此條目下被接受，
於 2026-07-11 透過 `polylineMidpoint` 中忠實的 fmadd 收縮而被*修正*——見下方的 b29 家族段落）以及 circo 的 `241_0`（41
項繪製操作差異，邊 `1->2` 的繞線貝茲曲線上 Δ≈0.2pt——同樣是
CDT 對角線通道翻轉；決策日誌，2026-07-10 的「CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed」條目）。透過
`test/corpus/accepted-divergences-engines.json` 在引擎軌道層級被接受，並由 `parity-report.ts` 合併進
`PARITY-twopi.md`／`PARITY-circo.md`——這與 `accepted.ts`
對 dot 軌道的 `PARITY-dot.md` 所做的合併相同。

**circo `2475_2`——共圓 closestNode 的 hypot 平手。** 在這張 10762 個節點的圖中，
某個 28 個節點的元件裡，circo 的 `getRotation`
（`circpos.c:73-92`）透過 `hypot` 挑選離版面配置原點最近的區塊節點，
以決定子區塊的旋轉。兩個共圓的節點
實際上等距；V8 正確捨入的 `Math.hypot` 與 Apple
libm 的 `hypot` 對該距離的捨入相差 2 ULP，這翻轉了嚴格的 `<`，
選到不同的節點，並使子區塊旋轉／反射約 20°（18 個節點
移動，最大 296.7pt；其他 10744 個節點位元相同，區塊樹、
圓周順序與每個 `centerAngle` 也是）。CR-hypot 策略
已在此類別被推翻（2026-07-10）。獨立重現：
`.agent-notes/circo-2475-590-repro.dot`；完整 RCA：
`.agent-notes/circo-b81-2475-rca.md`（2026-07-11 接受）。

**twopi `2470`——被 xlabel R-tree 放大的放射座標 ULP。**
2470 是一張 140 條邊的圖，其 HTML `<table>` 邊標籤聚集在
幾乎重合的放射錨點上。在 neato 家族中，邊標籤是由貪婪 xlabel 擺放器（`label/xlabels.c`）
作為外部標籤擺放，該擺放器透過 Hilbert 排序的 R-tree 選出重疊最少的候選角點。
移植版的樣條與節點座標在輸出精度上與參照程式相符
（即使在 1e-7 下，樣條／節點／bbox 差異也是零），但有一個節點的放射
`ND_coord.y` 相差約 2 ULP（Apple libm `sin`/`cos` 與 V8 `Math`）——遠低於
一致性標準，卻在 `objplpmks` 中恰好跨越 `floor(pos.y − sz.y/2)`
在 0 處的邊界，使該物件的 R-tree 矩形翻轉了
一個單位。Hilbert 順序／樹分組的改變，使 `RTreeSearch` 修剪
了不同的分支，於是約 140 個標籤各自吸附到相鄰的候選
角點（每項差異都是固定的（+寬度，−行高）一步）。擺放器、物件
順序、矩形捨入、`CombineRect`（忠實反映 C 的 min-min
怪癖）與 int32 Hilbert 鍵都已逐一驗證為忠實；
差異來自上游的放射三角函數 ULP，其無法消除的原因與
twopi `1855` 相同。2026-07-11 接受；完整 RCA：
`.agent-notes/twopi-2470-rca.md`（其中也記載了該 id
早上的「通過」是過期的參照程式二進位檔造成的假象，而不是移植版
迴歸）。

**osage `1855`——障礙頂點的 fp-contract 污損。** 有別於上方 twopi
`1855` 的放射鏡像條目：在 osage 下，節點中心與參照程式位元精確相符，
而 110 項繪製操作差異來自三條障礙繞線的邊，
被放置在節點列的鏡像側（X 位元精確，Y 鏡像）。來自
`circumscribed_polygon_corner_about_ellipse`（`neatosplines.c:301`）的
八邊形障礙頂點與 C 相差 3–4 ULP，因為 clang 的 `-ffp-contract=on` 把
`ellipse_tangent_slope`／`line_intersection` 中的 `a·b±c`
鏈融合為單次捨入的 FMA，而 V8 則逐運算捨入：C 融合後的捨入使一欄間隙角點 x 值
塌縮為單一位元相同的 double（恰好共線），
移植版則將它分裂為相差 1 ULP 的兩個值。這翻轉了可視性
`clear()` 的相切測試——間隙不再被阻擋——增加了約 20 條
可視性邊，而 Dijkstra 將上／下同倫的平手解析到
鏡像側。對照實驗：把 C 精確的障礙
座標注入其餘部分未動的移植版，會得到**零**條差異的
邊，完全免除了合法排列、可視性、Dijkstra 與樣條
鏈的責任；單獨注入 C 的 libm `cos`/`sin` 則沒有任何作用。2026-07-11
接受；完整 RCA：`.agent-notes/osage-spline-family-rca.md`。

**b29 家族（twopi）。** 四個 b29 變體共享同一個刀口：
`EqmtTyp` 邊標籤（`Node14732->Node14731`）處於 placeLabels
邊選擇的精確平手上，其結果取決於周圍物件 1 ULP 的 twopi 版面配置漂移。
在 `polylineMidpoint` 中採用忠實的 fmadd 收縮之後（states 家族修正，2026-07-11），移植版的標籤錨點
與參照程式位元相同，但平手在四個變體中的
兩個（`graphs-b29`、`linux.i386-b29`）上仍朝相反方向解析，而另外
兩個（`share-b29`、`windows-b29`）現已一致——`2343` 已接受的 A9
標籤差異也完全消失。界限：1 項繪製操作，標籤 y 相差 Δ12pt。除非消除上游的漂移，
否則無法消除。完整 RCA：
`.agent-notes/twopi-states-rca.md`。

同樣的 placeLabels 刀口也出現在 **osage** 軌道上（2026-07-11
接受，完整 RCA：`.agent-notes/osage-small-tail-rca.md`）：
`linux.i386-b29` 與 `share-b29`（各 2 項繪製操作差異——一個邊標籤的
x 錨點落在 878.28 而非 841.06，對稱地放置於
位元相同的樣條中點 859.67 兩側，即 ±標籤寬度的一半；這兩個
變體互為鏡像）以及 `1652`（2 項繪製操作差異——兩條邊各
圍繞相同的中點翻轉一個標籤錨點，一個在 x，一個在 y，
樣條與箭頭位元相同；參照程式完整轉譯，
因此這不是已知的原生逾時偶發問題）。在每個案例中，邊的幾何都是位元精確的，
只有標籤的邊選擇平手在 1 ULP 漂移的周圍環境下朝相反方向解析。

osage 軌道帶有 `polypoly` 三件組（`graphs-polypoly`、
`share-polypoly`、`windows-polypoly`；2026-07-11 接受，完整 RCA 見
`.agent-notes/patchwork-tail-rca.md`）：唯一有差異的運算是
在變形四邊形 180 度方向頂點上的純超越函數 `cos(π+θ)`——
V8 的 `Math.cos` 是正確捨入的，而 Apple libm 的 `cos` 帶有
±1 ULP 與引數相關的誤差（所以只有在 libm 下才會 `|cos(π+θ)| ≠
|cos(θ)|`）；那 1 ULP 的節點尺寸差異餵入 pack 的 `GRID`／`ceil`，推翻
周長的平手，而 qsort 把兩個元件放進彼此的打包
格子——這是整個節點的剛性對調，沒有形狀或繞線錯誤。沒有任何決定性的改寫
能重現未正確捨入的 libm
超越函數，這是教科書式的 A9 形態。

2026-07-28 在較大的同類項目
`tree-graphs-directed-polypoly`（`graphs/directed/polypoly.gv`，屬於
905 項範圍內的新成員；112 項繪製操作差異，僅限 osage）上證實了同一個機制。
有差異的運算是同一個節點 `9004` 的 `cos(π+θ)` 1 ULP 位置——C 與移植版的 `bb.x`
值與原始 RCA 逐位元組相符——但在這個 76 個節點的輸入上，
傳播是經由 osage 的 `arrayRects`：`acmpf` 依原始 `width+height` 總和對打包
格子排序，而 libm 偏高 1 ULP 的寬度使
`9004` 嚴格排在它旋轉的同類 `9000/9002/9006` 之前，
而 V8 正確捨入的值則留下精確的 4 方平手，讓不穩定的
qsort 以不同方式排序——不同的列優先格子、`9002`/`9006`
對調，以及一次欄寬 `fmax` 連鎖，使 8 個鄰居在 x 上移位。
把 C 的節點尺寸與移植版的節點尺寸分別餵給移植版自己的 `arrayRects`，
會重現掃描中那 10 個移動的節點，且 x 位移量位元組相符，
完成了因果鏈。

另有兩個引擎軌道案例在 2026-07-11 找出根本原因並被接受
（完整 RCA：`.agent-notes/circo-edge-tail-rca.md`）：twopi `241_0`（6 項繪製操作
差異——上方 circo 條目的同類：同一個 CDT 共圓
內切圓平手，被 libm `sin`/`cos` 的 1 ULP 翻轉，使移植版的
多重樣條通道以 14 點樣條成功，而原生版本
退回一般的 8 點繞線；點位差異 < 0.07pt）以及 circo
`windows-tree`（一條扇形邊上 10 項繪製操作差異——circo 的擺放三角函數
使 `node2.y` 比 `node8.y` 高出恰好一個 ULP，圍繞精確對稱的
值 18.0，而 `closestSide` 的動態頭端連接埠選擇在
該精確平手處翻轉 TOP/BOTTOM；節點位置與方框在其他方面
與參照程式位元相同）。

**sfdp 引擎軌道——邊浮點平手（`42`、`241_0`）。**
<a id="a9-sfdp-fp-ties"></a> sfdp 的 xdot 引擎軌道（`parity-sfdp.json`，
原生 `dot -Ksfdp -Txdot`，±0.5）在注入精確的原生繞線前位置之後，
揭露了 CDT 共圓內切圓平手（所以差異並非
迭代漂移——見 A1-drift 類別——而是離散的判定平手）：

- `42` 與 `241_0`——CDT 共圓內切圓平手（多重樣條通道）。
  注入位置後，殘留的是**段數翻轉**：`42`
  `opCount 5 vs 9`（邊 0->3）／`ptCount 32 vs 26`（3->7）；`241_0` `ptCount 14
  vs 8`（邊 3->2）——移植版的受限 Delaunay 對角線與
  參照程式不同，使多重樣條通道以 N 點樣條成功，而原生
  版本退回較短的一般路徑（或反之），與上方
  twopi／circo 的 `241_0` 條目完全相同。移植版已在內切圓／`ccw` 判定中模擬了 arm64
  的 `fmadd` 收縮（`src/pathplan/triang.ts`、
  `src/common/fma.ts`），並使用穩健的內切圓 Delaunay；殘留的是
  判定輸入中 V8 與 Apple libm 的 `sin`/`hypot` 相差 1 ULP，任何可攜
  程式碼都無法重現。

> **`2095` 由 A9 重新分類為 A1-drift（2026-07-22）。** 它先前被列在
> 這裡，作為「hypot 的同類」（名稱為空的
> 節點 `""->"4"` 的邊上有低於 0.7pt 的漂移）。該殘留是**測試工具的假象**：
> 歸因注入器的 `GVTS_POS` 正規表示式要求至少 1 個名稱字元，所以名為 `""` 的節點從未
> 被注入，並拖累了它的兩條相連邊。將注入器修正為可比對空名稱
> （`(.+)`→`(.*)`，`src/layout/neato/splines.ts`）後，sfdp `2095`
> 注入後殘留為 **0**——純粹是力導向漂移，由計算得出的 A1-drift
> 類別涵蓋，而不是繞線浮點平手。它的逐 id 接受已從
> `accepted-divergences-engines.json` 移除。（與下方 fdp `2095` 的發現相同。）

**新的對照實驗（2026-07-21）。** 一項原生與 V8 的 `hypot` 探測
（`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`）：編譯
系統的 C `hypot`，並與 Node 的 `Math.hypot` 在具代表性的
同層邊偏差輸入上比較，6 個中有 2 個出現 1 ULP 的差異（Δ 7.1e-15 與
5.7e-14）——這是翻轉細分次數的分割門檻刀口。
無法消除：沒有任何可攜的 hypot 能重現 Apple libm（同一邊界上
`arm-pow.ts` 的先例）。透過
`accepted-divergences-engines.json`（`sfdp.42`、`sfdp.241_0`）在引擎軌道層級被接受。

**fdp** 的 xdot 引擎軌道（`parity-fdp.json`，原生 `dot -Kfdp -Txdot`，
±0.5）在同一張圖 `241_0` 上揭露了相同的 CDT 共圓平手：
注入參照程式精確的繞線前位置後，殘留的是 11 項數值
`unfilled_bezier` 差異，侷限於一條邊（`0->1#0`，maxΔ 3.39pt）。由於
節點位置經注入後完全相同，差異位於下游的
pathplan 多重樣條通道——與 twopi／circo／sfdp `241_0` 相同的 libm 1 ULP 內切圓平手
（上方的精確有理數內切圓 185/185）。這些槓桿
都已套用（`src/pathplan/triang.ts` fmadd、`src/pathplan/route.ts:198`
`Math.hypot`）；該平手無法消除。透過 `accepted-divergences-engines.json`
`fdp.241_0` 被接受。相對地，fdp 的 `2095` 是 **A1-drift，而非 A9**：注入
那個名稱為空的單一節點（在歸因注入器修正為可比對
`""` 名稱的節點之後），其殘留塌縮為零——先前的「A9 尾巴」是
未被注入的空節點拖累了它相連的邊。sfdp `2095` 的接受是
同樣的盲點——使用修正後的注入器重新產生 sfdp 歸因（2026-07-22），
證實它同樣注入後為 0，其接受條目已移除（見上方
`2095 reclassified` 的說明）。

---

## 持續追蹤的長尾（`dot` 屬性與邊界案例） {#tracked-long-tail-dot-attribute-edge-case}

在**預設值**下，`dot` 引擎在黃金語料庫上以嚴格的決定性容許誤差與 C 二進位檔相符
（`conformant` 判定；見最上方的說明）。其餘的差異是**屬性與邊界案例的長尾**
——這向來是任何 Graphviz 移植中最困難的部分。與上述已接受的差異不同，這些*將會*被補上；
它們連同計數，即時追蹤於
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)：

| 類別 | 差異之處 |
|---|---|
| **path-structure** | 特定配置下的邊樣條繞線（例如某些同層邊與密集通道的案例）。 |
| **element-count** | 某項功能在特定圖中輸出的 SVG 元素比 C 多或少。 |
| **color-stroke** | 特定樣式屬性的描邊／填色輸出差異。 |
| **parser-gap** | 少數解析器尚未完全接受的 DOT 輸入。 |

如果您的圖只使用常見屬性與 `dot` 引擎，您幾乎可以確定是走在決定性容許誤差的相符路徑上。若版面配置看起來不對，請在 `PARITY-dot.md` 中查找
該輸入類別——它很可能是一個已追蹤的項目，並有以參照程式為基準的修正任務，
而不是未知的問題。

> **關於由標籤驅動案例的說明。** 文字量測類別（A2）已結案——
> 目前沒有任何 `dot` 圖在該類別下被接受。今天處於
> structural-match 的圖是已追蹤的缺口，而不是字型度量差異。

### `concentrate=true` 時相對邊的箭頭 {#concentrate-true-opposing-edge-arrowheads}

當 `concentrate=true` 將一對反向平行邊（`A->B; B->A`）合併為一條
保留下來的邊時，該邊必須在**兩端**都畫出箭頭。這現在已被
移植（`arrow_flags` 的 `conc_opp_flag` 分支；見
`src/common/splines-clip.ts:arrowFlags`），因此 `graphs-b135`、`167` 與 `2087`
已相符（缺少箭頭的 `element-count` 差異，以及其未裁剪樣條
`@d` 的副作用都已消失）。

有些 concentrate 圖**仍保有一個獨立、既有的殘留**，是箭頭
修正**並未**處理的——它是節點 **x 座標**位置
差異（x 網路單純形／羅盤連接埠），而不是箭頭缺陷：

- **`graphs-b15`、`graphs-b69`**——大型 record／叢集「電梯」圖。
  Concentrate 啟動並正確合併；殘留是約 1pt 的節點 x 差異，
  被放大為 `element-count`／樣條 `@d` 的差異。箭頭
  輸出本身現在是正確的（b69 取回了它缺少的箭頭多邊形）。x 座標根本原因請見
  `b69-concentrate-undermerge` 代理筆記。
- **`1453`**——仍因頂層的 `element-count` 原因而有差異，與
  conc_opp_flag 箭頭無關。
- **`2825`**——在這次箭頭修正時，因頂層的
  `element-count` 原因而有差異，與 conc_opp_flag 無關（那裡不會
  觸發相對邊對的合併）；此後已由 fix-2825-rebuild-vlists 任務結案，
  見上方 A4。

這些是已追蹤的 x 座標／結構性項目，**不是**箭頭錯誤。

### 2.0 保真度任務遺留的版面配置保真度缺口（neato、sfdp、fdp、twopi、circo） {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0 保真度任務使未移植的屬性值明確地失敗（見
[錯誤與例外](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)
中的 `UNSUPPORTED_FEATURE` 表）。
它留下了下列項目，記錄於 `plans/v2-fidelity/decision-journal.md`。

**明確失敗，未移植。** 在 neato、twopi、circo 與 sfdp 中，節點重疊時的 `overlap=voronoi` 仍會擲出
`UNSUPPORTED_FEATURE`：Voronoi 調整器本身（`vAdjust` 的演算法）尚未移植。
用來決定是否擲出的重疊測試則是 C 自己的（對 `poly.c` 節點多邊形的 `countOverlap`）。

**已知缺口，仍為靜默。** 移植版轉譯這些情況時不會報錯，
但與原生 Graphviz 不同。由 `v2-silent-gaps` 任務找出
（`plans/v2-silent-gaps/decision-journal.md`）；不是已接受的差異。

- **`getAdjustMode` 的「Unrecognized overlap value」警告不會被輸出。**
- **旋轉多邊形的頂點，在最後幾個位元上可能與原生不同
  （無法消除：宿主數學函式庫）。** `poly_init` 以
  `atan2`、`hypot`、`sin` 與 `cos` 決定每個頂點的方向。在位元相同的輸入下，macOS libm 與
  V8 傳回不同的最後幾個位元（例如 `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`：libm 為 `…21d1`，V8 為 `…21d2`；下一個頂點的 `hypot`：
  libm 為 `…fffd`，V8 為 `…fffe`），所以 `orientation=20` 的方框，其頂點 y 在移植版中為
  `-18`，原生則為 `-17.999999999999996`。原生 Graphviz 本身
  會隨平台的 libm 而變，而瀏覽器無法呼叫它。移植版自己的
  算術與 C 一致（`RADIANS` 順序已固定；1664 個抽樣頂點
  座標中有 776 個位元相同，其餘僅透過 libm 而有差異）。影響：
  剛好相切的 `polyOverlap` 判定可能翻轉；使用原生頂點時，每個
  判定都相符。
- **sfdp 在 macOS 上可能與原生不同（無法消除：宿主 libm 的 `pow`）。**
  以插樁的原生 sfdp 診斷：位置保持位元相同，
  直到某一個斥力項 `pow(dist, 1 - p)`（`spring_electrical.c`，
  `p = -1`，所以是 `pow(x, 2)`）從 macOS libm 傳回比 `x*x` 小 1 ulp 的值
  （`pow(1.4116727416983157, 2)`：libm 為 `1.9928199296540394`，正確捨入的結果為
  `…396`；在 16201 個抽樣 `v` 中，有 20 個的 macOS `pow(v, 2) != v*v`）。這改變了
  迭代的 `Fnorm` 的最後一位元；sfdp 的自適應冷卻將它放大
  為不同的（通常是鏡像的）版面配置。移植版的 `armPow` 是 ARM 的
  optimized-routines `pow`（glibc ≥ 2.28），也就是 Linux 版 Graphviz 所計算的；
  macOS 參照程式才是特例。已排除：種子（明確的 `start=` 值
  相符）、`pcp_rotate`（相同輸入得到相同輸出）、位置與
  吸引項（位元相同）。範例：在預設種子下的單一三角形 `a--b; a--c; b--c`。
- **fdp 可能因宿主 libm 的 `cos`/`sin` 而與原生不同。** fdp 遵循
  15.0.0 之後的 Graphviz（hypot 距離斥力、`Mlimit`），
  宿主 libm 的 `hypot` 已被逐位元重現（`src/common/libm-hypot.ts`，在 40 萬個樣本上 0
  不符）。252 個可用 fdp 轉譯的黃金輸入中，有 251 個
  與原生建置完全相符；其餘一個
  （`parallel-cluster-ldbxtried`）以
  `T_Wd * cos(alpha)` 擺放叢集連接埠節點，而 macOS libm 的 `cos(-2.3840764867756761)` 與
  V8 的 `Math.cos` 相差 1 ulp；fdp 的力迴圈將它放大到約 3 英寸。Apple 的
  `cos` 無法像 `hypot` 那樣，以簡短的模型重現。
- **移植版所定義的原生當機。** 原生 Graphviz 在 neato
  `mode=KK` 搭配 `model=mds` 與邊的 `len` 時結束碼為 139（`mds_model` 以從 1 起算的序號
  索引 `GD_dist`：堆積溢位），在 `model=circuit` 搭配
  不連通的圖時亦然。移植版在第一種情況下丟棄超出範圍的格子，
  在第二種情況下退回最短路徑；沒有原生輸出可
  比較。

---

## 刻意不移植（非目標） {#intentionally-not-ported-non-goals}

這些是刻意的範圍邊界，不是錯誤。本函式庫的目標是 **SVG**
（加上 `json`／`xdot`／`dot`／imagemap 這些中介文字格式）。

- **其他輸出格式。** 點陣圖（PNG/JPG/GIF/WebP/BMP）、PostScript/PDF/EPS，
  以及 GUI／互動式後端都不在範圍內。若需要點陣圖，請使用 SVG 輸出，並在
  下游轉換。
- **SVG 的 `page=` 分頁。** 原生 `dot` 同樣不會對 SVG 分頁（
  SVG 裝置不設定分頁旗標），所以 `page=` 在這條路徑上於兩個
  實作中都是空操作——在此記載，只是因為這是常見的
  困惑點。
- **`-Tplain` 文字輸出。** 延後（一種忠實的文字格式），並非排除。
- **`gvpr`**（圖處理腳本語言）——不在範圍內。
- **C++ 便利包裝層**（`cgraph++`、`gvc++`）——C API 優先
  移植；若有需要，慣用 TypeScript 風格的便利層將會是
  獨立的套件。
- **瀏覽器文字量測中的 `fontnames=svg|ps`。** 在瀏覽器中，
  canvas 量測器是以 PostScript 別名的
  `fontnames=native` 字型族清單建立字型（`Times-Roman` → `Times, serif`），也就是
  SVG 輸出器預設轉譯所用的字型。`TextMeasurer` 不攜帶圖的
  上下文，所以設定了 `fontnames=svg` 或 `fontnames=ps` 的圖，會
  依原生清單量測，而 SVG 卻寫出 svg/ps 的字型族名稱。CSS 未定義的
  別名字重（`book`、`demi`、`light`、`medium`、`roman`）
  與 C 一樣原樣輸出；瀏覽器會忽略它們並以一般
  字重轉譯，而量測器也以一般字重量測以求一致。Node 的輸出
  不受影響（它從不使用 canvas 量測器）。
- **僅限原生的機制**以瀏覽器安全的等價物取代：動態
  外掛載入（`dlopen`）以靜態的引擎／轉譯器註冊取代；
  檔案系統讀取（字型、圖片、設定）以呼叫端提供的
  回呼取代（例如 `setImageSizer`）。行為保持不變；機制不同。

---

## 回報差異 {#reporting-a-divergence}

如果您發現輸出與 C 不同，而它**不是**上述已接受的差異、
不在 `PARITY-dot.md` 中，也不是非目標，那就是值得回報的錯誤——C
原始碼就是規格，未列出的差異會被視為缺陷，而不是被
接受的行為。
