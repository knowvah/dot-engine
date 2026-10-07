---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# 型別參考

公開型別的概念地圖，依取得來源分組：`createGraph`/`parse`（建構 + 檢視）、`getLayout`（幾何快照）、`render`/`getDrawOps`（輸出），以及根套件（引擎、影像、文字量測、錯誤）。每個項目都附有一段取自原始碼的形式區塊，以及一句話說明用途。若需要逐欄位的詳盡文件（包括繼承的成員以及每個屬性上的 JSDoc），請見產生的 [TypeDoc 參考](/reference/)。

本頁不會重複座標框架的逐步說明——請見[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。不過，每當某個型別的欄位與座標框架有關時，本頁都會簡短重述 y 軸的注意事項。

## 建構 + 檢視（`@knowvah/dot-engine` / `@knowvah/dot-engine/api`）

### `Graph`

指向內部圖模型的不透明控制代碼。由 `parse()` 與 `createGraph().graph` 回傳。將它交給 `render`、`getLayout` 與 `getDrawOps`；請不要直接建構或檢視它——建構器與剖析器是唯一受支援的產生方式。

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph` 的選項。`directed`/`strict` 會從四種 `GraphKind`（有向、無向、strict 有向、strict 無向）中選擇其一；`name` 設定圖的名稱（預設為 `''`）。

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

由 `builder.addNode(...)` 回傳的圖節點不透明控制代碼。`setHtmlAttr` 會將值標記為 HTML 類標籤（相當於 DOT 文字中的 `label=<...>`），讓版面配置引擎將它當作標記語言來量測。

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

由 `builder.addEdge(...)` 回傳的圖邊不透明控制代碼。

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

由 `createGraph(...)` 回傳。`addSubgraph` 會回傳一個以該子圖為範圍的巢狀建構器；透過它加入的節點，同時也是根圖的成員。`.graph` 是交給 `render`/`getLayout`/`getDrawOps` 的交接點。請見[以程式碼建構圖](/zh-tw/guide/build-a-graph)。

## 幾何快照（`getLayout`）

::: tip 座標框架
原生 graphviz 座標是 y 軸朝上（原點在左下角）。`getLayout` 預設為 `yAxis: 'down'`（原點在左上角，螢幕慣例），並會翻轉每個 y 座標；若要取得原生 graphviz 座標，請傳入 `{ yAxis: 'up' }`。完整說明：[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout` 的選項。預設為 `yAxis: 'down'`。

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

圖計算出的幾何的純粹、可 JSON 序列化快照，由 `getLayout(g, opts?)` 回傳。`clusters` 會遞迴列出每個叢集子圖（巢狀叢集各自有自己的項目）；沒有叢集的圖，它是空的。

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

整體邊界框，以點為單位。在 `yAxis: 'down'` 時，`x`/`y` 會正規化到 `(0, 0)`。在 `yAxis: 'up'` 時，`x`/`y` 是圖邊界框原始的左下角。

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

每個節點的幾何。`x`/`y` 是節點中心。`width`/`height` 以**點**為單位——模型以英吋儲存（`ND_width`/`ND_height`）；`getLayout` 會在回傳前乘以 72。

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

每條邊的幾何。`points` 依序串接繞線後樣條的每個貝茲控制點（若邊沒有繞線後的樣條，則為空）。`label` 只有在邊帶有置中標籤時才會出現。

`tailLabel` 與 `headLabel` 是 `taillabel`/`headlabel` 連接埠標籤的位置。每一個都只有在版面配置實際放置它之後才會出現——與 `render()` 輸出其 `<text>` 的條件相同——因此無法放置的連接埠標籤（例如沒有繞線後樣條的邊），會回報為不存在，而不是位於原點的標籤。

`xlabel` 是 `xlabel` 外部標籤的位置。與 `label` 不同，它是由 graphviz 對邊周圍的候選位置進行力導向放置搜尋所選出的，因此無法由 `label` 或樣條中點推導出來。它同樣受「僅在已放置時才出現」的條件限制：搜尋無法容納的已宣告 xlabel 會回報為不存在，正如 `render()` 也不會繪製它。

`sp` 與 `ep` 是尾端與頭端的箭頭連接點。當某一端帶有箭頭時，樣條會被縮短以騰出空間，而箭頭會從終端控制點延伸到這個點——因此自行繪製箭頭的使用端，可以直接在這裡讀取尖端，而不必外推。每一個都只有在該端實際有箭頭時才會出現，所以一條單純的 `digraph { a -> b }` 邊會回報 `ep` 而沒有 `sp`，而 `arrowhead=none` 則兩者皆不回報。

這些是節點邊界上的連接點。Graphviz 自己的轉譯器會依與筆寬相關的量，將它所繪製的箭頭多邊形從這些點向內縮，因此 `ep` 是箭頭應該繪製*到*的點，而不是轉譯後尖端的複本。

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

每個叢集的邊界框。`name` 是叢集子圖的名稱（例如 `cluster6`）；巢狀叢集會把階層編碼在名稱中，因此不公開明確的父層連結。遵循與 `BoundsGeometry` 相同的座標框架慣例。

`label` 是叢集標題的位置，只有在叢集宣告了標題時才會出現。它的 `x`/`y` 是標籤空間的**中心**——與 `EdgeGeometry.label` 一致，而不是上方方框角落的 `x`/`y`——而 `width`/`height` 是量測出的文字大小，所以標籤方框是 `[x - width/2, x + width/2] × [y - height/2, y + height/2]`，且一定位於叢集方框之內。請注意，這是標籤的*中心*，而 `render()` 輸出的 `<text>` 帶的是基線，位置較低。

## 轉譯（`@knowvah/dot-engine/render`）

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

`render(g, format, opts?)` 所接受格式的封閉聯集。請見[轉譯為其他格式](/zh-tw/guide/render-formats)。

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render` 的選項。`engine` 預設為 `'dot'`。`inlineImages`（新功能）預設為 `false`；為 `true` 時，SVG 輸出器會參照透過 `setImageResolver` 註冊的解析器，將外部影像（`image=`/HTML `<IMG>`）內嵌為 `data:` URI——解析器未命中或未註冊時，會退回原樣輸出 `src`。對非 SVG 格式沒有效果。請見[使用圖片](/zh-tw/guide/images)。

::: warning `yAxis` 不是 `RenderOptions` 的欄位
座標方向僅與 `getLayout` 有關。`render` 產生的原始格式字串帶有原生的 y 軸朝上座標；如果您需要 y 軸朝下，且不是透過 `getLayout`，請在後處理時翻轉。
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps` 的選項。`engine` 預設為 `'dot'`。

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

一個 xdot 屬性串流的剖析結果：解碼後的繪製操作陣列，加上剖析狀態旗標位元遮罩。`getDrawOps` 只回傳橫跨圖上每個繪製屬性、依繪製順序（圖 → 節點 → 邊）攤平後的 `XdotOp[]`——完整的操作種類表與 canvas 範例，請見[以 xdot 繪製操作自訂轉譯](/zh-tw/guide/xdot-drawops)。

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

單一已解碼的 xdot 繪製操作，以 `kind` 作為辨別欄位。每個變體都帶有一個以其形狀命名的酬載屬性——請在 `switch` 中依 `kind` 縮小型別，以安全地存取它。座標以點為單位，採原生 y 軸朝上的框架（若為 y 軸朝下的 canvas 需翻轉——請見上方連結的指南）。

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

已解析的 xdot 填滿／描繪色彩：純色，或線性／放射狀漸層（`XdotLinearGrad`/`XdotRadialGrad` 各自帶有 `x0,y0,x1,y1[,r0,r1]`，外加一個 `stops: { frac: number; color: string }[]` 陣列）。

## 根套件（`@knowvah/dot-engine`）

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

版面配置引擎的名稱。登錄表是開放的（可在 `GvcContext` 上註冊自訂引擎），因此任何字串都會被接受；`(string & {})` 能在不封閉集合的情況下，保留內建引擎的編輯器自動完成。請見[版面配置引擎](/zh-tw/guide/engines)。

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

註冊一個回呼，傳回由 `image=` 或 HTML `<IMG>` 儲存格所參照之外部影像的固有尺寸，供版面配置使用。當尺寸未知時請回傳 `null`（與 C 對缺少影像的行為相符——尺寸為零的儲存格加上一個警告）。對 `setImageSizer` 傳入 `null` 可清除先前設定的量測器。請見[在瀏覽器中使用](/zh-tw/guide/browser)。

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

註冊一個回呼，傳回外部影像的原始位元組，當 `RenderOptions.inlineImages` 為 `true` 時會被參照。若回傳單純的 `Uint8Array`，會從 `src` 的副檔名推斷其 MIME 類型。`null`（來自解析器，或未註冊解析器）會退回原樣輸出 `src`。請見[使用圖片](/zh-tw/guide/images)。

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

可抽換的文字量測，透過 `setTextMeasurer` 安裝（內建三種：`EstimateTextMeasurer`、`LutTextMeasurer`、`CanvasTextMeasurer`）。`yoffsetCenterline`/`yoffsetLayout` 是選用的垂直度量（基線→中心線、基線→上緣）；省略它們時，會退回以 pango 校準的預設值。請見[文字量測](/zh-tw/guide/text-measurement)。

### `RenderResult` 與錯誤

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` 是 `renderSvg` 的結果式對應版本：成功時回傳 `{ svg }`，第一次失敗時回傳 `{ errors: [one] }`，而不是擲出。它對任何 DOT 輸入都會回傳，只有在引數無效時才擲出。`errors` 中的項目是純資料，沒有 `cause`，也沒有堆疊。

每個擲出的 dot-engine 錯誤都繼承抽象的 `DotEngineError`，並實作 `GvError`：

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` 對無效的 DOT 原始碼擲出 `ParseError`，對版面配置／轉譯階段的失敗擲出 `RenderError`，對 dot-engine 本身的錯誤擲出 `InternalError`。呼叫者的錯誤則擲出標準的 `TypeError` / `RangeError` / `Error`，其 `code` 為 `UsageErrorCode`（`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`）；這些不是 `GvError`。想要取得結構化錯誤而不使用 `try`/`catch` 的呼叫者，應改用 `tryRenderSvg`。每個代碼請見[錯誤與例外](/zh-tw/guide/errors)。

## 關聯

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## 哪個型別來自哪個呼叫

| 呼叫 | 回傳 |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder`（巢狀） |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string`（擲出 `DotEngineError`，或使用錯誤的 `TypeError`） |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

上述每個型別的每個欄位——包括本頁僅做摘要的部分——請見產生的 [TypeDoc 參考](/reference/)。座標框架的深入說明（含實際範例），請見[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。
