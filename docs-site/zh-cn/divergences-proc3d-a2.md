---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — 典型的 A2 字体度量差异（历史） {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip 状态：已解决 — proc3d 现已一致
自 `EstimateTextMeasurer` 切换（`239c51b`，2026-06-25）起，移植版和无头 C 参照程序都使用同一个 `estimate_textspan_size` 模型来测量文本。
针对当前代码树重新运行下面的复现步骤，`tests/graphs/proc3d.gv` 得到的是 **0 处差异，maxDelta 0**——本页记录的差值已不再复现。对于语料库中的 proc3d 实例，A2 类别整体已经**消失**；当前的、未冻结的计数请参见[已知差异 §A2](/zh-cn/divergences#a2-text-measurement-font-metrics-label-driven-layout)和[对齐度](/parity)。本页作为历史性的根因分析予以保留——下面的机制是真实且有启发性的，只是在这个图上不再产生可观察到的差值。
:::

`proc3d`（`graphs-proc3d` / `share-proc3d` / `windows-proc3d`）曾是 [A2 字体度量](/zh-cn/divergences#a2-text-measurement-font-metrics-label-driven-layout)差异的教科书式案例：文本测量中的亚像素级差异使节点的 x 位置偏移了几个点，使该图落在 **structural-match**。本页是差异列表所引用的独立分析，说明在各测量器统一之前这种情况*为什么*会发生。

## 输入 {#input}

| | |
|---|---|
| **引擎** | `dot` |
| **来源** | `tests/graphs/proc3d.gv`（来自上游 [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) 测试语料库）— 443 行 |
| **关键属性** | `fontname=Courier`、`orientation=land`、`size="10,7.5"`、`ranksep=1.0` |

## 为什么会出现差异（当时的根因） {#why-it-diverged-root-cause-at-the-time}

x 方向的网络单纯形布局是忠实的；唯一的差别在于，当时移植版的字体测量器会把一些**较宽的标签**报告得比基于 FreeType 的原生参照程序测量结果宽出零点几个点。proc3d 中最宽的标签是文件路径椭圆——例如 `/home/ek/work/src/lefty/lefty.c`，也就是 [`known-divergences.md` §A2](/zh-cn/divergences#a2-text-measurement-font-metrics-label-driven-layout) 中测得 **+0.75 pt（+0.43%）** 的那个字符串。标签更宽使节点略宽，其半宽又被送入经过 `ROUND()` 取整的从左到右的间距约束；于是网络单纯形选出了一个略有不同（同样最优）的整数 x 分配。结果是在约 2620 pt 宽的图上出现近乎均匀的 **≤ 3.55 pt** x 方向偏移——层级、顺序、拓扑和 y 坐标都完全相同。修复并不是针对 proc3d 的补丁：`EstimateTextMeasurer` 的切换让双方使用同一个无头测量模型，消除了导致这一偏移的宽标签过度测量的差距。

## 差值 — golden 与我们的结果叠加 {#the-delta-—-golden-vs-ours-overlaid}

golden（**绿色**）与我们的结果（**红色**）叠放在同一画面中。在完整比例下它们混合成棕色——这个偏移是肉眼无法察觉的（因此是 *structural-match*）。

![proc3d golden 与我们结果的叠加图，完整绘图：绿色 = C，红色 = @knowvah/dot-engine](/img/proc3d-overlay.svg)

放大后可以看到，绿/红边缘**几乎完全出现在较长的文件路径椭圆标签上**——正是测量器过度测量的那些宽字符串。代码/方框节点则保持重合：

![proc3d 叠加图，放大到较宽的路径标签椭圆：绿色 = C，红色 = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## 完整绘图 — 先是 golden，后是我们的结果 {#full-drawings-—-golden-first-ours-second}

| Golden — 原生 `dot` | 我们的结果 — @knowvah/dot-engine |
|---|---|
| ![由 C Graphviz 渲染的 proc3d](/img/proc3d-golden.svg) | ![由 @knowvah/dot-engine 渲染的 proc3d](/img/proc3d-ours.svg) |

## 数据（撰写本页时） {#numbers-at-the-time-this-page-was-written}

| 指标 | 数值 |
|---|---|
| 判定 | structural-match |
| maxDelta（移植版与原生程序） | 3.55 pt |
| x 方向发生偏移的标签 | 73 / 73（近乎均匀） |
| 绘图 x 方向范围 | 约 2620 pt → 偏移为 0.13% |
| 层级 / 顺序 / 拓扑 / y | 与 C 版相同 |

**当前数据**（已对照当前代码树重新验证）：判定为
**conformant**，0 处差异，maxDelta 0——参见本页顶部的状态说明。上面的叠加图只是作为该机制的快照保留，而不是实时比较。

## 复现 {#reproduce}

原生参照程序在无头的 `GVBINDIR`（`/tmp/ghl`，来自
`test/corpus/gen-headless-gvbindir.sh`）下运行，因此双方使用同一个
`estimate_textspan_size` 测量器——参见
[§A2 “Isolating the algorithm from the font backend”](/zh-cn/divergences#a2-text-measurement-font-metrics-label-driven-layout)。

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

如今运行它会得到相互匹配的 SVG（在 `deterministic` ±0.01 容差下 0 处差异），而不是上文所述 3.55pt 的差值。
