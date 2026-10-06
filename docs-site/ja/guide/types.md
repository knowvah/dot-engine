---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# 型リファレンス

公開されている型の概念的なマップで、どこから得られるかでグループ分けしています。`createGraph` / `parse`（構築と検査）、`getLayout`（ジオメトリのスナップショット）、`render` / `getDrawOps`（出力）、ルートパッケージ（エンジン、画像、テキスト計測、エラー）です。各項目には、ソースからコピーした形のブロックと、1行の目的の説明があります。継承されたメンバーやすべてのプロパティの JSDoc を含む、フィールド単位の網羅的なドキュメントについては、生成された [TypeDoc リファレンス](/reference/)を参照してください。

このページでは、座標フレームの解説は繰り返しません。それについては[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください。型のフィールドがフレームに依存する箇所では、y 軸についての注意を簡単に再掲しています。

## 構築と検査（`@knowvah/dot-engine` / `@knowvah/dot-engine/api`）

### `Graph`

内部のグラフモデルへの不透明なハンドルです。`parse()` と `createGraph().graph` が返します。`render`、`getLayout`、`getDrawOps` に渡してください。直接構築したり検査したりしてはいけません。ビルダーとパーサーだけが、これを生成するためにサポートされた方法です。

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph` のオプションです。`directed` / `strict` は、4つの `GraphKind`（有向、無向、strict 有向、strict 無向）のいずれかを選びます。`name` はグラフの名前を設定します（デフォルトは `''`）。

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addNode(...)` が返す、グラフのノードの不透明なハンドルです。`setHtmlAttr` は、値を HTML 風ラベルとしてタグ付けします（DOT テキストでの `label=<...>` に相当）。これにより、レイアウトエンジンはそれをマークアップとして計測します。

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addEdge(...)` が返す、グラフのエッジの不透明なハンドルです。

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

`createGraph(...)` が返します。`addSubgraph` は、そのサブグラフにスコープされた、ネストしたビルダーを返します。それを通じて追加されたノードは、ルートグラフのメンバーでもあります。`.graph` は `render` / `getLayout` / `getDrawOps` への引き渡し点です。[コードでグラフを構築する](/ja/guide/build-a-graph)を参照してください。

## ジオメトリのスナップショット（`getLayout`）

::: tip 座標フレーム
ネイティブの graphviz の座標は y 軸上向きです（原点は左下）。`getLayout` のデフォルトは `yAxis: 'down'`（原点は左上、画面の規約）で、すべての y 座標を反転します。ネイティブの graphviz 座標が必要な場合は `{ yAxis: 'up' }` を渡してください。完全な解説: [計算済みジオメトリを読む](/ja/guide/geometry)。
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout` のオプションです。デフォルトは `yAxis: 'down'` です。

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

`getLayout(g, opts?)` が返す、グラフの計算済みジオメトリの、プレーンで JSON シリアライズ可能なスナップショットです。`clusters` は、すべてのクラスターのサブグラフを再帰的に列挙します（ネストしたクラスターはそれぞれ独自の項目を持ちます）。クラスターのないグラフでは空です。

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

全体のバウンディングボックスで、単位はポイントです。`yAxis: 'down'` では、`x` / `y` は `(0, 0)` に正規化されます。`yAxis: 'up'` では、`x` / `y` はグラフのバウンディングボックスの生の左下隅です。

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

ノードごとのジオメトリです。`x` / `y` はノードの中心です。`width` / `height` は**ポイント**単位です。モデルはインチで保持しており（`ND_width` / `ND_height`）、`getLayout` が返す前に72を掛けます。

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

エッジごとのジオメトリです。`points` は、ルーティングされたスプラインのすべてのベジェ制御点を順に連結したものです（エッジにルーティングされたスプラインがなければ空）。`label` は、エッジが中央のラベルを持つ場合にのみ存在します。

`tailLabel` と `headLabel` は、`taillabel` / `headlabel` のポートラベルの位置です。それぞれ、レイアウトが配置した場合にのみ存在します。これは `render()` がその `<text>` を出力する条件と同じです。したがって、配置できなかったポートラベル（たとえば、ルーティングされたスプラインのないエッジ）は、原点にあるラベルではなく、存在しないものとして報告されます。

`xlabel` は、`xlabel` の外部ラベルの位置です。`label` と異なり、graphviz の、エッジの周囲の候補位置に対する力学的な配置探索で選ばれます。したがって、`label` やスプラインの中点から導くことはできません。同じ「配置された場合のみ」の条件があります。探索が収められなかった宣言済みの xlabel は、`render()` がその描画を見送るのと同様に、存在しないものとして報告されます。

`sp` と `ep` は、テール側とヘッド側の端における、矢印の接続点です。端に矢印がある場合、スプラインは矢印の分の余白を空けるために短くなり、矢印は終端の制御点からこの点まで伸びます。独自の矢印の先端を描く利用側は、先端を外挿する代わりに、ここから読み取れます。それぞれ、その端に実際に矢印がある場合にのみ存在します。したがって、通常の `digraph { a -> b }` のエッジは `ep` を報告し `sp` は報告せず、`arrowhead=none` はどちらも報告しません。

これらはノード境界上の接続点です。graphviz 自身のレンダラーは、描画する矢印の多角形を、ペン幅に依存する量だけこれらから内側にずらします。したがって、`ep` は矢印を*そこまで*描くための点であり、レンダリングされた先端のコピーではありません。

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

クラスターごとのバウンディングボックスです。`name` はクラスターのサブグラフの名前です（例: `cluster6`）。ネストしたクラスターは、名前に階層をエンコードしているため、親へのリンクは明示的には公開されていません。`BoundsGeometry` と同じフレームの規約に従います。

`label` はクラスターのタイトルの配置で、クラスターが宣言している場合にのみ存在します。その `x` / `y` は、ラベル領域の**中心**です。上のボックスの角の `x` / `y` ではなく、`EdgeGeometry.label` と同じです。`width` / `height` は計測されたテキストのサイズなので、ラベルのボックスは `[x - width/2, x + width/2] × [y - height/2, y + height/2]` であり、常にクラスターのボックスの内側に収まります。これはラベルの*中心*であり、`render()` が出力する `<text>` はそれより下にあるベースラインを持つことに注意してください。

## レンダリング（`@knowvah/dot-engine/render`）

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

`render(g, format, opts?)` が受け付ける形式の、閉じたユニオンです。[他の形式へのレンダリング](/ja/guide/render-formats)を参照してください。

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render` のオプションです。`engine` のデフォルトは `'dot'` です。`inlineImages`（新規）のデフォルトは `false` です。`true` のとき、SVG エミッターは、`setImageResolver` で登録されたリゾルバーを参照して、外部画像（`image=` / HTML の `<IMG>`）を `data:` URI としてインライン化します。リゾルバーが見つからない場合や登録されていない場合は、生の `src` をそのまま通す動作に戻ります。SVG 以外の形式には効果がありません。[画像の扱い](/ja/guide/images)を参照してください。

::: warning `yAxis` は `RenderOptions` のフィールドではありません
座標の向きは `getLayout` だけの関心事です。`render` が生成する生の形式の文字列は、ネイティブの y 軸上向きの座標を持ちます。y 軸下向きが必要で、`getLayout` を通さない場合は、後処理で反転してください。
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps` のオプションです。`engine` のデフォルトは `'dot'` です。

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

1つの xdot 属性ストリームのパース結果です。デコードされた描画オペレーションの配列と、パース状態のフラグのビットマスクを持ちます。`getDrawOps` が返すのは、グラフ上のすべての描画属性にわたる、描画順（グラフ → ノード → エッジ）にフラット化された `XdotOp[]` だけです。オペレーションの種類の完全な表と canvas の例は、[xdot による独自レンダリング](/ja/guide/xdot-drawops)を参照してください。

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

デコードされた、1つの xdot 描画オペレーションで、`kind` で判別されます。各バリアントは、その形状にちなんだ名前の、1つのペイロードプロパティを持ちます。安全にアクセスするには、`switch` で `kind` により絞り込んでください。座標の単位はポイントで、ネイティブの y 軸上向きのフレームです（y 軸下向きの canvas では反転してください。上にリンクしたガイドを参照）。

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

解決済みの xdot の塗りつぶし / ペンの色です。単色、または線形 / 放射状のグラデーションのいずれかです（`XdotLinearGrad` / `XdotRadialGrad` はそれぞれ `x0,y0,x1,y1[,r0,r1]` と、`stops: { frac: number; color: string }[]` の配列を持ちます）。

## ルートパッケージ（`@knowvah/dot-engine`）

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

レイアウトエンジンの名前です。レジストリは開いている（カスタムエンジンを `GvcContext` に登録できる）ため、どんな文字列も受け付けます。`(string & {})` は、集合を閉じることなく、組み込みのものに対するエディターの自動補完を維持します。[レイアウトエンジン](/ja/guide/engines)を参照してください。

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

`image=` または HTML の `<IMG>` セルが参照する外部画像の、本来の寸法を返すコールバックを登録します。レイアウトのサイズ決定に使われます。サイズが不明な場合は `null` を返してください（C の画像欠落時の動作、つまりゼロサイズのセルと警告に一致します）。以前に設定したサイザーを解除するには、`setImageSizer` に `null` を渡します。[ブラウザーでの利用](/ja/guide/browser)を参照してください。

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

外部画像の生のバイト列を返すコールバックを登録します。`RenderOptions.inlineImages` が `true` のときに参照されます。素の `Uint8Array` を返すと、MIME タイプは `src` のファイル拡張子から推測されます。`null`（リゾルバーが返した場合、またはリゾルバーが登録されていない場合）は、生の `src` をそのまま通す動作に戻ります。[画像の扱い](/ja/guide/images)を参照してください。

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

差し替え可能なテキスト計測で、`setTextMeasurer` でインストールします（3つの組み込みが同梱されています: `EstimateTextMeasurer`、`LutTextMeasurer`、`CanvasTextMeasurer`）。`yoffsetCenterline` / `yoffsetLayout` は、オプションの垂直方向のメトリクスです（ベースライン→中心線、ベースライン→アセント）。省略すると、pango で較正されたデフォルトに戻ります。[テキスト計測](/ja/guide/text-measurement)を参照してください。

### `RenderResult` とエラー

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` は、`renderSvg` の Result スタイルの対応物です。成功なら `{ svg }`、最初の失敗なら `{ errors: [one] }` を、投げる代わりに返します。どんな DOT 入力に対しても値を返し、投げるのは引数が無効な場合だけです。`errors` の要素は、`cause` もスタックもないプレーンなデータです。

投げられる dot-engine のエラーはすべて、抽象クラス `DotEngineError` を継承し、`GvError` を実装しています。

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` は、不正な DOT ソースに対して `ParseError`、レイアウト / レンダリング段階の失敗に対して `RenderError`、dot-engine のバグに対して `InternalError` を投げます。呼び出し側のミスは、`code` が `UsageErrorCode`（`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`）である標準の `TypeError` / `RangeError` / `Error` を投げます。これらは `GvError` ではありません。`try` / `catch` なしで構造化されたエラーが欲しい呼び出し側は、代わりに `tryRenderSvg` を使ってください。すべてのコードについては[エラーと例外](/ja/guide/errors)を参照してください。

## 関係

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## どの型がどの呼び出しから得られるか

| 呼び出し | 戻り値 |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder`（ネスト） |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string`（`DotEngineError`、または使用エラーの `TypeError` を投げる） |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

上のすべての型のすべてのフィールド（このページが要約しているものを含む）については、生成された [TypeDoc リファレンス](/reference/)を参照してください。座標フレームの詳しい解説（実例付き）は、[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください。
