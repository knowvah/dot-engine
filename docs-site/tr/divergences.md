---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# C Graphviz'den bilinen farklılıklar {#known-divergences-from-c-graphviz}

@knowvah/dot-engine, kanonik C uygulamasına mümkün olan en yakın sadakati hedefler.
C kaynak kodu belirtimdir; listelenmemiş bir fark, kabul edilmiş bir davranış değil,
bir kusur olarak ele alınır.

> **Burada “eşleşme” ne demek.** `conformant` adlı derlem parite kararı,
> **sıkı bir belirlenimci tolerans**tır; harfi harfine bayt bayt SVG eşitliği
> *değildir*: sayısal koordinatlar ve yollar **±0.01** dahilinde uyuşmalı ve
> sayısal olmayan tüm içerik (etiketler, renkler, metin) tam olarak eşit olmalıdır
> (`compareSvg(…, 'deterministic')`). Bu belge boyunca “eşleşme” ve “uyumlu”,
> bu tolerans kararına işaret eder. Tam tanım:
> [Uygunluk](./conformance.md).

Çıktı *gerçekten* farklı olduğunda, tam olarak üç sınıftan birine girer:

1. **Kabul edilen farklar** — araştırdığımız, kök nedene kadar anladığımız ve
   **bilerek uyumlu hale getirmemeyi seçtiğimiz** farklar. Her biri aşağıda
   sınırlandırılmış, nitelendirilmiş ve gerekçelendirilmiştir. Bunlar hata değildir
   ve belirli, ayrı kapsamlı bir gerekçe olmadıkça “düzeltilmeyecektir”.
2. **Takip edilen uzun kuyruk** — kapatılması *planlanan* bilinen boşluklar; her
   birinin kâhine sabitlenmiş bir düzeltmesi vardır. Bunlar güncel sayılarla
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
   içinde tutulur.
3. **Hedef dışı kalanlar** — bilinçli kapsam sınırları (hiçbir zaman yeniden
   üretmeyi hedeflemediğimiz biçimler ve mekanizmalar).

Yetkili ve sürekli güncellenen kayıtlar
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(yerel `dot`'a karşı girdi başına parite panosu) ve
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(algoritma düzeyinde port durumu envanteri) dosyalarıdır.

Hangi grafların *kabul edildiğinin* (aşağıdaki 1. sınıf) **makine tarafından
okunabilir** yetkili kaynağı
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json)
dosyasıdır. Araçlar bunu rapor zamanında birleştirir: `PARITY-dot.md`, **kabul edilen
farkları** **takip edilen** birikimden ayırır ve kural kapısı izin listesini
buradan alır. Aşağıdaki düzyazı bölümleri her kaydı açıklar (A1 ve A3 geçerlidir;
A2 kapatılmıştır ve geçmiş olarak saklanır); bir CI testi
(`accepted-divergences.test.ts`) kabul edilen her grafın hâlâ farklılaştığını
doğrular; böylece bu liste fark edilmeden çürümez.

---

## Kabul edilen farklar (bilerek uyumlu hale getirmiyoruz) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Bir farkı — bayt eşitliğinin peşinden koşmak yerine — yalnızca aşağıdakilerin
**hepsi** geçerliyse kabul ederiz:

- Kök neden, portta bir mantık hatası değil, bir **taşınabilirlik kısıtıdır**
  (JavaScript/tarayıcı çalışma zamanının tam olarak yeniden üretemediği bir şey).
- Fark **algılanamaz** düzeydedir ve kanıtlanabilir biçimde **sınırlıdır**.
- Bir düzeltmenin, getirisine kıyasla **orantısız maliyeti ve etki alanı** olurdu
  (tipik olarak: yüzlerce zaten uyumlu grafın kullandığı ortak bir ilkel yapıya
  dokunur ve bir pikselin kesri kadar kazanç için gerileme riski taşırdı).

Bir farkı kabul ettiğimizde, tüketicilerin hiçbir zaman şaşırmaması için burada
nitelendiririz. Kabul edilen bir farktan etkilenen graflar, bayt çıtası yerine
**yapısal / tolerans** çıtasına karşı doğrulanır.

### A1. Kayan nokta belirlenimciliği (kuvvet yönelimli motorlar) {#a1-floating-point-determinism-force-directed-engines}

**Etkilenenler:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (yinelemeli,
yay modelli motorlar). `dot` motorunun *yerleşimi* bu yinelemeli model
belirlenimciliğinden **etkilenmez**; `dot` spline yönlendirmesindeki ayrı ve dar
sınırlı bir kayan nokta farkı aşağıdaki **A3** bölümünde ele alınır.

> **Kapsam; tarihsel olarak ölçülmemiş bir uyarıydı — şimdi kısmen ölçülüyor.**
> **Ana dot motoru SVG taraması** (`test/corpus/survey.ts`) hâlâ
> **yalnızca dot içindir**: yerel kâhin, yalnızca `core` + `dot_layout`
> eklentilerini sembolik bağlayan `GVBINDIR=/tmp/ghl` altında çalışır
> (`test/corpus/gen-headless-gvbindir.sh` tam olarak `core dot_layout` üzerinde
> döner — `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` yerleşim eklentisi yoktur)
> ve hem kâhin hem port `dot` motoruyla çağrılır. Dolayısıyla `*_neato` /
> `*_circo` / `root_twopi` gibi derlem kimlikleri, o taramada yerel motorlarıyla
> değil `dot` ile yerleştirilen *dosya adlarıdır* ve A1 orada **sıfır** grafla
> eşleşir — motorların uyumlu olduğu kanıtlandığı için değil, o tarama onları hiç
> çalıştırmadığı için.
>
> **Ancak altı A1 motorunun hepsinin artık kendi yerel motor taraması var**;
> `test/corpus/engine-walk.ts` + `parity-report.ts` aracılığıyla
> (`GVBINDIR`'den bağımsız — her biri doğrudan `dot -K <engine> -Txdot`
> çalıştırır), aşağıda ayrı ayrı belgelenen iki farklı titizlik düzeyinde:
> `circo`/`twopi`/`osage`, dot taramasıyla aynı **±0.01 belirlenimci**
> toleransta ve kimlik başına kök neden triyajıyla çalışır (aşağıda “Motor hattı
> kabulü”); `neato`/`fdp`/`sfdp` ise henüz kimlik başına triyaj olmaksızın daha
> gevşek bir **±0.5 nitelendirme** toleransında çalışır (aşağıda “Yinelemeli motor
> nitelendirmesi”). Motorlar arası güncel sayılar:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Nitelendirme.** Bu motorlar, sonuçları kayan nokta yuvarlamasına bağlı olan
yinelemeli sayısal yerleşimler çalıştırır — özellikle JavaScript motorları ve CPU
mimarileri arasında farklılaşabilen birleşik çarp-topla (FMA) ve `Math.pow`.
Port, mümkün olduğunda C'nin işlem sırasını izler (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — örneğin `sfdp`, eşleştirilmiş bir PRNG ve `fma` ile
yerel kâhine karşı ~6 anlamlı basamağa sabitlenir — ancak tam ve özdeş koordinat
üretimi **platformlar arası garanti edilmez**. Topoloji korunur; olası fark ince
düğüm koordinatlarındadır.

**Neden kabul edildi.** Bu, bir tasarım tercihi değil, JS'de çalışmanın katı bir
kısıtıdır — A3'ün Apple-`hypot` duyarlılığıyla aynı aile. Tüm hedef çalışma
zamanlarında bit düzeyinde özdeş aşkın fonksiyon/FMA sonuçlarını garanti etmenin
bir yolu yoktur; bu yüzden bir bayt çıtası yalnızca pahalı değil, sınanamaz olurdu.
**A1'i değerlendirmek** (yalnızca uyarıyla geçiştirmek yerine) ayrı bir yerel motor
parite hattı gerektirdi — 2026-07-11'de `test/corpus/engine-walk.ts` +
`parity-report.ts` olarak kuruldu; her girdiyi `dot` yerine kendi motoruyla tarar.
Bu çalışmanın dürüst tavanı, A1'i “başvuru platformunda etkin fark yok” düzeyine
**daraltmaktır**; platformlar arası uyarıyı asla ortadan kaldırmak değil; şimdiye
kadarki sonuçlar (aşağıda) bu tavana uyar: `circo`/`twopi`/`osage` her biri bir
avuç gerçek A1/A9 örneği ortaya çıkarıp kök nedenine indirdi; `neato`/`fdp`/`sfdp`
ise 910 öğelik evrende yerel çıktının 0.5pt içinde sırasıyla %90,8/%77,5/%68,0
düzeyinde — yani taşınan aritmetik (`fma.ts`, `arm-pow.ts`, eşleştirilmiş PRNG)
graflarının çoğu için geçerli — ve kalan her farklılaşan kimlik, triyajsız bir
sürüklenme olarak bırakılmak yerine enjeksiyonla (çözücü sürüklenmesi ile port
kusuru) tek tek nedene bağlanmıştır; aşağıdaki yinelemeli motor nitelendirmesine
bakın.

**Motor hattı kabulü: twopi oklar ailesi.** <a id="a1-twopi-arrows-family"></a>
Yukarıdaki alıntı bloğu, A1'in sıfır grafla eşleştiği dot motoru SVG taramasını
anlatır; ayrı `twopi` **xdot motor hattı** (`parity-twopi.json`, yerel
`dot -K twopi -Txdot` kâhini, `test/corpus/engine-walk.ts`) ise yerel motoruyla
*çalışır* ve 9 derlem kimliğinde somut, doğrulanmış bir A1 örneği ortaya çıkarır:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
ve (2026-07-28'de eklendi, 905 öğelik evrene yeni) directed/ kardeşi
`tree-graphs-directed-oldarrows` — her biri tek bir baskın kenarda
(`Z->I` veya `i->Z`; 12–64 çizim işlemi farkı) ayrışır. Enjeksiyon A/B (karar günlüğü,
2026-07-10 “injection A/B verdicts: twopi arrows family EXONERATED...” kaydı)
mekanizmayı doğrudan kanıtladı: yerel `spline_edges`'in giriş `ND_pos` değerini
dökümleyip portun `splineEdgesShifted` işlevine enjekte etmek, `graphs-arrows`
üzerinde **tamamen uyumlu** çıktı üretir (`Z->I`, kâhinle bayt bayt özdeş olur,
aynı 7/14 noktalı spline) — yani fark %100 `twopi`'nin PRISM çakışma giderme
çözücüsünden çıkan yönlendirme öncesi düğüm konumu sürüklenmesidir ve portun spline
yönlendirmesi/üretimi aklanmıştır. 8 kimlikten 6'sında görünür belirti, bezier nokta
sayısı değişimidir (`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`'ın
uydurduğu parça sayısı, sürüklenmiş düğüm konumunun bir engel sınırının hangi
tarafına düştüğüne duyarlıdır; bu yüzden PRISM'in yinelemeli çözümünden sonra ULP
altı bir konum farkı, uydurulan spline'ın segment sayısını değiştirir (diğer 2
kimlik, `graphs-arrowsize`/`nshare-arrows_dot`, aynı sürüklenmeyi parça sayısı
değişimi olmadan daha küçük, yalnızca konumsal bir fark olarak gösterir). Motor
hattı düzeyinde `test/corpus/accepted-divergences-engines.json` aracılığıyla kabul
edilir; `parity-report.ts` bunu `PARITY-twopi.md` ile birleştirir — `accepted.ts`'in
dot hattı `PARITY-dot.md` için yaptığı birleştirmenin aynısı.

`oldarrows` kök neden analizi (2026-07-28), ailenin nokta sayısı belirtisinin tam
değişim noktasını belirledi. `i`–`Z`–`I` yelpazesi bir halka çapı üzerinde doğrusaldır
ve pathplan `directVis`'in `intersect()` işlevi, bir engel köşesi doğru parçası
“üzerinde” olduğunda görüş hattını keser — burada `wind()`'in 1e-4 doğrusallık
toleransı, doğru parçasından 270pt uzaktaki bir düğümü bile doğrusal sayar ve
`inBetween()` (doğrusallığı varsayar) bu durumda yalnızca **x izdüşümünü**
sınamaya indirgenir: köşe, ancak x değeri iki uç nokta x koordinatı arasındaki
ULP genişliğindeki aralığın kesinlikle içine düşerse keser. İki aynalı radyal
kenardan hangisinin büküleceği bu yüzden, PRISM çözümünden çıkan nominal olarak
eşit üç x değerinin son ULP sıralamasına bağlıdır — C `Z->I`'yı bükerek (`i`
düğümünün eksen köşesi kendi aralığının içine düşer), port `i->Z`'yi bükerek
(`I` düğümünün köşesi kendi aralığının içine düşer). `directVis`'i her tarafın
dökümlenmiş engel kümesi üzerinde çevrimdışı yeniden oynatmak her tarafın kararını
birebir yeniden üretir ve kâhinin yönlendirme öncesi `ND_pos` değerini porta
enjekte etmek 0 fark verir (`attribution-twopi.json`) — yönlendirme ve üretim bayt
bayt sadıktır.

