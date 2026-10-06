---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# コードでグラフを構築する

`createGraph` は、DOT ソースを書かずにメモリ上のグラフを構築します。グラフの構造が
静的な DOT 文字列ではなく、アプリケーションのデータモデルから来る場合に使ってください。

## 基本的な使い方 {#basic-usage}

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

`createGraph` は `GvGraphBuilder` を返します。その `.graph` プロパティは、
`render`、`getLayout`、`getDrawOps` が受け取る不透明な `Graph` オブジェクトです。

## オプション {#options}

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## ビルダーのメソッド {#builder-methods}

| メソッド | 説明 |
|---|---|
| `addNode(name, attrs?)` | ノードを追加します。`GvNode` ハンドルを返します |
| `addEdge(tail, head, attrs?)` | エッジを追加します。`tail`/`head` には `GvNode` ハンドルまたは名前の文字列を指定できます |
| `addSubgraph(name, attrs?)` | 名前付きのサブグラフを追加します。入れ子の `GvGraphBuilder` を返します |
| `setAttr(k, v)` | グラフレベルの属性を設定します |
| `getAttr(k)` | グラフレベルの属性を読み取ります |
| `.graph` | 基になる `Graph`（レイアウト/レンダリング用の不透明なハンドル） |

## 属性 {#attributes}

DOT の属性のキーと値のペアを、プレーンなオブジェクトとして渡します。

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

有効な DOT 属性はすべて受け付けられます。@knowvah/dot-engine はそれらを
変更せずにレイアウトエンジンへ渡します。

## サブグラフ {#subgraphs}

`addSubgraph` は、そのサブグラフにスコープされたビルダーを返します。サブグラフに追加した
ノードは、ルートグラフのメンバーにもなります。

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

## `parse` との比較 {#compared-with-parse}

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

`parse` も `createGraph` も `Graph` を生成し、どちらも同じように
`render`、`getLayout`、`getDrawOps` に渡せます。
