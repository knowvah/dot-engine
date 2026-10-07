---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Görseller

`image="logo.png"` içeren bir düğümün (veya HTML benzeri etiketteki bir
`<IMG SRC="logo.png">` hücresinin) pikselleri varsayılan olarak gömülmez.
@knowvah/dot-engine kaynağı **olduğu gibi** yazar:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

SVG'yi görüntüleyen ne olursa olsun — tarayıcı `<img>`/satır içi `<svg>`, bir Electron
kabuğu, statik site derlemesi — o `href` değerini kendisi çözümler. Bu sayfa, o href'in
yerleşim sırasında nasıl boyutlandırıldığını, piksellerin gerçekten görünmesini sağlamanın
üç yolunu ve her birinin CSP etkilerini kapsar.

## Görseller nasıl akar

1. Graf, bir düğümde `image="logo.png"` bildirir veya bir HTML benzeri etiket bir `<IMG>`
   hücresi içerir.
2. Bir HTML benzeri `<IMG>` hücresi için Graphviz, başka hiçbir şeyi yerleştirebilmeden
   önce hücreyi boyutlandırmak üzere görselin **doğal genişlik/yüksekliğine** ihtiyaç
   duyar — kitaplık bunu öğrenmek için dosya sistemine veya ağa asla dokunmaz; bu yüzden
   bir boyutlandırıcı kaydedersiniz (`setImageSizer`; [Tarayıcıda kullanım](/tr/guide/browser)
   sayfasında ve Node için aşağıda yeniden ele alınır). Bir düğümün `image=` özniteliği
   boyutlandırıcı tarafından **boyutlandırılmaz**: başsız yerel Graphviz gibi, düğüm
   normal kutusunu korur ve görsel o kutunun içine çizilir.
3. Yerleşim, boyutlandırıcınızın her `<IMG>` için döndürdüğü ölçüler kullanılarak çalışır.
4. SVG yayıcısı (`src/render/svg.ts` içindeki `usershape()`), 3. adımda hesaplanan kutuyla
   `<image xlink:href="...">` yazar. Varsayılan olarak `href`, XML kaçışlı ham `src`
   dizgisidir; başka bir şey değildir.
5. İsteğe bağlı olarak — `setImageResolver` çağırdıysanız ve `{ inlineImages: true }` ile
   işlediyseniz — yayıcı bunun yerine `xlink:href="data:<mime>;base64,<bytes>"`, yani kendi
   içinde tam bir `data:` URI'si yazar. Bu eklemelidir; yerel Graphviz'in yaptığı bir şey
   değildir.

Boyutlandırma ve gömme, bağımsız ve ayrı kaydedilen iki genişletme noktasıdır: görselleri
gömmeden boyutlandırabilirsiniz (yaygın durum — dosyayı barındırın) veya ikisini birden
yapabilirsiniz (kendi içinde tam SVG).

## Node ve tarayıcıda boyutlandırma

`setImageSizer`, `(src: string) => { w: number; h: number } | null` alır ve yerleşim
sırasında her farklı `image=`/`<IMG>` kaynağı için bir kez çağrılır. Aşağıdaki
`setImageResolver` ile aynı desenle, süreç genelinde bir kayıttır — `render()`/`renderSvg()`
öncesinde bir kez çağırın.

**Tarayıcı** — `Image` ve `decode()` zaten elinizde olduğundan gerçek görseli ölçün:

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

`setImageSizer` eşzamanlı bir geri çağrıdır — içinde `await` yoktur — bu yüzden tarayıcı
yolu, yerleşim çalışmadan önce boyutları (`decode()` ile) bir önbelleğe önceden çözer, sonra
o önbelleği eşzamanlı olarak okur.

**Node** — DOM `Image` yoktur ve kitaplık sizin için dosya sistemini okumaz. Ya bilinen
boyutları sabit kodlayın ya da kendiniz okuyun (örneğin bir bildirim dosyasından veya
sağladığınız hafif bir PNG/JPEG üstbilgi ayrıştırıcısından) ve sonucu aynı şekilde verin:

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

Graflarınız hiçbir zaman harici görsellere başvurmuyorsa bunu tamamen atlayın.

