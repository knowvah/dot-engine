---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# レシピ

ビルド → レイアウト → ジオメトリ読み取りという流れのうち、API リファレンスだけでは分かりにくい部分を、作業別のスニペットでまとめます。各レシピは、公開されている `@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` の範囲だけを使った、最小限で実行可能な例です。内部のモデルクラスは使いません。スニペットが使うエントリーポイントの全一覧は `/guide/api` を参照してください。

## 1. コードでグラフを構築してレンダリングする

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**理由:** グラフの構造が静的な DOT 文字列ではなくアプリケーションのデータから得られる場合、`createGraph` がビルダーを提供します。`render` はグラフのレイアウトとシリアライズを一度の呼び出しで行います。ビルダー API の全体（サブグラフ、属性、`parse` との比較）は `/guide/build-a-graph` にあります。

## 2. レンダリングせずにレイアウトし、ジオメトリを読む

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

**理由:** `getLayout` は、計算済みのジオメトリを読むだけの純粋なリーダーです。レイアウト自体は実行しません。レイアウトの呼び出しより前に呼ぶと、古い座標やゼロの座標を返す代わりに、`code` が `ERR_INVALID_STATE` の `Error` を投げます（"getLayout requires a laid-out graph"。[エラーと例外](/ja/guide/errors)を参照）。ジオメトリだけが必要でレンダリング結果の文字列は不要な場合は、`render` の戻り値を捨ててください。実際に必要なのは、副作用として行われるレイアウトのほうです。

## 3. レンダラーに合わせて y 軸を選ぶ

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**理由:** graphviz は y 軸上向きの座標系でレイアウトを計算しますが、ほとんどの利用側（canvas、DOM、ブラウザー上の SVG）は y 軸下向きを求めます。`getLayout` はデフォルトが `'down'` なので、たいていの呼び出し側はこのオプションを必要としません。正確な反転の式と、2つのモードで `bounds` がどう異なるかについては、`/guide/geometry` を参照してください。

## 4. `render()` の SVG フレームと `getLayout()` のフレームを突き合わせる

`render(g, 'svg')` と `getLayout(g)` は*同じ*レイアウト済みグラフを記述しますが、座標フレームが異なります。しかも違いは y 軸の反転だけではありません。`render` の SVG エミッターは、図形のプリミティブを書き出す前にすべての y 座標の符号を反転し、そのうえで描画全体を `<g transform="scale(..) rotate(..) translate(tx,ty)">` 1つで包みます。この `<g>` には、graphviz のページパディング、マージン、`size=` や回転によるスケーリングがすべて織り込まれています。`getLayout` はそれらを一切行わず、ページジオメトリをまったく持たない、原点 `(0, 0)` に正規化されたモデル座標を返します。

1回の `render()` 呼び出しごとに、2つのフレームは定数1つ分の平行移動だけ異なります。GVC のページレイアウトの式を導き直すのではなく、両方のフレームで位置が分かっているノードを1つ使って、オフセットを経験的に求めてください。

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

**理由:** オフセットはスケールや回転ではなく純粋な平行移動なので（`size=` / `rotate=` がデフォルトであると仮定）、1つの一致だけでオフセットが完全に決まります。これが必要になるのは、`getLayout` が公開していない情報を生の SVG から読み取るときだけです。現時点でそれが避けられない代表的なケースは、レシピ 5 を参照してください。

## 5. エッジラベルの位置を取得する

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

**理由:** `EdgeGeometry.label` が存在するのは、graphviz が `label` 属性に対して中央揃えのラベルを実際に配置したエッジだけです。ラベルのないエッジでは、このフィールドは省略されます。`getLayout` が返すのは計算された*位置*だけで、ラベルの文字列や計測されたボックスは返しません。そのため、レンダラー自身がラベルを描画する必要がある場合は、この位置を、そのラベルのテキストについて自分の側ですでに計測したサイズと組み合わせてください（たとえば、エッジの構築に使った tail/head のペアをキーにした、エッジごとのラベルサイズのマップを自分で保持しておく、など）。

