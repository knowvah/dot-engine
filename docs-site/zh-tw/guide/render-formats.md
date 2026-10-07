---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# 轉譯為其他格式

`render` 會對圖進行版面配置，並以指定的格式輸出字串。它接受任何由 `parse` 或
`createGraph` 產生的 `Graph`。

## 簽章

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` 預設為 `'dot'`。完整清單請參閱[版面配置引擎](/zh-tw/guide/engines)。

## 格式

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## 各格式的適用時機

| 格式 | 典型用途 |
|---|---|
| `'svg'` | 嵌入網頁；人類可讀；可無損縮放 |
| `'dot'` | 除錯；保留版面配置後再餵給其他 graphviz 工具 |
| `'xdot'` | 透過 `getDrawOps` 交給自訂轉譯器 |
| `'json'` | 供工具或檢視使用的機器可讀圖資料 |
| `'plain'` | 輕量的幾何輸出；容易在指令碼中解析 |
| `'plain-ext'` | 類似 `'plain'`，另在邊上附加連接埠座標 |
| `'imap'` | 供 `<img>` 標籤使用的伺服器端可點擊影像地圖 |
| `'cmapx'` | 供 `<img>` 標籤使用的用戶端 `<map>` 元素 |

## 範例

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## 使用不同的引擎

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## 與 `renderSvg` 的關係

`renderSvg(dot, engine)` 是一個便利包裝函式，會一次呼叫 `parse` + `render`，且僅限
SVG 輸出。若需要非 SVG 格式，或您已經持有 `Graph` 物件，請直接使用 `render`。

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
