---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# ブラウザーでの利用

@knowvah/dot-engine は Node 専用の API を一切使っておらず、ブラウザー向けに安全にバンドルできます。
このページでは、クライアントサイドで動かすときに知っておくべき 2 つのことを説明します。

## バンドル {#bundling}

このライブラリはプレーンな ES モジュールです。最近のバンドラー（Vite、esbuild、Rollup、
webpack）であればどれでも取り込めます。外部化すべきランタイム依存はなく、
ホストすべき WASM 成果物もありません。

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

このサイトの[プレイグラウンド](/ja/playground)がまさにこれを行っています。エンジンを
インポートし、ブラウザー内で `renderSvg` を呼び出すだけで、サーバーとの往復はありません。

## テキスト計測 {#text-measurement}

Graphviz はラベルのサイズを決めるためにテキストの寸法を必要とします。@knowvah/dot-engine は
これを自動的に処理します。

- **ブラウザーでは**（`document` が存在する場合）、ネイティブの `<canvas>` 2D コンテキストで
  テキストを計測します。ブラウザーが SVG を描画するときと同じフォントなので、
  ホスト環境に忠実です。
- **Node では**、既定で組み込みの **Estimate** 計測器を使います。これは
  Graphviz 自身の `estimate_textspan_size` を模した、決定論的でヘッドレス環境でも安全なモデルです。
  Node で正しいレイアウトを得るために `canvas` のインストールやフォントファイルは必要ありません。
  また、ヒント付きのルックアップテーブル（LUT）計測器もオプトインで利用でき、ネイティブの
  canvas 依存なしに、ホスト環境により近いサイズ決定ができます。計測器を明示的に選択する方法は
  [テキスト計測](/ja/guide/text-measurement)を参照してください。

いずれの場合も、レイアウトにフォントファイルは必要ありません。

## Web フォント: プリフェッチが重要な理由 {#web-fonts-why-prefetching-matters}

ラベルのサイズは、フォントを使ってテキストを計測することで決まります。書体が
`@font-face` で宣言されていても読み込みが完了していない場合、ブラウザーは代わりに
**フォールバック**フォントで計測するため、本来のフォントが届いた時点でレイアウトが
ずれてしまいます。JetBrains Mono を使って Chromium で計測したところ、ラベルのボックスの幅は、
書体の読み込み前に計測すると（フォールバック）**70.68 pt**、読み込み後には **124.8 pt** でした。

