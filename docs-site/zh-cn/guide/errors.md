---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 错误与异常

dot-engine 会抛出两类错误。您捕获到的是哪一类，就说明需要由谁来做出改变。

## 两个家族，一条规则

| 家族 | 如何识别 | 含义 | 由谁处理 |
|--------|---------------------|---------|----------|
| dot-engine 失败 | `err instanceof DotEngineError` | dot-engine 在此输入上失败：DOT 有误、Graphviz 自己也会报告的致命错误、不受支持的 Graphviz 功能，或 dot-engine 自身的缺陷 | DOT 作者，或提交缺陷报告 |
| 用法错误 | 标准的 `TypeError` / `RangeError` / `Error`，其 `err.code` 以 `ERR_` 开头 | 调用有误：参数类型错误、引擎或格式名称未知、调用顺序错误 | 调用方代码 |

请根据 `.code` 分支处理，而不要根据消息文本。消息在不同版本之间可能改变；错误码则是稳定的。

用法错误不是 `DotEngineError`，也不实现 `GvError`。它们的 `name` 保持为 `TypeError`、`RangeError` 或 `Error`，与 Node.js 中一样。

## 类参考

下面的四个类都继承自 `DotEngineError`，并实现 `GvError` 结构（`type`、`code`、`message`、`friendlyMessage`，以及可选的 `location` 和 `expected`）。

### `DotEngineError`（抽象类）

公共基类。对于 dot-engine 就其输入而抛出的每一个错误，`instanceof DotEngineError` 都为真。它不能被直接构造。`type`、`code` 和 `friendlyMessage` 由子类定义。

### `ParseError`

| 项目 | 值 |
|------|-------|
| 抛出时机 | DOT 源代码无效，或使用了与图类型不符的边运算符 |
| `type` | `syntax` |
| 错误码 | `SYNTAX_ERROR`、`SYNTAX_UNEXPECTED_EOF`、`EDGE_OP_DIRECTED_IN_UNDIRECTED`、`EDGE_OP_UNDIRECTED_IN_DIRECTED`、`GENERIC_ERROR` |
| 字段 | `location`（`{ line, column, offset? }`）、`expected`（解析器的预期；仅限 `SYNTAX_*`）、`line` 和 `column` 的 getter |
| 调用方应采取的操作 | 修正 DOT 源代码。向作者展示 `location` 和 `friendlyMessage` |

`ParseError` 上的 `GENERIC_ERROR` 表示源代码嵌套得太深，解析器耗尽了栈空间。

### `HtmlParseError`

| 项目 | 值 |
|------|-------|
| 抛出时机 | 目前不会到达调用方（见下文） |
| `type` | `semantic` |
| 错误码 | `HTML_PARSE_ERROR` |
| 字段 | `tag`（出错的记号）。没有 `location` 或 `expected` |
| 调用方应采取的操作 | 无。要找出有问题的标签，请把渲染输出与您的预期进行比较 |

HTML 式标签解析器会针对未知元素、格式错误的属性，或放错位置的 `<TABLE>`、`<HR>` 或 `<VR>` 抛出 `HtmlParseError`。布局阶段会捕获它，并像 Graphviz 一样让该标签没有内容：图仍会渲染，只是标签为空。没有任何公共函数会将它向外传播。

`HtmlParseError` 不会从包的根入口导出。如果真有一个到达了您这里，可以用 `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` 来识别它。

### `RenderError`

