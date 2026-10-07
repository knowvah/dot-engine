---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 一致性：「相符」的意義 {#conformance-what-match-means}

@knowvah/dot-engine 以標準的 C 版 Graphviz 二進位檔作為參照程式（oracle）進行驗證。
當本專案說某張圖與 C 版**相符**——也就是名為 `conformant` 的對齊判定——指的是一項特定、
經機械式檢查的性質，**而不是**SVG 文字逐位元組完全相同。

> **定義。** 當兩份 SVG 都被解析為正規化的元素樹之後，若符合下列條件，
> 則移植版的轉譯結果與參照程式的轉譯結果**一致**（conformant）：
>
> 1. 每個**數值**（座標、路徑資料、`points`、`viewBox`、`transform` 參數）
>    與參照程式的差距都在固定的**容許誤差**之內，且
> 2. 每個**非數值**（標籤名稱、顏色、文字內容、屬性鍵、列舉型屬性值）
>    **完全相等**。
>
> 只要有任何數值超出容許誤差，或有任何非數值不同，該轉譯結果就**不**一致。

## 為什麼不是逐位元組比對？ {#why-not-literal-bytes}

SVG 會把浮點數座標序列化為十進位文字。兩份在數學上等價的轉譯結果，仍可能因為
IEEE-754 捨入、浮點運算順序，以及隨 CPU 與 JS 引擎而異的平台 `libm`／FMA 行為，
而在最後一位列印的數字上有所不同。因此，逐位元組的標準在本函式庫所針對的各種執行環境
（瀏覽器、Node、不同的 CPU）中不只是過於嚴格，而是**無法測試**。一致性把真正重要的性質——
檢視者所看到的幾何形狀與內容——限定在一個小到無法被察覺的範圍內。

## 確切的容許誤差 {#the-exact-tolerance}

容許誤差**依引擎類別**而定，定義於
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)：

| 類別 | 容許誤差（pt） | 引擎 |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`、`circo`、`twopi`、`osage`、`patchwork` |
| `iterative` | **±0.5** | `neato`、`fdp`、`sfdp` |

決定性引擎基本上能完全重現 C 版的整數／列印座標，因此 ±0.01 只是吸收十進位格式化的雜訊。
迭代式（力導向）引擎仰賴超越函數，其最後一位元的結果無法跨平台重現，所以採用較寬鬆的界限，
並額外檢查**結構**是否相等（元素樹相同）。

針對 **plain/plain-ext** 輸出面有一項但書：plain 以英寸為單位、以 5 位有效數字（`%.5g`）
列印座標，因此在量級 ≥ 100 時，列印量化單位（0.01）就等於 ±0.01 的容許誤差。在非常大的圖上，
一個低於 1 ULP 的版面配置差異，若恰好跨越第 5 位數的捨入邊界，就會被列印成完整的 0.01 級距而遭到標記，
即使底層幾何形狀在約 1e-11 pt 內完全相同（參見 circo 的 `2108` 接受案例，
日誌 2026-07-28）。在這個範圍內，以點（pt）為單位列印的 xdot／json 輸出面才是具權威性的幾何比對。

**語料庫對齊度調查**會以 `deterministic` 模式（±0.01）評估每一張圖，與引擎無關——參見
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
（`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`）。

## 閱讀程式碼 {#read-the-code}

上述定義不是紙上談兵——它正是比對程式碼所做的事。若要自行驗證：

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES`（±0.01／±0.5 的對照表），以及 `compareSvg`；後者會走訪兩棵正規化樹，
  逐一屬性套用規則 (1)（數值須在容許誤差內）與規則 (2)（非數值須完全相等）。
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — 說明原始 SVG 如何被解析為可比較的元素樹。
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`，負責給出下方的其中一種判定。`survey.ts` 只涵蓋 `dot` 的 SVG 軌道。
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — 各引擎的 **xdot** 調查（`npx tsx test/corpus/engine-walk.ts <engine>`），
  套用與上表相同的類別劃分
  （`neato`／`fdp`／`sfdp` 使用 `TOLERANCE = 0.5`，其餘每個引擎使用 `0.01`），
  並比較語意層級的繪製操作串流（`compareXdot`），而非 SVG。`circo`／`twopi`／`osage`／`patchwork`／`neato`／`fdp`／`sfdp`
  各軌道就是這樣量測的；`dot` 自己的 xdot 軌道則使用姊妹工具
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts)。

## 判定結果 {#the-verdicts}

調查會為每張圖指派恰好一種判定。各軌道的即時計數：
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
彙總每一條「引擎 × 輸出面」軌道（決定性與迭代式皆然）；
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
是 `dot` 的 SVG 儀表板，其他每個引擎在 `test/corpus/` 中也各有自己的
`PARITY-<engine>.md` 儀表板：

| 判定 | 意義 |
|---|---|
| **`conformant`** | 依上述定義與參照程式相符（數值在容許誤差內，非數值完全相等）。 |
| **`structural-match`** | 元素樹相同，但有一個或多個數值超出容許誤差。 |
| **`diverged`** | 元素樹不同（缺少或多出元素，或有非數值不一致）。 |
| **`errored` / `timeout`** | 移植版無法轉譯該輸入（`errored`；在各引擎軌道上為 `port-error`），或超出時間預算（`timeout`）。以失敗計分：算入通過率的分母，絕不算作通過。 |
| **`oracle-error`** | C 版參照程式無法轉譯該輸入，因此沒有可比較的參考。不在範圍內：從通過率的分母中排除。 |

每個儀表板上的**通過率**為 `conformant / (surveyed − oracle-error)`。

「Conformant」是標準；「structural-match」是有意義的進展（形狀正確，座標仍在漂移）；
「diverged」、「errored」與「timeout」則是真正的缺口。這些都不代表輸出逐位元組相同。

有些圖在特定引擎上**完全沒有判定**：請見下方的*引擎排除*。

### 引擎排除 {#engine-exclusions}

被排除的（圖，引擎）組合不會被走訪，因此既不算一致也不算差異——只是在該處不予量測。
這與已接受的差異不同：後者確實進行了比對，並以有文件記載的原因寬恕了該差異。

門檻刻意設得很高，因為未經檢視的圖是涵蓋範圍的漏洞，而不是已知的成本。
條目必須同時滿足三項條件：該引擎的演算法對該輸入確實無法發揮作用、略過它能省下實質的時間，
並且相同的行為已在成本更低的軌道上驗證。*速度慢*明確不足以構成理由——移植版與參照程式之間
比例不佳，正是真正的效能缺陷的樣子，以此為由排除只會掩蓋語料庫存在的目的。

每項排除都連同其機制列於
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions)；
登錄檔為 `test/corpus/engine-exclusions.json`。促成此規則的案例是
`2222`，它宣告了 28,303 個節點、沒有任何邊：由於沒有可建立關係的對象，
所有力導向與放射狀引擎都會委派給共用的元件打包器，它們自己的演算法一個都不會執行——
這點由它們的參照輸出逐位元組相同而得到證實。`dot` 走的是另一條路徑，並在六秒內以一致的結果涵蓋了它。
