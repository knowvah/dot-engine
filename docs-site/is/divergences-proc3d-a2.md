---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — hið kanóníska A2-frávik í leturmælikvörðum (söguleg) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Staða: leyst — proc3d er nú samræmt
Frá og með umskiptunum yfir í `EstimateTextMeasurer` (`239c51b`, 2026-06-25) mæla bæði
yfirfærslan og ósýnilega (headless) C-véfréttin texta með sama líkani,
`estimate_textspan_size`.
Ný keyrsla á endurgerðinni hér að neðan á núverandi tré skilar
**0 mismun, maxDelta 0** fyrir `tests/graphs/proc3d.gv` — fráviksmunurinn sem er
skjalfestur á þessari síðu endurskapast ekki lengur. A2-flokkurinn í heild hefur
**fallið saman** fyrir proc3d-tilvik safnsins; sjá [Þekkt frávik §A2](/is/divergences#a2-text-measurement-font-metrics-label-driven-layout)
og [Jöfnuð](/parity) fyrir núverandi, ófrystar talningar. Þessi síða er varðveitt sem
söguleg rótargreining — verkunin hér að neðan er raunveruleg og lærdómsrík,
hún veldur bara ekki lengur sjáanlegum mun á þessu grafi.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) var skólabókardæmið um
[A2-leturmælikvarða](/is/divergences#a2-text-measurement-font-metrics-label-driven-layout):
munur á textamælingu undir dílastigi færði x-stöður hnúta um
nokkra punkta og lét grafið lenda á **structural-match**. Þessi síða er sjálfstæða
greinargerðin sem vísað er í úr lista frávika og lýsir því *hvers vegna* það gerðist
áður en mælarnir voru sameinaðir.

## Inntak {#input}

| | |
|---|---|
| **Vél** | `dot` |
| **Uppruni** | `tests/graphs/proc3d.gv` (úr prófunarsafni [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) í upprunaverkefninu) — 443 línur |
| **Lykileigindir** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Hvers vegna það vék (rót, á þeim tíma) {#why-it-diverged-root-cause-at-the-time}

Uppsetningin með x-netsímplex var trú; eini munurinn var að
leturmælir yfirfærslunnar á þeim tíma skilaði nokkrum **breiðum merkimiðum** broti úr
punkti breiðari en FreeType-studd mæling innbyggðu véfréttarinnar. Breiðustu merkimiðar proc3d
eru skráarslóðasporöskjurnar — t.d. `/home/ek/work/src/lefty/lefty.c`,
strengurinn sem [`known-divergences.md` §A2](/is/divergences#a2-text-measurement-font-metrics-label-driven-layout)
mældi á **+0.75 pt (+0.43%)**. Breiðari merkimiði gaf aðeins breiðari hnút,
þar sem hálfbreiddin fór í skorður um aðskilnað frá vinstri til hægri sem eru `ROUND()`-aðar; 
netsímplexinn valdi þá lítillega ólíka (jafn besta) heiltölu-x-úthlutun. Útkoman var nær jöfn
**≤ 3.55 pt** x-færsla yfir um 2620 pt teikningu — þrep, röð, grannfræði og y-hnit eins. Lagfæringin
var ekki sértækur plástur fyrir proc3d: umskiptin yfir í `EstimateTextMeasurer` settu báðar
hliðar á sama ósýnilega mælingalíkanið, sem útrýmdi
ofmælingarbilinu á breiðum merkimiðum sem knúði þessa færslu.

## Munurinn — golden á móti okkar, lagt yfir {#the-delta-—-golden-vs-ours-overlaid}

Golden (**grænt**) og okkar (**rautt**) lögð hvort yfir annað í sama ramma. Í fullri
stærð blandast þau í brúnt — færslan er ósýnileg (þess vegna
*structural-match*).

![Yfirlag proc3d, golden á móti okkar, öll teikningin: grænt = C, rautt = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Þegar rennt er nær birtist græni/rauði jaðarinn **nánast alfarið á löngu skráarslóðasporöskjutextunum**
— nákvæmlega breiðu strengjunum sem mælirinn ofmælir. Kóða-/kassahnútar
haldast samfallandi:

![Yfirlag proc3d, rennt að breiðu slóðasporöskjunum: grænt = C, rautt = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Heilar teikningar — golden fyrst, okkar annað {#full-drawings-—-golden-first-ours-second}

| Golden — innbyggt `dot` | Okkar — @knowvah/dot-engine |
|---|---|
| ![proc3d teiknað af C-útgáfu Graphviz](/img/proc3d-golden.svg) | ![proc3d teiknað af @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Tölur (þegar þessi síða var skrifuð) {#numbers-at-the-time-this-page-was-written}

| mælikvarði | gildi |
|---|---|
| dómur | structural-match |
| maxDelta (yfirfærsla á móti innbyggðu) | 3.55 pt |
| merkimiðar færðir í x | 73 / 73 (nær jafnt) |
| x-útbreiðsla teikningar | ~2620 pt → færslan er 0.13% |
| þrep / röð / grannfræði / y | eins og í C |

**Núverandi tölur** (staðfestar að nýju á lifandi tré): dómur
**conformant**, 0 mismunir, maxDelta 0 — sjá stöðuathugasemdina efst á
þessari síðu. Yfirlagsmyndirnar hér að ofan eru varðveittar sem ljósmynd af verkuninni, ekki
sem lifandi samanburður.

## Endurskapa {#reproduce}

Innbyggða véfréttin keyrir undir ósýnilega (headless) `GVBINDIR` (`/tmp/ghl`, úr
`test/corpus/gen-headless-gvbindir.sh`) svo báðar hliðar nota sama
mæli, `estimate_textspan_size` — sjá
[§A2 „Isolating the algorithm from the font backend“](/is/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Að keyra þetta í dag gefur samsvarandi SVG (0 mismunir við `deterministic`
vikmörkin ±0.01) frekar en 3.55pt muninn sem lýst er hér að ofan.
