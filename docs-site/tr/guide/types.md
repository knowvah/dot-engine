---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Türler referansı

Herkese açık türlerin, nereden elde edildiklerine göre gruplanmış kavramsal
haritası: `createGraph`/`parse` (oluştur + incele), `getLayout` (geometri anlık
görüntüsü), `render`/`getDrawOps` (çıktı) ve kök paket (motorlar, görseller,
metin ölçümü, hatalar). Her girdi, kaynaktan kopyalanmış bir yapı bloğunu ve
tek satırlık bir amacı gösterir. Tüm alanların tek tek belgelenmesi (devralınan
üyeler ve her özellikteki JSDoc dahil) için oluşturulan
[TypeDoc referansı](/reference/) sayfasına bakın.

Bu sayfa koordinat çerçevesi anlatımını yinelemez — bunun için
[Hesaplanan geometriyi okuma](/tr/guide/geometry) sayfasına bakın. Alanları
çerçeveye bağlı olan her türde y ekseni notunu kısaca yeniden belirtir.

## Oluştur + incele (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Dahili graf modeline opak bir tutamaç. `parse()` ve `createGraph().graph`
tarafından döndürülür. `render`, `getLayout` ve `getDrawOps` işlevlerine
geçirin; doğrudan oluşturmayın veya incelemeyin — bir tane üretmenin desteklenen
tek yolu oluşturucu ve ayrıştırıcıdır.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph` için seçenekler. `directed`/`strict`, dört `GraphKind` türünden
birini seçer (yönlü, yönsüz, strict yönlü, strict yönsüz); `name` grafın adını
ayarlar (varsayılan `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addNode(...)` tarafından döndürülen bir graf düğümü için opak
tutamaç. `setHtmlAttr`, değeri HTML benzeri bir etiket olarak işaretler (DOT
metnindeki `label=<...>` ile eşdeğer) ve böylece yerleşim motoru onu işaretleme
olarak ölçer.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

`builder.addEdge(...)` tarafından döndürülen bir graf kenarı için opak
tutamaç.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

`createGraph(...)` tarafından döndürülür. `addSubgraph`, o alt grafa kapsamlı
iç içe bir oluşturucu döndürür; onun aracılığıyla eklenen düğümler kök grafın
da üyesidir. `.graph`, `render`/`getLayout`/`getDrawOps` işlevlerine devir
noktasıdır. Bkz. [Kodla graf oluşturma](/tr/guide/build-a-graph).

## Geometri anlık görüntüsü (`getLayout`)

::: tip Koordinat çerçevesi
Yerel graphviz koordinatlarında y ekseni yukarı doğrudur (orijin sol alt).
`getLayout` varsayılan olarak `yAxis: 'down'` kullanır (orijin sol üst, ekran
geleneği) ve her y koordinatını çevirir; yerel graphviz koordinatları için
`{ yAxis: 'up' }` geçirin. Tam anlatım:
[Hesaplanan geometriyi okuma](/tr/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout` için seçenekler. Varsayılan `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

`getLayout(g, opts?)` tarafından döndürülen, bir grafın hesaplanmış geometrisinin
düz, JSON'a dönüştürülebilir anlık görüntüsü. `clusters`, her küme alt grafını
özyinelemeli olarak listeler (iç içe kümelerin her biri kendi girdisini alır);
kümesiz graflarda boştur.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Punto cinsinden genel sınırlayıcı kutu. `yAxis: 'down'` ile `x`/`y`,
`(0, 0)` noktasına normalleştirilir. `yAxis: 'up'` ile `x`/`y`, graf sınırlayıcı
kutusunun ham sol alt köşesidir.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Düğüm başına geometri. `x`/`y` düğüm merkezidir. `width`/`height` **punto**
cinsindendir — model bunları inç olarak saklar (`ND_width`/`ND_height`);
`getLayout` döndürmeden önce 72 ile çarpar.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Kenar başına geometri. `points`, yönlendirilmiş spline'ın her bezier kontrol
noktasını sırayla art arda ekler (kenarın yönlendirilmiş bir spline'ı yoksa
boştur). `label` yalnızca kenar bir merkez etiketi taşıdığında bulunur.

`tailLabel` ve `headLabel`, `taillabel`/`headlabel` port etiketi konumlarıdır.
Her biri yalnızca yerleşim onu yerleştirdiğinde bulunur — `render()` kendi
`<text>` öğesini yayımladığında geçerli olan koşulun aynısı — dolayısıyla
yerleştirilemeyen bir port etiketi (örneğin yönlendirilmiş spline'ı olmayan bir
kenar) başlangıç noktasında bir etiket olarak değil, yok olarak bildirilir.

`xlabel`, `xlabel` dış etiketinin konumudur. `label`'dan farklı olarak,
graphviz'in kenar çevresindeki aday konumlar üzerindeki kuvvet yerleştirme
araması tarafından seçilir; bu yüzden `label` değerinden veya spline orta
noktasından türetilemez. Aynı yalnızca-yerleştirilmişse kapısını taşır:
aramanın sığdıramadığı bildirilmiş bir xlabel, tıpkı `render()`'ın onu çizmeyi
reddetmesi gibi yok olarak bildirilir.

`sp` ve `ep`, kuyruk ve baş uçlarındaki ok bağlanma noktalarıdır. Bir uçta ok
bulunduğunda spline, ok için yer bırakmak üzere kısaltılır ve ok son kontrol
noktasından bu noktaya kadar uzanır — böylece kendi ok uçlarını çizen bir
tüketici ucu tahmin etmek yerine buradan okur. Her biri yalnızca o uçta gerçekten
bir ok bulunduğunda vardır; bu yüzden düz bir `digraph { a -> b }` kenarı `ep`
bildirir ve `sp` bildirmez, `arrowhead=none` ise ikisini de bildirmez.

Bunlar düğüm sınırındaki bağlanma noktalarıdır. Graphviz'in kendi işleyicisi,
çizdiği ok çokgenini bunlardan çizgi kalınlığına bağlı bir miktar içeri alır;
bu yüzden `ep`, bir okun *çizileceği* noktadır, işlenmiş ucun bir kopyası
değildir.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Küme başına sınırlayıcı kutu. `name`, küme alt grafının adıdır (ör.
`cluster6`); iç içe kümeler hiyerarşilerini ad içinde kodlar, bu yüzden açık bir
üst bağlantısı sunulmaz. `BoundsGeometry` ile aynı çerçeve geleneğini izler.

`label`, küme başlığının yerleşimidir ve yalnızca küme bir başlık bildirdiğinde
bulunur. `x`/`y` değerleri etiket alanının **merkezidir** — yukarıdaki kutu
köşesi `x`/`y` değerlerine değil, `EdgeGeometry.label` değerine uygun — ve
`width`/`height` ölçülen metin boyutudur; yani etiket kutusu
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` aralığıdır ve her
zaman küme kutusunun içinde kalır. Bunun etiket *merkezi* olduğunu, `render()`'ın
yaydığı `<text>` öğesinin ise daha aşağıda duran taban çizgisini taşıdığını
unutmayın.

