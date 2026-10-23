---
sourceHash: bce478c4f7f61b5dac4fc92681c15a991a1454a58006c620af11ab6454e33b5c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 与 C 版 Graphviz 的已知差异 {#known-divergences-from-c-graphviz}

@knowvah/dot-engine 力求与权威的 C 实现保持尽可能高的一致度。C 源代码就是规范；未列出的差异一律视为缺陷，而不是被接受的行为。

> **此处“匹配”的含义。** 语料库对齐度判定中名为 `conformant` 的结果，是一个**严格的确定性容差**，*而不是*逐字节相同的 SVG：数值坐标和路径必须在 **±0.01** 以内一致，所有非数值内容（标签、颜色、文本）必须完全相等（`compareSvg(…, 'deterministic')`）。在本文档中，“匹配”和“一致”都指这一容差判定。完整定义：
> [一致性](./conformance.md)。

当输出*确实*不同时，恰好属于以下三类之一：

1. **已接受的差值** — 我们已经调查过、弄清了根本原因，并且**有意选择不使其一致**的差异。每一项都有界限、有特征描述，并在下文给出理由。它们不是缺陷，除非有明确且另行界定范围的理由，否则不会被“修复”。
2. **已跟踪的长尾** — 已知*将会*弥补的差距，每一项都有以参照程序为准的修复方案。它们及其实时计数记录在
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md) 中。
3. **非目标** — 有意设定的范围边界（我们从一开始就不打算复现的格式和机制）。

权威的、持续更新的记录是
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
（与原生 `dot` 对比的逐输入对齐度仪表板）和
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
（算法层面的移植状态清单）。

哪些图属于*已接受*（下文第 1 类）的**机器可读**权威来源是
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json)。
工具链在生成报告时会将其合并：`PARITY-dot.md` 把**已接受的差值**与**已跟踪的**待办项区分开，规则门禁的允许列表也来自它。下面的叙述性章节解释每一个条目（A1 仍然有效；A2、A3 和 A8 已关闭，仅作为历史保留；A10 作为各引擎注册表中的移植版错误接受项仍然有效）。两项 CI 测试防止这份列表悄无声息地过时：`accepted-divergences.test.ts` 强制要求每个已接受的图仍然存在差异，而 `registry-staleness.test.ts` 会在某个引擎注册表中的条目不再与其已提交的扫描行相符时失败。

---

## 已接受的差值（我们有意不使其一致） {#accepted-deltas-we-deliberately-do-not-make-conformant}

只有当以下条件**全部**成立时，我们才接受一项差值，而不是去追求逐字节一致：

- 根本原因是**可移植性约束**（JavaScript/浏览器运行时无法精确复现的东西），而不是移植版中的逻辑错误。
- 该差异**肉眼无法察觉**，并且可证明是**有界的**。
- 相对于收益，修复将带来**不成比例的代价和影响范围**（通常是：它会触及数百个已经一致的图所使用的共享原语，为了零点几个像素的收益而冒出现回归的风险）。

当我们接受一项差值时，会在此处对其进行特征描述，使使用者永远不会感到意外。受已接受差值影响的图，采用**结构/容差**标准而不是字节标准进行验证。

### A1. 浮点确定性（力导向引擎） {#a1-floating-point-determinism-force-directed-engines}

**受影响：** `neato`、`fdp`、`sfdp`、`circo`、`twopi`、`osage`（迭代式的弹簧模型引擎）。`dot` 引擎的*布局*不受这种迭代模型确定性的影响；`dot` 样条路由中先前的浮点差值（A3、A8）已经关闭，并在下面作为历史保留。

> **范围，历史上是一个未经测量的前提 — 现已部分测量。**
> **dot 引擎的主 SVG 调查**（`test/corpus/survey.ts`）仍然**仅限 dot**：原生参照程序在 `GVBINDIR=/tmp/ghl` 下运行，该目录**只**符号链接了 `core` + `dot_layout` 插件（`test/corpus/gen-headless-gvbindir.sh` 恰好只遍历 `core dot_layout`——不存在 `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` 布局插件），并且参照程序和移植版调用的都是 `dot` 引擎。因此，像 `*_neato` / `*_circo` / `root_twopi` 这样的语料库 id 在该调查中只是用 `dot` 布局的*文件名*，而不是它们各自的原生引擎，A1 在那里匹配**零个**图——并不是因为这些引擎被证明一致，而是因为该调查根本没有运行过它们。
>
> **但是，现在全部六个 A1 引擎都有各自的原生引擎调查**，通过
> `test/corpus/engine-walk.ts` + `parity-report.ts`（不依赖 `GVBINDIR`——每个都直接启动 `dot -K <engine> -Txdot`），分为两种不同的严格程度，下文分别说明：`circo`/`twopi`/`osage` 以与 dot 调查相同的 **±0.01 确定性**容差运行，并对每个 id 做根因分诊（下文“引擎轨道接受”）；`neato`/`fdp`/`sfdp` 以更宽松的 **±0.5 特征描述**容差运行，尚未逐 id 分诊（下文“迭代式引擎特征描述”）。当前的跨引擎数据：
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)。

**特征描述。** 这些引擎运行迭代式数值布局，其结果取决于浮点舍入——具体来说是融合乘加（FMA）和 `Math.pow`，它们在不同的 JavaScript 引擎和 CPU 架构上可能不同。移植版在可能的地方与 C 的运算顺序保持一致（`src/common/fma.ts`、`src/common/arm-pow.ts`）——例如 `sfdp` 在使用匹配的伪随机数发生器和 `fma` 时，与原生参照程序可对齐到约 6 位有效数字——但精确、坐标完全相同的复现**无法保证跨平台**。拓扑得以保持；潜在的差异出现在精细的节点坐标上。

**为何接受。** 这是在 JS 中运行的硬性约束，而不是设计选择——与 A3/A8 中（此后已关闭的）`hypot`/FMA 敏感性属于同一类。没有办法保证所有目标运行环境上的超越函数/FMA 结果逐位相同，所以字节标准不只是代价高昂，而是无法测试。**评估 A1**（而不仅仅是给出提示）需要一条单独的原生引擎对齐度轨道——于 2026-07-11 作为 `test/corpus/engine-walk.ts` + `parity-report.ts` 建立，它让每个输入在各自的引擎下接受调查，而不是在 `dot` 下。这项工作诚实的上限，是把 A1 **收窄**为“在参考平台上没有活跃的差异”，而绝不是消除跨平台的前提；到目前为止的结果（见下）符合这一上限：`circo`/`twopi`/`osage` 各自暴露并找出了少量真实的 A1/A9 实例的根因，而 `neato`/`fdp`/`sfdp` 现在在 929 项的全集（graphviz 16.1.0）中分别有 90.5/96.5/68.1% 与原生程序相差不超过 0.5pt，这意味着已移植的算术（`fma.ts`、`arm-pow.ts`、匹配的伪随机数发生器）对大多数图都成立——而且 929 项全集中每一个存在差异的 id 都通过注入逐个归因（求解器漂移还是移植缺陷），而不是留作未分诊的漂移。参见下面的迭代式引擎特征描述。

**引擎轨道接受：twopi 箭头族。** <a id="a1-twopi-arrows-family"></a>
上面的引用块描述的是 dot 引擎的 SVG 调查，其中 A1 匹配零个图；而单独的 `twopi` **xdot 引擎轨道**（`parity-twopi.json`，原生 `dot -K twopi -Txdot` 参照程序，`test/corpus/engine-walk.ts`）*确实*在其原生引擎下运行，并在 9 个语料库 id 上暴露出一个具体的、经过验证的 A1 实例：
`graphs-arrows`、`graphs-newarrows`、`graphs-arrowsize`、`linux.x86-arrows_dot`、
`macosx-arrows_dot`、`nshare-arrows_dot`、`share-newarrows`、`windows-newarrows`，
以及（2026-07-28 新增，属于 905 项全集中的新成员）directed/ 下的同类 `tree-graphs-directed-oldarrows`——每一个都在单条主要的边上出现差异
（`Z->I` 或 `i->Z`；12–64 处绘制操作差异）。注入 A/B（决策日志，2026-07-10 的 “injection A/B verdicts:
twopi arrows family EXONERATED...” 条目）直接证明了其机制：
导出原生 `spline_edges` 入口处的 `ND_pos`，并将其注入移植版的
`splineEdgesShifted`，会在 `graphs-arrows` 上产生**完全一致**的输出（`Z->I` 变得与参照程序逐字节相同，样条同为 7/14 个点）——所以这一差异 100% 是 `twopi` 的 PRISM 重叠消除求解器在路由之前产生的节点位置漂移，移植版的样条路由/输出已被排除嫌疑。在 8 个 id 中的 6 个上，可见的症状是贝塞尔点数翻转（`unfilled_bezier[ptCount]: 8 vs 14`）：`Proutespline` 拟合出的分段数对漂移后的节点位置落在障碍物边界的哪一侧很敏感，所以 PRISM 迭代求解下游一个不足 1 ULP 的位置差异，就会翻转拟合样条的段数（另外 2 个 id，
`graphs-arrowsize`/`nshare-arrows_dot`，表现出同样的漂移，但只是较小的纯位置差值，没有分段数翻转）。该差异在引擎轨道层面通过
`test/corpus/accepted-divergences-engines.json` 被接受，并由 `parity-report.ts` 并入
`PARITY-twopi.md`——与 `accepted.ts` 为 dot 轨道的 `PARITY-dot.md` 所做的合并相同。

`oldarrows` 的根因分析（2026-07-28）精确定位了该族点数症状的翻转位置。它的 `i`–`Z`–`I` 扇形共线于一条环的直径上，而 pathplan `directVis` 的 `intersect()` 在障碍物顶点“位于”线段上时会阻断视线——此时 `wind()` 的 1e-4 共线容差使得即使一个距线段 270pt 的节点也被算作共线，而 `inBetween()`（假定共线）随后退化为只测试 **x 投影**：当且仅当顶点的 x 严格落在两个端点 x 坐标之间只有 1 ULP 宽的区间内时，该顶点才阻断视线。因此，镜像对称的两条径向边中哪一条会弯曲，取决于 PRISM 求解结果中三个名义上相等的 x 值在最后一个 ULP 上的排序——C 弯曲的是 `Z->I`（节点 `i` 的轴向顶点落在其区间内），移植版弯曲的是 `i->Z`（节点 `I` 的顶点落在其自己的区间内）。在各方导出的障碍物集合上离线复现 `directVis`，能够精确重现各方的决定，并且把参照程序的路由前 `ND_pos` 注入移植版后得到 0 处差异（`attribution-twopi.json`）——路由和输出都是逐字节忠实的。

`1855` 是同一 PRISM 路由前浮点机制的径向/星形**镜像**变体（2026-07-11 接受）：它的 31 个叶节点恰好共圆，所以星形布局是反射对称的，PRISM 的重叠消除处于一个对称不稳定的平衡点上；`circleLayout` 的 `setAbsolutePos` 中 5 个叶节点角度上 V8 与 libm 的 `cos`/`sin` 相差 1 ULP，选中了相反的镜像吸引盆，整个径向布局最终成为参照程序布局精确的 x 轴镜像（节点最大位移 6.04pt，包围盒保持不变）。注入 A/B 证明了两个方向：把 C 精确的 `circleLayout` 位置送入移植版的 PRISM，会逐个节点复现参照程序（3e-14），而只恢复那 5 个存在 ULP 差异的叶节点位置，就会让整个布局翻回移植版的镜像。完整的根因分析：`.agent-notes/twopi-radial-drift-rca.md`（决策日志 2026-07-11）。

