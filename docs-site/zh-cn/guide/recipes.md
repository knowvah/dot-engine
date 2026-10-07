---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# 实践方案集

面向任务的代码片段，针对“构建 → 布局 → 读取几何信息”这条路径中，仅凭 API 参考不易看明白的部分。每个方案都是一个最小的、可运行的示例，只使用公开的 `@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` 接口——不涉及内部模型类。这些片段所取自的完整入口列表，参见 `/guide/api`。

## 1. 用代码构建图并渲染

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**原因：**当图的结构来自应用数据而不是静态 DOT 字符串时，`createGraph` 为您提供一个构建器；`render` 则一次调用完成布局和序列化。完整的构建器 API（子图、属性、与 `parse` 的对比）见 `/guide/build-a-graph`。

## 2. 只布局不渲染，然后读取几何信息

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**原因：**`getLayout` 是对已经算好的几何信息的纯读取器——它自己不会运行布局。如果在任何布局调用运行之前调用它，它会抛出一个 `code` 为 `ERR_INVALID_STATE` 的 `Error`（“getLayout requires a laid-out graph”；参见[错误与异常](/zh-cn/guide/errors)），而不是返回过期的或全为零的坐标。如果您只需要几何信息，而不需要渲染出的字符串，可以丢弃 `render` 的返回值——您真正付出代价换来的，是布局这一副作用。

## 3. 为您的渲染器选择 y 轴方向

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**原因：**Graphviz 在 y 轴向上的坐标系中计算布局；大多数使用方（canvas、DOM、浏览器中的 SVG）需要 y 轴向下。`getLayout` 默认使用 `'down'`，因此大多数调用者无需设置该选项。确切的翻转公式，以及 `bounds` 在两种模式下的差异，参见 `/guide/geometry`。

## 4. 对齐 `render()` 的 SVG 坐标系与 `getLayout()` 的坐标系

`render(g, 'svg')` 和 `getLayout(g)` 描述的是*同一张*布局后的图，但使用不同的坐标系，而且差别不只是 y 轴翻转：`render` 的 SVG 输出器在写出每个形状图元之前，会先对每个 y 坐标取反，然后把整幅图包在一个 `<g transform="scale(..) rotate(..) translate(tx,ty)">` 中，其中折入了 Graphviz 的页面内边距、页边距以及任何 `size=`/旋转缩放。`getLayout` 则完全跳过这些——它返回的是归一化到 `(0, 0)` 原点的模型坐标，完全没有页面几何信息。

对于任意一次 `render()` 调用，这两个坐标系相差一个固定的平移量。与其重新推导 GVC 的页面布局公式，不如通过一个您在两个坐标系中都已有位置的节点，凭经验推出该偏移量：

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**原因：**因为它是纯平移，而不是缩放或旋转（假设使用默认的 `size=`/`rotate=`），所以一次匹配就足以完全确定偏移量。只有当您要从原始 SVG 中读取 `getLayout` 未暴露的内容时，才需要这样做——目前无法避免这样做的一种常见情形，见方案 5。

## 5. 恢复边标签的位置

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**原因：**只有当 Graphviz 确实为某条边的 `label` 属性放置了居中标签时，`EdgeGeometry.label` 才会存在；没有标签的边会直接省略该字段。`getLayout` 只返回算出的*位置*——不包含标签字符串或其测量出的框——因此，如果您的渲染器需要自己绘制标签，请把这个位置与您自己一侧已经为该标签文本测量出的尺寸配合使用（例如，回传您自己按边保存的标签尺寸映射，其键与构建这条边时所用的 tail/head 对相同）。

`taillabel` 和 `headlabel` 端口标签以同样的方式返回，分别位于 `tailLabel` 和 `headLabel` 上：

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

两者都只有在布局放置了它们之后才会存在——与 `render()` 输出该标签 `<text>` 的条件相同——因此无需抓取渲染出的 SVG 来恢复这些位置。

`xlabel` 位于 `xlabel` 上，同样只有放置后才存在。它值得直接读取，而不是估算：Graphviz 通过对候选位置进行力搜索来确定外部标签的位置，而不是在样条中点处加偏移，因此对 `label` 或 `points` 做任何运算都无法复现它。

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. 绘制您自己的箭头 {#5b-draw-your-own-arrowheads}

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**原因：**当某一端带有箭头时，布局会缩短样条，为箭头留出空间，并记录箭头应到达的位置——头端为 `ep`，尾端为 `sp`。当该端没有箭头时，两者都不存在，因此上面的检查同时也相当于“这一端是否需要箭头”。从样条的最终方向外推箭尖，方向可以得到正确，但深度只是猜测；这些值才是 Graphviz 自己算出的。

请注意，它们是节点边界上的附着点。Graphviz 自己的渲染器会将所绘制的多边形，按与线宽（penwidth）有关的量，从这些点向内缩进，所以请绘制*到* `ep`，而不要指望它等于所渲染箭头的箭尖。

## 6. 将 @knowvah/dot-engine 的簇名称映射回您自己的名称

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**原因：**`ClusterGeometry.name` 原样回传您给 `addSubgraph` 的名称——@knowvah/dot-engine 不会自行创造、重新编号或以其他方式转换它。如果您的领域模型用自己的 id（而不是 Graphviz 能接受的名称）作为簇的键，请在构建图时自行保存 id 到名称的映射，并在布局之后对 `clusters` 快照重新设键；不要试图从 Graphviz 自己的名称中还原含义。

## 6b. 绘制您自己的簇标题块 {#6b-draw-your-own-cluster-title-block}

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**原因：**布局会在簇的框内为簇标题预留空间，然后确定它的位置——遵循 `labelloc`、`labeljust`、`rankdir` 以及标签自身测量出的尺寸。`ClusterGeometry.label` 公布了这一已确定的位置，因此自行绘制标题块的使用方可以直接读取它，而不必重新测量文本、重新推导一个必须与引擎一致的偏移量。

`label.x`/`label.y` 是标签空间的**中心**，这与框的 `x`/`y`（一个角点）不同。`render()` 输出的 `<text>` 带的是*基线*，而基线位于中心的下方——所以如果您要与渲染输出进行匹配，请把中心与中心比较，而不要与输出的 `y` 比较。

## 7. 安全地添加大量边

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**原因：**构建器的 `addEdge` 按名称解析 `tail`/`head`，如果节点尚不存在，则在首次使用时创建它——在连接由数据驱动的边列表之前，您无需预先声明节点。在 `strict` 图上，重复相同的 `(tail, head)` 对会返回已有的边，而不是添加一条平行边，这与 cgraph 的 `agedge` 去重约定一致。

如果您是在 `parse()` 而非 `createGraph()` 生成的图上添加边，请直接对您已持有的 `Node` 引用使用 `@knowvah/dot-engine` 中较底层的 `addEdge(g, tail, head, name?)`：

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

完整的 `addEdge` 签名及其在 strict 图中的去重行为，参见 `/reference`。

## 8. 综合运用

下面这个紧凑的函数接收一个小型领域图，对其进行布局，并返回带位置的节点和边：

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

这就是大多数使用方最终在 `getLayout` 之上构建出的形态：一个替换点，接收您自己的节点/边类型，并以您自己的坐标约定返回带位置的几何信息。
