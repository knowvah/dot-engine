---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# 在瀏覽器中使用

@knowvah/dot-engine 不使用任何僅限 Node 的 API，可放心地打包給瀏覽器使用。
本頁說明在用戶端執行時需要知道的兩件事。

## 打包 {#bundling}

這個函式庫是純 ES 模組。任何現代的打包工具（Vite、esbuild、Rollup、
webpack）都能納入它。沒有需要外部化的執行期相依套件，也沒有
需要代管的 WASM 產物。

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

本站的[遊樂場](/zh-tw/playground)正是這麼做的——它匯入
引擎並在瀏覽器中呼叫 `renderSvg`，不需要往返伺服器。

## 文字量測 {#text-measurement}

Graphviz 需要文字尺寸才能決定標籤大小。@knowvah/dot-engine
會自動處理：

- **在瀏覽器中**（當 `document` 存在時），它使用原生的
  `<canvas>` 2D 環境量測文字——貼近主機，因為這就是
  瀏覽器轉譯 SVG 時所用的同一種字型。
- **在 Node 中**，預設使用內建的 **Estimate** 量測器——一種
  確定性、可在無頭環境安全執行的模型，仿照 Graphviz 自己的
  `estimate_textspan_size`。在 Node 中要取得正確的版面配置，不需要安裝 `canvas`，
  也不需要字型檔；另外也提供經過提示（hinted）的查表（LUT）量測器作為選用項目，
  可在不依賴原生 canvas 的情況下取得更貼近主機的尺寸。
  如何明確選擇量測器，請參閱[文字量測](/zh-tw/guide/text-measurement)。

無論哪種情況，版面配置都不需要字型檔。

## 網頁字型：為什麼預先載入很重要 {#web-fonts-why-prefetching-matters}

標籤大小來自以某種字型量測文字。如果某個字型以
`@font-face` 宣告但尚未載入完成，瀏覽器就會改用
**後備**字型量測，等真正的字型抵達後，版面配置就是錯的。
以 JetBrains Mono 在 Chromium 中量測：字型載入前量測（後備字型）時，標籤方框寬度為 **70.68 pt**，
載入後則為 **124.8 pt**。