同一个星形图在 `circo` 轨道上也有偏差（2026-10-16 接受，599 处绘制操作差异，最大 0.71pt）。移植版复现了 clang 在 `circpos.c` 中的 FMA 收缩和求值顺序，因此进入 PRISM 的 32 个位置中有 31 个逐位精确。最后一个相差 1 ULP，因为 V8 与 Apple libm 在 `positionChildren` 的三个子块角度上对 `cos`/`sin` 的舍入不同。随后 PRISM 的 Delaunay 三角剖分在镜像轴上翻转了一条近乎共圆的对角线。注入 A/B：给定原生的 `cos`/`sin` 值时，移植版与参照程序一致。给定 V8 的值时，原生构建在 30 次运行中有 22 次产生参照程序的布局，其余 8 次产生移植版的布局，因为 GTS 按分配地址排列其边。

**迭代式引擎特征描述：neato/fdp/sfdp。** <a id="a1-iterative-characterization"></a>
与上面的 `circo`/`twopi`/`osage` 引擎轨道不同，`neato`/`fdp`/`sfdp` 尚**未**逐 id 分诊——`engine-walk.ts` 为这三个引擎记录了 `tolerance: 0.5` 字段，`parity-report.ts` 将它们渲染在
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md) 中单独的“Iterative engines (±0.5 characterization)”一节里，明确**不能**与本文档其他位置的 ±0.01 确定性通过率相比较。针对 graphviz 16.1.0 的当前计数（929 项全集；通过率不计入 C 参照程序无法渲染的输入，依据[一致性](./conformance.md)）：

| 引擎 | 已调查 | ±0.5pt 以内 | 不一致 | 移植版错误 / 超时 | 参照程序错误 |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 840 (90.5%) | 86 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 294 | 1 | 0 |

（`fdp` 的通过率自 77.5% 上升，是因为先前提交的那次扫描早于上一个任务的移植状态。）

（第一次扫描，2026-07-11，762 项时，测得 ±0.5pt 以内的分别为 263/311/260——升至当前比率，是因为此后落地的逐 id 修复，主要是 neato 未移植的 `user_pos`/`P_SET` 处理、引擎初始化的整合，以及 `setEdgeType` 宏与函数的修复。）

