---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# C の `dot` コマンドラインツールからの移行

C 版の `dot` / `neato` / `fdp` / ... バイナリは、`.dot` ファイル（または stdin）を読み込み、レンダリング済みのファイル（または stdout）を書き出します。@knowvah/dot-engine にはファイルシステムがありません。DOT の**文字列**を受け取り、レンダリング済みの**文字列**を返します（`getLayout` を使えば、解析が必要な文字列の代わりに、プレーンな JavaScript のジオメトリオブジェクトが得られます）。

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

上のファイルの読み書きはライブラリではなく、あなたのコードです。@knowvah/dot-engine がディスクに触れることはありません。だからこそ、読み込む `input.dot` のないブラウザーのタブでも、変更なしで動作します。

## `-K<engine>` — レイアウトエンジン

`-K` はレイアウトエンジンを選択します。@knowvah/dot-engine は同じ名前を、`renderSvg` の `engine` 引数、または `render` の `opts.engine` フィールドとして受け取ります。8つのエンジンはすべて移植済みです。

| `-K` の値 | @knowvah/dot-engine の `engine` 文字列 |
|---|---|
| `-Kdot` | `'dot'`（`engine` を省略したときの `render` のデフォルトでもある） |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

各エンジンの役割と適合性クラスについては、[レイアウトエンジン](/ja/guide/engines)を参照してください。

## `-T<format>` — 出力形式

`renderSvg` は SVG 専用です。それ以外には `render(g, format, opts?)` を使ってください。@knowvah/dot-engine の `OutputFormat` ユニオンは、次の `-T` ターゲットをカバーします。

| `-T` の値 | @knowvah/dot-engine の `format` 文字列 | 備考 |
|---|---|---|
| `-Tsvg` | `'svg'` | `renderSvg` の唯一の出力でもある |
| `-Tdot` | `'dot'` | レイアウト属性（`pos`、`bb`、...）が追加された DOT ソース |
| `-Txdot` | `'xdot'` | DOT に `_draw_` / `_ldraw_` の xdot 命令を加えたもの |
| `-Tjson` | `'json'` | グラフ全体の JSON |
| `-Tplain` | `'plain'` | 空白区切りのノード / エッジのジオメトリ |
| `-Tplain-ext` | `'plain-ext'` | `plain` に、エッジのポート座標を加えたもの |
| `-Timap` | `'imap'` | サーバーサイドの HTML イメージマップ |
| `-Tcmapx` | `'cmapx'` | クライアントサイドの HTML `<map>` 要素 |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**サポート対象外:** ラスター形式（`-Tpng`、`-Tjpg`、`-Tgif`、...）、`-Tps` / `-Tpdf` / `-Teps`、および GUI / インタラクティブなバックエンド。これらは意図的なスコープの境界です。非目標の全一覧は[既知の差異](/ja/divergences)を参照してください。ラスターが必要な場合は、`'svg'` にレンダリングして、後段で変換してください（ヘッドレスブラウザー、`resvg` など）。

## `-Gname=val` / `-Nname=val` / `-Ename=val` — 属性

CLI のグローバル属性フラグは、コマンドラインから、すべてのグラフ / ノード / エッジにデフォルト値を設定します。@knowvah/dot-engine にはコマンドラインフラグがありません。同じ属性を、DOT ソースの中で直接設定するか、コードでグラフを構築している場合はビルダー API で設定してください。

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

ビルダー API の全体は[コードでグラフを構築する](/ja/guide/build-a-graph)を参照してください。

## CLI が直接は提供できないジオメトリを取得する

`-Tplain` が存在するのは、まさにスクリプトがテキスト出力からノード / エッジの座標をスクレイピングできるようにするためです。@knowvah/dot-engine はその往復を省きます。`render` の後に `getLayout(g)` を呼べば、すべてのノードの位置、エッジのスプライン、全体のバウンディングボックスを、型付きで JSON シリアライズ可能なスナップショットとして取得できます。解析するテキスト形式はありません。

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

スナップショットの形の全体と `yAxis` オプションについては、[計算済みジオメトリを読む](/ja/guide/geometry)を参照してください（ネイティブの graphviz は y 軸上向き、ブラウザーは y 軸下向きです）。

## フォントと画像: CLI はファイルシステムを読むが、@knowvah/dot-engine は読まない

ネイティブの `dot` は、マシンにインストールされているフォントでテキストを計測し、`image="..."` 属性を、作業ディレクトリからの相対位置にあるファイルを読んで解決します。@knowvah/dot-engine はファイルシステムにアクセスしないため、どちらもディスクから読み込まれるのではなく、ホストアプリケーションが注入します。

- **テキスト計測** — `setTextMeasurer` が `TextMeasurer` をインストールします。何も設定しなければ、ライブラリが適切なデフォルトを自動的に解決します（ブラウザーでは canvas、Node では決定論的なメトリクスモデル）。[テキスト計測](/ja/guide/text-measurement)を参照してください。
- **画像** — `setImageSizer`（およびインライン化のための `setImageResolver`）で、画像本来の寸法と画像データを自分で渡せます。@knowvah/dot-engine があなたに代わってファイルを stat することはできないためです。[画像の扱い](/ja/guide/images)を参照してください。

## 関連項目

- [レイアウトエンジン](/ja/guide/engines)
- [他の形式へのレンダリング](/ja/guide/render-formats)
- [計算済みジオメトリを読む](/ja/guide/geometry)
- [既知の差異](/ja/divergences)
- [はじめに](/ja/guide/getting-started)
