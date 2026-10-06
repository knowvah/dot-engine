---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# 用語集

用語ごとに 1 つの定義を載せています。並び順は英語の見出しのアルファベット順のままです。各項目は、
その用語を詳しく扱っているガイドのページ（またはソース）にリンクしています。

## Cluster（クラスター） {#cluster}

名前が `cluster` で始まるサブグラフ（例: `subgraph cluster_build`）です。
Graphviz は、所属するノードをまとめる独立した枠として描画します。内部的には、
@knowvah/dot-engine のジオメトリスナップショットは、すべてのクラスターサブグラフのキーを
`cluster6` のような位置ベースの名前（`ClusterGeometry.name`）に付け替えます。DOT ソース上の
名前は使われません。元の名前が必要な利用者は、レイアウトの前に `idByName` マップを作成し、
レイアウトの後で `snapshot.clusters` のキーを付け直します。キーを付け直すパターンは
[レシピ](/ja/guide/recipes)を、`addSubgraph` でクラスターを作る方法は
[コードでグラフを構築する](/ja/guide/build-a-graph)を参照してください。

## Conformance（適合性） {#conformance}

@knowvah/dot-engine のレンダリングが C のオラクルと「一致する」という主張の裏付けとなる、
機械的に検査される性質です。両方の SVG を正規化した要素ツリーに解析したうえで、すべての数値
（座標、パスデータ、`points`）が一定の許容誤差内で一致しなければなりません。決定論的なエンジン
（`dot`、`circo`、`twopi`、`osage`、`patchwork`）では **±0.01pt**、反復的な力指向エンジン
（`neato`、`fdp`、`sfdp`）では **±0.5pt** です。さらに、数値以外のすべての値（タグ、色、テキスト）が
完全に等しくなければなりません。SVG 出力がバイト単位で一致するという主張ではありません。
[適合性](/ja/conformance)を参照してください。

## Coordinate frame / y-axis（座標系 / y 軸） {#coordinate-frame-y-axis}

