---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API 參考

公開介面刻意保持精簡。多數呼叫者只需要 `renderSvg`。該使用哪個進入點，請參閱[概覽](/zh-tw/guide/overview)；每個函式接收與回傳的形式，請見[型別](/zh-tw/guide/types)；而產生的[參考](/reference/)則提供詳盡的簽章、每個欄位與每個多載。

> 型別宣告（`.d.ts`）由 `npm run build` 產出（`build:types` 步驟會執行 `tsc -p tsconfig.build.json`）。`package.json` 的 `exports` 對應表為每個進入點接上 `types` 條件，因此 `@knowvah/dot-engine`、`@knowvah/dot-engine/api` 與 `@knowvah/dot-engine/render` 在編輯器與下游建置中都能解析型別。
>
> 建置也會產出宣告對應檔（`.d.ts.map`）與 JS 原始碼對應檔，且套件會一併附上它的 `src/` 原始碼——因此「跳至定義」會直接跳到真正的 TypeScript，方便您閱讀程式碼並提交 PR。

本頁依三個進入點組織（何時該選用哪一個，請見[概覽](/zh-tw/guide/overview)）：根套件 `@knowvah/dot-engine`（一次呼叫完成剖析與轉譯，加上程序層級的全域設定）、`@knowvah/dot-engine/api`（以程式碼建構圖、讀回計算出的幾何），以及 `@knowvah/dot-engine/render`（多格式輸出與原始繪製操作）。下列每個函式也都從根套件重新匯出（`src/index.ts` 中的 `export * from './api/index.js'` / `export * from './render/index.js'`）——全部從 `@knowvah/dot-engine` 匯入也行得通，但子路徑匯入能更明確地表示您接觸的是哪一層。

## `@knowvah/dot-engine`（根）

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

剖析 DOT 原始碼、執行指定的[版面配置引擎](/zh-tw/guide/engines)、轉譯為 SVG，並回傳 SVG 字串。這是一次呼叫的便利包裝函式：它會建構一個 `GvcContext`、註冊八個內建引擎與 SVG 轉譯器、執行版面配置、轉譯，然後釋放版面配置——如果您需要把這些步驟分開，請見下方的 [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)。

- **`dotSource`**——DOT 語言的圖原始碼。
- **`engine`**——`EngineName`：內建引擎之一（`dot`、`neato`、`fdp`、`sfdp`、`circo`、`twopi`、`osage`、`patchwork`），或任何自訂註冊的名稱。
- **擲出**：對於輸入的任何問題，擲出 `DotEngineError`：`dotSource` 無效時為 `ParseError`，版面配置或轉譯失敗時為 `RenderError`，dot-engine 本身的錯誤則為 `InternalError`（附帶 `cause`）。如果 `dotSource` 或 `engine` 無效（包括未註冊的引擎名稱），則擲出帶有 `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` 的 `TypeError`。請見[錯誤與例外](/zh-tw/guide/errors)。

