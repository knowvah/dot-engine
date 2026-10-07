---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API referansı

Herkese açık yüzey bilinçli olarak küçük tutulmuştur. Çoğu çağıranın yalnızca
`renderSvg` işlevine ihtiyacı vardır. Hangi giriş noktasının kullanılacağı için
[Genel bakış](/tr/guide/overview), her işlevin tükettiği ve döndürdüğü yapılar
için [Türler](/tr/guide/types), ayrıntılı imzalar, her alan ve her aşırı
yükleme için ise oluşturulan [Referans](/reference/) bölümüne bakın.

> Tür bildirimleri (`.d.ts`) `npm run build` ile üretilir (`build:types` adımı
> `tsc -p tsconfig.build.json` komutunu çalıştırır). `package.json` içindeki
> `exports` eşlemesi her giriş için `types` koşullarını bağlar; böylece
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` ve
> `@knowvah/dot-engine/render` türleri düzenleyicilerde ve aşağı akış
> derlemelerinde çözümlenir.
>
> Derleme ayrıca bildirim haritalarını (`.d.ts.map`) ve JS kaynak haritalarını
> da üretir ve paket `src/` kaynaklarını da içerir — böylece "tanıma git"
> doğrudan gerçek TypeScript koduna atlar; kodu okumayı ve bir PR açmayı
> kolaylaştırır.

Bu sayfa üç giriş noktasına göre düzenlenmiştir (her birine ne zaman
başvurulacağını [Genel bakış](/tr/guide/overview) anlatır): kök
`@knowvah/dot-engine` paketi (tek çağrıda ayrıştırma + işleme ve süreç genelinde
yapılandırma), `@knowvah/dot-engine/api` (kodla graf oluşturma, hesaplanan
geometriyi geri okuma) ve `@knowvah/dot-engine/render` (çok biçimli çıktı ve ham
çizim işlemleri). Aşağıdaki her işlev kök pakette de yeniden dışa aktarılır
(`src/index.ts` içinde `export * from './api/index.js'` /
`export * from './render/index.js'`) — her şeyi `@knowvah/dot-engine` üzerinden
içe aktarmak çalışır, ancak alt yol içe aktarmaları hangi katmana dokunduğunuz
konusunda daha açıktır.

## `@knowvah/dot-engine` (kök)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

DOT kaynağını ayrıştırır, adı verilen [yerleşim motorunu](/tr/guide/engines)
çalıştırır, SVG'ye işler ve SVG dizesini döndürür. Bu, tek çağrılık kolaylık
sarmalayıcısıdır: bir `GvcContext` oluşturur, sekiz yerleşik motoru ve SVG
işleyicisini kaydeder, yerleştirir, işler ve yerleşimi serbest bırakır — bu
adımların ayrı olması gerekiyorsa aşağıdaki
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) bölümüne
bakın.

- **`dotSource`** — DOT dilinde graf kaynağı.
- **`engine`** — `EngineName`: yerleşik motorlardan biri (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) veya özel olarak kaydedilmiş
  herhangi bir ad.
- **Fırlatır:** girdideki her sorun için bir `DotEngineError`: `dotSource`
  geçersizse `ParseError`, yerleşim veya işleme başarısız olursa `RenderError`,
  bir dot-engine hatası için (`cause` ile) `InternalError`. `dotSource` veya
  `engine` geçersizse (kayıtlı olmayan bir motor adı dahil) `code` değeri
  `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` olan bir `TypeError`. Bkz.
  [Hatalar ve istisnalar](/tr/guide/errors).

Tam imza, JSDoc ve `GvError` alan listesi: [Referans](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg`'nin sonuç tarzındaki kardeşi. Her DOT girdisi için döndürür
(asla fırlatmaz): başarıda `{ svg }`, ilk başarısızlıkta `{ errors: [one] }`;
`svg` ve `errors` birbirini dışlar. Yalnızca geçersiz argümanlar için fırlatır
(`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). `errors`
içindeki her girdi düz, JSON'a dönüştürülebilir veridir (`type`, `code`,
`message`, `friendlyMessage`, ayrıca varsa `location` / `expected`; `cause` ve
yığın izi yok); bu yüzden bir worker/postMessage sınırı üzerinden göndermek veya
bir günlüğe serileştirmek güvenlidir. Çağıran bir istisna yakalamak yerine
`code` / `type` değerine göre dallanmak istediğinde `renderSvg` + `try`/`catch`
yerine bunu tercih edin. Bkz. [Hatalar ve istisnalar](/tr/guide/errors).
[Referans](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

DOT'u, yerleştirmeden, bellek içi graf modeline ayrıştırır. Grafı incelemek ya
da dönüştürmek — veya işlemeden önce `@knowvah/dot-engine/api`'nin `getLayout` /
`@knowvah/dot-engine/render`'ın `render` işlevine vermek — için kullanışlıdır.

- **Fırlatır:** sözdizimi hataları veya kenar yönü ihlalleri için `ParseError`
  (ör. yönsüz bir grafta `->`). `ParseError`, `DotEngineError` sınıfını
  genişletir ve `GvError` yapısını `type: 'syntax'` ile uygular;
  `location: { line, column, offset? }` taşır. `dotSource` bir dize değilse
  `TypeError` `ERR_INVALID_ARG_TYPE`. [Hatalar ve istisnalar](/tr/guide/errors),
  [Referans](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError`, dot-engine'in bu girdide başarısız olduğu anlamına
gelir. `RenderError` bilinen yerleşim/işleme hatalarını kapsar (`UNKNOWN_LAYOUT`
ve `UNSUPPORTED_FEATURE` için `type` değeri `semantic` olur). `InternalError`
bir dot-engine hatasıdır; `cause`, bir hata sarılmışsa özgün hatayı tutar.
Çağıran hataları bunun yerine `code` içeren standart bir `TypeError` /
`RangeError` / `Error` fırlatır. `isGvError`, dize türünde `type` ve `code`
değerlerini denetler; bu yüzden yinelenen paketler arasında çalışır. Her kod ve
her işlevin neler fırlatabileceği için [Hatalar ve istisnalar](/tr/guide/errors),
`GvError` yapısı için [Türler](/tr/guide/types), `GvErrorCode` üye listesi için
[Referans](/reference/) bölümüne bakın.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Yerleşim sırasında etiketleri boyutlandırmak için başvurulan, süreç genelindeki
metin ölçeri kaydeder (veya `null` ile temizler). Temizlemek, kitaplık
varsayılanına geri döner (tarayıcı: `CanvasTextMeasurer`; başsız/Node:
`EstimateTextMeasurer`, bir LUT ölçeri bağlanmamışsa — tam çözümleme sırası ve
bu işlevlerle birlikte dışa aktarılan `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` uygulamaları için bkz.
[Metin ölçümü](/tr/guide/text-measurement)).
[Referans](/reference/).

### `setImageSizer` / `setImageResolver`

İlişkili ama ayrı iki görsel yapılandırma genişletme noktası — ikisi de aynı
deseni yansıtan, süreç genelinde kayıt defterleridir (bir geri çağırma kaydedin,
temizlemek için `null` verin) ve bir çağıran birini kaydedene kadar ikisi de
etkisizdir:

- **`setImageSizer`** — yerleşim motorunun, işlemeden önce bir HTML `<IMG>`
  hücresi veya bir düğüm `image=` özniteliği için yer ayırabilmesi amacıyla,
  harici bir görselin *iç boyutlarını* bildirir. `null` döndürmek (veya hiçbir
  boyutlandırıcı kaydetmemek) yerel Graphviz'in eksik görsel davranışını üretir:
  bir uyarı ve sıfır boyut.
- **`setImageResolver`** (yeni — aşağıdaki [`inlineImages`](#inlineimages)
  bölümüne bakın) — SVG işleyicisinin görselleri `xlink:href="src"` değerini
  ham geçirmek yerine `data:` URI olarak satır içine yerleştirebilmesi için
  gerçek görsel *baytlarını* sağlar.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver`, yalın bir `Uint8Array` döndürebilir (MIME, `src` dosya
uzantısından çıkarılır — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; başka
her şey `application/octet-stream` değerine düşer) veya MIME türünü açıkça
ayarlamak için `{ bytes, mime }` döndürebilir. `src` çözümlenemiyorsa `null`
döndürün — işleyici, hiçbir çözümleyici kayıtlı değilmiş gibi ham `src`
geçirmeye geri döner. Bir çözümleyici kaydetmek tek başına bir etki yaratmaz;
yalnızca `render`'ın `inlineImages` seçeneği `true` olduğunda başvurulur
(aşağıda). Çalışılmış bir örnek için [Görsellerle çalışma](/tr/guide/images),
her iki geri çağırma türü için [Referans](/reference/) bölümüne bakın.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync`, `renderSvg`'nin eşzamansız karşılığıdır: grafın ihtiyaç
duyduğu web yazı tiplerini ve görsel verisini önceden getirir, ardından
yerleştirir ve işler. `renderSvgInto`, `id` kimlikli öğenin alt öğelerini işler
ve değiştirir; SVG'yi varsayılan olarak temizler (`trusted: true` bunu atlar;
`sanitize` yerleşik temizleyicinin yerini alır). Hatalı argümanlar dahil
başarısızlıklar, `renderSvg` ile aynı hata sınıflarıyla promise reddi olarak
gelir; eksik bir öğe kimliği `ERR_INVALID_ARG_VALUE` ile reddedilir. Yazı tipi
sorunları asla reddetmez; `fontIssues` içinde döner. Bkz.
[Tarayıcıda kullanım](/tr/guide/browser) ve
[Görsellerle çalışma](/tr/guide/images), ayrıca [Referans](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Yerleşimi ve işlemeyi ayrı adımlar olarak yürütmesi gereken çağıranlar için
alt düzey düzenleme. `renderSvg` tam olarak bunun üzerindeki bir kolaylık
sarmalayıcısıdır: bir bağlam oluştur, motorları/işleyicileri kaydet, `layout`,
`renderWithContext`, `freeLayout`. Bunlara yalnızca bu denetime ihtiyaç
duyduğunuzda doğrudan başvurun — örneğin motorların bir alt kümesini kaydetmek,
özel bir `LayoutEngine` veya `RendererPlugin` eklemek ya da aynı yerleştirilmiş
grafı yerleşimi yeniden çalıştırmadan birden çok biçime işlemek için (bir kez
`layout`, ardından her biçim için `renderWithContext`, sonra `freeLayout`
çağırın). [Referans](/reference/).

## `@knowvah/dot-engine/api`

Programatik oluşturma, güvenli kenar ekleme ve hesaplanan geometrinin okunması
— DOT metnini elle yazmadan graf oluşturmak ve yerleşimini düz veri olarak geri
okumak için katman. `LayoutSnapshot` ve iç içe yapıları için
[Türler](/tr/guide/types) sayfasına bakın.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

`render` / `getLayout` / `getDrawOps` işlevlerine devredilmeye hazır yeni bir
graf oluşturur. Varsayılanlar: `directed: true`, `strict: false`, `name: ''`.
Bir `GvGraphBuilder` döndürür — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (HTML tablo etiketleri için) ve opak `Graph`
tutamacını sunan bir `.graph` özelliği. Bkz.
[Kodla graf oluşturma](/tr/guide/build-a-graph) ve tam
`GvGraphBuilder`/`GvNode`/`GvEdge` arayüzleri için [Referans](/reference/).

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

`GvGraphBuilder.addEdge` altında yatan alt düzey kenar ekleme yardımcısı —
oluşturucunun opak `GvNode`/`GvEdge` tutamaçları yerine dahili `Node`/`Edge`
referanslarıyla çalışan çağıranlar için (ör. `parse()` ile döndürülen bir grafa
eklenen kenarlar) doğrudan dışa aktarılır. Çoğu çağıran bunun yerine
`createGraph(...).addEdge(tail, head, attrs?)` kullanmalıdır.

- **`name`** — kenar anahtarı; varsayılanı `''` (adsız). Yalnızca `(tail, head)`
  üzerinden eşleşen strict graf yinelenenleri elemesinde yok sayılır (yönsüz
  graflar için simetrik).
- **Döndürür:** yeni kenarı ya da `g` strict ise ve bir `(tail, head)` kenarı
  zaten varsa var olanı (`agedge`'in `cflag=1` ile davranışını yansıtır).

Bkz. [Kodla graf oluşturma](/tr/guide/build-a-graph) ve
[Referans](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Grafın hesaplanmış geometrisinin düz, JSON'a dönüştürülebilir bir anlık
görüntüsünü döndürür — düğüm konumları, kenar spline kontrol noktaları, kenar
etiketleri, küme sınırlayıcı kutuları ve genel graf sınırları — hepsi punto
cinsinden.

- **`g`** — önceden yerleştirilmiş olmalıdır (`render(g, ...)`,
  `getDrawOps(g)` veya `ctx.layout(g, engine)` ile); henüz yerleştirilmemiş bir
  grafta `getLayout` çağırmak, sessizce tamamı sıfır geometri döndürmek yerine
  fırlatır.
- **`opts.yAxis`** — varsayılan `'down'`: ekran koordinatları, orijin sol üst,
  y aşağı doğru artar ve `bounds` `(0, 0)` noktasına normalleştirilir. `'up'`,
  yerel Graphviz koordinatlarını (orijin sol alt, y yukarı doğru artar),
  `bounds.x`/`bounds.y` ham sol alt köşede olacak şekilde döndürür.
- **Fırlatır:** `g` yerleştirilmemişse `code` değeri `ERR_INVALID_STATE` olan
  `Error`; hatalı `g` veya `opts` için `TypeError` `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE`. Bkz. [Hatalar ve istisnalar](/tr/guide/errors).

Düğüm `width`/`height` değerleri puntoya dönüştürülür (dahili model inç
saklar); diğer tüm koordinatlar zaten puntodur. Koordinat sistemi anlatımı için
[Hesaplanan geometriyi okuma](/tr/guide/geometry), tam `LayoutSnapshot`,
`NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` ve `BoundsGeometry` alan
listeleri için [Türler](/tr/guide/types) / [Referans](/reference/) bölümüne
bakın.

### `Graph`

Dahili modelden yeniden dışa aktarılan opak tutamaç türü. Yalnızca *tür*
açığa çıkarılır (değiştirilebilir sınıf değil) — bir oluşturucunun `.graph`
değerini veya bir `parse()` sonucunu tutan bir değişkeni bununla ek açıklayın,
ancak alanlarını doğrudan oluşturmayın veya incelemeyin; durumu geri okumak
için oluşturucuyu, `getLayout` veya `getDrawOps` işlevini kullanın.
[Referans](/reference/).

## `@knowvah/dot-engine/render`

Çok biçimli çıktı ve ham çizim işlemi erişimi — önceden `parse` edilmiş veya
oluşturucuyla kurulmuş bir grafı işlemek için katman.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Bir grafı yerleştirir ve istenen biçimdeki dizeye işler.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — yerleşim motoru (varsayılan `'dot'`).
- **`opts.inlineImages`** — bkz. [aşağıda](#inlineimages).
- **Fırlatır:** yerleşim veya işleme hatasında `RenderError`; bir dot-engine
  hatasında `InternalError`; geçersiz argümanlar için (kayıtlı olmayan bir motor
  veya biçim dahil) `code` içeren bir `TypeError`. Bkz.
  [Hatalar ve istisnalar](/tr/guide/errors).

`opts.engine`, `renderSvg`'nin `engine` parametresini yansıtır; `format`,
`renderSvg`'nin sunmadığı eksendir (`renderSvg` `'svg'` değerine sabitlenmiştir).
Tam `OutputFormat` birleşimi ve `RenderOptions` yapısı için bkz.
[Diğer biçimlere işleme](/tr/guide/render-formats) ve
[Referans](/reference/).

#### `inlineImages`

`RenderOptions.inlineImages` (varsayılan `false`), harici görselleri ham
`xlink:href="src"` geçirmesi yerine `data:` URI olarak satır içine yerleştirir.
`setImageResolver` ile (yukarıda) bir çözümleyici kaydedilmedikçe etkisizdir —
ve SVG olmayan biçimler üzerinde de etkisizdir. Ayarlanmadığında çıktı, bu
seçenek var olmadan önceki çıktıyla bayt bayt aynıdır.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Tarayıcıda `fetch` ile ve Node'da dosya sisteminden çözümleme dahil tam kılavuz
için [Görsellerle çalışma](/tr/guide/images) sayfasına bakın.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

`render`'ın eşzamansız karşılığı: aynı biçimler ve `engine`/`inlineImages`
seçenekleri, ayrıca çağrı başına eşzamansız görsel kancaları ve yazı tipi
önceden getirme. Her görsel kancası her ayrı `src` için en fazla bir kez
çalışır; bir throw veya reject bir ıskalama sayılır. Çıktı, işaretleme
biçimleri için temizlenmemiş işaretlemedir; bkz. README "Security" bölümü.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

`g` grafını yerleştirir, xdot'a işler ve düz, türlendirilmiş bir çizim işlemi
dizisi döndürür — düğüm şekilleri, metin aralıkları, renkler ve yazı tipleri
ayrık birleşim değerleri olarak (bir `switch` içinde `op.kind` üzerinden
daraltın) — SVG'ye veya xdot'un dize kodlamasına dokunmadan özel bir
canvas/WebGL/PDF işleyicisini beslemek için. `opts.engine` varsayılan olarak
`DEFAULT_DRAW_ENGINE` (`'dot'`) değerini alır.

- **Fırlatır:** ara xdot çıktısı yeniden ayrıştırılamazsa `ParseError` (bir
  dot-engine hatası; pratikte beklenmez); yerleşim/işleme hatasında
  `RenderError`; diğer her dot-engine hatasında `InternalError`; geçersiz
  argümanlar için `code` içeren bir `TypeError`. Bkz.
  [Hatalar ve istisnalar](/tr/guide/errors).

İşlem türü listesi ve çalışılmış bir canvas örneği için
[xdot çizim işlemleriyle özel işleme](/tr/guide/xdot-drawops), tam `XdotOp`
birleşimi ve `Xdot`/`XdotColor` yapıları için [Türler](/tr/guide/types) /
[Referans](/reference/) bölümüne bakın.