## Eşzamansız boyutlandırıcı ve çözümleyici (işleme başına)

`setImageSizer` / `setImageResolver` eşzamanlı, süreç genelinde kayıtlardır; bu yüzden
yukarıdaki tarayıcı deseninin bir önbelleği önceden ısıtması gerekir. Eşzamansız giriş
noktaları kancaları **çağrı başına** alır ve sizin yerinize bekler:

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

- Her kanca, yerleşim başlamadan önce paralel olarak, **farklı her `src` için en fazla bir
  kez** çağrılır. Motor ardından toplanan sonuçlara karşı normal eşzamanlı yerleşimini
  çalıştırır.
- **Hata fırlatan veya reddeden** bir kanca, `null` döndüren eşzamanlı bir kanca gibi
  kaçırma (`null`) sayılır: boyutlandırıcı için sıfır boyut, çözümleyici için ham `src`
  geçişi.
- Eşzamansız bir kanca verildiğinde, kaçırma genel `setImageSizer` /
  `setImageResolver` işlevlerine **geri düşmez**. Verilmediğinde, `renderSvg`'de olduğu
  gibi genel kayıtlar geçerlidir.
- Kancalar yalnızca o işleme için geçerlidir; hiçbir şey genel olarak kaydedilmez.
- `imageResolver` yalnızca `inlineImages` değeri `true` iken başvurulur.
- `renderSvgInto` aynı seçenekleri kabul eder.

## Görselin görünmesini sağlama

Boyutlandırma yerleşimi doğru yapar; SVG'nin görüntülendiği her yerde piksellerin
görünmesini sağlamaz. Üç yaklaşımdan birini seçin.

### 1. Dosyayı barındırma

Görseli, tarayıcının/tüketicinin alabileceği bir URL'de (veya SVG'nin görüntülendiği yere
göreli bir yolda) sunun. Bu en basit seçenektir ve ek işleme zamanı işi gerektirmez — ancak
görüntüleme bağlamının o kaynağa erişebilmesi gerekir ve SVG katı bir `img-src` CSP'si olan
bir yerde gösteriliyorsa o kaynak orada da izin listesine alınmalıdır (aşağıya bakın).

### 2. `data:` URI'si olarak gömme

Hiç harici getirme olmadan tek bir kendi içinde tam SVG dizgisi üretmek için gömme
API'sini kullanın: `setImageResolver` ham baytları sağlar ve
`render(g, 'svg', { inlineImages: true })` onları gömer.

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

`ImageResolver`, bir MIME türünü açıkça belirtmek istediğinizde ayrıca
`{ bytes: Uint8Array; mime?: string }` döndürebilir (aksi halde yayıcı, kaynağın dosya
uzantısından bir tür çıkarır — `.png` → `image/png`, `.svg` → `image/svg+xml` ve benzeri;
bilinmeyen uzantılar için `application/octet-stream` değerine düşer). Kaydı temizlemek için
`setImageResolver(null)` çağırın.

::: tip
SVG, görüntüleme anında harici kaynakları getiremeyen bir yere gidiyorsa — e-posta
istemcileri, çevrimdışı belgeler, katı CSP'li bir gömme veya sonradan ağ isteği olmayan tek
bir kendi içinde tam dizgi istediğiniz her yer — gömmeyi tercih edin. Bedeli çıktı
boyutudur: base64 görseli yaklaşık %33 şişirir ve ona başvuran her SVG'ye yinelenir
(işlemeler arasında tarayıcı önbelleği yeniden kullanımı yoktur).
:::

`inlineImages` varsayılan olarak `false` değerindedir; ayarlanmadığında çıktı, gömme
öncesi geçişle bayt düzeyinde aynıdır. Yalnızca `svg` biçimini etkiler — `json`/`xdot`/`dot`/
diğer metin biçimleri üzerinde etkisi yoktur. Bir kaçırma (kayıtlı çözümleyici yok veya
çözümleyici o `src` için `null` döndürüyor) otomatik olarak ham `src` geçişine geri düşer —
gömme zarifçe geriler, hiçbir zaman hata fırlatmaz.

