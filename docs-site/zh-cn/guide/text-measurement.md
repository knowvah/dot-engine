---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# 文本测量

dot 布局需要每个标签的宽度和高度，以确定节点大小并放置边。@knowvah/dot-engine 通过一个单一的可插拔替换点
`TextMeasurer` 来测量文本，并自动解析要使用哪一个——您也可以设置自己的。

## 约定

有两个不同的目标，它们需要不同的测量器：

| 目标 | 测量器 | 是否确定？ | 字距调整 / 文本整形 |
|------|----------|----------------|-------------------|
| **可复现的布局**（各处输出相同） | 内置度量模型 | 是 | 否 |
| **与宿主字体一致的布局**（与渲染所用字体相符） | 平台的 canvas | 否（取决于字体） | 是 |

原生 Graphviz 本身是与宿主字体一致的——其输出取决于运行它的机器上安装的字体。
@knowvah/dot-engine 让您自行选择：默认是确定性的，选择启用后则与宿主字体一致。

## 自动解析

当您没有设置测量器时，@knowvah/dot-engine 会在每次渲染时选择一个：

1. 通过 `setTextMeasurer` 显式设置的测量器（若存在则优先）；
2. **浏览器**（`document` 可用）→ 页面的 `<canvas>`——与宿主字体一致，
   使用浏览器渲染 SVG 文本时所用的同一种字体进行测量；
3. **Node** → 内置的确定性度量模型。

该库具有**零运行时依赖**，自身从不导入字体库或 `canvas`，因此浏览器包保持小巧，
Node 默认情况下也从不读取文件系统。

## 在 Node 中进行与宿主字体一致的测量

如果希望 Node 的输出中方框适配特定字体（真实的字距调整和文本整形），
请安装可选的 `canvas` 对等依赖，并在启动时接入一次：

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` 被声明为**可选的对等依赖**——除非您要求，否则不会安装。当 Node 在交互式终端中回退到内置模型时，
@knowvah/dot-engine 会打印一次此建议；可用 `GV_FONT_QUIET=1` 将其静默。

## 自定义测量器

`setTextMeasurer` 接受任何实现了 `TextMeasurer` 的对象：

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

内置实现均已导出，可供复用：`CanvasTextMeasurer`（包装任意 2D 上下文）、
`EstimateTextMeasurer`（确定性的、未经 hinting 的参考实现，与无头 Graphviz 的
`estimate_textspan_size` 一致——**这是 Node 的默认值**），以及 `LutTextMeasurer`
（带 hinting 的按字体族查找表，可选择启用，以便在没有原生 `canvas` 依赖的情况下获得更贴近的尺寸）。

## 为什么要这样划分

字距调整、连字和非 ASCII 字形的宽度取决于实际字体的整形表——逐字符的宽度表无法表示它们，
而且正确的值因字体而异（等宽字体把 `<=` 渲染为两个单元格；比例字体会把 `VA` 的间距收得更紧）。
因此，可复现的布局使用固定的度量模型；要与真实的渲染字体相符，则需要用该字体进行测量，
这正是基于 canvas 的测量器所做的事。
