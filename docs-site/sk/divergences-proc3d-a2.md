---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanonická odchýlka A2 vo fontových metrikách (historická) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Stav: vyriešené — proc3d je teraz zhodný
Od prechodu na `EstimateTextMeasurer` (`239c51b`, 2026-06-25) merajú port aj
bezhlavé orákulum v C text rovnakým modelom
`estimate_textspan_size`.
Opätovné spustenie nižšie uvedenej reprodukcie na aktuálnom strome vráti **0 rozdielov,
maxDelta 0** pre `tests/graphs/proc3d.gv` — rozdiel zdokumentovaný na tejto stránke
sa už nereprodukuje. Trieda A2 ako celok sa pre inštancie proc3d v
korpuse **zrútila**; aktuálne, nezmrazené počty nájdete v [Známych odchýlkach §A2](/sk/divergences#a2-text-measurement-font-metrics-label-driven-layout)
a v [Parite](/parity). Táto stránka sa ponecháva ako
historický rozbor príčiny — nižšie opísaný mechanizmus je skutočný a poučný,
len už pri tomto grafe nevytvára pozorovateľný rozdiel.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) bol učebnicovým
prípadom [fontových metrík A2](/sk/divergences#a2-text-measurement-font-metrics-label-driven-layout):
podpixelový rozdiel v meraní textu posunul x-ové polohy uzlov o niekoľko
bodov, čím graf skončil ako **structural-match**. Táto stránka je
samostatný rozbor, na ktorý odkazuje zoznam odchýlok, a popisuje, *prečo*
k tomu došlo, kým sa merače nezjednotili.

## Vstup {#input}

| | |
|---|---|
| **Modul** | `dot` |
| **Zdroj** | `tests/graphs/proc3d.gv` (z testovacieho korpusu [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) upstreamu) — 443 riadkov |
| **Kľúčové atribúty** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Prečo sa líšil (príčina vtedy) {#why-it-diverged-root-cause-at-the-time}

Rozloženie x pomocou sieťového simplexu bolo verné; jediný rozdiel bol v tom, že
fontový merač portu z tej doby hlásil niektoré **široké popisky** o zlomok
bodu širšie než meranie orákula založené na FreeType. Najširšie popisky v proc3d
sú ovály s cestami k súborom — napr. `/home/ek/work/src/lefty/lefty.c`,
presne ten reťazec, ktorý [`known-divergences.md` §A2](/sk/divergences#a2-text-measurement-font-metrics-label-driven-layout)
nameral s **+0.75 pt (+0.43%)**. Širší popisok dal o niečo širší uzol,
ktorého polovičná šírka vstupovala do ľavo-pravých separačných obmedzení zaokrúhlených
pomocou `ROUND()`; sieťový simplex potom zvolil mierne odlišné (rovnako optimálne) celočíselné
priradenie x. Výsledkom bol takmer rovnomerný posun x o **≤ 3.55 pt** na výkrese
dlhom ~2620 pt — poradie, usporiadanie, topológia a súradnice y boli identické. Oprava
nebola záplata špecifická pre proc3d: prechod na `EstimateTextMeasurer` dal obom
stranám rovnaký bezhlavý model merania, čím sa odstránila
medzera v nadmernom meraní širokých popiskov, ktorá tento posun spôsobovala.

## Rozdiel — golden vs. naše, prekryté {#the-delta-—-golden-vs-ours-overlaid}

Golden (**zelený**) a naše (**červené**) prekryté v rovnakom zábere. V plnej
mierke splývajú do hnedej — posun je nepostrehnuteľný
(preto *structural-match*).

![Prekrytie proc3d golden vs. naše, celý výkres: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Pri priblížení sa zeleno-červený lem objavuje **takmer výlučne na dlhých ovalových
popiskoch s cestami k súborom** — presne tých širokých reťazcoch, ktoré merač nadmerne meria. Uzly
s kódom/rámčeky zostávajú splývajúce:

![Prekrytie proc3d priblížené na široké ovály s popiskami ciest: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Celé výkresy — najprv golden, potom naše {#full-drawings-—-golden-first-ours-second}

| Golden — natívny `dot` | Naše — @knowvah/dot-engine |
|---|---|
| ![proc3d vykreslený cez C Graphviz](/img/proc3d-golden.svg) | ![proc3d vykreslený cez @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Čísla (v čase napísania tejto stránky) {#numbers-at-the-time-this-page-was-written}

| metrika | hodnota |
|---|---|
| verdikt | structural-match |
| maxDelta (port vs. natívny) | 3.55 pt |
| popisky posunuté v x | 73 / 73 (takmer rovnomerne) |
| rozsah výkresu v x | ~2620 pt → posun je 0.13% |
| poradie / usporiadanie / topológia / y | identické s C |

**Aktuálne čísla** (znovu overené na živom strome): verdikt
**conformant**, 0 rozdielov, maxDelta 0 — pozri poznámku o stave na začiatku tejto
stránky. Obrázky s prekrytím vyššie sa ponechávajú ako momentka mechanizmu, nie
ako živé porovnanie.

## Reprodukcia {#reproduce}

Natívne orákulum beží pod bezhlavým `GVBINDIR` (`/tmp/ghl`, z
`test/corpus/gen-headless-gvbindir.sh`), takže obe strany používajú rovnaký
merač `estimate_textspan_size` — pozri
[§A2 „Isolating the algorithm from the font backend“](/sk/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Spustenie dnes vytvorí zhodné SVG (0 rozdielov pri tolerancii `deterministic`
±0.01), a nie rozdiel 3.55pt opísaný vyššie.