## İşleme (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

`render(g, format, opts?)` tarafından kabul edilen biçimlerin kapalı birleşimi.
Bkz. [Diğer biçimlere işleme](/tr/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render` için seçenekler. `engine` varsayılan olarak `'dot'` değerini alır.
`inlineImages` (yeni) varsayılan olarak `false` değerindedir; `true` olduğunda
SVG yayıcısı, `setImageResolver` ile kaydedilmiş çözümleyiciye başvurarak harici
görselleri (`image=`/HTML `<IMG>`) `data:` URI olarak satır içine yerleştirir —
çözümleyicinin ıskalaması veya kayıt yokluğu, ham `src` geçirmesine geri döner.
SVG olmayan biçimler üzerinde etkisizdir. Bkz.
[Görsellerle çalışma](/tr/guide/images).

::: warning `yAxis` bir `RenderOptions` alanı değildir
Koordinat yönelimi yalnızca `getLayout` ile ilgilidir. `render` tarafından
üretilen ham biçim dizeleri yerel, y ekseni yukarı olan koordinatlar taşır;
y ekseninin aşağı olmasını istiyor ve `getLayout` üzerinden geçmiyorsanız son
işlemede çevirin.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps` için seçenekler. `engine` varsayılan olarak `'dot'` değerini alır.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Bir xdot öznitelik akışının ayrıştırılmış sonucu: çözülmüş çizim işlemi dizisi
artı bir ayrıştırma durumu bayrak bit maskesi. `getDrawOps`, grafın her çizim
özniteliği üzerinden, boyama sırasıyla (graf → düğüm → kenar) yalnızca
düzleştirilmiş `XdotOp[]` değerini döndürür — tam işlem türü tablosu ve canvas
örneği için bkz. [xdot çizim işlemleriyle özel işleme](/tr/guide/xdot-drawops).

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Çözülmüş tek bir xdot çizim işlemi; `kind` ile ayrışır. Her varyant, şeklinin
adını taşıyan tek bir yük özelliği taşır — güvenle erişmek için bir `switch`
içinde `kind` üzerinden daraltın. Koordinatlar punto cinsindendir, yerel y
ekseni yukarı olan çerçevededir (y ekseni aşağı olan bir canvas için çevirin —
yukarıdaki bağlantılı kılavuza bakın).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Çözülmüş bir xdot dolgu/çizgi rengi: düz bir renk ya da doğrusal/dairesel bir
degrade (`XdotLinearGrad`/`XdotRadialGrad` her biri `x0,y0,x1,y1[,r0,r1]` ve
bir `stops: { frac: number; color: string }[]` dizisi taşır).

## Kök paket (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Bir yerleşim motoru adı. Kayıt defteri açıktır (özel motorlar bir `GvcContext`
üzerinde kaydedilebilir), bu yüzden her dize kabul edilir; `(string & {})`,
kümeyi kapatmadan yerleşik motorlar için düzenleyici otomatik tamamlamasını
korur. Bkz. [Yerleşim motorları](/tr/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

`image=` veya bir HTML `<IMG>` hücresi tarafından başvurulan harici bir görselin
iç boyutlarını döndüren, yerleşim boyutlandırması için bir geri çağırma kaydeder.
Boyut bilinmiyorsa `null` döndürün (C'nin eksik görsel davranışıyla eşleşir —
sıfır boyutlu bir hücre artı bir uyarı). Önceden ayarlanmış bir boyutlandırıcıyı
temizlemek için `setImageSizer`'a `null` geçirin. Bkz.
[Tarayıcıda kullanım](/tr/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Harici bir görselin ham baytlarını döndüren, `RenderOptions.inlineImages`
`true` olduğunda başvurulan bir geri çağırma kaydeder. Yalın bir `Uint8Array`
dönüşü, MIME türünü `src` dosya uzantısından çıkarır. `null` (çözümleyiciden ya
da hiçbir çözümleyici kayıtlı olmamasından) ham `src` geçirmesine geri döner.
Bkz. [Görsellerle çalışma](/tr/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

`setTextMeasurer` ile kurulan takılabilir metin ölçümü (üç yerleşik ölçer
gelir: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout`, isteğe bağlı dikey ölçülerdir (taban
çizgisi→orta çizgi, taban çizgisi→yükselen); pango ile kalibre edilmiş
varsayılanlara dönmek için bunları atlayın. Bkz.
[Metin ölçümü](/tr/guide/text-measurement).

### `RenderResult` ve hatalar

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)`, `renderSvg`'nin sonuç tarzındaki
karşılığıdır: başarıda `{ svg }`, ilk başarısızlıkta fırlatmak yerine
`{ errors: [one] }` döndürür. Her DOT girdisi için döndürür ve yalnızca geçersiz
argümanlar için fırlatır. `errors` içindeki girdiler `cause` ve yığın izi
içermeyen düz verilerdir.

Fırlatılan her dot-engine hatası soyut `DotEngineError` sınıfını genişletir ve
`GvError` yapısını uygular:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg`, geçersiz DOT kaynağı için `ParseError`, yerleşim/işleme aşaması
hataları için `RenderError` ve bir dot-engine hatası için `InternalError`
fırlatır. Çağıran hataları, `code` değeri bir `UsageErrorCode` olan (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`) standart bir `TypeError` /
`RangeError` / `Error` fırlatır; bunlar `GvError` değildir. `try`/`catch`
olmadan yapılandırılmış hata isteyen çağıranlar bunun yerine `tryRenderSvg`
kullanmalıdır. Her kod için bkz. [Hatalar ve istisnalar](/tr/guide/errors).

## İlişkiler

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Hangi tür hangi çağrıdan gelir

| Çağrı | Döndürdüğü |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (iç içe) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (`DotEngineError` veya bir kullanım `TypeError` fırlatır) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Yukarıdaki her türün her alanı için — bu sayfanın özetlediği alanlar dahil —
oluşturulan [TypeDoc referansı](/reference/) sayfasına bakın. Koordinat çerçevesi
derinlemesine anlatımı (çalışılmış örneklerle) için
[Hesaplanan geometriyi okuma](/tr/guide/geometry) sayfasına bakın.
