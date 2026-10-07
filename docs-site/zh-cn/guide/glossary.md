---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# 术语表

每个术语一条定义，按英文术语的字母顺序排列（本页保持英文版的标题顺序）。每条都链接到深入讲解它的指南页面（或源代码）。

## 簇（Cluster）

名称以 `cluster` 开头的子图（例如 `subgraph cluster_build`）——Graphviz 会把它渲染为一个独立的方框，
将其成员节点归为一组。在内部，@knowvah/dot-engine 的几何快照会把每个簇子图重新键入为
`cluster6` 这样基于位置的名称（`ClusterGeometry.name`），而不是 DOT 源代码中的名称，
因此需要原始名称的使用者应在布局之前构建一个 `idByName` 映射，并在布局之后重新键入
`snapshot.clusters`。重新键入的模式请参阅[实践方案](/zh-cn/guide/recipes)，
通过 `addSubgraph` 创建簇请参阅[用代码构建图](/zh-cn/guide/build-a-graph)。

## 一致性（Conformance）

“@knowvah/dot-engine 的渲染结果‘匹配’C 参照程序”这一说法背后、可由机器检查的属性。
两个 SVG 都被解析为规范化的元素树之后，每个数值（坐标、路径数据、`points`）都必须在固定容差内一致——
确定性引擎（`dot`、`circo`、`twopi`、`osage`、`patchwork`）为 **±0.01pt**，
迭代式力导向引擎（`neato`、`fdp`、`sfdp`）为 **±0.5pt**——
并且每个非数值（标签、颜色、文本）都必须完全相同。这并不意味着 SVG 输出逐字节相同。
参见[一致性](/zh-cn/conformance)。

## 坐标系 / y 轴（Coordinate frame / y-axis）

Graphviz 的原生坐标系是 **y 轴向上**，原点在左下角；浏览器和屏幕是 **y 轴向下**，原点在左上角。
`getLayout` 默认使用 `yAxis: 'down'`（翻转每个 y 并把 `bounds` 规范化到 `(0, 0)`），
并接受 `yAxis: 'up'` 以原样返回 Graphviz 原生坐标。xdot 绘制操作（来自 `getDrawOps`）
始终采用原生的 y 轴向上坐标系。参见[读取计算出的几何信息](/zh-cn/guide/geometry)。

## 差异（Divergence）

@knowvah/dot-engine 的渲染结果与参照程序之间的某个差别，已经过调查、找到根因并被编入目录——
而不是被悄悄容忍。已编目的差异分为三类：已接受的差值（有意不做到一致，
例如跨平台浮点非确定性）、仍在逐步消除的已跟踪长尾问题，以及明确的非目标。
未列出的差别会被视为缺陷，而不是可接受的行为。参见[已知差异](/zh-cn/divergences)。

## DOT

图描述语言——带有节点、边和属性语句的 `digraph { ... }` / `graph { ... }`——
@knowvah/dot-engine 会先解析它，再把结果交给布局引擎。参见[快速开始](/zh-cn/guide/getting-started)。

## 图像尺寸器 / 解析器（Image sizer / resolver）

用于外部图像（usershape 节点和 HTML 标签中的 `<IMG>` 单元格）的两个可注入替换点。
`ImageSizer` 报告图像的固有宽度/高度，使节点尺寸和标签布局无需加载像素数据即可进行；
`ImageResolver` 则在渲染时提供用于嵌入的实际图像字节。参见[图像](/zh-cn/guide/images)。

## 布局引擎（Layout engine）

@knowvah/dot-engine 注册的八种布局算法之一，按名称选择（`renderSvg(dot, engine)`）：
`dot`（层次化/分层）、`neato`（弹簧模型，Kamada–Kawai）、`fdp`（力导向）、
`sfdp`（多尺度力导向，适用于大型图）、`circo`（环形）、`twopi`（径向）、
`osage`（簇式）和 `patchwork`（方形化树图）。参见[布局引擎](/zh-cn/guide/engines)。

## 参照程序（Oracle）

由权威 C 源代码构建的原生 C 版 Graphviz `dot` 二进制文件，
@knowvah/dot-engine 的每一次渲染都以它为基准进行验证。@knowvah/dot-engine 直接调用这个二进制文件
（绝不使用 WASM 构建），以避免参照程序与移植版之间出现 ABI 漂移。
参照程序比较是如何运行和报告的，请参阅[一致性](/zh-cn/conformance)和[对齐度](/parity)。

## 层级 / rankdir（Rank / rankdir）

在 `dot` 的层次化布局中，**层级（rank）** 是在绘图中放置于同一深度的一层节点。
`rankdir` 设定层级延伸的方向——默认为 `TB`（自上而下），也可以是 `LR`、`BT`、`RL`——
作为图属性设置（`b.setAttr('rankdir', 'LR')`）。参见[用代码构建图](/zh-cn/guide/build-a-graph)。

## 样条 / 边路由（Spline / edge routing）

边所沿的曲线（贝塞尔）路径，由绕开节点和簇障碍物的路由代码计算得出。
@knowvah/dot-engine 通过 `getLayout` 以 `EdgeGeometry.points` 的形式公开路由后的控制点——
一个由 `{x, y}` 点组成的有序数组，单位为点。参见[读取计算出的几何信息](/zh-cn/guide/geometry)。

## 文本测量器（Text measurer）

可注入的替换点（`TextMeasurer`），用于报告标签的宽度/高度，使节点和边标签的尺寸能在布局之前确定。
@knowvah/dot-engine 会在每次渲染时自动解析出一个——首先是显式设置的 `setTextMeasurer`，
其次是浏览器的 `<canvas>`（如果可用），再次是 Node 中内置的确定性 `EstimateTextMeasurer`——
也可以接受自定义实现。参见[文本测量](/zh-cn/guide/text-measurement)。

## Usershape

Graphviz 的术语，指形状为外部提供的图像（通过 `image` 属性）而不是所绘制的多边形或椭圆的节点。
@knowvah/dot-engine 通过可注入的图像尺寸器/解析器替换点来解析 usershape，
而不是直接读取文件，从而使库保持浏览器安全。参见[图像](/zh-cn/guide/images)。

## xdot

扩展的 DOT 绘制操作格式：一个结构化的操作流（设置填充/描边颜色、设置字体、填充/描边椭圆或多边形、
绘制贝塞尔曲线、绘制文本），按绘制顺序精确描述渲染后的图应如何绘制。
`getDrawOps` 以带类型的 `XdotOp` 值返回此操作流，用于驱动自定义渲染器（canvas、WebGL、PDF），
而无需解析 SVG。参见[使用 xdot 绘制操作进行自定义渲染](/zh-cn/guide/xdot-drawops)。
