---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API リファレンス

公開されている範囲は、意図的に小さくしてあります。ほとんどの呼び出し側に必要なのは `renderSvg` だけです。どのエントリーポイントを使うかは[概要](/ja/guide/overview)を、各関数が受け取って返す形は[型](/ja/guide/types)を、網羅的なシグネチャ、すべてのフィールド、すべてのオーバーロードは、生成された[リファレンス](/reference/)を参照してください。

> 型宣言（`.d.ts`）は `npm run build` によって出力されます（`build:types` ステップが `tsc -p tsconfig.build.json` を実行します）。`package.json` の `exports` マップは、各エントリーに `types` 条件を結び付けているため、`@knowvah/dot-engine`、`@knowvah/dot-engine/api`、`@knowvah/dot-engine/render` はいずれも、エディターや下流のビルドで型を解決できます。
>
> ビルドは宣言マップ（`.d.ts.map`）と JS のソースマップも出力し、パッケージは `src/` のソースも同梱しています。そのため、「定義へ移動」は本物の TypeScript に直接ジャンプし、コードを読んだり PR を出したりしやすくなっています。

このページは3つのエントリーポイントごとに構成されています（それぞれをいつ使うかは[概要](/ja/guide/overview)にあります）。ルートの `@knowvah/dot-engine` パッケージ（パースとレンダリングを一度の呼び出しで行う関数と、プロセスグローバルな設定）、`@knowvah/dot-engine/api`（コードでグラフを構築し、計算済みのジオメトリを読み戻す）、`@knowvah/dot-engine/render`（複数形式の出力と、生の描画オペレーション）です。以下の関数はすべて、ルートパッケージからも再エクスポートされています（`src/index.ts` の `export * from './api/index.js'` / `export * from './render/index.js'`）。すべてを `@knowvah/dot-engine` からインポートしても動作しますが、サブパスからのインポートのほうが、どの層を触っているかが明確になります。

## `@knowvah/dot-engine`（ルート）

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

DOT ソースをパースし、指定された[レイアウトエンジン](/ja/guide/engines)を実行し、SVG にレンダリングして、SVG 文字列を返します。これは1回の呼び出しで済む便利なラッパーです。`GvcContext` を構築し、8つの組み込みエンジンと SVG レンダラーを登録し、レイアウトし、レンダリングし、レイアウトを解放します。これらのステップを分けたい場合は、下の [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) を参照してください。

- **`dotSource`** — DOT 言語のグラフソース。
- **`engine`** — `EngineName`: 組み込みのもの（`dot`、`neato`、`fdp`、`sfdp`、`circo`、`twopi`、`osage`、`patchwork`）、またはカスタム登録された任意の名前。
- **例外** 入力に問題があれば `DotEngineError`: `dotSource` が不正なら `ParseError`、レイアウトまたはレンダリングが失敗すれば `RenderError`、dot-engine のバグなら `InternalError`（`cause` 付き）。`dotSource` または `engine` が不正な場合（登録されていないエンジン名を含む）は、`code` が `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` の `TypeError`。[エラーと例外](/ja/guide/errors)を参照してください。

