---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Tarayıcıda kullanım

@knowvah/dot-engine yalnızca Node'a özgü API'ler kullanmaz ve tarayıcı için güvenle
paketlenebilir. Bu sayfa, istemci tarafında çalışırken bilmeniz gereken iki şeyi kapsar.

## Paketleme

Kitaplık düz ES modüllerinden oluşur. Her modern paketleyici (Vite, esbuild, Rollup,
webpack) onu dahil edebilir. Dışarıda bırakılacak çalışma zamanı bağımlılığı ve
barındırılacak WASM çıktısı yoktur.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Bu sitenin [deneme alanı](/tr/playground) tam olarak bunu yapar — motoru içe aktarır ve
`renderSvg` işlevini tarayıcıda, sunucuya gidip gelmeden çağırır.

## Metin ölçümü

Graphviz'in etiketleri boyutlandırmak için metin ölçülerine ihtiyacı vardır.
@knowvah/dot-engine bunu otomatik olarak halleder:

- **Tarayıcıda** (`document` varsa) metni yerel `<canvas>` 2D bağlamıyla ölçer — SVG'yi
  işleyen tarayıcının kullandığı yazı tipi aynı olduğundan, ana makineye sadıktır.
- **Node'da** varsayılan olarak yerleşik **Estimate** ölçeri kullanır — Graphviz'in kendi
  `estimate_textspan_size` işlevini yansıtan, deterministik ve başsız ortama uygun bir
  modeldir. Node'da doğru yerleşim için `canvas` kurulumu veya yazı tipi dosyaları
  gerekmez; yerel bir canvas bağımlılığı olmadan ana makineye daha yakın boyutlandırma
  için, isteğe bağlı olarak ipuçlu (hinted) bir arama tablosu (LUT) ölçeri de vardır.
  Bir ölçeri açıkça nasıl seçeceğiniz için [Metin ölçümü](/tr/guide/text-measurement)
  sayfasına bakın.

Hiçbir durumda yerleşim için yazı tipi dosyası gerekmez.

## Web yazı tipleri: ön yüklemenin önemi

Etiket boyutları, metni bir yazı tipiyle ölçmekten gelir. Bir yazı tipi yüzü
`@font-face` ile bildirilmiş ama yüklenmesi bitmemişse tarayıcı bunun yerine **yedek**
yazı tipiyle ölçer ve gerçek yazı tipi geldiğinde yerleşim yanlış olur. JetBrains Mono ile
Chromium'da ölçüldü: bir etiket kutusu, yüz yüklenmeden önce ölçüldüğünde (yedek)
**70,68 pt**, yüklendikten sonra ise **124,8 pt** genişliğindeydi.

Eşzamansız giriş noktaları (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) bunu
önler: graf tarafından istenecek yazı tiplerini toplar, `document.fonts` aracılığıyla
yükler ve ancak ondan sonra yerleşimi çalıştırır. `renderSvgAsync`, yükleme sonrası
ölçümle aynı 124,8 pt değerini üretti.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (varsayılan `3000`), yüz başına değil, tüm yüzler için paylaşılan
  tek bir son tarihtir.
- **`fontIssues`**, `{ face, reason }` öğelerinden oluşan bir listedir. `reason: 'failed'`,
  yüzün hata verdiği (örneğin 404) veya yüklemesinin reddedildiği anlamına gelir;
  `reason: 'timeout'` ise `fontTimeoutMs` içinde yüklenmediği anlamına gelir. Her iki
  durumda da yerleşim bir yedek yazı tipiyle sürer. Her sorun ayrıca `console.warn` ile
  uyarı olarak yazılır. Yazı tipi sorunları hiçbir zaman söz (promise) reddetmez.
- **Sınırlama:** yalnızca `@font-face` ile bildirilen aileler raporlanabilir. Bir sistem
  yazı tipi veya bilinmeyen bir aile adı “yüklendi” olarak çözülür (beklenecek bir şey
  yoktur); bu yüzden yanlış yazılmış bir `fontname` hiçbir zaman `fontIssues` içinde
  listelenmez.
- **Node ve Workers** ortamlarında `document.fonts` yoktur; bu yüzden yazı tipi ön yüklemesi
  atlanır ve `fontIssues` değeri `[]` olur. Görsel kancaları yine çalışır. Kendi
  kümenizi sağlamak için bir `fontSet` (`load(font)` işlevi olan herhangi bir nesne)
  geçirebilirsiniz.

## Bir sayfaya işleme: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Verilen kimliğe sahip öğenin alt öğelerini, işlenmiş `<svg>` ile (`element` olarak
döndürülür) değiştirir; bunu `DOMParser` ve `importNode` ile yapar, hiçbir zaman
`innerHTML` ile yapmaz. Eksik bir kimlik `ERR_INVALID_ARG_VALUE` ile reddedilir. SVG
varsayılan olarak temizlenir; kendi temizleyicinizi kullanmak için `sanitize`, temizlemeyi
atlamak için `trusted: true` geçirin. Temizleyicinin nelerin kaldırılıp nelerin tutulduğu için
README'deki “Security” bölümüne bakın ve bir Content-Security-Policy tanımlı tutun.

