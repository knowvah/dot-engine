---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Hatalar ve istisnalar

dot-engine iki tür hata fırlatır. Hangi türü yakaladığınız, kimin bir şeyi
değiştirmesi gerektiğini söyler.

## İki aile, tek kural

| Aile | Nasıl tanınır | Anlamı | Kim harekete geçer |
|--------|---------------------|---------|----------|
| dot-engine hatası | `err instanceof DotEngineError` | dot-engine bu girdide başarısız oldu: hatalı DOT, Graphviz'in kendisinin de bildireceği ölümcül bir hata, desteklenmeyen bir Graphviz özelliği veya bir dot-engine hatası | DOT yazarı veya bir hata bildirimi |
| Kullanım hatası | standart `TypeError` / `RangeError` / `Error`, `err.code` değeri `ERR_` ile başlar | Çağrı yanlıştı: hatalı argüman türü, bilinmeyen motor veya biçim adı, yanlış çağrı sırası | Çağıran kod |

Mesaj metnine değil `.code` değerine göre dallanın. Mesajlar sürümler arasında
değişebilir; kodlar kararlıdır.

Kullanım hataları `DotEngineError` değildir ve `GvError` yapısını uygulamaz.
`name` değerleri, Node.js'te olduğu gibi `TypeError`, `RangeError` veya `Error`
olarak kalır.

## Sınıf referansı

Aşağıdaki dört sınıfın hepsi `DotEngineError` sınıfını genişletir ve `GvError`
yapısını (`type`, `code`, `message`, `friendlyMessage`, isteğe bağlı `location`
ve `expected`) uygular.

### `DotEngineError` (soyut)

Ortak taban sınıf. `instanceof DotEngineError`, dot-engine'in girdisi hakkında
ürettiği her hata için doğrudur. Doğrudan oluşturulamaz. `type`, `code` ve
`friendlyMessage` alt sınıflar tarafından tanımlanır.

### `ParseError`

| Öğe | Değer |
|------|-------|
| Ne zaman fırlatılır | DOT kaynağı geçerli değildir veya graf türü için yanlış kenar operatörünü kullanır |
| `type` | `syntax` |
| Kodlar | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Alanlar | `location` (`{ line, column, offset? }`), `expected` (ayrıştırıcı beklentileri; yalnızca `SYNTAX_*`), `line` ve `column` erişimcileri |
| Çağıranın yapacağı | DOT kaynağını düzeltin. `location` ve `friendlyMessage` değerlerini yazara gösterin |

Bir `ParseError` üzerindeki `GENERIC_ERROR`, kaynağın ayrıştırıcının yığınını
tüketecek kadar derin iç içe geçmiş olduğu anlamına gelir.

### `HtmlParseError`

| Öğe | Değer |
|------|-------|
| Ne zaman fırlatılır | Bugün hiçbir zaman çağırana ulaşmaz (aşağıya bakın) |
| `type` | `semantic` |
| Kodlar | `HTML_PARSE_ERROR` |
| Alanlar | `tag` (sorunlu belirteç). `location` veya `expected` yok |
| Çağıranın yapacağı | Yok. Hatalı bir etiketi bulmak için işlenmiş çıktıyı beklediğinizle karşılaştırın |

HTML benzeri etiket ayrıştırıcısı; bilinmeyen bir öğe, hatalı biçimlendirilmiş
bir öznitelik veya yanlış yerleştirilmiş bir `<TABLE>`, `<HR>` ya da `<VR>` için
`HtmlParseError` üretir. Yerleşim aşaması bunu yakalar ve Graphviz'in yaptığı
gibi etikete içerik vermez: graf yine işlenir, ancak etiket boş olur. Hiçbir
herkese açık işlev bunu yukarı iletmez.