完整簽章、JSDoc 以及 `GvError` 欄位清單：[參考](/reference/)。

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg` 的結果式對應版本。對於任何 DOT 輸入都會回傳（不會擲出）：成功時為 `{ svg }`，第一次失敗時為 `{ errors: [one] }`；`svg` 與 `errors` 互斥。它只在引數無效時才擲出（`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`）。`errors` 中的每個項目都是純粹、可 JSON 序列化的資料（`type`、`code`、`message`、`friendlyMessage`，以及存在時的 `location` / `expected`；沒有 `cause`，也沒有堆疊追蹤），因此可以安全地跨 worker/postMessage 邊界傳送，或序列化到記錄中。當呼叫者想依 `code` / `type` 分支處理，而不是捕捉例外時，請優先使用它，而不是 `renderSvg` + `try`/`catch`。請見[錯誤與例外](/zh-tw/guide/errors)。[參考](/reference/)。

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

將 DOT 剖析為記憶體中的圖模型，但**不**進行版面配置。適合在轉譯之前檢視或轉換圖——或將它交給 `@knowvah/dot-engine/api` 的 `getLayout` / `@knowvah/dot-engine/render` 的 `render`。

- **擲出**：語法錯誤或邊方向違規（例如無向圖中使用 `->`）時為 `ParseError`。`ParseError` 繼承自 `DotEngineError`，並實作 `GvError`，其 `type: 'syntax'`；並帶有 `location: { line, column, offset? }`。若 `dotSource` 不是字串，則為 `TypeError` `ERR_INVALID_ARG_TYPE`。[錯誤與例外](/zh-tw/guide/errors)、[參考](/reference/)。

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` 表示 dot-engine 在這個輸入上失敗了。`RenderError` 涵蓋已知的版面配置／轉譯失敗（`UNKNOWN_LAYOUT` 與 `UNSUPPORTED_FEATURE` 的 `type` 為 `semantic`）。`InternalError` 是 dot-engine 本身的錯誤；若有包裝其他錯誤，`cause` 會存放原始錯誤。呼叫者的錯誤則改為擲出帶有 `code` 的標準 `TypeError` / `RangeError` / `Error`。`isGvError` 會檢查是否有字串型的 `type` 與 `code`，因此在重複的套件之間也能運作。每個代碼以及各函式可能擲出什麼，請見[錯誤與例外](/zh-tw/guide/errors)；`GvError` 的形式請見[型別](/zh-tw/guide/types)；`GvErrorCode` 的成員清單請見[參考](/reference/)。

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

註冊（或以 `null` 清除）程序全域的文字量測器，版面配置期間會參照它來決定標籤大小。清除後會回到函式庫預設值（瀏覽器：`CanvasTextMeasurer`；無頭／Node：`EstimateTextMeasurer`，除非已接上 LUT 量測器——完整的解析順序，以及與這些函式一併匯出的 `CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` 實作，請見[文字量測](/zh-tw/guide/text-measurement)）。[參考](/reference/)。

### `setImageSizer` / `setImageResolver`

兩個相關但不同的影像設定替換點——兩者都是程序全域的登錄表，遵循相同的模式（註冊回呼，傳入 `null` 即清除），在呼叫者註冊之前都不會有任何作用：

