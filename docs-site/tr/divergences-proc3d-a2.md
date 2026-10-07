---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanonik A2 yazı tipi metriği farkı (tarihsel) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Durum: çözüldü — proc3d artık uyumlu
`EstimateTextMeasurer` geçişinden (`239c51b`, 2026-06-25) itibaren hem port hem de
başsız C kâhini metni aynı `estimate_textspan_size` modeliyle ölçer.
Aşağıdaki yeniden üretimi güncel ağaca karşı yeniden çalıştırmak, `tests/graphs/proc3d.gv`
için **0 fark, maxDelta 0** döndürür — bu sayfada belgelenen fark artık yeniden
üretilemiyor. A2 sınıfının tamamı, derlemin proc3d örnekleri için **çöktü**; güncel,
dondurulmamış sayılar için bkz. [Bilinen farklılıklar §A2](/tr/divergences#a2-text-measurement-font-metrics-label-driven-layout)
ve [Parite](/parity). Bu sayfa tarihsel kök neden yazımı olarak saklanır — aşağıdaki
mekanizma gerçektir ve öğreticidir, yalnızca bu grafta artık gözlemlenebilir bir fark
üretmez.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`), ders kitabı
niteliğinde bir [A2 yazı tipi metriği](/tr/divergences#a2-text-measurement-font-metrics-label-driven-layout)
örneğiydi: piksel altı bir metin ölçümü farkı düğüm x konumlarını birkaç punto
kaydırıyor ve grafı **structural-match** düzeyine düşürüyordu. Bu sayfa,
farklılıklar listesinden başvurulan bağımsız çalışmadır; ölçücüler birleştirilmeden
önce bunun *neden* olduğunu anlatır.

## Girdi {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Kaynak** | `tests/graphs/proc3d.gv` (yukarı akış [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) test derleminden) — 443 satır |
| **Anahtar öznitelikler** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Neden ayrıştı (kök neden, o zaman) {#why-it-diverged-root-cause-at-the-time}

x-ağ simpleksi yerleşimi sadıktı; tek fark, o dönemdeki portun yazı tipi ölçücüsünün
bazı **geniş etiketleri**, yerel kâhinin FreeType destekli ölçümünden bir puntonun
kesri kadar daha geniş bildirmesiydi. proc3d'nin en geniş etiketleri dosya yolu
ovalleridir — örn. `/home/ek/work/src/lefty/lefty.c`, [`known-divergences.md` §A2](/tr/divergences#a2-text-measurement-font-metrics-label-driven-layout)'nin
**+0.75 pt (+%0,43)** olarak ölçtüğü tam dizge. Daha geniş bir etiket biraz daha geniş
bir düğüm demekti; bunun yarım genişliği `ROUND()` edilen soldan sağa ayrım
kısıtlarını besledi; ağ simpleksi de marjinal olarak farklı (eşit derecede en iyi)
bir tamsayı x ataması seçti. Sonuç, ~2620 pt'lik bir çizim üzerinde neredeyse düzgün
**≤ 3.55 pt**'lik bir x kaymasıydı — sıra, düzen, topoloji ve y koordinatları özdeş.
Düzeltme proc3d'ye özgü bir yama değildi: `EstimateTextMeasurer` geçişi iki tarafı
da aynı başsız ölçüm modeline oturttu ve bu kaymayı süren geniş etiket aşırı ölçüm
boşluğunu ortadan kaldırdı.

## Fark — golden ve bizimki, bindirilmiş {#the-delta-—-golden-vs-ours-overlaid}

Golden (**yeşil**) ve bizimki (**kırmızı**) aynı çerçevede üst üste bindirilmiştir.
Tam ölçekte kahverengiye karışırlar — kayma algılanamaz düzeydedir (bu yüzden
*structural-match*).

![proc3d golden ve bizimki bindirmesi, tüm çizim: yeşil = C, kırmızı = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Yakınlaştırıldığında yeşil/kırmızı saçak **neredeyse tamamen uzun dosya yolu oval
etiketlerinde** görünür — ölçücünün fazla ölçtüğü tam olarak o geniş dizgeler.
Kod/kutu düğümleri çakışık kalır:

![proc3d bindirmesi, geniş yol etiketi ovallerine yakınlaştırılmış: yeşil = C, kırmızı = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Tam çizimler — önce golden, sonra bizimki {#full-drawings-—-golden-first-ours-second}

| Golden — yerel `dot` | Bizimki — @knowvah/dot-engine |
|---|---|
| ![C Graphviz ile işlenmiş proc3d](/img/proc3d-golden.svg) | ![@knowvah/dot-engine ile işlenmiş proc3d](/img/proc3d-ours.svg) |

## Sayılar (bu sayfa yazıldığı sırada) {#numbers-at-the-time-this-page-was-written}

| metrik | değer |
|---|---|
| karar | structural-match |
| maxDelta (port ve yerel) | 3.55 pt |
| x'te kayan etiketler | 73 / 73 (neredeyse düzgün) |
| çizim x kapsamı | ~2620 pt → kayma %0,13 |
| sıra / düzen / topoloji / y | C ile özdeş |

**Güncel sayılar** (canlı ağaca karşı yeniden doğrulandı): karar
**conformant**, 0 fark, maxDelta 0 — bu sayfanın başındaki durum notuna bakın.
Yukarıdaki bindirme görselleri, canlı bir karşılaştırma olarak değil, mekanizmanın
bir anlık görüntüsü olarak saklanır.

## Yeniden üretme {#reproduce}

Yerel kâhin, başsız `GVBINDIR` altında çalışır (`/tmp/ghl`, kaynağı
`test/corpus/gen-headless-gvbindir.sh`); böylece her iki taraf da aynı
`estimate_textspan_size` ölçücüsünü kullanır — bkz.
[§A2 “Isolating the algorithm from the font backend”](/tr/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Bunu bugün çalıştırmak, yukarıda anlatılan 3.55pt farkı yerine eşleşen SVG'ler
üretir (`deterministic` ±0.01 toleransında 0 fark).
