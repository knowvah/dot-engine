---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# `dot` komut satırı aracından geçiş

C ile yazılmış `dot`/`neato`/`fdp`/... ikili dosyaları bir `.dot` dosyasını (veya
stdin'i) okur ve işlenmiş bir dosya (veya stdout) yazar. @knowvah/dot-engine'in
dosya sistemi yoktur: girdi olarak bir DOT **dizesi** alır ve çıktı olarak
işlenmiş bir **dize** döndürür (ya da `getLayout` ile, ayrıştırılacak bir dize
yerine düz bir JavaScript geometri nesnesi döndürür).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Yukarıdaki dosya okuma/yazma işlemleri kitaplığın değil, sizin kodunuzdur —
@knowvah/dot-engine diske hiç dokunmaz. Okunacak bir `input.dot` bulunmayan bir
tarayıcı sekmesinde de değiştirilmeden çalışmasını sağlayan şey budur.

## `-K<engine>` — yerleşim motoru

`-K` yerleşim motorunu seçer; @knowvah/dot-engine aynı adı `renderSvg`'ye
`engine` argümanı olarak ya da `render` işlevinin `opts.engine` alanı olarak
alır. Sekiz motorun hepsi port edilmiştir:

| `-K` değeri | @knowvah/dot-engine `engine` dizesi |
|---|---|
| `-Kdot` | `'dot'` (`engine` verilmediğinde `render` için de varsayılandır) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Her birinin ne yaptığı ve uygunluk sınıfı için
[Yerleşim motorları](/tr/guide/engines) sayfasına bakın.

## `-T<format>` — çıktı biçimi

`renderSvg` yalnızca SVG üretir; başka her şey için `render(g, format, opts?)`
kullanın. @knowvah/dot-engine'in `OutputFormat` birleşim türü şu `-T`
hedeflerini kapsar:

| `-T` değeri | @knowvah/dot-engine `format` dizesi | Notlar |
|---|---|---|
| `-Tsvg` | `'svg'` | `renderSvg`'nin tek çıktısı da budur |
| `-Tdot` | `'dot'` | Yerleşim öznitelikleri (`pos`, `bb`, ...) eklenmiş DOT kaynağı |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot yönergeleri |
| `-Tjson` | `'json'` | JSON olarak tüm graf |
| `-Tplain` | `'plain'` | Boşlukla ayrılmış düğüm/kenar geometrisi |
| `-Tplain-ext` | `'plain-ext'` | `plain`, ayrıca kenarlardaki port koordinatları |
| `-Timap` | `'imap'` | Sunucu taraflı HTML görsel haritası |
| `-Tcmapx` | `'cmapx'` | İstemci taraflı HTML `<map>` öğesi |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Desteklenmeyenler:** raster biçimler (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` ve GUI/etkileşimli arka uçlar. Bunlar bilinçli bir
kapsam sınırıdır — hedef dışı öğelerin tam listesi için
[Bilinen farklılıklar](/tr/divergences) sayfasına bakın. Bir raster görsele
ihtiyacınız varsa `'svg'` olarak işleyin ve sonraki aşamada dönüştürün
(başsız bir tarayıcı, `resvg` veya benzeri bir araçla).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — öznitelikler

CLI'nin genel öznitelik bayrakları, komut satırından her graf/düğüm/kenar için
bir varsayılan belirler. @knowvah/dot-engine'in komut satırı bayrakları yoktur —
aynı öznitelikleri doğrudan DOT kaynağında ya da grafı kodla oluşturuyorsanız
oluşturucu API'si üzerinden ayarlayın:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Oluşturucu API'sinin tamamı için
[Kodla graf oluşturma](/tr/guide/build-a-graph) sayfasına bakın.

## CLI'nin doğrudan veremediği geometriyi alma

`-Tplain`, tam olarak betiklerin düğüm/kenar koordinatlarını metin çıktısından
kazıyabilmesi için vardır. @knowvah/dot-engine bu gidiş dönüşü atlar: `render`
işleminden sonra `getLayout(g)` çağırarak her düğüm konumunun, her kenar
spline'ının ve genel sınırlayıcı kutunun türlendirilmiş, JSON'a
dönüştürülebilir bir anlık görüntüsünü alırsınız — ayrıştırılacak bir metin
biçimi yoktur.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Anlık görüntünün tam yapısı ve `yAxis` seçeneği (yerel graphviz y ekseni
yukarı, tarayıcılar y ekseni aşağı çalışır) için
[Hesaplanan geometriyi okuma](/tr/guide/geometry) sayfasına bakın.

## Yazı tipleri ve görseller: CLI dosya sisteminizi okur, @knowvah/dot-engine okumaz

Yerel `dot`, metni makinede kurulu olan yazı tipleriyle ölçer ve
`image="..."` özniteliklerini çalışma dizinine göre dosyaları okuyarak çözer.
@knowvah/dot-engine'in dosya sistemi erişimi yoktur; bu yüzden ikisi de diskten
okunmak yerine ana uygulama tarafından enjekte edilir:

- **Metin ölçümü** — `setTextMeasurer` bir `TextMeasurer` kurar; siz hiçbir
  şey ayarlamazsanız kitaplık makul bir varsayılanı kendiliğinden seçer
  (tarayıcı canvas'ı veya Node'da belirlenimci bir ölçü modeli). Bkz.
  [Metin ölçümü](/tr/guide/text-measurement).
- **Görseller** — `setImageSizer` (ve satır içine yerleştirme için
  `setImageResolver`), görselin iç boyutlarını ve görsel verisini kendinizin
  sağlamasına izin verir; çünkü @knowvah/dot-engine sizin adınıza bir dosyanın
  durumunu sorgulayamaz. Bkz. [Görsellerle çalışma](/tr/guide/images).

## Ayrıca bakın

- [Yerleşim motorları](/tr/guide/engines)
- [Diğer biçimlere işleme](/tr/guide/render-formats)
- [Hesaplanan geometriyi okuma](/tr/guide/geometry)
- [Bilinen farklılıklar](/tr/divergences)
- [Başlarken](/tr/guide/getting-started)
