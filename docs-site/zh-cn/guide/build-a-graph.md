---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# 用代码构建图

`createGraph` 无需编写 DOT 源代码即可构造内存中的图。当图结构来自应用的数据模型，
而不是静态的 DOT 字符串时，请使用它。

## 基本用法

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

const a = b.addNode('a', { shape: 'box', label: 'Start' });
const c = b.addNode('c', { label: 'End' });

b.addEdge(a, c, { label: 'goes to' });
// Nodes can also be referenced by name string:
b.addEdge('a', 'c', { style: 'dashed' });

const svg = render(b.graph, 'svg');
```

`createGraph` 返回一个 `GvGraphBuilder`。其 `.graph` 属性是不透明的 `Graph` 对象，
可被 `render`、`getLayout` 和 `getDrawOps` 接受。

## 选项

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## 构建器方法

| 方法 | 说明 |
|---|---|
| `addNode(name, attrs?)` | 添加一个节点；返回 `GvNode` 句柄 |
| `addEdge(tail, head, attrs?)` | 添加一条边；`tail`/`head` 可以是 `GvNode` 句柄或名称字符串 |
| `addSubgraph(name, attrs?)` | 添加一个具名子图；返回嵌套的 `GvGraphBuilder` |
| `setAttr(k, v)` | 设置图级别的属性 |
| `getAttr(k)` | 读取图级别的属性 |
| `.graph` | 底层的 `Graph`（用于布局/渲染的不透明句柄） |

## 属性

以普通对象传入 DOT 属性的键/值对：

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

任何有效的 DOT 属性都会被接受；@knowvah/dot-engine 会将它们原样传递给布局引擎。

## 子图

`addSubgraph` 返回一个作用域限定于该子图的构建器。添加到子图中的节点同时也是根图的成员：

```ts
const b = createGraph({ directed: true, name: 'pipeline' });

const cluster = b.addSubgraph('cluster_build', { label: 'CI', style: 'filled' });
cluster.addNode('compile');
cluster.addNode('test');
cluster.addEdge('compile', 'test');

b.addNode('deploy');
b.addEdge('test', 'deploy');

const svg = render(b.graph, 'svg');
```

## 与 `parse` 的比较

```ts
// DOT string — convenient for static graphs
import { parse, render } from '@knowvah/dot-engine';
const g = parse('digraph { a -> b }');
const svg = render(g, 'svg');

// Builder — convenient when graph structure comes from code
import { createGraph, render } from '@knowvah/dot-engine';
const b = createGraph();
b.addEdge('a', 'b');
const svg2 = render(b.graph, 'svg');
```

`parse` 和 `createGraph` 都会生成一个 `Graph`，可以同样地传给 `render`、`getLayout` 和 `getDrawOps`。
