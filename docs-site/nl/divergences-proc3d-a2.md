---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — de canonieke A2-lettertypemetriekafwijking (historisch) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: opgelost — proc3d is nu conformant
Sinds de omschakeling naar `EstimateTextMeasurer` (`239c51b`, 2026-06-25) meten zowel de
port als het headless C-orakel tekst met hetzelfde
model `estimate_textspan_size`.
Het opnieuw uitvoeren van de reproductie hieronder op de huidige tree geeft **0 verschillen,
maxDelta 0** voor `tests/graphs/proc3d.gv` — het op deze pagina gedocumenteerde verschil
reproduceert niet meer. De A2-klasse als geheel is voor de
proc3d-instanties van het corpus **ingestort**; zie [Bekende afwijkingen §A2](/nl/divergences#a2-text-measurement-font-metrics-label-driven-layout)
en [Pariteit](/parity) voor actuele, niet-bevroren aantallen. Deze pagina blijft bewaard als
historisch verslag van de grondoorzaak — het onderstaande mechanisme is echt en leerzaam,
het veroorzaakt alleen geen waarneembaar verschil meer bij deze graaf.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) was het
schoolvoorbeeld van een [A2-lettertypemetriek](/nl/divergences#a2-text-measurement-font-metrics-label-driven-layout)-geval:
een subpixel-verschil in tekstmeting verschoof knoop-x-posities met een
paar punten, waardoor de graaf op **structural-match** uitkwam. Deze pagina is de
zelfstandige uitwerking waarnaar de lijst met afwijkingen verwijst en beschrijft *waarom* dat
gebeurde voordat de meters werden verenigd.

## Invoer {#input}

| | |
|---|---|
| **Engine** | `dot` |
| **Bron** | `tests/graphs/proc3d.gv` (uit het upstream-testcorpus van [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 regels |
| **Kernattributen** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Waarom hij afweek (grondoorzaak, destijds) {#why-it-diverged-root-cause-at-the-time}

De x-netwerksimplex-lay-out was getrouw; het enige verschil was dat de
lettertypemeter van de port uit die tijd sommige **brede labels** een fractie van
een punt breder rapporteerde dan de op FreeType gebaseerde meting van het native orakel. De
breedste labels van proc3d zijn de ovalen met bestandspaden — bijv. `/home/ek/work/src/lefty/lefty.c`,
precies de string die [`known-divergences.md` §A2](/nl/divergences#a2-text-measurement-font-metrics-label-driven-layout)
mat op **+0.75 pt (+0.43%)**. Een breder label gaf een iets bredere knoop,
waarvan de halve breedte de met `ROUND()` afgeronde links-naar-rechts-scheidingsbeperkingen voedde; het
netwerksimplex koos daarop een marginaal andere (even optimale) gehele
x-toewijzing. Het resultaat was een vrijwel uniforme x-verschuiving van **≤ 3.55 pt** over een
tekening van ~2620 pt — rang, volgorde, topologie en y-coördinaten identiek. De oplossing
was geen proc3d-specifieke patch: de omschakeling naar `EstimateTextMeasurer` zette beide
kanten op hetzelfde headless meetmodel, wat de kloof van te grote
breedtemeting bij brede labels wegnam die deze verschuiving veroorzaakte.

## Het verschil — golden vs. ours, over elkaar gelegd {#the-delta-—-golden-vs-ours-overlaid}

Golden (**groen**) en ours (**rood**) over elkaar in hetzelfde kader. Op volledige
schaal vloeien ze samen tot bruin — de verschuiving is niet waarneembaar (vandaar
*structural-match*).

![Overlay proc3d golden vs. ours, volledige tekening: groen = C, rood = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ingezoomd zit de groen/rode rand **vrijwel volledig op de lange ovale labels met bestandspaden** —
precies de brede strings die de meter te groot meet. De code-/boxknopen
blijven samenvallen:

![Overlay proc3d, ingezoomd op de brede ovalen met padlabels: groen = C, rood = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Volledige tekeningen — eerst golden, dan ours {#full-drawings-—-golden-first-ours-second}

| Golden — native `dot` | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d gerenderd door C Graphviz](/img/proc3d-golden.svg) | ![proc3d gerenderd door @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Cijfers (ten tijde van het schrijven van deze pagina) {#numbers-at-the-time-this-page-was-written}

| metriek | waarde |
|---|---|
| oordeel | structural-match |
| maxDelta (port vs. native) | 3.55 pt |
| labels verschoven in x | 73 / 73 (vrijwel uniform) |
| x-uitgestrektheid van de tekening | ~2620 pt → verschuiving is 0.13% |
| rang / volgorde / topologie / y | identiek aan C |

**Actuele cijfers** (opnieuw geverifieerd op de live tree): oordeel
**conformant**, 0 verschillen, maxDelta 0 — zie de statusnotitie bovenaan deze
pagina. De overlay-afbeeldingen hierboven blijven bewaard als momentopname van het mechanisme, niet
als live vergelijking.

## Reproduceren {#reproduce}

Het native orakel draait onder de headless `GVBINDIR` (`/tmp/ghl`, uit
`test/corpus/gen-headless-gvbindir.sh`), zodat beide kanten dezelfde
`estimate_textspan_size`-meter gebruiken — zie
[§A2 “Isolating the algorithm from the font backend”](/nl/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Als u dit vandaag uitvoert, krijgt u overeenkomende SVG's (0 verschillen bij de `deterministic`-tolerantie
van ±0.01) in plaats van het hierboven beschreven verschil van 3.55pt.
