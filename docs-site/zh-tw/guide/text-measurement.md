---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# 文字量測

dot 版面配置需要每個標籤的寬度與高度，才能決定節點大小並安排
邊的位置。@knowvah/dot-engine 透過單一可抽換的替換點 `TextMeasurer`
量測文字，並自動決定要使用哪一個——您也可以設定自己的。

## 約定 {#the-contract}

有兩個不同的目標，需要不同的量測器：

| 目標 | 量測器 | 確定性？ | 字距調整／文字塑形 |
|------|----------|----------------|-------------------|
| **可重現的版面配置**（各處輸出相同） | 內建的度量模型 | 是 | 否 |
| **貼近主機的版面配置**（與轉譯字型相符） | 該平台的 canvas | 否（取決於字型） | 是 |

原生 Graphviz 本身就是貼近主機的——其輸出取決於執行它的機器上
所安裝的字型。@knowvah/dot-engine 讓您自行選擇：預設為確定性，
需要時再選用貼近主機的方式。

## 自動解析 {#automatic-resolution}

當您沒有設定量測器時，@knowvah/dot-engine 會在每次轉譯時挑選一個：

1. 透過 `setTextMeasurer` 明確設定的量測器（若存在則優先採用）；
2. **瀏覽器**（`document` 可用）→ 頁面的 `<canvas>`——貼近主機，
   以瀏覽器轉譯 SVG 文字時所用的同一種字型量測；
3. **Node** → 內建的確定性度量模型。

這個函式庫**執行期零相依**，本身絕不會匯入字型函式庫或
`canvas`，因此瀏覽器套件包能保持精簡，而 Node 的預設方式也絕不會
讀取檔案系統。

## 在 Node 中進行貼近主機的量測 {#host-faithful-measurement-in-node}

若要讓 Node 的輸出中方框貼合特定字型（真實的字距調整與文字塑形），
請安裝選用的對等套件 `canvas`，並在啟動時接上一次：

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` 被宣告為**選用的對等相依套件**——除非您要求，否則不會安裝。
當 Node 在互動式終端機中退回使用內建模型時，@knowvah/dot-engine 只會顯示一次這項建議；
可用 `GV_FONT_QUIET=1` 將其靜音。

## 自訂量測器 {#custom-measurers}

`setTextMeasurer` 接受任何實作了 `TextMeasurer` 的物件：

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

內建的實作都已匯出以供重複使用：`CanvasTextMeasurer`（可包裝任何
2D 環境）、`EstimateTextMeasurer`（確定性、未經提示的參照實作，
與無頭 Graphviz 的 `estimate_textspan_size` 相符——**這是 Node 的
預設值**），以及 `LutTextMeasurer`（依字型家族建立、經過提示的查表，
可選用，能在不依賴原生 `canvas` 的情況下取得更貼近的尺寸）。

## 為什麼這樣劃分 {#why-this-split}

字距調整、連字與非 ASCII 字形的寬度，取決於實際字型的塑形
表——逐字元的寬度表無法表達這些，而且正確的數值
因字型而異（等寬字型會將 `<=` 呈現為兩格；比例字型
則會把 `VA` 的間距收得更近）。因此，可重現的版面配置採用固定的度量模型；
若要與真正的轉譯字型相符，就必須以該字型量測，
而這正是以 canvas 為後盾的量測器所做的事。