`1855`, aynı yönlendirme öncesi PRISM kayan nokta mekanizmasının radyal/yıldız
**ayna** varyantıdır (2026-07-11'de kabul edildi): 31 yaprağı tam olarak eşdairesel
olduğundan yıldız yerleşimi yansıma simetriktir ve PRISM'in çakışma giderme işlemi
simetri açısından kararsız bir dengede durur; `circleLayout`'un `setAbsolutePos`
işlevinde 5 yaprak açısında V8 ile libm arasındaki 1 ULP'lik `cos`/`sin` farkı
ters ayna havzasını seçer ve tüm radyal yerleşim kâhininkinin tam x ekseni aynası
olarak oturur (azami düğüm kayması 6.04pt, bb korunur). Enjeksiyon A/B iki yönü de
kanıtladı: C'nin tam `circleLayout` konumlarını portun PRISM'ine beslemek kâhini
düğüm düğüm yeniden üretir (3e-14); yalnızca ULP açısından ayrışan 5 yaprak
konumunu geri yüklemek tüm yerleşimi portun aynasına geri çevirir. Tam kök neden
analizi: `.agent-notes/twopi-radial-drift-rca.md` (karar günlüğü 2026-07-11).

**Yinelemeli motor nitelendirmesi: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Yukarıdaki `circo`/`twopi`/`osage` motor hatlarının aksine, `neato`/`fdp`/`sfdp`
henüz kimlik başına triyaj edilmemiştir — `engine-walk.ts` bu üçü için
`tolerance: 0.5` alanı kaydeder ve `parity-report.ts` onları
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
içinde ayrı bir “Iterative engines (±0.5 characterization)” bölümünde işler;
bu bölüm bu belgedeki başka yerlerde geçen ±0.01 belirlenimci geçme oranlarıyla
açıkça **karşılaştırılamaz**. Güncel sayılar (910 öğelik evren; geçme yüzdesi, C
kâhininin işleyemediği girdileri dışarıda bırakır, bkz. [Uygunluk](./conformance.md)):

| motor | taranan | ±0.5pt içinde | uyumlu olmayan (hepsi nedene bağlı, kabul edilmiş) | port hatası / zaman aşımı | kâhin hatası |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (%90,8) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (%77,5) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (%68,0) | 290 | 1 | 0 |

(2026-07-11'de 762 öğede yapılan ilk tarama ±0.5pt içinde 263/311/260 ölçmüştü —
güncel oranlara sıçrama, o tarihten beri girilen kimlik başına düzeltmelerden
geldi; başlıcaları neato'nun taşınmamış `user_pos`/`P_SET` işlenişi, motor
başlatma birleştirmesi ve `setEdgeType` makro-işlev düzeltmesidir.)

İlk taramanın aksine, ayrışan her satır artık tek tek nedene bağlanmıştır:
enjeksiyon düzeneği (`test/corpus/attribute-divergence.ts`) yerel kâhinin
yönlendirme öncesi `ND_pos` değerini porta besler ve yeniden karşılaştırır; güncel
her ayrışan kimlik ya `drift-exonerated`'dır (çözücü sürüklenmesi kaldırılınca
portun yönlendirmesi ve üretimi kâhini tam olarak yeniden üretir) ya da ayrıca
kabul edilmiş birkaç kimlik başına artıktan biridir (`241_0`'ın üç motorun
hepsindeki CDT iç çember beraberliği, neato `2239`, sfdp `42`/`2556`). Aşağıdaki
sınıf kabulü, aklanan kümeyi resmileştirir; güncel sayılar motor başına panolarda
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**A1-drift sınıf kabulü (yinelemeli motorlar, hesaplanan üyelik).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`,
yinelemeli motor başına (`neato`, `fdp`, `sfdp`) bir `"A1-drift"` **sınıf** kaydı
taşır — `{ class: true, attributionFile, ref }` — yukarıdaki `circo`/`twopi`/`osage`
hatlarında kullanılan kimlik başına kayıtlardan farklıdır (D2,
`plans/iterative-parity-campaign/decisions.md`). Kimlik başına bir kaydın aksine,
sınıf üyeliği kayıt defterinde asla elle sayılmaz: `parity-report.ts` bunu rapor
zamanında eşleşen `attribution-<engine>.json` dosyasından hesaplar (T1'in
enjeksiyon-nedenlendirme düzeneği, `test/corpus/attribute-divergence.ts`) — yerel
yönlendirme öncesi `ND_pos` değeri porta enjekte edilip yeniden karşılaştırıldığında
±0.5'te uyumlu çıkan her ayrışan kimlik, o dosyada `verdict: 'drift-exonerated'`
alır; bu, iki motorun yinelemeli çözücülerinin sayısal olarak farklı ama her biri
kendi içinde tutarlı yerleşimlere yakınsadığı anlamına gelir (yukarıdaki A1
nitelendirmesine göre bir kayan nokta birikim farkı; bir port yönlendirme ya da
üretim hatası değil). Kimlik başına kanıt — kova biçimi, taban ve enjekte edilmiş
fark sayısı, düzgün öteleme/ayna tespiti — bu belgeye veya kayıt defterine
kopyalanmaz, nedenlendirme çıktısının kendisinde yaşar (D2). Daha sonra tümüyle
geçmeye başlayan ya da yeniden nedenlendirmesi kararını değiştiren bir kimlik,
bir sonraki rapor yenilemesinde sınıftan otomatik olarak düşer — bayat bir kabul
düzenlemesi gerekmez ve koruma testi başarısız olmaz. `attribution-<engine>.json`
dosyası henüz üretilmemiş motorlarda sınıf, sıfır üyeyle “attribution pending”
olarak görünür; bu, hiç kabul olmamasıyla aynıdır — sınıf kaydının verisinden önce
gelmesine izin verilir (bkz. `test/corpus/accepted-divergences-engines.test.ts`).

### A2. Metin ölçümü (yazı tipi metrikleri) → etikete bağlı yerleşim — KAPATILDI <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Durum (2026-07-01): kapatıldı.** Bu sınıf altında artık kabul edilen derlem
kimliği yoktur; bölüm, mekanizmanın ve onu etkisiz kılan enjekte edilebilir
`TextMeasurer` genişletme noktasının tarihsel belgesi olarak korunur. Ardışık metin
ölçümü düzeltmeleri (`EstimateTextMeasurer` geçişi, yazı tipine duyarlı dikey
metrikler, ASCII dışı UTF-8 bayt düzeltmesi) burada eskiden bulunan etikete bağlı
yerleşim farklarının hemen hepsini çözdü. Eski kanonik A2 örneği **`proc3d`**, üç
derlem dizininin hepsinde (`graphs-`/`share-`/`windows-proc3d`) tamamen
**`conformant`**'tır: eşleşen bbox, sıfır yol verisi farkı, sıfır etiket çapası
farkı.

**Son üyeler emekli oldu (2026-07-01).** **`NaN` ailesi**
(`graphs-NaN` / `share-NaN` / `windows-NaN`), düğüm geometrisi C ile zaten tam
olarak eşleştiği (76/76 başvuru noktası) hâlde uzun süre burada tutuldu. Gerçek
artığı — dört karşıt 2-döngü çiftindeki (`Target↔TThread`, `Interp↔InterpF`,
`Event↔Target`, `AtomProperties↔NRAtom`) 6–14 pt kayan 8 düz kenar uç noktası —
yeniden teşhis edildi ve **hiçbir yazı tipi metriği etkisi olmadığı**, dot'un çoklu
kenar yönlendirmesindeki iki port kusuru olduğu ortaya çıktı (görev
`plans/fix-nan-a2-retire/`, `.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Karşıt çift şerit sırası.** Port, Multisep şerit ofsetlerini atamadan önce
   her paralel kenar grubunu özgün oluşturma sırasına göre yeniden sıralıyordu;
   C ise şeritleri edgecmp toplama sırasıyla atar (önce MAINGRAPH ileri temsilci,
   ikinci olarak AUXGRAPH ters üye — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Ters üyesi önce bildirilmiş bir 2-döngü, her
   kenarı diğerinin 18 pt'lik koridoruna çiziyordu.
2. **Sıralar arası birleştirilmiş kenarlarda sahte düz komşuluk.** `markAdjacent`,
   C'nin aynı sıra korumasını (`flat.c:272-276`) uygulamadan `ND_other`
   girdilerini işaretliyordu; bu da `groupSize`'ın düz komşuluk kısa devresinin
   portcmp grup kesimlerini yutmasına yol açıyordu.

İkisi de sadakatle düzeltilince aile, üç dizinin hepsinde **`conformant`** oldu
(öğe başına: farklı düğüm 0, farklı kenar 0) ve aynı mekanizma `42`, `clust2`,
`ngk10_4`'ü (structural-match → conformant) kapattı ve `b124`'ü diverged'dan
structural-match'e taşıdı — hepsi 2-döngü/paralel çiftlerde.

**Anket yapılan her iki taraf da aynı kestiriciyi çalıştırır — ölçüm etkisiz kılınmıştır.**
Yerel `dot` kâhini, yalnızca `core` ve `dot_layout` eklentilerini sembolik bağlayan
başsız bir `GVBINDIR` altında çalışır (`test/corpus/gen-headless-gvbindir.sh` →
`/tmp/ghl`) — `gd`/`pango`/`quartz` metin yerleşimi eklentisi yoktur. Bu yuva boş
olduğunda graphviz, yerleşik `estimate_textspan_size` işlevine geri döner.
TypeScript portunun `EstimateTextMeasurer`'ı (`src/common/textmeasure.ts`) aynı
yordamın sadık bir portudur ve `createMeasurer()`
(`src/common/textmeasure-factory.ts`) tarafından çözümlenen Node varsayılanıdır.
**Bu nedenle her parite karşılaştırmasının her iki tarafı da metni özdeş kestiriciyle
ölçer** — gerçek FreeType/pango glif ilerlemeleri karşılaştırmaya hiç girmez. Bu
yüzden buradaki bir karar gerilemesi bir yazı tipine değil yerleşim koduna işaret
eder; ve kestiricinin kendi hatalarını düzeltmenin (UTF-8 bayt sayımı, dikey
metriklerde yazı tipi farkındalığı) bu sınıfın çoğunu, yalnızca bir yazı tipi metriği
boşluğunu daraltmakla kalmayıp doğrudan kapatmasının nedeni budur.

**Enjekte edilebilir `TextMeasurer` genişletme noktası.** Bu etkisizleştirme
yalnızca, metin ölçümünün iki motora da sabit bağlanmamış, bilinçli bir genişletme
noktası olması sayesinde mümkündür. `TextMeasurer`, her etiket boyutlandırma çağrı
noktasına bağımlılık enjeksiyonuyla verilen tek yöntemli bir arayüzdür
(`measure(text, font, size, flags) → {w, h, …}`) —
`polyInit`, `recordInit`, `initEdgeLabels` ve `buildNodeLabel` ölçücüyü bir parametre
olarak alır; hiçbir şey metni genel bir değişken üzerinden ölçmez. Testler/CI için
`setTextMeasurer(...)` veya `GV_TEXT_MEASURER=estimate` ile sabitlenir. Genişletme
noktası ayrıca bir artığın yalnızca ölçüme bağlı olduğunun *kanıtlanmasına* olanak
verir: porta C'nin ölçtüğü tam genişlikleri (kâhinden yakalanmış) besleyin ve
yerleşimin C'yi tam olarak yeniden üretip üretmediğine bakın. Bu deney, `proc3d` için
A2 kararına başlangıçta izin veren deneydi (aşağıdaki tarihsel eke bakın) — teknik
geçerliliğini koruyor. Tersi ise sınıfı emekli etti: ölçüm anket yapılan her iki
tarafta da kanıtlanabilir biçimde etkisiz kılındığından, `NaN` kenar artığı bir
yazı tipi metriği etkisi olamazdı; bu da yukarıdaki iki yönlendirme kusurunu bulan
yeniden teşhisi zorunlu kıldı.

::: details Tarihsel analiz (2026-06-30'da geçerliliğini yitirdi) — kayıt için saklanıyor
Aşağıdaki malzeme, `EstimateTextMeasurer` geçişi, yazı tipine duyarlı dikey
metrikler ve ASCII dışı UTF-8 bayt düzeltmesi bu sınıfın çoğunu kapatmadan önceki
daha eski bir durumu anlatır. Artık güncel davranışı anlatmaz — yalnızca buraya
götüren akıl yürütme kaybolmasın diye saklanır. Özellikle: (1) aşağıdaki ölçüm
tablosundaki “yerel C” genişlik sayıları, gerçek yazı tipli bir işleme yolundan
gelen **FreeType** değerleridir; parite taraması bu yolu hiç çalıştırmaz — her iki
taraf da `estimate_textspan_size` çalıştırır (yukarıya bakın) — dolayısıyla tablo,
paritenin şu anda nasıl ölçüldüğünü yansıtmaz; (2) aşağıdaki bindirme şekilleri ve
golden/ours işlemeleri, parite taramasının parçası olmayan, **derlem dışı** bir
`proc3d`'yi (`graphs/directed/proc3d.gv`, ~2620 pt) betimler; derlemdeki `proc3d`
varyantları artık sıfır farkla uyumludur, bu nedenle onlar için gösterilecek bir
bindirme yoktur; (3) aşağıdaki `NaN`/`ratio=compress` düğüm-x anlatısı geçerliliğini
yitirmiştir — güncel ölçüm 76 düğüm noktasının tamamının tam olarak eşleştiğini
gösteriyor; dolayısıyla tarif ettiği genişlik hatası → düğüm kayması zinciri artık
`NaN` için geçerli değildir.

**`ratio=compress` altında `NaN` (tarihsel).** `NaN.gv` ailesi
(`orientation=landscape; ratio=compress; size="16,10"`), o zamanki kararı
*structural-match* yerine *diverged*'a düşen bir A2 örneğiydi. compress x-ağ
simpleksi yolu sadıktı — her kısıt girdisi C ile eşleşiyordu (genişlik kısıtı değeri,
`containNodes` minlen'leri, 471/wt 1612 yardımcı kenar sayıları, `lrBalance` ve sıra
düzenlerinin hepsi özdeşti) *yalnızca* ölçücünün C'den 0.5–1.03 pt daha geniş
bildirdiği 9 düğümün yarım genişlikleri hariç. `ratio=compress`'in ağırlık-1000
paketlemesi, normalde gevşek olan soldan sağa ayrım kısıtlarını **bağlayıcı** hale
getirdi; böylece compress olmadan görünmez olan bu piksel altı genişlik hatası,
−3..−5 pt'lik bir iç x kayması olarak yüzeye çıktı. Bu kayma `Target<->TThread` düz
spline'ını bir düğüm kutusu duvarının 0.55 pt ötesine itti; yönlendirici onu fazladan
bir bezier parçasına büktü (C'nin 4'üne karşılık 7 nokta) — *yapısal* bir fark, dolayısıyla
*diverged*. 9 genişliği C'nin değerlerine zorlamak C'yi tam olarak yeniden üretti
(düğüm-x 53/76→0/76 sapma; spline 7→4 nokta); bu, **o eski fark için** artığın %100
yukarı akıştaki yazı tipi metrikleri olduğunu, compress ya da spline kodu olmadığını
doğruladı. Tam kanıt (görsel golden-ile-bizimki yan yana ve 4-ya-karşı-7 noktalı
spline farkı bindirmesiyle):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (düzyazı
yazımı: `…/nan-compress-xcoord.md`).

**Yazı tipi metriği ölçüm örneği (tarihsel — FreeType ile kestirim).**
Yerel Graphviz, gerçek bir metin yerleşimi eklentisiyle çalıştırıldığında (parite
taramasında kullanılan başsız kâhinle değil) metni FreeType/libgd glif ilerlemeleriyle
ölçer. Portun `EstimateTextMeasurer`'ı bir glif rasterleştiriciyi yinelemez. Çoğu
dizgede ikisi tam olarak uyuşur; bazılarında bir puntonun kesri kadar ayrışırlar.
Ölçülmüş örnek — Times-Roman 14 pt, `"/home/ek/work/src/lefty/lefty.c"` dizgesi
(31 karakter):

| | genişlik |
|---|---|
| yerel C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (kestirim) | 176.75 pt |
| fark | **+0.75 pt (+%0,43)** |

Aynı düğümün diğer etiket satırı `"93736-32246"` **özdeş** ölçüldü (ikisinde de
96.00 pt) — hata dizgeye bağlıdır ve düzgün bir ölçek çarpanı değil, glif başına
birikir. Bu FreeType-ile-kestirim boşluğu gerçektir ancak parite taramasının
ölçtüğü şey **değildir** (her iki taraf da `estimate` çalıştırır); yalnızca
@knowvah/dot-engine çıktısı bu tarama dışında gerçek yazı tipli bir C işlemesiyle
karşılaştırılsaydı önem taşırdı.

**Eski `proc3d` farkı üzerindeki aşağı akış etkisi (tarihsel).** Etiket genişliği
düğüm boyutunu, o da yerleşimi besler:

1. Daha geniş bir etiket → biraz daha geniş bir düğüm kutusu (bir *elips* düğüm için
   genişlik ayrıca √2 ile ölçeklenir; dolayısıyla +0.75 pt metin → +0.53 pt yarım
   genişlik).
2. Düğüm yarım genişlikleri, x koordinatı ağ simpleksinin soldan sağa ayrım
   kısıtlarını belirler; bu kısıtlar tamsayıya `ROUND()` edilir, dolayısıyla piksel
   altı bir genişlik değişikliği bir kısıtı *N*'den *N+1*'e itebilir.
3. Ağ simpleksi bu durumda farklı — ama eşit derecede en iyi — bir tamsayı x ataması
   seçer ve bazı düğüm x konumlarını 1–2 birim kaydırır.

Derlem dışı `proc3d.gv` için (`graphs/directed/proc3d.gv`, ~2620 pt, parite
taramasının üyesi değil) bu, x kapsamında **≤ 3.55 pt**'lik bir fark (**%0,13**)
üretti; aşağıda bindirilmiş olarak — **yeşil = yerel C `dot` (golden), kırmızı =
@knowvah/dot-engine (bizimki)**:

![proc3d golden ve bizimki bindirmesi: yeşil = C, kırmızı = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Yakınlaştırıldığında saçak neredeyse tamamen uzun dosya yolu oval etiketlerinde
görünüyordu:

![proc3d bindirmesi, geniş yol etiketi ovallerine yakınlaştırılmış: yeşil = C, kırmızı = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — yerel `dot` | Bizimki — @knowvah/dot-engine |
|---|---|
| ![C Graphviz ile işlenmiş proc3d](/img/proc3d-golden.svg) | ![@knowvah/dot-engine ile işlenmiş proc3d](/img/proc3d-ours.svg) |

Bağımsız yazım (kök neden, metrik başına sayılar, yeniden üretme komutu) kendi
sayfasındadır:
[**proc3d — kanonik A2 yazı tipi metriği farkı (tarihsel)**](/tr/divergences-proc3d-a2).
Bu sayfa, derlem dışı bir girdideki çözülmüş bir farkı anlatır; güncel derlem
`proc3d` varyantları uyumludur.

**Bunun o zaman neden kabul edildiği.** FreeType'ın glif başına ilerlemelerini her
yazı tipi ve dizgede bayt bayt eşleştirmek, metrik tablolarını, ipucu işlemeyi ve
yuvarlamayı yinelemeyi gerektirirdi — büyük, kırılgan ve yine de tam olması
garanti değil. Metin ölçücü ortak bir ilkel yapıdır: derlemdeki her etiket ondan
geçer; bu yüzden tek bir dizgeyi hedefleyen bir düzeltme, algılanamaz bir kazanç
için başkalarını gerileme riskine sokardı.
:::

### A3. Spline yönlendirmesinde `hypot` beraberlik çözümü (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Etkilenenler:** **geometrik olarak simetrik** bir kenar yönlendirme kanalına sahip
`dot` grafları — tipik olarak kısa, simetrik bir düz kenar yayı. Gözlenen örnek:
`2368`; *structural-match* düzeyinde kalır (maxΔ ≈ 10.2 pt, **tek** kenarda,
`376->76`). Aynı beraberlik çözümü, koridor tam ayna simetrik olduğunda yüksek giriş
dereceli bir merkeze giden **uzun** (çok sıralı) bir kenarda da ortaya çıkar:
`graphs-b100` / `graphs-b104` (özdeş kaynak), `Node23730->Node23729`'un tek
düğüm noktasında maxΔ 20 (tam olarak bir sıra satırı) ile ayrışır — her düğüm konumu
ve tüm yukarı akış kutu/çokgen/gergin yol yapısı C ile bayt bayt özdeştir; yalnızca
`findMaxDev`'in hangi ayna simetrik iç noktanın bezier düğümü olacağına dair ~1 ULP'lik
seçimi farklıdır. Kısa düz kenar biçimi `241_1` olarak da ortaya çıkar
(structural-match, maxΔ ≈ 2.4 pt) — C'nin gürültüsünün bunun yerine ilkini
tuttuğu, kâhine sabitlenmiş `241_0`'ın ayrışan kardeşi. Aynı beraberlik çözümü
`2413_1`'de (structural-match, maxΔ 67.65) ve `2413_2`'de (T11 swapBezier-reverse
düzeltmesi geldikten sonra maxΔ ≤99.55 — o zamana kadar dosyanın bildirilen maxΔ
1922.26 değeri, ilgisiz ve ayrıca izlenen bir kusurun egemenliğindedir) etiketli bir
2-döngü geri kenar yarık-koridor bölünmesi ve `graphs-decorate`'te (maxΔ 43.54) tek
bir küme içi etiketli kenar üretir; her durumda iki aday bölme köşesi, konuma bağlı
Apple `hypot` gürültüsü bir kazanan seçmeden önce birbirine 5.7e-13 (2413 ailesi) /
3e-14 (decorate) içinde beraberdir. `2371` (structural-match, maxΔ 16.8) aynı parmak
izini ilgisiz iki kenarda (`g[9263]` `r6837mid--r9687mid`, `g[23859]`
`r38mid--r8699mid`) gösterir: port her ikisinde de kâhinin tam kontrol noktası
dizisi aynasını yayar, düğüm y'si özdeş bir Δ16.8 ile çevrilmiştir (üst/alt bölme
kesirleri yer değiştirmiş). Kökeni, diğer üyelerin DOĞRULANMIŞ güveninden ziyade
**ORTA** güven olarak nitelendirilir: `2371` ~199 bileşen paketler; bu,
pathplan-yerel koordinatları sayfa koordinatlarından ayırır; bu yüzden beraberlik
üç enstrümantasyon denemesinde `route.ts:209` ile canlı olarak ilişkilendirilemedi;
düz kip segmentasyonu ya da kırpma sonrası `recover_slack` kökeni tümüyle
dışlanmış değildir. Tam teşhis:
`plans/residual-cleanup/analysis/2371-mirror.md`. Yönlendirilen kenarların çoğu
etkilenmez.

::: details Graf tanımı (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

**Nitelendirme.** Spline uydurucu (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`), uydurulmuş bir bezier'i azami sapmanın olduğu iç yol
noktasında böler. Kanal simetrik olduğunda iki aday bölme noktası **tam bir
matematiksel beraberliktir** ve kazananı, mutlak koordinatlı bir bezier
değerlendirmesindeki ~1e-14 mertebesinde kayan nokta iptal gürültüsü belirler;
bunun **işareti mutlak konuma bağlıdır**.

C'nin sapma uzaklığı libm `hypot`'tur ve kâhini üreten macOS Apple `hypot`'u,
**hiçbir** taşınabilir `hypot` ile bit düzeyinde eşleşmeyen tescilli bir
uygulamadır (graphviz koordinat rejiminde ona karşı ölçüldü, bit düzeyinde özdeş
oranlar: V8 `Math.hypot` ≈ %63, doğru yuvarlanmış / Arm tarzı bir `hypot` ≈ %84,
fdlibm `hypot` ≈ %90, `sqrt(dx²+dy²)` ≈ %94). Bu ULP gürültüsü yüzünden
**C'nin kendisi tutarlı değildir**: öteleme açısından eş iki yayı **zıt** köşelere
doğru böler. `2368` içinde `376->76` yayı, geometrik olarak özdeş `256->436`
yayının ayna görüntüsüdür:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Farkın tamamı bindirilmiş olarak (`376->76` / `to1` yayında 12× yakınlaştırma) —
**yeşil = C Graphviz, kırmızı = @knowvah/dot-engine**. İkisi de aynı düğüm
sınırları arasındaki aynı sığ aşağı yaydır; C'nin beraberliğinin zıt köşeye doğru
koptuğu karın bölgesinde (orta bezier kontrol noktası) ~1–2 pt kadar ayrışırlar:

![2368 376->76 yayı: yeşil = C, kırmızı = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Geri kalan her şey tolerans dahilinde eşleşir — aynı sınırlayıcı kutu (608×148),
düğüm konumları, etiketler, ok uçları ve diğer tüm kenarlar. Tam işlemeler görsel
olarak ayırt edilemez:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![C Graphviz ile işlenmiş 2368](/img/2368-c.png) | ![@knowvah/dot-engine ile işlenmiş 2368](/img/2368-port.png) |

Port, **ötelemeye göre eşdeğişken** bir beraberlik çözümü kullanır (gerçek bir
beraberlik her zaman ilk dizine çözülür); bu yüzden böyle *her* yayı konumdan
bağımsız olarak aynı şekilde çizer — kendi içinde tutarlıdır ve C'nin gürültüsünün
de ilkini tuttuğu yaylarda C ile eşleşir (örn. `256->436` ve `241_0 5:ne->8:nw`);
yalnızca C'nin gürültüsünün öbür yöne döndüğü yerde (`376->76`) ayrışır. Uç
noktalar, ok ucu hedefi, diğer kenarlar, tüm düğümler, etiketler ve sınırlayıcı kutu
tolerans dahilinde eşleşir; yalnızca tek yayın iç kontrol noktaları kayar (karın
bölgesinde ~1–2 pt).

**Neden kabul edildi.** Apple'ın `hypot`'u, JS motorları ve CPU'lar arasında
**A1**'in FMA/`pow`'undan daha yeniden üretilebilir değildir — aynı taşınabilirlik
kısıtıdır, yalnızca `dot` spline yönlendiricisinde. C'nin *konuma bağlı* seçimini
eşleştirmek, C'nin katı beraberlik çözümünü benimsemek anlamına gelirdi; bu da her
yönlendirilen kenarın geçtiği **ortak bir ilkel yapıdadır**: bunu yapmak `376->76`
eşleşmesini, C'nin öbür yöne düştüğü yaylarda *yeni* uyuşmazlıklarla takas eder
(`241_0`'ı ve bir `cnt=3` düz kenar kâhin durumunu geriletir); bu net bir
sıfırdır ve ayrıca portun ötelemeye göre eşdeğişkenliğinden vazgeçmek demektir. Bu
yüzden tutarlı (eşdeğişken) yönlendiriciyi koruyoruz. Bu, sınırlı, algılanamaz
düzeyde bir `dot` farkıdır — açık bir hata değildir. Tam inceleme:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Kâhin kabul edilmiş bozuk bir durumda (init_rank / pathplan ailesi) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Etkilenenler:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Aile
üyeleri `1939` ve `2825` **uyumludur** ve kaydı yoktur; `2470` ve
`graphs-structs` 2026-07-11'de onlara katıldı (ikisi de ortho komşuluk
taşması/chancmpid, fmadd `polylineMidpoint` ve yarı-çift beraberlik yuvarlama
düzeltmeleri girdikten sonra uyumluya çöktü — port artık kâhinin kurtarma çıktısını,
özdeş kaybolan kenarlar dahil, tam olarak yeniden üretiyor); kabul kayıtları
emekli edildi.

`1581` ve `2825`, kilitlenme kurtarma durumlarıydı (fix-element-count-bucket
görevi): yukarı akış testlerinin **yalnızca** dot'un çökmediğini doğruladığı
fuzzer/yozlaşmış girdiler (`test_1581`: ASan ihlali yok; `test_2825`:
`rebuild_vlists` -1 döndürdüğünde çökme yok). C dahili bir `Error:` ile karşılaşır
(`install_in_rank` / `rebuild_vlists: lead is null`) ve kurtarması yerleşim
içeriğini atar; port **özdeş rankset silme kararlarına** ulaşır (uyarı paritesi
doğrulandı: `mark_clusters`'ın “already in a rankset” uyarılarında aynı
düğüm/graf adları, cluster.c:317-320).

`2825` artık tamamen kapanmıştır. fix-2825-rebuild-vlists görevi (1581'den sonra)
boşluğu önce bir katman kapattı: port, C'nin *tam* dahili hata durumuna ulaşır —
mesaj sırası dahil bayt bayt özdeş stderr (`Error: rebuild_vlists: lead is null for
rank 1`, ardından önek taşımayan `agerr(AGPREV, ...)` devamı `concentrate=true may
not work correctly.`) — ve `dotLayoutPipeline`, `dot_position`'ın başarısızlığını
doğru biçimde yayarak `dot_splines`/`dotneato_postprocess`'i atlar; bu, C'nin
`dotLayout`'uyla eşleşir (`dot_position`'dan sonra `if (r != 0) return r;`,
dotinit.c:322-325). Bir devam çalışması (2. kısım) kalan işleme katmanı boşluğunu
kapattı: C'nin `emit_node`'u her düğümü `node_in_box(n, job->clip)` ile kapılar
(emit.c:1806-1809) ve bu iptal yolunda `job->clip` yozlaşmıştır, çünkü `GD_bb`,
atlanan `dot_position` kuyruğundaki `set_aspect` tarafından hiç ayarlanmamıştır —
böylece C *sıfır* düğüm yayar, yalnızca (yine yozlaşmış) küme çerçevelerini. Port
aynı `node_in_box` kapısını taşıdı (`src/gvc/device.ts:renderNode`, `job->clip`'in
tek sayfa eşdeğeri olarak `job.bb`/`job.pad` kullanarak) ve `g.info.bb` ayarlı
değilken canlı düğüm konumlarından makul bir bbox'ı yeniden hesaplamayı bıraktı
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` olduğu gibi; `init_gvc`'nin
`gvc->bb = GD_bb(g)` işlemini yansıtır, emit.c:3272) — her yerleşim motoru,
iptal olmayan her yolda `render()` çalışmadan önce `g.info.bb`'yi zaten kendisi
ayarlar; bu yüzden sağlıklı graflarda bayt bayt özdeştir ve çıktıyı yalnızca bu
iptal yolunda değiştirir. `2825` artık `conformant`'tır (4 öğeli çıktı, kâhinle
bayt bayt özdeş). Her iki kısmın tam mekanizma izi için bkz.
`.agent-notes/2825-rebuild-vlists-abort.md`. `1581` tutarsız duruma hiç ulaşmaz
(`rebuild_vlists` değil, *farklı* bir yukarı akış küme penceresi hatası); bu yüzden
hayatta kalan grafı tam olarak yerleştirir — bu boşluk açık kalır. `1581`
üzerindeki kâhin çıktısı, yukarı akış tarafından tanımlanmış anlamı olmayan kurtarma
enkazıdır. Kanıt:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
Bu girdilerin her birinde bozuk olan, graphviz'in kendi ifadesiyle **C kâhinidir**:
`2471`, `1939` ve `1435` yukarı akışta
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
durumundadır (sorunlar
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), bkz.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); tek düzeltme girişimi
olan [taslak MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849)
birleştirilmemiş bir taslak olarak kalıyor (son düzenleme 2026-03-20).
`graphs-structs`, kararlı graphviz 15.0.0'ın doğru işlediği eski kayıt-yönlendirme
kaybı sınıfıdır (#102/#242/#274/#1323) — bir geliştirme derlemesi kâhin gerilemesi.

**C ne yapar.** `init_rank` üyelerinde (`2796`, `2471`, `1939`), yerel dot'un x
koordinatı yardımcı grafı, küme duvarı kısıt kenarları üzerinden yönlü bir döngü
kapatır; onun
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
işlevi her düğümü tarayamaz, `Error: trouble in init_rank` yazdırır ve yerleşim bu
kurtarma durumundan devam eder — `2471`/`2796`'da `Pshortestpath` üçgenleme enkazı ve
kaybolan kenarlarla sonlanır. `1435` ve `graphs-structs`'ta bozuk aşama pathplan'ın
kendisidir (kulak kırpma üçgenlemesi çıkmazları; kaybolan bir kayıt-portu kenarı).

**Girdiler doğrulandı, ardından sadık hale getirildi (yük taşıyan kısım bu).**
`verify-oracle-bug-family` görevi
([özet](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md)),
her iki tarafın ağ simpleksine beslediği kısıt grafını her aile üyesi için satır
satır dökümledi — ve portun bu ailedeki önceki “temiz” davranışının **dört gerçek
port kusurundan** geldiğini buldu; hepsi düzeltildi:

1. `flatEdges`, C'nin
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   çağrısını atlıyor, düz etiket vnode eklemesinden sonra küme sıra pencerelerini
   bayat bırakıyordu (bu tek başına portun `2471`'de C'nin 6 kenar kaybettiği
   yerde **9** kenar kaybetmesine yol açtı).
2. Aynı-`group` kenar cezası, aynı boş olmayan gruptaki uç noktalar yerine
   kendi kendine döngülerde tetikleniyordu
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS`, C'nin `_WIN32` değeri olan 100'ü kullanıyordu; kâhin platformu 1000
   kullanır
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Bir üçgenleme çıkmazı, C'nin uyar-ve-devam-et + düz çizgi geri dönüşü yerine
   `Pshortestpath`'i iptal ediyordu
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Düzeltmeden sonra ailenin NS kısıt dökümleri C ile **satır satır özdeştir**
(`2471`'de 253 rank2 çağrısı; `1939`/`1435`/`graphs-structs`'ta tüm çağrılar) ve
port, kabul edilmiş bozuk kurtarma boyunca C'yi izler: aynı kaybolan kenarlar
(2796'da `3->16`; 2471'de özdeş 6), aynı öğe ağaçları. `1939` tamamen uyumlu oldu.
Kalan sayısal farklar (ve 1435'in farklı pathplan enkazı), proje politikasının
bilerek peşine düşmediği kurtarma durumunun *içindeki* davranıştır.

**`2723` (segfault; sabitlendi, peşine düşülmedi).** Yerel `dot`,
`tests/2723.dot` üzerinde (yönsüz, `rank=same` grupları, etiketli kenarlar)
segfault verir (çıkış 139); dolayısıyla C'nin eşleştirilecek çıktısı yoktur.
Yukarı akış [sorun #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) açıktır
ve `tests/test_regression.py:test_2723` `xfail`'dir. Port `InternalError` fırlatır
(`INTERNAL_ERROR`, `src/layout/dot/flat.ts:flatLabelYpos` kaynaklı, `rank[r-1]`'in
tanımsız olduğu bir `TypeError` nedeniyle). Doğru bir kâhin olmadığından dürüst
başarısızlık geçerli kalır ve port değiştirilmez; `src/layout/dot/flat-2723.test.ts`
bunu sabitler. Yukarı akış sorunu düzeltirse o testi güncelleyin.

**Politika notu.** Önceki A4 duruşu (“port, sorunun beklentilerini karşılıyor;
yinelemeyin”), portun döngüsüz yardımcı grafının zararsız yerel bir varyanttan
geldiği inancına dayanıyordu. Öyle değildi — `2471`'i açıkça yanlış yerleştiren
kusur (1)'den geliyordu. C kaynağına sadakat kazandı: port artık C'nin kabul edilmiş
bozuk sonuçlarını, doğrulanmış özdeş girdilerden yeniden üretir ve buradaki her kayıt,
**yukarı akış ilgili sorunu düzelttiğinde yeniden ölçülmelidir** (kâhin çıktısı
değişecek; bu kimliklerin o yükseltmede gerileme olarak yanmasını bekleyin — bu
tasarım gereğidir, çürüme değil).

**Kanıt.** Kimlik başına karşılaştırma sayfaları (yan yana işlemeler + kanıt
kayıtları):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(düzeltme öncesi taban çizgisi
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)
içinde saklanır). Teşhis çıktıları: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Geçersiz girdi baytları (kodlama temsili) {#a5-invalid-input-bytes-encoding-representation}

**Etkilenenler:** `1367` (diverged, maxΔ 0 — tam olarak bir yapısal fark).

**Ne farklı.** Girdi dosyası, bir düğüm adının içinde çıplak bir UTF-8 devam baytı
(`0x80`) içerir. C, çıplak devam baytlarını 0x80–0xBF “kendilerini temsil eden geçerli
karakterler” olarak ele alır (`lib/common/utils.c:1200-1207`, uyarı yok) ve düğüm adı
`<title>` metni karakter kümesi dönüştürmesini tamamen atlar (`agnameof` baytları
doğrudan `gvputs_xml`'e akar). Bu nedenle kâhin SVG'si ham baytı içerir ve bildirilen
kodlamasına rağmen **geçerli UTF-8 değildir**. Port, geçersiz UTF-8 girdisini latin1
geri dönüşüyle çözer (`0x80 → U+0080`) ve iyi biçimlendirilmiş UTF-8 yayar
(`\xc2\x80`).

**Neden kabul edildi.** Portun G/Ç sınırı JS dizgeleridir (tarayıcı kitaplığı).
Ham geçersiz bir bayt, `renderSvg`'nin dizge dönüş değeri üzerinden gidip gelemez;
C'yi bayt bayt eşleştirmek, her tüketici için çıktı kodlamasını bozmak anlamına
gelirdi. latin1 geri dönüşü, C'nin kendi “Latin-1 olarak ele alınır” kurtarma
anlamını yansıtır (`utils.c:1249`). Bu, kodun altındaki bir kısıttır — temsil
katmanı — port etmeyi reddettiğimiz taşınabilir bir davranış değil. 1367'deki
geri kalan her şey uyumludur: öğe sayıları (23 polyline / 103 text / 44 polygon /
24 path) ve tüm koordinatlar decorate (T6) düzeltmesinden sonra eşleşir.

**Kanıt.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
karşılaştırma sayfası (yan yana işleme + kanıt kaydı).

---

### A6. Yozlaşmış girdide `unsigned int` tuval taşması {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Etkilenenler:** `1314` — saçma yazı tipi boyutu (`fontsize="991836031967s8"`)
çizimi ~2.75e11 pt'ye şişiren fuzzer kaynaklı bir girdi.

**Ne olur.** C, `job->width` / `job->height` değerlerini **`unsigned int`** olarak
saklar (`gvcjob.h:327-328`). Devasa punto boyutunun `ROUND(...)` işlemi
(`emit.c:1249-1250`) 32 biti aşar ve mod 2³² etrafında sarar; SVG arka ucu bunu
**işaretli** bir `%d` ile yazar (`gvrender_core_svg.c:258-259`) — bu yüzden C
`height="-425618343"` yazdırır. Port matematiksel olarak tutarlı (sarılmamış) değeri
korur. Diğer her değer — düğüm elips `cx/cy/rx/ry`, kök `translate`, çokgen, metin
`font-size` — bayt bayt özdeştir; yalnızca üst düzey `<svg>` width/height farklıdır.

**Neden peşine düşmüyoruz.** C'nin 32 bit tamsayı taşmasını yinelemek, port etmeye
değer bir yerleşim davranışı değildir ve girdi yozlaşmıştır. Yukarı akış taşmayı
düzeltirse (örn. alanı genişletir ya da boyutu kıstırırsa) yeniden değerlendirin.

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Yozlaşmış NaN yerleşimi (`sfdp`, patolojik `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Etkilenenler:** `2556` — `repulsiveforce=100` (⇒ itici kuvvet `pow(dist, 101)`
kullanır); bu, yay-elektrik çözücüsünü **her iki motorda da NaN**'a sürükler. Yerel
kâhinin kendisi tüm düğüm/kenar konumlarını `nan` ve yozlaşmış bir sınırlayıcı kutu
olarak yayar.

**Ne olur.** Her koordinat NaN iken iki uygulama çöpü farklı serileştirir: (1) graf
bb / arka plan çokgeni — C `NaN`'ı `int`'e yuvarlar; bu arm64'te `INT_MIN`
ölçeğinde çöp verir (`bb="0,0,-4.295e+09,
-4.295e+09"`); port `0`'ı korur. (2) Kenar çizim işlemleri — yerelin emit geçişi bir
NaN spline'ının `_draw_`/`_hdraw_`'ını bastırır (yalnızca `pos`'u yayar), port ise
onları NaN kontrol noktalarıyla yayar. Düğüm çizimleri eşleşir (ikisi de bastırır).
Her iki tarafta da gerçek bir yerleşim yoktur.

**Neden peşine düşmüyoruz.** Port zaten yerelle *aynı* NaN patlamasını yeniden
üretiyor — oraya ulaştıran düzeltme gerçektir (aşağıya bakın); geriye kalan yalnızca
her birinin NaN çöpünü nasıl serileştirdiğidir. C'nin `(int)NaN` tanımsız
davranışını ve NaN-spline çizim bastırmasını yinelemek, yerleşimi her iki motorda da
yozlaşmış bir girdide anlamlı bir yerleşim sadakati değildir. Yukarı akış
`repulsiveforce`'u kıstırırsa veya NaN konumlarını temizlerse yeniden değerlendirin.

**Bunu erişilebilir kılan port düzeltmeleri (savuşturulmadı — gerçek hatalar).**
Bunlardan önce port yozlaşmış duruma ulaşamıyordu bile: (1) `armPow`
(`src/common/arm-pow.ts`) hızlı yol dışındaki her argümanda hata fırlatıyordu; artık
ARM `pow.c`'nin tam özel durum dalını taşıyor, böylece `pow(NaN, y) = NaN` olur
(libm gibi). (2) `bezierClip` (`src/common/splines-geom.ts`), yakınsama sınaması
C'nin `while (ABS > .5)` koşulunun saf olumsuzlaması olduğundan NaN kontrol
noktalarında sonsuza dek döndü (sonlu değerler için denk, NaN için değil); artık C'yi
tam olarak yansıtıyor ve NaN'da sonlanıyor. İkisi de C'ye sadıktır ve yalnızca NaN
girdilerini etkiler.

---

### A7. `round()` kutu duvarı yuvarlama sınırı (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Etkilenenler:** `graphs-honda-tokoro` ve (2026-07-28'de eklendi, 905 öğelik evrene
yeni) `graphs/directed/` kardeşi `tree-graphs-directed-honda-tokoro` (ikisi de
structural-match, tek kenarda `n012->n011` maxΔ ≈ 1 pt). Kardeş yalnızca
`samearrowhead` öznitelikleriyle farklıdır; bunlar bu çiftin yönlendirmesine
dokunmaz — `n012->n011` geometrisi hem port hem kâhin tarafında kabul edilen
kimlikle bayt bayt özdeştir; dolayısıyla aşağıdaki mekanizma birebir geçerlidir.

**Ne farklı.** `maximal_bbox`'ın baş koridoru kutu duvarı, iki `n012->n011`
paralelinin paylaşılan `samehead` portu için C'de iç x=90'a, portta ise x=89'a
oturur. Paylaşılan port yapısı (`buildSharedPort`) ve paralel gruplama ikisi de C'ye
bayt bayt uyumludur; 1 px'lik boşluk tamamen bir `round()` yuvarlama sınırı
artefaktıdır — yukarı akıştaki ~1e-14 kayan nokta gürültüsü, tam bir `.5` sınırında
duran bir değeri komşu tamsayıya iter. Portun `maximal_bbox` formülü C'ninkini zaten
tam olarak yansıtır.

**Neden peşine düşmüyoruz.** `round()`, derlemdeki her yönlendirilen kenarın geçtiği
bir ilkel yapıdır; sınır davranışını bu tek duruma uydurmak için kurcalamak, 2
kenardaki 1 px için derlem genelinde bir gerileme riskidir — `bbox-class-control-hull-vs-curve`
içinde belirtilen kontrol gövdesi yuvarlamasıyla aynı ortak ilkel yapı kısıtı. Tam
teşhis: `.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA yuvarlaması ile katı IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Sınıf.** clang arm64, kâhin ikilisini `-ffp-contract=on` ile derler ve seçili
çarp-topla dizilerini tek FMA komutlarında birleştirir; port ise katı IEEE-754
yuvarlaması yapan ve `fma` yayamayan V8 üzerinde çalışır. Bit düzeyinde özdeş
girdilerde ikisi, derleyicinin birleştirmeyi seçtiği ifadede 1-2 ULP farklılaşır.
Port tarafı her zaman katı IEEE-754 sonucudur; kâhin tarafı her zaman FMA ile
birleştirilmiş sonuçtur. Bu, C kaynak kodu anlambiliminin altındaki bir
derleyici/çalışma zamanı taşınabilirlik kısıtıdır, portta bir mantık kusuru değil —
clang'ın belirli birleştirme seçimlerini yazılımda öykünmeden indirgenemez. Biri
iki farklı yerde, iki farklı yükseltme mekanizmasıyla olmak üzere iki örnek bilinir:

- **2646** — ULP, `Proutespline`'ın `points2coeff`/`solve3` kübik çözümünün içinde
  doğar ve bir spline uydurucu kök sayısını doğrudan çevirir.
- **2620** — ULP, `poly_init`'in çokgen köşe kapsamı döngüsünde (düğüm boyutlandırma)
  doğar ve `ortho`'nun sadık, relax başına tamsayı kırpmasıyla aşağı akışta
  eşit maliyetli bir labirent koridoru beraberliği çevrilmesine yükseltilir.

**Etkilenenler:** `2646` (structural-match, 21.216 kenardan 3'ünde maxΔ 42.09:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — hepsi kayıt-portu
`:c->:nb_part` smode uzun kenar yönlendirmeleri). **A3**'ün kardeşi: iki sınıf da
`Proutespline` içindeki indirgenemez kayan nokta taşınabilirliği beraberlikleridir,
ancak mekanizma farklıdır — libm `hypot` değil, bir derleyici `fp-contract`
artefaktı.

**Ne farklı.** Üç kenarın hepsinde yalnızca son `routesplines` çağrısı (baş portuna
düz bir bacak) ayrışır. Uç noktası, bariyer çokgeninin alt duvarı üzerinde bit
düzeyinde tam oturur ve teğeti o duvara paraleldir (`evs[1]=(1,-1.22e-16)`); bu
yüzden her `splinefits` adayı `t=1`'de bariyere teğettir — kesişim kübiğinin
yaklaşık çift kökü. `points2coeff` bu kübiği yıkıcı bir iptalle hesaplar (~7446
civarındaki terimler ~0.099'a çöker). Kâhin (clang/arm64, `-ffp-contract=on`)
`v3 + 3*v1 - (v0 + 3*v2)` ifadesini birleşik çarp-toplalara dönüştürür; V8 ise katı
IEEE yuvarlaması yapar — ikisi **bit düzeyinde özdeş girdilerde** ~9.1e-13 farklılaşır
ve bu gürültü `solve3` diskriminantının işaretini çevirir: C 1 kök bulur (866.7,
segmentin içinde); port, `t=0.9999975 < 1-EPSILON2` konumunda sahte bir eş kökle 3
kök bulur. Sahte kök fazladan bir `a`-yarılama yinelemesini tetikler; bu da son
parçanın teğet büyüklüğünü 2 çarpanıyla çevirir (3 kenarda her iki yönde), kırpma
sonrası maxΔ 42.09'u (26 SVG farkı) üretir.

**Neden kabul edildi (indirgenemezlik kontrollü bir deneyle kanıtlandı).** Altı
`routesplines` çağrısının hepsi her iki tarafta dökümlendi — kutu, çokgen, `PL`,
başlangıç, bitiş ve `evs` bayt bayt özdeştir; önceki (son olmayan) çağrının çıktı
spline'ı da öyle; tek ayrım son çağrının `solve3`'ü içindedir. Bağımsız bir saf-C
düzeneği tek değişkeni yalıttı: `-ffp-contract=off` ile derlemek **portu** 3
kenarın hepsinde bit düzeyinde yeniden üretir; varsayılan (`on`) birleştirme
**kâhini** 3 kenarın hepsinde bit düzeyinde yeniden üretir. Dolayısıyla port, katı
IEEE-754 C ile zaten uyuşur; fark tamamen kâhin derleyicisinin FMA birleştirme
seçimidir, C kaynak kodu anlambiliminin altındadır — düzeltilecek kaynak düzeyinde
bir sadakatsizlik yoktur. Hedefli bir düzeltme (`points2coeff` içinde birleştirmeyi
elle öykünmek) denendi ve çürütüldü: 3 kenardan 2'sini düzeltir ama üçüncüsünü
düzeltmez; onun çevrilmesi `solve3`'ün kendi iç birleştirmesinden kaynaklanır.
Eksiksiz bir düzeltme, tüm spline uydurucu boyunca yazılım-FMA öykünmesi gerektirirdi
— piksel altı, 3 kenarlık bir getiri için sıcak döngü maliyeti ve derlem genelinde
yuvarlama etki alanı. Tam teşhis: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Etkilenenler (tarihsel):** `2620` (eskiden structural-match, maxΔ 585; 24 kenar
yolunda ve 22 ok ucunda 423 fark). **2026-07-11'de uyumluya çöktü**: sadık `sgraph`
komşuluk tamponu taşması + `chancmpid` çift yönlü kapsama portu
(bkz. `.agent-notes/ortho-maze-circo-rca.md`) farkı ortadan kaldırdı; kabul kaydı
emekli edildi ve bu bölüm A8 sınıfının belgesi olarak saklanıyor.

**Ne farklı.** `ortho` (`splines=ortho`) ardışık düzeni, özdeş girdiler verildiğinde
C ile bayt bayt uyumludur — C'nin tam labirent girdisini (koordinatlar,
`xsize`/`ysize`) portun ortho aşamasına enjekte ederek kanıtlandı: 378/378
yönlendirilmiş segment bayt bayt özdeş çıkar; yani `src/ortho` içinde hiçbir şey
kusurlu değildir. Asıl fark, labirent *girdisindeki* 1-2 ULP'dir: düğüm `ysize`
(ve sıra içi birikimle `ND_coord.y`), C'nin `poly_init` çokgen köşe kapsamı
döngüsünde (`shapes.c`) hesaplanır; `-ffp-contract=on` altında `R.x +=
sidelength*cosx` ifadesi, portun katı IEEE aritmetiğinden ~1 ULP büyük bir FMA'da
birleştirilir (her iki taraf da aritmetik olarak özdeş ifadeyi uygular). `2620`'nin
173 kesirli genişlikli çokgen düğümü vardır; hepsinde C ≥ port, 1-2 ULP. Bu ULP,
`ortho`'nun Dijkstra gevşetmesi tarafından — ortaya çıkarılmayıp — yükseltilir;
bu gevşetme, ham hücre kapsamlarından türetilen ağırlıklar üzerinde (`maze.c:257`)
çalışan mesafesini adım başına sadakatle kırpar (`sgraph.c:165`, portta
`Math.trunc` olarak yansıtılır). ULP kaymış geometri, 4 yönlendirilmiş kenar için
(yollar + ok uçları) eşit maliyetli bir koridor beraberliğini çevirir; kalan farklar
bu 4 çevirmeden kaynaklanan ±1 iz yeniden numaralandırma etkileridir.

**Neden kabul edildi (indirgenemezlik kontrollü bir deneyle kanıtlandı).**
Yalnızca `-ffp-contract`'ı değiştiren bağımsız bir C düzeneği, ayrışan altıgen
köşesinde her iki tarafı da yeniden üretti: `-ffp-contract=on` →
`310.29250168188713` (kâhinle eşleşir), `-ffp-contract=off` →
`310.29250168188707` (portla eşleşir); ayrışan işlem `i=3` köşesine yalıtıldı
(`R.x=-0.50000000000000011` birleşik, `-0.5` birleşmemiş). İkinci bir girdi enjeksiyonu
deneyi (tek değişken: ortho girdi değerleri) yükselticiyi doğruladı: portun kendi
`orthoEdges` işlevine C'nin tam `coord`/`xsize`/`ysize` değerlerini beslemek 4
koridor ayrışmasının hepsini 0'a indirir — ortho kodunda kusur yok, yalnızca (C'nin
kendi labirent maliyeti yönlendirmesi gibi) girdisindeki 1-2 ULP kaymaya duyarlı.
Eşleştirmek, `poly_init` içindeki tek bir derlenmiş ifade ağacının clang'a özgü FMA
birleştirmesine öykünmek anlamına gelirdi — kaynak anlambilimini port etmek değil,
derlenmiş bir artefaktın peşinden gitmek. Tam teşhis:
`plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Öykünülen istisna (kabul edilmedi): `triang.c:ccw`.** Bir birleştirme noktası
kabul edilmek yerine bit bit YENİDEN ÜRETİLİR: pathplan'ın `ccw`'si `fnmul`+`fmadd`
olarak derlenir (tam ilk çarpım − yuvarlanmış ikinci), bu yüzden bir doğru parçası
uç noktasına bit düzeyinde eşit bir sorgu noktası ISON yerine ISCW/ISCCW sınanır.
`shortest.c:pointintri` bu durumda çokgen köşe uç noktalarını reddeder (“destination
point not in any triangle”) ve `makeMultiSpline` her birleşik 2-döngü için düz
yönlendirmeye geri döner — portun eşlemesi gereken büyük, kesikli, derlem genelinde
bir davranış. Yukarıdaki `solve3`/`poly_init` noktalarından (derlenmiş ifade
ağaçlarının derinlerinde, düzeltme çürütüldü) farklı olarak `ccw`, temiz
anlambilimli tek, bağımsız derlenmiş bir işlevdir; bu yüzden `src/pathplan/triang.ts`
ona öykünür: düz ve birleşik işaretlerin kanıtlanabilir biçimde uyuştuğu yerde
muhafazakâr bir hata sınırlı düz-double hızlı yol ve sıfıra yakın durumlar için tam
bir Dekker çarpımı + ikili-BigInt yolu.

---

### A9. libm trigonometri 1-ULP → CDT eşdairesel beraberlik çevrilmesi (`circo`/`twopi` çoklu spline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Sınıf.** V8'in `Math.sin`/`Math.cos` işlevleri, Apple libm'in `sin`/`cos`'uyla bit
düzeyinde özdeş değildir (kanıtlandı: sekiz elips engeli köşe açısından biri olan
`2π·4.5/8`'de 1-ULP uyuşmazlık). `makeObstacle`'ın çevrel 8-gen köşeleri bu ULP'yi
devralır; bu yüzden üçgen yönlendiricisinin girdi koordinatları kâhininkinden ≤6e-14
farklıdır. Simetrik yerleşimler (bir sıra/halka üzerinde eşit boyutlu düğümler),
yönlendiricinin dörtgenlerini gerçek aritmetikte **tam eşdairesel** yapar; bu yüzden
tam iç çember yüklemi bir bıçak sırtında durur: girdi ULP'si işaretini çevirir,
kısıtlı-Delaunay köşegeni çevrilir ve kâhinde `Pshortestpath`'te başarısız olan
koridor çokgeni (“destination point not in any triangle” → düz spline geri dönüşü)
portta başarılı olur (veya tersi). Ortaya çıkan spline'lar ~0.2–0.5pt farklıdır.
**A3**/**A8**'in kardeşi: C kaynak anlambiliminin altında indirgenemez bir kayan nokta
taşınabilirliği kısıtı — eşleştirmek, JS'de Apple libm'in tam `sin`/`cos`
yuvarlamasını yeniden üretmeyi gerektirirdi.

**Etkilenenler:** `241_0` (`5:ne->8:nw` kenarındaki koridor çevrilmesiyle circo
Δ≈0.2 / twopi tuval Δ≈9); `2343`, `2239`, `share-b29`, `windows-b29` (twopi, her
birinde 1–2 kenar etiketi konum farkı — libm 1-ULP'si `poly_init`'in birim köşe
trigonometrisinde (`hypot`/`atan2`/`sin`) doğar, bir düğümün hesaplanan yüksekliğini
kâhinin tam oturduğu asgari boyut kıskacının bir ULP ötesine koyar ve xlabel R-ağacı
yüklemesindeki `floor()` üzerinden tek bir etiket adayı çevrilmesine basamaklanır.
Doğru yuvarlanmış hypot düzeltmesi denendi ve ÇÜRÜTÜLDÜ: `2343`'ü düzeltti ama
sekizgen boyutlandırması, kâhinin değerinin doğru yuvarlanmış değer OLMADIĞI aynı
çağrıdan geçen `2168_3`'ü geriletti — kâhinle ikisinde de eşleşen belirlenimci bir
hypot politikası yoktur).
`2168_1` aslında bu sınıftaydı ama port kâhinin fp-birleştirilmiş `ccw`'sine
öyününce (pathplan `triang.ts`) uyumlu oldu: koridor başarısızlığı, portun artık bit
bit yeniden ürettiği FMA'lı `pointintri` köşe-uç noktası reddiyle belirlenir; bu
yüzden CDT köşegeni ULP beraberliği orada artık yüzeye çıkmaz.

**Neden kabul edildi (indirgenemezlik kontrollü bir deneyle kanıtlandı).** CDT'nin
kendisi aklanmıştır: portun `mkSurface`'i GTS 0.7.6'nın artımlı eklemesinin sadık bir
portudur (`cdt.c`: 1→3 bölme + özyinelemeli `swap_if_in_circle`, kısıt kenarları
önceden oluşturulmuş ve değiştirilemez, `remove_intersected_*` +
`triangulate_polygon` kısıt uygulaması) ve **gerçek GTS kitaplığına** bağlanan ve
portun bit düzeyinde tam yönlendirici girdileriyle beslenen bağımsız bir C düzeneği,
portun üçgenlemesini yüz yüze yeniden üretir (2168_1: 22/22; 241_0: 185/185). İç
çember determinantının iki girdi kümesinde tam rasyonel değerlendirmesi işaret
çevrilmesini doğrular (portun girdileriyle +1, kâhininkilerle −1). Kalan değişken —
1-ULP trigonometri farkı — `Math.sin`/`sin` bit desenlerini doğrudan karşılaştırarak
yalıtıldı.

**Motor hattı kabulü (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> twopi/circo **xdot motor hatları**
(`parity-twopi.json` / `parity-circo.json`, yerel `dot -K <engine>
-Txdot` kâhini, `test/corpus/engine-walk.ts`, ±0.01'de anlamsal çizim işlemi
karşılaştırması — bkz. `test/golden/compare-xdot.ts`) bu aynı mekanizmayı yukarıda
anılan dot motoru SVG taramasından bağımsız olarak ortaya çıkarır: twopi `2239`
(1 çizim işlemi farkı — `_ldraw_` kenar etiketi metin konumu çevrilmesi; `floor()`
xlabel R-ağacı zinciri üzerinden basamaklanan aynı `poly_init` birim köşe trigonometri
ULP'si; bu girdi altında başlangıçta kabul edilen `2343`, `share-b29` ve `windows-b29`,
2026-07-11'de `polylineMidpoint` içindeki sadık fmadd birleştirmesiyle *düzeltildi* —
aşağıdaki b29 ailesi paragrafına bakın) ve circo `241_0` (41 çizim işlemi farkı,
`1->2` kenarının yönlendirilmiş bezier'inde Δ≈0.2pt — aynı CDT köşegeni koridor
çevrilmesi; karar günlüğü, 2026-07-10 “CDT rewritten as faithful GTS port; 2168_3
outline-ring obstacle; 56/osage bb clobber; A9 filed” kaydı). Motor hattı düzeyinde
`test/corpus/accepted-divergences-engines.json` aracılığıyla kabul edilir;
`parity-report.ts` bunu `PARITY-twopi.md`/`PARITY-circo.md` ile birleştirir —
`accepted.ts`'in dot hattı `PARITY-dot.md` için yaptığı birleştirmenin aynısı.

**circo `2475_2` — eşdairesel closestNode hypot beraberliği.** Bu 10762 düğümlü grafın
28 düğümlü bir bileşeninde circo'nun `getRotation`'ı (`circpos.c:73-92`), alt bloğun
dönüşünü belirlemek için `hypot` ile yerleşim başlangıcına en yakın blok düğümünü
seçer. İki eşdairesel düğüm fiilen eşit uzaklıktadır; V8'in doğru yuvarlanmış
`Math.hypot`'u ve Apple libm'in `hypot`'u bu uzaklığı 2 ULP farkla yuvarlar; bu da
katı `<` işaretini çevirir, farklı bir düğüm seçer ve alt bloğu ~20° döndürür/yansıtır
(18 düğüm kayar, azami 296.7pt; diğer 10744 düğüm, blok ağacı, daire sırası ve her
`centerAngle` bit düzeyinde özdeştir). CR-hypot politikası bu sınıf için zaten
çürütülmüştü (2026-07-10). Bağımsız yeniden üretim:
`.agent-notes/circo-2475-590-repro.dot`; tam kök neden analizi:
`.agent-notes/circo-b81-2475-rca.md` (2026-07-11'de kabul edildi).

**twopi `2470` — xlabel R-ağacı tarafından yükseltilen radyal koordinat ULP'si.**
2470, HTML `<table>` kenar etiketleri neredeyse çakışık radyal çapalarda toplanan
140 kenarlı bir graftır. neato ailesinde kenar etiketleri, Hilbert sıralı bir R-ağacı
üzerinden en az çakışan aday köşeyi seçen açgözlü xlabel yerleştiricisi
(`label/xlabels.c`) tarafından dış etiketler olarak yerleştirilir. Portun
spline'ları ve düğüm koordinatları kâhinle yayım hassasiyetinde eşleşir (1e-7'de
bile sıfır spline/düğüm/bbox farkı), ancak bir düğümün radyal `ND_coord.y` değeri
~2 ULP farklıdır (Apple libm `sin`/`cos` ile V8 `Math`) — uygunluk çıtasının çok
altında, yine de `objplpmks` içinde `floor(pos.y − sz.y/2)` sınırını tam 0'da
aşar ve o nesnenin R-ağacı dikdörtgenini bir birim çevirir. Hilbert sırası/ağaç
gruplama değişimi `RTreeSearch`'ün farklı bir dalı budamasına yol açar; bu yüzden
~140 etiketin her biri komşu aday köşeye oturur (her fark sabit bir (+genişlik,
−satır-yüksekliği) adımı). Yerleştirici, nesne sırası, dikdörtgen yuvarlama,
`CombineRect` (C'nin min-min tuhaflığını sadakatle yansıtır) ve int32 Hilbert
anahtarının her biri sadık olarak doğrulandı; fark, twopi `1855` ile aynı nedenle
indirgenemez olan yukarı akıştaki radyal trigonometri ULP'sidir. 2026-07-11'de kabul
edildi; tam kök neden analizi: `.agent-notes/twopi-2470-rca.md` (kimliğin sabahki
“geçmesinin” bir port gerilemesi değil, bayat bir kâhin ikilisinin artefaktı olduğunu
da belgeler).

**osage `1855` — engel köşesi fp-contract bulaşması.** Yukarıdaki twopi `1855` radyal
ayna kaydından farklı olarak osage altında düğüm merkezleri kâhinle bit düzeyinde
tamdır ve 110 çizim işlemi farkı, bir düğüm satırının ayna tarafına yerleştirilmiş
üç engel yönlendirmeli kenardır (X bit düzeyinde tam, Y yansıtılmış).
`circumscribed_polygon_corner_about_ellipse`'ten (`neatosplines.c:301`) gelen sekizgen
engel köşeleri C'den 3–4 ULP farklıdır; çünkü clang'ın `-ffp-contract=on`'u
`ellipse_tangent_slope`/`line_intersection` içindeki `a·b±c` zincirlerini tek
yuvarlamalı FMA'larda birleştirirken V8 her işlemi yuvarlar: C'nin birleşik yuvarlaması
bir oluk sütunundaki köşe-x değerlerini bit düzeyinde özdeş tek bir double'a çökertir
(tam doğrusal), portunki onu 1 ULP arayla iki değere böler. Bu, görünürlük `clear()`
teğetlik sınamasını çevirir — oluk artık engellenmez —, ~20 görünürlük kenarı ekler
ve Dijkstra yukarı/aşağı homotopi beraberliğini ayna tarafına çözer. Kontrollü
deney: C'nin tam engel koordinatlarını başka türlü dokunulmamış porta enjekte etmek
**sıfır** ayrışan kenar verir; bu, yasal-düzenleme, görünürlük, Dijkstra ve spline
zincirini tümüyle aklar; yalnızca C'nin libm `cos`/`sin`'ini enjekte etmek etkisizdir.
2026-07-11'de kabul edildi; tam kök neden analizi: `.agent-notes/osage-spline-family-rca.md`.

**b29 ailesi (twopi).** Dört b29 varyantı tek bir bıçak sırtını paylaşır:
`EqmtTyp` kenar etiketi (`Node14732->Node14731`), sonucu çevredeki nesnelerdeki 1-ULP
twopi yerleşim sürüklenmesine bağlı olan tam bir placeLabels taraf seçimi beraberliği
üzerinde durur. `polylineMidpoint` içindeki sadık fmadd birleştirmesiyle (states-ailesi
düzeltmesi, 2026-07-11) portun etiket çapası kâhininkiyle bit düzeyinde özdeştir;
yine de beraberlik dört varyantın ikisinde (`graphs-b29`, `linux.i386-b29`) zıt yönde
çözülürken diğer ikisi (`share-b29`, `windows-b29`) artık uyumludur — ve `2343`'ün
kabul edilmiş A9 etiket farkı tümüyle silindi. Sınır: 1 çizim işlemi, Δ12pt etiket y.
Yukarı akıştaki sürüklenme ortadan kaldırılmadan indirgenemez. Tam kök neden analizi:
`.agent-notes/twopi-states-rca.md`.

Aynı placeLabels bıçak sırtı **osage** hattında da ortaya çıkar (2026-07-11'de kabul
edildi, tam kök neden analizi: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` ve `share-b29` (her birinde 2 çizim işlemi farkı — bir kenar
etiketinin x çapası 841.06 yerine 878.28'e oturur; bit düzeyinde özdeş spline orta
noktası 859.67 etrafında simetrik yerleştirilmiştir, yani ±etiket genişliğinin yarısı;
iki varyant birbirinin aynasıdır) ve `1652` (2 çizim işlemi farkı — iki kenar,
özdeş bir orta nokta etrafında birer etiket çapasını çevirir, biri x'te biri y'de;
spline'lar ve ok uçları bit düzeyinde özdeştir; kâhin eksiksiz işler, yani bu bilinen
yerel zaman aşımı kararsızlığı değildir). Her durumda kenar geometrisi bit düzeyinde
tamdır ve yalnızca etiket tarafı seçimi beraberliği, 1-ULP sürüklenmiş çevrede zıt
yönde çözülür.

Osage hattı `polypoly` üçlüsünü taşır (`graphs-polypoly`, `share-polypoly`,
`windows-polypoly`; 2026-07-11'de kabul edildi, tam kök neden analizi
`.agent-notes/patchwork-tail-rca.md` içinde): ayrışan tek işlem, bozulmuş bir
dörtgenin 180 yönelimli köşesindeki yalın aşkın `cos(π+θ)` işlemidir — V8'in
`Math.cos`'u doğru yuvarlanmıştır, Apple libm'in `cos`'u ise bağımsız değişkene
bağlı ±1-ULP hata taşır (bu yüzden yalnızca libm altında `|cos(π+θ)| ≠
|cos(θ)|`); 1-ULP düğüm boyutu farkı pack'in `GRID`/`ceil` işlemini besler, bir
çevre beraberliğini devirir ve qsort iki bileşeni birbirinin paketleme hücrelerine
yerleştirir — şekil ya da yönlendirme hatası olmayan, katı bir bütün-düğüm değişimi.
Doğru yuvarlanmamış bir libm aşkın fonksiyonunu yeniden üretebilecek belirlenimci bir
yeniden yazım yoktur; ders kitabı niteliğinde bir A9 biçimi.

Aynı mekanizma 2026-07-28'de daha büyük kardeş `tree-graphs-directed-polypoly`
üzerinde doğrulandı (`graphs/directed/polypoly.gv`, 905 öğelik evrene yeni; 112
çizim işlemi farkı, yalnızca osage). Ayrışan işlem, özdeş düğüm-`9004`
`cos(π+θ)` 1-ULP noktasıdır — C ve port `bb.x` değerleri özgün kök neden analiziyle
bayt bayt eşleşir — ancak bu 76 düğümlü girdide yayılım osage'in `arrayRects`
işlevinden geçer: `acmpf` paketleme hücrelerini ham `width+height` toplamına göre
sıralar ve libm'in 1-ULP yüksek genişliği `9004`'ün döndürülmüş kardeşleri
`9000/9002/9006`'dan kesin olarak önce sıralanmasına yol açar; V8'in doğru
yuvarlanmış değeri ise kararsız qsort'un farklı sıralaması için tam bir 4'lü
beraberlik bırakır — farklı satır-öncelikli hücreler, bir `9002`/`9006` değişimi ve
8 komşuyu x'te kaydıran bir sütun genişliği `fmax` basamaklanması. Portun kendi
`arrayRects` işlevine C düğüm boyutlarını ve port düğüm boyutlarını beslemek,
taramanın 10 kayan düğümünü bayt bayt eşleşen x farklarıyla yeniden üretir ve
nedensel zinciri kapatır.

Motor hattında iki ek örnek daha 2026-07-11'de kök nedenine indirildi ve kabul edildi
(tam kök neden analizi: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 çizim
işlemi farkı — yukarıdaki circo kaydının kardeşi: libm `sin`/`cos` 1-ULP'si ile
çevrilen aynı CDT eşdairesel iç çember beraberliği, yerel derleme düz 8 noktalı
yönlendirmeye geri dönerken portun çoklu spline koridorunun 14 noktalı bir spline ile
başarılı olmasını sağlar; nokta farkları < 0.07pt) ve circo `windows-tree` (tek bir
yelpaze kenarında 10 çizim işlemi farkı — circo'nun yerleştirme trigonometrisi,
tam simetrik 18.0 değeri etrafında `node2.y`'yi `node8.y`'nin bir ULP üstüne koyar ve
`closestSide`'ın dyna baş portu seçimi tam o beraberlikte TOP/BOTTOM'u çevirir; düğüm
konumları ve kutular aksi halde kâhinle bit düzeyinde özdeştir).

**sfdp motor hattı — kenar FP beraberlikleri (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> sfdp xdot motor hattı (`parity-sfdp.json`,
yerel `dot -Ksfdp -Txdot`, ±0.5), tam yerel yönlendirme öncesi konumlar
enjekte edildiğinde CDT eşdairesel iç çember beraberliğini ortaya çıkarır (yani
ayrışma yinelemeli sürüklenme DEĞİL — bkz. A1-drift sınıfı — kesikli bir yüklem
beraberliğidir):

- `42` ve `241_0` — CDT eşdairesel iç çember beraberliği (çoklu spline koridoru).
  Enjekte edilmiş konumlarla artık bir **segment sayısı çevrilmesidir**: `42`
  `opCount 5 vs 9` (kenar 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kenar 3->2) — portun kısıtlı-Delaunay köşegeni kâhine göre çevrilir; bu
  yüzden çoklu spline koridoru, yerel derlemenin daha kısa düz bir yola geri
  döndüğü yerde N noktalı bir spline ile başarılı olur (veya tersi); yukarıdaki
  twopi/circo `241_0` kaydıyla tıpatıp aynı. Port, iç çember/`ccw` yükleminde arm64
  `fmadd` birleştirmesine zaten öykünür (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) ve sağlam iç çemberli Delaunay kullanır; artık, hiçbir
  taşınabilir kodun yeniden üretemediği yüklem girdisindeki V8-ile-Apple-libm
  `sin`/`hypot` 1-ULP'sidir.

> **`2095`, A9'dan A1-drift'e yeniden sınıflandırıldı (2026-07-22).** Daha önce
> burada “hypot kardeşi” olarak listelenmişti (boş adlı bir düğüm `""->"4"`'ün
> kenarlarında 0.7pt altı sürüklenme). Bu artık bir **düzenek artefaktıydı**:
> nedenlendirme enjektörünün `GVTS_POS` regex'i ≥1 ad karakteri gerektiriyordu; bu
> yüzden `""` adlı düğüm hiç enjekte edilmedi ve iki bağlı kenarını sürükledi.
> Enjektör boş adlarla eşleşecek şekilde düzeltilince (`(.+)`→`(.*)`,
> `src/layout/neato/splines.ts`), sfdp `2095` **0 artığa** enjekte edilir — saf kuvvet
> sürüklenmesi; hesaplanan A1-drift sınıfı kapsar, bir yönlendirme FP beraberliği
> değildir. Kimlik başına kabulü `accepted-divergences-engines.json` içinden
> kaldırıldı. (Aşağıdaki fdp `2095` ile aynı bulgu.)

**Yeni kontrollü deney (2026-07-21).** Yerel-ile-V8 `hypot` sondası
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): sistem C `hypot`'unu
derleyip temsili düz kenar sapma girdilerinde Node `Math.hypot` ile karşılaştırmak, 6
girdiden 2'sinde 1-ULP uyuşmazlık gösterir (Δ 7.1e-15 ve 5.7e-14) — alt bölüm
sayısını çeviren bölme eşiği bıçak sırtı. İndirgenemez: hiçbir taşınabilir hypot
Apple libm'i yeniden üretmez (aynı sınır için `arm-pow.ts` emsali). Motor hattı
düzeyinde `accepted-divergences-engines.json` aracılığıyla kabul edilir
(`sfdp.42`, `sfdp.241_0`).

**fdp** xdot motor hattı (`parity-fdp.json`, yerel `dot -Kfdp -Txdot`, ±0.5) AYNI CDT
eşdairesel beraberliğini aynı grafta, `241_0`'da ortaya çıkarır: kâhinin tam
yönlendirme öncesi konumları enjekte edildiğinde artık, tek bir kenara
(`0->1#0`, maxΔ 3.39pt) sınırlı 11 sayısal `unfilled_bezier` farkıdır. Düğüm
konumları enjeksiyonla özdeş olduğundan ayrışma aşağı akışta, pathplan çoklu spline
koridorundadır — twopi/circo/sfdp `241_0` ile aynı libm-1-ULP iç çember beraberliği
(yukarıdaki tam rasyonel iç çember 185/185). Kaldıraçlar zaten uygulandı
(`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198` `Math.hypot`);
beraberlik indirgenemez. `accepted-divergences-engines.json` `fdp.241_0` aracılığıyla
kabul edilir. fdp'nin `2095`'i ise **A9 değil, A1-drift'tir**: tek boş adlı düğümü
enjekte etmek (nedenlendirme enjektörü `""` adlı düğümlerle eşleşecek şekilde
düzeltildikten sonra) artığını sıfıra indirir — önceki “A9 kuyruğu”, bağlı kenarlarını
sürükleyen, enjekte edilmemiş boş düğümdü. sfdp `2095` kabulü aynı kör noktaydı —
düzeltilmiş enjektörle yapılan yeni bir sfdp nedenlendirme yenilemesi (2026-07-22)
onun da 0'a enjekte edildiğini doğruladı ve kabulü kaldırıldı (yukarıdaki
`2095 reclassified` notuna bakın).

---

## Takip edilen uzun kuyruk (`dot` öznitelikleri ve uç durumlar) {#tracked-long-tail-dot-attribute-edge-case}

**Varsayılanlarda**, `dot` motoru golden derleminde C ikilisiyle sıkı bir
belirlenimci toleransa kadar eşleşir (`conformant` kararı; üstteki nota bakın).
Kalan farklar, herhangi bir Graphviz portunun tarihsel olarak zor kısmı olan
**öznitelikler ve uç durumların uzun kuyruğudur**. Yukarıdaki kabul edilen farkların
aksine bunlar kapatılacaktır; sayılarla birlikte canlı olarak
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
içinde izlenirler:

| Kategori | Ne farklı |
|---|---|
| **path-structure** | Belirli yapılandırmalarda kenar spline yönlendirmesi (örn. bazı düz kenar ve yoğun koridor durumları). |
| **element-count** | Belirli graflarda C'den fazla/az SVG öğesi yayan bir özellik. |
| **color-stroke** | Belirli stil öznitelikleri için çizgi/dolgu yayımı farkları. |
| **parser-gap** | Ayrıştırıcının henüz tam olarak kabul etmediği az sayıda DOT girdisi. |

Grafınız yalnızca yaygın öznitelikleri ve `dot` motorunu kullanıyorsa, neredeyse
kesinlikle belirlenimci tolerans eşleşme yolundasınız. Bir yerleşim yanlış
görünüyorsa, o girdi sınıfı için `PARITY-dot.md` dosyasına bakın — büyük olasılıkla
bilinmeyen bir şey değil, kâhine sabitlenmiş bir düzeltme görevi olan takip edilen
bir kalemdir.

> **Etiketle yürüyen durumlar üzerine not.** Metin ölçümü sınıfı (A2) kapatılmıştır —
> artık hiçbir `dot` grafı bunun altında kabul edilmez. Bugün structural-match
> düzeyinde duran bir graf, yazı tipi metriği farkı değil, takip edilen bir
> boşluktur.

### `concentrate=true` karşıt kenar ok uçları {#concentrate-true-opposing-edge-arrowheads}

`concentrate=true` anti-paralel bir çifti (`A->B; B->A`) hayatta kalan tek bir kenara
birleştirdiğinde, o kenar **her iki** uçta da bir ok ucu çizmelidir. Bu artık
taşınmıştır (`arrow_flags`'ın `conc_opp_flag` dalı; bkz.
`src/common/splines-clip.ts:arrowFlags`), dolayısıyla `graphs-b135`, `167` ve `2087`
eşleşir (eksik ok ucu `element-count` farkı ve kırpılmamış spline `@d` yan etkisi
ikisi de ortadan kalktı).

Bazı concentrate grafları, ok ucu düzeltmesinin **ele almadığı** **ayrı, önceden var
olan bir artık** taşır — bu bir ok ucu kusuru değil, bir düğüm **x koordinatı** konum
farkıdır (x-ağ simpleksi / pusula-portu):

- **`graphs-b15`, `graphs-b69`** — büyük kayıt/küme “asansör” grafları. Concentrate
  doğru biçimde etkinleşir ve birleştirir; artık, bir `element-count`/spline `@d`
  farkına yükselen ~1pt'lik düğüm-x farkıdır. Ok ucu yayımının kendisi artık
  doğrudur (b69 eksik ok ucu çokgenlerini kazanır). x koordinatı kök nedeni için
  `b69-concentrate-undermerge` ajan notuna bakın.
- **`1453`** — conc_opp_flag ok ucuyla ilgisiz, üst düzey bir `element-count`
  nedeniyle hâlâ ayrışır.
- **`2825`** — bu ok ucu düzeltmesi sırasında, conc_opp_flag ile ilgisiz üst düzey bir
  `element-count` nedeniyle ayrışıyordu (orada karşıt çift birleştirmesi
  tetiklenmez); o zamandan beri fix-2825-rebuild-vlists görevi tarafından kapatıldı,
  yukarıdaki A4'e bakın.

Bunlar takip edilen x koordinatı / yapısal kalemlerdir, ok ucu hataları **değildir**.

### 2.0 doğruluk görevinden kalan yerleşim sadakati boşlukları (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0 doğruluk görevi, taşınmamış öznitelik değerlerinin yüksek sesle başarısız olmasını
sağladı (bkz. [Hatalar ve istisnalar](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)
içindeki `UNSUPPORTED_FEATURE` tablosu). Aşağıdakileri geride bıraktı;
`plans/v2-fidelity/decision-journal.md` içinde kayıtlıdır.

**Yüksek sesli, taşınmamış.** Çakışan düğümlerle `overlap=voronoi`, neato, twopi,
circo ve sfdp'de hâlâ `UNSUPPORTED_FEATURE` fırlatır: Voronoi ayarlayıcısının kendisi
(`vAdjust`'in algoritması) taşınmamıştır. Fırlatılıp fırlatılmayacağına karar veren
çakışma testi C'nin kendisidir (`poly.c` düğüm çokgenleri üzerinde `countOverlap`).

**Bilinen boşluklar, hâlâ sessiz.** Port bunları hatasız işler ve yerel Graphviz'den
farklıdır. `v2-silent-gaps` görevi tarafından bulundu
(`plans/v2-silent-gaps/decision-journal.md`); kabul edilmiş farklar değildir.

- **`getAdjustMode`'un “Unrecognized overlap value” uyarısı yayılmaz.**
- **Döndürülmüş çokgen köşeleri yerelden son bitlerde farklı olabilir
  (indirgenemez: ana makine matematik kitaplığı).** `poly_init` her köşeyi
  `atan2`, `hypot`, `sin` ve `cos` ile yönlendirir. Bit düzeyinde özdeş girdilerle
  macOS libm ve V8 farklı son bitler döndürür (örn. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; sonraki köşede `hypot`: libm
  `…fffd`, V8 `…fffe`), bu yüzden `orientation=20` olan bir kutu portta köşe y'si
  `-18`, yerelde `-17.999999999999996` alır. Yerel Graphviz'in kendisi platformun
  libm'ine göre değişir ve bir tarayıcı onu çağıramaz. Portun kendi aritmetiği C ile
  eşleşir (`RADIANS` sırası sabit; örneklenen 1664 köşe koordinatından 776'sı bit
  düzeyinde özdeştir, geri kalanı yalnızca libm yüzünden farklıdır). Etki: tam
  temaslı `polyOverlap` kararları çevrilebilir; yerel köşelerle her karar eşleşir.
- **sfdp macOS'ta yerelden farklı olabilir (indirgenemez: ana makine libm `pow`).**
  Enstrümante edilmiş bir yerel sfdp ile teşhis edildi: konumlar, bir itici kuvvet
  terimi olan `pow(dist, 1 - p)` (`spring_electrical.c`, `p = -1` olduğundan
  `pow(x, 2)`) macOS libm'den `x*x`'ten 1 ulp az döndürene kadar bit düzeyinde özdeş
  kalır (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, doğru yuvarlanmış
  `…396`; örneklenen 16201 `v` değerinden 20'si için macOS `pow(v, 2) != v*v`). Bu,
  yinelemenin `Fnorm` değerini son bitte değiştirir; sfdp'nin uyarlamalı soğutması bunu
  farklı (çoğunlukla aynalanmış) bir yerleşime yükseltir. Portun `armPow`'u ARM'ın
  optimized-routines `pow`'udur (glibc ≥ 2.28), yani Linux Graphviz'in hesapladığı
  şey; macOS kâhini istisnadır. Elendi: tohumlama (açık `start=` değerleri
  eşleşir), `pcp_rotate` (aynı girdi aynı çıktıyı verir), konumlar ve çekici terim
  (bit düzeyinde özdeş). Örnek: varsayılan tohumda tek bir üçgen `a--b; a--c; b--c`.
- **fdp ana makine libm `cos`/`sin` üzerinden yerelden farklı olabilir.** fdp,
  15.0.0 sonrası Graphviz'i izler (hypot-uzaklığı itme, `Mlimit`); ana makine libm'in
  `hypot`'u bit bit yeniden üretilir (`src/common/libm-hypot.ts`, 400 bin örnekte 0
  uyuşmazlık). fdp ile işlenebilen 252 golden girdisinden 251'i yerel derlemeyle tam
  eşleşir; kalan biri (`parallel-cluster-ldbxtried`) küme port düğümlerini
  `T_Wd * cos(alpha)` ile yerleştirir ve macOS libm `cos(-2.3840764867756761)`,
  V8'in `Math.cos`'undan 1 ulp farklıdır; fdp'nin kuvvet döngüsü bunu yaklaşık 3
  inç'e yükseltir. Apple'ın `cos`'u, `hypot`'un olduğu gibi kısa bir modelden yeniden
  üretilemez.
- **Portun tanımladığı yerel çökmeler.** Yerel Graphviz, `model=mds` ve bir kenar
  `len`'i olan neato `mode=KK`'da (`mds_model`, `GD_dist`'i 1 tabanlı bir sıra
  numarasıyla dizinler: yığın taşması) ve bağlantısız bir grafla `model=circuit`'te
  139 koduyla çıkar. Port ilk durumda aralık dışı hücreleri bırakır, ikincisinde
  en kısa yollara geri döner; karşılaştırılacak yerel çıktı yoktur.

---

## Bilerek taşınmayanlar (hedef dışı) {#intentionally-not-ported-non-goals}

Bunlar hata değil, bilinçli kapsam sınırlarıdır. Kitaplık **SVG**'yi hedefler
(artı `json` / `xdot` / `dot` / imagemap ara metin biçimleri).

- **Diğer çıktı biçimleri.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS ve
  GUI/etkileşimli arka uçlar kapsam dışıdır. Raster gerekiyorsa SVG çıktısını
  kullanın ve aşağı akışta dönüştürün.
- **SVG için `page=` sayfalama.** Yerel `dot` da SVG'yi sayfalamaz (SVG aygıtı hiçbir
  sayfalama bayrağı ayarlamaz), bu yüzden `page=` her iki uygulamada da bu yolda
  işlemsizdir — burada yalnızca yaygın bir kafa karışıklığı noktası olduğu için
  belgelenmiştir.
- **`-Tplain` metin çıktısı.** Ertelendi (sadık bir metin biçimi), dışlanmadı.
- **`gvpr`** (graf işleme betik dili) — kapsam dışı.
- **C++ kolaylık sarmalayıcıları** (`cgraph++`, `gvc++`) — önce C API'si taşınır;
  istenirse deyimsel TypeScript kolaylık katmanı ayrı bir paket olurdu.
- **Tarayıcı metin ölçümünde `fontnames=svg|ps`.** Bir tarayıcıda canvas ölçücü,
  yazı tipini PostScript takma adının `fontnames=native` aile listesinden kurar
  (`Times-Roman` → `Times, serif`); SVG yayıcısının varsayılan olarak işlediği aynı
  yüz. `TextMeasurer` graf bağlamı taşımaz; bu yüzden `fontnames=svg` veya
  `fontnames=ps` ayarlayan graflar yerel listeye göre ölçülürken SVG svg/ps ailesini
  adlandırır. CSS'in tanımlamadığı takma ad ağırlıkları (`book`, `demi`, `light`,
  `medium`, `roman`) C'deki gibi olduğu gibi yayılır; tarayıcılar onları yok sayar ve
  normal ağırlığı işler, ölçücü de eşleşmek için normal ağırlığı ölçer. Node çıktısı
  etkilenmez (canvas ölçücüyü hiç kullanmaz).
- **Tarayıcı güvenli eşdeğerlerle değiştirilen yerel mekanikler**: dinamik eklenti
  yükleme (`dlopen`) statik motor/işleyici kaydıyla değiştirilir; dosya sistemi
  okumaları (yazı tipleri, görseller, yapılandırma) çağıran tarafından sağlanan
  geri çağrılarla (örn. `setImageSizer`) değiştirilir. Davranış korunur; mekanizma
  farklıdır.

---

## Bir farklılığı bildirme {#reporting-a-divergence}

C'den farklı olan ve yukarıdaki kabul edilen bir fark **olmayan**, `PARITY-dot.md`
içinde bulunmayan ve hedef dışı olmayan bir çıktı bulursanız, bu bildirmeye değer bir
hatadır — C kaynağı belirtimdir ve listelenmemiş farklar kabul edilmiş davranış değil,
kusur olarak ele alınır.