- **`setImageSizer`**——回報外部影像的*固有尺寸*，讓版面配置引擎能在轉譯之前，為 HTML `<IMG>` 儲存格或節點的 `image=` 屬性預留空間。回傳 `null`（或未註冊任何量測器）會重現原生 Graphviz 對缺少影像的行為：一個警告，加上尺寸為零。
- **`setImageResolver`**（新功能——請見下方的 [`inlineImages`](#inlineimages)）——提供實際的影像*位元組*，讓 SVG 轉譯器能將它們內嵌成 `data:` URI，而不是原樣輸出 `xlink:href="src"`。

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` 可以回傳單純的 `Uint8Array`（MIME 類型由 `src` 的副檔名推斷——`.png`、`.jpg`/`.jpeg`、`.gif`、`.svg`、`.webp`；其他一律退回 `application/octet-stream`），或是 `{ bytes, mime }` 以明確指定 MIME 類型。若無法解析 `src`，請回傳 `null`——轉譯器會退回原樣輸出 `src`，與未註冊解析器時相同。註冊解析器本身不會有任何效果；只有在 `render` 的 `inlineImages` 選項為 `true` 時（見下文）才會參照它。實際範例請見[使用圖片](/zh-tw/guide/images)，兩種回呼型別請見[參考](/reference/)。

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` 是 `renderSvg` 的非同步版本：它會先預先擷取圖所需的網頁字型與影像資料，接著進行版面配置與轉譯。`renderSvgInto` 會轉譯並取代 id 為 `id` 的元素的子節點，預設會對 SVG 進行淨化（`trusted: true` 會略過淨化；`sanitize` 會取代內建的清理器）。失敗（包括錯誤的引數）都會以 promise 拒絕的形式呈現，錯誤類別與 `renderSvg` 相同；找不到元素 id 時，會以 `ERR_INVALID_ARG_VALUE` 拒絕。字型問題絕不會導致拒絕；它們會在 `fontIssues` 中回傳。請見[在瀏覽器中使用](/zh-tw/guide/browser)與[使用圖片](/zh-tw/guide/images)，以及[參考](/reference/)。

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

較低階的協調機制，供需要把版面配置與轉譯當成獨立步驟來驅動的呼叫者使用。`renderSvg` 是建立在這之上的便利包裝函式：建構一個內容、註冊引擎／轉譯器、`layout`、`renderWithContext`、`freeLayout`。只有在您需要這種控制時，才直接使用這些——例如註冊引擎的子集、加入自訂的 `LayoutEngine` 或 `RendererPlugin`，或是在不重新執行版面配置的情況下，將同一個已完成版面配置的圖轉譯為多種格式（呼叫 `layout` 一次，接著對每種格式呼叫 `renderWithContext`，最後呼叫 `freeLayout`）。[參考](/reference/)。

## `@knowvah/dot-engine/api`

以程式方式建構、安全地插入邊，以及讀出計算完成的幾何——這一層讓您無需手寫 DOT 文字就能建構圖，並以純資料的形式讀回其版面配置。`LayoutSnapshot` 及其巢狀形式請見[型別](/zh-tw/guide/types)。

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

建立一個全新的圖，可直接交給 `render` / `getLayout` / `getDrawOps`。預設值：`directed: true`、`strict: false`、`name: ''`。回傳 `GvGraphBuilder`——`addNode`、`addEdge`、`addSubgraph`、`setAttr`/`getAttr`、`setHtmlAttr`（用於 HTML 表格標籤），以及公開不透明 `Graph` 控制代碼的 `.graph` 屬性。請見[以程式碼建構圖](/zh-tw/guide/build-a-graph)，完整的 `GvGraphBuilder`/`GvNode`/`GvEdge` 介面請見[參考](/reference/)。

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

較低階的邊插入輔助函式，是 `GvGraphBuilder.addEdge` 的基礎——直接匯出，供使用內部 `Node`/`Edge` 參考的呼叫者使用（例如在 `parse()` 回傳的圖上加入邊），而不是建構器的不透明 `GvNode`/`GvEdge` 控制代碼。多數呼叫者應改用 `createGraph(...).addEdge(tail, head, attrs?)`。

- **`name`**——邊的鍵；預設為 `''`（匿名）。在 strict 圖的去重複中會被忽略，去重複只依 `(tail, head)` 比對（無向圖則為對稱）。
- **回傳**新的邊；若 `g` 是 strict 圖且 `(tail, head)` 的邊已存在，則回傳既有的那一條（與 `cflag=1` 的 `agedge` 相符）。

請見[以程式碼建構圖](/zh-tw/guide/build-a-graph)與[參考](/reference/)。

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

回傳圖計算出的幾何的純粹、可 JSON 序列化快照——節點位置、邊樣條的控制點、邊標籤、叢集邊界框，以及整體圖邊界——全部以點為單位。

- **`g`**——必須已完成版面配置（透過 `render(g, ...)`、`getDrawOps(g)` 或 `ctx.layout(g, engine)`）；對尚未完成版面配置的圖呼叫 `getLayout` 會擲出錯誤，而不是悄悄地回傳全為零的幾何。
- **`opts.yAxis`**——預設為 `'down'`：螢幕座標，原點在左上角，y 向下遞增，`bounds` 會正規化到 `(0, 0)`。`'up'` 則回傳 Graphviz 原生座標（原點在左下角，y 向上遞增），`bounds.x`/`bounds.y` 位於原始的左下角。
- **擲出**：若 `g` 尚未完成版面配置，則擲出 `code` 為 `ERR_INVALID_STATE` 的 `Error`；`g` 或 `opts` 不正確時，則擲出 `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`。請見[錯誤與例外](/zh-tw/guide/errors)。

節點的 `width`/`height` 會轉換為點（內部模型以英吋儲存）；其他所有座標本來就是以點為單位。座標系的詳細說明請見[讀取計算出的幾何資訊](/zh-tw/guide/geometry)，完整的 `LayoutSnapshot`、`NodeGeometry`、`EdgeGeometry`、`ClusterGeometry` 與 `BoundsGeometry` 欄位清單請見[型別](/zh-tw/guide/types) / [參考](/reference/)。

### `Graph`

從內部模型重新匯出的不透明控制代碼型別。只公開*型別*（而非可變動的類別）——您可以用它為持有建構器 `.graph` 或 `parse()` 結果的變數加上型別註記，但不要直接建構它或檢視它的欄位；請改用建構器、`getLayout` 或 `getDrawOps` 讀回狀態。[參考](/reference/)。

## `@knowvah/dot-engine/render`

多格式輸出與原始繪製操作存取——這一層用於轉譯已經 `parse` 或由建構器建構的圖。

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

對圖進行版面配置，並轉譯為所要求格式的字串。

- **`format`**——`OutputFormat`：`'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`。
- **`opts.engine`**——版面配置引擎（預設為 `'dot'`）。
- **`opts.inlineImages`**——請見[下文](#inlineimages)。
- **擲出**：版面配置或轉譯失敗時為 `RenderError`；dot-engine 本身的錯誤為 `InternalError`；引數無效（包括未註冊的引擎或格式）時，為帶有 `code` 的 `TypeError`。請見[錯誤與例外](/zh-tw/guide/errors)。

`opts.engine` 對應 `renderSvg` 的 `engine` 參數；`format` 則是 `renderSvg` 未公開的那條軸（`renderSvg` 固定為 `'svg'`）。完整的 `OutputFormat` 聯集與 `RenderOptions` 形式，請見[轉譯為其他格式](/zh-tw/guide/render-formats)與[參考](/reference/)。

#### `inlineImages`

`RenderOptions.inlineImages`（預設為 `false`）會將外部影像內嵌為 `data:` URI，而不是原樣輸出 `xlink:href="src"`。除非已透過 `setImageResolver`（見上文）註冊解析器，否則不會有任何效果——對非 SVG 格式也沒有效果。若未設定，輸出會與此選項出現之前的版本逐位元組相同。

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

完整指南請見[使用圖片](/zh-tw/guide/images)，包括在瀏覽器中從 `fetch` 解析，以及在 Node 中從檔案系統解析。

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

`render` 的非同步版本：相同的格式與 `engine`/`inlineImages` 選項，另外加上每次呼叫專屬的非同步影像掛鉤，以及字型預先擷取。每個影像掛鉤對每個不同的 `src` 最多執行一次；擲出或拒絕都視為未命中。對於標記式格式，輸出為未經淨化的標記；請見 README 的「Security」一節。

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

對 `g` 進行版面配置、轉譯為 xdot，並回傳一個扁平、具型別的繪製操作陣列——節點形狀、文字區段、色彩與字型，皆為辨別聯集的值（在 `switch` 中依 `op.kind` 縮小型別）——可用來餵給自訂的 canvas/WebGL/PDF 轉譯器，而不必碰 SVG 或 xdot 的字串編碼。`opts.engine` 預設為 `DEFAULT_DRAW_ENGINE`（`'dot'`）。

- **擲出**：若中間產生的 xdot 輸出無法重新剖析，則為 `ParseError`（這是 dot-engine 本身的錯誤；實務上不應發生）；版面配置／轉譯失敗時為 `RenderError`；其他任何 dot-engine 錯誤為 `InternalError`；引數無效時，為帶有 `code` 的 `TypeError`。請見[錯誤與例外](/zh-tw/guide/errors)。

操作種類清單與完整的 canvas 範例，請見[以 xdot 繪製操作自訂轉譯](/zh-tw/guide/xdot-drawops)；完整的 `XdotOp` 聯集與 `Xdot`/`XdotColor` 形式，請見[型別](/zh-tw/guide/types) / [參考](/reference/)。
