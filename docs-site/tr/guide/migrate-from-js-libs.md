---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Diğer JS Graphviz kitaplıklarından geçiş

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) ve
`d3-graphviz`, gerçek C Graphviz'i **WebAssembly**'ye derleyip içine çağrı
yaparak JavaScript'ten Graphviz'e erişim sağlar. @knowvah/dot-engine ise sıfırdan
yazılmış bir **TypeScript portudur** — yerleşim motorları, ayrıştırıcı ve SVG
yayıcı derlenmiş bir ikili değil, TypeScript kaynak kodudur.

Bu fark dipnot değil, başlıca konudur:

| | WASM sarmalayıcıları (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Uygulama | Gerçek C Graphviz, `.wasm` ikilisine derlenmiş | Saf TypeScript portu, derlenmiş çıktı yok |
| Modül başlatma | Eşzamansız — ilk kullanımdan önce WASM modülünü örnekleyin/bekleyin | Yok — `import` edip eşzamanlı olarak çağırın |
| Paket | JS'in yanında bir `.wasm` varlığı sunulur (yüzlerce KB – birkaç MB) | Yalnızca JS, ağaç sallamaya (tree-shaking) uygun |
| Hata ayıklama | Bir WASM yığınında (ya da elinizde varsa C kaynağında) adım adım ilerleme | Kaynak haritalarıyla gerçek TypeScript'te adım adım ilerleme |
| İş parçacığı modeli | Bazı sürümler yerleşimi bir Web Worker içinde çalıştırır | Herhangi bir TS işlevi gibi çağıran iş parçacığında çalışır |
| Çıktı biçimleri | Altta yatan C sürümünün derlendiği her şey — tipik olarak raster/PDF dahil tam Graphviz kümesi | SVG + DOT/json/xdot/plain/imagemap metin biçimleri — aşağıya bakın |

Kullanım senaryonuz "bir işlevi çağır, SVG geri al; async törenine ve
barındırılacak WASM varlığına gerek yok" ise @knowvah/dot-engine tam bunun için
vardır. Kullanım senaryonuz raster veya PDF çıktısına bağlıysa aşağıdaki
[WASM'de kalmanız gereken durumlar](#when-to-stay-on-wasm) bölümüne bakın.

## API farkları

Üç kitaplığın yapısı farklıdır; aşağıdaki tablo yaygın geçiş durumunu gösterir
(yaklaşık — her kitaplığın kendi belgelerinden doğrulayın; her satırın altındaki
kaynaklara bakın).

| Kitaplık | Tipik çağrı | @knowvah/dot-engine karşılığı |
|---|---|---|
| `@viz-js/viz` (viz.js'in halefi) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — async, `Viz.instance()` bir Promise çözer | `renderSvg(dot, 'dot')` — eşzamanlı, örnek/başlatma adımı yok |
| viz.js 2.x (eski, `new Viz()`) | `new Viz().renderString(dot)` — `Promise<string>` döndürür | `renderSvg(dot, 'dot')` — eşzamanlı |
| `@hpcc-js/wasm-graphviz` | Bir kez `await Graphviz.load()`, ardından `graphviz.dot(dot)` (yüklemeden sonra eşzamanlı) | `renderSvg(dot, engine)` — hiçbir yükleme/ısınma adımı yok |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — çıktıyı DOM'a bağlar, geçişleri canlandırır | `renderSvg(dot, engine)` bir SVG **dizesi** döndürür; DOM'a kendiniz eklersiniz (ör. `el.innerHTML = svg`) |

Sağ sütundaki her @knowvah/dot-engine çağrısı **eşzamanlıdır** — beklenecek bir
modül yoktur, çünkü örneklenecek bir WASM ikilisi yoktur. Bir @knowvah/dot-engine
çağrısını saran her `await`/`.then()` ifadesini kaldırın; hiçbir zaman gerekli
değildi.

- `@viz-js/viz`'in `Viz.instance()` → Promise yapısı ve `renderSVGElement()`
  yöntemi viz-js.com'da belgelenmiştir; yazım sırasında projenin yayımlanmış
  kullanım örneği aracılığıyla doğrulanmıştır.
- viz.js 2.x'in `new Viz().renderString(dot)` çağrısı, o (artık geçerliliğini
  yitirmiş) sürüm hattı için belgelenen API'dir; güncel bir kurulum
  kullanıyorsanız gerçekten `@viz-js/viz` üzerinde olup olmadığınızı kontrol
  edin.
- `@hpcc-js/wasm-graphviz`'in `Graphviz.load()` / `graphviz.dot()` çifti,
  yazım sırasında paketin yayımlanmış kullanım örneği aracılığıyla
  doğrulanmıştır. Ayrı ve daha eski `@hpcc-js/wasm` paketi geçmiş sürümlerde
  ek olarak bir `graphviz.layout(dot, format, engine)` çağrısı sunuyordu —
  kesin imzaya güvenmeden önce kurulu sürümünüzün kendi belgelerine bakın.
- `d3-graphviz`'in `.graphviz().renderDot(dot)` zinciri ve bunun dahili olarak
  `@hpcc-js/wasm` üzerine kurulu olduğu, yazım sırasında projenin yayımlanmış
  README dosyası aracılığıyla doğrulanmıştır.

### `renderDot`'un DOM bağlaması burada kapsam dışıdır

`d3-graphviz` yalnızca SVG işlemekle kalmaz: sonucu bir D3 seçimine bağlar,
yeniden işlemelerin farkını alır ve yerleşimler arasındaki geçişleri
canlandırır. @knowvah/dot-engine'in DOM konusunda hiçbir görüşü yoktur —
`renderSvg`/`render` düz bir dize döndürür. d3-graphviz tarzı, iki yerleşim
arasında canlandırılmış geçişler istiyorsanız, bu mantığı iki `renderSvg`
çağrısı ve kendi DOM fark alma kodunuzun üzerine inşa edersiniz (veya yalnızca
bu özellik için d3-graphviz kullanmaya devam edersiniz — aşağıya bakın).

## Bir dize biçimini ayrıştırmadan yerleşim verisi alma

Üç WASM kitaplığından da Graphviz'in kendi JSON veya düz metin biçimleri
istenebilir; ardından düğüm/kenar koordinatlarını almak için bu dizeyi kendiniz
ayrıştırırsınız. @knowvah/dot-engine metin gidiş dönüşünü atlar:
(`render` sonrasında) `getLayout(g)` çağırarak türlendirilmiş, JSON'a
dönüştürülebilir bir anlık görüntüyü doğrudan alırsınız — ayrıştırılacak bir
`-Tjson`/`-Tplain` dizesi yoktur.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Anlık görüntünün tam yapısı, birimler ve `yAxis` seçeneği için
[Hesaplanan geometriyi okuma](/tr/guide/geometry) sayfasına bakın.

## WASM'de kalmanız gereken durumlar {#when-to-stay-on-wasm}

Kapsam konusunda kendinize karşı dürüst olun: @knowvah/dot-engine, SVG ile
birlikte `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx` metin
biçimlerini hedefler. Raster biçimleri (PNG/JPEG/GIF/...) veya
PostScript/PDF/EPS **üretmez** — bunlar henüz bitmemiş bir eksik değil, bilinçli
bir kapsam sınırıdır. Tam hedef dışı listesi için
[Bilinen farklılıklar](/tr/divergences) sayfasına bakın.

Uygulamanız doğrudan yerleşim motorundan `-Tpng` veya `-Tpdf` çıktısına
ihtiyaç duyuyorsa yukarıdaki WASM tabanlı kitaplıklar bu durumu hâlâ karşılar —
gerçek C Graphviz'i çalıştırdıkları için o sürümün derlendiği her çıktı
biçimini desteklerler. Bu senaryoda ya yalnızca o kod yolu için WASM
kitaplığını kullanmaya devam edin ya da @knowvah/dot-engine ile `'svg'` olarak
işleyip SVG'yi ayrı bir araçla sonraki aşamada raster/PDF'e dönüştürün.

## Ayrıca bakın

- [Yerleşim motorları](/tr/guide/engines)
- [Diğer biçimlere işleme](/tr/guide/render-formats)
- [Hesaplanan geometriyi okuma](/tr/guide/geometry)
- [Bilinen farklılıklar](/tr/divergences)
- [Başlarken](/tr/guide/getting-started)