与第一次扫描时不同，929 项全集中每一个存在差异的行都已针对 graphviz 16.1.0 逐个归因：注入工具（`test/corpus/attribute-divergence.ts`）把原生参照程序路由前的 `ND_pos` 送入移植版并重新比较，而当前每个存在差异的 id，除两个之外都是 `drift-exonerated`（一旦消除求解器漂移，移植版的路由和输出就能精确复现参照程序）。其中两个是单独接受的逐 id 残余：sfdp `241_0` 的 CDT 残余，以及 sfdp `2556` 的 NaN 布局。自 `fix(T9): start swapped cdt faces at the new diagonal as gts does` 起，fdp `241_0` 已通过（参见 A9 下的 fdp 段落）。fdp `2471` 和 sfdp `2371` 此前在注入之后保留的边标签位置（`lp`）仍不同，即 xlabel 放置器选了不同的候选。移植版的 `dotneato_closest` 改为按 clang 融合后的 de Casteljau 求值和 DIST2 方式舍入后，`2471` 已经消除：此前边标签锚点相差 1–2 ULP，使放置器的严格包含判断翻转。移植版的 R 树像 C 一样按值复制矩形之后，`2371` 已经消除。`2471` 的原生 fdp 布局每次运行都会变化，因此其行只记录一次运行。（sfdp 的 `42` 是 A1 漂移，参见 [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)。）下面的类别接受将这个被排除嫌疑的集合形式化；实时计数见各引擎仪表板
（[`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md)、
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md)、
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)）。

**A1-drift 类别接受（迭代式引擎，成员由计算得出）。**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
为每个迭代式引擎（`neato`、`fdp`、`sfdp`）携带一个 `"A1-drift"` **类别**条目——`{ class: true, attributionFile, ref }`——有别于上面 `circo`/`twopi`/`osage` 轨道所使用的逐 id 条目（D2，
`plans/iterative-parity-campaign/decisions.md`）。与逐 id 条目不同，类别成员从不在注册表中手工枚举：`parity-report.ts` 在生成报告时根据对应的 `attribution-<engine>.json`
（T1 的注入归因工具，`test/corpus/attribute-divergence.ts`）计算它——每一个存在差异、其原生路由前 `ND_pos` 被注入移植版并重新比较后在 ±0.5 下一致的 id，都会在该文件中得到 `verdict: 'drift-exonerated'`，意思是两个引擎的迭代求解器收敛到了数值上不同、但各自内部自洽的布局（依据上文 A1 特征描述，是浮点累加的差异，而不是移植版路由或输出的缺陷）。逐 id 的证据——桶的形状、基线与注入后的差异数量、整体平移/镜像检测——保存在归因文件本身中，而不会重复写入本文档或注册表（D2）。一个 id 如果之后直接通过，或其重新归因后判定改变，会在下一次报告重新生成时自动退出该类别——无需编辑陈旧的接受记录，也不会导致守卫测试失败。其 `attribution-<engine>.json` 尚未生成的引擎，会把该类别渲染为“attribution pending”且成员为零，与完全没有接受记录相同——类别条目允许先于其数据出现（参见 `test/corpus/accepted-divergences-engines.test.ts`）。

### A2. 文本测量（字体度量）→ 由标签驱动的布局 — 已关闭 <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**状态（2026-07-01）：已关闭。** 该类别下不再有任何语料库 id 被接受；本节作为机制以及将其化解的可注入 `TextMeasurer` 替换点的历史文档予以保留。一系列文本测量方面的修复（`EstimateTextMeasurer` 切换、感知字体的垂直度量、非 ASCII UTF-8 字节修复）解决了几乎所有原先归于此处的由标签驱动的布局差异。**`proc3d`**——前一个典型的 A2 示例——在全部三个语料库目录（`graphs-`/`share-`/`windows-proc3d`）中都已完全**一致（`conformant`）**：包围盒匹配，路径数据差异为零，标签锚点差异为零。

**最后一批成员已退出（2026-07-01）。** **`NaN` 族**（`graphs-NaN` / `share-NaN` / `windows-NaN`）在其节点几何早已与 C 完全一致（76/76 个参考点）之后，仍被长期保留在这里。它真正的残余——四对相对的 2 环边（`Target↔TThread`、`Interp↔InterpF`、`Event↔Target`、`AtomProperties↔NRAtom`）上 8 个直线边端点偏移了 6–14 pt——经过重新诊断，结果**根本不是字体度量的影响**，而是 dot 多重边路由中的两个移植缺陷（任务 `plans/fix-nan-a2-retire/`，
`.agent-notes/nan-edge-endpoint-diagnosis.md`）：

1. **相对边对的通道顺序。** 移植版在分配 Multisep 通道偏移之前，按原始创建序号重新对每个平行边组排序；C 则按 edgecmp 收集的顺序分配通道（MAINGRAPH 的正向代表边在前，AUXGRAPH 的反向成员在后——`dotsplines.c:419`，
   `make_regular_edge:1885-1907`）。一个其反向成员先被声明的 2 环，会把每条边画到对方的 18 pt 通道上。
2. **跨层级合并边上的虚假平边相邻。** `markAdjacent` 标记 `ND_other` 条目时没有 C 中的同层级保护
   （`flat.c:272-276`），使 `groupSize` 的平边相邻短路吞掉了 portcmp 的分组边界。

两处都忠实地修复后，该族在全部三个目录中都**一致**（逐元素：节点 0 处、边 0 处不同），同一机制还关闭了 `42`、`clust2`、`ngk10_4`（structural-match → conformant），并把
`b124` 从 diverged 推进到 structural-match——全部是 2 环/平行边对。

**调查的双方运行同一个估算器 — 测量被化解。**
原生 `dot` 参照程序在无头的 `GVBINDIR`
（`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`）下运行，该目录只符号链接 `core` 和 `dot_layout` 插件——没有 `gd`/`pango`/`quartz` 文本布局插件。
该位置为空时，graphviz 回退到其内置的
`estimate_textspan_size`。TypeScript 移植版的 `EstimateTextMeasurer`
（`src/common/textmeasure.ts`）是同一例程的忠实移植，是 Node 下的默认值，由 `createMeasurer()`
（`src/common/textmeasure-factory.ts`）解析得到。**因此每一次对齐度比较的双方都用相同的估算器测量文本**——真实的 FreeType/pango 字形步进从未进入比较。这就是为什么此处判定出现回退时，问题指向的是布局代码而不是字体；也是为什么修复估算器自身的缺陷（UTF-8 字节计数、垂直度量对字体的感知）能把这个类别整体关闭，而不是仅仅缩小字体度量上的差距。

**可注入的 `TextMeasurer` 替换点。** 这种化解之所以可能，仅仅是因为文本测量是一个有意设置的替换点，而不是硬编码在任一引擎之中。`TextMeasurer` 是一个只有一个方法的接口（`measure(text, font, size,
flags) → {w, h, …}`），通过依赖注入传入每一个标签尺寸计算的调用点——`polyInit`、`recordInit`、`initEdgeLabels` 和 `buildNodeLabel` 都以参数形式接收测量器；没有任何地方通过全局变量测量文本。测试/CI 中通过 `setTextMeasurer(...)` 或 `GV_TEXT_MEASURER=estimate` 将其固定。该替换点还使我们能够*证明*某个残余仅是测量问题：把 C 测得的精确宽度（从参照程序中捕获）喂给移植版，然后检查布局是否因此精确复现了 C。正是这个实验最初为 `proc3d` 的 A2 判定提供了依据（见下面的历史附录）——这一技术依然有效。它的逆向使用则让这个类别退出了：由于测量在调查的双方都被证明已化解，`NaN` 的边残余就不可能是字体度量的影响，这迫使我们重新诊断，进而发现了上面的两个路由缺陷。

::: details 历史分析（2026-06-30 起已被取代）— 为存档而保留
下面的内容描述的是该类别较早的状态，即在 `EstimateTextMeasurer` 切换、感知字体的垂直度量以及非 ASCII UTF-8 字节修复解决其大部分问题之前。它已不再描述当前行为——保留只是为了不丢失引向现状的推理过程。特别要注意：（1）下面测量表中“原生 C”的宽度数值是来自真实字体渲染路径的 **FreeType** 数值；对齐度调查从不运行该路径——双方都运行 `estimate_textspan_size`（见上文）——所以该表并不反映当前对齐度的测量方式；（2）下面的叠加图以及 golden/我们的渲染图，描绘的是一个**非语料库**的 `proc3d`（`graphs/directed/proc3d.gv`，约 2620 pt），它不属于对齐度调查；语料库中的 `proc3d` 变体现在已一致，差异为零，所以没有叠加图可以展示；（3）下面关于 `NaN`/`ratio=compress` 节点 x 坐标的叙述已被取代——当前测量表明全部 76 个节点点位都精确匹配，所以它所描述的宽度误差 → 节点偏移的链条对 `NaN` 已不再成立。

**`ratio=compress` 下的 `NaN`（历史）。** `NaN.gv` 族（`orientation=landscape; ratio=compress; size="16,10"`）曾是一个 A2 案例，其当时的判定落在 *diverged* 而不是 *structural-match*。compress 的 x 方向网络单纯形路径是忠实的——每一个约束输入都与 C 匹配（宽度约束值、`containNodes` 的最小长度、辅助边数 471/权重 1612、`lrBalance`，以及层内顺序都完全相同），*唯独* 9 个节点的半宽除外：测量器报告的结果比 C 宽 0.5–1.03 pt。`ratio=compress` 的权重 1000 打包使原本松弛的从左到右间距约束变得**起作用**，于是这个亚像素级的宽度误差——没有 compress 时不可见——表现为 −3..−5 pt 的内部 x 方向偏移。这一偏移使 `Target<->TThread` 直线样条越过节点框边界 0.55 pt，于是路由器把它弯折成一个额外的贝塞尔段（7 个点，而 C 为 4 个）——这是*结构性*差值，因此判定为 *diverged*。把这 9 个宽度强制设为 C 的值后，精确复现了 C（节点 x：53/76→0/76 处偏差；样条 7→4 个点），证实**对于那个先前的差异**，残余 100% 来自上游的字体度量，而不是 compress 或样条代码。完整证据（含 golden 与我们的结果的可视化并排对比，以及 4 点与 7 点样条的差值叠加图）：
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html`（文字说明：`…/nan-compress-xcoord.md`）。

**字体度量测量示例（历史 — FreeType 与估算对比）。**
原生 Graphviz 在使用真实的文本布局插件（而不是对齐度调查所用的无头参照程序）运行时，用 FreeType/libgd 的字形步进来测量文本。移植版的 `EstimateTextMeasurer` 并不复现字形光栅化器。对大多数字符串，两者完全一致；对某些字符串，它们相差零点几个点。实测示例——Times-Roman 14 pt，字符串
`"/home/ek/work/src/lefty/lefty.c"`（31 个字符）：

| | 宽度 |
|---|---|
| 原生 C（FreeType） | 176.00 pt |
| @knowvah/dot-engine（估算） | 176.75 pt |
| 差值 | **+0.75 pt（+0.43%）** |

同一节点的另一行标签 `"93736-32246"` 测得**完全相同**（两者都是 96.00 pt）——这个误差取决于具体字符串，并随每个字形累积，而不是一个统一的缩放因子。这种 FreeType 与估算之间的差距是真实的，但**不是**对齐度调查所测量的内容（双方都运行 `estimate`）；只有当把 @knowvah/dot-engine 的输出与本调查之外使用真实字体的 C 渲染结果相比较时，它才会起作用。

**对先前 `proc3d` 差异的下游影响（历史）。** 标签宽度决定节点大小，节点大小又决定布局：

1. 更宽的标签 → 节点框略宽（对于*椭圆*节点，宽度还要再乘以 √2，所以 +0.75 pt 的文本 → +0.53 pt 的半宽）。
2. 节点半宽设定了 x 坐标网络单纯形中从左到右的间距约束；这些约束经过 `ROUND()` 取整为整数，所以亚像素级的宽度变化就可能把某个约束从 *N* 推到 *N+1*。
3. 网络单纯形随后选出一个不同——但同样最优——的整数 x 分配，使某些节点的 x 位置偏移 1–2 个单位。

对于非语料库的 `proc3d.gv`（`graphs/directed/proc3d.gv`，约 2620 pt，不属于对齐度调查），这在 x 方向范围上产生了 **≤ 3.55 pt** 的差异（**0.13%**），叠加如下——**绿色 = 原生 C `dot`（golden），红色 =
@knowvah/dot-engine（我们）**：

![proc3d golden 与我们结果的叠加图：绿色 = C，红色 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

放大后，边缘几乎完全出现在较长的文件路径椭圆标签上：

![proc3d 叠加图，放大到较宽的路径标签椭圆：绿色 = C，红色 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — 原生 `dot` | 我们的结果 — @knowvah/dot-engine |
|---|---|
| ![由 C Graphviz 渲染的 proc3d](/img/proc3d-golden.svg) | ![由 @knowvah/dot-engine 渲染的 proc3d](/img/proc3d-ours.svg) |

独立的分析文章（根因、逐项指标数据、复现命令）位于单独的页面：
[**proc3d — 典型的 A2 字体度量差异（历史）**](/zh-cn/divergences-proc3d-a2)。
该页面描述的是一个针对非语料库输入、已经解决的差异；当前语料库中的 `proc3d` 变体都已一致。

**当时为何接受。** 要在所有字体和字符串上逐字节匹配 FreeType 的逐字形步进，就需要复现它的度量表、hinting 和舍入——庞大、脆弱，而且仍然无法保证精确。文本测量器是一个共享原语：语料库中的每个标签都要经过它，所以针对某一个字符串的修复，有可能为了肉眼无法察觉的收益而使其他字符串出现回归。
:::

### A3. 样条路由中的 `hypot` 平局裁决（`dot`）— 已关闭 {#a3-hypot-tie-break-in-spline-routing-dot}

**状态（2026-10-12）：已关闭。** 不再有语料库 id 被归入该类别而被接受；本节作为该机制的历史文档保留。先前的成员（`2368`、`graphs-b100`、`graphs-b104`、`241_1`、`2413_1`、`2413_2`、`graphs-decorate`、`2371`）在最新扫描（`test/corpus/parity-probe.json`）中全部为 **`conformant`**。

**机制，以及是什么关闭了它。** 样条拟合器（`Proutespline` -> `findMaxDev`，`src/pathplan/route.ts`）在偏差最大的内部路由点处拆分拟合出的贝塞尔曲线。在几何对称的通道上，候选偏差相差约 1 ULP，所以胜者由算术的最后一位决定。此前移植版被归因于一个不可约的差距（“Apple `hypot` 与任何可移植的 `hypot` 都不匹配”），并用一个容忍的、平移等变的平局裁决来补偿。这一归因已被证伪：平局由 C 的*精确*算术决定，而这是可复现的。提交 `cdf597bc`（`fix(pathplan): split splines at C's max-deviation point bit for bit`）移植了它：距离使用 libm 的 `hypot`（`route.c:448`）、C 严格的 `>` 比较（`route.c:139`），以及 clang 对贝塞尔求值（`route.c:137-138`）、`mkspline` 行列式（`route.c:181-183`）、`dot`（459）、`normv`（413）、`B01`（488）和 `B23`（494）的 `fp-contract` 融合。容忍的平局裁决已被移除；`241_0` 的结点被固定在 C 的路由坐标系中，因为 C 在这类平局上并不具备平移等变性。这关闭了 `2368`、`2371`、`2413_1`、`2413_2`、`graphs-b100`、`graphs-b104` 和 `graphs-decorate`。

`241_1` 并不是 `hypot` 平局：它由 `87347711`（`fix(dot): match port-less edge endpoints in flat-adjacent aux layout`）关闭。C 把共享同一条主边的所有相邻平边归入一次 `make_flat_adj_edges` 调用，并在整组范围内检测端口，所以带端口边的无端口同级边会经由辅助图路由。移植版按有无端口把该组拆开，并让同级边经由 `makeSimpleFlat` 路由，其裁剪落在不同的 `bezier_clip` 点（54.28，而原生为 54.46）。

两项修复都经过全新的语料库扫描验证，且零回归（日志行“T5 land”和“T6 land”，`plans/plantuml-tracker-2/decision-journal.md`）。

**修复之前的证据（历史）。** `2368` 是参考成员。它的 `376->76` 弧朝与 C 相反的拐角拆分；该图以及该弧修复前 C 和移植版的路径保留作记录。

::: details 图定义（`2368.dot`）
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```


### A4. 参照程序处于公认的损坏状态（init_rank / pathplan 族） {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**受影响（graphviz 16.1 扫描）：** `1435`（structural-match，一个样条控制点上的 maxΔ 0.39；对 15.x 参照程序时为 503——该下降未经二分定位）和 `1581`（diverged：顶层子元素数为 39 对 22，maxΔ 0）。该族成员 `1939` 和 `2825` **已一致**，没有条目；`2470` 和 `graphs-structs` 于 2026-07-11 加入它们（在 ortho 邻接溢出/chancmpid、fmadd `polylineMidpoint` 以及半偶数舍入修复落地后，两者都收敛为 conformant——移植版现在精确复现参照程序的恢复输出，包括相同的丢失边）；它们的接受条目已退役。**`2796` 和 `2471` 在 graphviz 16.1 加入了它们**（两者在最新扫描中均为 `conformant`，接受条目已退役）：移植版与 16.1 参照程序现在对 `init_rank` 恢复输出（包括丢失的边）一致。原因未经二分定位（候选是 16.1 的 dotgen 移植 `3cfbf55c` 和丢失边消耗修复 `5b6b9bfc`）；下面对 `init_rank` 的描述作为该类别的机制保留，而这两个 id 由对齐度扫描固定为 conformant。

`1581` 和 `2825` 是崩溃恢复案例（fix-element-count-bucket 任务）：模糊测试/退化输入，上游测试对它们**只**断言 dot 不崩溃（`test_1581`：无 ASan 违规；`test_2825`：`rebuild_vlists` 返回 -1 时不崩溃）。C 遇到内部 `Error:`（`install_in_rank` / `rebuild_vlists: lead is null`），其恢复过程会丢弃布局内容；移植版做出**完全相同的 rankset 删除决定**（已验证警告一致：`mark_clusters` 的 “already in a rankset” 警告中节点/图的名称相同，cluster.c:317-320）。

`2825` 现已完全关闭。fix-2825-rebuild-vlists 任务（在 1581 之后）首先在一个层面上弥合了差距：移植版到达 C *精确*的内部错误状态——stderr 逐字节相同，包括消息顺序（`Error: rebuild_vlists: lead is null for rank 1`，随后是无前缀的 `agerr(AGPREV, ...)` 延续消息 `concentrate=true may not work
correctly.`）——并且 `dotLayoutPipeline` 正确地传播了 `dot_position` 的失败，从而跳过 `dot_splines`/`dotneato_postprocess`，与 C 的 `dotLayout` 一致（`dot_position` 之后的 `if (r != 0) return r;`，dotinit.c:322-325）。随后的跟进（第 2 部分）又弥合了剩余的渲染层差距：C 的 `emit_node` 以 `node_in_box(n,
job->clip)` 为每个节点设置门槛（emit.c:1806-1809），而在这条中止路径上，`job->clip` 是退化的，因为 `GD_bb` 从未被 `set_aspect`（位于被跳过的 `dot_position` 尾部）设置——所以 C *一个*节点都不输出，只输出（同样退化的）簇边框。移植版移植了同样的 `node_in_box` 门槛（`src/gvc/device.ts:renderNode`，使用 `job.bb`/`job.pad` 作为 `job->clip` 的单页等价物），并且在 `g.info.bb` 未设置时不再根据实时节点位置重新计算一个看似合理的包围盒（`src/gvc/device.ts:render`，`job.bb = g.info.bb` 原样使用，对应 `init_gvc` 的 `gvc->bb = GD_bb(g)`，emit.c:3272）——每个布局引擎在每条非中止路径上都会在 `render()` 运行之前自行设置 `g.info.bb`，所以对正常的图这是逐字节相同的，只改变这条中止路径上的输出。`2825` 现在是 `conformant`（4 个元素的输出，与参照程序逐字节相同）。两部分完整的机制追踪见
`.agent-notes/2825-rebuild-vlists-abort.md`。`1581` 根本不会到达不一致状态（那是一个*不同的*上游簇窗口缺陷，不是 `rebuild_vlists`），所以它会完整地布局其幸存的图——该差距仍未解决。`1581` 上的参照输出是没有上游定义语义的恢复残骸。证据：
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md)。在这些输入的每一个上，据 graphviz 自己的说法，出问题的都是 **C 参照程序**：`2471`、`1939` 和 `1435` 在上游都是
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
（问题
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471)、
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939)、
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435)，参见
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)）；唯一的修复尝试，
[草稿 MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849)，仍是未合并的草稿（最后编辑于 2026-03-20）。`graphs-structs` 属于古老的记录节点路由丢失类别（#102/#242/#274/#1323），稳定版 graphviz 15.0.0 能够正确渲染它——这是开发版参照程序的回归。

**C 做了什么。** 在 `init_rank` 成员（`2796`、`2471`、`1939`）上，原生 dot 的 x 坐标辅助图通过簇壁约束边闭合出一个有向环；它的
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
无法扫描到每一个节点，打印出 `Error: trouble in init_rank`，布局便从该恢复状态继续进行——在 `2471`/`2796` 上以 `Pshortestpath` 三角剖分残骸和丢失的边告终。在 `1435` 和 `graphs-structs` 上，损坏的阶段是 pathplan 本身（耳切三角剖分走进死胡同；丢失一条记录端口的边）。

**输入已验证，然后被改得忠实（这是最关键的部分）。**
`verify-oracle-bug-family` 任务
（[简报](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md)）
逐行导出了双方送入网络单纯形的约束图，对该族的每个成员都是如此——并发现移植版此前在这个族上的“干净”表现，来自**四个真实的移植缺陷**，现已全部修复：

1. `flatEdges` 跳过了 C 的
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   调用，使簇的层级窗口在平标签虚节点插入之后保持陈旧（仅此一项就使移植版在 `2471` 上丢失 **9** 条边，而 C 丢失 6 条）。
2. 同 `group` 的边惩罚被施加在自环上，而不是两端属于同一个非空 group 的边上
   （[`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)）。
3. `CL_CROSS` 使用了 C 的 `_WIN32` 值 100；参照程序所在平台使用的是 1000
   （[`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)）。
4. 三角剖分死胡同使 `Pshortestpath` 中止，而 C 是警告并继续，再回退到直线
   （[`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)）。

修复之后，该族的 NS 约束导出与 C **逐行相同**（`2471` 上 253 次 rank2 调用；`1939`/`1435`/`graphs-structs` 上的全部调用），并且移植版沿着公认损坏的恢复过程与 C 保持一致：丢失的边相同（2796 上是 `3->16`；2471 上是相同的 6 条），元素树相同。`1939` 变为完全一致。其余的数值差值（以及 1435 不同的 pathplan 残骸）是恢复状态*内部*的行为，项目策略有意不去追逐。

**`2723`（段错误；已固定，不再追逐）。** 原生 `dot` 在
`tests/2723.dot`（无向、`rank=same` 分组、带标签的边）上发生段错误（退出码 139），因此 C 没有可供匹配的输出。上游
[问题 #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) 仍未解决，
`tests/test_regression.py:test_2723` 为 `xfail`。移植版抛出
`InternalError`（`INTERNAL_ERROR`，其 `TypeError` 原因来自
`src/layout/dot/flat.ts:flatLabelYpos`，其中 `rank[r-1]` 未定义）。由于没有正确的参照程序，如实的失败保持原样，移植版不作更改；
`src/layout/dot/flat-2723.test.ts` 将其固定。如果上游修复了该问题，请更新那个测试。

**策略说明。** 较早的 A4 立场（“移植版符合该问题的预期；不要复现”）基于这样一种看法：移植版的无环辅助图来自某种无害的局部变体。事实并非如此——它来自缺陷（1），而该缺陷明显使 `2471` 出现了错误。对 C 源代码的忠实赢了：移植版现在从经验证相同的输入出发，复现 C 公认损坏的结果，并且这里的每一个条目都应当在**上游修复相应问题时重新测量**（参照程序的输出会改变；预期这些 id 在那次升级时会作为回归亮起——这是有意为之，不是腐化）。

**证据。** 逐 id 的比较页面（并排渲染结果 + 证据记录）：
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md)、
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md)、
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md)、
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md)、
[`2796 修复后补充`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
（修复前的基线保存在
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)）。
诊断产物：`.agent-notes/2471-stale-cluster-windows-missing-reset.md`、
`.agent-notes/1939-group-penalty-clcross-misports.md`。

