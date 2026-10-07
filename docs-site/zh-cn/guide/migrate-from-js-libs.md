---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# 从其他 JS Graphviz 库迁移

viz.js / `@viz-js/viz`、`@hpcc-js/wasm`（`@hpcc-js/wasm-graphviz`）以及 `d3-graphviz`，都是把真正的 C 版 Graphviz 编译为 **WebAssembly** 并调用它，从而让 JavaScript 能够使用 Graphviz。@knowvah/dot-engine 则是从零开始的 **TypeScript 移植**——布局引擎、解析器和 SVG 输出器都是 TypeScript 源代码，而不是编译后的二进制文件。

这一差异是核心，而不是脚注：

| | WASM 封装（viz.js / `@hpcc-js/wasm` / d3-graphviz） | @knowvah/dot-engine |
|---|---|---|
| 实现 | 真正的 C 版 Graphviz，编译为 `.wasm` 二进制 | 纯 TypeScript 移植，没有编译产物 |
| 模块初始化 | 异步——首次使用前需实例化/等待 WASM 模块 | 无——`import` 后同步调用 |
| 包体积 | 随 JS 一起发布一个 `.wasm` 资源（数百 KB 到数 MB） | 仅 JS，可 tree-shaking |
| 调试 | 单步跟踪 WASM 二进制（若有 C 源代码，则跟踪 C 源代码） | 借助 source map 单步跟踪真实的 TypeScript |
| 线程模型 | 部分构建在 Web Worker 中运行布局 | 在调用线程上运行，与任何 TS 函数一样 |
| 输出格式 | 取决于底层 C 构建时的编译选项——通常是完整的 Graphviz 格式集，包括位图/PDF | SVG 加 DOT/json/xdot/plain/imagemap 文本格式——详见下文 |

如果您的用例是“调用一个函数，拿回 SVG，没有异步的繁琐流程，也不用托管 WASM 资源”——这正是 @knowvah/dot-engine 的用途。如果您的用例依赖位图或 PDF 输出，请参见下文的[何时继续使用 WASM](#when-to-stay-on-wasm)。

## API 差异

这三个库的形态各不相同；下表是最常见的迁移情形（仅为近似——请对照各库自己的文档核实；每一行下方有引用说明）。

| 库 | 典型调用 | @knowvah/dot-engine 的等价写法 |
|---|---|---|
| `@viz-js/viz`（viz.js 的后继者） | `Viz.instance().then(viz => viz.renderSVGElement(dot))`——异步，`Viz.instance()` 返回 Promise | `renderSvg(dot, 'dot')`——同步，没有实例/初始化步骤 |
| viz.js 2.x（旧版，`new Viz()`） | `new Viz().renderString(dot)`——返回 `Promise<string>` | `renderSvg(dot, 'dot')`——同步 |
| `@hpcc-js/wasm-graphviz` | 先 `await Graphviz.load()` 一次，再 `graphviz.dot(dot)`（加载后同步） | `renderSvg(dot, engine)`——完全没有加载/预热步骤 |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)`——把输出绑定到 DOM，并对过渡进行动画 | `renderSvg(dot, engine)` 返回 SVG **字符串**；由您自己把它插入 DOM（例如 `el.innerHTML = svg`） |

右列中的每个 @knowvah/dot-engine 调用都是**同步**的——没有需要 await 的模块，因为没有需要实例化的 WASM 二进制。请去掉包裹 @knowvah/dot-engine 调用的所有 `await`/`.then()`；它们从来就不是必需的。

- `@viz-js/viz` 的 `Viz.instance()` → Promise 和 `renderSVGElement()` 方法记载于 viz-js.com；撰写本文时已通过该项目发布的用法示例确认。
- viz.js 2.x 的 `new Viz().renderString(dot)` 是该（现已被取代的）版本线所记载的 API；如果您使用的是当前的安装版本，请确认自己是否实际在使用 `@viz-js/viz`。
- `@hpcc-js/wasm-graphviz` 的 `Graphviz.load()` / `graphviz.dot()` 组合，撰写本文时已通过该包发布的用法示例确认。另一个独立的、较旧的 `@hpcc-js/wasm` 包在过去的版本中还提供过 `graphviz.layout(dot, format, engine)` 调用——在依赖其确切签名之前，请查阅您所安装版本自己的文档。
- `d3-graphviz` 的 `.graphviz().renderDot(dot)` 调用链，以及它内部基于 `@hpcc-js/wasm` 构建这一点，撰写本文时已通过该项目发布的 README 确认。

### `renderDot` 的 DOM 绑定不在此处讨论范围内 {#renderdot-dom-binding}

`d3-graphviz` 所做的不止渲染 SVG：它把结果绑定到 D3 选择集，对重新渲染做差异比较，并在两种布局之间对过渡进行动画。@knowvah/dot-engine 对 DOM 完全没有立场——`renderSvg`/`render` 返回的是纯字符串。如果您想要 d3-graphviz 风格的、两种布局之间的动画过渡，就需要在两次 `renderSvg` 调用以及您自己的 DOM 差异比较之上自行构建这部分逻辑（或者就这一项功能继续使用 d3-graphviz——见下文）。

## 无需解析字符串格式即可获取布局数据

这三个 WASM 库都可以输出 Graphviz 自己的 JSON 或 plain 文本格式，然后由您自己解析该字符串来获得节点/边的坐标。@knowvah/dot-engine 省去了文本这一来回：（在 `render` 之后）调用 `getLayout(g)`，即可直接得到带类型、可 JSON 序列化的快照——没有需要解析的 `-Tjson`/`-Tplain` 字符串。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

完整的快照结构、单位以及 `yAxis` 选项参见[读取计算出的几何信息](/zh-cn/guide/geometry)。

## 何时继续使用 WASM {#when-to-stay-on-wasm}

请对自己的范围保持坦诚：@knowvah/dot-engine 面向 SVG 以及 `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx` 文本格式。它**不会**输出位图格式（PNG/JPEG/GIF/……）或 PostScript/PDF/EPS——这些是有意划定的范围边界，而不仅仅是尚未完成的缺口。确切的非目标列表参见[已知差异](/zh-cn/divergences)。

如果您的应用需要直接从布局引擎得到 `-Tpng` 或 `-Tpdf` 输出，上述基于 WASM 的库仍然能满足这一需求——因为它们运行的是真正的 C 版 Graphviz，支持该构建编译时所包含的任意输出格式。在这种情况下，您可以只在那一条代码路径上继续使用 WASM 库，或者用 @knowvah/dot-engine 渲染为 `'svg'`，再用另一个工具在下游把 SVG 转换为位图/PDF。

## 另请参阅

- [布局引擎](/zh-cn/guide/engines)
- [渲染为其他格式](/zh-cn/guide/render-formats)
- [读取计算出的几何信息](/zh-cn/guide/geometry)
- [已知差异](/zh-cn/divergences)
- [快速开始](/zh-cn/guide/getting-started)
