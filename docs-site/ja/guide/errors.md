---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# エラーと例外

dot-engine は2種類のエラーを投げます。どちらを捕捉したかで、誰が何を変更すべきかが分かります。

## 2つのファミリー、1つのルール

| ファミリー | 見分け方 | 意味 | 対処する人 |
|--------|---------------------|---------|----------|
| dot-engine の失敗 | `err instanceof DotEngineError` | dot-engine がこの入力で失敗した。不正な DOT、Graphviz 自身も報告する致命的エラー、未サポートの Graphviz 機能、または dot-engine のバグ | DOT の作者、またはバグ報告 |
| 使用エラー | 標準の `TypeError` / `RangeError` / `Error` で、`err.code` が `ERR_` で始まるもの | 呼び出しが間違っていた。引数の型の誤り、未知のエンジン名や形式名、呼び出し順序の誤り | 呼び出し側のコード |

メッセージの文言ではなく、`.code` で分岐してください。メッセージはリリース間で変わることがありますが、コードは安定しています。

使用エラーは `DotEngineError` ではなく、`GvError` も実装していません。`name` は Node.js と同様に、`TypeError`、`RangeError`、`Error` のままです。

## クラスリファレンス

以下の4つのクラスはすべて `DotEngineError` を継承し、`GvError` の形（`type`、`code`、`message`、`friendlyMessage`、およびオプションの `location` と `expected`）を実装しています。

### `DotEngineError`（抽象）

共通の基底クラスです。dot-engine が入力について発生させるすべてのエラーで、`instanceof DotEngineError` は true になります。直接構築することはできません。`type`、`code`、`friendlyMessage` はサブクラスが定義します。

### `ParseError`

| 項目 | 値 |
|------|-------|
| 投げられる場面 | DOT ソースが不正である、またはグラフの種類に対して誤ったエッジ演算子が使われている |
| `type` | `syntax` |
| コード | `SYNTAX_ERROR`、`SYNTAX_UNEXPECTED_EOF`、`EDGE_OP_DIRECTED_IN_UNDIRECTED`、`EDGE_OP_UNDIRECTED_IN_DIRECTED`、`GENERIC_ERROR` |
| フィールド | `location`（`{ line, column, offset? }`）、`expected`（パーサーが期待していたもの。`SYNTAX_*` のみ）、`line` と `column` のゲッター |
| 呼び出し側の対処 | DOT ソースを修正する。作者に `location` と `friendlyMessage` を示す |

`ParseError` の `GENERIC_ERROR` は、ソースのネストが深すぎて、パーサーがスタックを使い果たしたことを意味します。

### `HtmlParseError`

| 項目 | 値 |
|------|-------|
| 投げられる場面 | 現在は呼び出し側まで到達しない（下記参照） |
| `type` | `semantic` |
| コード | `HTML_PARSE_ERROR` |
| フィールド | `tag`（問題のあるトークン）。`location` と `expected` はなし |
| 呼び出し側の対処 | なし。不正なラベルを見つけるには、レンダリング結果を期待した内容と比較する |

HTML 風ラベルのパーサーは、未知の要素、不正な属性、誤った位置の `<TABLE>`、`<HR>`、`<VR>` に対して `HtmlParseError` を発生させます。レイアウト段階がそれを捕捉し、Graphviz と同様にそのラベルを内容なしにします。グラフは空のラベルのまま、引き続きレンダリングされます。公開関数がこれを伝播させることはありません。

`HtmlParseError` はパッケージのルートからエクスポートされていません。万一呼び出し側に届いた場合は、`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` で識別できます。

### `RenderError`

