---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# 使用圖片

帶有 `image="logo.png"` 的節點（或類 HTML 標籤中的 `<IMG SRC="logo.png">`
儲存格），預設不會把圖片的像素嵌入輸出。@knowvah/dot-engine 會
**原封不動**地輸出來源：

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

無論由誰顯示這份 SVG——瀏覽器的 `<img>`／內嵌 `<svg>`、Electron
殼層、靜態網站建置——都由它們自行解析該 `href`。本頁說明
該 href 在版面配置期間如何取得尺寸、讓像素真正顯示出來的三種做法，
以及各做法對 CSP 的影響。

## 圖片如何流動 {#how-images-flow}

1. 圖在節點上宣告 `image="logo.png"`，或類 HTML 標籤
   含有 `<IMG>` 儲存格。
2. 對於類 HTML 的 `<IMG>` 儲存格，Graphviz 需要圖片的**內在
   寬度／高度**，才能先決定儲存格大小，再安排其他一切——
   函式庫絕不會為了查出這些資訊而存取檔案系統或網路，
   因此您要註冊一個尺寸取得器（`setImageSizer`，說明於
   [在瀏覽器中使用](/zh-tw/guide/browser)，下方也會針對 Node 再次說明）。節點的
   `image=` 屬性**不會**由尺寸取得器量測：與無頭的原生
   Graphviz 相同，節點維持其一般方框，圖片則繪製在其中。
3. 版面配置使用您的尺寸取得器為每個 `<IMG>` 回傳的尺寸來執行。
4. SVG 輸出器（`src/render/svg.ts` 的 `usershape()`）會寫出
   `<image xlink:href="...">`，其方框是第 3 步計算的結果。預設情況下，
   `href` 就是原始的 `src` 字串，經過 XML 跳脫，別無其他。
5. 選擇性地——若您呼叫了 `setImageResolver`，並以
   `{ inlineImages: true }` 轉譯——輸出器會改為寫出
   `xlink:href="data:<mime>;base64,<bytes>"`，也就是自成一體的 `data:` URI。
   這是額外附加的功能；原生 Graphviz 並不這麼做。

取得尺寸與內嵌是兩個彼此獨立、分別註冊的替換點：您可以
只取得圖片尺寸而不內嵌（常見情況——自行代管檔案），也可以
兩者都做（自成一體的 SVG）。

## 在 Node 與瀏覽器中取得尺寸 {#sizing-in-node-vs-browser}

`setImageSizer` 接受 `(src: string) => { w: number; h: number } | null`，
並在版面配置期間，對每個不同的 `image=`／`<IMG>` 來源各查詢一次。它是
程序層級的全域註冊，模式與下方的 `setImageResolver` 相同——請
在 `render()`／`renderSvg()` 之前呼叫一次。

**瀏覽器**——量測真實的圖片，因為您已經有 `Image` 與
`decode()`：

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

`setImageSizer` 是同步回呼——其中沒有 `await`——因此瀏覽器的做法
是在版面配置執行前，先（透過 `decode()`）把尺寸解析到快取中，
再以同步方式讀取該快取。

**Node**——沒有 DOM 的 `Image`，而且函式庫不會替您讀取
檔案系統。您可以寫死已知的尺寸，或自行讀取
（例如從資訊清單，或您自行提供的輕量 PNG/JPEG 標頭剖析器），
再以同樣的方式把結果交給它：

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

如果您的圖從不參照外部圖片，就完全可以略過這一節。

## 非同步尺寸取得器與解析器（每次轉譯） {#async-sizer-and-resolver-per-render}

`setImageSizer` / `setImageResolver` 是同步的、程序層級的全域
註冊，因此上述瀏覽器做法必須預先暖機一個快取。非同步
進入點則是在**每次呼叫**時接收這些掛鉤，並替您等待它們：

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

- 每個掛鉤對每個不同的 `src` **最多只會被呼叫一次**，並在
  版面配置開始前平行執行。引擎接著針對收集到的結果執行其一般的
  同步版面配置。
- **擲出例外或被拒絕**的掛鉤會被視為未命中（`null`），與
  回傳 `null` 的同步掛鉤完全相同：尺寸取得器視為尺寸為零，
  解析器則直接傳遞原始的 `src`。
- 當提供了非同步掛鉤時，未命中**不會**退回使用全域的
  `setImageSizer` / `setImageResolver`。若未提供，則全域的掛鉤
  與 `renderSvg` 中的情況相同而生效。
- 這些掛鉤僅適用於該次轉譯；不會註冊任何全域內容。
- 只有在 `inlineImages` 為 `true` 時，才會查詢 `imageResolver`。
- `renderSvgInto` 接受相同的選項。

## 讓圖片顯示出來 {#making-the-image-appear}

取得尺寸能讓版面配置正確；但它無法讓像素在 SVG 最終顯示的
任何地方都顯示出來。請從三種做法中擇一。

### 1. 自行代管檔案 {#1-host-the-file}

