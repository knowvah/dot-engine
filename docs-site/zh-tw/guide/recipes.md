---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# 實作範例

這些以任務為導向的程式碼片段，涵蓋「建構 → 版面配置 → 讀取幾何」路徑中，僅憑 API 參考不易看出的部分。每個範例都是最精簡、可執行的範例，只使用公開的 `@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` 介面——不涉及內部模型類別。這些片段所取用的完整進入點清單，請見 `/guide/api`。

## 1. 以程式碼建構圖並轉譯

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**原因：**當您的圖結構來自應用程式資料，而不是靜態的 DOT 字串時，`createGraph` 會提供建構器；`render` 則一次呼叫就完成版面配置與序列化。完整的建構器 API（子圖、屬性、與 `parse` 的比較）請見 `/guide/build-a-graph`。

## 2. 僅做版面配置而不轉譯，再讀取幾何

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**原因：**`getLayout` 是對已計算完成的幾何進行讀取的純函式——它本身不會執行版面配置。如果在任何版面配置呼叫執行之前就呼叫它，它會擲出一個 `code` 為 `ERR_INVALID_STATE` 的 `Error`（"getLayout requires a laid-out graph"；請見[錯誤與例外](/zh-tw/guide/errors)），而不是回傳過時或全為零的座標。如果您只需要幾何、不需要轉譯後的字串，請捨棄 `render` 的回傳值——您真正需要的是版面配置這個副作用。

## 3. 為您的轉譯器選擇 y 軸

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**原因：**graphviz 在 y 軸朝上的座標系中計算版面配置；大多數使用端（canvas、DOM、瀏覽器中的 SVG）則需要 y 軸朝下。`getLayout` 預設為 `'down'`，因此多數呼叫者不需要這個選項。精確的翻轉公式，以及 `bounds` 在兩種模式下有何不同，請見 `/guide/geometry`。

## 4. 對齊 `render()` 的 SVG 座標框架與 `getLayout()` 的座標框架

`render(g, 'svg')` 與 `getLayout(g)` 描述的是*同一個*已完成版面配置的圖，但使用不同的座標框架，而且差異不只是 y 軸翻轉：`render` 的 SVG 輸出器在寫出圖形基本元素之前，會先對每個 y 座標取負值，然後把整個繪圖包進單一的 `<g transform="scale(..)
rotate(..) translate(tx,ty)">`，其中涵蓋了 graphviz 的頁面內距、邊界，以及任何 `size=`/旋轉縮放。`getLayout` 則完全略過這些——它回傳的是正規化到 `(0, 0)` 原點、完全不含頁面幾何的模型座標。

對於任何單次 `render()` 呼叫，這兩種座標框架只相差一個固定的平移量。與其重新推導 GVC 的頁面版面配置公式，不如以您在兩個框架中都已有位置的某個節點，憑經驗推導出偏移量：

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**原因：**只要有一次比對成功就能完全決定偏移量，因為它是純平移，而不是縮放或旋轉（假設使用預設的 `size=`/`rotate=`）。只有當您要從原始 SVG 中讀取 `getLayout` 未公開的內容時，才需要這麼做——目前無可避免的一個常見情況，請見範例 5。

## 5. 還原邊標籤的位置

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**原因：**`EdgeGeometry.label` 僅在 graphviz 實際為該邊的 `label` 屬性放置了置中標籤時才會出現；沒有標籤的邊則直接省略該欄位。`getLayout` 只回傳計算出的*位置*——不含標籤字串或其量測後的方框——因此若您的轉譯器需要自行繪製標籤，請將此位置與您自己端已量測的該標籤文字大小搭配使用（例如，以建立邊時所用的同一組 tail/head 為鍵，回傳您自己的每條邊標籤大小對應表）。

`taillabel` 與 `headlabel` 連接埠標籤也以相同方式傳回，分別位於 `tailLabel` 與 `headLabel`：

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

每一個都只有在版面配置實際放置它之後才會出現——與 `render()` 輸出該標籤 `<text>` 的條件相同——因此不需要擷取轉譯後的 SVG 來還原這些位置。

`xlabel` 會傳回在 `xlabel` 上，且受相同的「僅在已放置時才出現」條件限制。它值得直接讀取，而不是近似推算：graphviz 是透過對候選位置進行力導向搜尋來定位外部標籤，而不是從樣條中點偏移，所以沒有任何對 `label` 或 `points` 的運算能重現它。

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. 繪製您自己的箭頭

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**原因：**當某一端帶有箭頭時，版面配置會縮短樣條以便騰出空間，並記錄箭頭應到達的位置——頭端是 `ep`，尾端是 `sp`。當該端沒有箭頭時，兩者皆不存在，因此上面的檢查同時也等於在判斷「這一端到底需不需要箭頭」。從樣條最後的方向外推箭頭尖端，雖然方向正確，但深度只是猜測；這些值才是 graphviz 自己計算出的結果。

請注意，它們是節點邊界上的連接點。Graphviz 自己的轉譯器會依與筆寬相關的量，把它所繪製的多邊形從這些點向內縮，因此請繪製*到* `ep`，而不要預期它等於轉譯後箭頭的尖端。

## 6. 將 @knowvah/dot-engine 的叢集名稱對應回您自己的名稱

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**原因：**`ClusterGeometry.name` 會原封不動地回傳您給 `addSubgraph` 的名稱——@knowvah/dot-engine 不會自行創造、重新編號或以其他方式轉換它。如果您的領域模型是以自己的 id 作為叢集的鍵（而不是 graphviz 能接受的名稱），請在建構圖的同時自行維護 id 到名稱的對應，並在版面配置後重新以您的鍵整理 `clusters` 快照；不要嘗試從 graphviz 自己的名稱中還原意義。

## 6b. 繪製您自己的叢集標題區塊

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**原因：**版面配置會在叢集方框內為叢集標題預留空間，然後決定它的位置——並遵循 `labelloc`、`labeljust`、`rankdir`，以及標籤本身量測出的大小。`ClusterGeometry.label` 公開了這個已解析的位置，因此自行繪製標題區塊的使用端可以直接讀取它，而不必重新量測文字，再自行推導一個必須與引擎一致的偏移量。

`label.x`/`label.y` 是標籤空間的**中心**，這不同於方框的 `x`/`y`（那是一個角落）。`render()` 輸出的 `<text>` 所帶的則是*基線*，它位於中心下方——因此若您是在比對轉譯輸出，請拿中心比對中心，不要拿輸出的 `y` 比對。

## 7. 安全地加入大量邊

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**原因：**建構器的 `addEdge` 會依名稱解析 `tail`/`head`，若節點尚不存在，會在首次使用時建立它——您永遠不必在串接資料驅動的邊清單之前預先宣告節點。在 `strict` 圖上，重複相同的 `(tail, head)` 配對會回傳既有的邊，而不是新增一條平行邊，這與 cgraph 的 `agedge` 去重複約定相符。

如果您是在 `parse()` 產生的圖（而不是 `createGraph()`）上加入邊，請直接對您已持有的 `Node` 參考，使用 `@knowvah/dot-engine` 提供的較低階 `addEdge(g, tail, head, name?)`：

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

完整的 `addEdge` 簽章及其在 strict 圖中的去重複行為，請見 `/reference`。

## 8. 整合起來

一個精簡的函式，接收一個小型領域圖、對它進行版面配置，並回傳已定位的節點與邊：

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

這是多數使用端最後會在 `getLayout` 之上建構出的形式：一個替換點，輸入您自己的節點／邊型別，輸出以您自己的座標慣例表示的已定位幾何。
