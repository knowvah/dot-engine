---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API 参考

公共接口刻意保持精简。大多数调用者只需要 `renderSvg`。使用哪个入口点，参见[概览](/zh-cn/guide/overview)；每个函数接收和返回的结构，参见[类型](/zh-cn/guide/types)；详尽的签名、每个字段以及每个重载，参见生成的[参考](/reference/)。

> 类型声明（`.d.ts`）由 `npm run build` 生成（`build:types` 步骤会运行 `tsc -p tsconfig.build.json`）。`package.json` 的 `exports` 映射为每个入口都接入了 `types` 条件，因此 `@knowvah/dot-engine`、`@knowvah/dot-engine/api` 和 `@knowvah/dot-engine/render` 在编辑器和下游构建中都能解析出类型。
>
> 构建还会生成声明映射（`.d.ts.map`）和 JS source map，并且软件包随附其 `src/` 源代码——因此“转到定义”会直接跳到真实的 TypeScript，便于阅读代码并提交 PR。

本页按三个入口点组织（何时使用哪一个，参见[概览](/zh-cn/guide/overview)）：根包 `@knowvah/dot-engine`（一次调用完成解析加渲染，外加进程全局配置）、`@knowvah/dot-engine/api`（用代码构建图，读回计算出的几何信息），以及 `@knowvah/dot-engine/render`（多格式输出和原始绘制操作）。下面的每个函数也都会从根包重新导出（`src/index.ts` 中的 `export * from './api/index.js'` / `export * from './render/index.js'`）——从 `@knowvah/dot-engine` 导入全部内容是可行的，但子路径导入能更明确地表明您接触的是哪一层。

## `@knowvah/dot-engine`（根入口）

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

解析 DOT 源代码，运行指定的[布局引擎](/zh-cn/guide/engines)，渲染为 SVG，并返回 SVG 字符串。这是一次调用即可完成的便捷封装：它会构造一个 `GvcContext`，注册八个内置引擎和 SVG 渲染器，执行布局、渲染并释放布局——如果需要把这些步骤分开，参见下文的 [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)。

- **`dotSource`**——DOT 语言的图源代码。
- **`engine`**——`EngineName`：内置引擎之一（`dot`、`neato`、`fdp`、`sfdp`、`circo`、`twopi`、`osage`、`patchwork`）或任何自定义注册的名称。
- **抛出**：输入出现任何问题时抛出 `DotEngineError`：`dotSource` 无效时为 `ParseError`，布局或渲染失败时为 `RenderError`，dot-engine 的缺陷则为 `InternalError`（带 `cause`）。如果 `dotSource` 或 `engine` 无效（包括未注册的引擎名称），则抛出 `code` 为 `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` 的 `TypeError`。参见[错误与异常](/zh-cn/guide/errors)。

完整的签名、JSDoc 和 `GvError` 字段列表：[参考](/reference/)。

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg` 的结果式对应版本。对任何 DOT 输入都会返回（从不抛出）：成功时为 `{ svg }`，首次失败时为 `{ errors: [one] }`；`svg` 与 `errors` 互斥。它只对无效参数抛出（`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`）。`errors` 中的每一项都是纯粹的、可 JSON 序列化的数据（`type`、`code`、`message`、`friendlyMessage`，存在时还有 `location` / `expected`；没有 `cause`，没有栈跟踪），因此可以放心地跨 worker/postMessage 边界发送，或序列化到日志中。当调用方希望根据 `code` / `type` 分支处理，而不是捕获异常时，优先使用它，而不是 `renderSvg` 加 `try`/`catch`。参见[错误与异常](/zh-cn/guide/errors)。[参考](/reference/)。

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

将 DOT 解析为内存中的图模型，**而不**进行布局。适用于在渲染之前检查或转换图——或者把它交给 `@knowvah/dot-engine/api` 的 `getLayout` / `@knowvah/dot-engine/render` 的 `render`。

- **抛出**：语法错误或边方向违规（例如无向图中的 `->`）时抛出 `ParseError`。`ParseError` 继承自 `DotEngineError`，并以 `type: 'syntax'` 实现 `GvError`；它带有 `location: { line, column, offset? }`。如果 `dotSource` 不是字符串，则抛出 `TypeError` `ERR_INVALID_ARG_TYPE`。[错误与异常](/zh-cn/guide/errors)，[参考](/reference/)。

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

`instanceof DotEngineError` 表示 dot-engine 在此输入上失败。`RenderError` 涵盖已知的布局/渲染失败（对于 `UNKNOWN_LAYOUT` 和 `UNSUPPORTED_FEATURE`，`type` 为 `semantic`）。`InternalError` 是 dot-engine 的缺陷；当错误被包装时，`cause` 保存原始错误。调用方的错误则改为抛出带 `code` 的标准 `TypeError` / `RangeError` / `Error`。`isGvError` 检查是否有字符串类型的 `type` 和 `code`，因此可跨重复的打包使用。每个错误码以及每个函数可能抛出的内容，参见[错误与异常](/zh-cn/guide/errors)；`GvError` 的结构参见[类型](/zh-cn/guide/types)；`GvErrorCode` 的成员列表参见[参考](/reference/)。

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

注册（或用 `null` 清除）进程全局的文本测量器，布局期间会查询它来确定标签的尺寸。清除后会回退到库的默认值（浏览器：`CanvasTextMeasurer`；无头/Node：`EstimateTextMeasurer`，除非接入了 LUT 测量器）——完整的解析顺序，以及与这些函数一同导出的 `CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` 实现，参见[文本测量](/zh-cn/guide/text-measurement)。[参考](/reference/)。

### `setImageSizer` / `setImageResolver`

两个相关但不同的图像配置替换点——都是进程全局的注册表，遵循相同的模式（注册一个回调，传入 `null` 清除），在调用方注册之前都不起作用：

- **`setImageSizer`**——报告外部图像的*固有尺寸*，使布局引擎能在渲染之前为 HTML `<IMG>` 单元格或节点的 `image=` 属性预留空间。返回 `null`（或不注册任何 sizer）会重现原生 Graphviz 对缺失图像的行为：一条警告和零尺寸。
- **`setImageResolver`**（新增——参见下文的 [`inlineImages`](#inlineimages)）——提供实际的图像*字节*，使 SVG 渲染器能把它们内联为 `data:` URI，而不是把 `xlink:href="src"` 原样透传输出。

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` 可以返回裸的 `Uint8Array`（MIME 由 `src` 的文件扩展名推断——`.png`、`.jpg`/`.jpeg`、`.gif`、`.svg`、`.webp`；其他一律回退为 `application/octet-stream`），也可以返回 `{ bytes, mime }` 来显式设置 MIME 类型。当无法解析 `src` 时返回 `null`——渲染器会回退为原样透传 `src`，与未注册 resolver 时相同。注册 resolver 本身没有任何效果；只有当 `render` 的 `inlineImages` 选项为 `true`（见下文）时才会查询它。完整的示例参见[使用图像](/zh-cn/guide/images)，两种回调类型参见[参考](/reference/)。

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