### A5. 无效的输入字节（编码表示） {#a5-invalid-input-bytes-encoding-representation}

**受影响：** `1367`（diverged，maxΔ 0——恰好一处结构差异）。

**有何不同。** 输入文件在一个节点名称内含有一个裸露的 UTF-8 尾字节（`0x80`）。C 把裸露的 0x80–0xBF 尾字节视为“代表其自身的有效字符”（`lib/common/utils.c:1200-1207`，无警告），并且节点名称的 `<title>` 文本完全绕过字符集转换（`agnameof` 的字节直接流向 `gvputs_xml`）。因此参照程序的 SVG 包含原始字节，尽管声明了编码，它**并不是有效的 UTF-8**。移植版用 latin1 回退解码无效 UTF-8 的输入（`0x80 → U+0080`），并输出格式良好的 UTF-8（`\xc2\x80`）。

**为何接受。** 移植版的 I/O 边界是 JS 字符串（浏览器库）。原始的无效字节无法通过 `renderSvg` 的字符串返回值往返；要逐字节匹配 C，就意味着为每一位使用者破坏输出编码。latin1 回退与 C 自己的“按 Latin-1 处理”恢复语义一致（`utils.c:1249`）。这是代码之下的约束——表示层——而不是我们拒绝移植的某种可移植行为。1367 中的其他一切都是一致的：元素数量（23 个 polyline / 103 个 text / 44 个 polygon / 24 个 path）以及所有坐标，在 decorate（T6）修复之后都匹配。

**同样的情况也适用于 HTML 的 `SIDES` 警告。** `sidesfn`（`lib/common/htmllex.c`）对取值中每个不是 `l`、`t`、`r` 或 `b` 的字节各警告一次。它用 `%c` 打印该字节，用 `%d` 打印其有符号 `char` 值。对于非 ASCII 字母（`é` 是 `0xC3 0xA9`），原生版本写出两个孤立的字节，因此它的 stderr 也不是有效的 UTF-8。移植版以相同的数值（`-61`、`-87`）打印相同的两条警告。因为它的警告是 JS 字符串，所以把每个字节显示为具有该 Latin-1 码点的字符（`Ã`、`©`）。

**标签中的部分数字字符引用同样如此。** `htmlEntityUTF8`（`lib/common/utils.c`）自行将引用的值写成一到三个字节。对于 `&#127;`、`&#2047;`、代理码位（`&#55296;` 至 `&#57343;`）以及任何大于 `0xFFFF` 的值（`&#128512;` 得到 `FF 98 80`），这些字节不是有效的 UTF-8，原生版本按原样写出。移植版写出引用所指的字符。文本宽度按字节估算，因此标签宽度也可能不同。HTML 标签不受影响：expat 会将其引用解码为有效的 UTF-8。

**证据。**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
比较页面（并排渲染结果 + 证据记录）。

---

### A6. 退化输入上的 `unsigned int` 画布溢出 {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**受影响：** sfdp 的 `2556`（一个 NaN 布局；见引擎轨道条目）。`1314`——一个由模糊测试产生的输入（`fontsize="991836031967s8"`），其荒谬的字体大小把绘图撑大到约 2.75e11 pt——在 graphviz 16.1 为 **conformant**，其接受已退役：移植版现在像原生 `ROUND` 转换那样收窄页面尺寸（`47f3165d`），并按 `setup_page` 的顺序构建页面裁剪（`da6c4a53`）。下面的机制段落描述的是最初的差异。

**发生了什么。** C 把 `job->width` / `job->height` 存为 **`unsigned int`**（`gvcjob.h:327-328`）。对巨大点数大小的 `ROUND(...)`（`emit.c:1249-1250`）溢出 32 位并按 2³² 取模回绕，而 SVG 后端通过**有符号**的 `%d` 输出它（`gvrender_core_svg.c:258-259`）——因此 C 打印出 `height="-425618343"`。移植版保留数学上自洽（未回绕）的值。其他每一个值——节点椭圆的 `cx/cy/rx/ry`、根的 `translate`、多边形、文本的 `font-size`——都是逐字节相同的；只有顶层 `<svg>` 的宽度/高度不同。

