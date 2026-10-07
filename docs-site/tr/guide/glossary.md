---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Sözlük

Terim başına bir tanım; İngilizce terime göre alfabetik sıradadır (başlık sırası
İngilizce sayfayla aynı tutulmuştur). Her biri, terimi ayrıntılı ele alan kılavuz
sayfasına (veya kaynağa) bağlanır.

## Küme

Adı `cluster` ile başlayan bir alt graf (ör. `subgraph cluster_build`) — Graphviz onu,
üye düğümlerini gruplayan ayrı bir kutu olarak çizer. İçeride, @knowvah/dot-engine'in
geometri anlık görüntüsü her küme alt grafını DOT kaynağındaki adla değil, `cluster6` gibi
konuma dayalı bir adla yeniden anahtarlar (`ClusterGeometry.name`); bu yüzden özgün ada
ihtiyaç duyan bir tüketici, yerleşimden önce bir `idByName` eşlemesi oluşturur ve ardından
`snapshot.clusters` değerini yeniden anahtarlar. Yeniden anahtarlama deseni için
[Tarifler](/tr/guide/recipes), `addSubgraph` ile küme oluşturma için
[Kodla graf oluşturma](/tr/guide/build-a-graph) sayfasına bakın.

## Uygunluk

Bir @knowvah/dot-engine işlemesinin C kâhini ile “eşleştiği” iddiasının arkasındaki,
mekanik olarak denetlenen özellik. İki SVG de normalleştirilmiş öğe ağaçlarına
ayrıştırıldıktan sonra her sayısal değer (koordinatlar, yol verisi, `points`) sabit bir
tolerans içinde uyuşmalıdır — deterministik motorlar (`dot`, `circo`, `twopi`, `osage`,
`patchwork`) için **±0,01pt**, yinelemeli kuvvet yönlendirmeli motorlar (`neato`, `fdp`,
`sfdp`) için **±0,5pt** — ve her sayısal olmayan değer (etiketler, renkler, metin) birebir
aynı olmalıdır. Bu, bayt düzeyinde SVG çıktısı iddiası değildir. Bkz.
[Uygunluk](/tr/conformance).

## Koordinat çerçevesi / y ekseni

Graphviz'in yerel koordinat sistemi **y-yukarı** yönlüdür ve başlangıç noktası sol alt
köşedir; tarayıcılar ve ekranlar ise **y-aşağı** yönlüdür ve başlangıç noktası sol üst
köşedir. `getLayout` varsayılan olarak `yAxis: 'down'` kullanır (her y değerini çevirir ve
`bounds` değerini `(0, 0)` noktasına normalleştirir) ve yerel graphviz koordinatlarını
değiştirmeden döndürmek için `yAxis: 'up'` kabul eder. xdot çizim işlemleri
(`getDrawOps` çıktısı) her zaman yerel y-yukarı çerçevesindedir. Bkz.
[Hesaplanan geometriyi okuma](/tr/guide/geometry).

## Farklılık

Bir @knowvah/dot-engine işlemesi ile kâhin arasındaki, araştırılmış, kök nedeni
bulunmuş ve kataloglanmış bir fark — sessizce hoşgörülen farkın tersine. Kataloglanmış
farklılıklar üç sınıftan birine girer: kabul edilmiş sapmalar (kasıtlı olarak uygun hale
getirilmeyenler, ör. platformlar arası kayan nokta belirsizliği), hâlâ kapatılmakta olan
izlenen bir uzun kuyruk ve açık hedef dışı durumlar. Listelenmemiş bir fark, kabul edilmiş
davranış değil, kusur sayılır. Bkz. [Bilinen farklılıklar](/tr/divergences).

## DOT

Graf tanımlama dili — düğüm, kenar ve öznitelik deyimleriyle `digraph { ... }` /
`graph { ... }` — @knowvah/dot-engine sonucu bir yerleşim motoruna vermeden önce bunu
ayrıştırır. Bkz. [Başlarken](/tr/guide/getting-started).

## Görsel boyutlandırıcı / çözümleyici

Harici görseller (usershape düğümleri ve `<IMG>` HTML etiket hücreleri) için enjekte
edilebilir iki genişletme noktası. Bir `ImageSizer`, bir görselin doğal genişlik/yüksekliğini
bildirir; böylece piksel verisi yüklenmeden düğüm boyutlandırma ve etiket yerleşimi
sürdürülebilir; bir `ImageResolver` ise işleme sırasında gömülecek gerçek görsel baytlarını
sağlar. Bkz. [Görseller](/tr/guide/images).