| 项目 | 值 |
|------|-------|
| 抛出时机 | 布局或渲染以 Graphviz 自己也会报告的方式失败、图指定了不可用的布局引擎，或图使用了 dot-engine 尚未移植的 Graphviz 功能 |
| `type` | `RENDER_ERROR` 为 `render`；`UNKNOWN_LAYOUT` 和 `UNSUPPORTED_FEATURE` 为 `semantic` |
| 错误码 | `RENDER_ERROR`、`UNKNOWN_LAYOUT`、`UNSUPPORTED_FEATURE` |
| 字段 | 当失败包装了另一个错误时，有 `cause`。没有 `location` |
| 调用方应采取的操作 | `RENDER_ERROR`：修改图。`UNKNOWN_LAYOUT`：修正 `layout=` 属性。`UNSUPPORTED_FEATURE`：避开该功能（例如带 `rotation=45` 的 sfdp；参见[表格](#unsupported-feature-reference)） |

### `InternalError`

| 项目 | 值 |
|------|-------|
| 抛出时机 | dot-engine 内部的断言或不变量失败，或非 dot-engine 的错误从布局或渲染管线中逃逸出来 |
| `type` | `render` |
| 错误码 | `INTERNAL_ERROR` |
| 字段 | `cause`（原始错误，当它被包装时） |
| 调用方应采取的操作 | 附上触发它的 DOT 源代码，提交缺陷报告 |

DOT 作者做任何修改，都无法可靠地避免 `InternalError`。

## 错误码参考

### `GvErrorCode`

| 错误码 | 类 | `type` | 含义 | 典型原因 | 调用方应采取的操作 | 由谁抛出 |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | 意外的记号 | 拼写错误，缺少 `;` 或 `}` | 在 `location` 处修正 DOT | `parse`、`renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | 源代码在语句中途结束 | 未闭合的 `{`、`[` 或字符串 | 在 `location` 处修正 DOT | `parse`、`renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | 无向图中出现 `->` | `graph { a -> b }` | 使用 `--` | `parse`、`renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | 有向图（digraph）中出现 `--` | `digraph { a -- b }` | 使用 `->` | `parse`、`renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | 源代码嵌套过深，无法解析 | 病态嵌套的子图 | 将 DOT 扁平化 | `parse`、`renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | 格式错误的 HTML 式标签 | 未知元素、错误的属性 | 无：该标签渲染为空 | 无（在内部被捕获） |
| `RENDER_ERROR` | `RenderError` | `render` | Graphviz 也会报告的致命布局或渲染错误 | 某个布局阶段的输入格式有误 | 修改图 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | 图的 `layout=` 属性所指名称没有对应的已注册引擎 | `layout="foo"` | 修正该属性 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | 图请求了 dot-engine 尚未移植的 Graphviz 功能 | 带 `rotation=45` 的 sfdp | 避开该功能 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine 的缺陷 | 断言失败、外来的抛出 | 提交缺陷报告 | `renderSvg`、`render`、`getDrawOps`、构建器方法、`GvcContext.layout`（未包装） |

### `UsageErrorCode`

| 错误码 | 类 | 含义 | 典型原因 | 调用方应采取的操作 | 由谁抛出 |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | 类型错误、`null`，或缺少必需参数 | `renderSvg(undefined, 'dot')`、`getLayout(null)` | 修正调用 | 每一个接收参数的公共函数 |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | 类型正确，但值未知 | 未注册的引擎或格式名称；`getLayout(g, { yAxis: 'other' })` | 使用已注册的名称或允许的值 | `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps`、`getLayout`、`GvcContext.layout`、`freeLayout`、`bestRenderer`、`renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | 数值参数超出其范围 | 保留 | 修正调用 | 目前没有公共函数会抛出它 |
| `ERR_INVALID_STATE` | `Error` | 在错误的状态下发起调用 | 布局之前调用 `getLayout` | 先布局（`render(g, ...)` 或 `ctx.layout`） | `getLayout` |

即使 DOT 源代码设置了有效的 `layout=` 属性，未注册的引擎参数也会被拒绝。参数会被最先检查。

## `UNSUPPORTED_FEATURE` 参考 {#unsupported-feature-reference}

在原生 Graphviz 会运行某种 dot-engine 尚未移植的算法时，下面的每个属性值都会让布局抛出错误码为 `UNSUPPORTED_FEATURE` 的 `RenderError`。另一种做法是渲染出与 Graphviz 不同的布局，却不加说明。只有当“触发条件”一列中的条件成立时，检查才会触发；同一个属性在其他情况下会正常渲染。要避免该错误，请移除该属性，或将其改为受支持的值。

| 引擎 | 属性与值 | 触发条件 | 所需的 Graphviz 功能 |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | 始终（在图有 2 个及以上节点且 `maxiter` 不为负之后） | 分层应力优化（stress majorization）（`stress_majorization_with_hierarchy`） |
| neato | `mode=ipsep` | 仅当 Graphviz 会构建约束时：`diredgeconstraints` 为真或为 `hier*`、`overlap=ipsep`，或图含有顶层簇。没有约束时，它按应力优化（stress majorization）运行，与 Graphviz 一致 | 带约束的最大化（`stress_majorization_cola`） |
| neato | `start=self` | `mode` 为 `major`（默认值）或 `ipsep` | 智能初始化（`smart_ini`）。在 `mode=KK` 或 `mode=sgd` 下，它每次渲染记录一次 `start=0 not supported with mode=self - ignored`，与 Graphviz 一致 |
| neato | `model=subset` | `mode` 为 `major` 或 `KK` | 子集距离模型 |
| neato | `model=circuit` | `mode` 为 `major`，或在连通图上为 `KK`。在非连通图上，没有 `pack` 或 `packmode` 的 `KK` 会记录一条警告并使用最短路径，与 Graphviz 一致 | 电路距离模型（`circuit_model`） |
| neato、twopi、circo、sfdp | `overlap=voronoi`（不区分大小写） | 图（对 twopi 是一个连通分量；对 sfdp 是整个图或一个连通分量）有 2 个及以上节点，且 Graphviz 自己的重叠计数（`countOverlap`，它检测节点多边形）大于 0。仅边界框相接触的节点不会触发。circo 仅在单连通分量的图上才会到达这里（在多个连通分量上，Graphviz 同样忽略 `overlap`）。sfdp 仅在 `overlap` 不是 prism 模式时才会到达这里 | Voronoi 重叠消除（`vAdjust`） |
| fdp | `overlap=` 为 `voronoi`、`oscale`、`vpsc`、`ipsep`、`ortho`、`ortho_yx`、`orthoxy`、`orthoyx`、`portho`、`portho_yx`、`porthoxy`、`porthoyx` 之一 | 在 `N:` 力迭代尝试之后才到达该模式，即这些尝试没有消除所有重叠时（或 `N` 为 0 或缺省）。允许 `N:` 前缀，例如 `3:voronoi` | 对应的 `removeOverlapWith` 调整算法 |
| fdp | `splines=compound` | 始终，无论有无簇 | 避开簇的边路由（`compoundEdges`） |
| sfdp | `smoothing=` 除 `none` 或 `0` 之外的任何值 | 始终 | `post_process_smoothing` |
| sfdp | `rotation=` 任意非零数值 | 始终 | 重叠消除之前的 `rotate()` |
| sfdp | `label_scheme=1` 到 `4` | 存在名为 `|edgelabel|...` 的节点，`overlap` 解析为 `prism` 模式，并且该方案为 3 或 4，或者该方案为 1 或 2 且 prism 尝试次数大于 0（带计数的 `overlap=prism`，而不是默认的 `prism0`）。大于 4 的值按 0 计。普通的边标签从不触发 | 边标签节点处理（`edge_labeling_scheme`） |
| sfdp | `quadtree=none`（也包括 `0`、`false`） | 任何至少有一个节点的图。消息中会指明解析出的方案 | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast`（也包括 `2`） | 任何至少有一个节点的图。消息中会指明解析出的方案 | `spring_electrical_embedding_fast` |
| 所有引擎 | 由某个尚未移植的特殊 `round_corners` 情形绘制的节点形状 | 节点使用了该形状。消息：`special shape N not yet ported` | 该形状的 `round_corners` 绘制分支。这是针对没有绘制分支的形状编号的内部保护；目前不知道有任何具名形状会触及它 |

大多数消息的形式为 `<attribute>=<value>: <what> is not supported yet`。例外是 `smoothing` 和 `rotation`（它们指出缺失的例程）、fdp 各行以及形状这一行，它们使用上面列出的措辞。请根据 `err.code === 'UNSUPPORTED_FEATURE'` 分支处理，而不要根据文本。

选择默认值的取值（例如 `quadtree=normal`、`true`、`yes`、`1`），以及 Graphviz 接受且已移植的取值（例如 `start=regular`、`start=random`、`model=mds`、`mode=KK`、`mode=sgd`、`overlap=prism`、`scale` 系列，以及在 neato、twopi、circo 和 sfdp 上的 `overlap=oscale`、`vpsc` 和 `ortho*` / `portho*` 模式）都会正常渲染。

## 按函数的参考

“用法”指的是带 `ERR_INVALID_ARG_TYPE` 的 `TypeError`，除非某一行指明了其他错误码。

| 函数 | 可能抛出 |
|----------|-----------|
| `renderSvg(dotSource, engine)` | 用法（`dotSource` 或 `engine` 不是字符串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未注册）；`ParseError`；`RenderError`；`InternalError` |
| `tryRenderSvg(dotSource, engine)` | 用法（`dotSource` 或 `engine` 不是字符串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未注册）。除此之外没有别的：所有由 DOT 输入引起的失败都通过 `errors` 返回 |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE`（`dotSource` 不是字符串）；`ParseError` |
| `render(g, format, opts?)` | 用法（`g`、`format` 或 `opts` 类型错误）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎或格式未注册）；`RenderError`；`InternalError` |
| `getDrawOps(g, opts?)` | 用法（`g` 或 `opts` 类型错误）；`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.engine` 未注册）；`RenderError`；`ParseError`（中间生成的 xdot 无法重新解析：dot-engine 的缺陷）；`InternalError` |
| `createGraph(opts?)` 及构建器方法（`addNode`、`addEdge`、`addSubgraph`、`setAttr` 等） | 用法（参数类型错误，包括不是字符串的属性值）；`InternalError`（图模型未能创建节点或子图） |
| `addEdge(g, tail, head, name?)`（来自 `/api`） | 用法（`g`、`tail` 或 `head` 不是对象；`name` 不是字符串） |
| `getLayout(g, opts?)` | 用法（`g` 或 `opts` 不是对象）；`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.yAxis` 不是 `'up'` 或 `'down'`）；`Error` `ERR_INVALID_STATE`（图尚未布局） |
| `new GvcContext(measurer, options?)` | 用法（`measurer` 没有 `measure` 函数；`options` 不是对象） |
| `ctx.register(plugin)` | 用法（不是渲染器插件或布局引擎） |
| `ctx.layout(g, engine)` | 用法（`g` 不是对象，`engine` 不是字符串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未注册）；`RenderError` `UNKNOWN_LAYOUT`。引擎失败会不加包装地向外传播 |
| `ctx.freeLayout(g, engine)` | 用法；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未注册）。引擎失败会不加包装地向外传播 |
| `ctx.bestRenderer(format)` | 用法（`format` 不是字符串）；`TypeError` `ERR_INVALID_ARG_VALUE`（没有适用于 `format` 的渲染器） |
| `renderWithContext(ctx, g, format, inlineImages?)` | 用法（`ctx` 不是 `GvcContext`，`g` 不是对象，`format` 不是字符串）；`TypeError` `ERR_INVALID_ARG_VALUE`（没有适用于 `format` 的渲染器）。渲染失败会不加包装地向外传播 |
| `setImageSizer(sizer)` | 用法（不是函数或 `null`） |
| `setImageResolver(fn)` | 用法（不是函数或 `null`） |
| `setTextMeasurer(measurer)` | 用法（不是 `TextMeasurer` 或 `undefined`） |

### 哪些函数会包装外来的抛出

| 函数 | 遇到意外（非 dot-engine）抛出时的行为 |
|-----------|---------------------------------------------------|
| `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps` | 包装为 `InternalError`；`cause` 为原始错误 |
| `renderWithContext` 以及每个 `GvcContext` 方法 | **不加包装。**引擎的缺陷会以引擎抛出的原样到达调用方，例如一个没有 `code` 的普通 `TypeError` |

如果您直接使用 `GvcContext`，请把既不是 `DotEngineError` 也不是用法错误的错误，视为 dot-engine 的缺陷。

## `tryRenderSvg` 还是 `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT 有误或布局失败 | 抛出 `DotEngineError` | 返回 `{ errors: [one] }` |
| 参数有误 | 抛出用法错误 | 抛出用法错误 |
| 错误值 | 带栈和 `cause` 的 `Error` | 纯数据：`type`、`code`、`message`、`friendlyMessage`，存在时还有 `location` / `expected` |
| 适用场景 | 失败应当中止调用方 | 您要根据 `code` 分支处理，或要把错误通过 `postMessage` 发送出去或写入日志 |

对于任何 DOT 输入，`tryRenderSvg` 都不会抛出。只有当参数本身无效时它才会抛出，而这是调用方代码中的缺陷。它返回的错误对象不带 `cause`，也没有栈跟踪。

## 被包装的失败与 `cause`

当 `renderSvg`、`render` 或 `getDrawOps` 捕获到并非由 dot-engine 抛出的错误时，会抛出一个 `InternalError`，其 `cause` 为原始错误。`message` 是原始的消息。

`cause` 是不可枚举的，因此 `JSON.stringify(err)` 会忽略它。记录日志时请显式地遍历这条链（参见下面的最后一个示例）。

## 跨包检查

`instanceof DotEngineError` 在同一份库副本内有效。如果可能加载两份副本（重复打包、插件宿主），请使用 `isGvError(e)`。它检查是否有字符串类型的 `type` 和 `code`，并可跨副本工作。它也接受 `tryRenderSvg` 返回的纯对象。

## 示例

区分这两个家族：

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

处理 `tryRenderSvg` 的结果：

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

记录带有其 cause 的 `InternalError`：

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## 另请参阅

- [API 参考（精选）](/zh-cn/guide/api)，了解每个函数的签名。
- [类型](/zh-cn/guide/types)，了解 `GvError` 和 `RenderResult` 的结构。
- [生成的 API（TypeDoc）](/reference/)，了解完整的 `GvErrorCode` 和 `UsageErrorCode` 联合类型。
