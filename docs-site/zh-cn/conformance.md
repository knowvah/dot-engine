---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 一致性：“匹配”的含义 {#conformance-what-match-means}

@knowvah/dot-engine 以权威的 C 版 Graphviz 二进制程序作为参照程序（oracle）进行验证。
当本项目说某个图与 C 版**匹配**——即名为 `conformant` 的对齐度判定——时，它指的是一项经过机械化检查的具体属性，**而不是**SVG 文本逐字节完全相同。

> **定义。** 将两份 SVG 解析为规范化的元素树后，如果满足以下两点，则称移植版的渲染结果与参照程序的渲染结果**一致**（conformant）：
>
> 1. 每一个**数值**（坐标、路径数据、`points`、`viewBox`、`transform` 参数）与参照程序的差值都在固定的**容差**之内；并且
> 2. 每一个**非数值**（标签名、颜色、文本内容、属性键、枚举型属性值）都**完全相等**。
>
> 只要有任何数值超出容差，或任何非数值不同，该渲染结果就**不一致**。

## 为什么不要求逐字节相同？ {#why-not-literal-bytes}

SVG 把浮点坐标序列化为十进制文本。两份在数学上等价的渲染结果，仍可能因为 IEEE-754 舍入、浮点运算的顺序，以及随 CPU 和 JS 引擎而异的平台 `libm`/FMA 行为，在最后一位打印的数字上有所不同。因此，在本库所面向的各种运行环境（浏览器、Node、不同的 CPU）中，逐字节相同的标准不只是严格，而是**无法测试**。一致性把真正重要的属性——观看者所见的几何形状和内容——限定在一个足够小、肉眼无法察觉的范围内。

## 精确的容差 {#the-exact-tolerance}

容差**按引擎类别**划分，定义在
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts) 中：

| 类别 | 容差（pt） | 引擎 |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`、`circo`、`twopi`、`osage`、`patchwork` |
| `iterative` | **±0.5** | `neato`、`fdp`、`sfdp` |

确定性引擎基本上能完全复现 C 版的整数/打印坐标，因此 ±0.01 只是用来吸收十进制格式化带来的噪声。迭代式（力导向）引擎依赖超越函数，其最低位的结果无法跨平台复现，所以它们采用更宽松的界限，并且额外检查**结构**是否相等（元素树相同）。

针对 **plain/plain-ext** 输出面有一点需要说明：plain 以英寸为单位、保留 5 位有效数字（`%.5g`）打印坐标，所以当数量级 ≥ 100 时，打印量化步长（0.01）就等于 ±0.01 的容差。在非常大的图上，一个不足 1 ULP 的布局差异如果恰好跨过第 5 位数字的舍入边界，就会被打印成完整的 0.01 一步而被标记出来，尽管其底层几何在约 1e-11 pt 的精度内完全相同（参见 circo 的 `2108` 接受记录，日志 2026-07-28）。以点为单位打印的 xdot/json 输出面，才是该范围内具有权威性的几何比较。

**语料库对齐度调查**无论使用哪种引擎，都以 `deterministic` 模式（±0.01）评估每一个图——参见
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
（`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`）。

## 阅读代码 {#read-the-code}

上面的定义并非空谈——它正是比较代码所做的事情。您可以自行验证：

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES`（±0.01 / ±0.5 表），以及 `compareSvg`：它遍历两棵规范化的树，逐个属性应用规则（1）数值在容差之内和规则（2）非数值完全相等。
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — 原始 SVG 如何被解析为可比较的元素树。
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`，它会给出下文的某一种判定。`survey.ts` 只覆盖 `dot` 的 SVG 轨道。
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — 按引擎划分的 **xdot** 调查（`npx tsx test/corpus/engine-walk.ts <engine>`），它采用与上表相同的类别划分
  （`neato`/`fdp`/`sfdp` 使用 `TOLERANCE = 0.5`，其他每个引擎使用 `0.01`），
  并比较语义化的绘制操作流（`compareXdot`），而不是 SVG。`circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` 这几条轨道就是这样衡量的；`dot` 自己的 xdot 轨道则使用姊妹脚本
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts)。

## 判定 {#the-verdicts}

调查会给每个图恰好一种判定。各轨道的实时计数见：
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
汇总了每一条“引擎 × 输出面”轨道（确定性和迭代式都包括）；
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
是 `dot` 的 SVG 仪表板，其他每个引擎在 `test/corpus/` 中都有各自的
`PARITY-<engine>.md` 仪表板：

| 判定 | 含义 |
|---|---|
| **`conformant`** | 按上述定义与参照程序匹配（数值在容差之内，非数值完全相等）。 |
| **`structural-match`** | 元素树相同，但有一个或多个数值超出容差。 |
| **`diverged`** | 元素树不同（缺少/多出元素，或非数值不匹配）。 |
| **`errored` / `timeout`** | 移植版无法渲染该输入（`errored`；在按引擎划分的轨道上为 `port-error`），或超出了时间预算（`timeout`）。按失败计分：计入通过率的分母，绝不算作通过。 |
| **`oracle-error`** | C 参照程序无法渲染该输入，因此没有可供比较的参考。不在范围内：从通过率的分母中排除。 |

每个仪表板上的**通过率**为 `conformant / (surveyed − oracle-error)`。

“Conformant”是达标线；“structural-match”是有意义的进展（形状正确，坐标仍在漂移）；“diverged”、“errored”和“timeout”是真正的差距。这些判定都不代表输出逐字节相同。

有些图在某个引擎上**根本没有判定**：参见下面的*引擎排除项*。

### 引擎排除项 {#engine-exclusions}

被排除的（图，引擎）组合不会被遍历，因此既不算一致，也不算有差异——它只是在那里没有被测量。这与已接受的差异不同：后者的比较*确实进行了*，差异因有文档记录的原因而被谅解。

门槛被有意设得很高，因为未经检查的图是覆盖率上的漏洞，而不是已知的成本。一个条目必须同时满足三个条件：该引擎的算法对此输入可证明无法发挥作用，跳过它能节省实际时间，并且在成本更低的轨道上已验证了相同的行为。*慢*显然不构成充分理由——移植版与参照程序之比很差，恰恰是真正的性能缺陷的样子，以此为由排除就会掩盖语料库存在的意义所在。

每一个排除项及其机制都列在
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions) 中；
注册表是 `test/corpus/engine-exclusions.json`。促成这一机制的案例是
`2222`，它声明了 28,303 个节点而没有边：由于没有任何关系需要处理，所有力导向和径向引擎都把工作委托给共享的组件打包器，它们自己的算法一个都没有运行——它们的参照输出逐字节相同，证实了这一点。`dot` 走的是另一条路径，用六秒钟就一致地覆盖了它。
