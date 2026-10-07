---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# 以程式碼建構圖

`createGraph` 可在記憶體中建構圖，而不必撰寫 DOT 原始碼。
當圖的結構來自您應用程式的資料模型，而不是靜態的 DOT 字串時，
就適合使用它。

## 基本用法 {#basic-usage}

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

`createGraph` 會回傳 `GvGraphBuilder`。它的 `.graph` 屬性是不透明的
`Graph` 物件，可傳給 `render`、`getLayout` 與 `getDrawOps`。

## 選項 {#options}

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## 建構器方法 {#builder-methods}

| 方法 | 說明 |
|---|---|
| `addNode(name, attrs?)` | 新增節點；回傳 `GvNode` 控制代碼 |
| `addEdge(tail, head, attrs?)` | 新增邊；`tail`/`head` 可以是 `GvNode` 控制代碼或名稱字串 |
| `addSubgraph(name, attrs?)` | 新增具名子圖；回傳巢狀的 `GvGraphBuilder` |
| `setAttr(k, v)` | 設定圖層級的屬性 |
| `getAttr(k)` | 讀取圖層級的屬性 |
| `.graph` | 底層的 `Graph`（供版面配置／轉譯使用的不透明控制代碼） |

## 屬性 {#attributes}

以一般物件傳入 DOT 屬性的鍵／值配對：

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

任何有效的 DOT 屬性都會被接受；@knowvah/dot-engine 會原封不動地
傳遞給版面配置引擎。

## 子圖 {#subgraphs}

`addSubgraph` 會回傳一個以該子圖為範圍的建構器。加入子圖的
節點同時也是根圖的成員：

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

## 與 `parse` 比較 {#compared-with-parse}

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

`parse` 與 `createGraph` 都會產生 `Graph`，且可以用完全相同的方式傳給
`render`、`getLayout` 與 `getDrawOps`。
