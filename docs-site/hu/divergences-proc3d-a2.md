---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — a kanonikus A2 betűmetrikai eltérés (történeti) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Állapot: megoldva — a proc3d mostantól megfelelő
Az `EstimateTextMeasurer` bevezetése (`239c51b`, 2026-06-25) óta a portolt változat és a
fej nélküli (headless) C orákulum egyaránt ugyanazzal az `estimate_textspan_size`
modellel méri a szöveget.
Az alábbi reprodukció ismételt futtatása a jelenlegi fán **0 eltérést, maxDelta 0**
értéket ad a `tests/graphs/proc3d.gv` gráfra — az ezen az oldalon dokumentált
különbség már nem reprodukálható. Az A2 osztály egésze **összeomlott** a
korpusz proc3d példányaira; a jelenlegi, nem befagyasztott számokat lásd: [Ismert eltérések, A2. szakasz](/hu/divergences#a2-text-measurement-font-metrics-label-driven-layout)
és [Paritás](/parity). Ez az oldal történeti gyökérokleírásként marad meg — az
alábbi mechanizmus valós és tanulságos, csak éppen ezen a gráfon már nem okoz
megfigyelhető különbséget.
:::

A `proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) a
tankönyvi [A2 betűmetrikai](/hu/divergences#a2-text-measurement-font-metrics-label-driven-layout)
eset volt: egy képpont alatti szövegmérési különbség néhány ponttal eltolta a csúcsok
x-pozícióit, így a gráf **structural-match** minősítést kapott. Ez az oldal az
eltérések listájából hivatkozott önálló kidolgozás, amely azt írja le, *miért*
történt ez, mielőtt a szövegmérőket egységesítettük.

## Bemenet {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Forrás** | `tests/graphs/proc3d.gv` (az upstream [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv) tesztkorpuszból) — 443 sor |
| **Fő attribútumok** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Miért tért el (gyökérok, az akkori állapotban) {#why-it-diverged-root-cause-at-the-time}

Az x-hálózati szimplex elrendezés hű volt; az egyetlen különbség az volt, hogy a
portolt változat akkori betűmérője néhány **széles címkét** egy pontnál kisebb
mértékben szélesebbnek jelentett, mint a natív orákulum FreeType-alapú
mérése. A proc3d legszélesebb címkéi a fájlútvonal-ovális csúcsok — pl. a `/home/ek/work/src/lefty/lefty.c`,
éppen az a karakterlánc, amelyet a [`known-divergences.md` §A2](/hu/divergences#a2-text-measurement-font-metrics-label-driven-layout)
**+0.75 pt (+0.43%)** értékűnek mért. A szélesebb címke kissé szélesebb csúcsot adott,
amelynek félszélessége a `ROUND()`-dal kerekített balról jobbra irányú távolságkorlátokba
folyt be; a hálózati szimplex ekkor egy kissé más (egyformán optimális) egész értékű
x-kiosztást választott. Az eredmény egy közel egyenletes, **legfeljebb 3.55 pt** x-eltolódás
egy ~2620 pt széles rajzon — a rang, a sorrend, a topológia és az y-koordináták azonosak voltak.
A javítás nem proc3d-specifikus foltozás volt: az `EstimateTextMeasurer` bevezetése
mindkét oldalt ugyanarra a fej nélküli mérési modellre állította, ami megszüntette
az eltolódást okozó széles címkék túlmérését.

## A különbség — golden és a miénk egymásra vetítve {#the-delta-—-golden-vs-ours-overlaid}

A golden (**zöld**) és a miénk (**piros**) ugyanabban a keretben egymásra vetítve. Teljes
méretben barnává keverednek — az eltolódás az érzékelési küszöb alatt van (innen a
*structural-match*).

![A proc3d golden és saját renderelés egymásra vetítve, teljes rajz: zöld = C, piros = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Nagyítva a zöld/piros szegély **szinte kizárólag a hosszú fájlútvonal-oválisok
címkéin** jelenik meg — éppen azokon a széles karakterláncokon, amelyeket a mérő túlmér. A kód-/doboz-
csúcsok egybeesnek:

![A proc3d egymásra vetítése a széles útvonalcímkés oválisokra nagyítva: zöld = C, piros = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Teljes rajzok — először a golden, aztán a miénk {#full-drawings-—-golden-first-ours-second}

| Golden — natív `dot` | A miénk — @knowvah/dot-engine |
|---|---|
| ![A C Graphviz által renderelt proc3d](/img/proc3d-golden.svg) | ![A @knowvah/dot-engine által renderelt proc3d](/img/proc3d-ours.svg) |

## Számok (az oldal megírásakor) {#numbers-at-the-time-this-page-was-written}

| mérőszám | érték |
|---|---|
| minősítés | structural-match |
| maxDelta (portolt vs. natív) | 3.55 pt |
| x irányban eltolódott címkék | 73 / 73 (közel egyenletes) |
| a rajz x-kiterjedése | ~2620 pt → az eltolódás 0.13% |
| rang / sorrend / topológia / y | azonos a C-vel |

**Jelenlegi számok** (az élő fán újraellenőrizve): minősítés
**conformant**, 0 eltérés, maxDelta 0 — lásd az oldal tetején található
állapotjegyzetet. A fenti átfedési képek a mechanizmus pillanatfelvételeként maradtak meg, nem
élő összehasonlításként.

## Reprodukálás {#reproduce}

A natív orákulum a fej nélküli `GVBINDIR` alatt fut (`/tmp/ghl`, a
`test/corpus/gen-headless-gvbindir.sh` szkriptből), így mindkét oldal ugyanazt az
`estimate_textspan_size` mérőt használja — lásd:
[§A2 „Az algoritmus elkülönítése a betűtípus-háttérrendszertől”](/hu/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

A futtatás ma egyező SVG-ket eredményez (0 eltérés a `deterministic`
±0.01 tűrésen), nem pedig a fent leírt 3.55 pt-os eltérést.
