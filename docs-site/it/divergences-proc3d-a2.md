---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — la divergenza canonica A2 nelle metriche dei font (storica) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Stato: risolto — proc3d è ora conforme
A partire dal passaggio a `EstimateTextMeasurer` (`239c51b`, 2026-06-25), sia il
porting sia l'oracolo C headless misurano il testo con lo stesso modello
`estimate_textspan_size`.
Rieseguire la riproduzione qui sotto sull'albero attuale restituisce **0 differenze,
maxDelta 0** per `tests/graphs/proc3d.gv` — lo scarto documentato in questa pagina
non si riproduce più. La classe A2 nel suo complesso è **collassata** per le istanze
proc3d del corpus; vedi [Divergenze note §A2](/it/divergences#a2-text-measurement-font-metrics-label-driven-layout)
e [Parità](/parity) per i conteggi attuali, non congelati. Questa pagina è conservata
come analisi storica della causa radice — il meccanismo descritto sotto è reale e
istruttivo, semplicemente non produce più uno scarto osservabile su questo grafo.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) era il caso da manuale
delle [metriche dei font A2](/it/divergences#a2-text-measurement-font-metrics-label-driven-layout):
una differenza di misurazione del testo sotto il pixel spostava le posizioni x dei nodi
di alcuni punti, portando il grafo a **structural-match**. Questa pagina è la trattazione
autonoma citata dall'elenco delle divergenze, e descrive *perché* ciò accadeva prima che
i misuratori venissero unificati.

## Input {#input}

| | |
|---|---|
| **Motore** | `dot` |
| **Sorgente** | `tests/graphs/proc3d.gv` (dal corpus di test di [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) upstream) — 443 righe |
| **Attributi chiave** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Perché divergeva (causa radice, all'epoca) {#why-it-diverged-root-cause-at-the-time}

Il layout network simplex della x era fedele; l'unica differenza era che il misuratore
di font del porting di quell'epoca riportava alcune **etichette larghe** più larghe di
una frazione di punto rispetto alla misurazione dell'oracolo nativo basata su FreeType.
Le etichette più larghe di proc3d sono gli ovali con i percorsi di file — ad es.
`/home/ek/work/src/lefty/lefty.c`, la stessa stringa che
[`known-divergences.md` §A2](/it/divergences#a2-text-measurement-font-metrics-label-driven-layout)
ha misurato a **+0.75 pt (+0.43%)**. Un'etichetta più larga dava un nodo leggermente più
largo, la cui semilarghezza alimentava i vincoli di separazione sinistra-destra
arrotondati con `ROUND()`; il network simplex sceglieva allora un'assegnazione x intera
marginalmente diversa (ugualmente ottimale). Il risultato era uno spostamento x quasi
uniforme di **≤ 3.55 pt** su un disegno di ~2620 pt — rango, ordine, topologia e
coordinate y identici. La correzione non fu una patch specifica per proc3d: il passaggio
a `EstimateTextMeasurer` ha messo entrambi i lati sullo stesso modello di misurazione
headless, eliminando il divario di sovramisurazione delle etichette larghe che causava
questo spostamento.

## Lo scarto — golden contro nostro, sovrapposti {#the-delta-—-golden-vs-ours-overlaid}

Golden (**verde**) e nostro (**rosso**) sovrapposti nella stessa inquadratura. A scala
intera si fondono in marrone — lo spostamento è impercettibile (da cui
*structural-match*).

![Sovrapposizione proc3d golden vs. nostro, disegno intero: verde = C, rosso = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ingrandita, la frangia verde/rossa compare **quasi interamente sulle lunghe etichette
ovali dei percorsi di file** — esattamente le stringhe larghe che il misuratore
sovramisura. I nodi di codice/riquadro restano coincidenti:

![Sovrapposizione proc3d ingrandita sulle ampie etichette ovali dei percorsi: verde = C, rosso = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Disegni completi — prima il golden, poi il nostro {#full-drawings-—-golden-first-ours-second}

| Golden — `dot` nativo | Nostro — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizzato da Graphviz in C](/img/proc3d-golden.svg) | ![proc3d renderizzato da @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Numeri (al momento della stesura di questa pagina) {#numbers-at-the-time-this-page-was-written}

| metrica | valore |
|---|---|
| verdetto | structural-match |
| maxDelta (porting vs nativo) | 3.55 pt |
| etichette spostate in x | 73 / 73 (quasi uniforme) |
| estensione x del disegno | ~2620 pt → lo spostamento è 0.13% |
| rango / ordine / topologia / y | identici a C |

**Numeri attuali** (riverificati sull'albero attivo): verdetto **conformant**, 0
differenze, maxDelta 0 — vedi la nota di stato in cima a questa pagina. Le immagini di
sovrapposizione qui sopra sono conservate come istantanea del meccanismo, non come
confronto dal vivo.

## Riprodurre {#reproduce}

L'oracolo nativo gira con il `GVBINDIR` headless (`/tmp/ghl`, da
`test/corpus/gen-headless-gvbindir.sh`) così entrambi i lati usano lo stesso
misuratore `estimate_textspan_size` — vedi
[§A2 «Isolating the algorithm from the font backend»](/it/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Eseguire questo comando oggi produce SVG coincidenti (0 differenze alla tolleranza
`deterministic` di ±0.01) invece dello scarto di 3.55pt descritto sopra.
