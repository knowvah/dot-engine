---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# 使用图像

带有 `image="logo.png"` 的节点（或类 HTML 标签中的 `<IMG SRC="logo.png">` 单元格）
默认不会嵌入其像素数据。@knowvah/dot-engine 会**原样**输出该来源：

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

无论由谁来显示该 SVG——浏览器的 `<img>`/内联 `<svg>`、Electron 外壳、静态站点构建——
都由它自己去解析这个 `href`。本页介绍布局期间如何确定该 href 的尺寸、
让像素真正显示出来的三种方式，以及每种方式对 CSP 的影响。

## 图像如何流转

1. 图在节点上声明 `image="logo.png"`，或者类 HTML 标签中包含一个 `<IMG>` 单元格。
2. 对于类 HTML 的 `<IMG>` 单元格，Graphviz 需要先知道图像的**固有宽度/高度**才能确定单元格大小，
   然后才能布局其他内容——库绝不会访问文件系统或网络来获知这一点，
   因此需要您注册一个尺寸器（`setImageSizer`，在[在浏览器中使用](/zh-cn/guide/browser)中介绍，
   下文也会针对 Node 再次说明）。节点的 `image=` 属性**不会**由尺寸器确定尺寸：
   与无头原生 Graphviz 一样，节点保持其正常的方框，图像被绘制在其中。
3. 布局使用您的尺寸器为每个 `<IMG>` 返回的尺寸运行。
4. SVG 输出器（`src/render/svg.ts` 的 `usershape()`）写出 `<image xlink:href="...">`，
   其方框由第 3 步计算得出。默认情况下，`href` 就是原始的 `src` 字符串，经过 XML 转义，别无其他。
5. 可选地——如果您调用了 `setImageResolver` 并使用 `{ inlineImages: true }` 渲染——
   输出器会改为写出 `xlink:href="data:<mime>;base64,<bytes>"`，即自包含的 `data:` URI。
   这是附加功能；原生 Graphviz 并不这样做。

确定尺寸与内联是两个相互独立、分别注册的替换点：您可以只确定图像尺寸而不内联
（常见情形——托管文件），也可以两者都做（自包含的 SVG）。

## 在 Node 与浏览器中确定尺寸

`setImageSizer` 接受 `(src: string) => { w: number; h: number } | null`，
在布局期间对每个不同的 `image=`/`<IMG>` 来源只调用一次。它是进程级的全局注册，
与下文的 `setImageResolver` 模式相同——请在 `render()`/`renderSvg()` 之前调用一次。

**浏览器**——测量真实图像，因为您已经有了 `Image` 和 `decode()`：

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

`setImageSizer` 是同步回调——其内部没有 `await`——因此浏览器路径要在布局运行之前，
先把尺寸（通过 `decode()`）预先解析到缓存中，然后再同步读取该缓存。

**Node**——没有 DOM 的 `Image`，库也不会替您读取文件系统。要么硬编码已知的尺寸，
要么自行读取（例如从清单文件，或您提供的轻量级 PNG/JPEG 头解析器），并以同样的方式传入结果：

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

如果您的图从不引用外部图像，请完全跳过这一步。

## 异步尺寸器与解析器（按次渲染）

`setImageSizer` / `setImageResolver` 是同步的、进程级的全局注册，因此上面的浏览器模式必须预热缓存。
异步入口点则**按调用**接收这些钩子，并为您等待它们：

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

- 每个钩子对每个不同的 `src` **至多调用一次**，并行执行，在布局开始之前完成。
  随后引擎针对收集到的结果运行其常规的同步布局。
- **抛出异常或被拒绝**的钩子会被视为未命中（`null`），与同步钩子返回 `null` 完全一样：
  对尺寸器而言是零尺寸，对解析器而言是原始 `src` 直通。
- 给定异步钩子时，未命中**不会**回退到全局的 `setImageSizer` / `setImageResolver`。
  未给定时，则像在 `renderSvg` 中一样使用全局钩子。
- 这些钩子仅作用于那一次渲染；不会注册任何全局内容。
- 只有当 `inlineImages` 为 `true` 时才会调用 `imageResolver`。
- `renderSvgInto` 接受相同的选项。

## 让图像显示出来

确定尺寸能让布局正确；但它并不能让像素在 SVG 最终显示的任何地方都显示出来。请从三种方式中选择一种。

### 1. 托管文件

将图像放在浏览器/使用方可以获取的 URL（或相对于 SVG 显示位置的路径）上提供服务。
这是最简单的选项，不需要额外的渲染时工作——但显示环境必须能够访问该来源，
而且如果 SVG 显示在带有严格 `img-src` CSP 的地方，该来源也必须在那里加入允许列表（见下文）。

