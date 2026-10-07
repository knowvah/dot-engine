---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# 类型参考

公共类型的概念地图，按获取来源分组：`createGraph`/`parse`（构建与检查）、`getLayout`（几何快照）、`render`/`getDrawOps`（输出），以及根包（引擎、图像、文本测量、错误）。每个条目给出一个取自源代码的结构代码块和一句话的用途说明。若需要逐字段的详尽文档（包括继承的成员以及每个属性上的 JSDoc），参见生成的 [TypeDoc 参考](/reference/)。

本页不重复坐标系的详细讲解——请参见[读取计算出的几何信息](/zh-cn/guide/geometry)。不过，凡是类型的字段依赖于坐标系的地方，本页都会简要重申 y 轴的说明。

## 构建与检查（`@knowvah/dot-engine` / `@knowvah/dot-engine/api`）

### `Graph`

指向内部图模型的不透明句柄。由 `parse()` 和 `createGraph().graph` 返回。把它传给 `render`、`getLayout` 和 `getDrawOps`；不要直接构造或检查它——构建器和解析器是生成它的唯一受支持方式。

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph` 的选项。`directed`/`strict` 会选定四种 `GraphKind` 之一（有向、无向、strict 有向、strict 无向）；`name` 设置图的名称（默认 `''`）。

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

由 `builder.addNode(...)` 返回的图节点的不透明句柄。`setHtmlAttr` 会把该值标记为 HTML 式标签（相当于 DOT 文本中的 `label=<...>`），使布局引擎按标记来测量它。

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

由 `builder.addEdge(...)` 返回的图边的不透明句柄。

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

由 `createGraph(...)` 返回。`addSubgraph` 返回一个限定在该子图范围内的嵌套构建器；通过它添加的节点同时也是根图的成员。`.graph` 是交给 `render`/`getLayout`/`getDrawOps` 的交接点。参见[用代码构建图](/zh-cn/guide/build-a-graph)。

## 几何快照（`getLayout`）

::: tip 坐标系
原生 Graphviz 坐标是 y 轴向上的（原点在左下角）。`getLayout` 默认使用 `yAxis: 'down'`（原点在左上角，屏幕约定），并翻转每个 y 坐标；传入 `{ yAxis: 'up' }` 即可得到原生 Graphviz 坐标。完整讲解：[读取计算出的几何信息](/zh-cn/guide/geometry)。
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout` 的选项。默认 `yAxis: 'down'`。

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

图计算出的几何信息的纯粹、可 JSON 序列化的快照，由 `getLayout(g, opts?)` 返回。`clusters` 会递归列出每个簇子图（嵌套的簇各自有一个条目）；对于没有簇的图，它为空。

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

整体边界框，以点为单位。在 `yAxis: 'down'` 下，`x`/`y` 归一化为 `(0, 0)`。在 `yAxis: 'up'` 下，`x`/`y` 是图边界框原始的左下角。

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

每个节点的几何信息。`x`/`y` 是节点中心。`width`/`height` 以**点**为单位——模型以英寸存储它们（`ND_width`/`ND_height`）；`getLayout` 在返回之前会乘以 72。

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

每条边的几何信息。`points` 按顺序拼接了已路由样条的每个贝塞尔控制点（如果边没有已路由的样条，则为空）。只有当边带有居中标签时才会有 `label`。

`tailLabel` 和 `headLabel` 是 `taillabel`/`headlabel` 端口标签的位置。两者都只有在布局放置了它们之后才会存在——与 `render()` 输出其 `<text>` 的条件相同——因此，无法放置的端口标签（例如没有已路由样条的边）会被报告为不存在，而不是位于原点处的标签。

`xlabel` 是 `xlabel` 外部标签的位置。与 `label` 不同，它是由 Graphviz 对边周围的候选位置进行的力放置搜索所选定的，因此无法从 `label` 或样条中点推导出来。它带有同样的“仅在放置后才有”的门槛：搜索中无法容纳的已声明 xlabel 会被报告为不存在，正如 `render()` 不会绘制它一样。

`sp` 和 `ep` 是尾端和头端的箭头附着点。当某一端带有箭头时，样条会被缩短以留出空间，箭头从终端控制点延伸到该点——因此自行绘制箭头的使用方可以直接在此读取箭尖，而不必外推。仅当该端确实带有箭头时才会存在，所以一条普通的 `digraph { a -> b }` 边会报告 `ep` 而没有 `sp`，而 `arrowhead=none` 则两者都不报告。

这些是节点边界上的附着点。Graphviz 自己的渲染器会将所绘制的箭头多边形，按与线宽（penwidth）有关的量，从这些点向内缩进，所以 `ep` 是箭头应绘制*到*的点，而不是所渲染箭尖的副本。

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

每个簇的边界框。`name` 是簇子图的名称（例如 `cluster6`）；嵌套的簇把它们的层级编码在名称中，因此不会暴露显式的父级链接。遵循与 `BoundsGeometry` 相同的坐标系约定。

`label` 是簇标题的位置，仅当簇声明了标题时才存在。它的 `x`/`y` 是标签空间的**中心**——与 `EdgeGeometry.label` 一致，而不是上面框的角点 `x`/`y`——`width`/`height` 是测量出的文本尺寸，因此标签框为 `[x - width/2, x + width/2] × [y - height/2, y + height/2]`，并且始终位于簇框之内。请注意，这是标签的*中心*，而 `render()` 输出的 `<text>` 带的是基线，基线位置更靠下。

