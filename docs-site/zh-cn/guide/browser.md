---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# 在浏览器中使用

@knowvah/dot-engine 不使用任何仅限 Node 的 API，可以安全地打包用于浏览器。
本页介绍在客户端运行时需要了解的两件事。

## 打包

该库是纯 ES 模块。任何现代打包工具（Vite、esbuild、Rollup、webpack）都可以引入它。
没有需要外部化的运行时依赖，也没有需要托管的 WASM 产物。

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

本站的[演练场](/zh-cn/playground)做的正是这件事——它导入引擎并在浏览器中调用 `renderSvg`，
无需与服务器往返。

## 文本测量

Graphviz 需要文本尺寸来确定标签大小。@knowvah/dot-engine 会自动处理：

- **在浏览器中**（存在 `document` 时），它使用原生 `<canvas>` 2D 上下文测量文本——
  与宿主字体一致，因为这与浏览器渲染 SVG 所用的字体相同。
- **在 Node 中**，默认使用内置的 **Estimate** 测量器——一种确定性的、无头环境安全的模型，
  对应 Graphviz 自身的 `estimate_textspan_size`。在 Node 中无需安装 `canvas` 或提供字体文件即可得到正确的布局；
  另外还提供一个带 hinting 的查找表（LUT）测量器，可选择启用，以便在没有原生 canvas 依赖的情况下获得更贴近宿主字体的尺寸。
  如何显式选择测量器，请参阅[文本测量](/zh-cn/guide/text-measurement)。

无论哪种情况，布局都不需要字体文件。

## Web 字体：为什么预取很重要

标签尺寸来自使用某种字体对文本的测量。如果某个字体面已用 `@font-face` 声明但尚未加载完成，
浏览器会改用**回退**字体进行测量，而一旦真正的字体到达，布局就是错误的。
在 Chromium 中使用 JetBrains Mono 实测：字体面加载之前（回退字体）测得的标签框宽 **70.68 pt**，
加载之后为 **124.8 pt**。

异步入口点（`renderSvgAsync`、`renderAsync`、`renderSvgInto`）可以避免这个问题：
它们会收集图将请求的字体，通过 `document.fonts` 加载，然后才运行布局。
`renderSvgAsync` 得到的结果与加载后再测量一样，同为 124.8 pt。

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`**（默认 `3000`）是所有字体面共用的一个截止时间，而不是每个字体面各自的。
- **`fontIssues`** 是一个 `{ face, reason }` 列表。`reason: 'failed'` 表示该字体面出错
  （例如 404）或其加载被拒绝；`reason: 'timeout'` 表示它在 `fontTimeoutMs` 内尚未加载完成。
  两种情况下布局都会使用回退字体继续进行。每个问题还会通过 `console.warn` 输出。
  字体问题绝不会使 promise 被拒绝。
- **限制：** 只有用 `@font-face` 声明的字体族才能被报告。系统字体或未知的字体族名称会被视为“已加载”
  （没有可等待的内容），因此拼错的 `fontname` 永远不会出现在 `fontIssues` 中。
- **Node 和 Workers** 没有 `document.fonts`，因此会跳过字体预取，`fontIssues` 为 `[]`。
  图像钩子仍然有效。您可以传入 `fontSet`（任何带有 `load(font)` 的对象）来提供自己的实现。

## 渲染到页面中：`renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

它会用渲染出的 `<svg>`（以 `element` 返回）替换具有给定 id 的元素的子节点，
使用 `DOMParser` 和 `importNode`，绝不使用 `innerHTML`。缺少该 id 时会以 `ERR_INVALID_ARG_VALUE` 拒绝。
SVG 默认会经过清理；传入 `sanitize` 可使用您自己的清理器，传入 `trusted: true` 则跳过清理。
清理器会移除和保留哪些内容，请参阅 README 的“Security”一节，并请始终保持 Content-Security-Policy 生效。

## 外部图像：`setImageSizer`

当类 HTML 标签包含外部图像（`<IMG SRC="logo.png"/>`）时，Graphviz 需要该图像的固有尺寸来确定单元格大小。
（节点的 `image=` 属性不会被调整尺寸：节点保持其正常的方框，与无头原生 Graphviz 一致。）
由于库无法读取文件系统，因此需要由您提供一个尺寸器：

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

如果您的图从不引用外部图像，就无需调用它。若要异步确定图像尺寸（例如通过加载图像），
请改为向 `renderSvgAsync` 传入异步的 `imageSizer`；参见[图像](/zh-cn/guide/images)。

## Web Workers

布局是同步运行的，因此大型图会阻塞其所在的线程。请在 Worker 中运行它，以保持页面响应。
在 Worker 内没有 `document`，因此库会使用 `OffscreenCanvas` 测量文本，
异步 API 则通过 Worker 自己的字体集（`self.fonts`）加载字体。

Worker 中的字体与页面的字体相互独立：请使用 `FontFace` API 在 Worker 中注册它们
（CSS `@font-face` 规则不会作用到 Worker）。

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

在 Worker 中请使用 `renderSvgAsync`（或 `renderAsync`）渲染，而不是 `renderSvg`，
至少要等到每个 Web 字体都已加载。如果在字体面加载之前，Worker 中已经测量过某个确切的字体字符串，
那么即使字体之后加载完成，Chromium 仍会继续用回退字体面来测量该字体字符串；
异步 API 在测量之前先加载字体，因此永远不会遇到这个问题。

## 不要期待什么

该库面向 **SVG**（以及 `json` / `xdot` / `dot` / 图像映射文本格式）。
位图输出（PNG/JPG）、PostScript/PDF 以及交互式/GUI 后端不在范围之内——
如果需要其他格式，请在下游转换 SVG。完整的范围边界请参阅[已知差异](/zh-cn/divergences)。

## 大型图：预渲染为 SVG

非常大的图——大约 **超过 1 万个节点或几 MB 的 DOT 源代码**——在浏览器中运行时进行布局是不切实际的。
布局（mincross、分层、样条路由）是超线性的，因此这是**与上游 Graphviz 共有的规模上限，
而不是本引擎特有的限制**：对于这样的输入，原生 `dot`、WASM 构建（`@hpcc-js/wasm-graphviz`）
和本引擎都会同样地超时或耗尽内存。（本引擎**不会**泄漏内存——其每次渲染的堆占用是平稳的；
限制严格来说只在于图的规模。实测对比请参阅[性能仪表板](/perf)。）

对于这种规模的图，请**在构建时渲染一次，并提供生成的 `.svg`**，
而不是在每次浏览时都在浏览器中布局——这与您即使使用原生 `dot` 也会采用的模式相同，
因为它太慢，不适合每个请求都运行。

[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins)（已发布到 NPM）中的构建时站点适配器
所做的正是这件事：

- `@knowvah/vitepress-plugin-dot`——VitePress（markdown-it），构建时
- `@knowvah/eleventy-plugin-dot`——Eleventy（markdown-it），构建时
- `@knowvah/docusaurus-plugin-dot`——Docusaurus（MDX/remark），构建时
- `@knowvah/dot-markdown-it`——与框架无关的 markdown-it 集成

对于无法在构建时渲染的、由用户提供的动态图，请将交互式渲染限制在规模合理的图上，并缓存输出的 SVG。