## Yerleşim motoru

@knowvah/dot-engine'in kaydettiği ve ada göre seçilen (`renderSvg(dot, engine)`) sekiz
yerleşim algoritmasından biri: `dot` (hiyerarşik/katmanlı), `neato` (yay modeli,
Kamada–Kawai), `fdp` (kuvvet yönlendirmeli), `sfdp` (çok ölçekli kuvvet yönlendirmeli,
büyük graflar için), `circo` (dairesel), `twopi` (radyal), `osage` (kümelenmiş) ve
`patchwork` (kareleştirilmiş ağaç haritası). Bkz. [Yerleşim motorları](/tr/guide/engines).

## Kâhin

Kanonik C kaynağından derlenen, yerel C Graphviz `dot` ikilisi; her @knowvah/dot-engine
işlemesi buna karşı doğrulanır. @knowvah/dot-engine, referans ile port arasında ABI
kaymasını önlemek için bu ikiliyi doğrudan çalıştırır (hiçbir zaman bir WASM derlemesini
değil). Kâhin karşılaştırmalarının nasıl yürütüldüğü ve raporlandığı için bkz.
[Uygunluk](/tr/conformance) ve [Parite](/parity).

## Rank / rankdir

`dot`'un hiyerarşik yerleşiminde **rank**, çizimde aynı derinliğe yerleştirilen bir
düğüm katmanıdır. `rankdir`, rank'lerin akış yönünü belirler — varsayılan `TB` (yukarıdan
aşağıya) veya `LR`, `BT`, `RL` — graf özniteliği olarak ayarlanır
(`b.setAttr('rankdir', 'LR')`). Bkz. [Kodla graf oluşturma](/tr/guide/build-a-graph).

## Spline / kenar yönlendirme

Bir kenarın boyunca çizildiği eğri (Bézier) yol; düğüm ve küme engellerinin etrafından
dolaşan yönlendirme koduyla hesaplanır. @knowvah/dot-engine, yönlendirilmiş kontrol
noktalarını `getLayout` çıktısında `EdgeGeometry.points` olarak sunar — nokta (point)
cinsinden sıralı bir `{x, y}` noktası dizisi. Bkz.
[Hesaplanan geometriyi okuma](/tr/guide/geometry).

## Metin ölçer

Yerleşimden önce düğüm ve kenar etiketi boyutlandırmanın sürdürülebilmesi için etiket
genişliğini/yüksekliğini bildiren, enjekte edilebilir genişletme noktası (`TextMeasurer`).
@knowvah/dot-engine her işlemede birini otomatik çözümler — önce açık bir
`setTextMeasurer`, sonra varsa tarayıcının `<canvas>` öğesi, sonra Node'da yerleşik
deterministik `EstimateTextMeasurer` — veya özel bir uygulama kabul eder. Bkz.
[Metin ölçümü](/tr/guide/text-measurement).

## Usershape

Graphviz'in, şekli çizilmiş bir çokgen veya elips yerine (`image` özniteliği aracılığıyla)
dışarıdan sağlanan bir görsel olan düğümler için kullandığı terim.
@knowvah/dot-engine, kitaplığı tarayıcıda güvenli tutmak için usershape'leri dosyaları
doğrudan okumak yerine enjekte edilebilir görsel boyutlandırıcı/çözümleyici genişletme
noktası aracılığıyla çözümler. Bkz. [Görseller](/tr/guide/images).

## xdot

Genişletilmiş DOT çizim işlemi biçimi: işlenmiş bir grafın tam olarak nasıl boyanması
gerektiğini, boyama sırasıyla anlatan yapılandırılmış bir işlem akışı (dolgu/çizgi rengini
ayarla, yazı tipini ayarla, bir elipsi veya çokgeni doldur/çiz, bir Bézier çiz, metin çiz).
`getDrawOps`, bu akışı, SVG ayrıştırmadan özel bir işleyiciyi (canvas, WebGL, PDF)
sürmek için türlendirilmiş `XdotOp` değerleri olarak döndürür. Bkz.
[xdot çizim işlemleriyle özel işleme](/tr/guide/xdot-drawops).
