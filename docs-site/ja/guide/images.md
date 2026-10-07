---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# 画像

`image="logo.png"` を持つノード（または HTML ライクなラベルの `<IMG SRC="logo.png">`
セル）は、既定ではピクセルが埋め込まれません。@knowvah/dot-engine は、
ソースを**そのまま**出力します。

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

SVG を表示するもの（ブラウザーの `<img>`/インライン `<svg>`、Electron のシェル、
静的サイトのビルドなど）が、その `href` を自分で解決します。このページでは、
レイアウト中にその href のサイズをどう決めるか、ピクセルを実際に表示させる 3 つの方法、
そしてそれぞれの CSP への影響を説明します。

## 画像の流れ {#how-images-flow}

1. グラフが、ノードに `image="logo.png"` を宣言するか、HTML ライクなラベルに
   `<IMG>` セルを含めます。
2. HTML ライクな `<IMG>` セルでは、ほかの何かをレイアウトする前にセルのサイズを決めるため、
   Graphviz は画像の**本来の幅と高さ**を必要とします。ライブラリはそれを調べるために
   ファイルシステムにもネットワークにも触れないので、サイザーを登録します
   （`setImageSizer`。[ブラウザーでの利用](/ja/guide/browser)で説明しており、Node 向けには下で再度説明します）。
   ノードの `image=` 属性はサイザーによるサイズ決定の対象では**ありません**。ヘッドレスの
   ネイティブ Graphviz と同様に、ノードは通常のボックスのままで、画像はその中に描画されます。
3. レイアウトは、サイザーが各 `<IMG>` に対して返した寸法を使って実行されます。
4. SVG エミッター（`src/render/svg.ts` の `usershape()`）は、手順 3 で計算されたボックスで
   `<image xlink:href="...">` を書き出します。既定では、`href` は生の `src` 文字列を XML エスケープしただけで、
   ほかには何もありません。
5. 任意で、`setImageResolver` を呼び、かつ `{ inlineImages: true }` でレンダリングした場合は、
   エミッターは代わりに `xlink:href="data:<mime>;base64,<bytes>"`、つまり自己完結した `data:` URI を書き出します。
   これは追加機能であり、ネイティブの Graphviz にはありません。

サイズ決定とインライン化は、独立して別々に登録される 2 つの差し替えポイントです。
インライン化せずに画像のサイズだけを決めることもでき（よくあるケースで、ファイルをホストします）、
両方を行うこともできます（自己完結した SVG）。

## Node とブラウザーでのサイズ決定 {#sizing-in-node-vs-browser}

`setImageSizer` は `(src: string) => { w: number; h: number } | null` を受け取り、レイアウト中に
`image=`/`<IMG>` のソースごとに 1 回だけ呼び出されます。これはプロセスグローバルの登録で、
下で説明する `setImageResolver` と同じパターンです。`render()`/`renderSvg()` の前に一度だけ呼んでください。

**ブラウザー** — すでに `Image` と `decode()` があるので、実際の画像を計測します。

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

`setImageSizer` は同期コールバックです。内部で `await` はできません。
そのため、ブラウザーの場合は、レイアウトを実行する前に（`decode()` で）寸法をキャッシュに解決しておき、
そのキャッシュを同期的に読みます。

**Node** — DOM の `Image` はなく、ライブラリがファイルシステムを読むこともありません。
既知の寸法をハードコードするか、自分で（たとえばマニフェストや、用意した軽量な PNG/JPEG ヘッダー
パーサーから）読み取り、同じ方法で渡します。

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

グラフが外部画像を一切参照しないなら、これは丸ごと省略してください。

## 非同期のサイザーとリゾルバー（レンダリングごと） {#async-sizer-and-resolver-per-render}

`setImageSizer` / `setImageResolver` は同期的でプロセスグローバルな登録なので、上のブラウザーの
パターンではキャッシュを事前に温めておく必要があります。非同期のエントリポイントは、
フックを**呼び出しごと**に受け取り、await も代わりに行います。

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- 各フックは、**異なる `src` ごとに多くても 1 回**、レイアウトの開始前に並列で呼び出されます。
  その後、エンジンは収集した結果に対して、通常の同期レイアウトを実行します。
- **throw または reject する**フックは、同期フックが `null` を返した場合と全く同じく、ミス（`null`）として扱われます。
  サイザーでは大きさゼロ、リゾルバーでは生の `src` の素通しになります。
- 非同期フックが与えられている場合、ミスしてもグローバルの
  `setImageSizer` / `setImageResolver` には**フォールバックしません**。与えられていない場合は、
  `renderSvg` と同様にグローバルが適用されます。
- フックはそのレンダリング 1 回にのみ適用され、グローバルには何も登録されません。
- `imageResolver` が参照されるのは、`inlineImages` が `true` のときだけです。
- `renderSvgInto` も同じオプションを受け付けます。

## 画像を表示させる {#making-the-image-appear}

サイズ決定によってレイアウトは正しくなりますが、SVG が表示される場所でピクセルが
表示されるようになるわけではありません。次の 3 つの方法から選んでください。

### 1. ファイルをホストする {#1-host-the-file}

ブラウザー/利用側が取得できる URL（または、SVG が表示される場所からの相対パス）で画像を配信します。
これが最も単純な方法で、レンダリング時の追加作業は不要です。ただし、表示するコンテキストが
そのオリジンに到達できる必要があり、厳格な `img-src` CSP の環境で SVG を表示する場合は、
そのオリジンもそこで許可リストに入れる必要があります（下記参照）。

