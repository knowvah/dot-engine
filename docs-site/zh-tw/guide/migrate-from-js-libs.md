---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# 從其他 JS Graphviz 函式庫遷移

viz.js / `@viz-js/viz`、`@hpcc-js/wasm`（`@hpcc-js/wasm-graphviz`）與 `d3-graphviz`，都是把真正的 C 版 Graphviz 編譯成 **WebAssembly** 並呼叫進去，讓 JavaScript 能使用 Graphviz。@knowvah/dot-engine 則是從零開始撰寫的 **TypeScript 移植版**——版面配置引擎、剖析器與 SVG 輸出器都是 TypeScript 原始碼，而不是編譯後的二進位檔。

這項差異是重點，不是附註：

| | WASM 包裝函式庫（viz.js / `@hpcc-js/wasm` / d3-graphviz） | @knowvah/dot-engine |
|---|---|---|
| 實作 | 真正的 C 版 Graphviz，編譯成 `.wasm` 二進位檔 | 純 TypeScript 移植版，沒有編譯產物 |
| 模組初始化 | 非同步——首次使用前須先實體化並等待 WASM 模組 | 無——直接 `import` 後同步呼叫 |
| 套件 | 需隨 JS 一併提供 `.wasm` 資產（數百 KB 到數 MB） | 僅 JS，可進行 tree-shaking |
| 除錯 | 逐步執行 WASM 二進位檔（若有 C 原始碼，則是 C 原始碼） | 透過原始碼對應檔，逐步執行真正的 TypeScript |
| 執行緒模型 | 部分建置版本會在 Web Worker 中執行版面配置 | 與任何 TS 函式一樣，在呼叫端執行緒上執行 |
| 輸出格式 | 取決於底層 C 建置版本編譯時啟用的項目——通常是完整的 Graphviz 格式集，包括點陣圖／PDF | SVG 加上 DOT/json/xdot/plain/imagemap 文字格式——見下文 |

如果您的需求是「呼叫一個函式、取回 SVG、不需要非同步的繁瑣流程、也不必代管 WASM 資產」，這正是 @knowvah/dot-engine 的用途。如果您的需求依賴點陣圖或 PDF 輸出，請參閱下方的[何時該留在 WASM](#when-to-stay-on-wasm)。

## API 差異

這三個函式庫的形式各不相同；下表是最常見的遷移情境（僅為近似——請對照各函式庫自己的文件確認；各列下方附有引用來源）。

| 函式庫 | 典型呼叫 | @knowvah/dot-engine 的對應用法 |
|---|---|---|
| `@viz-js/viz`（viz.js 的後繼者） | `Viz.instance().then(viz => viz.renderSVGElement(dot))`——非同步，`Viz.instance()` 會解析為 Promise | `renderSvg(dot, 'dot')`——同步，沒有執行個體／初始化步驟 |
| viz.js 2.x（舊版，`new Viz()`） | `new Viz().renderString(dot)`——回傳 `Promise<string>` | `renderSvg(dot, 'dot')`——同步 |
| `@hpcc-js/wasm-graphviz` | 先 `await Graphviz.load()` 一次，之後呼叫 `graphviz.dot(dot)`（載入後為同步） | `renderSvg(dot, engine)`——完全沒有載入／暖機步驟 |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)`——把輸出繫結進 DOM，並對轉場加上動畫 | `renderSvg(dot, engine)` 回傳 SVG **字串**；由您自行插入 DOM（例如 `el.innerHTML = svg`） |

右欄中的每個 @knowvah/dot-engine 呼叫都是**同步**的——沒有需要等待的模組，因為根本沒有要實體化的 WASM 二進位檔。請移除包在 @knowvah/dot-engine 呼叫外的任何 `await`/`.then()`；它們從來就不需要。

- `@viz-js/viz` 的 `Viz.instance()` → Promise 與 `renderSVGElement()` 方法記載於 viz-js.com；截至撰寫時，已透過該專案公開的使用範例確認。
- viz.js 2.x 的 `new Viz().renderString(dot)` 是該（已被取代的）版本系列所記載的 API；如果您使用的是目前的安裝版本，請確認自己實際上是否使用 `@viz-js/viz`。
- `@hpcc-js/wasm-graphviz` 的 `Graphviz.load()` / `graphviz.dot()` 組合，截至撰寫時已透過該套件公開的使用範例確認。另一個較舊的獨立 `@hpcc-js/wasm` 套件，在過去的版本中還提供過 `graphviz.layout(dot, format, engine)` 呼叫——依賴確切簽章之前，請先查閱您所安裝版本的文件。
- `d3-graphviz` 的 `.graphviz().renderDot(dot)` 呼叫鏈，以及它內部是以 `@hpcc-js/wasm` 為基礎，截至撰寫時已透過該專案公開的 README 確認。

### `renderDot` 的 DOM 繫結不在此範圍內

`d3-graphviz` 做的不只是轉譯 SVG：它還會把結果繫結到 D3 選取集、對重新轉譯的結果做差異比對，並對版面配置之間的轉場加上動畫。@knowvah/dot-engine 完全不涉及 DOM——`renderSvg`/`render` 只回傳純字串。如果您想要 d3-graphviz 風格、在兩種版面配置之間的動畫轉場，那是您需要在兩次 `renderSvg` 呼叫之上，自行搭配 DOM 差異比對來建構的邏輯（或者針對這項特定功能繼續使用 d3-graphviz——見下文）。

## 取得版面配置資料而不必解析字串格式

這三個 WASM 函式庫都可以要求輸出 Graphviz 自己的 JSON 或 plain 文字格式，再由您自行解析該字串以取得節點／邊的座標。@knowvah/dot-engine 省去了文字往返：在 `render` 之後呼叫 `getLayout(g)`，即可直接取得具型別且可 JSON 序列化的快照——不需要解析 `-Tjson`/`-Tplain` 字串。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

完整的快照形式、單位與 `yAxis` 選項，請參閱[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。

## 何時該留在 WASM {#when-to-stay-on-wasm}

請誠實面對適用範圍：@knowvah/dot-engine 的目標是 SVG 加上 `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx` 文字格式。它**不會**輸出點陣圖格式（PNG/JPEG/GIF/...）或 PostScript/PDF/EPS——這是刻意劃定的範圍界線，並非尚未完成的缺口。確切的非目標清單請參閱[已知差異](/zh-tw/divergences)。

如果您的應用程式需要直接從版面配置引擎取得 `-Tpng` 或 `-Tpdf` 輸出，上述以 WASM 為基礎的函式庫仍可滿足這種情況——因為它們執行的是真正的 C 版 Graphviz，所以支援該建置版本編譯時啟用的任何輸出格式。在這種情況下，您可以針對那條程式碼路徑繼續使用 WASM 函式庫，或是以 @knowvah/dot-engine 轉譯成 `'svg'`，再用另一個工具在下游把 SVG 轉換為點陣圖／PDF。

## 另請參閱

- [版面配置引擎](/zh-tw/guide/engines)
- [轉譯為其他格式](/zh-tw/guide/render-formats)
- [讀取計算出的幾何資訊](/zh-tw/guide/geometry)
- [已知差異](/zh-tw/divergences)
- [快速入門](/zh-tw/guide/getting-started)