完全なシグネチャ、JSDoc、`GvError` のフィールド一覧は[リファレンス](/reference/)にあります。

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg` の Result スタイルの兄弟です。どんな DOT 入力に対しても（投げずに）値を返します。成功なら `{ svg }`、最初の失敗なら `{ errors: [one] }` で、`svg` と `errors` は同時には存在しません。投げるのは引数が無効な場合だけです（`TypeError` の `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`）。`errors` の各要素は、プレーンで JSON シリアライズ可能なデータです（`type`、`code`、`message`、`friendlyMessage`、および存在する場合は `location` / `expected`。`cause` もスタックトレースもありません）。そのため、ワーカーや postMessage の境界を越えて送ったり、ログにシリアライズしたりしても安全です。呼び出し側が、例外を捕捉するのではなく `code` / `type` で分岐したい場合は、`renderSvg` と `try` / `catch` よりもこちらを使ってください。[エラーと例外](/ja/guide/errors)を参照してください。[リファレンス](/reference/)。

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

DOT を、レイアウトを**行わずに**メモリ上のグラフモデルにパースします。レンダリングの前に、グラフを検査したり変換したり、あるいは `@knowvah/dot-engine/api` の `getLayout` や `@knowvah/dot-engine/render` の `render` に渡したりするときに便利です。

- **例外** 構文エラーまたはエッジの方向の違反（たとえば、無向グラフの中の `->`）に対して `ParseError`。`ParseError` は `DotEngineError` を継承し、`type: 'syntax'` で `GvError` を実装していて、`location: { line, column, offset? }` を持ちます。`dotSource` が文字列でない場合は `TypeError` `ERR_INVALID_ARG_TYPE`。[エラーと例外](/ja/guide/errors)、[リファレンス](/reference/)。

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` は、dot-engine がこの入力で失敗したことを意味します。`RenderError` は既知のレイアウト / レンダリングの失敗を扱います（`UNKNOWN_LAYOUT` と `UNSUPPORTED_FEATURE` では `type` が `semantic` です）。`InternalError` は dot-engine のバグで、ラップされた場合は `cause` に元のエラーが入ります。呼び出し側のミスは、代わりに `code` 付きの標準の `TypeError` / `RangeError` / `Error` を投げます。`isGvError` は文字列の `type` と `code` を確認するため、重複したバンドルをまたいでも機能します。すべてのコードと、各関数が投げうるものは[エラーと例外](/ja/guide/errors)、`GvError` の形は[型](/ja/guide/types)、`GvErrorCode` のメンバー一覧は[リファレンス](/reference/)を参照してください。

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

レイアウト中にラベルのサイズを決めるために参照される、プロセスグローバルなテキスト計測器を登録します（`null` で解除）。解除すると、ライブラリのデフォルトに戻ります（ブラウザー: `CanvasTextMeasurer`、ヘッドレス / Node: LUT 計測器が結び付けられていなければ `EstimateTextMeasurer`）。解決順序の全体と、これらの関数と並んでエクスポートされている `CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` の実装については、[テキスト計測](/ja/guide/text-measurement)を参照してください。[リファレンス](/reference/)。

### `setImageSizer` / `setImageResolver`

関連はあるが別物の、2つの画像設定の差し替えポイントです。どちらもプロセスグローバルなレジストリで、同じパターン（コールバックを登録し、解除するには `null` を渡す）に従い、呼び出し側が登録するまでは何もしません。

