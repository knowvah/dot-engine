---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# テキスト計測

dot のレイアウトは、ノードのサイズを決めエッジを配置するために、すべてのラベルの幅と高さを必要とします。
@knowvah/dot-engine は、`TextMeasurer` という単一の差し替え可能なポイントを通じてテキストを計測し、
どれを使うかを自動的に解決します。独自のものを設定することもできます。

## 契約 {#the-contract}

目的は 2 つあり、それぞれに必要な計測器が異なります。

| 目的 | 計測器 | 決定論的? | カーニング / シェーピング |
|------|----------|----------------|-------------------|
| **再現可能なレイアウト**（どこでも同じ出力） | 組み込みのメトリクスモデル | はい | なし |
| **ホストに忠実なレイアウト**（描画に使うフォントと一致） | プラットフォームの canvas | いいえ（フォントに依存） | あり |

ネイティブの Graphviz 自体はホストに忠実です。その出力は、実行するマシンに
インストールされているフォントに依存します。@knowvah/dot-engine では選択できます。既定は
決定論的で、オプトインするとホストに忠実になります。

## 自動解決 {#automatic-resolution}

計測器を設定しない場合、@knowvah/dot-engine はレンダリングごとに 1 つを選びます。

1. `setTextMeasurer` で設定した明示的な計測器（あれば最優先）。
2. **ブラウザー**（`document` が利用可能）→ ページの `<canvas>`。ホストに忠実で、
   ブラウザーが SVG のテキストを描画するときと同じフォントで計測します。
3. **Node** → 組み込みの決定論的なメトリクスモデル。

このライブラリは**ランタイム依存がゼロ**で、フォントライブラリや `canvas` 自体を
インポートすることもありません。そのため、ブラウザー向けバンドルは小さく保たれ、Node の既定では
ファイルシステムを読みません。

## Node でのホストに忠実な計測 {#host-faithful-measurement-in-node}

特定のフォントに合ったボックスの Node 出力（実際のカーニングとシェーピング）が必要な場合は、
オプションのピアである `canvas` をインストールし、起動時に一度だけ接続します。

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` は**オプションのピア依存**として宣言されており、要求しない限りインストールされません。
対話的なターミナルで Node が組み込みモデルにフォールバックしたとき、@knowvah/dot-engine はこの案内を
一度だけ表示します。`GV_FONT_QUIET=1` で抑止できます。

## カスタム計測器 {#custom-measurers}

`setTextMeasurer` は、`TextMeasurer` を実装していればどんなものでも受け付けます。

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

組み込みの実装は再利用できるようにエクスポートされています。`CanvasTextMeasurer`（任意の
2D コンテキストをラップ）、`EstimateTextMeasurer`（ヘッドレスの Graphviz の
`estimate_textspan_size` に一致する、決定論的でヒントなしのリファレンス実装で、**これが Node の
既定**です）、`LutTextMeasurer`（フォントファミリーごとの、ヒント付きルックアップテーブル。
ネイティブの `canvas` 依存なしに、より近いサイズ決定をしたい場合にオプトインで利用できます）です。

## この分け方の理由 {#why-this-split}

カーニング、合字、ASCII 以外のグリフの幅は、実際のフォントのシェーピングテーブルに依存します。
文字ごとの幅の表ではそれらを表現できず、正しい値はフォントごとに異なります
（等幅フォントは `<=` を 2 セルで描画し、プロポーショナルフォントは `VA` を詰めます）。
そのため、再現可能なレイアウトには固定のメトリクスモデルを使います。実際の描画フォントに
合わせるには、そのフォントで計測する必要があり、それが canvas を使う計測器の役割です。