非同期のエントリポイント（`renderSvgAsync`、`renderAsync`、`renderSvgInto`）はこの問題を避けます。
グラフが要求するフォントを収集し、`document.fonts` を通じて読み込み、それからはじめて
レイアウトを実行します。`renderSvgAsync` は、読み込み後に計測した場合と同じ 124.8 pt になりました。

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`**（既定は `3000`）は、書体ごとではなく、すべての書体で共有される
  1 つの期限です。
- **`fontIssues`** は `{ face, reason }` のリストです。`reason: 'failed'` は、
  書体がエラーになった（たとえば 404）か、読み込みが拒否されたことを意味します。`reason: 'timeout'` は
  `fontTimeoutMs` 以内に読み込まれなかったことを意味します。どちらの場合も、レイアウトは
  フォールバックフォントで続行されます。それぞれの問題は `console.warn` にも出力されます。
  フォントの問題によって Promise が reject されることはありません。
- **制限事項:** 報告できるのは、`@font-face` で宣言されたファミリーだけです。
  システムフォントや未知のファミリー名は「読み込み済み」として解決される（待つものがない）ため、
  `fontname` のつづりを間違えても、`fontIssues` には決して載りません。
- **Node と Worker** には `document.fonts` がないため、フォントのプリフェッチはスキップされ、
  `fontIssues` は `[]` になります。画像フックは引き続き動作します。独自のものを使いたい場合は、
  `fontSet`（`load(font)` を持つもの）を渡せます。

## ページへのレンダリング: `renderSvgInto` {#rendering-into-a-page-rendersvginto}

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

指定した id を持つ要素の子を、レンダリングされた `<svg>`（`element` として返されます）で置き換えます。
`DOMParser` と `importNode` を使い、`innerHTML` は決して使いません。存在しない id を指定すると
`ERR_INVALID_ARG_VALUE` で reject されます。SVG は既定でスクラブされます。独自のサニタイザーを使うには
`sanitize` を、サニタイズを省略するには `trusted: true` を渡してください。スクラバーが何を除去し、何を
残すかについては README の「Security」セクションを参照し、Content-Security-Policy を設定したままにしてください。

## 外部画像: `setImageSizer` {#external-images-setimagesizer}

HTML ライクなラベルに外部画像（`<IMG SRC="logo.png"/>`）が含まれる場合、Graphviz はセルの
サイズを決めるために、その画像の本来の寸法を必要とします。（ノードの `image=` 属性は
サイズ決定の対象ではありません。ヘッドレスのネイティブ Graphviz と同様に、ノードは通常のボックスの
ままです。）ライブラリはファイルシステムを読めないため、サイザーを自分で用意します。

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

グラフが外部画像を一切参照しないなら、これを呼ぶ必要はありません。
画像のサイズを非同期に（たとえば読み込んで）決めるには、代わりに非同期の
`imageSizer` を `renderSvgAsync` に渡してください。[画像](/ja/guide/images)を参照してください。

## Web Worker {#web-workers}

レイアウトは同期的に実行されるため、大きなグラフは、実行しているスレッドをブロックします。
ページの応答性を保つには、Worker 内で実行してください。Worker 内には
`document` がないため、ライブラリは `OffscreenCanvas` でテキストを計測し、非同期 API は
Worker 自身のフォントセット（`self.fonts`）を通じてフォントを読み込みます。

Worker のフォントはページのフォントとは別です。Worker 側で `FontFace` API を使って登録してください
（CSS の `@font-face` ルールは Worker には届きません）。

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Worker 内では、少なくとも各 Web フォントの読み込みが完了するまでは、`renderSvg` ではなく
`renderSvgAsync`（または `renderAsync`）でレンダリングしてください。Chromium は、書体の読み込み前に Worker 内で
計測された文字列と全く同じフォント文字列について、読み込み後もフォールバック書体で計測し続けます。
非同期 API は計測の前にフォントを読み込むため、この問題には当たりません。

## 期待してはいけないこと {#what-not-to-expect}

このライブラリが対象とするのは **SVG**（および `json` / `xdot` / `dot` / イメージマップの
テキスト形式）です。ラスター出力（PNG/JPG）、PostScript/PDF、対話型/GUI のバックエンドは
スコープ外です。別の形式が必要な場合は、下流で SVG を変換してください。スコープの境界の詳細は
[既知の差異](/ja/divergences)を参照してください。

## 大規模グラフ: SVG に事前レンダリングする {#large-graphs-pre-render-to-svg}

非常に大きなグラフ（おおよそ **1 万ノード超、または数 MB の DOT ソース**）は、
ブラウザーで実行時にレイアウトするのは現実的ではありません。レイアウト（mincross、ランク付け、
スプラインルーティング）は超線形なので、これは **本家 Graphviz と共通のスケールの上限であり、
このエンジン固有の制限ではありません**。そのような入力では、ネイティブの `dot`、WASM ビルド
（`@hpcc-js/wasm-graphviz`）、このエンジンのいずれも、同じようにタイムアウトするかメモリ不足になります。
（このエンジンはメモリリークは**しません**。レンダリングごとのヒープは一定で、
限界は厳密にグラフのサイズです。測定した比較は[パフォーマンスダッシュボード](/perf)を参照してください。）

この規模のグラフでは、表示のたびにブラウザーでレイアウトするのではなく、**ビルド時に一度だけレンダリングして、
生成された `.svg` を配信**してください。ネイティブの `dot` でも、リクエストごとに実行するには遅すぎるため、
同じパターンを使うことになります。

[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins)（NPM で公開）の
ビルド時サイトアダプターは、まさにこれを行います。

- `@knowvah/vitepress-plugin-dot` — VitePress（markdown-it）、ビルド時
- `@knowvah/eleventy-plugin-dot` — Eleventy（markdown-it）、ビルド時
- `@knowvah/docusaurus-plugin-dot` — Docusaurus（MDX/remark）、ビルド時
- `@knowvah/dot-markdown-it` — フレームワーク非依存の markdown-it 連携

ビルド時のレンダリングが選べない、ユーザーが与える動的なグラフでは、
対話的なレンダリングは妥当なサイズのグラフに限定し、出力された SVG をキャッシュしてください。
