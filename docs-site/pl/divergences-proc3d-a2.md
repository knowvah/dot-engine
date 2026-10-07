---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanoniczna rozbieżność A2 w metrykach czcionki (historyczna) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: rozwiązane — proc3d jest teraz zgodny
Od przejścia na `EstimateTextMeasurer` (`239c51b`, 2026-06-25) zarówno port,
jak i bezgłowa wyrocznia w C mierzą tekst tym samym modelem
`estimate_textspan_size`.
Ponowne uruchomienie poniższej reprodukcji na bieżącym drzewie daje **0 różnic,
maxDelta 0** dla `tests/graphs/proc3d.gv` — udokumentowana na tej stronie różnica
już się nie odtwarza. Klasa A2 jako całość **załamała się** dla instancji proc3d
w korpusie; zob. [Znane rozbieżności §A2](/pl/divergences#a2-text-measurement-font-metrics-label-driven-layout)
oraz [Parytet](/parity), gdzie są aktualne, niezamrożone liczby. Ta strona zostaje
jako historyczny opis przyczyny źródłowej — mechanizm poniżej jest prawdziwy i pouczający,
po prostu nie daje już dostrzegalnej różnicy na tym grafie.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) był podręcznikowym
przypadkiem [A2 (metryki czcionki)](/pl/divergences#a2-text-measurement-font-metrics-label-driven-layout):
podpikselowa różnica w pomiarze tekstu przesunęła pozycje x węzłów o kilka
punktów, co sprowadziło graf do **structural-match**. Ta strona to samodzielne
opracowanie, do którego odsyła lista rozbieżności; opisuje, *dlaczego* tak się działo,
zanim ujednolicono mierniki.

## Dane wejściowe {#input}

| | |
|---|---|
| **Silnik** | `dot` |
| **Źródło** | `tests/graphs/proc3d.gv` (z korpusu testowego [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 wiersze |
| **Kluczowe atrybuty** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Dlaczego się rozjechał (przyczyna źródłowa, wówczas) {#why-it-diverged-root-cause-at-the-time}

Układ x oparty na sieciowym simplexie był wierny; jedyna różnica polegała na tym, że
miernik czcionek w porcie z tamtej epoki zgłaszał niektóre **szerokie etykiety** o ułamek
punktu szersze niż pomiar natywnej wyroczni oparty na FreeType. Najszersze etykiety w proc3d
to owale ze ścieżkami plików — np. `/home/ek/work/src/lefty/lefty.c`,
dokładnie ten ciąg, który [`known-divergences.md` §A2](/pl/divergences#a2-text-measurement-font-metrics-label-driven-layout)
zmierzył jako **+0.75 pt (+0.43%)**. Szersza etykieta dawała nieco szerszy węzeł,
którego połowa szerokości trafiała do zaokrąglanych przez `ROUND()` ograniczeń
separacji od lewej do prawej; sieciowy simplex wybierał wtedy minimalnie inne
(równie optymalne) całkowitoliczbowe przypisanie x. Wynikiem było niemal jednolite
przesunięcie x o **≤ 3.55 pt** na rysunku o szerokości ~2620 pt — ranga, kolejność,
topologia i współrzędne y identyczne. Poprawką nie była łatka specyficzna dla proc3d:
przejście na `EstimateTextMeasurer` postawiło obie strony na tym samym bezgłowym modelu
pomiaru, co wyeliminowało nadmierny pomiar szerokich etykiet, który napędzał to przesunięcie.

## Różnica — golden vs nasz, nałożone {#the-delta-—-golden-vs-ours-overlaid}

Golden (**zielony**) i nasz (**czerwony**) nałożone w tej samej ramce. W pełnej
skali mieszają się w brąz — przesunięcie jest niezauważalne (stąd
*structural-match*).

![Nakładka proc3d golden vs nasz, cały rysunek: zielony = C, czerwony = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Po powiększeniu zielono-czerwona obwódka pojawia się **niemal wyłącznie na długich owalnych
etykietach ze ścieżkami plików** — dokładnie na tych szerokich ciągach, które miernik zawyża.
Węzły kodu/prostokątów pozostają pokryte:

![Nakładka proc3d powiększona na szerokie owalne etykiety ścieżek: zielony = C, czerwony = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Pełne rysunki — najpierw golden, potem nasz {#full-drawings-—-golden-first-ours-second}

| Golden — natywny `dot` | Nasz — @knowvah/dot-engine |
|---|---|
| ![proc3d wyrenderowany przez C Graphviz](/img/proc3d-golden.svg) | ![proc3d wyrenderowany przez @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Liczby (z chwili powstania tej strony) {#numbers-at-the-time-this-page-was-written}

| metryka | wartość |
|---|---|
| werdykt | structural-match |
| maxDelta (port vs natywny) | 3.55 pt |
| etykiety przesunięte w x | 73 / 73 (niemal jednolicie) |
| rozpiętość rysunku w x | ~2620 pt → przesunięcie to 0.13% |
| ranga / kolejność / topologia / y | identyczne jak w C |

**Aktualne liczby** (zweryfikowane ponownie na bieżącym drzewie): werdykt
**conformant**, 0 różnic, maxDelta 0 — zob. notę o statusie na początku tej
strony. Obrazy nakładek powyżej zostają jako migawka mechanizmu, nie jako
porównanie na żywo.

## Odtwarzanie {#reproduce}

Natywna wyrocznia działa pod bezgłowym `GVBINDIR` (`/tmp/ghl`, z
`test/corpus/gen-headless-gvbindir.sh`), dzięki czemu obie strony używają tego samego
miernika `estimate_textspan_size` — zob.
[§A2 „Isolating the algorithm from the font backend”](/pl/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Uruchomienie tego dziś daje zgodne SVG (0 różnic przy tolerancji `deterministic`
±0.01) zamiast opisanej powyżej różnicy 3.55pt.