### 2. `data:` URI としてインライン化する {#2-inline-as-a-data-uri}

インライン化 API を使うと、外部取得が一切ない、自己完結した 1 つの SVG 文字列を作れます。
`setImageResolver` が生のバイト列を供給し、`render(g, 'svg', { inlineImages: true })` がそれを埋め込みます。

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

`ImageResolver` は、MIME タイプを明示的に指定したい場合に
`{ bytes: Uint8Array; mime?: string }` を返すこともできます（指定しない場合、エミッターは
ソースのファイル拡張子から推測します。`.png` → `image/png`、`.svg` →
`image/svg+xml` などで、未知の拡張子は `application/octet-stream` にフォールバックします）。
登録を解除するには `setImageResolver(null)` を呼びます。

::: tip
SVG の送り先が、表示時に外部リソースを取得できない場合（メールクライアント、オフラインのドキュメント、
厳格な CSP の埋め込み、あるいは追加のネットワークリクエストなしで自己完結した 1 つの文字列にしたい場合）は、
インライン化を選んでください。トレードオフは出力サイズです。base64 によって画像は約 33% 大きくなり、
その画像を参照するすべての SVG に重複して含まれます（レンダリングをまたいだブラウザーキャッシュの再利用は
できません）。
:::

`inlineImages` の既定は `false` です。未設定なら、出力はインライン化導入前の素通しと
バイト単位で同一です。影響するのは `svg` 形式だけで、`json`/`xdot`/`dot`/その他のテキスト形式には
影響しません。ミス（リゾルバーが登録されていない、またはその `src` に対してリゾルバーが `null` を返す）の場合は、
自動的に生の `src` の素通しにフォールバックします。インライン化は穏やかに機能低下し、throw することはありません。

### 3. `imagepath` 方式のベースディレクトリ {#3-imagepath-style-base-directories}

ネイティブ Graphviz の `imagepath` グラフ属性は、C バイナリに対して、相対的な `image=` の値を
解決する基準となる、ファイルシステム/`GDFONTPATH` 形式の検索ディレクトリを伝えます。
@knowvah/dot-engine は `imagepath` を実装していません。この移植版は、ディスクから画像データを
読むことが一切ないので、解決の基準となるパスがないためです
（スコープの境界の詳細は[既知の差異](/ja/divergences)を参照してください）。グラフが相対的な
`image=` パスを使う場合は、DOT ソースを組み立てる層、または `setImageSizer`/`ImageResolver`
のコールバックの中で、自分のベースディレクトリ/URL を基準に解決してください。どちらも、
グラフに書かれたとおりの生の `src` 文字列を受け取るので、参照の前にベースパスを文字列として
前置するのは、正規に認められた通常のパターンです。

## CSP のガイダンス {#csp-guidance}

グラフがユーザー提供のもの（プレイグラウンドや、任意の DOT をレンダリングする埋め込み）である場合は、
ページの `img-src` ポリシーを最初から検討してください。

**インライン化された画像（`data:` URI）** に必要なのは次だけです。

```
img-src 'self' data:
```

HTTP レスポンスヘッダーとして書くと次のようになります。

```
Content-Security-Policy: img-src 'self' data:
```

または、SVG をホストするページの meta タグとして書きます。

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

これは厳格です。バイト列がすでに SVG 文字列に埋め込まれているので、外部の画像ホストには
一切接続しません。

これに対して、**ホストされた画像（上の方法 1）** では、表示するコンテキストが、
それらの画像が実際にある場所から取得できる必要があります。ユーザー提供のグラフが任意の
`image=` URL を参照できる場合、考えられるすべてのホストを許可リストに入れるのは
多くの場合現実的ではないため、プレイグラウンドや埋め込みのページでは、緩い設定が必要になることがあります。

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
`img-src *`（または同じくらい緩い `img-src`）を**サイト全体**の既定にしてはいけません。
任意のユーザー提供グラフをレンダリングする必要がある特定のプレイグラウンド/埋め込みページに限定し、
そのページだけの意図的で文書化された緩和として扱い、それ以外のすべてのページの CSP は厳格に保ってください。
緩い `img-src` では、悪意のあるグラフが、画像 URL を使ったサイドチャネル（たとえば、攻撃者が管理するホストに対して
クエリパラメーターにデータをエンコードする方法）でデータを持ち出したり、望ましくないリモートコンテンツを
読み込んだりできてしまいます。画像のセットを自分で管理できるなら、代わりにインライン化（`data:`）を選び、
どこでも `img-src 'self'
data:` を維持してください。
:::

## 画像が見つからない場合 {#missing-images}

参照されたソースに対して `setImageSizer` が `null` を返す（またはサイザーが登録されていない）場合、
@knowvah/dot-engine は、ネイティブ Graphviz の `gvusershape` のミスと同じ、C に忠実な経路をたどります。
警告を出し、画像を**大きさゼロ**として扱います。これは、その周囲で計算されるノードのボックスの
レイアウトに影響します。`setImageResolver`/`inlineImages` を使っていてリゾルバーがミスした場合、
エミッターはインライン化せずに生の `src` の素通しにフォールバックします。`href` は書き出されますが、
ページ上のほかの何かがそれを取得できない限り、解決されません。画像/ラスターの扱い全般について、
何がスコープ内で何がスコープ外かは、[既知の差異](/ja/divergences)を参照してください。