`renderSvgAsync` 是 `renderSvg` 的异步对应版本：它会预取图所需的 Web 字体和图像数据，然后布局并渲染。`renderSvgInto` 渲染后会替换 id 为 `id` 的元素的子节点，默认会对 SVG 进行清理（`trusted: true` 会跳过清理；`sanitize` 会替换内置的清理器）。失败（包括参数有误）表现为 promise 被拒绝，所用的错误类与 `renderSvg` 相同；元素 id 缺失时以 `ERR_INVALID_ARG_VALUE` 拒绝。字体问题从不会导致拒绝；它们通过 `fontIssues` 返回。参见[在浏览器中使用](/zh-cn/guide/browser)和[图像](/zh-cn/guide/images)，以及[参考](/reference/)。

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

面向需要把布局和渲染作为独立步骤来驱动的调用者的较底层编排。`renderSvg` 正是对此的便捷封装：构造一个上下文，注册引擎/渲染器，`layout`、`renderWithContext`、`freeLayout`。只有在需要这种控制权时才直接使用它们——例如，只注册一部分引擎、添加自定义的 `LayoutEngine` 或 `RendererPlugin`，或者把同一张已布局的图渲染为多种格式而无需重新运行布局（调用一次 `layout`，然后对每种格式调用 `renderWithContext`，最后 `freeLayout`）。[参考](/reference/)。

## `@knowvah/dot-engine/api`

以编程方式构造、安全的边插入，以及计算出的几何信息读出——这一层用于在不手写 DOT 文本的情况下构建图，并把它的布局作为纯数据读回。`LayoutSnapshot` 及其嵌套结构参见[类型](/zh-cn/guide/types)。

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

创建一张新图，可随时交给 `render` / `getLayout` / `getDrawOps`。默认值：`directed: true`、`strict: false`、`name: ''`。返回一个 `GvGraphBuilder`——`addNode`、`addEdge`、`addSubgraph`、`setAttr`/`getAttr`、`setHtmlAttr`（用于 HTML 表格标签），以及一个暴露不透明 `Graph` 句柄的 `.graph` 属性。参见[用代码构建图](/zh-cn/guide/build-a-graph)，完整的 `GvGraphBuilder`/`GvNode`/`GvEdge` 接口参见[参考](/reference/)。

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

位于 `GvGraphBuilder.addEdge` 之下的较底层边插入辅助函数——直接导出，供使用内部 `Node`/`Edge` 引用的调用者使用（例如添加到 `parse()` 所返回的图上的边），而不是使用构建器不透明的 `GvNode`/`GvEdge` 句柄。大多数调用者应改用 `createGraph(...).addEdge(tail, head, attrs?)`。

- **`name`**——边的键；默认为 `''`（匿名）。在 strict 图的去重中会被忽略，去重仅按 `(tail, head)` 匹配（对无向图是对称的）。
- **返回**新边；如果 `g` 是 strict 图且已存在 `(tail, head)` 边，则返回已有的那一条（对应带 `cflag=1` 的 `agedge`）。