Graphviz ネイティブの座標系は **y 軸が上向き**で、原点は左下隅です。ブラウザーや画面は
**y 軸が下向き**で、原点は左上です。`getLayout` は既定で `yAxis: 'down'`
（すべての y を反転し、`bounds` を `(0, 0)` に正規化します）となっており、`yAxis: 'up'` を指定すると
Graphviz ネイティブの座標をそのまま返します。xdot の描画オペレーション（`getDrawOps` から得られるもの）は、
常にネイティブの y 軸上向きの座標系です。[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください。

## Divergence（差異） {#divergence}

@knowvah/dot-engine のレンダリングとオラクルとの違いのうち、調査され、根本原因が特定され、
目録に載せられたものです。黙って許容されたものとは区別されます。目録に載っている差異は
3 つのクラスのいずれかに分類されます。意図的に適合させなかった許容済みの差分（例: プラットフォーム間の
浮動小数点の非決定性）、解消作業が続いている追跡中のロングテール、そして明示的な非目標です。
目録にない違いは、受け入れられた動作ではなく不具合として扱われます。
[既知の差異](/ja/divergences)を参照してください。

## DOT {#dot}

グラフ記述言語です。`digraph { ... }` / `graph { ... }` に、ノード、エッジ、属性の文を含む形式で、
@knowvah/dot-engine は、その結果をレイアウトエンジンに渡す前に解析します。
[はじめに](/ja/guide/getting-started)を参照してください。

## Image sizer / resolver（画像サイザー / リゾルバー） {#image-sizer-resolver}

外部画像（usershape ノードと `<IMG>` HTML ラベルのセル）のための、2 つの注入可能な差し替えポイントです。
`ImageSizer` は画像の本来の幅と高さを報告するので、ピクセルデータを読み込まなくても
ノードのサイズ決定とラベルのレイアウトを進められます。`ImageResolver` は、
レンダリング時に埋め込むための実際の画像バイト列を供給します。
[画像](/ja/guide/images)を参照してください。

## Layout engine（レイアウトエンジン） {#layout-engine}

@knowvah/dot-engine が登録している 8 つのレイアウトアルゴリズムのひとつで、名前で選択します
（`renderSvg(dot, engine)`）。`dot`（階層型/層状）、`neato`
（バネモデル、Kamada–Kawai）、`fdp`（力指向）、`sfdp`（多重スケールの
力指向、大規模グラフ向け）、`circo`（円形）、`twopi`（放射状）、
`osage`（クラスター型）、`patchwork`（スクエア化されたツリーマップ）があります。
[レイアウトエンジン](/ja/guide/engines)を参照してください。

## Oracle（オラクル） {#oracle}

正本である C ソースからビルドされた、ネイティブの C 版 Graphviz `dot` バイナリで、
@knowvah/dot-engine のすべてのレンダリングはこれに対して検証されます。@knowvah/dot-engine は、
リファレンスと移植版との間の ABI のずれを避けるため、このバイナリを直接起動します（WASM ビルドは使いません）。
オラクルとの比較がどのように実行され、報告されるかについては、[適合性](/ja/conformance)と
[パリティ](/parity)を参照してください。

## Rank / rankdir（ランク / rankdir） {#rank-rankdir}

`dot` の階層型レイアウトにおいて、**ランク**とは、図の中で同じ深さに配置されるノードの層です。
`rankdir` はランクが並ぶ方向を設定します。既定は `TB`（上から下）で、`LR`、`BT`、`RL` も指定でき、
グラフ属性として設定します（`b.setAttr('rankdir', 'LR')`）。
[コードでグラフを構築する](/ja/guide/build-a-graph)を参照してください。

## Spline / edge routing（スプライン / エッジルーティング） {#spline-edge-routing}

エッジが描かれる曲線（ベジェ）の経路で、ノードやクラスターという障害物を避けて進むルーティング処理によって
計算されます。@knowvah/dot-engine は、ルーティングされた制御点を `getLayout` の
`EdgeGeometry.points`、つまりポイント単位の `{x, y}` を順に並べた配列として公開します。
[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください。

## Text measurer（テキスト計測器） {#text-measurer}

ラベルの幅と高さを報告する、注入可能な差し替えポイント（`TextMeasurer`）で、
レイアウトの前にノードとエッジラベルのサイズ決定を進められるようにします。@knowvah/dot-engine は、
レンダリングごとに 1 つを自動で解決します。明示的な `setTextMeasurer` が最優先で、
次に利用可能ならブラウザーの `<canvas>`、Node では組み込みの決定論的な
`EstimateTextMeasurer` の順です。カスタム実装を渡すこともできます。
[テキスト計測](/ja/guide/text-measurement)を参照してください。

## Usershape {#usershape}

Graphviz の用語で、形状が、描画された多角形や楕円ではなく、外部から供給された画像
（`image` 属性経由）であるノードのことです。
@knowvah/dot-engine は、ファイルを直接読むのではなく、注入可能な画像サイザー/リゾルバーの
差し替えポイントを通じて usershape を解決します。これによりライブラリはブラウザーで安全に動作します。
[画像](/ja/guide/images)を参照してください。

## xdot {#xdot}

拡張 DOT の描画オペレーション形式です。レンダリングされたグラフをどのように描画すべきかを正確に
（描画順に）記述する、構造化されたオペレーションのストリームで、塗りつぶし/線の色の設定、フォントの設定、
楕円や多角形の塗りつぶし/ストローク、ベジェの描画、テキストの描画などがあります。
`getDrawOps` は、このストリームを型付きの `XdotOp` 値として返すので、SVG を解析することなく
独自のレンダラー（canvas、WebGL、PDF）を駆動できます。
[xdot 描画オペレーションによる独自レンダリング](/ja/guide/xdot-drawops)を参照してください。
