---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — kanooniline A2 fondimeetrika erinevus (ajalooline) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Olek: lahendatud — proc3d on nüüd vastav
Alates `EstimateTextMeasurer`-i ülemineku hetkest (`239c51b`, 2026-06-25) mõõdavad nii
port kui ka peata C-oraakel teksti sama mudeliga
`estimate_textspan_size`.
Allpool toodud reprodutseerimise taaskäivitamine praeguse puu vastu annab faili
`tests/graphs/proc3d.gv` puhul **0 erinevust, maxDelta 0** — sellel lehel dokumenteeritud
delta enam ei reprodutseeru. A2 klass tervikuna on korpuse proc3d eksemplaride osas
**kollapseerunud**; vt [Teadaolevad erinevused §A2](/et/divergences#a2-text-measurement-font-metrics-label-driven-layout)
ja [Paarsus](/parity) praeguste, mittekülmutatud arvude kohta. See leht säilitatakse
ajaloolise algpõhjuse kirjeldusena — allpool kirjeldatud mehhanism on päris ja õpetlik,
see lihtsalt ei tekita sellel graafil enam täheldatavat deltat.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) oli
õpikunäide [A2 fondimeetrika](/et/divergences#a2-text-measurement-font-metrics-label-driven-layout)
juhtumist: piksli-alune tekstimõõtmise erinevus nihutas sõlmede x-positsioone paari
punkti võrra, mille tulemusena jäi graaf hinnangule **structural-match**. See leht on
eraldiseisev analüüs, millele viidatakse erinevuste loendist, ja kirjeldab, *miks* see
juhtus enne mõõtjate ühtlustamist.

## Sisend {#input}

| | |
|---|---|
| **Mootor** | `dot` |
| **Allikas** | `tests/graphs/proc3d.gv` (ülesvoolu [Graphvizi](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) testkorpusest) — 443 rida |
| **Võtmeatribuudid** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Miks see erines (algpõhjus, tollal) {#why-it-diverged-root-cause-at-the-time}

X-võrgu simpleksi paigutus oli ustav; ainus erinevus oli see, et
selle ajastu pordi fondimõõtja teatas mõnede **laiade siltide** laiuseks natuke
rohkem kui natiivse oraakli FreeType-põhine mõõtmine. proc3d
laiimad sildid on failiteede ovaalid — nt `/home/ek/work/src/lefty/lefty.c`,
täpselt see string, mille [`known-divergences.md` §A2](/et/divergences#a2-text-measurement-font-metrics-label-driven-layout)
mõõtis tulemusega **+0.75 pt (+0.43%)**. Laiem silt tegi sõlme veidi laiemaks,
ja selle poolläbimõõt sattus `ROUND()`-itud vasakult-paremale eraldusnõuetesse; seejärel
valis võrgu simpleks veidi erineva (võrdselt optimaalse) täisarvulise
x-jaotuse. Tulemuseks oli peaaegu ühtlane **≤ 3.55 pt** x-nihe ~2620 pt
joonisel — aste, järjestus, topoloogia ja y-koordinaadid identsed. Parandus
ei olnud proc3d-spetsiifiline plaaster: `EstimateTextMeasurer`-i üleminek viis mõlemad
pooled samale peata mõõtmismudelile, mis kõrvaldas
laiade siltide ülemõõtmise lõhe, mis seda nihet põhjustas.

## Delta — golden vs meie, kattuvalt {#the-delta-—-golden-vs-ours-overlaid}

Golden (**roheline**) ja meie (**punane**) pealeklapitult samas kaadris. Täismastaabis
segunevad need pruuniks — nihe on tajumatu (seega
*structural-match*).

![proc3d golden-vs-ours katteskeem, kogu joonis: roheline = C, punane = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Suurendatuna ilmub roheline/punane ääris **peaaegu täielikult pikkade failiteede ovaalsetele
siltidele** — täpselt neile laiadele stringidele, mida mõõtja üle mõõdab. Kood-/kastisõlmed
jäävad kattuma:

![proc3d kate suurendatuna laiadele teesiltide ovaalidele: roheline = C, punane = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Täielikud joonised — esimesena golden, teisena meie {#full-drawings-—-golden-first-ours-second}

| Golden — natiivne `dot` | Meie — @knowvah/dot-engine |
|---|---|
| ![proc3d, renderdatud C Graphvizi poolt](/img/proc3d-golden.svg) | ![proc3d, renderdatud @knowvah/dot-engine'i poolt](/img/proc3d-ours.svg) |

## Arvud (selle lehe kirjutamise ajal) {#numbers-at-the-time-this-page-was-written}

| mõõdik | väärtus |
|---|---|
| hinnang | structural-match |
| maxDelta (port vs natiivne) | 3.55 pt |
| x-suunas nihkunud silte | 73 / 73 (peaaegu ühtlane) |
| joonise x-ulatus | ~2620 pt → nihe on 0.13% |
| aste / järjestus / topoloogia / y | identne C-ga |

**Praegused arvud** (taaskontrollitud elava puu vastu): hinnang
**conformant**, 0 erinevust, maxDelta 0 — vt selle lehe alguses olevat
olekumärkust. Ülaltoodud kattepildid säilitatakse mehhanismi hetktõmmisena, mitte
elava võrdlusena.

## Reprodutseerimine {#reproduce}

Natiivne oraakel töötab peata `GVBINDIR` all (`/tmp/ghl`, failist
`test/corpus/gen-headless-gvbindir.sh`), nii et mõlemad pooled kasutavad sama
`estimate_textspan_size` mõõtjat — vt
[§A2 „Isolating the algorithm from the font backend“](/et/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Selle tänane käitamine annab sobivad SVG-d (0 erinevust `deterministic`
±0.01 tolerantsi juures), mitte ülal kirjeldatud 3.55 pt deltat.
