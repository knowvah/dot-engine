---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — den kanoniska A2-avvikelsen i typsnittsmått (historisk) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: löst — proc3d är nu konform
Sedan övergången till `EstimateTextMeasurer` (`239c51b`, 2026-06-25) mäter både
porteringen och det headless C-oraklet text med samma modell,
`estimate_textspan_size`.
Om du kör reproduktionen nedan igen mot det aktuella trädet får du **0 skillnader,
maxDelta 0** för `tests/graphs/proc3d.gv` — avvikelsen som dokumenteras på den här
sidan går inte längre att reproducera. Klass A2 som helhet har **kollapsat** för
korpusens proc3d-instanser; se [Kända avvikelser §A2](/sv/divergences#a2-text-measurement-font-metrics-label-driven-layout)
och [Paritet](/parity) för aktuella, inte frysta antal. Den här sidan finns kvar som
historisk orsaksanalys — mekanismen nedan är verklig och lärorik, den ger bara inte
längre någon observerbar skillnad för den här grafen.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) var det klassiska
[A2-fallet med typsnittsmått](/sv/divergences#a2-text-measurement-font-metrics-label-driven-layout):
en skillnad på subpixelnivå i textmätningen förskjöt nodernas x-positioner med
några punkter, så att grafen hamnade på **structural-match**. Den här sidan är den
fristående genomgång som divergenslistan hänvisar till, och den beskriver *varför* det
hände innan mätarna enhetliggjordes.

## Indata {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Källa** | `tests/graphs/proc3d.gv` (från uppströms testkorpus för [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 rader |
| **Viktiga attribut** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Varför den avvek (orsak, vid den tiden) {#why-it-diverged-root-cause-at-the-time}

Layouten med x-nätverkssimplex var trogen; den enda skillnaden var att
porteringens typsnittsmätare från den tiden rapporterade vissa **breda etiketter** en
bråkdel av en punkt bredare än det inbyggda oraklets FreeType-baserade mätning. proc3ds
bredaste etiketter är ovalerna med filsökvägar — till exempel
`/home/ek/work/src/lefty/lefty.c`, exakt den sträng som
[`known-divergences.md` §A2](/sv/divergences#a2-text-measurement-font-metrics-label-driven-layout) mätte till **+0.75 pt (+0.43%)**. En bredare
etikett gav en något bredare nod, vars halva bredd matades in i de med `ROUND()`
avrundade vänster-till-höger-separationsvillkoren; nätverkssimplex valde då en
marginellt annorlunda (lika optimal) heltalstilldelning av x. Resultatet blev en
nästan enhetlig x-förskjutning på **≤ 3.55 pt** över en teckning på ~2620 pt —
rang, ordning, topologi och y-koordinater identiska. Lösningen var ingen
proc3d-specifik patch: övergången till `EstimateTextMeasurer` satte båda sidor på
samma headless-mätmodell, vilket eliminerade den övermätning av breda etiketter som
drev förskjutningen.

## Deltat — golden mot vår, överlagrade {#the-delta-—-golden-vs-ours-overlaid}

Golden (**grönt**) och vår (**rött**) lagda ovanpå varandra i samma ruta. I full
skala blandas de till brunt — förskjutningen är omärkbar (därav
*structural-match*).

![proc3d, överlagring av golden och vår, hela teckningen: grönt = C, rött = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Förstorad syns den gröna/röda kanten **nästan helt på de långa ovala
etiketterna med filsökvägar** — precis de breda strängar som mätaren övermäter.
Kod-/rutnoderna förblir sammanfallande:

![proc3d, överlagring förstorad på de breda ovala sökvägsetiketterna: grönt = C, rött = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Hela teckningar — golden först, vår sedan {#full-drawings-—-golden-first-ours-second}

| Golden — inbyggd `dot` | Vår — @knowvah/dot-engine |
|---|---|
| ![proc3d renderad av C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderad av @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Siffror (när den här sidan skrevs) {#numbers-at-the-time-this-page-was-written}

| mått | värde |
|---|---|
| utlåtande | structural-match |
| maxDelta (portering mot inbyggd) | 3.55 pt |
| etiketter förskjutna i x | 73 / 73 (nästan enhetligt) |
| teckningens utsträckning i x | ~2620 pt → förskjutningen är 0.13% |
| rang / ordning / topologi / y | identiska med C |

**Aktuella siffror** (verifierade på nytt mot det aktuella trädet): utlåtande
**conformant**, 0 skillnader, maxDelta 0 — se statusnotisen överst på den här
sidan. Överlagringsbilderna ovan behålls som ett ögonblicksbildsexempel på mekanismen, inte
som en levande jämförelse.

## Reproducera {#reproduce}

Det inbyggda oraklet körs under det headless `GVBINDIR` (`/tmp/ghl`, från
`test/corpus/gen-headless-gvbindir.sh`) så att båda sidor använder samma
mätare, `estimate_textspan_size` — se
[§A2 ”Isolating the algorithm from the font backend”](/sv/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Om du kör det här i dag får du matchande SVG-filer (0 skillnader vid toleransen
`deterministic` ±0.01) i stället för deltat på 3.55pt som beskrivs ovan.