**为何我们不去追逐它。** 复现 C 的 32 位整数溢出并不是值得移植的布局行为，而且这个输入是退化的。如果上游修复了该溢出（例如加宽字段或钳制大小），再重新考虑。

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. 退化的 NaN 布局（`sfdp`，病态的 `repulsiveforce`） {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**受影响：** `2556`——`repulsiveforce=100`（⇒ 斥力使用 `pow(dist, 101)`），这会使弹簧-电场求解器在**两个引擎中都**得到 **NaN**。原生参照程序自身输出的所有节点/边位置都是 `nan`，包围盒也是退化的。

**发生了什么。** 在每个坐标都是 NaN 的情况下，两个实现对这些垃圾值的序列化方式不同：（1）图的包围盒 / 背景多边形——C 把 `NaN` 舍入为 `int`，在 arm64 上得到 `INT_MIN` 量级的垃圾值（`bb="0,0,-4.295e+09,
-4.295e+09"`）；移植版保留 `0`。（2）边的绘制操作——原生的输出过程会抑制 NaN 样条的 `_draw_`/`_hdraw_`（只输出 `pos`），而移植版则带着 NaN 控制点输出它们。节点绘制是匹配的（双方都抑制）。双方都不存在真正的布局。

**为何我们不去追逐它。** 移植版已经复现了与原生*相同*的 NaN 崩溃——使其达到这一点的修复是真实的（见下文）；剩下的只是各自如何序列化 NaN 垃圾值。在一个双方布局都已退化的输入上，复现 C 的 `(int)NaN` 未定义行为及其对 NaN 样条的绘制抑制，并不构成有意义的布局保真度。如果上游钳制 `repulsiveforce` 或清理 NaN 位置，再重新考虑。

**使其可达的移植修复（不是被追逐走的——是真实的缺陷）。** 在这些修复之前，移植版甚至无法到达退化状态：（1）`armPow`（`src/common/arm-pow.ts`）遇到任何非快速路径的参数都会抛出异常；现在它移植了 ARM `pow.c` 完整的特殊情况分支，使 `pow(NaN, y) = NaN`，与 libm 一致。（2）`bezierClip`（`src/common/splines-geom.ts`）遇到 NaN 控制点会无限循环，因为它的收敛判断是对 C 的 `while (ABS > .5)` 的朴素取反（对有限值等价，对 NaN 则不然）；现在它精确地镜像 C，并在 NaN 时终止。两者都忠实于 C，且只影响 NaN 输入。

---

### A7. `round()` 箱壁舍入边界（`dot`） {#a7-round-box-wall-rounding-boundary-dot}

**受影响：** `graphs-honda-tokoro`，以及（2026-07-28 新增，属于 905 项全集中的新成员）它位于 `graphs/directed/` 下的同类 `tree-graphs-directed-honda-tokoro`（两者都是 structural-match，单条边 `n012->n011` 上 maxΔ ≈ 1 pt）。该同类与前者的区别仅在于 `samearrowhead` 属性，这些属性不影响这一对边的路由——它的 `n012->n011` 几何在移植版和参照程序两侧都与被接受的 id 逐字节相同，所以下面的机制可以原样适用。

**有何不同。** 对于两条 `n012->n011` 平行边共用的 `samehead` 端口，`maximal_bbox` 的头部通道箱壁在 C 中落在内部 x=90，而在移植版中是 x=89。共享端口的构造（`buildSharedPort`）和平行边分组都与 C 逐字节一致；这 1 px 的差距纯粹是 `round()` 舍入边界的产物——上游约 1e-14 的浮点噪声，把一个恰好位于 `.5` 边界上的值推到了相邻的整数。移植版的 `maximal_bbox` 公式已经与 C 的精确一致。

**为何我们不去追逐它。** `round()` 是语料库中每一条被路由的边都要经过的原语；为了匹配这一个案例而微调其边界行为，会带来整个语料库范围内的回归风险，而收益只是 2 条边上的 1 px——与 `bbox-class-control-hull-vs-curve` 中提到的控制凸包舍入属于同一个共享原语约束。完整诊断：
`.agent-notes/honda-samehead-shared-port.md`。

---

### A8. `fp-contract`/FMA 舍入与严格 IEEE 的对比（`dot`）— 已关闭 {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**状态（2026-10-12）：已关闭。** 不再有语料库 id 被归入该类别而被接受；本节作为历史文档保留。两个已知实例均为 **`conformant`**：`2620`（2026-07-11）和 `2646`（2026-10-12）。

**类别。** clang arm64 以 `-ffp-contract=on` 编译参照程序的二进制文件，把选定的乘加序列融合为单条 FMA 指令；而移植版运行在执行严格 IEEE-754 舍入的 V8 上。在逐位相同的输入上，两者在编译器选择收缩的任何表达式处会相差 1-2 ULP。已知有两个实例，位于两个不同的位置，具有两种不同的放大机制：

- **2646** — ULP 出现在 `Proutespline` 的 `points2coeff`/`solve3` 三次方程求解内部，并直接翻转了样条拟合器的根数。
- **2620** — ULP 出现在 `poly_init` 的多边形顶点范围循环中（节点尺寸计算），并被下游 `ortho` 忠实的逐次松弛整数截断放大，导致一个代价相等的迷宫通道平局翻转。

**已关闭：`2646`（`0cc05181`，`fix(pathplan): mirror clang fma contraction in spline intersection`）。** 三条 smode 长边的线段（`edge2575`、`edge3905`、`edge15467`）终止于切线平行的障碍壁，所以 `splinefits` 的求交三次方程有一个近似二重根。`points2coeff` 通过灾难性抵消来构造该三次方程；参照程序融合了 `route.c:397-398` 和 `solvers.c:43`，所以严格 IEEE 的移植版得到了不同的 `solve3` 根数、一个虚假的交点和一次额外的 `a` 减半（maxΔ 42.09）。先前认为这不可约的结论（“在整个样条拟合器中做软件 FMA 模拟”，且部分修复被证伪）已被推翻：收缩位置是有限且可枚举的。移植版现在镜像了 `points2coeff`（`route.c:397-398`）、`splineintersectsline`（371-372、374、360-361、383-384）、`solve3`（`solvers.c:41, 43, 46`）及其内联的 `solve2`（80、85）中的每一处收缩，并且 `solve3`/`solve2`/`solve1` 已按 C 的形态重新移植。`2646` 捕获到的全部 42,432 次 `Proutespline` 调用都与参照程序逐位相同（日志行“T7 land”）。原始诊断（对机制仍然有效）：`plans/residual-cleanup/analysis/2646-fp-contract.md`。

**受影响（历史）：** `2620`（曾是 structural-match，maxΔ 585；24 条边路径和 22 个箭头上共 423 处差异）。**于 2026-07-11 收敛为 conformant**：忠实的 `sgraph` 邻接缓冲区溢出 + `chancmpid` 双向包含移植（见 `.agent-notes/ortho-maze-circo-rca.md`）消除了该差异；其接受条目已退役，本节作为 A8 类别的文档予以保留。

**有何不同。** 在输入相同的情况下，`ortho`（`splines=ortho`）流水线与 C 逐字节一致——通过把 C 精确的迷宫输入（坐标、`xsize`/`ysize`）注入移植版的 ortho 阶段得到证明：378/378 条路由线段逐字节相同，所以 `src/ortho` 中没有任何问题。实际的差异是迷宫*输入*中的 1-2 ULP：节点的 `ysize`（以及通过层内累加，`ND_coord.y`）是在 C 的 `poly_init` 多边形顶点范围循环（`shapes.c`）中计算的，在 `-ffp-contract=on` 下，`R.x += sidelength*cosx` 被融合为一条 FMA，结果比移植版严格 IEEE 的算术大约 1 ULP（两侧实现的是算术上完全相同的表达式）。`2620` 有 173 个宽度为小数的多边形节点；全部都是 C 比移植版大 1-2 ULP。这个 ULP 被 `ortho` 的 Dijkstra 松弛放大——而不是由它引入——该松弛忠实地逐步截断其累计距离（`sgraph.c:165`，移植版对应为 `Math.trunc`），所用权重来自原始单元格范围（`maze.c:257`）。ULP 偏移的几何使 4 条被路由的边（路径及其箭头）的一个代价相等的通道平局翻转；其余差异是这 4 次翻转引发的 ±1 轨道重新编号的连锁结果。

**为何接受（不可约性经受控实验证明）。** 一个仅改变 `-ffp-contract` 的独立 C 测试程序，在出现差异的六边形顶点上复现了双方：`-ffp-contract=on` → `310.29250168188713`（匹配参照程序），`-ffp-contract=off` → `310.29250168188707`（匹配移植版），出现差异的运算被隔离到顶点 `i=3`（融合时 `R.x=-0.50000000000000011`，未融合时 `-0.5`）。第二个输入注入实验（唯一变量：ortho 的输入值）确认了放大器：把 C 精确的 `coord`/`xsize`/`ysize` 喂给移植版自己的 `orthoEdges`，会使全部 4 处通道差异归零——ortho 代码没有缺陷，它只是对其输入中 1-2 ULP 的偏移很敏感（C 自己的迷宫代价路由也是如此）。要匹配，就意味着在 `poly_init` 中模拟 clang 对一棵已编译表达式树的特定 FMA 收缩——追逐的是编译产物，而不是移植源代码的语义。
完整诊断：`plans/ortho-2620-residual/analysis/2620-ortho-route.md`。

**被模拟的例外（未被接受）：`triang.c:ccw`。** 有一个收缩位置被逐位复现，而不是被接受：pathplan 的 `ccw` 编译为 `fnmul`+`fmadd`（精确的第一个乘积 − 舍入后的第二个），所以一个与线段端点逐位相等的查询点会被测试为 ISCW/ISCCW，而不是 ISON。随后 `shortest.c:pointintri` 会拒绝多边形顶点端点（“destination point not in any triangle”），并且 `makeMultiSpline` 对每一个合并的 2 环都回退到普通路由——这是一种大规模的、离散的、整个语料库范围的行为，移植版必须与之匹配。与上面的 `solve3`/`poly_init` 位置（深藏在已编译的表达式树内部，修复被证伪）不同，`ccw` 是一个独立的、语义清晰的已编译函数，所以 `src/pathplan/triang.ts` 模拟了它：在普通双精度的快速路径上使用保守的误差界（在普通与融合符号可证明一致的地方），而对接近零的情形使用精确的 Dekker 乘积 + 二进制有理数 BigInt 路径。

---

### A9. libm 三角函数 1-ULP → CDT 共圆平局翻转（`circo`/`twopi` 多重样条） {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**类别。** V8 的 `Math.sin`/`Math.cos` 与 Apple libm 的 `sin`/`cos` 并不逐位一致（已证明：在 `2π·4.5/8`，即八个椭圆障碍角度之一，存在 1 ULP 的差异）。`makeObstacle` 的外接 8 边形角点继承了该 ULP，所以三角形路由器的输入坐标与参照程序相差 ≤6e-14。对称的布局（同一层/环上大小相等的节点）使路由器的四边形在实数运算中**精确共圆**，所以精确的内切圆判定恰好处于刀刃边缘：输入的 ULP 翻转了它的符号，受约束 Delaunay 的对角线随之翻转，而在参照程序中使 `Pshortestpath` 失败的通道多边形（“destination point not in any triangle” → 回退到普通样条）在移植版中成功了（反之亦然）。得到的样条相差约 0.2–0.5pt。与（现已关闭的）**A3**/**A8** 是同类：位于 C 源代码语义之下的不可约浮点可移植性约束——要匹配，就需要在 JS 中复现 Apple libm 的 `sin`/`cos` 的精确舍入。

**16.1 重新基线。** 多重样条通道的几何缺少 clang 的 FMA 收缩（椭圆角点的被开方数、`mkCtrlPts`、`DIST` = sqrt(fmadd)、`line_intersect` 的点积）；`f66ac638`（`fix(neato): mirror fma contraction in multispline routing geometry`）镜像了它。twopi 和 neato 的 `241_0`——该类别曾把它们归因于下面的共圆平局——变为 **conformant**（接受已退役），而 sfdp 的 `42` 被证明根本没有平局（它是 A1 漂移，参见 [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)）。fdp 的 `241_0` 后来也变为 **conformant**，那是移植版在三角剖分上的第二次修复（边交换之后的面顶点顺序；参见下面的 fdp 段落）。circo 和 sfdp 的 `241_0` 仍然存在差异，残余不变或有所减少；它们归因于下面平局的结论早于 `f66ac638`，并且自该修复表明同样的归因对 twopi/neato 是错误的以来，**尚未通过位置注入重新验证**。

**受影响：** `241_0`（circo Δ≈0.2，源自边 `1->2` 上的通道翻转；下面引擎轨道上的 sfdp `241_0`）；`2343`、`2239`、`share-b29`、`windows-b29`（twopi，每个有 1–2 处边标签位置差异——libm 的 1 ULP 出现在 `poly_init` 的单位顶点三角运算（`hypot`/`atan2`/`sin`）中，使一个节点计算出的高度比参照程序精确落在的最小尺寸钳制值多出 1 ULP，并通过 xlabel R 树加载中的 `floor()` 级联为单个标签候选的翻转。曾尝试正确舍入的 hypot 修复，并被证伪：它修好了 `2343`，却使 `2168_3` 出现回归，后者的八边形尺寸计算流经同一个调用，而参照程序在那里的值并不是正确舍入的——没有任何确定性的 hypot 策略能同时在两者上匹配参照程序）。
`2168_1` 原本属于这个类别，但在移植版模拟了参照程序经 fp 收缩的 `ccw`（pathplan 的 `triang.ts`）之后变为一致：它的通道失败由经 FMA 的 `pointintri` 顶点端点拒绝所决定，移植版现在能逐位复现这一点，所以 CDT 对角线的 ULP 平局不再在那里出现。

**为何接受（不可约性经受控实验证明）。** CDT 本身已被排除嫌疑：移植版的 `mkSurface` 是 GTS 0.7.6 增量插入的忠实移植（`cdt.c`：1→3 分裂 + 递归的 `swap_if_in_circle`，约束边预先创建且不可交换，`remove_intersected_*` + `triangulate_polygon` 的约束强制），并且一个链接**真实 GTS 库**、并以移植版逐位精确的路由器输入驱动的独立 C 测试程序，逐面复现了移植版的三角剖分（2168_1：22/22；241_0：185/185）。对两组输入集上的内切圆行列式做精确有理数求值，确认了符号翻转（移植版输入为 +1，参照程序输入为 −1）。剩下的变量——1 ULP 的三角函数差异——是通过直接比较 `Math.sin`/`sin` 的位模式隔离出来的。

**引擎轨道接受（`accepted-divergences-engines.json`）。**
<a id="a9-engine-track-twopi-circo"></a> twopi/circo 的 **xdot 引擎轨道**
（`parity-twopi.json` / `parity-circo.json`，原生 `dot -K <engine>
-Txdot` 参照程序，`test/corpus/engine-walk.ts`，以 ±0.01 做语义化绘制操作比较——参见 `test/golden/compare-xdot.ts`）独立于上文提到的 dot 引擎 SVG 调查，暴露出同一机制：twopi 的 `2239`（1 处绘制操作差异——`_ldraw_` 边标签文本位置翻转，即同一个 `poly_init` 单位顶点三角函数 ULP，经由 `floor()` xlabel R 树链条级联而成；`2343`、`share-b29` 和 `windows-b29` 原本在此条目下被接受，于 2026-07-11 被 `polylineMidpoint` 中忠实的 fmadd 收缩*修复*——见下面的 b29 族段落）以及 circo 的 `241_0`（41 处绘制操作差异，边 `1->2` 的路由贝塞尔曲线上 Δ≈0.2pt——同样是 CDT 对角线通道翻转；决策日志，2026-07-10 的 “CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed” 条目）。该差异在引擎轨道层面通过
`test/corpus/accepted-divergences-engines.json` 被接受，并由 `parity-report.ts` 并入
`PARITY-twopi.md`/`PARITY-circo.md`——与 `accepted.ts` 为 dot 轨道的 `PARITY-dot.md` 所做的合并相同。

**circo `2475_2` 与 `2095_1` — 共圆 closestNode 的 hypot 平局（已修复）。** 在这个 10762 个节点的图中的一个 28 节点组件里，circo 的 `getRotation`
（`circpos.c:73-92`）通过 `hypot` 选出离布局原点最近的块节点，以决定子块的旋转。两个共圆的节点实际上是等距的；V8 正确舍入的 `Math.hypot` 与 Apple libm 的 `hypot` 对该距离的舍入相差 2 ULP，这翻转了严格的 `<`，选中了另一个节点，并使子块旋转/反射约 20°（18 个节点移动，最大 296.7pt；其余 10744 个节点逐位相同，块树、圆周顺序和每个 `centerAngle` 也是如此）。`2095_1` 也落在同一个平局上（2197 处绘制操作差异，三次刚性块旋转）。两者一直被接受到 2026-10-16；那天最近节点搜索改用移植版中 Apple `hypot` 的逐位精确模型（`src/common/libm-hypot.ts`），现在两者都符合。独立复现：
`.agent-notes/circo-2475-590-repro.dot`；完整根因分析：
`.agent-notes/circo-b81-2475-rca.md`。

**twopi `2470` — 被 xlabel R 树放大的径向坐标 ULP。**
2470 是一个有 140 条边的图，其 HTML `<table>` 边标签聚集在几乎重合的径向锚点上。在 neato 家族中，边标签由贪心的 xlabel 放置器（`label/xlabels.c`）作为外部标签放置，它通过按 Hilbert 顺序排列的 R 树选出重叠最少的候选角点。移植版的样条和节点坐标在输出精度下与参照程序匹配（即使在 1e-7 下，样条/节点/包围盒差异也为零），但有一个节点的径向 `ND_coord.y` 相差约 2 ULP（Apple libm `sin`/`cos` 对 V8 `Math`）——远低于一致性标准，却恰好跨过 `objplpmks` 中 `floor(pos.y − sz.y/2)` 在 0 处的边界，使该对象的 R 树矩形翻转一个单位。Hilbert 顺序/树分组的变化使 `RTreeSearch` 剪掉了不同的分支，于是约 140 个标签各自吸附到相邻的候选角点（每处差异都是一个固定的（+宽度，−行高）步长）。放置器、对象顺序、矩形舍入、`CombineRect`（它忠实地镜像了 C 的 min-min 怪癖）以及 int32 Hilbert 键，都已分别验证是忠实的；差异来自上游的径向三角函数 ULP，与 twopi `1855` 出于同样的原因而不可约。2026-07-11 接受；完整根因分析：
`.agent-notes/twopi-2470-rca.md`（其中还记录了该 id 当天早上的“通过”是陈旧参照程序二进制文件造成的假象，而不是移植版的回归）。

**osage `1855` — 障碍顶点的 fp-contract 扩散。** 有别于上文 twopi 的 `1855` 径向镜像条目：在 osage 下，节点中心与参照程序逐位精确，而 110 处绘制操作差异是三条经障碍路由的边被放在了节点行的镜像一侧（X 逐位精确，Y 镜像）。来自
`circumscribed_polygon_corner_about_ellipse`（`neatosplines.c:301`）的八边形障碍顶点与 C 相差 3–4 ULP，因为 clang 的 `-ffp-contract=on` 把 `ellipse_tangent_slope`/`line_intersection` 中的 `a·b±c` 链融合成单次舍入的 FMA，而 V8 对每个运算都分别舍入：C 的融合舍入把一列沟槽角点 x 值收拢为一个逐位相同的双精度数（精确共线），移植版则把它拆成两个相差 1 ULP 的值。这翻转了可见性 `clear()` 的相切测试——沟槽不再被阻挡——增加了约 20 条可见性边，Dijkstra 于是把上/下同伦平局解决到了镜像一侧。受控实验：把 C 精确的障碍坐标注入其余部分保持不变的移植版，得到**零**条存在差异的边，从而完全排除了合法排布、可见性、Dijkstra 和样条这条链路的嫌疑；单独注入 C 的 libm `cos`/`sin` 则没有任何效果。2026-07-11 接受；完整根因分析：`.agent-notes/osage-spline-family-rca.md`。

**b29 族（twopi，已修复）。** 四个 b29 变体曾共用一个刀刃：`EqmtTyp` 边标签（`Node14732->Node14731`）曾处于一个精确的 placeLabels 边选择平局上，其结果曾取决于周围对象中 twopi 布局的 1 ULP 漂移。借助 `polylineMidpoint` 中忠实的 fmadd 收缩（states 族修复，2026-07-11），移植版的标签锚点变得与参照程序逐位相同，然而该平局在四个变体中的两个（`graphs-b29`、`linux.i386-b29`）上仍然得到相反的结果，而另外两个（`share-b29`、`windows-b29`）当时已一致——并且 `2343` 被接受的 A9 标签差异已完全消除。界限：1 处绘制操作，标签 y 方向 Δ12pt。2026-10-20 起，移植版中的每一次 Bezier 求值都改为经由同一个融合的 `bezier()`，因为 clang 会收缩 graphviz 的 `Bezier`（`e37e72f0`）。这消除了上游漂移：`graphs-b29` 和 `linux.i386-b29` 现在也已一致，它们的接受已撤销。完整根因分析：
`.agent-notes/twopi-states-rca.md`。

同样的 placeLabels 刀刃也曾出现在 **osage** 轨道上（2026-07-11 接受，完整根因分析：`.agent-notes/osage-small-tail-rca.md`）：
`linux.i386-b29` 和 `share-b29`（各有 2 处绘制操作差异——一个边标签的 x 锚点落在 878.28 而不是 841.06，围绕逐位相同的样条中点 859.67 对称放置，即 ±标签宽度的一半；这两个变体互为镜像）以及 `1652`（2 处绘制操作差异——两条边各自围绕相同的中点翻转一个标签锚点，一个在 x 方向，一个在 y 方向，样条和箭头逐位相同；参照程序渲染完整，所以这不是已知的原生超时抖动）。在每种情形中，边的几何当时都是逐位精确的，只有标签边选择的平局在 1 ULP 漂移的周围环境下得到了相反的结果。2026-10-20 的融合 `bezier()`（`e37e72f0`）同样消除了这一漂移：这三者现在都已一致，未被接受的 osage `2371` 也是如此，它们的接受已撤销。

osage 轨道带有 `polypoly` 三联组（`graphs-polypoly`、`share-polypoly`、`windows-polypoly`；2026-07-11 接受，完整根因分析见
`.agent-notes/patchwork-tail-rca.md`）：唯一出现差异的运算，是在一个扭曲四边形朝向 180 的顶点处裸露的超越函数 `cos(π+θ)`——V8 的 `Math.cos` 是正确舍入的，而 Apple libm 的 `cos` 带有与参数相关的 ±1 ULP 误差（所以只有在 libm 下 `|cos(π+θ)| ≠
|cos(θ)|`）；这 1 ULP 的节点尺寸差值进入 pack 的 `GRID`/`ceil`，打破周长平局，qsort 把两个组件放进了彼此的打包单元——这是整个节点的刚性互换，不存在形状或路由错误。没有任何确定性的改写可以复现非正确舍入的 libm 超越函数，这正是教科书式的 A9 形态。

2026-07-28 在更大的同类 `tree-graphs-directed-polypoly`（`graphs/directed/polypoly.gv`，属于 905 项全集中的新成员；112 处绘制操作差异，仅 osage）上确认了同一机制。出现差异的运算是同一个节点 `9004` 的 `cos(π+θ)` 1 ULP 位置——C 与移植版的 `bb.x` 值与最初的根因分析逐字节吻合——但在这个 76 节点的输入上，传播经由 osage 的 `arrayRects` 进行：`acmpf` 按原始的 `width+height` 之和对打包单元排序，libm 偏高 1 ULP 的宽度使 `9004` 严格排在其旋转后的同类 `9000/9002/9006` 之前，而 V8 正确舍入的值则留下一个精确的 4 路平局，由不稳定的 qsort 以不同方式排序——得到不同的行优先单元格、`9002`/`9006` 互换，以及一个列宽 `fmax` 级联使 8 个邻居在 x 方向发生移动。把 C 的节点尺寸与移植版的节点尺寸分别喂给移植版自己的 `arrayRects`，复现了扫描中 10 个移动的节点，其 x 方向增量逐字节吻合，闭合了因果链。

另有两个引擎轨道实例在 2026-07-11 找到根因并被接受（完整根因分析：`.agent-notes/circo-edge-tail-rca.md`）：twopi 的 `241_0`（6 处绘制操作差异，当时归因于与上文 circo 条目相同的 CDT 共圆内切圆平局；**已在 graphviz 16.1 退役**——自 `f66ac638` 起它已是 conformant，所以 14 点与 8 点通道的翻转是未镜像的 FMA 收缩，而不是平局）以及 circo 的
`windows-tree`（一条扇出边上有 10 处绘制操作差异——circo 的布局三角运算使 `node2.y` 比 `node8.y` 恰好高 1 ULP，围绕精确对称的值 18.0，而 `closestSide` 的 dyna 头端口选择在这个精确的平局上翻转 TOP/BOTTOM；节点位置和箱在其他方面与参照程序逐位相同；**2026-10-18 已撤销**——移植版的 DIST2 采用 clang 的融合形式后，像 C 一样判定这一精确平局，现已一致）。

**sfdp 引擎轨道 — 边的浮点平局（`241_0`）。**
<a id="a9-sfdp-fp-ties"></a> sfdp 的 xdot 引擎轨道（`parity-sfdp.json`，
原生 `dot -Ksfdp -Txdot`，±0.5）在注入精确的原生路由前位置之后，暴露出 CDT 共圆内切圆平局（所以该差异**不是**迭代漂移——参见 A1-drift 类别——而是一个离散谓词的平局）：

- `241_0` — 归因于 CDT 共圆内切圆平局（多重样条通道；`f66ac638` 之后未重新验证，参见上面的 16.1 重新基线）。残余是**段数翻转**：边 1->2 上有 7 处绘制操作差异，`ptCount 8 vs 20`（`f66ac638` 之前为 20 处差异）——通道以 N 点样条成功，而原生构建则回退到更短的普通路由（或反之），与上文 circo 的 `241_0` 条目一样。移植版已经在内切圆/`ccw` 谓词中模拟了 arm64 的 `fmadd` 收缩（`src/pathplan/triang.ts`、
  `src/common/fma.ts`），并使用稳健的内切圆 Delaunay；残余是谓词输入中 V8 与 Apple libm 的 `sin`/`hypot` 相差 1 ULP，任何可移植代码都无法复现它。

> **sfdp 的 `42` 从 A9 重新归类为 A1 漂移（graphviz 16.1 同步）。** 它此前在这里被列为 CDT/libm 内切圆平局。该任务发现并非如此（[`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)）：先前的通道翻转是多重样条通道几何中移植版一侧的 FMA 错误移植，已由 `f66ac638`（`fix(neato): mirror fma contraction in multispline routing geometry`）修复；注入原生位置后，移植版现在精确复现原生的 xdot。剩余的残余（节点偏移 0.06-0.65 pt）是迭代漂移，其种子是最粗层级上 Apple libm 的 `pow(dist, 2)` 与移植版的 ARM `pow` 之间的一处 1 ULP 不一致，并被更细的层级放大——A1（参见 [A1](#a1-floating-point-determinism-force-directed-engines)）。

> **`2095` 从 A9 重新归类为 A1-drift（2026-07-22）。** 它此前在这里被列为“hypot 同类”（空名称节点 `""->"4"` 的边上低于 0.7pt 的漂移）。该残余是一个**测试工具的假象**：归因注入器的 `GVTS_POS` 正则要求至少一个名称字符，所以名为 `""` 的节点从未被注入，并牵连了它的两条关联边。在注入器被修复为匹配空名称之后（`(.+)`→`(.*)`，`src/layout/neato/splines.ts`），sfdp 的 `2095` 注入后**残余为 0**——纯粹是力导向漂移，由计算得出的 A1-drift 类别涵盖，而不是路由的浮点平局。其逐 id 的接受记录已从
> `accepted-divergences-engines.json` 中移除。（与下面 fdp 的 `2095` 是同一发现。）

**全新的受控实验（2026-07-21）。** 一项原生与 V8 的 `hypot` 探测
（`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`）：编译系统 C 的 `hypot`，并与 Node 的 `Math.hypot` 在有代表性的平边偏差输入上比较，6 个中有 2 个存在 1 ULP 的差异（Δ 7.1e-15 和 5.7e-14）——正是翻转细分计数的拆分阈值刀刃。不可约：没有任何可移植的 hypot 能复现 Apple libm（`arm-pow.ts` 对同一边界有先例）。`sfdp.241_0` 在引擎轨道层面通过
`accepted-divergences-engines.json` 被接受。`sfdp.42` **不**属于这个类别：它的注册表条目是 A1（`comparisons/sfdp-42.md`），而上面的探测并没有解释它。

**fdp** 的 xdot 引擎轨道（`parity-fdp.json`，原生 `dot -Kfdp -Txdot`，±0.5）此前把同一个图 `241_0` 显示为属于这一类别：注入参照程序精确的路由前位置后，一条边（`0->1#0`，maxΔ 3.39pt）上仍残留 11 处数值型 `unfilled_bezier` 差异，并被归因于共圆内切圆平局。该归因是错误的。`fix(T9): start swapped cdt faces at the new diagonal as gts does`（2026-10-22）发现了移植版一侧的误移植：GTS 的 `swap_if_in_circle` 把它的两个新面构造为 `gts_face_new(en, e5, e2)` 和 `gts_face_new(en, e3, e4)`（`cdt.c:509-511`），而 `gts_triangle_vertices` 按边的顺序读取一个面，因此原生版本将它们列为 (v3, v4, v2) 和 (v4, v3, v1)；移植版把两者都存成了旋转一位的顺序，多重样条路由器的 `triCenter` 按该顺序对顶点求和。顺序修正后，fdp `241_0` 在每条轨道上都与原生版本一致（xdot 通过，json conformant，plain 与 stderr 相同），其在 `accepted-divergences-engines.json` 和 `accepted-divergences-json.json` 中的条目已退役。相比之下，fdp 的 `2095` 是 **A1-drift，而不是 A9**：注入那个唯一的空名称节点（在归因注入器被修复为匹配 `""` 名称的节点之后），其残余归零——此前的“A9 尾部”是未被注入的空节点牵连了它的关联边。sfdp 的 `2095` 接受记录是同一个盲区——使用修复后的注入器对 sfdp 重新生成归因（2026-07-22），确认它同样注入后为 0，其接受记录已被移除（见上面的 `2095 reclassified` 说明）。

**sfdp `2168_3` — `poly_init` 中 Apple libm `sin` 的 1 ULP 差异（已关闭，不可约）。** **受影响：** sfdp `2168_3`（仅 stderr：移植版多输出一条 `Pshortestpath` 警告；xdot 引擎轨道遍历通过，因为双方都回退为直线）。 **差异：** `shapes.c:2329` 计算 `temp = GAP / sin(gamma)`（移植版 `src/common/poly-sizing.ts:379`）；当 gamma = 1.0092081171617377 时，macOS libm 返回 0.8464104077694533，V8 返回正确舍入的 0.8464104077694532（1 ULP）。该差异以路由器点 10/18、y 28.391789367446776 对 …78 的形式进入 multispline 路由器（`neatosplines.c:428,444` → `multispline.c:598`），共圆梯形（点 9、10、15、16）随后以另一条 Delaunay 对角线三角化，使边 1 的走廊多边形不同，`Pshortestpath` 在移植版的多边形上失败。 **接受理由：** 仅注入该 `sin` 值的对照实验使 stderr、三角形、多边形和 xdot 与原生一致（仅 `atan2` 不行）；sfdp 位置逐位相等，incircle 谓词、pathplan、`makeObstacle` 的 hypot 和轮廓环运算顺序均已排除。要匹配需要 Apple `sin` 的逐位精确模型，其源码未公开，可移植代码无法复现（与 `arm-pow.ts` 先例同一边界）。 **证据：** [`plans/post-16-1-followups-2/decision-journal.md`](https://github.com/knowvah/dot-engine/blob/main/plans/post-16-1-followups-2/decision-journal.md)，2026-10-20 T13 行。

---

### A10. 多米诺块打包中的 V8 `Map` 大小限制（`2784`，五个基于打包的引擎） {#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}

**受影响：** `circo`、`twopi`、`neato`、`fdp` 和 `sfdp` 上的 `2784`。移植版在全部五个引擎的 xdot 和 imagemap 扫描中，以及 `circo` 的 `json` 扫描中抛出错误。在 `twopi`、`neato`、`fdp` 和 `sfdp` 的 `json` 扫描中，以及全部五个引擎的 `plain` 扫描中，原生参照程序本身无法在扫描的时间预算内完成，所以这些行是参照程序错误。在 `dot`、`osage` 和 `patchwork` 上它通过。

**发生了什么。** `lib/pack/pack.c` 把一个组件占用的单元格记录在一个 `PointSet` 中。对于 `2784`（一个高 3e16 pt 的单节点，`splines="ortho"`），忠实的整数 `step`/放置算术需要 2,011,656,764 个单元格；原生 16.1.0 用 482 秒完成，常驻内存 67.3 GB（峰值 101 GB）。移植版的 `PointSet` 是一个 JavaScript `Map`，V8 把它限制在 2^24 个条目，所以它抛出 `Map maximum size exceeded`。

**为何接受。** 这是位于代码之下的运行时限制，而不是逻辑缺口；原因是 `97fcccd8` 的忠实算术（在它之前，移植版算出的是一个很小的错误布局，从未触及该限制）。接受的结果是抛出错误而不是 `diverged` 判定，所以 `accepted-divergences-engines.json`、`accepted-divergences-json.json` 和 `accepted-divergences-map.json` 中的条目声明 `verdict: "port-error"` 并附带 `errIncludes: "Map maximum size exceeded"`：只有当移植版错误带有该消息时，它们才接受它。`2784` 上的其他失败会作为未接受的故障出现，而 `registry-staleness.test.ts` 会把该条目标记为陈旧。证据：[`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md)。

### A11. 退化输入下 GTS 的 Delaunay 面顺序 — 不可约 {#a11-gts-delaunay-face-order-on-degenerate-input}

**受影响：** 输入退化（点位于边上、共圆网格）时经由 GTS 做三角剖分的布局（`lib/neatogen/delaunay.c`；16.1 的 oracle 链接 GTS 0.7.6）。

**有何不同。** 移植版按创建顺序为 Delaunay 面编号，并按创建顺序排列每个面的邻接面（`neigh`）。原生 GTS 按 `GHashTable` 的顺序为面编号：`closest_face` 遍历以指针为键的哈希表，因此面 id 与邻接顺序取决于堆地址，且每次运行都不同。因此，凡由面顺序导出的结果都可能与某次具体的原生运行不同。

**为何接受。** 不存在确定性的目标。在同一个退化输入上运行原生二进制 60 次，即便关闭 ASLR 并设置 `MallocNanoZone=0`，仍得到 22 种不同输出；这种波动是代码之下 oracle 自身的性质，而非移植缺陷。比较面时请按顶点集合，而不是按 id。证据：第 3 部分的 GTS 笔记（`.agent-notes/post-16-1-followups-3.md`，“GTS face vertex order and nondeterminism”）。

### A12. 词法分析器错误没有 `<stdin>: ` 前缀 {#a12-no-stdin-prefix-on-lexer-errors}

**受影响：** 词法分析器（`aagerror`）向 stderr 报告的 DOT 语法错误。

**有何不同。** 读取标准输入的原生 `dot` CLI 会输出 `<stdin>: syntax error in line N …`；移植版输出相同消息，但没有 `<stdin>: ` 前缀。

**为何接受。** 仅当设置了 `InputFile` 时，`aagerror`（`lib/cgraph/scan.l:157`）才会加上 `InputFile: `。CLI 在读取标准输入时将其设为 `<stdin>`；移植版所对应的库入口 `agmemread` 不设置它，也就不输出前缀。移植版没有 CLI，因此无可报告。stderr 探针在比较时会规范化该前缀。

---

## 已跟踪的长尾（`dot` 属性与边界情形） {#tracked-long-tail-dot-attribute-edge-case}

在**默认值**下，`dot` 引擎在黄金语料库上以严格的确定性容差与 C 二进制文件匹配（即 `conformant` 判定；见顶部的说明）。剩下的差异是**属性和边界情形的长尾**——这在任何 Graphviz 移植中都是历来最困难的部分。与上面已接受的差值不同，这些差异*将会*被弥合；它们在
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
中被实时跟踪，并附有计数：

| 类别 | 有何不同 |
|---|---|
| **path-structure** | 特定配置下的边样条路由（例如某些平边和密集通道的情形）。 |
| **element-count** | 某项功能在某些图中输出的 SVG 元素比 C 多/少。 |
| **color-stroke** | 特定样式属性的描边/填充输出差异。 |
| **parser-gap** | 少量解析器尚未完全接受的 DOT 输入。 |

如果您的图只使用常见属性和 `dot` 引擎，您几乎肯定处于确定性容差匹配的路径上。如果某个布局看起来不对，请在 `PARITY-dot.md` 中查找该输入类别——它很可能是一个已跟踪、并有以参照程序为准的修复任务的条目，而不是未知的问题。

> **关于由标签驱动的案例的说明。** 文本测量类别（A2）已经关闭——不再有任何 `dot` 图被归入该类别而接受。如今处于 structural-match 的图是一个已跟踪的差距，而不是字体度量差值。

### `concentrate=true` 时相对边的箭头 {#concentrate-true-opposing-edge-arrowheads}

当 `concentrate=true` 把一对反平行边（`A->B; B->A`）合并为一条保留下来的边时，该边必须在**两端**都绘制箭头。现在这已被移植（`arrow_flags` 的 `conc_opp_flag` 分支；见
`src/common/splines-clip.ts:arrowFlags`），所以 `graphs-b135`、`167` 和 `2087` 已经匹配（缺失箭头的 `element-count` 差异及其未裁剪样条的 `@d` 副作用都已消失）。

有些 concentrate 图**保留着一个单独的、早已存在的残余**，箭头修复**并未**解决它——它是节点 **x 坐标**位置的差值（x 方向网络单纯形 / 罗盘端口），而不是箭头缺陷：

- **`graphs-b15`、`graphs-b69`** — 大型的记录/簇“电梯”图。Concentrate 被激活并正确合并；残余是约 1pt 的节点 x 差值，它被放大为 `element-count`/样条 `@d` 差异。箭头的输出本身现在是正确的（b69 补回了缺失的箭头多边形）。x 坐标的根因见
  `b69-concentrate-undermerge` 代理笔记。
- **`1453`** — 仍然因顶层的 `element-count` 原因而存在差异，与 conc_opp_flag 箭头无关。
- **`2825`** — 在这次箭头修复之时，因顶层的 `element-count` 原因而存在差异，与 conc_opp_flag 无关（那里不会触发相对边对的合并）；此后已被 fix-2825-rebuild-vlists 任务关闭，参见上文 A4。

这些是已跟踪的 x 坐标/结构性条目，**不是**箭头缺陷。

### 2.0 保真度任务遗留的布局保真度差距（neato、sfdp、fdp、twopi、circo） {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0 保真度任务使未移植的属性值明确地报错失败（参见
[错误与异常](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)
中的 `UNSUPPORTED_FEATURE` 表）。它留下了下列问题，记录在 `plans/v2-fidelity/decision-journal.md` 中。

**明确报错、未移植。** 当节点重叠时，`overlap=voronoi` 在 neato、twopi、circo 和 sfdp 中仍然抛出 `UNSUPPORTED_FEATURE`：Voronoi 调整器本身（`vAdjust` 的算法）没有被移植。决定是否抛出的重叠测试则是 C 自己的（基于 `poly.c` 节点多边形的 `countOverlap`）。

**已知差距，仍然无声。** 移植版渲染这些情形时不报错，并且与原生 Graphviz 不同。由 `v2-silent-gaps` 任务发现（`plans/v2-silent-gaps/decision-journal.md`）；不是已接受的差值。

- **`getAdjustMode` 的 “Unrecognized overlap value” 警告没有输出。**
- **旋转后的多边形顶点在最后几位上可能与原生不同（不可约：宿主数学库）。** `poly_init` 用 `atan2`、`hypot`、`sin` 和 `cos` 为每个顶点定向。在输入逐位相同的情况下，macOS libm 与 V8 返回的最后几位不同（例如 `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`：libm `…21d1`，V8 `…21d2`；下一个顶点处的 `hypot`：libm `…fffd`，V8 `…fffe`），所以一个 `orientation=20` 的方框，其顶点 y 在移植版中是 `-18`，而在原生中是 `-17.999999999999996`。原生 Graphviz 自身也随平台的 libm 而变化，而浏览器无法调用它。移植版自己的算术与 C 一致（`RADIANS` 的顺序已固定；1664 个抽样顶点坐标中有 776 个逐位相同，其余仅通过 libm 产生差异）。影响：恰好相接的 `polyOverlap` 判定可能翻转；使用原生顶点时，每个判定都匹配。
- **sfdp 在 macOS 上可能与原生不同（不可约：宿主 libm 的 `pow`）。** 用带插桩的原生 sfdp 诊断：位置保持逐位相同，直到某个斥力项 `pow(dist, 1 - p)`（`spring_electrical.c`，`p = -1`，即 `pow(x, 2)`）从 macOS libm 返回的结果比 `x*x` 小 1 ulp（`pow(1.4116727416983157, 2)`：libm `1.9928199296540394`，正确舍入为
  `…396`；对于 16201 个抽样的 `v` 中的 20 个，macOS 的 `pow(v, 2) != v*v`）。这改变了迭代的 `Fnorm` 的最后一位；sfdp 的自适应冷却把它放大为一个不同的（常常是镜像的）布局。移植版的 `armPow` 是 ARM optimized-routines 的 `pow`（glibc ≥ 2.28），即 Linux 版 Graphviz 所计算的结果；macOS 参照程序才是异类。已排除：种子（显式的 `start=` 值能匹配）、`pcp_rotate`（相同输入得到相同输出）、位置和吸引力项（逐位相同）。示例：默认种子下的单个三角形 `a--b; a--c; b--c`。
- **fdp 可能因宿主 libm 的 `cos`/`sin` 而与原生不同。** fdp 遵循 15.0.0 之后的 Graphviz（基于 hypot 距离的斥力，`Mlimit`），宿主 libm 的 `hypot` 被逐位复现（`src/common/libm-hypot.ts`，在 40 万个样本上 0 处不匹配）。252 个可用 fdp 渲染的黄金输入中有 251 个与原生构建精确匹配；剩下的一个
  （`parallel-cluster-ldbxtried`）用 `T_Wd * cos(alpha)` 放置簇端口节点，而 macOS libm 的 `cos(-2.3840764867756761)` 与 V8 的 `Math.cos` 相差 1 ulp；fdp 的力循环把它放大到约 3 英寸。Apple 的 `cos` 不像 `hypot` 那样可以由一个简短的模型复现。
- **原生崩溃而移植版有定义的行为。** 原生 Graphviz 在 neato 的 `mode=KK` 配合 `model=mds` 和一条边的 `len` 时退出码为 139（`mds_model` 用从 1 开始的序号索引 `GD_dist`：堆溢出），在 `model=circuit` 配合不连通的图时也是如此。移植版在第一种情形中丢弃越界的单元，在第二种情形中回退到最短路径；没有原生输出可供比较。

---

## 有意不移植的内容（非目标） {#intentionally-not-ported-non-goals}

这些是有意设定的范围边界，不是缺陷。本库面向 **SVG**（以及 `json` / `xdot` / `dot` / 图像映射这些中间文本格式）。

- **其他输出格式。** 光栅图（PNG/JPG/GIF/WebP/BMP）、PostScript/PDF/EPS 以及 GUI/交互式后端不在范围内。如果需要光栅图，请使用 SVG 输出并在下游转换。
- **SVG 的 `page=` 分页。** 原生 `dot` 同样不对 SVG 分页（SVG 设备不设置分页标志），所以在这条路径上，`page=` 在两个实现中都不起作用——在此记录仅因为它是一个常见的困惑点。
- **`-Tplain` 文本输出。** 推迟（一种忠实的文本格式），而不是被排除。
- **`gvpr`**（图处理脚本语言）——不在范围内。
- **C++ 便利封装**（`cgraph++`、`gvc++`）——优先移植 C API；如果需要，符合 TypeScript 习惯的便利层将是一个单独的包。
- **浏览器文本测量中的 `fontnames=svg|ps`。** 在浏览器中，canvas 测量器根据 PostScript 别名的 `fontnames=native` 字体族列表构建其字体（`Times-Roman` → `Times, serif`），这与 SVG 输出器默认渲染所用的字体相同。`TextMeasurer` 不携带图上下文，所以设置了 `fontnames=svg` 或 `fontnames=ps` 的图会按原生列表测量，而 SVG 则写出 svg/ps 的字体族名称。CSS 未定义的别名字重（`book`、`demi`、`light`、`medium`、`roman`）与 C 一样原样输出；浏览器忽略它们并以正常字重渲染，测量器则按正常字重测量以与之匹配。Node 的输出不受影响（它从不使用 canvas 测量器）。
- **多图输入与空输入的 `NULL`。** `parse` 和 `renderSvg` 读取单个 DOT 字符串的方式与 cgraph 的 `agmemread` 相同。
  在第一个图的右花括号之后，`endgraph`（`lib/cgraph/grammar.y`）调用 `aglexeof`（`lib/cgraph/scan.l`），
  后者会回推一个文件结束记号，因此该花括号之后的任何内容都不会被词法分析：
  尾随文本、未终止的字符串或注释以及后续的图都会被忽略，既不报错也不警告。
  `dot` CLI 则会再次调用 `agread` 并渲染文件中的每个图，所以含两个图的文件在那里得到两个 SVG 文档，在这里只得到一个
  （在多图语料文件 `1845`、`2835` 和 `graphs-multi` 上，移植版的渲染结果与 CLI 的第一个文档一致，这些文件仍处于隔离状态）。
  要渲染多个图，请拆分源文本，对每个图各调用一次 `renderSvg`。
  对于空输入或仅含注释的输入，`agmemread` 返回 `NULL`，CLI 不输出任何内容；
  `parse` 则改为返回一个空的无向图，`renderSvg` 会渲染它，因为 API 每次调用返回一个 `Graph` 和一个 SVG。
- **仅限原生的机制**，由适合浏览器的等价机制取代：动态插件加载（`dlopen`）由静态的引擎/渲染器注册取代；文件系统读取（字体、图像、配置）由调用方提供的回调取代（例如 `setImageSizer`）。行为得以保持；机制有所不同。

---

## 报告差异 {#reporting-a-divergence}

如果您发现的输出与 C 不同，并且**既不是**上面已接受的差值、也不在 `PARITY-dot.md` 中、也不属于非目标，那就是一个值得报告的缺陷——C 源代码就是规范，未列出的差异被视为缺陷，而不是被接受的行为。