將圖片放在瀏覽器／使用端能取得的 URL（或相對於
SVG 顯示位置的路徑）。這是最簡單的選項，
不需要額外的轉譯期工作——但顯示環境必須能
連到該來源，而且如果 SVG 顯示在設有嚴格 `img-src`
CSP 的地方，該來源也必須在那裡列入允許清單（見下文）。

### 2. 以 `data:` URI 內嵌 {#2-inline-as-a-data-uri}

使用 T1 的內嵌 API，產生一個完全不需要外部擷取、自成一體的 SVG 字串：
`setImageResolver` 提供原始位元組，而
`render(g, 'svg', { inlineImages: true })` 會將它們嵌入。

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

若您想明確指定 MIME 類型，`ImageResolver` 也可以回傳
`{ bytes: Uint8Array; mime?: string }`（否則輸出器會依來源的
副檔名推斷——`.png` → `image/png`、`.svg` →
`image/svg+xml`，依此類推，遇到未知副檔名則退回
`application/octet-stream`）。呼叫 `setImageResolver(null)` 即可清除註冊。

::: tip
當 SVG 要傳送到顯示時無法擷取外部資源的地方——電子郵件用戶端、
離線文件、設有嚴格 CSP 的嵌入頁，或任何您想要一個
自成一體、不必再發出後續網路請求的字串之處——請優先採用內嵌。
代價是輸出大小：base64 會使圖片膨脹約 33%，
而且會被複製到每一份參照它的 SVG 中（跨次轉譯
無法重複使用瀏覽器快取）。
:::

`inlineImages` 預設為 `false`；未設定時，輸出與先前沒有內嵌功能的
直接傳遞逐位元組相同。它只影響 `svg` 格式——對 `json`/`xdot`/`dot`/其他文字格式
沒有任何作用。未命中（未註冊解析器，或
解析器對該 `src` 回傳 `null`）時，會自動退回直接傳遞原始
`src`——內嵌會平順地降級，絕不會擲出例外。

### 3. `imagepath` 風格的基底目錄 {#3-imagepath-style-base-directories}

原生 Graphviz 的 `imagepath` 圖屬性，是告訴 C 二進位檔一個
檔案系統／`GDFONTPATH` 風格的搜尋目錄，用來解析相對的 `image=`
值。@knowvah/dot-engine 並未實作 `imagepath`——此移植版從不
自行從磁碟讀取圖片資料，因此沒有可供解析的路徑
（完整的範圍界線請見[已知差異](/zh-tw/divergences)）。如果您的
圖使用相對的 `image=` 路徑，請在建構 DOT 原始碼的那一層，或在您的
`setImageSizer`／`ImageResolver` 回呼中，自行對照您自己的基底
目錄／URL 來解析——兩者收到的都是與圖中所寫完全一致的原始 `src` 字串，
因此在查詢前先為它加上基底路徑前綴，是一種正常且受認可的做法。

## CSP 指引 {#csp-guidance}

如果您的圖是由使用者提供的（遊樂場、會轉譯
任意 DOT 的嵌入頁），請一開始就考慮頁面的 `img-src` 政策。

**內嵌的圖片（`data:` URI）**只需要：

```
img-src 'self' data:
```

作為 HTTP 回應標頭：

```
Content-Security-Policy: img-src 'self' data:
```

或作為代管該 SVG 之頁面中的 meta 標籤：

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

這相當嚴格——絕不會連線到任何外部圖片主機，因為位元組
已經嵌入在 SVG 字串中。

相對地，**自行代管的圖片（上述選項 1）**則需要顯示環境
從這些圖片實際所在之處擷取。如果使用者提供的圖可以
參照任意的 `image=` URL，要把每一個可能的主機都列入允許清單
通常並不可行，因此遊樂場／嵌入頁可能需要較寬鬆的設定：

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
切勿將 `img-src *`（或任何同樣寬鬆的 `img-src`）設為您**整個網站**的
預設值。請將它限定在確實需要轉譯
任意使用者提供之圖的那個遊樂場／嵌入頁，把它視為只針對該頁面、
經過刻意並有文件記載的放寬，並讓其他每個頁面的 CSP 保持
嚴格。寬鬆的 `img-src` 會讓惡意的圖透過圖片 URL 側通道外洩資料
（例如將資料編碼在對攻擊者控制之主機的查詢參數中），
或載入不良的遠端內容。如果圖片集由您掌控，請改為優先採用內嵌（`data:`），
並在各處維持 `img-src 'self'
data:`。
:::

## 缺少的圖片 {#missing-images}

如果 `setImageSizer` 對某個被參照的來源回傳 `null`（或未註冊任何
尺寸取得器），@knowvah/dot-engine 會走與原生 Graphviz `gvusershape`
未命中時相同、忠於 C 版的路徑：它會發出警告，並將圖片視為
**尺寸為零**，這會影響圍繞它所計算出的節點方框版面配置。
如果用到了 `setImageResolver`/`inlineImages` 而解析器未命中，
輸出器會退回直接傳遞原始 `src`，而不是內嵌——`href`
仍會被寫出，只是除非頁面上有其他東西能擷取它，否則無法解析。
關於圖片／點陣圖處理整體而言哪些在範圍內、哪些不在，請參閱
[已知差異](/zh-tw/divergences)。
