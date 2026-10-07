---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — divergența canonică A2 de metrică a fontului (istoric) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Stare: rezolvată — proc3d este acum conform
Începând cu trecerea la `EstimateTextMeasurer` (`239c51b`, 2026-06-25), atât
portarea, cât și oracolul C fără interfață grafică măsoară textul cu același
model `estimate_textspan_size`.
Rularea din nou a reproducerii de mai jos pe arborele curent returnează **0 diferențe,
maxDelta 0** pentru `tests/graphs/proc3d.gv` — diferența documentată pe această pagină
nu se mai reproduce. Clasa A2 în ansamblu a **colapsat** pentru instanțele proc3d din
corpus; vedeți [Divergențe cunoscute §A2](/ro/divergences#a2-text-measurement-font-metrics-label-driven-layout)
și [Paritate](/parity) pentru numărători curente, nu înghețate. Această pagină este păstrată
ca analiză istorică a cauzei rădăcină — mecanismul de mai jos este real și instructiv,
doar că nu mai produce o diferență observabilă pe acest graf.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) a fost cazul clasic
de [metrică a fontului A2](/ro/divergences#a2-text-measurement-font-metrics-label-driven-layout):
o diferență sub-pixel la măsurarea textului a deplasat pozițiile x ale nodurilor cu
câteva puncte, ducând graful la **structural-match**. Această pagină este analiza
de sine stătătoare la care trimite lista de divergențe și descrie *de ce* s-a întâmplat
aceasta înainte ca măsurătoarele să fie unificate.

## Intrare {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Sursă** | `tests/graphs/proc3d.gv` (din corpusul de teste upstream al [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 de linii |
| **Atribute-cheie** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## De ce a divergit (cauza rădăcină, la acel moment) {#why-it-diverged-root-cause-at-the-time}

Aranjarea x prin simplex de rețea a fost fidelă; singura diferență a fost că
măsurătorul de font al portării din acea perioadă raporta unele **etichete late** cu o fracțiune
de punct mai late decât măsurătoarea oracolului nativ, bazată pe FreeType. Cele mai late
etichete din proc3d sunt ovalele cu căi de fișiere — de exemplu `/home/ek/work/src/lefty/lefty.c`,
exact șirul pe care [`known-divergences.md` §A2](/ro/divergences#a2-text-measurement-font-metrics-label-driven-layout)
l-a măsurat la **+0.75 pt (+0.43%)**. O etichetă mai lată a dat un nod ceva mai lat,
a cărui semilățime a alimentat constrângerile de separare stânga-dreapta rotunjite cu `ROUND()`;
simplexul de rețea a ales apoi o atribuire x întreagă puțin diferită (la fel de optimă).
Rezultatul a fost o deplasare x aproape uniformă de **≤ 3.55 pt** pe un desen de
~2620 pt — rang, ordine, topologie și coordonate y identice. Remedierea
nu a fost un patch specific proc3d: trecerea la `EstimateTextMeasurer` a pus ambele
părți pe același model de măsurare fără interfață grafică, ceea ce a eliminat
diferența de supramăsurare a etichetelor late care provoca această deplasare.

## Diferența — golden versus rezultatul nostru, suprapuse {#the-delta-—-golden-vs-ours-overlaid}

Golden (**verde**) și rezultatul nostru (**roșu**) suprapuse în același cadru. La scară
completă se amestecă într-un maro — deplasarea este sub pragul perceptibil (de aici
*structural-match*).

![proc3d golden-vs-ours overlay, full drawing: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay.svg)

La mărire, marginea verde/roșie apare **aproape în întregime pe etichetele lungi ale ovalelor
cu căi de fișiere** — exact șirurile late pe care măsurătorul le supramăsoară. Nodurile
de cod/casetă rămân suprapuse:

![proc3d overlay zoomed on the wide path-label ovals: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Desenele complete — mai întâi golden, apoi al nostru {#full-drawings-—-golden-first-ours-second}

| Golden — `dot` nativ | Al nostru — @knowvah/dot-engine |
|---|---|
| ![proc3d rendered by C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendered by @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Cifre (la momentul redactării acestei pagini) {#numbers-at-the-time-this-page-was-written}

| metrică | valoare |
|---|---|
| verdict | structural-match |
| maxDelta (portare vs nativ) | 3.55 pt |
| etichete deplasate pe x | 73 / 73 (aproape uniform) |
| extinderea desenului pe x | ~2620 pt → deplasarea este 0.13% |
| rang / ordine / topologie / y | identice cu C |

**Cifrele curente** (reverificate pe arborele activ): verdict
**conformant**, 0 diferențe, maxDelta 0 — vedeți nota de stare de la începutul acestei
pagini. Imaginile de suprapunere de mai sus sunt păstrate ca instantaneu al mecanismului,
nu ca o comparație în timp real.

## Reproducere {#reproduce}

Oracolul nativ rulează sub `GVBINDIR`-ul fără interfață grafică (`/tmp/ghl`, din
`test/corpus/gen-headless-gvbindir.sh`), astfel încât ambele părți folosesc același
măsurător `estimate_textspan_size` — vedeți
[§A2 „Isolating the algorithm from the font backend”](/ro/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Rularea de astăzi produce SVG-uri care se potrivesc (0 diferențe la toleranța
`deterministic` de ±0.01), în loc de diferența de 3.55pt descrisă mai sus.