## Harici görseller: `setImageSizer`

Bir HTML benzeri etiket harici bir görsel içerdiğinde (`<IMG SRC="logo.png"/>`),
Graphviz'in hücreyi boyutlandırmak için o görselin doğal boyutlarına ihtiyacı vardır.
(Bir düğümün `image=` özniteliği boyutlandırılmaz: düğüm, başsız yerel Graphviz'deki gibi
normal kutusunu korur.) Kitaplık dosya sistemini okuyamadığından bir boyutlandırıcı
sağlarsınız:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Graflarınız hiçbir zaman harici görsellere başvurmuyorsa bunu çağırmanız gerekmez.
Görselleri eşzamansız boyutlandırmak için (örneğin yükleyerek), bunun yerine
`renderSvgAsync` işlevine eşzamansız bir `imageSizer` geçirin; bkz.
[Görseller](/tr/guide/images).

## Web Workers

Yerleşim eşzamanlı çalışır; bu yüzden büyük bir graf, üzerinde çalıştığı iş parçacığını
engeller. Sayfanın yanıt vermeyi sürdürmesi için onu bir Worker içinde çalıştırın. Bir
Worker içinde `document` yoktur; bu yüzden kitaplık metni bir `OffscreenCanvas` ile
ölçer ve eşzamansız API yazı tiplerini Worker'ın kendi yazı tipi kümesi (`self.fonts`)
aracılığıyla yükler.

Bir Worker'daki yazı tipleri sayfanınkilerden ayrıdır: onları Worker içinde `FontFace`
API'siyle kaydedin (CSS `@font-face` kuralları Worker'lara ulaşmaz).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Bir Worker içinde, en azından her web yazı tipi yüklenene kadar, `renderSvg` yerine
`renderSvgAsync` (veya `renderAsync`) ile işleyin. Chromium, yüz yüklenmeden önce aynı
yazı tipi dizgisi Worker içinde ölçülmüşse, yüz yüklendikten sonra bile o dizgiyi yedek
yüzle ölçmeyi sürdürür; eşzamansız API ölçmeden önce yazı tiplerini yüklediği için buna
hiç takılmaz.

## Beklememeniz gerekenler

Kitaplık **SVG**'yi (ayrıca `json` / `xdot` / `dot` / görüntü haritası metin biçimlerini)
hedefler. Raster çıktı (PNG/JPG), PostScript/PDF ve etkileşimli/GUI arka uçları kapsam
dışıdır — başka bir biçime ihtiyacınız varsa SVG'yi sonraki aşamada dönüştürün. Kapsam
sınırının tamamı için [Bilinen farklılıklar](/tr/divergences) sayfasına bakın.

## Büyük graflar: SVG'ye önceden işleme

Çok büyük graflar — kabaca **>10 bin düğüm veya birkaç MB DOT kaynağı** — tarayıcıda
çalışma zamanında yerleştirilemeyecek kadar pratik dışıdır. Yerleşim (mincross, sıralama,
spline yönlendirme) doğrusal üstüdür; bu nedenle bu, bu motora özgü bir sınırlama değil,
**yukarı akış Graphviz ile paylaşılan bir ölçek tavanıdır**: bu tür girdilerde yerel `dot`,
WASM derlemeleri (`@hpcc-js/wasm-graphviz`) ve bu motor aynı şekilde zaman aşımına uğrar
veya belleği tüketir. (Bu motor **sızıntı yapmaz** — işleme başına yığını sabittir; sınır
kesinlikle graf boyutudur. Ölçülen karşılaştırma için
[performans panosuna](/perf) bakın.)

Bu ölçekteki graflar için, tarayıcıda her görüntülemede yerleştirmek yerine **derleme
zamanında bir kez işleyin ve ortaya çıkan `.svg` dosyasını sunun** — istek başına
çalıştırılamayacak kadar yavaş olduğundan yerel `dot` ile bile kullanacağınız aynı desen.

[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) içindeki (NPM'de yayımlanmış)
derleme zamanı site bağdaştırıcıları tam olarak bunu yapar:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), derleme zamanı
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), derleme zamanı
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), derleme zamanı
- `@knowvah/dot-markdown-it` — çerçeveden bağımsız markdown-it entegrasyonu

Derleme zamanı işlemenin seçenek olmadığı, kullanıcı tarafından sağlanan dinamik graflar
için etkileşimli işlemeyi makul boyutlu graflarla sınırlayın ve üretilen SVG'yi önbelleğe
alın.