## 渲染（`@knowvah/dot-engine/render`）

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

`render(g, format, opts?)` 所接受格式的封闭联合类型。参见[渲染为其他格式](/zh-cn/guide/render-formats)。

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render` 的选项。`engine` 默认为 `'dot'`。`inlineImages`（新增）默认为 `false`；为 `true` 时，SVG 输出器会通过查询经由 `setImageResolver` 注册的 resolver，把外部图像（`image=`/HTML `<IMG>`）内联为 `data:` URI——resolver 未命中或未注册时，会回退为原样透传 `src`。对非 SVG 格式没有影响。参见[使用图像](/zh-cn/guide/images)。

::: warning `yAxis` 不是 `RenderOptions` 的字段
坐标方向只属于 `getLayout` 的范畴。`render` 生成的原始格式字符串携带的是原生的 y 轴向上坐标；如果您需要 y 轴向下，且没有经过 `getLayout`，请在后处理中翻转。
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps` 的选项。`engine` 默认为 `'dot'`。

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

一个 xdot 属性流的解析结果：解码后的绘制操作数组，加上一个解析状态标志位掩码。`getDrawOps` 只返回图上所有绘制属性展平后的 `XdotOp[]`，按绘制顺序排列（图 → 节点 → 边）——完整的操作类型表和 canvas 示例参见[用 xdot 自定义渲染](/zh-cn/guide/xdot-drawops)。

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

单个解码后的 xdot 绘制操作，以 `kind` 作为判别字段。每个变体都带有一个以其形状命名的载荷属性——在 `switch` 中根据 `kind` 收窄即可安全地访问它。坐标以点为单位，采用原生的 y 轴向上坐标系（对于 y 轴向下的 canvas 需要翻转——参见上面链接的指南）。

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

解析后的 xdot 填充/描边颜色：纯色，或线性/径向渐变（`XdotLinearGrad`/`XdotRadialGrad` 各自带有 `x0,y0,x1,y1[,r0,r1]`，外加一个 `stops: { frac: number; color: string }[]` 数组）。

## 根包（`@knowvah/dot-engine`）

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

布局引擎名称。注册表是开放的（自定义引擎可以注册到 `GvcContext` 上），因此接受任意字符串；`(string & {})` 在不封闭该集合的前提下，保留了编辑器对内置引擎的自动补全。参见[布局引擎](/zh-cn/guide/engines)。

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

注册一个回调，返回由 `image=` 或 HTML `<IMG>` 单元格引用的外部图像的固有尺寸，用于布局时确定尺寸。当尺寸未知时返回 `null`（与 C 版对缺失图像的行为一致——一个零尺寸的单元格外加一条警告）。向 `setImageSizer` 传入 `null` 可清除先前设置的 sizer。参见[在浏览器中使用](/zh-cn/guide/browser)。

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

注册一个回调，返回外部图像的原始字节，当 `RenderOptions.inlineImages` 为 `true` 时会查询它。如果返回裸的 `Uint8Array`，会根据 `src` 的文件扩展名推断其 MIME 类型。`null`（来自 resolver，或未注册 resolver）会回退为原样透传 `src`。参见[使用图像](/zh-cn/guide/images)。

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

可插拔的文本测量，通过 `setTextMeasurer` 安装（内置三种：`EstimateTextMeasurer`、`LutTextMeasurer`、`CanvasTextMeasurer`）。`yoffsetCenterline`/`yoffsetLayout` 是可选的垂直度量（基线→中线、基线→上升部）；省略它们则回退为经 pango 校准的默认值。参见[文本测量](/zh-cn/guide/text-measurement)。

### `RenderResult` 与错误

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

`tryRenderSvg(dotSource, engine)` 是 `renderSvg` 的结果式对应版本：成功时返回 `{ svg }`，首次失败时返回 `{ errors: [one] }`，而不是抛出。对任何 DOT 输入它都会返回，只有参数无效时才抛出。`errors` 中的条目是纯数据，没有 `cause`，也没有栈。

dot-engine 抛出的每个错误都继承自抽象的 `DotEngineError`，并实现 `GvError`：

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

对于无效的 DOT 源代码，`renderSvg` 抛出 `ParseError`；对于布局/渲染阶段的失败抛出 `RenderError`；对于 dot-engine 的缺陷抛出 `InternalError`。调用方的错误则抛出标准的 `TypeError` / `RangeError` / `Error`，其 `code` 为某个 `UsageErrorCode`（`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`）；这些不是 `GvError`。希望在不使用 `try`/`catch` 的情况下获得结构化错误的调用者，应改用 `tryRenderSvg`。每个错误码参见[错误与异常](/zh-cn/guide/errors)。

## 关系

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

## 哪个类型来自哪个调用

| 调用 | 返回 |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder`（嵌套） |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string`（抛出 `DotEngineError`，或用法类 `TypeError`） |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

上面每个类型的每个字段——包括本页只作了概述的那些——参见生成的 [TypeDoc 参考](/reference/)。坐标系的深入讲解（含示例）参见[读取计算出的几何信息](/zh-cn/guide/geometry)。