非同步進入點（`renderSvgAsync`、`renderAsync`、`renderSvgInto`）可避免
這個問題：它們會收集圖將要請求的字型，透過
`document.fonts` 載入，然後才執行版面配置。`renderSvgAsync` 得到的結果
與載入後量測的 124.8 pt 相同。

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`**（預設 `3000`）是所有字型共用的單一期限，而不是
  每個字型各自計算。
- **`fontIssues`** 是由 `{ face, reason }` 組成的清單。`reason: 'failed'` 表示
  該字型發生錯誤（例如 404）或其載入被拒絕；`reason: 'timeout'`
  表示它未能在 `fontTimeoutMs` 內載入完成。兩種情況下，版面配置都會
  改用後備字型繼續進行。每個問題也會以 `console.warn` 輸出。字型問題絕不會
  使 Promise 被拒絕。
- **限制：** 只有以 `@font-face` 宣告的字型家族才能被回報。
  系統字型或未知的字型家族名稱會被視為「已載入」（沒有任何東西
  需要等待），因此拼錯的 `fontname` 永遠不會出現在 `fontIssues` 中。
- **Node 與 Worker** 沒有 `document.fonts`，因此會略過字型預先載入，
  `fontIssues` 為 `[]`。圖片掛鉤仍可運作。您可以傳入 `fontSet`
  （任何具有 `load(font)` 的物件）來提供自己的字型集。

## 轉譯到頁面中：`renderSvgInto` {#rendering-into-a-page-rendersvginto}

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

它會以轉譯後的 `<svg>`（以 `element` 回傳）取代具有指定 id 之元素的子節點，
使用 `DOMParser` 與 `importNode`，絕不使用 `innerHTML`。找不到 id 時會以
`ERR_INVALID_ARG_VALUE` 拒絕。SVG 預設會經過清理；傳入 `sanitize` 可使用
您自己的清理器，或傳入 `trusted: true` 以略過清理。清理器會移除與保留哪些內容，
請參閱 README 的「Security」一節，並請務必保留 Content-Security-Policy。

## 外部圖片：`setImageSizer` {#external-images-setimagesizer}

當類 HTML 標籤含有外部圖片
（`<IMG SRC="logo.png"/>`）時，Graphviz 需要該圖片的內在尺寸，
才能決定儲存格大小。（節點的 `image=` 屬性不會被量測：節點維持
其一般方框，與無頭的原生 Graphviz 相同。）由於函式庫無法
讀取檔案系統，您需要提供一個尺寸取得器：

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

如果您的圖從不參照外部圖片，就不需要呼叫它。
若要以非同步方式取得圖片尺寸（例如載入圖片），請改為將非同步的
`imageSizer` 傳給 `renderSvgAsync`；請參閱[圖片](/zh-tw/guide/images)。

## Web Worker {#web-workers}

版面配置以同步方式執行，因此大型圖會阻塞它所在的執行緒。請
在 Worker 中執行，讓頁面保持回應。Worker 內沒有
`document`，所以函式庫會以 `OffscreenCanvas` 量測文字，
非同步 API 則透過 Worker 自己的字型集（`self.fonts`）載入字型。

Worker 中的字型與頁面的字型是分開的：請在 Worker 中以
`FontFace` API 註冊它們（CSS 的 `@font-face` 規則無法作用於 Worker）。

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

在 Worker 中請使用 `renderSvgAsync`（或 `renderAsync`）轉譯，而不是 `renderSvg`，
至少要等到每個網頁字型都已載入。如果某個字型字串在字型載入前就已在 Worker 中被量測過，
Chromium 即使在字型載入之後，仍會繼續以後備字型量測該字串；
非同步 API 會先載入字型再量測，所以不會遇到這個問題。

## 不該期待的事 {#what-not-to-expect}

這個函式庫以 **SVG** 為目標（外加 `json` / `xdot` / `dot` / 圖像地圖等文字
格式）。點陣輸出（PNG/JPG）、PostScript/PDF，以及互動式／圖形介面後端
都不在範圍內——若需要其他格式，請在下游轉換 SVG。完整的範圍界線請參閱
[已知差異](/zh-tw/divergences)。

## 大型圖：預先轉譯為 SVG {#large-graphs-pre-render-to-svg}

非常大的圖——大約 **超過 10k 個節點，或數 MB 的 DOT 原始碼**——
無法在瀏覽器中於執行期進行版面配置。版面配置（mincross、分層、
樣條繞線）是超線性的，因此這是**與上游 Graphviz 共有的規模上限，
而非這個引擎特有的限制**：面對這類輸入，原生 `dot`、WASM 建置版（`@hpcc-js/wasm-graphviz`）
與這個引擎都同樣會逾時或耗盡記憶體。（這個引擎**不會**洩漏記憶體——
每次轉譯的堆積用量保持平穩；限制純粹來自圖的大小。實測比較請見
[效能儀表板](/perf)。）

對於這種規模的圖，請**在建置時轉譯一次，再提供產生的
`.svg`**，而不要每次檢視時都在瀏覽器中做版面配置——這和您即使使用
原生 `dot` 也會採用的做法相同，因為每個請求都執行實在太慢。

[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins)（已發佈於 NPM）中的
建置期網站轉接器正是這麼做的：

- `@knowvah/vitepress-plugin-dot`——VitePress（markdown-it），建置期
- `@knowvah/eleventy-plugin-dot`——Eleventy（markdown-it），建置期
- `@knowvah/docusaurus-plugin-dot`——Docusaurus（MDX/remark），建置期
- `@knowvah/dot-markdown-it`——與框架無關的 markdown-it 整合

對於由使用者提供、無法在建置期轉譯的動態圖，
請將互動式轉譯限制在大小合理的圖上，並快取產生的 SVG。
