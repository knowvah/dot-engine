---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: 純粋な TypeScript による Graphviz
  tagline: DOT を入れれば SVG が出てくる — C は不要。ネイティブの Graphviz バイナリも WASM も使いません。純粋な TypeScript で、ブラウザー上で動きます。
  actions:
    - theme: brand
      text: はじめに
      link: /ja/guide/getting-started
    - theme: alt
      text: プレイグラウンドを開く
      link: /ja/playground
    - theme: alt
      text: GitHub で見る
      link: https://github.com/knowvah/dot-engine
features:
  - title: C 版 Graphviz に忠実
    details: 正本である C 実装を一行ずつ移植しました。dot エンジンは、ゴールデンコーパスにおいてネイティブバイナリと厳密な決定論的許容誤差（座標は ±0.01、数値以外の内容は完全一致）で一致します。
  - title: ブラウザーネイティブ、ランタイム依存ゼロ
    details: C は不要 — ネイティブの Graphviz バイナリも、WASM 移植版も、レンダリングサーバーもありません。レイアウトエンジン自体が TypeScript なので、バンドルしてそのまま配布できます。
  - title: 8 つのレイアウトエンジンすべてに対応
    details: dot、neato、fdp、sfdp、circo、twopi、osage、patchwork を SVG にレンダリングします。
  - title: プログラムからのレイアウトとジオメトリ
    details: レンダリングするだけではありません。getLayout() を使えば、計算されたノードの位置、エッジのスプライン、クラスターの境界を JSON にシリアライズ可能なプレーンなスナップショットとして読み戻せます。-Tplain を解析する必要はありません。
---

## 試してみる

下のエディターは、実際のライブラリをブラウザー内で実行しています。左側の DOT を編集すると、
SVG がライブで更新されます。

<Playground height="360px" />

## 進む道を選ぶ

初めての方は、やりたいことに合った入口を選んでください。

| やりたいこと | 最初に読むページ |
| --- | --- |
| 各部分がどう組み合わさるかを理解したい | [概要（メンタルモデル）](/ja/guide/overview) |
| インストールして最初のグラフをレンダリングしたい | [はじめに](/ja/guide/getting-started) |
| 具体的な作業を解決したい | [レシピ集](/ja/guide/recipes) |
| 関数や型を調べたい | [API リファレンス](/ja/guide/api) · [型](/ja/guide/types) |
| インストールせずに試したい | [プレイグラウンド](/ja/playground) |

ほかのツールから移行する場合は、[C の `dot` CLI から](/ja/guide/migrate-from-c-cli)
または [JS の Graphviz ライブラリから](/ja/guide/migrate-from-js-libs)を参照してください。

自動生成された網羅的なシグネチャ一覧は
[生成された API リファレンス](/reference/)を参照してください。レンダリングしたグラフをページに埋め込みたい場合は、
画像のインライン化と CSP に関する指針を [画像の扱い](/ja/guide/images) で確認してください。
