---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: 纯 TypeScript 实现的 Graphviz
  tagline: 输入 DOT，输出 SVG——无需 C。没有原生 Graphviz 二进制文件，没有 WASM。纯 TypeScript，可在浏览器中运行。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh-cn/guide/getting-started
    - theme: alt
      text: 打开演练场
      link: /zh-cn/playground
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/knowvah/dot-engine
features:
  - title: 忠实于 C 版 Graphviz
    details: 对权威 C 实现的逐行移植。在黄金语料库上，dot 引擎与原生二进制文件的输出在严格的确定性容差内一致（坐标 ±0.01，非数值内容完全相同）。
  - title: 原生支持浏览器，零运行时依赖
    details: 无需 C——没有原生 Graphviz 二进制文件，没有 WASM 移植版，也不需要渲染服务器。布局引擎本身就是 TypeScript——打包后即可发布。
  - title: 全部八种布局引擎
    details: dot、neato、fdp、sfdp、circo、twopi、osage 和 patchwork——均可渲染为 SVG。
  - title: 程序化布局与几何信息
    details: 不止于渲染——通过 getLayout() 以纯 JSON 可序列化快照的形式读回计算出的节点位置、边样条和簇边界，无需解析 -Tplain。
---

## 动手试试

下方的编辑器在您的浏览器中运行真正的库。编辑左侧的 DOT，右侧的 SVG 会实时更新。

<Playground height="360px" />

## 选择您的路径

初次接触？请选择与您当前目标相符的入口：

| 我想… | 从这里开始 |
| --- | --- |
| 了解各个部分如何协同工作 | [概览——心智模型](/zh-cn/guide/overview) |
| 安装并渲染我的第一个图 | [快速开始](/zh-cn/guide/getting-started) |
| 解决一个具体任务 | [实践方案集](/zh-cn/guide/recipes) |
| 查找某个函数或类型 | [API 参考](/zh-cn/guide/api) · [类型](/zh-cn/guide/types) |
| 无需安装即可试验 | [演练场](/zh-cn/playground) |

从其他工具转过来？请参阅[从 C 版 `dot` 命令行迁移](/zh-cn/guide/migrate-from-c-cli)
或[从 JS Graphviz 库迁移](/zh-cn/guide/migrate-from-js-libs)。

如需完整的、自动生成的签名，请参阅
[生成的 API 参考](/reference/)。想在页面中嵌入渲染后的图？
请阅读[使用图像](/zh-cn/guide/images)，了解图像内联与 CSP 指南。