### 3. `imagepath` tarzı temel dizinler

Yerel Graphviz'in `imagepath` graf özniteliği, C ikilisine göreli `image=` değerlerini
çözümleyeceği, dosya sistemi/`GDFONTPATH` tarzı bir arama dizini söyler.
@knowvah/dot-engine `imagepath` özniteliğini uygulamaz — port görsel verisini diskten
asla kendisi okumaz; bu yüzden karşısında çözümlenecek bir yol yoktur (kapsam sınırının
tamamı için [Bilinen farklılıklar](/tr/divergences) sayfasına bakın). Graflarınız göreli
`image=` yolları kullanıyorsa bunları, DOT kaynağını oluşturan katmanda veya
`setImageSizer`/`ImageResolver` geri çağrılarınızda kendi temel dizininize/URL'nize göre
çözümleyin — ikisi de `src` dizgisini grafta yazıldığı gibi aynen alır; bu yüzden arama
öncesinde başına bir temel yol eklemek normal ve onaylı bir desendir.

## CSP yönergeleri

Graflarınız kullanıcı tarafından sağlanıyorsa (bir deneme alanı, rastgele DOT işleyen bir
gömme), sayfanın `img-src` ilkesini baştan düşünün.

**Gömülü görseller (`data:` URI'leri)** yalnızca şunu gerektirir:

```
img-src 'self' data:
```

Bir HTTP yanıt üstbilgisi olarak:

```
Content-Security-Policy: img-src 'self' data:
```

Ya da SVG'yi barındıran sayfada bir meta etiketi olarak:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Bu sıkıdır — hiçbir harici görsel ana makinesiyle iletişim kurulmaz, çünkü baytlar zaten SVG
dizgisine gömülüdür.

**Barındırılan görseller (yukarıdaki 1. seçenek)** ise görüntüleme bağlamının, o görsellerin
gerçekte bulunduğu yerden getirme yapmasını gerektirir. Kullanıcı tarafından sağlanan bir
graf rastgele bir `image=` URL'sine başvurabiliyorsa, olası her ana makineyi izin listesine
almak çoğu zaman pratik değildir; bu yüzden bir deneme alanı/gömme sayfası daha serbest bir
şeye ihtiyaç duyabilir:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
`img-src *` değerini (veya eşit derecede serbest herhangi bir `img-src` değerini) hiçbir
zaman **site genelindeki** varsayılanınız yapmayın. Kapsamını, rastgele kullanıcı kaynaklı
graflar işlemesi gereken belirli deneme alanı/gömme sayfasıyla sınırlayın, onu yalnızca o
sayfa için kasıtlı, belgelenmiş bir gevşetme olarak ele alın ve diğer her sayfanın CSP'sini
sıkı tutun. Serbest bir `img-src`, kötü amaçlı bir grafın görsel URL'si yan kanalları
aracılığıyla (ör. veriyi saldırgan denetimli bir ana makineye sorgu parametreleri olarak
kodlayarak) veri sızdırmasına veya istenmeyen uzak içerik yüklemesine izin verir. Görsel
kümesini siz denetliyorsanız bunun yerine gömmeyi (`data:`) tercih edin ve her yerde
`img-src 'self' data:` değerini koruyun.
:::

## Eksik görseller

`setImageSizer`, başvurulan bir kaynak için `null` döndürürse (veya hiç boyutlandırıcı
kayıtlı değilse), @knowvah/dot-engine yerel Graphviz'in `gvusershape` kaçırmasıyla aynı
C'ye sadık yolu izler: uyarır ve görseli **sıfır boyutlu** sayar; bu da çevresinde
hesaplanan düğüm kutusu yerleşimini etkiler. `setImageResolver`/`inlineImages` devredeyse
ve çözümleyici kaçırırsa, yayıcı gömmek yerine ham `src` geçişine geri düşer — `href` yine
yazılır, yalnızca sayfadaki başka bir şey onu getiremiyorsa çözümlenmez. Görsel/raster
işleme için nelerin kapsamda olup olmadığı konusunda genel olarak
[Bilinen farklılıklar](/tr/divergences) sayfasına bakın.
