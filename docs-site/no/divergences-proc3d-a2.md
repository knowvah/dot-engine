---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — det kanoniske A2-avviket i skriftmetrikk (historisk) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: løst — proc3d er nå samsvarende
Siden overgangen til `EstimateTextMeasurer` (`239c51b`, 2026-06-25) måler både
porten og det hodeløse C-orakelet tekst med samme modell,
`estimate_textspan_size`.
Å kjøre reproduksjonen nedenfor på nytt mot dagens tre gir **0 forskjeller,
maxDelta 0** for `tests/graphs/proc3d.gv` — deltaet som er dokumentert på denne siden
lar seg ikke lenger reprodusere. A2-klassen som helhet har **kollapset** for
korpusets proc3d-tilfeller; se [Kjente avvik §A2](/no/divergences#a2-text-measurement-font-metrics-label-driven-layout)
og [Paritet](/parity) for gjeldende, ikke-frosne tall. Denne siden beholdes som
den historiske rotårsaksanalysen — mekanismen nedenfor er ekte og lærerik,
den gir bare ikke lenger noe observerbart delta på denne grafen.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) var det
typiske [A2-skriftmetrikk](/no/divergences#a2-text-measurement-font-metrics-label-driven-layout)-tilfellet:
en tekstmålingsforskjell under pikselnivå forskjøv x-posisjonene til nodene med noen
få punkter, slik at grafen havnet på **structural-match**. Denne siden er den
selvstendige gjennomgangen som det refereres til fra avviklisten, og beskriver *hvorfor*
det skjedde før målerne ble samlet.

## Inndata {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Kilde** | `tests/graphs/proc3d.gv` (fra Graphviz' [oppstrøms](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) testkorpus) — 443 linjer |
| **Nøkkelattributter** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Hvorfor den avvek (rotårsak, den gang) {#why-it-diverged-root-cause-at-the-time}

Layouten med x-nettverkssimpleks var trofast; den eneste forskjellen var at
portens skriftmåler fra den tiden rapporterte noen **brede etiketter** en brøkdel av
et punkt bredere enn den FreeType-baserte målingen til det innebygde orakelet. proc3ds
bredeste etiketter er filsti-ovalene — f.eks. `/home/ek/work/src/lefty/lefty.c`,
nøyaktig den strengen som [`known-divergences.md` §A2](/no/divergences#a2-text-measurement-font-metrics-label-driven-layout)
målte til **+0.75 pt (+0.43 %)**. En bredere etikett ga en litt bredere node,
hvis halvbredde inngikk i de `ROUND()`-avrundede separasjonsbegrensningene fra venstre til høyre;
nettverkssimpleksen valgte da en marginalt annerledes (like optimal) heltallig
x-tilordning. Resultatet var et nesten jevnt x-skift på **≤ 3.55 pt** over en
tegning på ~2620 pt — rang, rekkefølge, topologi og y-koordinater identiske. Løsningen
var ikke en proc3d-spesifikk lapp: overgangen til `EstimateTextMeasurer` satte begge
sider på samme hodeløse målemodell, noe som eliminerte
overmålingen av brede etiketter som drev dette skiftet.

## Deltaet — golden mot vår, lagt over hverandre {#the-delta-—-golden-vs-ours-overlaid}

Golden (**grønn**) og vår (**rød**) lagt over hverandre i samme utsnitt. I full
størrelse blandes de til brunt — skiftet ligger under persepsjonsterskelen (derfor
*structural-match*).

![proc3d golden mot vår som overlegg, hele tegningen: grønn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Zoomet inn viser den grønne/røde kanten seg **nesten utelukkende på de lange
filsti-ovalene** — nettopp de brede strengene måleren overmåler. Kode-/boksnodene
forblir sammenfallende:

![proc3d-overlegg zoomet inn på de brede sti-etikett-ovalene: grønn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Hele tegningene — golden først, vår deretter {#full-drawings-—-golden-first-ours-second}

| Golden — innebygd `dot` | Vår — @knowvah/dot-engine |
|---|---|
| ![proc3d rendret av C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendret av @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Tall (da denne siden ble skrevet) {#numbers-at-the-time-this-page-was-written}

| måling | verdi |
|---|---|
| dom | structural-match |
| maxDelta (port mot innebygd) | 3.55 pt |
| etiketter forskjøvet i x | 73 / 73 (nesten jevnt) |
| tegningens x-utstrekning | ~2620 pt → skiftet er 0.13 % |
| rang / rekkefølge / topologi / y | identisk med C |

**Gjeldende tall** (verifisert på nytt mot det aktive treet): dom
**conformant**, 0 forskjeller, maxDelta 0 — se statusmerknaden øverst på
denne siden. Overleggsbildene ovenfor beholdes som et øyeblikksbilde av mekanismen, ikke
som en levende sammenligning.

## Reproduser {#reproduce}

Det innebygde orakelet kjøres under den hodeløse `GVBINDIR` (`/tmp/ghl`, fra
`test/corpus/gen-headless-gvbindir.sh`), slik at begge sider bruker samme
`estimate_textspan_size`-måler — se
[§A2 «Isolating the algorithm from the font backend»](/no/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Å kjøre dette i dag gir samsvarende SVG-er (0 forskjeller ved `deterministic`-toleransen
på ±0.01) i stedet for deltaet på 3.55pt som er beskrevet ovenfor.
