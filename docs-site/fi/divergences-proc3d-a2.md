---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanoninen A2-fonttimetriikkapoikkeama (historiallinen) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Tila: ratkaistu — proc3d on nyt yhdenmukainen
`EstimateTextMeasurer`-siirtymästä (`239c51b`, 2026-06-25) lähtien sekä porttaus
että headless-C-oraakkeli mittaavat tekstin samalla
`estimate_textspan_size`-mallilla.
Alla olevan toistoesimerkin ajaminen uudelleen nykyistä puuta vasten antaa
**0 eroa, maxDelta 0** tiedostolle `tests/graphs/proc3d.gv` — tällä sivulla
dokumentoitu ero ei enää toistu. A2-luokka kokonaisuutena on
korpuksen proc3d-esiintymien osalta **romahtanut**; katso [Tunnetut poikkeamat §A2](/fi/divergences#a2-text-measurement-font-metrics-label-driven-layout)
ja [Pariteetti](/parity) ajantasaisia, ei jäädytettyjä lukuja varten. Tämä sivu
säilytetään historiallisena juurisyyanalyysina — alla kuvattu mekanismi on todellinen ja
opettavainen, se vain ei enää tuota havaittavaa eroa tällä graafilla.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) oli
oppikirjaesimerkki [A2-fonttimetriikasta](/fi/divergences#a2-text-measurement-font-metrics-label-driven-layout):
alipikselin tekstinmittauserolla solmujen x-sijainnit siirtyivät muutaman pisteen,
ja graafi päätyi arvioon **structural-match**. Tämä sivu on
poikkeamaluettelosta viitattu erillinen läpikäynti, joka kuvaa, *miksi* niin kävi
ennen kuin mittaajat yhtenäistettiin.

## Syöte {#input}

| | |
|---|---|
| **Moottori** | `dot` |
| **Lähde** | `tests/graphs/proc3d.gv` (peräisin upstreamin [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)-testikorpuksesta) — 443 riviä |
| **Keskeiset attribuutit** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Miksi se poikkesi (juurisyy, tuolloin) {#why-it-diverged-root-cause-at-the-time}

X-verkkosimpleksiasettelu oli uskollinen; ainoa ero oli, että
tuon ajan porttauksen fonttimittaaja raportoi joidenkin **leveiden nimiöiden** olevan
murto-osan pistettä leveämpiä kuin natiivin oraakkelin FreeType-pohjainen mittaus.
proc3d:n leveimmät nimiöt ovat tiedostopolkuovaalit — esim.
`/home/ek/work/src/lefty/lefty.c`, täsmälleen se merkkijono, jonka
[`known-divergences.md` §A2](/fi/divergences#a2-text-measurement-font-metrics-label-driven-layout)
mittasi arvoon **+0.75 pt (+0.43%)**. Leveämpi nimiö teki hieman leveämmän solmun,
jonka puolileveys syötti `ROUND()`-pyöristettyihin vasemmalta oikealle -erotusrajoitteisiin;
verkkosimpleksi valitsi sitten hieman erilaisen (yhtä optimaalisen) kokonaislukuisen
x-sijoittelun. Tuloksena oli lähes tasainen **≤ 3.55 pt** x-siirtymä
~2620 pt:n piirroksessa — rangi, järjestys, topologia ja y-koordinaatit identtiset. Korjaus
ei ollut proc3d-kohtainen paikkaus: `EstimateTextMeasurer`-siirtymä asetti
molemmat puolet samalle headless-mittausmallille, mikä poisti
leveiden nimiöiden ylimittauksen, joka oli aiheuttanut tämän siirtymän.

## Delta — golden vs. meidän, päällekkäin {#the-delta-—-golden-vs-ours-overlaid}

Golden (**vihreä**) ja meidän (**punainen**) päällekkäin samassa kehyksessä. Täydessä
mittakaavassa ne sekoittuvat ruskeaksi — siirtymä on havaitsematon (siksi
*structural-match*).

![proc3d golden vs. meidän -päällekkäiskuva, koko piirros: vihreä = C, punainen = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Zoomattuna vihreä/punainen reunus näkyy **lähes yksinomaan pitkissä
tiedostopolkuovaalinimiöissä** — täsmälleen niissä leveissä merkkijonoissa, jotka mittaaja ylimittaa. Koodi-/laatikkosolmut
pysyvät päällekkäisinä:

![proc3d-päällekkäiskuva zoomattuna leveisiin polkunimiöovaaleihin: vihreä = C, punainen = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Täydet piirrokset — ensin golden, sitten meidän {#full-drawings-—-golden-first-ours-second}

| Golden — natiivi `dot` | Meidän — @knowvah/dot-engine |
|---|---|
| ![proc3d C Graphvizin renderöimänä](/img/proc3d-golden.svg) | ![proc3d @knowvah/dot-enginen renderöimänä](/img/proc3d-ours.svg) |

## Luvut (tämän sivun kirjoitushetkellä) {#numbers-at-the-time-this-page-was-written}

| mittari | arvo |
|---|---|
| arvio | structural-match |
| maxDelta (porttaus vs. natiivi) | 3.55 pt |
| x-suunnassa siirtyneet nimiöt | 73 / 73 (lähes tasainen) |
| piirroksen x-ulottuvuus | ~2620 pt → siirtymä on 0.13% |
| rangi / järjestys / topologia / y | identtinen C:n kanssa |

**Nykyiset luvut** (varmennettu uudelleen nykyistä puuta vasten): arvio
**conformant**, 0 eroa, maxDelta 0 — katso tilahuomautus tämän
sivun alussa. Yllä olevat päällekkäiskuvat säilytetään mekanismin tilannekuvana,
ei elävänä vertailuna.

## Toista {#reproduce}

Natiivi oraakkeli ajetaan headless-`GVBINDIR`:n alla (`/tmp/ghl`, tiedostosta
`test/corpus/gen-headless-gvbindir.sh`), jotta molemmat puolet käyttävät samaa
`estimate_textspan_size`-mittaajaa — katso
[§A2 ”Isolating the algorithm from the font backend”](/fi/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Tämän ajaminen tänään tuottaa vastaavat SVG:t (0 eroa `deterministic`-toleranssilla
±0.01) eikä yllä kuvattua 3.55 pt:n deltaa.
