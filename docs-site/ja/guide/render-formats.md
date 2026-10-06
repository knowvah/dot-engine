---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# 他の形式へのレンダリング

`render` はグラフをレイアウトし、指定された形式の文字列を出力します。`parse` または `createGraph` が生成した任意の `Graph` を受け付けます。

## シグネチャ

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` のデフォルトは `'dot'` です。使用できるエンジンの一覧は[レイアウトエンジン](/ja/guide/engines)を参照してください。

## 形式

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## 形式ごとの使いどころ

| 形式 | 主な用途 |
|---|---|
| `'svg'` | Web ページへの埋め込み。人間が読める。劣化なしで拡大縮小できる |
| `'dot'` | デバッグ。レイアウトを保持したまま他の graphviz ツールに渡す |
| `'xdot'` | `getDrawOps` 経由で独自のレンダラーに渡す |
| `'json'` | ツールや検査向けの機械可読なグラフデータ |
| `'plain'` | 軽量なジオメトリ出力。スクリプトで解析しやすい |
| `'plain-ext'` | `'plain'` に加え、エッジのポート座標を含む |
| `'imap'` | `<img>` タグ向けのサーバーサイドのクリッカブルイメージマップ |
| `'cmapx'` | `<img>` タグ向けのクライアントサイドの `<map>` 要素 |

## 例

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## 別のエンジンを使う

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## `renderSvg` との関係

`renderSvg(dot, engine)` は `parse` と `render` を一度に呼び出す便利なラッパーで、出力は SVG に限られます。SVG 以外の形式が必要な場合や、すでに `Graph` オブジェクトを持っている場合は、`render` を直接使ってください。

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