### 2. 内联为 `data:` URI

使用 T1 的内联 API 生成一个完全不需要外部获取的自包含 SVG 字符串：
`setImageResolver` 提供原始字节，`render(g, 'svg', { inlineImages: true })` 将其嵌入。

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

当您想显式指定 MIME 类型时，`ImageResolver` 也可以返回 `{ bytes: Uint8Array; mime?: string }`
（否则输出器会根据来源的文件扩展名推断——`.png` → `image/png`，`.svg` → `image/svg+xml`，
以此类推，未知扩展名回退到 `application/octet-stream`）。
调用 `setImageResolver(null)` 可清除该注册。

::: tip
当 SVG 要传送到在显示时无法获取外部资源的地方——电子邮件客户端、离线文档、严格 CSP 的嵌入页面，
或任何您希望得到一个无需后续网络请求的自包含字符串的地方——请优先选择内联。
代价是输出体积：base64 会使图像膨胀约 33%，并且会被复制到每个引用它的 SVG 中
（跨多次渲染无法复用浏览器缓存）。
:::

`inlineImages` 默认为 `false`；不设置时，输出与引入内联功能之前的直通方式逐字节相同。
它只影响 `svg` 格式——对 `json`/`xdot`/`dot`/其他文本格式没有任何影响。
未命中（没有注册解析器，或解析器对该 `src` 返回 `null`）会自动回退到原始 `src` 直通——
内联会平滑降级，绝不会抛出异常。

### 3. `imagepath` 式的基础目录

原生 Graphviz 的 `imagepath` 图属性告诉 C 二进制文件使用一个文件系统/`GDFONTPATH` 风格的搜索目录，
来解析相对的 `image=` 值。@knowvah/dot-engine 没有实现 `imagepath`——该移植版自身从不从磁盘读取图像数据，
因此没有可供解析的路径（完整的范围边界请参阅[已知差异](/zh-cn/divergences)）。
如果您的图使用相对的 `image=` 路径，请在构造 DOT 源代码的那一层，
或在您的 `setImageSizer`/`ImageResolver` 回调中，针对您自己的基础目录/URL 来解析它们——
两者收到的都是图中所写的原始 `src` 字符串，因此在查找之前先给它加上基础路径前缀，
是一种正常的、受认可的模式。

## CSP 指南

如果您的图由用户提供（演练场、渲染任意 DOT 的嵌入页面），请预先考虑页面的 `img-src` 策略。

**内嵌图像（`data:` URI）** 只需要：

```
img-src 'self' data:
```

作为 HTTP 响应头：

```
Content-Security-Policy: img-src 'self' data:
```

或作为承载该 SVG 的页面中的 meta 标签：

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

这已经很严格了——绝不会联系任何外部图像主机，因为字节已经嵌入在 SVG 字符串中。

相比之下，**托管图像（上文选项 1）** 需要显示环境从这些图像实际所在的位置获取它们。
如果用户提供的图可以引用任意的 `image=` URL，把每个可能的主机都加入允许列表往往不切实际，
因此演练场/嵌入页面可能需要较为宽松的设置：

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
切勿把 `img-src *`（或任何同样宽松的 `img-src`）作为您的**全站**默认值。
请将其限定在确实需要渲染任意用户提供的图的那个演练场/嵌入页面上，
把它视为仅针对该页面的、有意而为且有文档记录的放宽，并让其他每个页面的 CSP 保持严格。
宽松的 `img-src` 会让恶意的图通过图像 URL 旁路泄露数据
（例如把数据编码进指向攻击者控制的主机的查询参数中），或加载不良的远程内容。
如果您能控制图像集合，请优先选择内联（`data:`），并在所有地方保持 `img-src 'self'
data:`。
:::

## 缺失的图像

如果 `setImageSizer` 对某个被引用的来源返回 `null`（或没有注册尺寸器），
@knowvah/dot-engine 会遵循与原生 Graphviz 的 `gvusershape` 未命中相同、忠实于 C 的路径：
发出警告，并将该图像视为**零尺寸**，这会影响围绕它计算出的节点方框布局。
如果涉及 `setImageResolver`/`inlineImages` 且解析器未命中，输出器会回退到原始 `src` 直通而不是内联——
`href` 仍然会被写出，只是除非页面上的其他东西能够获取它，否则无法解析。
关于图像/位图处理总体上哪些在范围之内、哪些不在，请参阅[已知差异](/zh-cn/divergences)。
