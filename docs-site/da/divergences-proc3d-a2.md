---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — den kanoniske A2-afvigelse i skrifttypemetrik (historisk) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: løst — proc3d er nu conformant
Siden overgangen til `EstimateTextMeasurer` (`239c51b`, 2026-06-25) måler både
porten og den headless C-orakel tekst med den samme model,
`estimate_textspan_size`.
Kører du reproduktionen nedenfor igen mod det nuværende træ, får du **0 forskelle,
maxDelta 0** for `tests/graphs/proc3d.gv` — den forskel, der er dokumenteret på denne
side, kan ikke længere reproduceres. A2-klassen som helhed er **kollapset** for
korpussets proc3d-instanser; se [Kendte afvigelser §A2](/da/divergences#a2-text-measurement-font-metrics-label-driven-layout)
og [Paritet](/parity) for aktuelle, ikke-frosne tal. Denne side bevares som den
historiske årsagsanalyse — mekanismen nedenfor er reel og lærerig, den giver bare
ikke længere en observerbar forskel på denne graf.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) var det klassiske
[A2-skrifttypemetrik](/da/divergences#a2-text-measurement-font-metrics-label-driven-layout)-tilfælde:
en tekstmålingsforskel under en pixel forskød knudernes x-positioner med nogle få
punkter, så grafen endte på **structural-match**. Denne side er den
selvstændige gennemgang, som listen over afvigelser henviser til, og den beskriver,
*hvorfor* det skete, før målerne blev forenet.

## Input {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Kilde** | `tests/graphs/proc3d.gv` (fra det opstrøms testkorpus i [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 linjer |
| **Nøgleattributter** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Hvorfor den afveg (årsag, dengang) {#why-it-diverged-root-cause-at-the-time}

Layoutet med x-netværkssimpleks var tro mod C; den eneste forskel var, at
portens skrifttypemåler fra den tid rapporterede nogle **brede labels** en brøkdel
af et punkt bredere end det native orakels FreeType-baserede måling. proc3d's
bredeste labels er de ovale filstier — fx `/home/ek/work/src/lefty/lefty.c`,
den præcise streng, som [`known-divergences.md` §A2](/da/divergences#a2-text-measurement-font-metrics-label-driven-layout)
målte til **+0.75 pt (+0.43%)**. En bredere label gav en lidt bredere knude,
hvis halve bredde indgik i de `ROUND()`-afrundede venstre-til-højre-separationsbetingelser;
netværkssimplekset valgte derefter en marginalt anderledes (lige så optimal)
heltallig x-tildeling. Resultatet var en næsten ensartet x-forskydning på **≤ 3.55 pt**
over en tegning på ~2620 pt — rang, rækkefølge, topologi og y-koordinater identiske. Rettelsen
var ikke en proc3d-specifik patch: overgangen til `EstimateTextMeasurer` satte begge
sider på den samme headless målemodel, hvilket fjernede
overmålingen af brede labels, der drev denne forskydning.

## Deltaet — golden mod vores, lagt oven på hinanden {#the-delta-—-golden-vs-ours-overlaid}

Golden (**grøn**) og vores (**rød**) lagt oven på hinanden i samme billedfelt. I fuld
størrelse blandes de til brun — forskydningen er umærkelig (deraf
*structural-match*).

![proc3d golden mod vores som overlejring, hele tegningen: grøn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Forstørret optræder den grønne/røde kant **næsten udelukkende på de lange ovale
filsti-labels** — netop de brede strenge, som måleren overmåler. Kode-/boksknuderne
forbliver sammenfaldende:

![proc3d-overlejring forstørret på de brede ovale sti-labels: grøn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Hele tegninger — golden først, vores bagefter {#full-drawings-—-golden-first-ours-second}

| Golden — native `dot` | Vores — @knowvah/dot-engine |
|---|---|
| ![proc3d renderet af C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderet af @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Tal (da denne side blev skrevet) {#numbers-at-the-time-this-page-was-written}

| måling | værdi |
|---|---|
| dom | structural-match |
| maxDelta (port mod native) | 3.55 pt |
| labels forskudt i x | 73 / 73 (næsten ensartet) |
| tegningens x-udstrækning | ~2620 pt → forskydningen er 0.13% |
| rang / rækkefølge / topologi / y | identisk med C |

**Aktuelle tal** (genverificeret mod det levende træ): dom
**conformant**, 0 forskelle, maxDelta 0 — se statusnoten øverst på denne
side. Overlejringsbillederne ovenfor bevares som et øjebliksbillede af mekanismen, ikke
som en levende sammenligning.

## Reproducér {#reproduce}

Det native orakel kører under den headless `GVBINDIR` (`/tmp/ghl`, fra
`test/corpus/gen-headless-gvbindir.sh`), så begge sider bruger den samme måler,
`estimate_textspan_size` — se
[§A2 „Isolér algoritmen fra skrifttypebackenden“](/da/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Kører man det i dag, får man matchende SVG'er (0 forskelle ved `deterministic`-tolerancen
±0.01) i stedet for det delta på 3.55pt, der er beskrevet ovenfor.
