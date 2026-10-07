---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: 純 TypeScript 的 Graphviz
  tagline: 輸入 DOT，輸出 SVG——不用 C。沒有原生 Graphviz 二進位檔，沒有 WASM。純 TypeScript，可在瀏覽器中執行。
  actions:
    - theme: brand
      text: 快速入門
      link: /zh-tw/guide/getting-started
    - theme: alt
      text: 開啟遊樂場
      link: /zh-tw/playground
    - theme: alt
      text: 在 GitHub 上檢視
      link: https://github.com/knowvah/dot-engine
features:
  - title: 忠實於 C 版 Graphviz
    details: 逐行移植自標準的 C 實作。在黃金語料庫上，dot 引擎與原生二進位檔的輸出相符，並維持嚴格的確定性容許誤差（座標為 ±0.01，非數值內容則須完全一致）。
  - title: 瀏覽器原生，執行期零相依
    details: 不用 C——沒有原生 Graphviz 二進位檔、沒有 WASM 移植版、也不需要轉譯伺服器。版面配置引擎本身就是 TypeScript——直接打包並發佈即可。
  - title: 全部八種版面配置引擎
    details: dot、neato、fdp、sfdp、circo、twopi、osage 與 patchwork——皆可轉譯為 SVG。
  - title: 程式化的版面配置與幾何資訊
    details: 不只是轉譯——您可以透過 getLayout()，以可直接序列化為 JSON 的純資料快照讀回計算出的節點位置、邊樣條與叢集邊界，不需要解析 -Tplain。
---

## 立即試用 {#try-it}

下方的編輯器在您的瀏覽器中執行真正的函式庫。請編輯左側的 DOT；SVG 會即時更新。

<Playground height="360px" />

## 選擇您的路徑 {#choose-your-path}

初次造訪嗎？請選擇符合您目前需求的入口：

| 我想要… | 從這裡開始 |
| --- | --- |
| 了解各個部分如何組合在一起 | [概覽（心智模型）](/zh-tw/guide/overview) |
| 安裝並轉譯我的第一張圖 | [快速入門](/zh-tw/guide/getting-started) |
| 解決一項具體的任務 | [實作範例集](/zh-tw/guide/recipes) |
| 查詢函式或型別 | [API 參考](/zh-tw/guide/api) · [型別](/zh-tw/guide/types) |
| 不必安裝就能實驗 | [遊樂場](/zh-tw/playground) |

從其他工具轉換過來嗎？請參閱[從 C 版 `dot` 命令列遷移](/zh-tw/guide/migrate-from-c-cli)
或[從 JS Graphviz 函式庫遷移](/zh-tw/guide/migrate-from-js-libs)。

若需要完整、自動產生的函式簽章，請參閱
[產生的 API 參考](/reference/)。想把轉譯後的圖嵌入頁面嗎？
請閱讀[使用圖片](/zh-tw/guide/images)，了解圖片內嵌與 CSP 指引。