参见[用代码构建图](/zh-cn/guide/build-a-graph)和[参考](/reference/)。

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

返回图计算出的几何信息的纯粹、可 JSON 序列化的快照——节点位置、边样条控制点、边标签、簇边界框以及整体图边界——全部以点为单位。

- **`g`**——必须已经布局（通过 `render(g, ...)`、`getDrawOps(g)` 或 `ctx.layout(g, engine)`）；对尚未布局的图调用 `getLayout` 会抛出，而不是悄悄返回全零的几何信息。
- **`opts.yAxis`**——默认为 `'down'`：屏幕坐标，原点在左上角，y 向下增大，`bounds` 归一化到 `(0, 0)`。`'up'` 返回原生 Graphviz 坐标（原点在左下角，y 向上增大），`bounds.x`/`bounds.y` 位于原始的左下角。
- **抛出**：如果 `g` 尚未布局，抛出 `code` 为 `ERR_INVALID_STATE` 的 `Error`；`g` 或 `opts` 有误时抛出 `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`。参见[错误与异常](/zh-cn/guide/errors)。

节点的 `width`/`height` 会转换为点（内部模型以英寸存储）；其他所有坐标已经以点为单位。坐标系的说明参见[读取计算出的几何信息](/zh-cn/guide/geometry)，完整的 `LayoutSnapshot`、`NodeGeometry`、`EdgeGeometry`、`ClusterGeometry` 和 `BoundsGeometry` 字段列表参见[类型](/zh-cn/guide/types) / [参考](/reference/)。

### `Graph`

从内部模型重新导出的不透明句柄类型。只公开了*类型*（而不是可变的类）——请用它来标注保存构建器 `.graph` 或 `parse()` 结果的变量，但不要直接构造它或检查其字段；请使用构建器、`getLayout` 或 `getDrawOps` 把状态读出来。[参考](/reference/)。

## `@knowvah/dot-engine/render`

多格式输出和原始绘制操作访问——这一层用于渲染已经 `parse` 的或由构建器构造的图。

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

对图进行布局，并渲染为所请求格式的字符串。

- **`format`**——`OutputFormat`：`'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`。
- **`opts.engine`**——布局引擎（默认 `'dot'`）。
- **`opts.inlineImages`**——参见[下文](#inlineimages)。
- **抛出**：布局或渲染失败时抛出 `RenderError`；dot-engine 的缺陷时抛出 `InternalError`；参数无效（包括未注册的引擎或格式）时抛出带 `code` 的 `TypeError`。参见[错误与异常](/zh-cn/guide/errors)。

`opts.engine` 对应 `renderSvg` 的 `engine` 参数；`format` 则是 `renderSvg` 没有暴露的维度（`renderSvg` 硬编码为 `'svg'`）。完整的 `OutputFormat` 联合类型和 `RenderOptions` 结构，参见[渲染为其他格式](/zh-cn/guide/render-formats)和[参考](/reference/)。

#### `inlineImages`

`RenderOptions.inlineImages`（默认 `false`）会把外部图像内联为 `data:` URI，而不是原样透传 `xlink:href="src"`。除非通过 `setImageResolver`（见上文）注册了 resolver，否则它不起作用——并且对非 SVG 格式也不起作用。不设置时，输出与该选项出现之前逐字节一致。

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

完整指南参见[使用图像](/zh-cn/guide/images)，其中包括在浏览器中通过 `fetch` 解析，以及在 Node 中从文件系统解析。

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

`render` 的异步对应版本：格式和 `engine`/`inlineImages` 选项相同，另外还有每次调用的异步图像钩子和字体预取。每个图像钩子对每个不同的 `src` 至多运行一次；抛出或拒绝都视为未命中。对于标记类格式，输出是未经清理的标记；参见 README 的 “Security” 一节。

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

对 `g` 进行布局，渲染为 xdot，并返回扁平的、带类型的绘制操作数组——节点形状、文本片段、颜色和字体，均为可辨识联合类型的值（在 `switch` 中根据 `op.kind` 收窄）——用于馈送自定义的 canvas/WebGL/PDF 渲染器，而无需接触 SVG 或 xdot 的字符串编码。`opts.engine` 默认为 `DEFAULT_DRAW_ENGINE`（`'dot'`）。

- **抛出**：如果中间生成的 xdot 输出无法重新解析，抛出 `ParseError`（dot-engine 的缺陷；实际中不应出现）；布局/渲染失败时抛出 `RenderError`；任何其他 dot-engine 缺陷抛出 `InternalError`；参数无效时抛出带 `code` 的 `TypeError`。参见[错误与异常](/zh-cn/guide/errors)。

操作类型列表和完整的 canvas 示例参见[用 xdot 自定义渲染](/zh-cn/guide/xdot-drawops)，完整的 `XdotOp` 联合类型以及 `Xdot`/`XdotColor` 结构参见[类型](/zh-cn/guide/types) / [参考](/reference/)。
