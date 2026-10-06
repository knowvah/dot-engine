---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanonická odchylka A2 v metrice písma (historická) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Stav: vyřešeno — proc3d je nyní shodný
Od přechodu na `EstimateTextMeasurer` (`239c51b`, 2026-06-25) měří portace i
headless C orákulum text stejným modelem `estimate_textspan_size`.
Opětovné spuštění níže uvedené reprodukce proti aktuálnímu stromu vrací
**0 rozdílů, maxDelta 0** pro `tests/graphs/proc3d.gv` — rozdíl dokumentovaný na
této stránce se již nereprodukuje. Třída A2 jako celek se pro instance proc3d v
korpusu **zhroutila**; aktuální, nezmrazené počty viz [Známé odchylky §A2](/cs/divergences#a2-text-measurement-font-metrics-label-driven-layout)
a [Parita](/parity). Tato stránka zůstává zachována jako historický rozbor
příčiny — níže popsaný mechanismus je skutečný a poučný, jen u tohoto grafu už
nevytváří pozorovatelný rozdíl.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) byl učebnicovým
případem [metriky písma A2](/cs/divergences#a2-text-measurement-font-metrics-label-driven-layout):
podpixelový rozdíl v měření textu posunul x-ové pozice uzlů o několik bodů, čímž
graf skončil na **structural-match**. Tato stránka je samostatný rozbor, na který
odkazuje seznam odchylek, a popisuje, *proč* k tomu došlo, než byly měřiče
sjednoceny.

## Vstup {#input}

| | |
|---|---|
| **Modul** | `dot` |
| **Zdroj** | `tests/graphs/proc3d.gv` (z upstreamového testovacího korpusu [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 řádků |
| **Klíčové atributy** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Proč se lišil (příčina, tehdy) {#why-it-diverged-root-cause-at-the-time}

Rozvržení x-ové sítě pomocí network simplex bylo věrné; jediným rozdílem bylo, že
měřič písma portace z té doby hlásil některé **široké popisky** o zlomek bodu širší
než měření nativního orákula opřené o FreeType. Nejširšími popisky v proc3d jsou
oválné uzly s cestami k souborům — např. `/home/ek/work/src/lefty/lefty.c`, přesně
ten řetězec, který [`known-divergences.md` §A2](/cs/divergences#a2-text-measurement-font-metrics-label-driven-layout)
naměřil jako **+0.75 pt (+0.43%)**. Širší popisek znamenal o něco širší uzel,
jehož poloviční šířka vstupovala do omezení vzdálenosti zleva doprava zaokrouhlených
pomocí `ROUND()`; network simplex pak zvolil mírně odlišné (stejně optimální)
celočíselné přiřazení x. Výsledkem byl téměř rovnoměrný posun x o **≤ 3.55 pt**
na výkrese o šířce ~2620 pt — úroveň, pořadí, topologie a y-ové souřadnice
shodné. Oprava nebyla záplatou specifickou pro proc3d: přechod na
`EstimateTextMeasurer` dal oběma stranám stejný headless model měření, což
odstranilo nadměrné měření širokých popisků, které tento posun způsobovalo.

## Rozdíl — golden vs. naše, překryto {#the-delta-—-golden-vs-ours-overlaid}

Golden (**zeleně**) a naše (**červeně**) přes sebe ve stejném rámu. V plném
měřítku splynou do hněda — posun je pod hranicí vnímání (proto
*structural-match*).

![Překryv proc3d golden vs. naše, celý výkres: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Po zvětšení se zeleno-červený lem objevuje **téměř výhradně na dlouhých oválných
popiscích s cestami k souborům** — přesně těch širokých řetězcích, které měřič
měří nadměrně. Uzly s kódem/obdélníky zůstávají v souběhu:

![Překryv proc3d zvětšený na široké oválné popisky cest: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Celé výkresy — nejprve golden, potom naše {#full-drawings-—-golden-first-ours-second}

| Golden — nativní `dot` | Naše — @knowvah/dot-engine |
|---|---|
| ![proc3d vykreslený C Graphviz](/img/proc3d-golden.svg) | ![proc3d vykreslený @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Čísla (v době vzniku této stránky) {#numbers-at-the-time-this-page-was-written}

| metrika | hodnota |
|---|---|
| verdikt | structural-match |
| maxDelta (portace vs. nativní) | 3.55 pt |
| popisky posunuté v x | 73 / 73 (téměř rovnoměrně) |
| x-ový rozsah výkresu | ~2620 pt → posun činí 0.13% |
| úroveň / pořadí / topologie / y | shodné s C |

**Aktuální čísla** (znovu ověřena proti živému stromu): verdikt
**conformant**, 0 rozdílů, maxDelta 0 — viz poznámka o stavu na začátku této
stránky. Překryvné obrázky výše jsou zachovány jako snímek mechanismu, nikoli jako
živé porovnání.

## Reprodukce {#reproduce}

Nativní orákulum běží pod headless `GVBINDIR` (`/tmp/ghl`, z
`test/corpus/gen-headless-gvbindir.sh`), takže obě strany používají stejný měřič
`estimate_textspan_size` — viz
[§A2 „Isolating the algorithm from the font backend“](/cs/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Dnešní spuštění vytváří shodná SVG (0 rozdílů při toleranci `deterministic`
±0.01) namísto rozdílu 3.55pt popsaného výše.