| 項目 | 値 |
|------|-------|
| 投げられる場面 | Graphviz 自身も報告するような形でレイアウトやレンダリングが失敗した、グラフが利用できないレイアウトエンジンを指定している、またはグラフが dot-engine で移植されていない Graphviz 機能を使っている |
| `type` | `RENDER_ERROR` では `render`、`UNKNOWN_LAYOUT` と `UNSUPPORTED_FEATURE` では `semantic` |
| コード | `RENDER_ERROR`、`UNKNOWN_LAYOUT`、`UNSUPPORTED_FEATURE` |
| フィールド | 別のエラーをラップした失敗の場合は `cause`。`location` はなし |
| 呼び出し側の対処 | `RENDER_ERROR`: グラフを変更する。`UNKNOWN_LAYOUT`: `layout=` 属性を修正する。`UNSUPPORTED_FEATURE`: その機能を避ける（たとえば、`rotation=45` を指定した sfdp。[表](#unsupported-feature-reference)を参照） |

### `InternalError`

| 項目 | 値 |
|------|-------|
| 投げられる場面 | dot-engine 内部のアサーションや不変条件が失敗した、または dot-engine 以外のエラーがレイアウトやレンダリングのパイプラインから漏れ出した |
| `type` | `render` |
| コード | `INTERNAL_ERROR` |
| フィールド | `cause`（ラップされた場合の元のエラー） |
| 呼び出し側の対処 | 引き金となった DOT ソースを添えて、バグを報告する |

DOT の作者が何を変更しても、`InternalError` を確実に避けることはできません。

## コードリファレンス

### `GvErrorCode`

| コード | クラス | `type` | 意味 | 典型的な原因 | 呼び出し側の対処 | 発生元 |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | 予期しないトークン | タイプミス、`;` や `}` の欠落 | `location` の DOT を修正する | `parse`、`renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | 文の途中でソースが終わった | 閉じられていない `{`、`[`、文字列 | `location` の DOT を修正する | `parse`、`renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | 無向グラフの中の `->` | `graph { a -> b }` | `--` を使う | `parse`、`renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | 有向グラフの中の `--` | `digraph { a -- b }` | `->` を使う | `parse`、`renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | ソースのネストが深すぎて解析できない | 病的にネストしたサブグラフ | DOT をフラットにする | `parse`、`renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | 不正な HTML 風ラベル | 未知の要素、不正な属性 | なし: ラベルは空でレンダリングされる | なし（内部で捕捉される） |
| `RENDER_ERROR` | `RenderError` | `render` | Graphviz も報告する、レイアウトまたはレンダリングの致命的エラー | レイアウト段階にとって不正な入力 | グラフを変更する | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | グラフの `layout=` 属性が、登録されたどのエンジンも指していない | `layout="foo"` | 属性を修正する | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | グラフが、dot-engine で移植されていない Graphviz 機能を要求している | `rotation=45` を指定した sfdp | その機能を避ける | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine のバグ | アサーションの失敗、外部からの throw | バグを報告する | `renderSvg`、`render`、`getDrawOps`、ビルダーのメソッド、`GvcContext.layout`（ラップなし） |

### `UsageErrorCode`

| コード | クラス | 意味 | 典型的な原因 | 呼び出し側の対処 | 発生元 |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | 型が違う、`null`、または必須引数の欠落 | `renderSvg(undefined, 'dot')`、`getLayout(null)` | 呼び出しを修正する | 引数を取るすべての公開関数 |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | 型は正しいが、値が未知 | 未登録のエンジン名や形式名、`getLayout(g, { yAxis: 'other' })` | 登録済みの名前、または許可された値を使う | `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps`、`getLayout`、`GvcContext.layout`、`freeLayout`、`bestRenderer`、`renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | 数値引数が範囲外 | 予約済み | 呼び出しを修正する | 現在これを発生させる公開関数はない |
| `ERR_INVALID_STATE` | `Error` | 誤った状態での呼び出し | レイアウト前の `getLayout` | 先にレイアウトする（`render(g, ...)` または `ctx.layout`） | `getLayout` |

未登録のエンジン引数は、DOT ソースが有効な `layout=` 属性を設定していても拒否されます。引数が先にチェックされるためです。

## `UNSUPPORTED_FEATURE` リファレンス {#unsupported-feature-reference}

以下の属性値はいずれも、ネイティブの Graphviz なら dot-engine が移植していないアルゴリズムを実行する場面で、レイアウトに、コード `UNSUPPORTED_FEATURE` の `RenderError` を投げさせます。代替案は、Graphviz と異なるレイアウトを、その旨を伝えずにレンダリングすることでした。このチェックが発動するのは、「発動条件」の列の条件が成り立つときだけです。同じ属性がそれ以外の場面にあっても、通常どおりレンダリングされます。エラーを避けるには、その属性を取り除くか、サポートされている値に変更してください。

| エンジン | 属性と値 | 発動条件 | 必要な Graphviz の機能 |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | 常に（グラフに2つ以上のノードがあり、`maxiter` が負でない場合） | 階層的なストレスマジョライゼーション（`stress_majorization_with_hierarchy`） |
| neato | `mode=ipsep` | Graphviz が制約を構築する場合のみ: `diredgeconstraints` が true または `hier*`、`overlap=ipsep`、またはグラフが最上位のクラスターを持つ場合。制約がなければ、Graphviz と同様にストレスマジョライゼーションとして実行される | 制約付きマジョライゼーション（`stress_majorization_cola`） |
| neato | `start=self` | `mode` が `major`（デフォルト）または `ipsep` | スマート初期化（`smart_ini`）。`mode=KK` または `mode=sgd` では、Graphviz と同様に、レンダリングごとに1回 `start=0 not supported with mode=self - ignored` をログに出す |
| neato | `model=subset` | `mode` が `major` または `KK` | subset 距離モデル |
| neato | `model=circuit` | `mode` が `major`、または連結グラフでの `KK`。連結でないグラフで `pack` も `packmode` もない `KK` は、警告をログに出して最短経路を使う（Graphviz と同じ） | circuit 距離モデル（`circuit_model`） |
| neato、twopi、circo、sfdp | `overlap=voronoi`（大文字小文字を区別しない） | グラフ（twopi ではコンポーネント、sfdp ではグラフ全体またはコンポーネント）に2つ以上のノードがあり、Graphviz 自身の重なり数（`countOverlap`。ノードの多角形をテストする）が0より大きい場合。バウンディングボックスだけが接しているノードでは発動しない。circo がここに到達するのは、単一コンポーネントのグラフだけ（複数のコンポーネントでは、Graphviz も `overlap` を無視する）。sfdp がここに到達するのは、`overlap` が prism モードでない場合だけ | Voronoi による重なりの除去（`vAdjust`） |
| fdp | `overlap=` の `voronoi`、`oscale`、`vpsc`、`ipsep`、`ortho`、`ortho_yx`、`orthoxy`、`orthoyx`、`portho`、`portho_yx`、`porthoxy`、`porthoyx` のいずれか | `N:` の力学的反復の試行のあとで、そのモードに到達する場合。つまり、それらの試行がすべての重なりを取り除けない場合（または `N` が 0 か省略されている場合）。`N:` プレフィックスは許可される（例: `3:voronoi`） | 対応する `removeOverlapWith` の調整アルゴリズム |
| fdp | `splines=compound` | クラスターの有無にかかわらず常に | クラスターを避けるエッジルーティング（`compoundEdges`） |
| sfdp | `smoothing=` の `none` または `0` 以外のすべて | 常に | `post_process_smoothing` |
| sfdp | `rotation=` の0以外の任意の数 | 常に | 重なり除去の前の `rotate()` |
| sfdp | `label_scheme=1` から `4` | `|edgelabel|...` という名前のノードが存在し、`overlap` が `prism` モードに解決され、かつ、スキームが3または4であるか、スキームが1または2で prism の試行が0より大きい場合（`overlap=prism` に回数を付けたもの。デフォルトの `prism0` ではない）。4より大きい値は0として扱われる。通常のエッジラベルでは発動しない | エッジラベルノードの処理（`edge_labeling_scheme`） |
| sfdp | `quadtree=none`（`0`、`false` も） | ノードが1つ以上あるすべてのグラフ。メッセージには解決されたスキームが示される | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast`（`2` も） | ノードが1つ以上あるすべてのグラフ。メッセージには解決されたスキームが示される | `spring_electrical_embedding_fast` |
| すべてのエンジン | 移植されていない特別な `round_corners` のケースで描かれるノード形状 | ノードがその形状を使う場合。メッセージ: `special shape N not yet ported` | その形状の `round_corners` 描画の分岐。これは、描画ケースのない形状番号に対する内部ガードであり、これに到達する名前付きの形状は知られていない |

ほとんどのメッセージは `<attribute>=<value>: <what> is not supported yet` という形です。例外は `smoothing` と `rotation`（欠けているルーチンの名前を示す）、fdp の行、形状の行で、これらは上記の文言を使います。テキストではなく、`err.code === 'UNSUPPORTED_FEATURE'` で分岐してください。

デフォルトを選ぶ値（たとえば `quadtree=normal`、`true`、`yes`、`1`）や、Graphviz が受け付ける値のうち移植済みのもの（たとえば `start=regular`、`start=random`、`model=mds`、`mode=KK`、`mode=sgd`、`overlap=prism`、`scale` ファミリー、および neato、twopi、circo、sfdp での `overlap=oscale`、`vpsc`、`ortho*` / `portho*` モード）は、通常どおりレンダリングされます。

## 関数ごとのリファレンス

「使用エラー」は、別のコードを挙げた行を除き、`ERR_INVALID_ARG_TYPE` の `TypeError` を指します。

| 関数 | 投げうるもの |
|----------|-----------|
| `renderSvg(dotSource, engine)` | 使用エラー（`dotSource` または `engine` が文字列でない）、`TypeError` `ERR_INVALID_ARG_VALUE`（エンジンが未登録）、`ParseError`、`RenderError`、`InternalError` |
| `tryRenderSvg(dotSource, engine)` | 使用エラー（`dotSource` または `engine` が文字列でない）、`TypeError` `ERR_INVALID_ARG_VALUE`（エンジンが未登録）。それ以外はなし: DOT 入力に起因する失敗はすべて `errors` で返される |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE`（`dotSource` が文字列でない）、`ParseError` |
| `render(g, format, opts?)` | 使用エラー（`g`、`format`、`opts` の型が違う）、`TypeError` `ERR_INVALID_ARG_VALUE`（エンジンまたは形式が未登録）、`RenderError`、`InternalError` |
| `getDrawOps(g, opts?)` | 使用エラー（`g` または `opts` の型が違う）、`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.engine` が未登録）、`RenderError`、`ParseError`（中間の xdot を再解析できなかった: dot-engine のバグ）、`InternalError` |
| `createGraph(opts?)` とビルダーのメソッド（`addNode`、`addEdge`、`addSubgraph`、`setAttr`、...） | 使用エラー（引数の型が違う。文字列でない属性値を含む）、`InternalError`（グラフモデルがノードまたはサブグラフの作成に失敗した） |
| `addEdge(g, tail, head, name?)`（`/api` から） | 使用エラー（`g`、`tail`、`head` がオブジェクトでない、`name` が文字列でない） |
| `getLayout(g, opts?)` | 使用エラー（`g` または `opts` がオブジェクトでない）、`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.yAxis` が `'up'` でも `'down'` でもない）、`Error` `ERR_INVALID_STATE`（グラフがレイアウトされていない） |
| `new GvcContext(measurer, options?)` | 使用エラー（`measurer` に `measure` 関数がない、`options` がオブジェクトでない） |
| `ctx.register(plugin)` | 使用エラー（レンダラープラグインでもレイアウトエンジンでもない） |
| `ctx.layout(g, engine)` | 使用エラー（`g` がオブジェクトでない、`engine` が文字列でない）、`TypeError` `ERR_INVALID_ARG_VALUE`（エンジンが未登録）、`RenderError` `UNKNOWN_LAYOUT`。エンジンの失敗はラップされずに伝播する |
| `ctx.freeLayout(g, engine)` | 使用エラー、`TypeError` `ERR_INVALID_ARG_VALUE`（エンジンが未登録）。エンジンの失敗はラップされずに伝播する |
| `ctx.bestRenderer(format)` | 使用エラー（`format` が文字列でない）、`TypeError` `ERR_INVALID_ARG_VALUE`（`format` に対するレンダラーがない） |
| `renderWithContext(ctx, g, format, inlineImages?)` | 使用エラー（`ctx` が `GvcContext` でない、`g` がオブジェクトでない、`format` が文字列でない）、`TypeError` `ERR_INVALID_ARG_VALUE`（`format` に対するレンダラーがない）。レンダリングの失敗はラップされずに伝播する |
| `setImageSizer(sizer)` | 使用エラー（関数でも `null` でもない） |
| `setImageResolver(fn)` | 使用エラー（関数でも `null` でもない） |
| `setTextMeasurer(measurer)` | 使用エラー（`TextMeasurer` でも `undefined` でもない） |

### 外部の throw をラップする関数

| 関数 | 予期しない（dot-engine 以外の）throw が起きたときの動作 |
|-----------|---------------------------------------------------|
| `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps` | `InternalError` としてラップされる。`cause` が元のエラー |
| `renderWithContext` とすべての `GvcContext` メソッド | **ラップされない。** エンジンのバグは、エンジンが投げたものがそのまま呼び出し側に届く。たとえば、`code` を持たないただの `TypeError` |

`GvcContext` を直接使う場合は、`DotEngineError` でも使用エラーでもないエラーを、dot-engine のバグとして扱ってください。

## `tryRenderSvg` と `renderSvg` のどちらを使うか

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| 不正な DOT またはレイアウトの失敗 | `DotEngineError` を投げる | `{ errors: [one] }` を返す |
| 不正な引数 | 使用エラーを投げる | 使用エラーを投げる |
| エラー値 | スタックと `cause` を持つ `Error` | プレーンなデータ: `type`、`code`、`message`、`friendlyMessage`、および存在する場合は `location` / `expected` |
| 使う場面 | 失敗によって呼び出し側を中断したい | `code` で分岐する、またはエラーを `postMessage` 越しやログに送る |

`tryRenderSvg` は、どんな DOT 入力に対しても投げません。投げるのは、引数そのものが無効な場合だけで、それは呼び出し側のコードのバグです。返されるエラーオブジェクトには、`cause` もスタックトレースもありません。

## ラップされた失敗と `cause`

`renderSvg`、`render`、`getDrawOps` が、dot-engine が発生させたものではないエラーを捕捉すると、`cause` を元のエラーとする `InternalError` を投げます。`message` は元のメッセージです。

`cause` は列挙不可なので、`JSON.stringify(err)` では省略されます。ログに出すときは、チェーンを明示的にたどってください（最後の例を参照）。

## バンドルをまたぐチェック

`instanceof DotEngineError` は、ライブラリの1つのコピーの中でのみ機能します。2つのコピーが読み込まれうる場合（重複したバンドル、プラグインホスト）は、`isGvError(e)` を使ってください。文字列の `type` と `code` を確認し、コピーをまたいで機能します。`tryRenderSvg` が返すプレーンなオブジェクトも受け付けます。

## 例

2つのファミリーを分ける例:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

`tryRenderSvg` の結果を処理する例:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

`InternalError` を cause とともにログに出す例:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## 関連項目

- [API リファレンス（厳選）](/ja/guide/api)。各関数のシグネチャ。
- [型](/ja/guide/types)。`GvError` と `RenderResult` の形。
- [生成された API（TypeDoc）](/reference/)。`GvErrorCode` と `UsageErrorCode` のユニオン全体。
