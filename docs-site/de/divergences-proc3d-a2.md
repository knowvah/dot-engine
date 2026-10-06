---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — die kanonische A2-Schriftmetrik-Abweichung (historisch) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: behoben — proc3d ist jetzt konform
Seit der Umstellung auf `EstimateTextMeasurer` (`239c51b`, 2026-06-25) vermessen sowohl
die Portierung als auch das Headless-C-Orakel Text mit demselben Modell
`estimate_textspan_size`.
Eine erneute Ausführung der untenstehenden Reproduktion gegen den aktuellen Stand liefert
**0 Unterschiede, maxDelta 0** für `tests/graphs/proc3d.gv` — die auf dieser Seite
dokumentierte Abweichung lässt sich nicht mehr reproduzieren. Die Klasse A2 insgesamt ist
für die proc3d-Instanzen des Korpus **kollabiert**; siehe [Bekannte Abweichungen §A2](/de/divergences#a2-text-measurement-font-metrics-label-driven-layout)
und [Parität](/parity) für aktuelle, nicht eingefrorene Zählwerte. Diese Seite bleibt als
historische Ursachenanalyse erhalten — der Mechanismus unten ist real und lehrreich, er
erzeugt bei diesem Graphen lediglich keine beobachtbare Abweichung mehr.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) war der klassische
[A2-Schriftmetrik](/de/divergences#a2-text-measurement-font-metrics-label-driven-layout)-Fall:
Ein Unterschied in der Textvermessung im Subpixelbereich verschob die x-Positionen der
Knoten um einige Punkte, womit der Graph bei **structural-match** landete. Diese Seite ist
die eigenständige Ausarbeitung, auf die die Liste der Abweichungen verweist, und
beschreibt, *warum* das geschah, bevor die Measurer vereinheitlicht wurden.

## Eingabe {#input}

| | |
|---|---|
| **Engine** | `dot` |
| **Quelle** | `tests/graphs/proc3d.gv` (aus dem Upstream-Testkorpus von [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 Zeilen |
| **Wichtige Attribute** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Warum sie abwich (Ursache, damals) {#why-it-diverged-root-cause-at-the-time}

Das x-Netzwerk-Simplex-Layout war originalgetreu; der einzige Unterschied war, dass der
Schriftmesser der Portierung aus dieser Zeit einige **breite Labels** um einen Bruchteil
eines Punkts breiter meldete als die FreeType-gestützte Messung des nativen Orakels. Die
breitesten Labels von proc3d sind die ovalen Dateipfade — z. B.
`/home/ek/work/src/lefty/lefty.c`, genau die Zeichenkette, die
[`known-divergences.md` §A2](/de/divergences#a2-text-measurement-font-metrics-label-driven-layout) mit **+0.75 pt (+0.43%)** gemessen hat. Ein breiteres
Label ergab einen etwas breiteren Knoten, dessen Halbbreite in die per `ROUND()`
gerundeten Links-nach-rechts-Abstands-Constraints einfloss; der Netzwerk-Simplex wählte dann
eine geringfügig andere (gleich optimale) ganzzahlige x-Zuordnung. Das Ergebnis war eine
nahezu einheitliche x-Verschiebung von **≤ 3.55 pt** über eine Zeichnung von ~2620 pt —
Rang, Reihenfolge, Topologie und y-Koordinaten identisch. Die Lösung war kein
proc3d-spezifischer Patch: Die Umstellung auf `EstimateTextMeasurer` brachte beide Seiten
auf dasselbe Headless-Vermessungsmodell, wodurch die Überbemessung breiter Labels beseitigt
wurde, die diese Verschiebung verursacht hatte.

## Das Delta — Golden vs. Ours, überlagert {#the-delta-—-golden-vs-ours-overlaid}

Golden (**grün**) und Ours (**rot**) im selben Ausschnitt übereinandergelegt. In voller
Größe mischen sie sich zu Braun — die Verschiebung ist nicht wahrnehmbar (daher
*structural-match*).

![Überlagerung proc3d Golden vs. Ours, gesamte Zeichnung: grün = C, rot = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Vergrößert erscheint der grün/rote Saum **fast ausschließlich an den langen ovalen
Dateipfad-Labels** — genau den breiten Zeichenketten, die der Measurer zu groß vermisst.
Die Code-/Box-Knoten bleiben deckungsgleich:

![Überlagerung proc3d, vergrößert auf die breiten ovalen Pfad-Labels: grün = C, rot = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Vollständige Zeichnungen — erst Golden, dann Ours {#full-drawings-—-golden-first-ours-second}

| Golden — natives `dot` | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d, gerendert von C Graphviz](/img/proc3d-golden.svg) | ![proc3d, gerendert von @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Zahlen (zum Zeitpunkt der Erstellung dieser Seite) {#numbers-at-the-time-this-page-was-written}

| Metrik | Wert |
|---|---|
| Urteil | structural-match |
| maxDelta (Portierung vs. nativ) | 3.55 pt |
| in x verschobene Labels | 73 / 73 (nahezu einheitlich) |
| x-Ausdehnung der Zeichnung | ~2620 pt → Verschiebung beträgt 0.13% |
| Rang / Reihenfolge / Topologie / y | identisch zu C |

**Aktuelle Zahlen** (gegen den aktuellen Stand neu verifiziert): Urteil
**conformant**, 0 Unterschiede, maxDelta 0 — siehe den Statushinweis am Anfang dieser
Seite. Die Überlagerungsbilder oben bleiben als Momentaufnahme des Mechanismus erhalten,
nicht als Live-Vergleich.

## Reproduzieren {#reproduce}

Das native Orakel läuft unter dem Headless-`GVBINDIR` (`/tmp/ghl`, aus
`test/corpus/gen-headless-gvbindir.sh`), sodass beide Seiten denselben Measurer
`estimate_textspan_size` verwenden — siehe
[§A2 „Isolating the algorithm from the font backend“](/de/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Die heutige Ausführung erzeugt übereinstimmende SVGs (0 Unterschiede bei der Toleranz
`deterministic` ±0.01) statt des oben beschriebenen Deltas von 3.55pt.
