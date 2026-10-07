---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# 从 `dot` 命令行工具迁移

C 版的 `dot`/`neato`/`fdp`/…… 二进制程序读取 `.dot` 文件（或标准输入），并写出渲染后的文件（或标准输出）。@knowvah/dot-engine 没有文件系统：它接收一个 DOT **字符串**，返回渲染后的**字符串**（或者使用 `getLayout`，得到一个纯 JavaScript 几何对象，而不是需要再解析的字符串）。

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

上面的文件读写属于您自己的代码，而不是库的一部分——@knowvah/dot-engine 从不接触磁盘。这也正是它无需修改就能在没有 `input.dot` 可读的浏览器标签页中运行的原因。

## `-K<engine>` — 布局引擎

`-K` 用于选择布局引擎；@knowvah/dot-engine 使用相同的名称，作为 `renderSvg` 的 `engine` 参数或 `render` 的 `opts.engine` 字段。全部八个引擎均已移植：

| `-K` 值 | @knowvah/dot-engine 的 `engine` 字符串 |
|---|---|
| `-Kdot` | `'dot'`（省略 `engine` 时，`render` 也默认使用它） |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

各引擎的作用及其一致性等级，参见[布局引擎](/zh-cn/guide/engines)。

## `-T<format>` — 输出格式

`renderSvg` 仅支持 SVG；其他格式请使用 `render(g, format, opts?)`。@knowvah/dot-engine 的 `OutputFormat` 联合类型涵盖以下 `-T` 目标：

| `-T` 值 | @knowvah/dot-engine 的 `format` 字符串 | 说明 |
|---|---|---|
| `-Tsvg` | `'svg'` | 也是 `renderSvg` 唯一的输出 |
| `-Tdot` | `'dot'` | 附带布局属性（`pos`、`bb` 等）的 DOT 源代码 |
| `-Txdot` | `'xdot'` | DOT 加上 `_draw_`/`_ldraw_` xdot 指令 |
| `-Tjson` | `'json'` | 完整的图，JSON 格式 |
| `-Tplain` | `'plain'` | 以空白分隔的节点/边几何数据 |
| `-Tplain-ext` | `'plain-ext'` | `plain`，另外在边上附带端口坐标 |
| `-Timap` | `'imap'` | 服务器端 HTML 图像映射 |
| `-Tcmapx` | `'cmapx'` | 客户端 HTML `<map>` 元素 |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**不支持：**位图格式（`-Tpng`、`-Tjpg`、`-Tgif` 等）、`-Tps`/`-Tpdf`/`-Teps`，以及 GUI/交互式后端。这些是有意划定的范围边界——完整的非目标列表参见[已知差异](/zh-cn/divergences)。如果需要位图，请渲染为 `'svg'`，再在下游转换（无头浏览器、`resvg` 或类似工具）。

## `-Gname=val` / `-Nname=val` / `-Ename=val` — 属性

命令行的全局属性选项会为每个图/节点/边设置默认值。@knowvah/dot-engine 没有命令行选项——请直接在 DOT 源代码中设置相同的属性；如果您用代码构建图，也可以通过构建器 API 设置：

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

完整的构建器 API 参见[用代码构建图](/zh-cn/guide/build-a-graph)。

## 获取命令行无法直接提供的几何信息

`-Tplain` 的存在，正是为了让脚本能从文本输出中抓取节点/边的坐标。@knowvah/dot-engine 省去了这一来回：在 `render` 之后调用 `getLayout(g)`，即可得到一份带类型、可 JSON 序列化的快照，包含每个节点的位置、每条边的样条以及整体边界框——无需解析任何文本格式。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

完整的快照结构和 `yAxis` 选项（原生 Graphviz 的 y 轴向上；浏览器的 y 轴向下）参见[读取计算出的几何信息](/zh-cn/guide/geometry)。

## 字体与图像：命令行读取您的文件系统，@knowvah/dot-engine 不会

原生 `dot` 使用机器上已安装的任意字体来测量文本，并通过读取相对于工作目录的文件来解析 `image="..."` 属性。@knowvah/dot-engine 无法访问文件系统，因此这两者都由宿主应用程序注入，而不是从磁盘读取：

- **文本测量**——`setTextMeasurer` 会安装一个 `TextMeasurer`；如果您没有设置，库会自动选用合理的默认值（浏览器 canvas，或 Node 中的确定性度量模型）。参见[文本测量](/zh-cn/guide/text-measurement)。
- **图像**——`setImageSizer`（以及用于内联的 `setImageResolver`）让您自行提供图像的固有尺寸和图像数据，因为 @knowvah/dot-engine 无法代您对文件执行 stat。参见[使用图像](/zh-cn/guide/images)。

## 另请参阅

- [布局引擎](/zh-cn/guide/engines)
- [渲染为其他格式](/zh-cn/guide/render-formats)
- [读取计算出的几何信息](/zh-cn/guide/geometry)
- [已知差异](/zh-cn/divergences)
- [快速开始](/zh-cn/guide/getting-started)
