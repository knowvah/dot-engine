---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# 布局引擎

Graphviz 的全部八种布局引擎均已注册。将引擎名称作为第二个参数传给 `renderSvg`：

```ts
renderSvg(dot, 'neato');
```

| 布局引擎 | 布局风格 |
|--------------|-----------------------------------------------|
| `dot`        | 层次化 / 分层的有向图 |
| `neato`      | 弹簧模型（Kamada–Kawai） |
| `fdp`        | 力导向 |
| `sfdp`       | 多尺度力导向（大型图） |
| `circo`      | 环形 |
| `twopi`      | 径向 |
| `osage`      | 簇式 |
| `patchwork`  | 方形化树图（Squarified Treemap） |

## 保真度说明

引擎分为两个一致性类别（确切定义和比较代码请参阅[一致性](/zh-cn/conformance)）：

- **确定性**——`dot`、`circo`、`twopi`、`osage`、`patchwork`。均须满足同一条
  **±0.01** 标准：在黄金语料库上，数值坐标和路径与原生 C 二进制文件的差异在 ±0.01pt 以内，
  所有非数值内容（标签、颜色、文本）完全相同。
- **迭代式**——`neato`、`fdp`、`sfdp`。这些力导向/多尺度求解器依赖于浮点舍入顺序，
  因此检查时采用较宽松的 **±0.5**pt 界限，并检查结构（元素树相同）是否一致，
  而不要求严格的数值相等。

这两条标准都不意味着 SVG 输出逐字节相同。各引擎当前的通过数量及已接受的差异，
请参阅[对齐度](/parity)（含各引擎的详情页）和[已知差异](/zh-cn/divergences)。

## 试试不同的引擎

在下拉菜单“布局引擎”中切换引擎，即可比较同一个图的不同布局：

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
