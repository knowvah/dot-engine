---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# 他の JS Graphviz ライブラリからの移行

viz.js / `@viz-js/viz`、`@hpcc-js/wasm`（`@hpcc-js/wasm-graphviz`）、`d3-graphviz` はいずれも、本物の C 版 Graphviz を **WebAssembly** にコンパイルして呼び出すことで、JavaScript から Graphviz を使えるようにしています。@knowvah/dot-engine はゼロから書かれた **TypeScript 移植**です。レイアウトエンジン、パーサー、SVG エミッターは、コンパイル済みバイナリではなく TypeScript のソースです。

この違いは付記ではなく、最も重要な点です。

| | WASM ラッパー（viz.js / `@hpcc-js/wasm` / d3-graphviz） | @knowvah/dot-engine |
|---|---|---|
| 実装 | 本物の C 版 Graphviz を `.wasm` バイナリにコンパイルしたもの | 純粋な TypeScript 移植。コンパイル済みの成果物なし |
| モジュールの初期化 | 非同期 — 最初の使用前に WASM モジュールをインスタンス化して await する | なし — `import` して同期的に呼び出す |
| バンドル | JS と並べて `.wasm` アセット（数百 KB〜数 MB 程度）を配布する | JS のみ。ツリーシェイク可能 |
| デバッグ | WASM の塊（あれば C のソース）をステップ実行する | ソースマップ付きで、本物の TypeScript をステップ実行する |
| スレッドモデル | レイアウトを Web Worker で実行するビルドもある | 他の TS 関数と同様に、呼び出したスレッドで実行される |
| 出力形式 | 元の C ビルドがコンパイルされたときの設定次第 — 通常は、ラスター / PDF を含む Graphviz のフルセット | SVG と、DOT / json / xdot / plain / イメージマップのテキスト形式 — 下記参照 |

「関数を呼んで SVG を受け取る。非同期の儀式も、配布する WASM アセットもない」が用途なら、それがまさに @knowvah/dot-engine の目的です。ラスターや PDF の出力に依存する場合は、下の [WASM を使い続けるべき場合](#when-to-stay-on-wasm)を参照してください。

## API の違い

3つのライブラリは形が異なります。下の表は、よくある移行のケースです（おおよその内容です。各ライブラリ自身のドキュメントで確認してください。出典は各行の下を参照）。

| ライブラリ | 典型的な呼び出し | @knowvah/dot-engine での対応 |
|---|---|---|
| `@viz-js/viz`（viz.js の後継） | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — 非同期。`Viz.instance()` は Promise を解決する | `renderSvg(dot, 'dot')` — 同期。インスタンス / 初期化ステップなし |
| viz.js 2.x（レガシー、`new Viz()`） | `new Viz().renderString(dot)` — `Promise<string>` を返す | `renderSvg(dot, 'dot')` — 同期 |
| `@hpcc-js/wasm-graphviz` | 一度 `await Graphviz.load()` してから `graphviz.dot(dot)`（ロード後は同期） | `renderSvg(dot, engine)` — ロード / ウォームアップのステップはまったくなし |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — 出力を DOM にバインドし、トランジションをアニメーションする | `renderSvg(dot, engine)` は SVG の**文字列**を返す。DOM への挿入は自分で行う（例: `el.innerHTML = svg`） |

右の列にある @knowvah/dot-engine の呼び出しはすべて**同期**です。インスタンス化すべき WASM バイナリがないので、await すべきモジュールもありません。@knowvah/dot-engine の呼び出しを包んでいる `await` / `.then()` は外してください。もともと必要ありません。

- `@viz-js/viz` の `Viz.instance()` → Promise と `renderSVGElement()` メソッドは viz-js.com に記載されています。執筆時点で、プロジェクトが公開している使用例で確認済みです。
- viz.js 2.x の `new Viz().renderString(dot)` は、そのリリースライン（現在は後継に置き換え済み）について記載されている API です。現行のインストールを使っている場合は、実際に `@viz-js/viz` を使っているかどうかを確認してください。
- `@hpcc-js/wasm-graphviz` の `Graphviz.load()` / `graphviz.dot()` の組は、執筆時点で、パッケージが公開している使用例で確認済みです。別の古い `@hpcc-js/wasm` パッケージは、過去のリリースで `graphviz.layout(dot, format, engine)` の呼び出しも公開していました。正確なシグネチャに依存する前に、インストールしているバージョン自身のドキュメントを確認してください。
- `d3-graphviz` の `.graphviz().renderDot(dot)` のチェーンと、それが内部で `@hpcc-js/wasm` の上に構築されていることは、執筆時点で、プロジェクトが公開している README で確認済みです。

### `renderDot` の DOM バインディングはここでは対象外

`d3-graphviz` は SVG のレンダリング以上のことを行います。結果を D3 のセレクションにバインドし、再レンダリングの差分を取り、レイアウト間のトランジションをアニメーションします。@knowvah/dot-engine は DOM について一切の方針を持たず、`renderSvg` / `render` はプレーンな文字列を返します。2つのレイアウト間で d3-graphviz 風のアニメーショントランジションが欲しい場合は、2回の `renderSvg` 呼び出しと独自の DOM 差分の上に構築するロジックになります（その機能だけは d3-graphviz を使い続けても構いません — 下記参照）。

## 文字列形式を解析せずにレイアウトデータを取得する

3つの WASM ライブラリはいずれも、Graphviz 自身の JSON またはプレーンテキスト形式を要求でき、その文字列を自分で解析してノード / エッジの座標を得ます。@knowvah/dot-engine はそのテキストの往復を省きます。`getLayout(g)`（`render` の後）を呼ぶだけで、型付きで JSON シリアライズ可能なスナップショットが直接得られます。解析すべき `-Tjson` / `-Tplain` の文字列はありません。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

スナップショットの形の全体、単位、`yAxis` オプションについては、[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください。

## WASM を使い続けるべき場合 {#when-to-stay-on-wasm}

スコープについては正直に考えてください。@knowvah/dot-engine の対象は、SVG と、`dot` / `xdot` / `json` / `plain` / `plain-ext` / `imap` / `cmapx` のテキスト形式です。ラスター形式（PNG/JPEG/GIF/...）や PostScript/PDF/EPS は出力**しません**。これらは意図的なスコープの境界であり、単に未完成のギャップではありません。非目標の正確な一覧は[既知の差異](/ja/divergences)を参照してください。

アプリケーションがレイアウトエンジンから直接 `-Tpng` や `-Tpdf` の出力を必要とする場合は、上記の WASM ベースのライブラリがそのケースをカバーします。本物の C 版 Graphviz を実行しているため、そのビルドがコンパイルされた出力形式をすべてサポートするからです。その場合は、そのコードパスだけ WASM ライブラリを使い続けるか、@knowvah/dot-engine で `'svg'` にレンダリングして、別のツールで SVG をラスター / PDF に後段変換してください。

## 関連項目

- [レイアウトエンジン](/ja/guide/engines)
- [他の形式へのレンダリング](/ja/guide/render-formats)
- [計算済みジオメトリを読む](/ja/guide/geometry)
- [既知の差異](/ja/divergences)
- [はじめに](/ja/guide/getting-started)