`taillabel` と `headlabel` のポートラベルも同じ方法で、`tailLabel` と `headLabel` に返されます。

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

どちらも、レイアウトが配置した場合にだけ存在します。これは `render()` がそのラベルの `<text>` を出力する条件と同じなので、これらの位置を取得するためにレンダリング済みの SVG をスクレイピングする必要はありません。

`xlabel` は `xlabel` に返され、同じく配置された場合だけ存在します。近似するよりも、この値を読むことをお勧めします。graphviz は外部ラベルを、スプラインの中点をオフセットして求めるのではなく、候補スロットに対する力学的な探索で配置するため、`label` や `points` に対するどんな計算でも再現できないからです。

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. 独自の矢印の先端を描く

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**理由:** 端に矢印がある場合、レイアウトは矢印の分の余白を空けるためにスプラインを短くし、矢印が届くべき位置を記録します。その位置は、ヘッド側の端が `ep`、テール側の端が `sp` です。その端に矢印がなければどちらも存在しないので、上のチェックは「この端に矢印がそもそも必要か」の判定も兼ねます。スプラインの最後の向きから先端を外挿すると、向きは合いますが奥行きは推測になります。これらの値は、graphviz 自身が計算したものです。

これらはノード境界上の接続点であることに注意してください。graphviz 自身のレンダラーは、描画する多角形を、ペン幅に依存する量だけこの点から内側にずらします。そのため、`ep` がレンダリングされた矢印の先端と一致すると期待せず、`ep` *まで*描いてください。

## 6. @knowvah/dot-engine のクラスター名を自分の名前に対応づける

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

**理由:** `ClusterGeometry.name` は、`addSubgraph` に渡した名前をそのまま返します。@knowvah/dot-engine が名前を作ったり、振り直したり、変換したりすることはありません。ドメインモデルが、graphviz が受け付けない独自の id でクラスターを管理している場合は、グラフを構築するときに id と名前の対応を自分で保持し、レイアウト後に `clusters` のスナップショットのキーを付け替えてください。graphviz 側の名前から意味を取り出そうとしないでください。

## 6b. 独自のクラスタータイトルブロックを描く

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**理由:** レイアウトはクラスターのボックス内にタイトル用の領域を確保し、そのうえで、`labelloc`、`labeljust`、`rankdir`、ラベル自体の計測サイズを考慮して配置場所を決定します。`ClusterGeometry.label` はその決定済みの配置を公開しているので、独自のタイトルブロックを描く利用側は、テキストを再計測してエンジンと一致しなければならないオフセットを導き直す代わりに、この値を読めば済みます。

`label.x` / `label.y` はラベル領域の**中心**です。ボックスの `x` / `y` が角であるのとは異なります。`render()` が出力する `<text>` はそれとは異なり、中心より下にある*ベースライン*を持ちます。したがって、レンダリング結果と照合する場合は、出力された `y` ではなく、中心どうしを比較してください。

## 7. 多数のエッジを安全に追加する

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

**理由:** ビルダーの `addEdge` は `tail` / `head` を名前で解決し、ノードがまだ存在しなければ最初の使用時に作成します。そのため、データ駆動のエッジリストを結線する前にノードを宣言しておく必要はありません。`strict` グラフでは、同じ `(tail, head)` のペアを繰り返すと、並行するエッジを追加する代わりに既存のエッジが返されます。これは cgraph の `agedge` の重複排除の契約を踏襲したものです。

`createGraph()` ではなく `parse()` が生成したグラフにエッジを追加する場合は、すでに保持している `Node` 参照に対して、`@knowvah/dot-engine` の低レベルな `addEdge(g, tail, head, name?)` を直接使ってください。

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

`addEdge` の完全なシグネチャと、strict グラフでの重複排除の動作については、`/reference` を参照してください。

## 8. まとめ

小さなドメイングラフを受け取り、レイアウトして、位置付きのノードとエッジを返す、コンパクトな関数です。

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

これは、多くの利用側が `getLayout` の上に構築することになる形です。自分のノード / エッジの型を受け取り、自分の座標の規約で位置付きジオメトリを返す、1つの差し替えポイントです。