- **`setImageSizer`** — 外部画像の*本来の寸法*を報告し、レンダリングの前に、レイアウトエンジンが HTML の `<IMG>` セルやノードの `image=` 属性のための領域を確保できるようにします。`null` を返す（またはサイザーを登録しない）と、ネイティブの Graphviz の画像欠落時の動作（警告とサイズゼロ）を再現します。
- **`setImageResolver`**（新規 — 下の [`inlineImages`](#inlineimages) を参照） — 実際の画像の*バイト列*を提供し、SVG レンダラーが、`xlink:href="src"` をそのまま通す代わりに、`data:` URI としてインライン化できるようにします。

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` は、素の `Uint8Array`（MIME は `src` のファイル拡張子から推測されます — `.png`、`.jpg` / `.jpeg`、`.gif`、`.svg`、`.webp`。それ以外は `application/octet-stream` になります）か、MIME タイプを明示的に設定する `{ bytes, mime }` を返せます。`src` を解決できない場合は `null` を返してください。レンダラーは、リゾルバーが登録されていない場合と同様に、生の `src` をそのまま通す動作に戻ります。リゾルバーを登録しただけでは効果はありません。`render` の `inlineImages` オプションが `true` のとき（下記）にだけ参照されます。実際の例は[画像の扱い](/ja/guide/images)、両方のコールバックの型は[リファレンス](/reference/)を参照してください。

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` は `renderSvg` の非同期版です。グラフが必要とする Web フォントと画像データを先に取得し、そのあとでレイアウトとレンダリングを行います。`renderSvgInto` はレンダリングを行い、id が `id` の要素の子を置き換えます。デフォルトでは SVG をサニタイズします（`trusted: true` で省略、`sanitize` で組み込みのスクラバーを置き換え）。失敗は、引数の誤りを含め、`renderSvg` と同じエラークラスによる Promise の reject になります。要素の id が見つからない場合は、`ERR_INVALID_ARG_VALUE` で reject されます。フォントの問題で reject されることはなく、`fontIssues` で返されます。[ブラウザーでの利用](/ja/guide/browser)と[画像の扱い](/ja/guide/images)、および[リファレンス](/reference/)を参照してください。

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

レイアウトとレンダリングを別々のステップとして駆動する必要がある呼び出し側向けの、低レベルなオーケストレーションです。`renderSvg` は、まさにこれに対する便利なラッパーです。コンテキストを構築し、エンジン / レンダラーを登録し、`layout`、`renderWithContext`、`freeLayout` を行います。この制御が必要な場合にだけ、これらを直接使ってください。たとえば、エンジンの一部だけを登録する、カスタムの `LayoutEngine` や `RendererPlugin` を追加する、レイアウトを再実行せずに、同じレイアウト済みのグラフを複数の形式にレンダリングする（`layout` を一度呼び、形式ごとに `renderWithContext` を呼び、最後に `freeLayout` を呼ぶ）といった場合です。[リファレンス](/reference/)。

## `@knowvah/dot-engine/api`

プログラムによる構築、安全なエッジ挿入、計算済みジオメトリの読み出しを担う層です。DOT テキストを手で書かずにグラフを構築し、そのレイアウトをプレーンなデータとして読み戻すためのものです。`LayoutSnapshot` とそのネストした形については[型](/ja/guide/types)を参照してください。

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

`render` / `getLayout` / `getDrawOps` に渡せる、新しいグラフを作成します。デフォルト: `directed: true`、`strict: false`、`name: ''`。`GvGraphBuilder` を返します。`addNode`、`addEdge`、`addSubgraph`、`setAttr` / `getAttr`、`setHtmlAttr`（HTML テーブルラベル用）、および不透明な `Graph` ハンドルを公開する `.graph` プロパティを持ちます。[コードでグラフを構築する](/ja/guide/build-a-graph)と、`GvGraphBuilder` / `GvNode` / `GvEdge` インターフェースの全体については[リファレンス](/reference/)を参照してください。

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

`GvGraphBuilder.addEdge` の基盤となる、低レベルなエッジ挿入ヘルパーです。ビルダーの不透明な `GvNode` / `GvEdge` ハンドルではなく、内部の `Node` / `Edge` 参照を扱う呼び出し側（たとえば、`parse()` が返したグラフに追加するエッジ）のために、直接エクスポートされています。ほとんどの呼び出し側は、代わりに `createGraph(...).addEdge(tail, head, attrs?)` を使ってください。

- **`name`** — エッジのキー。デフォルトは `''`（無名）。strict グラフの重複排除では無視され、そちらは `(tail, head)` だけで照合します（無向グラフでは対称）。
- **戻り値** 新しいエッジ。`g` が strict で、`(tail, head)` のエッジがすでに存在する場合は、既存のものを返します（`cflag=1` の `agedge` と同じ）。

[コードでグラフを構築する](/ja/guide/build-a-graph)と[リファレンス](/reference/)を参照してください。

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

グラフの計算済みジオメトリの、プレーンで JSON シリアライズ可能なスナップショットを返します。ノードの位置、エッジのスプラインの制御点、エッジのラベル、クラスターのバウンディングボックス、グラフ全体の境界で、すべてポイント単位です。

- **`g`** — すでにレイアウト済みでなければなりません（`render(g, ...)`、`getDrawOps(g)`、`ctx.layout(g, engine)` のいずれかを通じて）。まだレイアウトされていないグラフに対して `getLayout` を呼ぶと、すべてゼロのジオメトリを黙って返すのではなく、例外を投げます。
- **`opts.yAxis`** — デフォルトは `'down'`: 画面座標で、原点は左上、y は下向きに増加し、`bounds` は `(0, 0)` に正規化されます。`'up'` はネイティブの Graphviz 座標（原点は左下、y は上向きに増加）を返し、`bounds.x` / `bounds.y` は生の左下隅になります。
- **例外** `g` がレイアウトされていない場合は、`code` が `ERR_INVALID_STATE` の `Error`。`g` または `opts` が不正な場合は `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`。[エラーと例外](/ja/guide/errors)を参照してください。

ノードの `width` / `height` はポイントに変換されます（内部モデルはインチで保持）。それ以外の座標はすでにポイントです。座標系の解説は[計算済みジオメトリを読む](/ja/guide/geometry)、`LayoutSnapshot`、`NodeGeometry`、`EdgeGeometry`、`ClusterGeometry`、`BoundsGeometry` のフィールド一覧の全体は[型](/ja/guide/types) / [リファレンス](/reference/)を参照してください。

### `Graph`

内部モデルから再エクスポートされた、不透明なハンドルの型です。公開されているのは*型*だけです（変更可能なクラスではありません）。ビルダーの `.graph` や `parse()` の結果を保持する変数に注釈を付けるために使えますが、そのフィールドを直接構築したり検査したりしないでください。状態を読み戻すには、ビルダー、`getLayout`、`getDrawOps` を使います。[リファレンス](/reference/)。

## `@knowvah/dot-engine/render`

複数形式の出力と、生の描画オペレーションへのアクセスを担う層で、すでに `parse` 済みの、またはビルダーで構築されたグラフをレンダリングするためのものです。

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

グラフをレイアウトし、要求された形式の文字列にレンダリングします。

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' | 'plain-ext' | 'imap' | 'cmapx'`。
- **`opts.engine`** — レイアウトエンジン（デフォルトは `'dot'`）。
- **`opts.inlineImages`** — [下記](#inlineimages)を参照。
- **例外** レイアウトまたはレンダリングの失敗には `RenderError`、dot-engine のバグには `InternalError`、無効な引数（未登録のエンジンや形式を含む）には `code` 付きの `TypeError`。[エラーと例外](/ja/guide/errors)を参照してください。

`opts.engine` は `renderSvg` の `engine` パラメーターに対応します。`format` は、`renderSvg` が公開していない軸です（`renderSvg` は `'svg'` に固定されています）。[他の形式へのレンダリング](/ja/guide/render-formats)と、`OutputFormat` ユニオンおよび `RenderOptions` の形の全体については[リファレンス](/reference/)を参照してください。

#### `inlineImages`

`RenderOptions.inlineImages`（デフォルトは `false`）は、外部画像を、生の `xlink:href="src"` をそのまま通す代わりに、`data:` URI としてインライン化します。`setImageResolver`（上記）でリゾルバーが登録されていなければ効果はなく、SVG 以外の形式にも効果はありません。未設定の場合、出力はこのオプションが存在する前とバイト単位で同一です。

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

`fetch` を使ったブラウザーでの解決や、Node でのファイルシステムからの解決を含む完全なガイドは、[画像の扱い](/ja/guide/images)を参照してください。

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

`render` の非同期版です。形式と `engine` / `inlineImages` オプションは同じで、呼び出しごとの非同期の画像フックとフォントの先読みが加わります。各画像フックは、`src` ごとに最大で1回だけ実行されます。throw や reject はミスとして扱われます。マークアップ形式の出力は、サニタイズされていないマークアップです。README の「Security」セクションを参照してください。

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

`g` をレイアウトして xdot にレンダリングし、フラットで型付きの描画オペレーションの配列を返します。ノードの形状、テキストの範囲、色、フォントが判別可能なユニオンの値として含まれ（`switch` で `op.kind` により絞り込みます）、SVG や xdot の文字列エンコーディングに触れることなく、独自の canvas / WebGL / PDF レンダラーに渡せます。`opts.engine` のデフォルトは `DEFAULT_DRAW_ENGINE`（`'dot'`）です。

- **例外** 中間の xdot 出力を再パースできない場合は `ParseError`（dot-engine のバグで、実際には想定されません）。レイアウト / レンダリングの失敗には `RenderError`、それ以外の dot-engine のバグには `InternalError`、無効な引数には `code` 付きの `TypeError`。[エラーと例外](/ja/guide/errors)を参照してください。

オペレーションの種類の一覧と canvas の実例は[xdot による独自レンダリング](/ja/guide/xdot-drawops)、`XdotOp` ユニオン、および `Xdot` / `XdotColor` の形の全体については[型](/ja/guide/types) / [リファレンス](/reference/)を参照してください。