`HtmlParseError` paket kökünden dışa aktarılmaz. Biri bir gün size ulaşırsa
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` ifadesi onu
tanımlar.

### `RenderError`

| Öğe | Değer |
|------|-------|
| Ne zaman fırlatılır | Yerleşim veya işleme, Graphviz'in kendisinin de bildireceği bir biçimde başarısız olur, graf kullanılamayan bir yerleşim motoruna ad verir ya da graf dot-engine'in port etmediği bir Graphviz özelliğini kullanır |
| `type` | `RENDER_ERROR` için `render`; `UNKNOWN_LAYOUT` ve `UNSUPPORTED_FEATURE` için `semantic` |
| Kodlar | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Alanlar | Başarısızlık başka bir hatayı sardığında `cause`. `location` yok |
| Çağıranın yapacağı | `RENDER_ERROR`: grafı değiştirin. `UNKNOWN_LAYOUT`: `layout=` özniteliğini düzeltin. `UNSUPPORTED_FEATURE`: özellikten kaçının (örneğin `rotation=45` ile sfdp; bkz. [tablo](#unsupported-feature-reference)) |

### `InternalError`

| Öğe | Değer |
|------|-------|
| Ne zaman fırlatılır | dot-engine içinde bir doğrulama veya değişmez koşul başarısız olur ya da dot-engine'e ait olmayan bir hata yerleşim veya işleme hattından dışarı sızar |
| `type` | `render` |
| Kodlar | `INTERNAL_ERROR` |
| Alanlar | `cause` (bir hata sarılmışsa özgün hata) |
| Çağıranın yapacağı | Hatayı tetikleyen DOT kaynağıyla bir hata bildirin |

DOT yazarının değiştirebileceği hiçbir şey bir `InternalError` durumundan
güvenilir biçimde kaçınmaz.

## Kod referansı

### `GvErrorCode`

| Kod | Sınıf | `type` | Anlamı | Tipik neden | Çağıranın yapacağı | Fırlatan |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Beklenmeyen belirteç | Yazım hatası, eksik `;` veya `}` | `location` konumundaki DOT'u düzeltin | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Kaynak bir deyimin ortasında bitti | Kapatılmamış `{`, `[` veya dize | `location` konumundaki DOT'u düzeltin | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | Yönsüz bir grafta `->` | `graph { a -> b }` | `--` kullanın | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | Bir digraph içinde `--` | `digraph { a -- b }` | `->` kullanın | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Kaynak ayrıştırılamayacak kadar derin iç içe | Patolojik düzeyde iç içe alt graflar | DOT'u düzleştirin | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Hatalı biçimlendirilmiş HTML benzeri etiket | Bilinmeyen öğe, hatalı öznitelik | Yok: etiket boş işlenir | Yok (dahili olarak yakalanır) |
| `RENDER_ERROR` | `RenderError` | `render` | Graphviz'in de bildireceği ölümcül bir yerleşim veya işleme hatası | Bir yerleşim aşaması için hatalı girdi | Grafı değiştirin | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Grafın `layout=` özniteliği kayıtlı hiçbir motoru adlandırmıyor | `layout="foo"` | Özniteliği düzeltin | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graf, dot-engine'in port etmediği bir Graphviz özelliği istiyor | `rotation=45` ile sfdp | Özellikten kaçının | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine hatası | Başarısız doğrulama, yabancı throw | Hata bildirin | `renderSvg`, `render`, `getDrawOps`, oluşturucu yöntemleri, `GvcContext.layout` (sarılmamış) |

### `UsageErrorCode`

| Kod | Sınıf | Anlamı | Tipik neden | Çağıranın yapacağı | Fırlatan |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Yanlış tür, `null` veya eksik zorunlu argüman | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Çağrıyı düzeltin | Argüman alan her herkese açık işlev |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Tür doğru, değer bilinmiyor | Kayıtlı olmayan motor veya biçim adı; `getLayout(g, { yAxis: 'other' })` | Kayıtlı bir ad veya izin verilen bir değer kullanın | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Sayısal argüman aralığının dışında | Ayrılmış | Çağrıyı düzeltin | Bugün hiçbir herkese açık işlev bunu fırlatmaz |
| `ERR_INVALID_STATE` | `Error` | Çağrı yanlış durumda yapıldı | Yerleşimden önce `getLayout` | Önce yerleştirin (`render(g, ...)` veya `ctx.layout`) | `getLayout` |

DOT kaynağı geçerli bir `layout=` özniteliği ayarlasa bile kayıtlı olmayan bir
motor argümanı reddedilir. Önce argüman denetlenir.

## `UNSUPPORTED_FEATURE` referansı {#unsupported-feature-reference}

Aşağıdaki her öznitelik değeri, yerel Graphviz'in dot-engine'in port etmediği
bir algoritmayı çalıştıracağı durumlarda yerleşimin `UNSUPPORTED_FEATURE` kodlu
bir `RenderError` fırlatmasına neden olur. Alternatif, Graphviz'den farklı bir
yerleşimi bunu söylemeden işlemekti. Denetim yalnızca "Ne zaman tetiklenir"
sütunundaki koşul sağlandığında çalışır; aynı öznitelik başka yerlerde normal
biçimde işlenir. Hatadan kaçınmak için özniteliği kaldırın veya desteklenen bir
değerle değiştirin.

| Motor | Öznitelik ve değer | Ne zaman tetiklenir | Gereken Graphviz özelliği |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Her zaman (grafın 2+ düğümü olduktan ve `maxiter` negatif olmadıktan sonra) | Hiyerarşik stres majorizasyonu (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Yalnızca Graphviz'in kısıtlar oluşturacağı durumda: `diredgeconstraints` doğrudur veya `hier*`, `overlap=ipsep`, ya da grafın en üst düzey bir kümesi vardır. Kısıt yoksa Graphviz'de olduğu gibi stres majorizasyonu olarak çalışır | Kısıtlı majorizasyon (`stress_majorization_cola`) |
| neato | `start=self` | `mode` değeri `major` (varsayılan) veya `ipsep` ise | Akıllı ilklendirme (`smart_ini`). `mode=KK` veya `mode=sgd` altında, Graphviz'in yaptığı gibi her işlemede bir kez `start=0 not supported with mode=self - ignored` günlüğe yazar |
| neato | `model=subset` | `mode` değeri `major` veya `KK` ise | Alt küme uzaklık modeli |
| neato | `model=circuit` | `mode` değeri `major` ise ya da bağlantılı bir grafta `KK` ise. `pack` veya `packmode` olmayan, bağlantısız bir grafta `KK`, bir uyarı günlüğe yazar ve Graphviz'in yaptığı gibi en kısa yolları kullanır | Devre uzaklık modeli (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (büyük/küçük harfe duyarsız) | Graf (twopi için bir bileşen; sfdp için tüm graf veya bir bileşen) 2+ düğüme sahiptir ve Graphviz'in kendi çakışma sayısı (düğüm çokgenlerini sınayan `countOverlap`) 0'ın üzerindedir. Yalnızca sınırlayıcı kutuyla temas eden düğümler bunu tetiklemez. circo buna yalnızca tek bileşenli bir grafta ulaşır (birden çok bileşende Graphviz `overlap` değerini yine yok sayar). sfdp buna yalnızca `overlap` bir prism modu değilse ulaşır | Voronoi çakışma giderme (`vAdjust`) |
| fdp | `overlap=` şunlardan biri: `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Mod, `N:` kuvvet yinelemesi denemelerinden sonra ulaşılır; yani bu denemeler her çakışmayı gidermediğinde (veya `N` 0 ya da yoksa). `N:` öneki serbesttir, örneğin `3:voronoi` | Eşleşen `removeOverlapWith` ayarlama algoritması |
| fdp | `splines=compound` | Her zaman, kümelerle veya kümesiz | Kümelerden kaçınan kenar yönlendirme (`compoundEdges`) |
| sfdp | `smoothing=` `none` veya `0` dışında herhangi bir değer | Her zaman | `post_process_smoothing` |
| sfdp | `rotation=` sıfır olmayan herhangi bir sayı | Her zaman | Çakışma gidermeden önce `rotate()` |
| sfdp | `label_scheme=1` ile `4` arası | `|edgelabel|...` adlı bir düğüm vardır, `overlap` `prism` moduna çözümlenir ve şema ya 3 veya 4'tür ya da şema 1 veya 2'dir ve prism denemeleri 0'ın üzerindedir (bir sayıyla `overlap=prism`, varsayılan `prism0` değil). 4'ün üzerindeki değerler 0 sayılır. Sıradan kenar etiketleri bunu asla tetiklemez | Kenar etiketi düğümü işleme (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (ayrıca `0`, `false`) | En az bir düğümü olan herhangi bir graf. Mesaj, çözümlenen şemayı adlandırır | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (ayrıca `2`) | En az bir düğümü olan herhangi bir graf. Mesaj, çözümlenen şemayı adlandırır | `spring_electrical_embedding_fast` |
| tüm motorlar | Port edilmemiş özel bir `round_corners` durumuyla çizilen bir düğüm şekli | Düğüm bu şekli kullanır. Mesaj: `special shape N not yet ported` | Şeklin `round_corners` çizim dalı. Bu, çizim durumu olmayan bir şekil numarasına karşı dahili bir korumadır; adlandırılmış hiçbir şeklin buna ulaştığı bilinmiyor |

Çoğu mesaj `<attribute>=<value>: <what> is not supported yet` biçimindedir.
İstisnalar `smoothing` ve `rotation` (eksik rutini adlandırırlar), fdp satırları
ve yukarıdaki ifadeleri kullanan şekil satırıdır. Metne değil
`err.code === 'UNSUPPORTED_FEATURE'` koşuluna göre dallanın.

Varsayılanı seçen değerler (örneğin `quadtree=normal`, `true`, `yes`, `1`) ve
Graphviz'in kabul ettiği, port edilmiş değerler (örneğin `start=regular`,
`start=random`, `model=mds`, `mode=KK`, `mode=sgd`, `overlap=prism`, `scale`
ailesi ve neato, twopi, circo ile sfdp'de `overlap=oscale`, `vpsc` ve `ortho*` /
`portho*` modları) normal biçimde işlenir.

## İşlev başına referans

"Kullanım", başka bir kodu adlandıran bir satır olmadıkça `ERR_INVALID_ARG_TYPE`
kodlu `TypeError` anlamına gelir.

| İşlev | Fırlatabilecekleri |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Kullanım (`dotSource` veya `engine` dize değil); `TypeError` `ERR_INVALID_ARG_VALUE` (motor kayıtlı değil); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Kullanım (`dotSource` veya `engine` dize değil); `TypeError` `ERR_INVALID_ARG_VALUE` (motor kayıtlı değil). Başka hiçbir şey: her DOT girdisi hatası `errors` içinde döndürülür |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` dize değil); `ParseError` |
| `render(g, format, opts?)` | Kullanım (`g`, `format` veya `opts` yanlış tür); `TypeError` `ERR_INVALID_ARG_VALUE` (motor veya biçim kayıtlı değil); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Kullanım (`g` veya `opts` yanlış tür); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` kayıtlı değil); `RenderError`; `ParseError` (ara xdot yeniden ayrıştırılamadı: bir dot-engine hatası); `InternalError` |
| `createGraph(opts?)` ve oluşturucu yöntemleri (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Kullanım (yanlış argüman türleri; dize olmayan öznitelik değerleri dahil); `InternalError` (graf modeli bir düğüm veya alt graf oluşturamadı) |
| `addEdge(g, tail, head, name?)` (`/api` içinden) | Kullanım (nesne olmayan `g`, `tail` veya `head`; dize olmayan `name`) |
| `getLayout(g, opts?)` | Kullanım (`g` veya `opts` nesne değil); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` `'up'` veya `'down'` değil); `Error` `ERR_INVALID_STATE` (graf yerleştirilmemiş) |
| `new GvcContext(measurer, options?)` | Kullanım (`measurer` içinde `measure` işlevi yok; `options` nesne değil) |
| `ctx.register(plugin)` | Kullanım (bir işleyici eklentisi veya yerleşim motoru değil) |
| `ctx.layout(g, engine)` | Kullanım (`g` nesne değil, `engine` dize değil); `TypeError` `ERR_INVALID_ARG_VALUE` (motor kayıtlı değil); `RenderError` `UNKNOWN_LAYOUT`. Motor hataları sarılmadan yayılır |
| `ctx.freeLayout(g, engine)` | Kullanım; `TypeError` `ERR_INVALID_ARG_VALUE` (motor kayıtlı değil). Motor hataları sarılmadan yayılır |
| `ctx.bestRenderer(format)` | Kullanım (`format` dize değil); `TypeError` `ERR_INVALID_ARG_VALUE` (`format` için işleyici yok) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Kullanım (`ctx` bir `GvcContext` değil, `g` nesne değil, `format` dize değil); `TypeError` `ERR_INVALID_ARG_VALUE` (`format` için işleyici yok). İşleme hataları sarılmadan yayılır |
| `setImageSizer(sizer)` | Kullanım (işlev veya `null` değil) |
| `setImageResolver(fn)` | Kullanım (işlev veya `null` değil) |
| `setTextMeasurer(measurer)` | Kullanım (`TextMeasurer` veya `undefined` değil) |

### Hangi işlevler yabancı throw'ları sarar

| İşlevler | Beklenmeyen (dot-engine'e ait olmayan) bir throw durumundaki davranış |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | `InternalError` olarak sarılır; `cause` özgün hatadır |
| `renderWithContext` ve her `GvcContext` yöntemi | **Sarılmaz.** Bir motor hatası çağırana motorun fırlattığı neyse o olarak ulaşır; örneğin `code` içermeyen düz bir `TypeError` |

`GvcContext` kullanıyorsanız ne `DotEngineError` ne de kullanım hatası olan bir
hatayı dot-engine hatası olarak değerlendirin.

## `tryRenderSvg` veya `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Hatalı DOT veya yerleşim hatası | Bir `DotEngineError` fırlatır | `{ errors: [one] }` döndürür |
| Hatalı argümanlar | Bir kullanım hatası fırlatır | Bir kullanım hatası fırlatır |
| Hata değeri | Yığın izi ve `cause` içeren bir `Error` | Düz veri: `type`, `code`, `message`, `friendlyMessage`, ayrıca varsa `location` / `expected` |
| Ne zaman kullanılır | Başarısızlık çağıranı durdurmalıysa | `code` değerine göre dallanıyorsanız veya hatayı `postMessage` üzerinden ya da bir günlüğe gönderiyorsanız |

`tryRenderSvg`, hiçbir DOT girdisi için fırlatmaz. Yalnızca argümanların kendisi
geçersiz olduğunda fırlatır; bu, çağıran koddaki bir hatadır. Döndürdüğü hata
nesneleri `cause` veya yığın izi taşımaz.

## Sarılmış hatalar ve `cause`

`renderSvg`, `render` veya `getDrawOps`, dot-engine'in üretmediği bir hatayı
yakaladığında, `cause` değeri özgün hata olan bir `InternalError` fırlatır.
`message`, özgün mesajdır.

`cause` numaralandırılamaz olduğundan `JSON.stringify(err)` onu atlar.
Günlüğe yazarken zinciri açıkça dolaşın (aşağıdaki son örneğe bakın).

## Paketler arası denetimler

`instanceof DotEngineError`, kitaplığın tek bir kopyası içinde çalışır. İki kopya
yüklenebiliyorsa (yinelenen paketler, bir eklenti ana makinesi), `isGvError(e)`
kullanın. Dize türünde `type` ve `code` değerlerini denetler ve kopyalar arasında
çalışır. Ayrıca `tryRenderSvg`'nin döndürdüğü düz nesneleri de kabul eder.

## Örnekler

İki aileyi ayırın:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Bir `tryRenderSvg` sonucunu ele alın:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Bir `InternalError` hatasını nedeniyle birlikte günlüğe yazın:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Ayrıca bakın

- Her işlevin imzası için [API referansı (seçki)](/tr/guide/api).
- `GvError` ve `RenderResult` yapıları için [Türler](/tr/guide/types).
- `GvErrorCode` ve `UsageErrorCode` birleşimlerinin tamamı için [Oluşturulan API (TypeDoc)](/reference/).
