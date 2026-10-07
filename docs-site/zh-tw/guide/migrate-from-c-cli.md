---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# 從 `dot` 命令列工具遷移

C 版的 `dot`/`neato`/`fdp`/... 執行檔會讀取 `.dot` 檔案（或標準輸入），並寫出轉譯後的檔案（或標準輸出）。@knowvah/dot-engine 沒有檔案系統：它接收一個 DOT **字串**，並回傳轉譯後的**字串**（或者，若使用 `getLayout`，則回傳純 JavaScript 幾何物件，而不是需要再解析的字串）。

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

上述檔案的讀取／寫入是您自己的程式碼，而不是函式庫的——@knowvah/dot-engine 從不存取磁碟。這也正是它能在沒有 `input.dot` 可讀的瀏覽器分頁中，不經修改直接運作的原因。

## `-K<engine>`——版面配置引擎

`-K` 用來選擇版面配置引擎；@knowvah/dot-engine 使用相同的名稱，作為 `renderSvg` 的 `engine` 引數，或 `render` 的 `opts.engine` 欄位。全部八個引擎都已移植：

| `-K` 值 | @knowvah/dot-engine 的 `engine` 字串 |
|---|---|
| `-Kdot` | `'dot'`（省略 `engine` 時，也是 `render` 的預設值） |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

各引擎的功能及其一致性等級，請參閱[版面配置引擎](/zh-tw/guide/engines)。

## `-T<format>`——輸出格式

`renderSvg` 僅支援 SVG；其他格式請使用 `render(g, format, opts?)`。@knowvah/dot-engine 的 `OutputFormat` 聯集型別涵蓋下列 `-T` 目標：

| `-T` 值 | @knowvah/dot-engine 的 `format` 字串 | 備註 |
|---|---|---|
| `-Tsvg` | `'svg'` | 也是 `renderSvg` 唯一的輸出 |
| `-Tdot` | `'dot'` | 附加了版面配置屬性（`pos`、`bb`...）的 DOT 原始碼 |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot 指令 |
| `-Tjson` | `'json'` | 完整的圖，以 JSON 表示 |
| `-Tplain` | `'plain'` | 以空白分隔的節點／邊幾何資料 |
| `-Tplain-ext` | `'plain-ext'` | `plain`，另在邊上附加連接埠座標 |
| `-Timap` | `'imap'` | 伺服器端 HTML 影像地圖 |
| `-Tcmapx` | `'cmapx'` | 用戶端 HTML `<map>` 元素 |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**不支援：**點陣圖格式（`-Tpng`、`-Tjpg`、`-Tgif`...）、`-Tps`/`-Tpdf`/`-Teps`，以及 GUI／互動式後端。這些是刻意劃定的範圍界線——完整的非目標清單請參閱[已知差異](/zh-tw/divergences)。如果您需要點陣圖，請轉譯成 `'svg'`，再於下游轉換（無頭瀏覽器、`resvg` 或類似工具）。

## `-Gname=val` / `-Nname=val` / `-Ename=val`——屬性

命令列的全域屬性旗標，會從命令列為每個圖／節點／邊設定預設值。@knowvah/dot-engine 沒有命令列旗標——請直接在 DOT 原始碼中設定相同的屬性；若您以程式碼建構圖，則可透過建構器 API 設定：

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

完整的建構器 API 請參閱[以程式碼建構圖](/zh-tw/guide/build-a-graph)。

## 取得命令列無法直接提供的幾何資訊

`-Tplain` 的存在，正是為了讓指令碼能從文字輸出中擷取節點／邊的座標。@knowvah/dot-engine 省去了這道往返：在 `render` 之後呼叫 `getLayout(g)`，即可取得具型別、可 JSON 序列化的快照，內含每個節點的位置、每條邊的樣條，以及整體邊界框——不需要解析文字格式。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

完整的快照形式，以及 `yAxis` 選項（原生 graphviz 為 y 軸朝上；瀏覽器為 y 軸朝下），請參閱[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。

## 字型與影像：命令列讀取您的檔案系統，@knowvah/dot-engine 則不會

原生 `dot` 會使用機器上安裝的任何字型來量測文字，並透過讀取相對於工作目錄的檔案來解析 `image="..."` 屬性。@knowvah/dot-engine 沒有檔案系統存取權，因此這兩者都改由主機應用程式注入，而不是從磁碟讀取：

- **文字量測**——`setTextMeasurer` 會安裝一個 `TextMeasurer`；若您未設定，函式庫會自動解析出合理的預設值（瀏覽器 canvas，或 Node 中的確定性度量模型）。請參閱[文字量測](/zh-tw/guide/text-measurement)。
- **影像**——`setImageSizer`（以及用於內嵌的 `setImageResolver`）讓您自行提供影像的固有尺寸與影像資料，因為 @knowvah/dot-engine 無法代您對檔案執行 stat。請參閱[使用圖片](/zh-tw/guide/images)。

## 另請參閱

- [版面配置引擎](/zh-tw/guide/engines)
- [轉譯為其他格式](/zh-tw/guide/render-formats)
- [讀取計算出的幾何資訊](/zh-tw/guide/geometry)
- [已知差異](/zh-tw/divergences)
- [快速入門](/zh-tw/guide/getting-started)
