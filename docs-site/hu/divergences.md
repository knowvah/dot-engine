---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# A C nyelvű Graphviz-től ismert eltérések {#known-divergences-from-c-graphviz}

A @knowvah/dot-engine a lehető legnagyobb hűségre törekszik a kanonikus C
implementációhoz képest. A C forráskód a specifikáció; egy fel nem sorolt
különbség hibának számít, nem elfogadott viselkedésnek.

> **Mit jelent itt az „egyezés”.** A korpusz `conformant` nevű paritásminősítése
> egy **szoros determinisztikus tűrés**, *nem* az SVG szó szerinti, bájtról bájtra
> való egyenlősége: a numerikus koordinátáknak és útvonalaknak **±0.01** értéken belül kell
> egyezniük, minden nem numerikus tartalomnak (címkék, színek, szöveg) pedig pontosan
> egyenlőnek kell lennie (`compareSvg(…, 'deterministic')`). Ebben a dokumentumban az „egyezés” és a
> „megfelelő” (conformant) erre a tűrésen alapuló minősítésre utal. A teljes definíció:
> [Megfelelőség](./conformance.md).

Ahol a kimenet *valóban* eltér, ott az pontosan a három osztály egyikébe esik:

1. **Elfogadott eltérések** — olyan különbségek, amelyeket kivizsgáltunk, a gyökérokig
   megértettünk, és **szándékosan úgy döntöttünk, hogy nem tesszük őket megfelelővé**. Mindegyik korlátos,
   jellemzett és alább indokolt. Ezek nem hibák, és nem
   „javítjuk” őket külön, önállóan körülhatárolt ok nélkül.
2. **Nyomon követett hosszú farok** — ismert hiányosságok, amelyeket *be fogunk* zárni,
   mindegyikhez orákulumhoz rögzített javítással. Ezek élő számokkal a
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
   fájlban találhatók.
3. **Nem-célok** — szándékos hatókörhatárok (olyan formátumok és mechanizmusok, amelyek
   reprodukálását soha nem tűztük ki célul).

A mérvadó, folyamatosan frissített nyilvántartások a
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(bemenetenkénti paritás-irányítópult a natív `dot`-hoz képest) és a
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(algoritmusszintű portolási állapotleltár).

Annak **géppel olvasható** forrása, hogy mely gráfok *elfogadottak* (az alábbi 1. osztály), a
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Az eszközök jelentéskészítéskor összekapcsolják vele a többit: a `PARITY-dot.md` szétválasztja az **elfogadott eltéréseket**
a **nyomon követett** hátraléktól, a szabálykapu pedig ebből veszi az engedélyezőlistáját. Az
alábbi prózai szakaszok minden bejegyzést megmagyaráznak (az A1 és az A3 élő; az A2 lezárt, és
történetként maradt meg); egy CI-teszt (`accepted-divergences.test.ts`) érvényesíti, hogy
minden elfogadott gráf továbbra is eltér, így ez a lista nem rohadhat el észrevétlenül.

---

## Elfogadott eltérések (szándékosan nem tesszük megfelelővé) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Egy eltérést — a bájtparitás hajszolása helyett — csak akkor fogadunk el, ha az
alábbiak **mindegyike** teljesül:

- A gyökérok egy **hordozhatósági korlát** (valami, amit a JavaScript-/
  böngészős futtatókörnyezet nem tud pontosan reprodukálni), nem pedig a portolt változat logikai hibája.
- A különbség **az érzékelési küszöb alatti** és bizonyíthatóan **korlátos**.
- A javítás **aránytalan költséggel és hatókörrel** járna a
  nyereséghez képest (jellemzően: egy olyan közös primitívhez nyúlna, amelyet
  több száz már megfelelő gráf használ, egy képpontnyi töredéknyi
  nyereségért regressziót kockáztatva).

Amikor elfogadunk egy eltérést, itt jellemezzük, hogy a felhasználókat soha ne érje meglepetés.
Az elfogadott eltéréssel érintett gráfokat bájtmérce helyett **szerkezeti /
tűréses** mércével ellenőrizzük.

### A1. Lebegőpontos determinizmus (erővezérelt motorok) {#a1-floating-point-determinism-force-directed-engines}

**Érintett:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (az iteratív,
rugómodell-alapú motorok). A `dot` motor *elrendezését* **nem** érinti ez az
iteratív modell-determinizmus; egy különálló, szűken korlátos `dot` spline-vezetési
lebegőpontos eltérést az alábbi **A3** tárgyal.

> **Hatókör, történetileg meg nem mért fenntartás — mára részben megmérve.** A
> **fő dot-motoros SVG-felmérés** (`test/corpus/survey.ts`) továbbra is
> **csak dot**: a natív orákulum a `GVBINDIR=/tmp/ghl` alatt fut, amely
> **csak** a `core` + `dot_layout` bővítményeket linkeli
> (a `test/corpus/gen-headless-gvbindir.sh` pontosan a `core dot_layout`-on
> megy végig — nincs jelen `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` elrendezés-bővítmény),
> és az orákulumot és a portolt változatot is a `dot` motorral hívjuk meg. Így az olyan korpusz-azonosítók,
> mint a `*_neato` / `*_circo` / `root_twopi`, ezen a felmérésen csak *fájlnevek*, amelyeket
> `dot`-tal rendezünk el, nem a natív motorjukkal, és az A1 itt **nulla**
> gráfra illeszkedik — nem azért, mert a motorok bizonyítottan megfelelők, hanem mert
> ez a felmérés sosem terheli őket.
>
> **De mind a hat A1 motornak van már saját natív motoros felmérése** a
> `test/corpus/engine-walk.ts` + `parity-report.ts` révén (`GVBINDIR`-től független —
> mindegyik közvetlenül a `dot -K <engine> -Txdot` parancsot indítja), két különböző szigorúsági
> szinten, amelyeket alább külön dokumentálunk: a `circo`/`twopi`/`osage` ugyanazon a
> **±0.01 determinisztikus** tűrésen fut, mint a dot-felmérés, azonosítónkénti gyökérok-
> osztályozással (alább: „Motorsáv-elfogadás”); a `neato`/`fdp`/`sfdp` lazább,
> **±0.5 jellemzési** tűréssel fut, még azonosítónkénti osztályozás nélkül
> (alább: „Az iteratív motorok jellemzése”). A jelenlegi motorokon átívelő számok:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Jellemzés.** Ezek a motorok iteratív numerikus elrendezéseket futtatnak, amelyek eredménye
a lebegőpontos kerekítéstől függ — konkrétan a fused multiply-add (FMA) műveletektől és a
`Math.pow`-tól, amelyek JavaScript-motoronként és CPU-architektúránként eltérhetnek. A
portolt változat ott követi a C műveleti sorrendjét, ahol tudja (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — pl. az `sfdp` ~6 értékes számjegyre egyezik a
natív orákulummal, összehangolt PRNG-vel és `fma`-val —, de a pontos, azonos koordinátájú
reprodukció **platformok között nem garantált**. A topológia megmarad; az
esetleges eltérés a csúcsok finom koordinátáiban van.

**Miért elfogadott.** Ez a JS-ben futás kemény korlátja, nem tervezési döntés
— ugyanabba a családba tartozik, mint az A3 Apple-`hypot` érzékenysége. Nincs mód arra, hogy
minden célzott futtatókörnyezetben garantáljuk a bitre azonos transzcendens/FMA eredményeket, így a bájtmérce
nem csupán drága, hanem tesztelhetetlen lenne. Az **A1 felmérése** (szemben a puszta
fenntartással) külön natív motoros paritássávot igényelt — ezt
2026-07-11-én építettük meg `test/corpus/engine-walk.ts` + `parity-report.ts` néven, amely
minden bemenetet a saját motorjával mér fel a `dot` helyett. A munka őszinte plafonja az,
hogy az A1-et „nincs aktív eltérés a referenciaplatformon” szintre **szűkítsük**, és a
platformok közötti fenntartást soha ne szüntessük meg; az eddigi eredmények (alább) tartják ezt a
plafont: a `circo`/`twopi`/`osage` mindegyike felszínre hozott és gyökérokig elemzett néhány
valódi A1/A9 esetet, a `neato`/`fdp`/`sfdp` pedig most a 910 elemes univerzumon 90.8/77.5/68.0%-ban
van 0.5 pt-on belül a natívtól, vagyis a portolt
aritmetika (`fma.ts`, `arm-pow.ts`, összehangolt PRNG) a legtöbb gráfnál tartja magát — és
minden megmaradt eltérő azonosító egyenként injektálással van tulajdonítva (megoldó-
sodródás vs. portolási hiba), nem pedig osztályozatlan sodródásként hagyva; lásd az
alábbi iteratív motorok jellemzését.

**Motorsáv-elfogadás: a twopi nyílcsalád.** <a id="a1-twopi-arrows-family"></a>
A fenti idézetblokk a dot-motoros SVG-felmérést írja le, ahol az A1 nulla
gráfra illeszkedik; a különálló `twopi` **xdot motorsáv** (`parity-twopi.json`, natív
`dot -K twopi -Txdot` orákulum, `test/corpus/engine-walk.ts`) *a natív
motorja alatt fut*, és 9 korpusz-azonosítón egy konkrét, igazolt A1 esetet hoz felszínre:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
és (2026-07-28-án hozzáadva, új a 905 elemes univerzumban) a directed/ testvér
`tree-graphs-directed-oldarrows` — mindegyik egyetlen domináns élen tér el
(`Z->I` vagy `i->Z`; 12–64 rajzolásiművelet-eltérés). Az injektálásos A/B (döntési napló, 2026-07-10, „injection A/B verdicts:
twopi arrows family EXONERATED...” bejegyzés) közvetlenül bizonyította a mechanizmust:
a natív `spline_edges` belépési `ND_pos` értékének kiírása és beinjektálása a
portolt változat `splineEdgesShifted` függvényébe **teljesen megfelelő** kimenetet ad a
`graphs-arrows` gráfon (a `Z->I` bájtra azonos lesz az orákuluméval, ugyanaz a 7/14 pontos
spline) — vagyis az eltérés 100%-ban a `twopi` PRISM átfedéseltávolító megoldójából
származó, útvonalvezetés előtti csúcspozíció-sodródás, a portolt változat spline-vezetése/kibocsátása
pedig tisztázott. A látható tünet a 8 azonosítóból 6-nál a bezier-pontszám
átbillenése (`unfilled_bezier[ptCount]: 8 vs 14`): a `Proutespline` illesztett darabszáma
érzékeny arra, hogy a sodródott csúcspozíció az akadályhatár melyik oldalára
esik, így a PRISM iteratív megoldása után egy ULP alatti pozícióeltérés
átbillenti az illesztett spline szakaszszámát (a másik 2 azonosító,
a `graphs-arrowsize`/`nshare-arrows_dot`, ugyanazt a sodródást mutatja kisebb,
csak pozícióbeli eltérésként, darabszám-átbillenés nélkül). A motorsáv szintjén elfogadva a
`test/corpus/accepted-divergences-engines.json` útján, amelyet a `parity-report.ts` a
`PARITY-twopi.md`-be kapcsol — ugyanazt az összekapcsolást végzi az `accepted.ts`
a dot-sáv `PARITY-dot.md` fájljához.

Az `oldarrows` gyökérokelemzése (2026-07-28) kijelölte a család pontszám-tünetének
pontos átbillenési helyét. Az `i`–`Z`–`I` legyező egy gyűrűátmérőn kollineáris, és a
pathplan `directVis` `intersect()` függvénye blokkol egy rálátási vonalat, ha egy akadálycsúcs
„a” szakaszon fekszik — ahol a `wind()` 1e-4 kollinearitási tűrése
még egy, a szakasztól 270 pt-re levő csúcsot is kollineárisnak számít, és az
`inBetween()` (amely kollinearitást feltételez) ekkor elfajul, és csak az
**x vetületet** teszteli: a csúcs akkor és csak akkor blokkol, ha az x-e szigorúan a két
végpont x-koordinátája közötti ULP-szélességű intervallumon belülre esik. Hogy a két
tükrözött sugaras él közül melyik hajlik meg, ezért a PRISM megoldásából kijövő
három névlegesen egyenlő x érték utolsó ULP-sorrendjén múlik — a C a `Z->I` élt hajlítja
(az `i` csúcs tengelycsúcsa az intervallumába esik), a portolt változat az `i->Z` élt hajlítja
(az `I` csúcs csúcsa esik a sajátjába). A `directVis` offline megismétlése
mindkét oldal kiírt akadályhalmazán pontosan reprodukálja mindkét oldal döntését,
és az orákulum útvonalvezetés előtti `ND_pos` értékének a portolt változatba injektálása 0 eltérést ad
(`attribution-twopi.json`) — az útvonalvezetés és a kibocsátás bájtra hű.

Az `1855` ugyanazon útvonalvezetés előtti PRISM lebegőpontos mechanizmus sugaras/csillag
**tükör** változata (2026-07-11-én elfogadva): 31 levele pontosan körön fekvő, így a
csillagelrendezés tükrözésszimmetrikus, és a PRISM átfedéseltávolítása egy
szimmetriainstabil egyensúlyon ül; a `circleLayout` `setAbsolutePos` függvényében 5
levélszögnél egy 1 ULP-nyi V8-vs-libm `cos`/`sin` különbség az ellentétes tükör-
medencét választja, és az egész sugaras elrendezés az orákulum pontos x-tengelyes tükörképeként
áll be (a csúcsok maximális elmozdulása 6.04 pt, a bb megmarad). Az injektálásos A/B mindkét
irányt bizonyította: a C pontos `circleLayout` pozícióinak a portolt változat
PRISM-jébe táplálása csúcsról csúcsra reprodukálja az orákulumot (3e-14), és csak az 5
ULP-eltérő levélpozíció visszaállítása az egész elrendezést visszabillenti a portolt változat
tükörállapotába. Teljes gyökérokelemzés: `.agent-notes/twopi-radial-drift-rca.md` (döntési napló,
2026-07-11).

**Az iteratív motorok jellemzése: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
A fenti `circo`/`twopi`/`osage` motorsávokkal ellentétben a `neato`/`fdp`/`sfdp`
még **nincs** azonosítónként osztályozva — az `engine-walk.ts` ezekhez a háromhoz
`tolerance: 0.5` mezőt rögzít, a `parity-report.ts` pedig külön
„Iteratív motorok (±0.5 jellemzés)” szakaszban jeleníti meg őket a
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md) fájlban,
kifejezetten **nem** összevethetően a dokumentum többi részében szereplő ±0.01-es determinisztikus
átmenési arányokkal. Jelenlegi számok (910 elemes univerzum; az átmenési arány kihagyja
azokat a bemeneteket, amelyeket a C orákulum nem tud renderelni, a [Megfelelőség](./conformance.md) szerint):

| motor | felmért | ±0.5 pt-on belül | nem megfelelő (mind tulajdonítva, elfogadva) | portolási hiba / időtúllépés | orákulumhiba |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Az első végigfuttatás, 2026-07-11-én 762 elemnél, 263/311/260 elemet mért
±0.5 pt-on belül — a mostani arányokra ugrást azóta beérkezett azonosítónkénti
javítások hozták, főként a neato portolatlan `user_pos`/`P_SET` kezelése, a motorinicializálás
összevonása és a `setEdgeType` makró-vs-függvény javítás.)

Az első végigfuttatással ellentétben most minden eltérő sor egyenként tulajdonítva van:
az injektáló eszköz (`test/corpus/attribute-divergence.ts`) a natív
orákulum útvonalvezetés előtti `ND_pos` értékét a portolt változatba táplálja, és újra összehasonlít, és
minden jelenlegi eltérő azonosító vagy `drift-exonerated` (a portolt változat útvonalvezetése
és kibocsátása pontosan reprodukálja az orákulumot, amint a megoldósodródást eltávolítjuk),
vagy a külön elfogadott, azonosítónkénti maradékok egyike (az `241_0`
CDT-incircle döntetlene mindhárom motoron, a neato `2239`, az sfdp `42`/`2556`).
Az alábbi osztályelfogadás a felmentett halmazt formalizálja; az élő számok a
motoronkénti irányítópultokon találhatók
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Az A1-drift osztályelfogadás (iteratív motorok, számított tagság).**
<a id="a1-drift-iterative-engines"></a> A `test/corpus/accepted-divergences-engines.json`
iteratív motoronként (`neato`,
`fdp`, `sfdp`) egy `"A1-drift"` **osztály** bejegyzést tartalmaz — `{ class: true, attributionFile, ref }` — ez különbözik a
fenti `circo`/`twopi`/`osage` sávok azonosítónkénti bejegyzéseitől (D2,
`plans/iterative-parity-campaign/decisions.md`). Az azonosítónkénti bejegyzéssel ellentétben az osztálytagságot
soha nem sorolják fel kézzel a nyilvántartásban: a `parity-report.ts`
jelentéskészítéskor számítja ki a megfelelő `attribution-<engine>.json` fájlból
(a T1 injektálásos tulajdonító eszköze, `test/corpus/attribute-divergence.ts`)
— minden eltérő azonosító, amelynek natív útvonalvezetés előtti `ND_pos` értékét a
portolt változatba injektálták, és az újra összehasonlításkor ±0.5-ön belül megfelel, `verdict: 'drift-exonerated'` értéket kap
abban a fájlban, ami azt jelenti, hogy a két motor iteratív megoldói
számszerűen eltérő, de egyenként belsőleg konzisztens elrendezésre konvergáltak (az A1 fenti jellemzése szerint
lebegőpontos felhalmozódási különbség, nem portolási útvonalvezetési
vagy kibocsátási hiba). Az azonosítónkénti bizonyíték — vödörforma, alap- vs. injektált eltérésszám,
egységes eltolás/tükrözés észlelése — magában a tulajdonítási
artefaktumban él, nem másolódik ebbe a dokumentumba vagy a nyilvántartásba (D2). Az az azonosító,
amely később kerek perec átmenő lesz, vagy amelynek újratulajdonítása megváltoztatja a minősítést,
a következő jelentés-újragenerálásnál automatikusan kikerül az osztályból — nincs szükség elavult
elfogadás szerkesztésére, és nem bukik a védőteszt. Azok a motorok, amelyeknek
`attribution-<engine>.json` fájlját még nem generálták, az osztályt
„tulajdonítás függőben” állapotban, nulla taggal jelenítik meg, ami megegyezik azzal, mintha egyáltalán nem lenne elfogadás
— az osztálybejegyzés megelőzheti az adatait (lásd:
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Szövegmérés (betűmetrika) → címkevezérelt elrendezés — LEZÁRVA <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Állapot (2026-07-01): lezárva.** Egyetlen korpusz-azonosító sem elfogadott már
ebben az osztályban; a szakasz történeti dokumentációként marad meg a
mechanizmusról és a semlegesítő, befecskendezhető `TextMeasurer` bővítési pontról.
Egymást követő szövegmérési javítások (az `EstimateTextMeasurer` bevezetése,
a betűtípus-tudatos függőleges metrikák, a nem ASCII UTF-8-bájt javítás) megoldották csaknem
minden címkevezérelt elrendezési eltérést, amely itt élt. A **`proc3d`** —
az egykori kanonikus A2 példa — teljesen **`conformant`** mindhárom
korpuszkönyvtárban (`graphs-`/`share-`/`windows-proc3d`): egyező bbox, nulla
útvonaladat-eltérés, nulla címkehorgony-eltérés.

**Az utolsó tagok kivonása (2026-07-01).** A **`NaN` család**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) még azután is itt maradt, hogy a
csúcsgeometriája már pontosan egyezett a C-vel (76/76 referenciapont). Valódi
maradéka — négy ellentétes 2-ciklusú páron (`Target↔TThread`, `Interp↔InterpF`,
`Event↔Target`, `AtomProperties↔NRAtom`) 8 egyenes élvégpont 6–14 pt-tal eltolva —
újradiagnosztizálásra került, és kiderült, hogy **egyáltalán nem betűmetrikai hatás**,
hanem két portolási hiba a dot többszörös élvezetésében (küldetés `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Ellentétes párok sávsorrendje.** A portolt változat minden párhuzamosélcsoportot
   újrarendezett az eredeti létrehozási szekvencia szerint, mielőtt a Multisep sáveltolásokat kiosztotta; a C
   a sávokat az edgecmp által gyűjtött sorrendben osztja ki (először a MAINGRAPH előre mutató
   képviselő, másodikként az AUXGRAPH megfordított tagja — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Egy olyan 2-ciklus, amelynek megfordított tagját deklarálták
   először, minden élt a másik 18 pt-os folyosóján rajzolt meg.
2. **Hamis lapos szomszédság a rangokon átnyúló összevont éleken.** A `markAdjacent`
   a C azonos rangra vonatkozó védelme nélkül jelölte meg az `ND_other` bejegyzéseket
   (`flat.c:272-276`), így a `groupSize` lapos-szomszédos rövidzárlata
   lenyelte a portcmp csoporthatárokat.

Mindkettőt hűen javítva a család mindhárom könyvtárban **`conformant`**
(elemenként: 0 eltérő csúcs, 0 eltérő él), és ugyanez a mechanizmus
lezárta a `42`, `clust2`, `ngk10_4` eseteket (structural-match → conformant), és a
`b124`-et diverged állapotból structural-match állapotba vitte — mind 2-ciklusú/párhuzamos párokon.

**A felmérés mindkét oldala ugyanazt a becslőt futtatja — a mérés semlegesítve van.**
A natív `dot` orákulum fej nélküli `GVBINDIR` alatt fut
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), amely csak a
`core` és a `dot_layout` bővítményeket linkeli — nincs `gd`/`pango`/`quartz` szövegelrendezési bővítmény.
Ha ez a hely üres, a graphviz a beépített
`estimate_textspan_size` függvényre esik vissza. A TypeScript portolás `EstimateTextMeasurer`
osztálya (`src/common/textmeasure.ts`) ugyanezen rutin hű portolása, és
a Node alapértelmezettje, amelyet a `createMeasurer()` old fel
(`src/common/textmeasure-factory.ts`). **Minden paritás-összehasonlítás mindkét oldala
tehát ugyanazzal a becslővel méri a szöveget** — a valódi
FreeType/pango glifusszélességek soha nem kerülnek az összehasonlításba. Ezért mutat egy
itteni minősítés-regresszió az elrendezési kódra, nem egy betűtípusra, és ezért zárta le
a becslő saját hibáinak javítása (UTF-8 bájtszámlálás, a függőleges metrikák
betűtípus-tudatossága) ennek az osztálynak a nagy részét kerek perec, ahelyett, hogy csupán
szűkített volna egy betűmetrikai rést.

**A befecskendezhető `TextMeasurer` bővítési pont.** Ez a semlegesítés csak azért lehetséges,
mert a szövegmérés tudatos bővítési pont, nem pedig valamelyik motorba beledrótozva.
A `TextMeasurer` egy egymetódusú interfész (`measure(text, font, size,
flags) → {w, h, …}`), amelyet függőségbefecskendezéssel kap minden címkeméretező hívási hely —
a `polyInit`, a `recordInit`, az `initEdgeLabels` és a `buildNodeLabel` mind paraméterként veszi át a
mérőt; semmi sem mér szöveget globálison keresztül. Teszteknél/CI-ban a `setTextMeasurer(...)` vagy a
`GV_TEXT_MEASURER=estimate` rögzíti.
A bővítési pont azt is lehetővé teszi, hogy egy maradékról *bebizonyítsuk*, hogy csak mérési eredetű: a portolt változatnak
megadjuk a C által mért pontos szélességeket (az orákulumból rögzítve), és megnézzük,
hogy az elrendezés ekkor pontosan reprodukálja-e a C-t. Ez a kísérlet jogosította fel eredetileg a
`proc3d` A2 minősítését (lásd az alábbi történeti függeléket) — a technika
továbbra is érvényes. Fordítottja szüntette meg az osztályt: mivel a mérés
bizonyíthatóan semlegesítve volt a felmérés mindkét oldalán, a `NaN` élmaradék nem lehetett
betűmetrikai hatás, ami kikényszerítette az újradiagnózist, amely megtalálta a fenti két
útvonalvezetési hibát.

::: details Történeti elemzés (2026-06-30-án túlhaladott) — a nyilvántartás kedvéért megtartva
Az alábbi anyag ennek az osztálynak egy korábbi állapotát írja le, mielőtt az
`EstimateTextMeasurer` bevezetése, a betűtípus-tudatos függőleges metrikák és a
nem ASCII UTF-8-bájt javítás lezárta a nagy részét. Már nem írja le a jelenlegi
viselkedést — csak azért maradt meg, hogy az idevezető gondolatmenet el ne vesszen. Különösen:
(1) az alábbi mérési táblázat „natív C” szélességértékei
**FreeType** értékek egy valódi betűtípusos renderelési útvonalról; a paritásfelmérés
sosem terheli ezt az útvonalat — mindkét oldal az `estimate_textspan_size` függvényt futtatja (lásd
fent) —, így a táblázat nem tükrözi, hogyan mérjük jelenleg a paritást; (2)
az alábbi átfedési ábrák és golden/saját renderelések egy **nem korpuszbeli**
`proc3d`-t (`graphs/directed/proc3d.gv`, ~2620 pt) ábrázolnak, amely nem része a
paritásfelmérésnek; a korpusz `proc3d` változatai most megfelelők, nulla
eltéréssel, így nincs mit átfedésben megmutatni róluk; (3) az alábbi `NaN`/`ratio=compress`
csúcs-x elbeszélés túlhaladott — a jelenlegi mérés szerint mind a 76 csúcspont
pontosan egyezik, így az általa leírt szélességhiba → csúcseltolódás lánc
a `NaN`-ra már nem áll fenn.

**`NaN` `ratio=compress` mellett (történeti).** A
`NaN.gv` család (`orientation=landscape; ratio=compress; size="16,10"`) olyan
A2 eset volt, amelynek minősítése akkoriban *diverged* lett, nem
*structural-match*. A compress x-hálózati szimplex útvonal hű volt — minden
korlátbemenet egyezett a C-vel (szélességkorlát-érték, `containNodes` minlen-ek,
segédél-számok 471/wt 1612, `lrBalance`, és a rangsorrendek mind azonosak)
*kivéve* 9 csúcs félszélességét, amelyet a mérő 0.5–1.03 pt-tal
szélesebbnek jelentett a C-nél. A `ratio=compress` 1000-es súlyú csomagolása a normál esetben laza
balról jobbra irányú távolságkorlátokat **kötötté** tette, így az az egy képpont alatti szélességhiba —
compress nélkül láthatatlan — −3..−5 pt-os belső
x-eltolódásként bukkant fel. Ez az eltolódás a `Target<->TThread` egyenes splinet 0.55 pt-tal
átbillentette egy csúcsdoboz-falon, így az útvonalvezető egy további bezier-darabbá hajlította (7
pont a C 4 pontjával szemben) — *szerkezeti* eltérés, innen a *diverged*. A 9 szélesség
C értékeire kényszerítése pontosan reprodukálta a C-t (csúcs-x 53/76→0/76 eltérő; spline 7→4 pont),
megerősítve, hogy a maradék 100%-ban felsőbb szintű betűmetrika volt, nem a compress- vagy
spline-kód, **az akkori eltérés esetében**. A teljes bizonyíték (vizuális
golden-vs-saját egymás melletti összevetéssel + a 4-vs-7 pontos spline-eltérés átfedéssel):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (prózai
leírás: `…/nan-compress-xcoord.md`).

**Betűmetrikai mérési példa (történeti — FreeType vs. becslés).**
A natív Graphviz, ha valódi szövegelrendezési bővítménnyel fut (nem a paritásfelmérés által használt fej nélküli
orákulummal), a szöveget FreeType/libgd glifusszélességekkel méri.
A portolt `EstimateTextMeasurer` nem replikál glifusrasztert.
A legtöbb karakterláncnál a kettő pontosan egyezik; néhánynál egy pont törtrészével
eltérnek. Mért példa — Times-Roman 14 pt, a
`"/home/ek/work/src/lefty/lefty.c"` karakterlánc (31 karakter):

| | szélesség |
|---|---|
| natív C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (becslés) | 176.75 pt |
| eltérés | **+0.75 pt (+0.43%)** |

Ugyanazon csúcs másik címkesora, a `"93736-32246"`, **azonosan** mért
(mindkettő 96.00 pt) — a hiba karakterlánc-függő és glifusonként halmozódik,
nem egységes skálatényező. Ez a FreeType-vs-becslés rés valós, de
**nem** azt méri, amit a paritásfelmérés (mindkét oldal `estimate`-et futtat); csak
akkor számítana, ha a @knowvah/dot-engine kimenetét egy ezen a felmérésen kívüli, valódi betűtípusos C
renderelésével hasonlítanánk össze.

**Lefelé irányuló hatás az egykori `proc3d` eltérésre (történeti).** A címke
szélessége befolyásolja a csúcs méretét, az pedig az elrendezést:

1. Szélesebb címke → kissé szélesebb csúcsdoboz (*ellipszis* csúcsnál a szélességet
   még √2-vel is skálázzák, így +0.75 pt szöveg → +0.53 pt félszélesség).
2. A csúcsok félszélessége adja meg az x-koordináta hálózati szimplex balról jobbra irányú
   távolságkorlátait; ezeket a korlátokat `ROUND()` egészre kerekíti, így egy
   képpont alatti szélességváltozás átbillenthet egy korlátot *N*-ről
   *N+1*-re.
3. A hálózati szimplex ekkor egy másik — de egyformán optimális —
   egész értékű x-kiosztást választ, néhány csúcs x-pozícióját 1–2 egységgel eltolva.

A nem korpuszbeli `proc3d.gv` esetén (`graphs/directed/proc3d.gv`, ~2620 pt, nem
paritásfelmérés-tag) ez az x-kiterjedésben **≤ 3.55 pt** különbséget okozott
(**0.13%**), alább egymásra vetítve — **zöld = natív C `dot` (golden), piros =
@knowvah/dot-engine (a miénk)**:

![A proc3d golden és saját renderelés egymásra vetítve: zöld = C, piros = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Nagyítva a szegély szinte kizárólag a hosszú fájlútvonal-oválisok
címkéin jelent meg:

![A proc3d egymásra vetítése, a széles útvonalcímkés oválisokra nagyítva: zöld = C, piros = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natív `dot` | A miénk — @knowvah/dot-engine |
|---|---|
| ![A C Graphviz által renderelt proc3d](/img/proc3d-golden.svg) | ![A @knowvah/dot-engine által renderelt proc3d](/img/proc3d-ours.svg) |

Az önálló leírás (gyökérok, metrikánkénti számok, reprodukálási parancs)
a saját oldalán található:
[**proc3d — a kanonikus A2 betűmetrikai eltérés (történeti)**](/hu/divergences-proc3d-a2).
Ez az oldal egy megoldott eltérést ír le egy nem korpuszbeli bemeneten; a jelenlegi
korpusz `proc3d` változatai megfelelők.

**Miért fogadtuk el akkoriban.** A FreeType glifusonkénti
szélességeinek bájtra pontos követése minden betűtípuson és karakterláncon a
metrikatáblázatainak, a hintingnek és a kerekítésnek a replikálását igényelte volna — nagy, törékeny, és még
így sem garantáltan pontos. A szövegmérő közös primitív: a korpusz minden
címkéje átmegy rajta, így egy egyetlen karakterláncot célzó javítás másokat regresszióval fenyegetett
érzékelési küszöb alatti nyereségért.
:::

### A3. `hypot` döntetlenfeloldás a spline-vezetésben (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Érintett:** a **geometriailag szimmetrikus** élvezetési csatornával rendelkező `dot` gráfok —
jellemzően egy rövid, szimmetrikus lapos élív. Megfigyelt példa: a `2368`,
amely *structural-match* marad (maxΔ ≈ 10.2 pt **egy** élen, `376->76`).
Ugyanez a döntetlenfeloldás egy nagy befutású csomópontba tartó **hosszú** (több rangot átívelő) élen is felbukkan,
ha a folyosó pontosan tükörszimmetrikus: a `graphs-b100` /
`graphs-b104` (azonos forrás) maxΔ 20-szal (pontosan egy rangsor) tér el a
`Node23730->Node23729` egyetlen csomópontján — minden csúcspozíció és minden felsőbb szintű
doboz/sokszög/feszes útvonal szerkezet bájtra azonos a C-vel; csak a `findMaxDev`
~1 ULP-nyi választása különbözik abban, hogy a tükörszimmetrikus belső pontok közül melyik lesz a bezier-csomó.
A rövid lapos él formája `241_1`-ként is felbukkan (structural-match,
maxΔ ≈ 2.4 pt) — az orákulumhoz rögzített `241_0` eltérő testvére, amelyet a C
zaja ehelyett az első megtartásával old fel. Ugyanez a döntetlenfeloldás okozza a címkézett 2-ciklusú
visszaél résfolyosó-hasadását a `2413_1` (structural-match, maxΔ 67.65) és a
`2413_2` (maxΔ ≤99.55, ha a T11 swapBezier-reverse javítás beérkezik — addig
a fájl jelentett maxΔ 1922.26 értékét egy független, külön
nyomon követett hiba uralja) esetében, valamint egyetlen klaszteren belüli címkézett élt a `graphs-decorate`
gráfban (maxΔ 43.54); mindegyik esetben a két jelölt hasadási sarok
5.7e-13 (2413 család) / 3e-14 (decorate) belül döntetlen egymással, mielőtt a
pozíciófüggő Apple `hypot` zaj győztest választ. A `2371`
(structural-match, maxΔ 16.8) ugyanezt az ujjlenyomatot mutatja két független
élen (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): a portolt változat
mindkettőn az orákulum pontos vezérlőpont-sorozat szerinti tükörképét bocsátja ki,
a csomó y-ja azonos Δ16.8-cal megfordítva (a felső/alsó hasadási arányok felcserélődtek).
Eredetét **KÖZEPES** bizonyossággal minősítjük, nem a többi tag
IGAZOLT bizonyosságával: a `2371` ~199 komponenst csomagol, ami szétválasztja a pathplan-helyi koordinátákat az
oldalkoordinátáktól, így a döntetlent három műszerezési kísérlet során sem
sikerült élőben a `route.ts:209` sorral összefüggésbe hozni; egy egyenes módú szegmentálás vagy utólagos vágás utáni
`recover_slack` eredet nincs teljesen kizárva. Teljes diagnózis:
`plans/residual-cleanup/analysis/2371-mirror.md`. A legtöbb vezetett élt ez nem érinti.

::: details Gráfdefiníció (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

**Jellemzés.** A spline-illesztő (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) az illesztett beziert a maximális eltérésű belső
útvonalpontnál hasítja. Ha a csatorna szimmetrikus, a két jelölt hasadási pont
**pontos matematikai döntetlen**, a győztest pedig egy abszolút koordinátás bezier-kiértékelés ~1e-14-es
lebegőpontos kioltási zaja dönti el,
amelynek **előjele az abszolút pozíciótól függ**.

A C eltérési távolsága a libm `hypot`, és az orákulumot előállító macOS-es Apple `hypot` egy
szabadalmaztatott implementáció, amely **semmilyen** hordozható `hypot`-tal sem egyezik bitre (a graphviz koordinátatartományán
ellene mérve, bitre azonos
arányok: a V8 `Math.hypot` ≈ 63%, egy helyesen kerekített / Arm-stílusú `hypot`
≈ 84%, az fdlibm `hypot` ≈ 90%, a `sqrt(dx²+dy²)` ≈ 94%). Ennek az ULP-zajnak köszönhetően
**maga a C sem következetes**: két *eltolással egybevágó* ívet
**ellentétes** sarkok felé hasít. A `2368`-on belül a `376->76` ív a
geometriailag azonos `256->436` ív tükörképe:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

A teljes eltérés egymásra vetítve (12× nagyítás a `376->76` / `to1` ívre) — **zöld = C
Graphviz, piros = @knowvah/dot-engine**. Mindkettő ugyanaz a sekély lefelé ív ugyanazon
csúcshatárok között; a hasuknál (a középső bezier-
vezérlőpontnál) ~1–2 pt-tal térnek el, ahol a C döntetlene az ellentétes sarok felé dőlt:

![A 2368 376->76 íve: zöld = C, piros = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Minden más a tűrésen belül egyezik — azonos befoglaló doboz (608×148), csúcspozíciók,
címkék, nyílhegyek és az összes többi él. A teljes renderelések szemmel
megkülönböztethetetlenek:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![A C Graphviz által renderelt 2368](/img/2368-c.png) | ![A @knowvah/dot-engine által renderelt 2368](/img/2368-port.png) |

A portolt változat **eltolásekvivariáns** döntetlenfeloldást használ (a valódi döntetlen mindig
az első indexre oldódik fel), így *minden* ilyen ívet ugyanúgy rajzol meg, a
pozíciótól függetlenül — önkonzisztens, és ott egyezik a C-vel, ahol a C zaja is
az elsőt tartja meg (pl. `256->436`, és `241_0 5:ne->8:nw`), csak ott tér el, ahol a C
zaja a másik irányba billen (`376->76`). A végpontok, a nyílhegy célja, a többi
él, az összes csúcs, a címkék és a befoglaló doboz a tűrésen belül egyezik; csak az egy ív
belső vezérlőpontjai mozdulnak el (~1–2 pt a hasnál).

**Miért elfogadott.** Az Apple `hypot` nem reprodukálhatóbb JS-motorok és
CPU-k között, mint az **A1** FMA/`pow` műveletei — ugyanaz a hordozhatósági korlát, csak
a `dot` spline-útvonalvezetőjében. A C *pozíciófüggő* választásának követése a C
szigorú döntetlenfeloldásának átvételét jelentené, ami egy **közös primitívben** él, amelyen minden vezetett
él átmegy: ez a `376->76` egyezést *új* eltérésekre cserélné azokon az
íveken, ahol a C a másik irányba esik (regresszálná a `241_0`-t és egy `cnt=3`
lapos élű orákulum-esetet), ami nulla összegű, és még a portolt változat
eltolásekvivarianciáját is feláldozza. Ezért megtartjuk a következetes (ekvivariáns) útvonalvezetőt. Ez
egy korlátos, érzékelési küszöb alatti `dot` eltérés — nem nyitott hiba. Teljes vizsgálat:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Elismerten hibás állapotú orákulum (az init_rank / pathplan család) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Érintett:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). A család
`1939` és `2825` tagja **conformant**, és nincs bejegyzése, a `2470`
és a `graphs-structs` pedig 2026-07-11-én csatlakozott hozzájuk (mindkettő conformant lett,
miután megérkeztek az ortho szomszédsági-túlcsordulás/chancmpid, az fmadd `polylineMidpoint` és a
páros felé kerekítő döntetlen-kerekítés javításai — a portolt változat most pontosan reprodukálja az orákulum
helyreállítási kimenetét, beleértve az azonos elveszett éleket is); az
elfogadási bejegyzéseik kivonásra kerültek.

Az `1581` és a `2825` összeomlás-helyreállítási esetek voltak (fix-element-count-bucket
küldetés): fuzzer-/elfajult bemenetek, ahol az upstream tesztek **csak azt**
állítják, hogy a dot nem omlik össze (`test_1581`: nincs ASan-sértés; `test_2825`: nincs
összeomlás, ha a `rebuild_vlists` -1-et ad vissza). A C belső `Error:` hibát kap
(`install_in_rank` / `rebuild_vlists: lead is null`), és a helyreállítása
eldobja az elrendezés tartalmát; a portolt változat **azonos rangkészlet-törlési
döntésekre** jut (a figyelmeztetési paritás igazolt: ugyanazok a csúcs-/gráfnevek a
`mark_clusters` „already in a rankset” figyelmeztetéseiben, cluster.c:317-320).

A `2825` mostanra teljesen lezárt. A fix-2825-rebuild-vlists küldetés (az 1581 után)
először egy réteggel zárta a rést: a portolt változat a C *pontos* belső hibaállapotába
jut — bájtra azonos stderr, az üzenetek sorrendjét is beleértve
(`Error: rebuild_vlists: lead is null for rank 1`, majd az előtag nélküli
`agerr(AGPREV, ...)` folytatás `concentrate=true may not work
correctly.`) — úgy, hogy a `dotLayoutPipeline` helyesen továbbítja a
`dot_position` hibáját, kihagyva a `dot_splines`/`dotneato_postprocess` lépéseket,
a C `dotLayout` függvényével egyezően (`if (r != 0) return r;` a `dot_position` után,
dotinit.c:322-325). Egy folytatás (2. rész) ezután lezárta a megmaradt
renderelési rétegbeli rést: a C `emit_node` függvénye minden csúcsot a `node_in_box(n,
job->clip)` feltételhez köt (emit.c:1806-1809), és ezen a megszakítási úton a `job->clip`
elfajult, mert a `GD_bb` értékét a `set_aspect` soha nem állította be (a
kihagyott `dot_position` farkában) — így a C *nulla* csúcsot bocsát ki, csak az (szintén
elfajult) klaszterkereteket. A portolt változat ugyanezt a `node_in_box` kaput portolta
(`src/gvc/device.ts:renderNode`, a `job.bb`/`job.pad` értékeket használva a
`job->clip` egyoldalas megfelelőjeként), és nem számol újra
hihető bbox-ot az élő csúcspozíciókból, ha a `g.info.bb` nincs beállítva
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` szó szerint, tükrözve az
`init_gvc` `gvc->bb = GD_bb(g)` sorát, emit.c:3272) — minden elrendezési motor
maga állítja be a `g.info.bb` értékét, mielőtt a `render()` lefut minden nem megszakításos
úton, így ez egészséges gráfokon bájtra azonos, és csak ezen a megszakítási úton változtat a kimeneten.
A `2825` most `conformant` (4 elemű kimenet,
bájtra azonos az orákuluméval). A mindkét rész teljes mechanizmus-nyomkövetését lásd:
`.agent-notes/2825-rebuild-vlists-abort.md`. Az `1581` egyáltalán nem jut el
az inkonzisztens állapotba (egy *másik* upstream klaszterablak-hiba, nem a `rebuild_vlists`), így
a megmaradt gráfját teljes egészében elrendezi — ez a rés nyitva marad. Az orákulum kimenete
az `1581`-en helyreállítási törmelék, upstream által definiált szemantika nélkül. Bizonyíték:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
Mindegyik bemeneten a **C orákulum** a hibás, a
graphviz saját beismerése szerint: a `2471`, az `1939` és az `1435`
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (hibajegyek:
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), vö.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); az egyetlen javítási
kísérlet, a [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
beolvasztatlan vázlat maradt (utoljára szerkesztve 2026-03-20). A `graphs-structs` a
régi rekordvezetési-veszteség osztály (#102/#242/#274/#1323), amelyet a stabil
graphviz 15.0.0 helyesen renderel — a fejlesztői build orákulumának regressziója.

**Mit csinál a C.** Az `init_rank` tagokon (`2796`, `2471`, `1939`)
a natív dot x-koordináta segédgráfja irányított kört zár be a klaszterfal-korlát
éleken keresztül; az
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
nem tud minden csúcsot átvizsgálni, kiírja az `Error: trouble in init_rank` üzenetet, és az
elrendezés ebből a helyreállítási állapotból halad tovább — a `2471`/`2796` esetén
`Pshortestpath` háromszögelési törmelékben és elveszett élekben végződik. Az `1435`-ön és a
`graphs-structs` esetén a hibás szakasz maga a pathplan (fülvágásos
háromszögelési zsákutcák; egy elveszett rekordport-él).

**Igazolt, majd hűvé tett bemenetek (ez a lényegi rész).**
A `verify-oracle-bug-family` küldetés
([ismertető](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
sorról sorra kiírta a korlátgráfot, amelyet mindkét oldal a hálózati szimplexnek ad, a
család minden tagjára — és megállapította, hogy a portolt változat korábbi „tiszta” viselkedése ezen a
családon **négy valódi portolási hibából** fakadt, amelyek mind javítva lettek:

1. A `flatEdges` kihagyta a C
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   hívását, így a klaszterek rangablakai elavultak maradtak a lapos címkecsúcsok
   beszúrása után (ez önmagában **9** élt veszített a portolt változaton a `2471`-en, ahol a C
   6-ot veszít).
2. Az azonos `group` élbüntetés hurokéleken sült el az azonos nem üres csoportú
   végpontok helyett
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. A `CL_CROSS` a C `_WIN32` értékét, a 100-at használta; az orákulum platformja 1000-et használ
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Egy háromszögelési zsákutca megszakította a `Pshortestpath` futását a C figyelmeztet-és-folytat +
   egyenes vonalú tartalék megoldása helyett
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

A javítás után a család NS-korlátkiírásai **sorra azonosak** a C-ével
(253 rank2 hívás a `2471`-en; minden hívás az `1939`/`1435`/`graphs-structs` esetén),
és a portolt változat a C-t követi az elismerten hibás helyreállításon át: ugyanazok az
elveszett élek (`3->16` a 2796-on; az azonos 6 a 2471-en), ugyanazok az elemfák.
Az `1939` teljesen megfelelő lett. A megmaradt numerikus eltérések (és az 1435
eltérő pathplan-törmeléke) a helyreállítási állapoton *belüli* viselkedések, amelyeket a
projektpolitika szándékosan nem hajszol.

**`2723` (szegmentálási hiba; rögzítve, nem hajszolva).** A natív `dot` szegfault-tal áll le (kilépési kód 139)
a `tests/2723.dot` bemeneten (irányítatlan, `rank=same` csoportok, címkézett élek), így a C-nek
nincs egyeztethető kimenete. Az upstream
[#2723 hibajegy](https://gitlab.com/graphviz/graphviz/-/issues/2723) nyitott, és a
`tests/test_regression.py:test_2723` `xfail`. A portolt változat `InternalError` kivételt dob
(`INTERNAL_ERROR`, `TypeError` okkal a
`src/layout/dot/flat.ts:flatLabelYpos` függvényből, ahol a `rank[r-1]` nincs definiálva). Helyes
orákulum híján az őszinte hiba marad, és a portolt változat nem módosul;
a `src/layout/dot/flat-2723.test.ts` rögzíti. Frissítse ezt a tesztet, ha az upstream kijavítja
a hibajegyet.

**Szabályzati megjegyzés.** Az A4 korábbi álláspontja („a portolt változat teljesíti a hibajegy
elvárásait; ne replikáljuk”) azon a hiten alapult, hogy a portolt változat
körmentes segédgráfja egy ártalmatlan helyi változatból származik. Nem onnan származott — az
(1) hibából jött, amely bizonyíthatóan félrevezette a `2471`-et. A C forráshoz való
hűség győzött: a portolt változat most igazoltan azonos bemenetekből reprodukálja a C elismerten hibás
eredményeit, és minden itteni bejegyzést **újra kell mérni,
ha az upstream kijavítja a megfelelő hibajegyet** (az orákulum kimenete
megváltozik; számítson arra, hogy ezek az azonosítók regresszióként felvillannak a frissítéskor — ez
szándékos, nem rothadás).

**Bizonyíték.** Azonosítónkénti összehasonlító oldalak (egymás melletti renderelések + bizonyítékrekordok):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(a javítás előtti alapállapot itt marad meg:
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnosztikai artefaktumok: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Érvénytelen bemeneti bájtok (kódolási reprezentáció) {#a5-invalid-input-bytes-encoding-representation}

**Érintett:** `1367` (diverged, maxΔ 0 — pontosan egy szerkezeti eltérés).

**Mi tér el.** A bemeneti fájl egy csúcsnév belsejében csupasz UTF-8 folytatóbájtot (`0x80`)
tartalmaz. A C a csupasz 0x80–0xBF folytatóbájtokat „önmagukat reprezentáló érvényes
karaktereknek” tekinti (`lib/common/utils.c:1200-1207`, nincs
figyelmeztetés), és a csúcsnév `<title>` szövege teljesen megkerüli a karakterkészlet-átalakítást
(az `agnameof` bájtjai közvetlenül a `gvputs_xml`-be folynak). Az orákulum SVG-je ezért
a nyers bájtot tartalmazza, és a deklarált kódolása ellenére **nem érvényes UTF-8**. A portolt változat
az érvénytelen UTF-8 bemenetet latin1 tartalékkal dekódolja
(`0x80 → U+0080`), és jól formázott UTF-8-at bocsát ki (`\xc2\x80`).

**Miért elfogadott.** A portolt változat I/O-határa JS-sztringek (böngészős könyvtár).
Egy nyers érvénytelen bájt nem tud körbefordulni a `renderSvg` sztring-visszatérési
értékén; a C-vel való bájtegyeztetés a kimeneti kódolás megrongálását jelentené minden
fogyasztó számára. A latin1 tartalék tükrözi a C saját „Latin-1-ként kezelt” helyreállítási
szemantikáját (`utils.c:1249`). Ez egy, a kód alatti — a reprezentációs réteg — korlát,
nem egy hordozható viselkedés, amelynek portolását elutasítottuk.
Az 1367-ben minden más megfelelő: az elemszámok (23 polyline /
103 text / 44 polygon / 24 path) és az összes koordináta egyezik a
decorate (T6) javítás után.

**Bizonyíték.**
az [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
összehasonlító oldal (egymás melletti renderelés + bizonyítékrekord).

---

### A6. `unsigned int` vászon-túlcsordulás elfajult bemeneten {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Érintett:** `1314` — egy fuzzerből származó bemenet (`fontsize="991836031967s8"`),
amelynek abszurd betűmérete a rajzot ~2.75e11 pt-ra fújja fel.

**Mi történik.** A C a `job->width` / `job->height` értékeket **`unsigned int`** típusként tárolja
(`gvcjob.h:327-328`). A hatalmas pontméret `ROUND(...)` értéke (`emit.c:1249-1250`)
túlcsordul 32 biten és mod 2³² körbefordul, az SVG-háttérrendszer pedig **előjeles** `%d`-n
keresztül írja ki (`gvrender_core_svg.c:258-259`) — így a C a
`height="-425618343"` értéket nyomtatja. A portolt változat a matematikailag konzisztens (körbe nem fordult)
értéket tartja meg. Minden más érték — a csúcs-ellipszis `cx/cy/rx/ry`, a gyökér `translate`, a
sokszög, a szöveg `font-size` — bájtra azonos; csak a legfelső szintű `<svg>`
szélessége/magassága különbözik.

**Miért nem hajszoljuk.** A C 32 bites egész túlcsordulásának replikálása nem olyan
elrendezési viselkedés, amelyet érdemes portolni, és a bemenet elfajult. Vegye újra elő, ha az upstream
kijavítja a túlcsordulást (pl. kiszélesíti a mezőt, vagy korlátozza a méretet).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Elfajult NaN elrendezés (`sfdp`, kóros `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Érintett:** `2556` — `repulsiveforce=100` (⇒ a taszítóerő
`pow(dist, 101)`-et használ), amely a rugó-elektromos megoldót **mindkét motorban NaN-ra** viszi.
Maga a natív orákulum is csupa `nan` csúcs-/élpozíciót és elfajult
befoglaló dobozt bocsát ki.

**Mi történik.** Mivel minden koordináta NaN, a két implementáció másképp szerializálja a
szemetet: (1) a gráf bb-je / háttérsokszöge — a C a `NaN`-t `int`-té
kerekíti, ami arm64-en `INT_MIN` nagyságrendű szemetet ad (`bb="0,0,-4.295e+09,
-4.295e+09"`); a portolt változat `0`-t tart meg. (2) Az élrajzolási műveletek — a natív kibocsátási menete
elnyomja a NaN spline `_draw_`/`_hdraw_` kimenetét (csak a `pos`-t bocsátja ki),
míg a portolt változat NaN vezérlőpontokkal kibocsátja őket. A csúcsrajzok egyeznek (mindkettő
elnyomja őket). Egyik oldalon sincs valódi elrendezés.

**Miért nem hajszoljuk.** A portolt változat már ugyanazt a NaN-robbanást reprodukálja, mint a
natív — a javítás, amely idáig vezette, valódi (lásd alább); csak az marad, hogy
az egyes oldalak hogyan szerializálják a NaN-szemetet. A C `(int)NaN` definiálatlan viselkedésének
és NaN spline-rajzolás-elnyomásának replikálása nem jelent érdemi elrendezési hűséget egy olyan bemeneten,
amelynek elrendezése mindkét motorban elfajult. Vegye újra elő, ha az upstream korlátozza a
`repulsiveforce` értékét, vagy megtisztítja a NaN pozíciókat.

**Portolási javítások, amelyek ezt elérhetővé tették (nem elhajszolt — valódi hibák).** Ezek előtt
a portolt változat el sem jutott az elfajult állapotig: (1) az `armPow`
(`src/common/arm-pow.ts`) kivételt dobott minden nem gyors útvonalú argumentumra; most portolja az ARM
`pow.c` teljes különleges-eset ágát, így `pow(NaN, y) = NaN`, akárcsak a libm-nél. (2)
a `bezierClip` (`src/common/splines-geom.ts`) végtelen ciklusba esett NaN vezérlőpontoknál,
mert a konvergenciatesztje a C `while (ABS > .5)` feltételének naiv tagadása volt
(véges értékekre egyenértékű, NaN-ra nem); most pontosan tükrözi a C-t, és
NaN-nál terminál. Mindkettő C-hű, és csak a NaN bemeneteket érinti.

---

### A7. `round()` dobozfal-kerekítési határ (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Érintett:** `graphs-honda-tokoro` és (2026-07-28-án hozzáadva, új a 905 elemes
univerzumban) a `graphs/directed/` testvére, a `tree-graphs-directed-honda-tokoro`
(mindkettő structural-match, maxΔ ≈ 1 pt az egyetlen `n012->n011` élen). A
testvér csak a `samearrowhead` attribútumokban tér el, amelyek nem érintik e pár
útvonalvezetését — az `n012->n011` geometriája bájtra azonos az elfogadott azonosítóéval
mind a portolt, mind az orákulum oldalon, így az alábbi mechanizmus szó szerint átvihető.

**Mi tér el.** A `maximal_bbox` fej-folyosódobozának fala a C-ben a belső
x=90 pozícióra esik, a portolt változatban x=89-re a két
`n012->n011` párhuzam közös `samehead` portjánál. A közös port építése (`buildSharedPort`) és a
párhuzamos csoportosítás is bájtra megfelel a C-nek; az 1 képpontos rés kizárólag egy
`round()` kerekítési-határ műtermék — az upstream lebegőpontos zaj ~1e-14-e
a pontosan egy `.5` határon ülő értéket a szomszédos egészre billenti. A
portolt `maximal_bbox` képlet már pontosan tükrözi a C-ét.

**Miért nem hajszoljuk.** A `round()` olyan primitív, amelyen a korpusz minden vezetett
éle átmegy; a határviselkedésének ehhez az egy esethez igazítása korpuszszintű
regressziós kockázat 1 képpontért 2 élen — ugyanaz a közös primitív korlát, mint a
`bbox-class-control-hull-vs-curve` alatt említett vezérlőburok-kerekítésnél. Teljes diagnózis:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA kerekítés vs. szigorú IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Osztály.** A clang arm64 az orákulum binárisát `-ffp-contract=on` kapcsolóval fordítja,
kiválasztott szorzás-összeadás sorozatokat egyetlen FMA utasításba olvasztva; a
portolt változat V8-on fut, amely szigorú IEEE-754 kerekítést végez, és nem tud
`fma`-t kibocsátani. Bitre azonos bemeneteken a kettő 1–2 ULP-vel eltér abban a
kifejezésben, amelyet a fordító összevonásra választott. A portolt oldal mindig a
szigorú IEEE-754 eredmény; az orákulum oldala mindig az FMA-val összevont
eredmény. Ez a C forráskód szemantikája alatti fordítói/futtatókörnyezeti hordozhatósági korlát,
nem pedig a portolt változat logikai hibája — redukálhatatlan, hacsak nem emuláljuk szoftveresen a clang
konkrét összevonási döntéseit. Két eset ismert,
két különböző helyen, két különböző felerősítő
mechanizmussal:

- **2646** — az ULP a `Proutespline` `points2coeff`/`solve3`
  köbös megoldásán belül keletkezik, és közvetlenül átbillenti a spline-illesztő gyökszámát.
- **2620** — az ULP a `poly_init` sokszög-csúcskiterjedési ciklusában (csúcsméretezés)
  keletkezik, és lejjebb az `ortho` hű, relaxációnkénti
  egészre csonkítása erősíti fel egyenlő költségű labirintusfolyosó-döntetlen átbillenéssé.

**Érintett:** `2646` (structural-match, maxΔ 42.09 a 21 216 élből 3-on:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — mind
rekordport `:c->:nb_part` smode hosszú-él útvonalak). Az **A3** testvére: mindkét
osztály redukálhatatlan lebegőpontos hordozhatósági döntetlen a
`Proutespline`-on belül, de a mechanizmus különböző — fordítói `fp-contract`
műtermék, nem a libm `hypot`.

**Mi tér el.** Mindhárom élen csak az utolsó `routesplines` hívás (egy
egyenes szakasz a fejportba) tér el. A végpontja bitre pontosan a
korlátsokszög alsó falán fekszik, az érintője párhuzamos ezzel a fallal
(`evs[1]=(1,-1.22e-16)`), így minden `splinefits` jelölt érinti a
korlátot `t=1`-nél — a metszés-köbös közel kettős gyöke.
A `points2coeff` ezt a köbös polinomot katasztrofális kioltáson át számítja (a ~7446 körüli tagok
~0.099-re omlanak). Az orákulum (clang/arm64,
`-ffp-contract=on`) a `v3 + 3*v1 - (v0 + 3*v2)` kifejezést fused
multiply-add műveletekbe vonja össze, míg a V8 szigorú IEEE kerekítést végez — a kettő
~9.1e-13-mal tér el **bitre azonos bemeneteken**, és ez a zaj megfordítja a
`solve3` diszkriminánsának előjelét: a C 1 gyököt talál (866.7, a szakaszon belül); a portolt változat
3 gyököt talál, egy hamis társgyökkel `t=0.9999975 < 1-EPSILON2` értéknél. A
hamis gyök egy további `a`-felezési iterációt vált ki, ami az
utolsó darab érintőjének nagyságát 2-es tényezővel billenti (a 3 élen mindkét
irányban), így jön létre a maxΔ 42.09 a vágás után (26 SVG-eltérés).

**Miért elfogadott (a redukálhatatlanságot egy kontrollált kísérlet bizonyítja).** Mind a hat
`routesplines` hívást kiírtuk mindkét oldalon — a doboz, a sokszög, a `PL`, a start,
a vég és az `evs` bájtra azonos, ahogy a korábbi (nem utolsó) hívás
kimeneti splinéja is; az egyetlen eltérés az utolsó hívás `solve3` függvényében van. Egy
önálló, érintetlen C kísérleti keret elkülönítette az egyetlen változót: a
`-ffp-contract=off` kapcsolóval fordítás mindhárom élen bitre pontosan reprodukálja a **portolt változatot**; az
alapértelmezett (`on`) összevonás mindhárom élen bitre pontosan reprodukálja az **orákulumot**. A portolt
változat tehát már egyezik a szigorú IEEE-754 C-vel; az
eltérés teljes egészében az orákulum fordítójának FMA-összevonási választása, a
C forráskód szemantikája alatt — nincs javítandó forrásszintű hűtlenség. Egy
célzott javítást (az összevonás kézi emulálása a `points2coeff`-ben) kipróbáltunk, és
megcáfolódott: a 3 élből 2-t kijavít, a harmadikat nem, amelynek átbillenése
a `solve3` saját belső összevonásában ered. Egy teljes javításhoz
szoftveres FMA-emuláció kellene az egész spline-illesztőben — forró ciklusbeli
költség, korpuszszintű kerekítési hatókörrel egy képpont alatti, 3 élnyi nyereségért.
Teljes diagnózis: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Érintett (történeti):** `2620` (korábban structural-match, maxΔ 585; 423 eltérés
24 élútvonalon + 22 nyílhegyen). **2026-07-11-én conformant lett**:
a hű `sgraph` szomszédsági-puffer túlcsordulás + `chancmpid` kétirányú
tartalmazás portolása (lásd `.agent-notes/ortho-maze-circo-rca.md`) megszüntette az
eltérést; az elfogadási bejegyzés kivonásra került, a szakasz pedig az A8 osztály
dokumentációjaként marad meg.

**Mi tér el.** Az `ortho` (`splines=ortho`) csővezeték bájtra megfelel
a C-nek azonos bemenetek esetén — ezt a C pontos labirintus-bemenetének
(koordináták, `xsize`/`ysize`) a portolt ortho szakaszba injektálásával bizonyítottuk: 378/378 vezetett
szakasz bájtra azonosan jön ki, így a `src/ortho` semmiben sem hibás.
A tényleges eltérés a labirintus *bemenetében* van, 1–2 ULP: a csúcs `ysize` értéke (és, a
rangon belüli felhalmozódás révén, az `ND_coord.y`), amelyet a C `poly_init`
sokszög-csúcskiterjedési ciklusa számít (`shapes.c`), és amely
`-ffp-contract=on` mellett az `R.x += sidelength*cosx` kifejezést egy FMA-ba olvasztja, ami ~1
ULP-vel nagyobb, mint a portolt változat szigorú IEEE aritmetikája (mindkét oldal az
aritmetikailag azonos kifejezést valósítja meg). A `2620`-nak 173 törtszélességű
sokszögcsúcsa van; mindegyiken C ≥ portolt 1–2 ULP-vel. Ezt az ULP-t — nem
bevezeti, hanem felerősíti — az `ortho` Dijkstra-relaxációja, amely hűen csonkítja a
futó távolságot lépésenként (`sgraph.c:165`, a portolt változatban `Math.trunc`-ként tükrözve) a
nyers cellakiterjedésekből származó súlyokon
(`maze.c:257`). Az ULP-vel eltolt geometria átbillent egy egyenlő költségű folyosó-döntetlent
4 vezetett élnél (útvonalak + nyílhegyeik); a többi eltérés
±1 sávszámú átszámozási mellékhatás e 4 átbillenésből.

**Miért elfogadott (a redukálhatatlanságot egy kontrollált kísérlet bizonyítja).** Egy
önálló C kísérleti keret, amely csak az `-ffp-contract` kapcsolót variálta, mindkét oldalt reprodukálta
az eltérő hatszög-csúcson: `-ffp-contract=on` → `310.29250168188713`
(egyezik az orákulummal), `-ffp-contract=off` → `310.29250168188707` (egyezik
a portolt változattal), az eltérő művelet a `i=3` csúcsra elkülönítve
(`R.x=-0.50000000000000011` összevonva vs. `-0.5` összevonás nélkül). Egy második,
bemenetet injektáló kísérlet (az egyetlen változó: az ortho bemeneti értékei) megerősítette
a felerősítőt: ha a portolt változat saját `orthoEdges` függvényének a C pontos
`coord`/`xsize`/`ysize` értékeit adjuk, mind a 4 folyosóeltérés 0-ra omlik — az
ortho kódnak nincs hibája, csak érzékeny (ahogy a C saját labirintusköltség-
vezetése is) a bemenetének 1–2 ULP-s eltolására. Az egyeztetés azt jelentené, hogy emuláljuk a
clang egyetlen lefordított kifejezésfájának konkrét FMA-összevonását a
`poly_init`-ben — egy lefordított műtermék hajszolása, nem a forrásszemantika portolása.
Teljes diagnózis: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulált kivétel (nem elfogadott): `triang.c:ccw`.** Egy összevonási
helyet bitre pontosan reprodukálunk ahelyett, hogy elfogadnánk: a pathplan `ccw` függvénye
`fnmul`+`fmadd` műveletekké fordul (pontos első szorzat − kerekített második), így egy
szakaszvégponttal bitre egyenlő lekérdezési pont ISON helyett ISCW/ISCCW eredményt ad. A
`shortest.c:pointintri` ekkor elutasítja a sokszögcsúcs-végpontokat
(„destination point not in any triangle”), és a `makeMultiSpline` sima
vezetésre esik vissza minden összevont 2-ciklusnál — nagy, diszkrét,
korpuszszintű viselkedés, amelyet a portolt változatnak egyeznie kell. A fenti `solve3`/`poly_init`
helyekkel ellentétben (lefordított kifejezésfák mélyén, a javítás megcáfolva), a `ccw`
egyetlen önálló lefordított függvény tiszta szemantikával, ezért
a `src/pathplan/triang.ts` emulálja: sima double gyors útvonal
konzervatív hibahatárral, ahol a sima és az összevont előjel bizonyíthatóan egyezik, és
egy pontos Dekker-szorzatos + diadikus BigInt útvonal a nullához közeli esetekre.

---

### A9. libm trigonometria 1 ULP → CDT körön fekvő döntetlen átbillenés (`circo`/`twopi` multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Osztály.** A V8 `Math.sin`/`Math.cos` függvényei nem bitre azonosak az Apple libm
`sin`/`cos` függvényeivel (bizonyított: 1 ULP-s eltérés a `2π·4.5/8` helyen, a nyolc
ellipszis-akadály sarokszög egyikénél). A `makeObstacle` körülírt 8-szög csúcsai
öröklik ezt az ULP-t, így a háromszög-útvonalvezető bemeneti koordinátái az
orákuluméitól ≤6e-14-gyel különböznek. A szimmetrikus elrendezések (egyforma méretű
csúcsok egy rangon/gyűrűn) az útvonalvezető négyszögeit valós aritmetikában **pontosan körön fekvővé** teszik,
így a pontos beírt kör (incircle) predikátum élen táncol: a bemeneti ULP megfordítja az előjelét,
a korlátozott Delaunay-átló átbillen, és az a folyosósokszög, amely az
orákulumban elbukik a `Pshortestpath` lépésen („destination point not in any triangle” →
sima spline tartalék), a portolt változatban sikerül (vagy fordítva). Az eredő
splinek ~0.2–0.5 pt-tal térnek el. Az **A3**/**A8** testvére: egy redukálhatatlan
lebegőpontos hordozhatósági korlát a C forrásszemantika alatt — az egyeztetés
az Apple libm pontos `sin`/`cos` kerekítésének JS-beli reprodukálását igényelné.

**Érintett:** `241_0` (circo Δ≈0.2 / twopi vászon Δ≈9 az `5:ne->8:nw` élen
a folyosó átbillenésén át); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
mindegyik 1–2 élcímke-pozíció eltérés — a libm 1 ULP a
`poly_init` egységcsúcs-trigonometriájában (`hypot`/`atan2`/`sin`) keletkezik, egy csúcs
számított magasságát egy ULP-vel a minimális méretkorlát fölé teszi, amelyre az orákulum
pontosan esik, és a `floor()`-on át az xlabel R-fa betöltésében egyetlen
címkejelölt-átbillenéssé kaszkádol. Egy helyesen kerekített hypot javítást kipróbáltunk, és
MEGCÁFOLTUK: a `2343`-at kijavította, de regresszálta a `2168_3`-at, amelynek nyolcszög-méretezése
ugyanazon a híváson megy át, ahol az orákulum értéke NEM a helyesen
kerekített — nincs olyan determinisztikus hypot-szabály, amely mindkettőn egyezne az orákulummal).
Az `2168_1` eredetileg ebbe az osztályba tartozott, de
conformant lett, amint a portolt változat emulálta az orákulum fp-összevont `ccw`
függvényét (pathplan `triang.ts`): a folyosóhibáját az FMA-val kiszámított
`pointintri` csúcsvégpont-elutasítás szabályozza, amelyet a portolt változat most
bitre pontosan reprodukál, így a CDT-átló ULP-döntetlen már nem bukkan fel ott.

**Miért elfogadott (a redukálhatatlanságot egy kontrollált kísérlet bizonyítja).** Maga a
CDT tisztázott: a portolt változat `mkSurface` függvénye a GTS
0.7.6 inkrementális beszúrásának hű portolása (`cdt.c`: 1→3 hasítás + rekurzív
`swap_if_in_circle`, a korlátélek előre létrehozottak és felcserélhetetlenek,
`remove_intersected_*` + `triangulate_polygon` korlátérvényesítés), és
egy önálló C kísérleti keret, amely a **valódi GTS könyvtárat** linkeli, és a portolt változat
bitre pontos útvonalvezetői bemeneteit kapja, lapról lapra reprodukálja a portolt változat háromszögelését
(2168_1: 22/22; 241_0: 185/185). Az incircle determináns pontos racionális
kiértékelése a két bemeneti halmazon megerősíti az előjelváltást (+1 a
portolt változat bemeneteivel, −1 az orákulumé esetén). A maradék változót — az 1 ULP-s
trigonometriai különbséget — a `Math.sin`/`sin` bitminták
közvetlen összehasonlításával különítettük el.

**Motorsáv-elfogadás (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> A twopi/circo **xdot motorsávok**
(`parity-twopi.json` / `parity-circo.json`, natív `dot -K <engine>
-Txdot` orákulum, `test/corpus/engine-walk.ts`, szemantikus rajzolásiművelet-összehasonlítás
±0.01 mellett — lásd `test/golden/compare-xdot.ts`) ugyanezt a mechanizmust hozzák felszínre
a fent hivatkozott dot-motoros SVG-felméréstől függetlenül: a twopi `2239` (1
rajzolásiművelet-eltérés — az `_ldraw_` élcímke-szöveg pozíciójának átbillenése, ugyanaz a
`poly_init` egységcsúcs-trigonometriai ULP, amely a `floor()` xlabel
R-fa láncon át kaszkádol; a `2343`, a `share-b29` és a `windows-b29`, amelyeket eredetileg
ezen bejegyzés alatt fogadtunk el, 2026-07-11-én *javítva* lettek a `polylineMidpoint`
hű fmadd összevonásával — lásd az alábbi b29-család bekezdést) és a circo `241_0` (41
rajzolásiművelet-eltérés, Δ≈0.2 pt az `1->2` él vezetett bezierjén — ugyanaz a
CDT-átlós folyosó-átbillenés; döntési napló, 2026-07-10, „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed” bejegyzés). A motorsáv szintjén elfogadva a
`test/corpus/accepted-divergences-engines.json` útján, amelyet a `parity-report.ts` a
`PARITY-twopi.md`/`PARITY-circo.md` fájlokba kapcsol — ugyanazt az összekapcsolást végzi az
`accepted.ts` a dot-sáv `PARITY-dot.md` fájljához.

**circo `2475_2` — körön fekvő closestNode hypot-döntetlen.** Ennek a 10 762 csúcsú gráfnak egyik
28 csúcsú komponensében a circo `getRotation` függvénye
(`circpos.c:73-92`) a `hypot` segítségével azt a blokkcsúcsot választja, amely a
legközelebb van az elrendezés origójához, hogy eldöntse az alblokk elforgatását. Két körön fekvő csúcs
gyakorlatilag egyenlő távolságra van; a V8 helyesen kerekített `Math.hypot` függvénye és az Apple
libm `hypot` függvénye ezt a távolságot 2 ULP-re egymástól kerekíti, ami átbillenti a szigorú `<` összehasonlítást,
más csúcsot választ, és az alblokkot ~20°-kal elforgatja/tükrözi (18 csúcs
mozdul, max. 296.7 pt; a másik 10 744 csúcs bitre azonos, akárcsak a
blokkfa, a körsorrend és minden `centerAngle`). A CR-hypot szabályt
erre az osztályra már megcáfoltuk (2026-07-10). Önálló reprodukció:
`.agent-notes/circo-2475-590-repro.dot`; teljes gyökérokelemzés:
`.agent-notes/circo-b81-2475-rca.md` (elfogadva 2026-07-11).

**twopi `2470` — az xlabel R-fa által felerősített sugárkoordináta-ULP.**
A 2470 egy 140 élű gráf, amelynek HTML `<table>` élcímkéi
közel egybeeső sugárirányú horgonyokon csoportosulnak. A neato családban az élcímkéket
külső címkékként a mohó xlabel-elhelyező (`label/xlabels.c`) helyezi el,
amely Hilbert-rendezésű R-fán át a legkevésbé átfedő jelölt sarkot választja.
A portolt változat splinejai és csúcskoordinátái a kibocsátási pontossággal egyeznek az orákulummal
(nulla spline-/csúcs-/bbox-eltérés még 1e-7-nél is), de egy csúcs sugárirányú
`ND_coord.y` értéke ~2 ULP-vel különbözik (Apple libm `sin`/`cos` vs. V8 `Math`) — jóval
a megfelelőségi mérce alatt, mégis átível a `floor(pos.y − sz.y/2)`
határon, pontosan 0-nál az `objplpmks`-ban, az adott objektum R-fa téglalapját egy
egységgel átbillentve. A Hilbert-sorrend/fa-csoportosítás változása miatt a `RTreeSearch`
más ágat nyes meg, így ~140 címke mindegyike a szomszédos jelölt
sarokra ugrik (minden eltérés egy rögzített (+szélesség, −sormagasság) lépés). Az elhelyezőt, az objektumsorrendet,
a téglalap-kerekítést, a `CombineRect` függvényt (amely hűen tükrözi a C min-min
sajátosságát) és az int32 Hilbert-kulcsot külön-külön hűnek igazoltuk; az
eltérés a felsőbb szintű sugárirányú trigonometriai ULP, ugyanazon okból redukálhatatlan,
mint a twopi `1855`. Elfogadva 2026-07-11; teljes gyökérokelemzés:
`.agent-notes/twopi-2470-rca.md` (amely azt is dokumentálja, hogy az azonosító
reggeli „átmenése” egy elavult orákulum-bináris műterméke volt, nem a portolt változat
regressziója).

**osage `1855` — akadálycsúcs-fp-contract szétkenődés.** A fenti twopi
`1855` sugaras tükör bejegyzéstől különböző: az osage alatt a csúcsközéppontok bitre pontosak
az orákulumhoz képest, és a 110 rajzolásiművelet-eltérés három akadályvezetésű él,
amelyet egy csúcssor tükör oldalára tettek (X bitre pontos, Y tükrözött). A
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) által adott
nyolcszög-akadálycsúcsok 3–4 ULP-vel térnek el a C-étől, mert a clang `-ffp-contract=on`
kapcsolója az `ellipse_tangent_slope`/`line_intersection` `a·b±c`
láncait egyetlen kerekítésű FMA-kká olvasztja, míg a V8 minden műveletet kerekít: a C összevont kerekítése
a sarok-x értékek egy közoszlopát egyetlen bitre azonos double-lé olvasztja (pontosan kollineáris),
a portolt változaté két, egymástól 1 ULP-re levő értékre hasítja. Ez átbillenti a láthatósági
`clear()` érintési tesztet — a közoszlop már nincs elzárva —, ~20
láthatósági élt hozzáadva, és a Dijkstra a fel/le homotópia-döntetlent a
tükör oldalra oldja fel. Kontrollált kísérlet: a C pontos akadálykoordinátáinak
az egyébként érintetlen portolt változatba injektálása **nulla** eltérő
élt ad, teljesen tisztázva a legális elrendezést, a láthatóságot, a Dijkstrát és a spline-
láncot; a C libm `cos`/`sin` értékeinek önálló injektálása hatástalan. Elfogadva
2026-07-11; teljes gyökérokelemzés: `.agent-notes/osage-spline-family-rca.md`.

**b29 család (twopi).** A négy b29 változat egyetlen élen táncoló döntetlenen osztozik: az
`EqmtTyp` élcímke (`Node14732->Node14731`) egy pontos placeLabels
oldalválasztási döntetlenen ül, amelynek kimenetele a környező objektumok 1 ULP-s twopi
elrendezés-sodródásától függ. A `polylineMidpoint` hű fmadd összevonásával
(states-család javítása, 2026-07-11) a portolt változat címkehorgonya
bitre azonos az orákuluméval, a döntetlen mégis ellentétesen oldódik fel
a négy változat közül kettőn (`graphs-b29`, `linux.i386-b29`), míg a másik
kettő (`share-b29`, `windows-b29`) most megfelel — és a `2343` elfogadott A9
címkeeltérése teljesen eltűnt. Korlát: 1 rajzolási művelet, Δ12 pt címke-y. Redukálhatatlan,
a felsőbb szintű sodródás megszüntetése nélkül. Teljes gyökérokelemzés:
`.agent-notes/twopi-states-rca.md`.

Ugyanez a placeLabels élen táncoló döntetlen az **osage** sávon is felbukkan (elfogadva
2026-07-11, teljes gyökérokelemzés: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` és `share-b29` (mindegyik 2 rajzolásiművelet-eltérés — egy élcímke
x-horgonya 878.28-ra esik 841.06 helyett, szimmetrikusan elhelyezve a
bitre azonos 859.67 spline-középpont körül, azaz ±a címke szélességének fele; a két
változat tükrözi egymást) és `1652` (2 rajzolásiművelet-eltérés — két élen egy-egy
címkehorgony billen át azonos középpont körül, az egyik x-ben, a másik y-ban,
bitre azonos splinekkal és nyílhegyekkel; az orákulum teljesen renderel,
így ez nem az ismert natív időtúllépéses ingadozás). Minden esetben az él
geometriája bitre pontos, és csak a címke oldalválasztási döntetlene oldódik fel
ellentétesen az 1 ULP-vel sodródott környezetben.

Az osage sáv hordozza a `polypoly` hármast (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; elfogadva 2026-07-11, teljes gyökérokelemzés:
`.agent-notes/patchwork-tail-rca.md`): az egyetlen eltérő művelet a
puszta transzcendens `cos(π+θ)` egy torzított négyszög 180-as tájolású csúcsán —
a V8 `Math.cos` függvénye helyesen kerekített, míg az Apple libm `cos` függvénye
±1 ULP argumentumfüggő hibát hordoz (így csak a libm alatt `|cos(π+θ)| ≠
|cos(θ)|`); az 1 ULP-s csúcsméret-eltérés a pack `GRID`/`ceil` műveleteibe táplálkozik, átbillent egy
kerületi döntetlent, és a qsort két komponenst egymás csomagolási
celláiba helyez — merev, egész csúcsos csere, alak- vagy útvonalvezetési hiba nélkül. Nincs
olyan determinisztikus átírás, amely egy nem helyesen kerekített libm
transzcendens függvényt reprodukálni tudna — az A9 tankönyvi alakja.

Ugyanezt a mechanizmust 2026-07-28-án igazoltuk a nagyobb testvéren,
a `tree-graphs-directed-polypoly` gráfon (`graphs/directed/polypoly.gv`, új a
905 elemes univerzumban; 112 rajzolásiművelet-eltérés, csak osage). Az eltérő művelet
ugyanaz a `9004`-es csúcs `cos(π+θ)` 1 ULP-s helye — a C és a portolt `bb.x`
értékek bájtról bájtra egyeznek az eredeti gyökérokelemzéssel —, de ezen a 76 csúcsú bemeneten
a terjedés az osage `arrayRects` függvényén át megy: az `acmpf` a csomagolási
cellákat a nyers `width+height` összeg szerint rendezi, és a libm 1 ULP-vel magasabb szélessége
a `9004`-et szigorúan az elforgatott `9000/9002/9006` testvérei elé rendezi, míg
a V8 helyesen kerekített értéke pontos 4-utas döntetlent hagy, amelyet az instabil
qsort másként rendez — más sorfolytonos cellák, `9002`/`9006`
csere, és egy oszlopszélesség-`fmax` kaszkád 8 szomszédot tol el x-ben.
Ha a portolt változat saját `arrayRects` függvényének a C csúcsméreteit, illetve a portolt csúcs-
méreteket adjuk, az a felmérés 10 elmozdult csúcsát reprodukálja bájtra egyező x-eltérésekkel,
lezárva az ok-okozati láncot.

Két további motorsáv-esetet gyökérokig elemeztünk és elfogadtunk 2026-07-11-én
(teljes gyökérokelemzés: `.agent-notes/circo-edge-tail-rca.md`): a twopi `241_0` (6 rajzolásiművelet-
eltérés — a fenti circo bejegyzés testvére: ugyanaz a CDT körön fekvő
incircle döntetlen, a libm `sin`/`cos` 1 ULP-jétől átbillentve, amitől a portolt változat
multispline folyosója egy 14 pontos splinenal sikerül, ahol a natív build
sima 8 pontos vezetésre esik vissza; pontkülönbségek < 0.07 pt) és a circo
`windows-tree` (10 rajzolásiművelet-eltérés egy legyezőélen — a circo elhelyezési trigonometriája
a `node2.y` értéket egyetlen ULP-vel a `node8.y` fölé teszi a pontosan szimmetrikus
18.0 érték körül, és a `closestSide` dyna fejport-választása átbillenti a TOP/BOTTOM
értéket ezen a pontos döntetlenen; a csúcspozíciók és dobozok egyébként bitre azonosak az
orákuluméval).

**sfdp motorsáv — él-lebegőpontos döntetlenek (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Az sfdp xdot motorsáv (`parity-sfdp.json`,
natív `dot -Ksfdp -Txdot`, ±0.5) felszínre hozza a CDT körön fekvő incircle döntetlent, amint
pontos natív útvonalvezetés előtti pozíciókat injektálunk (így az eltérés NEM
iteratív sodródás — lásd az A1-drift osztályt — hanem diszkrét predikátum-döntetlen):

- `42` és `241_0` — CDT körön fekvő incircle döntetlen (a multispline folyosó).
  Injektált pozíciókkal a maradék **szakaszszám-átbillenés**: `42`
  `opCount 5 vs 9` (0->3 él) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (3->2 él) — a portolt változat korlátozott Delaunay-átlója az
  orákulumhoz képest átbillen, így a multispline folyosó N pontos splinenal sikerül, ahol a
  natív build rövidebb sima útvonalra esik vissza (vagy fordítva), pontosan úgy, mint
  a fenti twopi/circo `241_0` bejegyzés. A portolt változat már emulálja az arm64
  `fmadd` összevonást az incircle/`ccw` predikátumban (`src/pathplan/triang.ts`,
  `src/common/fma.ts`), és robusztus incircle Delaunay-t használ; a maradék a
  predikátum bemenetében levő V8-vs-Apple-libm `sin`/`hypot` 1 ULP, amelyet semmilyen hordozható
  kód nem reprodukál.

> **A `2095` átsorolva A9 → A1-drift (2026-07-22).** Korábban itt
> „a hypot testvér” néven szerepelt (egy üres nevű csúcs `""->"4"` éleinek 0.7 pt alatti sodródása).
> Ez a maradék **eszközműtermék** volt: a tulajdonító injektor `GVTS_POS` reguláris kifejezése
> legalább 1 névkaraktert követelt, így az `""` nevű csúcs soha nem injektálódott, és maga után húzta két élét.
> Az injektort az üres nevek illesztésére javítva (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`) az sfdp `2095`
> **0 maradékra** injektálódik — tiszta erősodródás, amelyet a számított A1-drift
> osztály fed le, nem útvonalvezetési lebegőpontos döntetlen. Az azonosítónkénti elfogadása eltávolításra került az
> `accepted-divergences-engines.json` fájlból. (Ugyanez a megállapítás az fdp `2095`-re, lent.)

**Friss kontrollált kísérlet (2026-07-21).** Egy natív-vs-V8 `hypot` próba
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): a rendszer C
`hypot` függvényét lefordítva és a Node `Math.hypot` függvényével összevetve reprezentatív
lapos él-eltérési bemeneteken 1 ULP-s eltérést látunk 6-ból 2-nél (Δ 7.1e-15 és
5.7e-14) — a felosztási küszöb élen táncoló pontja, amely átbillenti a felosztásszámot.
Redukálhatatlan: nincs olyan hordozható hypot, amely reprodukálná az Apple libm-et (az `arm-pow.ts`
precedens ugyanarra a határra). A motorsáv szintjén elfogadva az
`accepted-divergences-engines.json` útján (`sfdp.42`, `sfdp.241_0`).

Az **fdp** xdot motorsáv (`parity-fdp.json`, natív `dot -Kfdp -Txdot`,
±0.5) UGYANEZT a CDT körön fekvő döntetlent hozza felszínre ugyanazon a gráfon, a `241_0`-n: az
orákulum pontos útvonalvezetés előtti pozícióinak injektálásával a maradék 11 numerikus
`unfilled_bezier` eltérés, egyetlen élre korlátozva (`0->1#0`, maxΔ 3.39 pt). Mivel
a csúcspozíciók injektáltan azonosak, az eltérés lejjebb, a
pathplan multispline folyosóban van — ugyanaz a libm 1 ULP-s incircle döntetlen, mint a
twopi/circo/sfdp `241_0` esetén (pontos racionális incircle 185/185, fent). A kapcsolók
már alkalmazva vannak (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); a döntetlen redukálhatatlan. Elfogadva az `accepted-divergences-engines.json`
`fdp.241_0` bejegyzésén át. Az fdp `2095`-je ezzel szemben **A1-drift, nem A9**: az
egyetlen üres nevű csúcs injektálása (miután a tulajdonító injektort kijavítottuk az
`""` nevű csúcsok illesztésére) a maradékát nullára omlasztja — a korábbi „A9 farok” az
injektálatlan üres csúcs volt, amely maga után húzta a rákapcsolódó éleket. Az sfdp `2095` elfogadása
ugyanez a vakfolt volt — egy friss sfdp-tulajdonítási újragenerálás (2026-07-22) a javított
injektorral megerősítette, hogy az is 0-ra injektálódik, és az elfogadását eltávolítottuk (lásd a
fenti `2095 reclassified` megjegyzést).

---

## Nyomon követett hosszú farok (`dot` attribútumok és szélső esetek) {#tracked-long-tail-dot-attribute-edge-case}

**Alapértelmezett** beállításoknál a `dot` motor szoros determinisztikus tűréssel egyezik a
C binárissal a golden korpuszon (a `conformant` minősítés; lásd a tetején
található megjegyzést). A megmaradt különbségek az **attribútumok és szélső
esetek hosszú farka** — bármely Graphviz-portolás történetileg nehéz része. A fenti elfogadott
eltérésekkel ellentétben ezeket *be fogjuk* zárni; élő számokkal követjük őket a
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md) fájlban:

| Kategória | Mi tér el |
|---|---|
| **path-structure** | Élspline-vezetés bizonyos konfigurációkban (pl. egyes lapos-él és sűrű-folyosó esetek). |
| **element-count** | Egy funkció, amely bizonyos gráfokban több/kevesebb SVG-elemet bocsát ki, mint a C. |
| **color-stroke** | Vonal-/kitöltéskibocsátási különbségek bizonyos stílusattribútumoknál. |
| **parser-gap** | Néhány DOT bemenet, amelyet az értelmező még nem fogad el teljesen. |

Ha a gráf csak általános attribútumokat és a `dot` motort használja, szinte
biztosan a determinisztikus tűréses egyezés útján jár. Ha egy elrendezés rosszul néz ki, nézze meg a `PARITY-dot.md` fájlban
az adott bemeneti osztályt — valószínűleg nyomon követett tétel, orákulumhoz rögzített javítási küldetéssel,
nem ismeretlen.

> **Megjegyzés a címkevezérelt esetekről.** A szövegmérési osztály (A2) lezárt —
> már egyetlen `dot` gráf sem elfogadott alatta. Az a gráf, amely ma
> structural-match állapotban van, nyomon követett hiányosság, nem betűmetrikai eltérés.

### `concentrate=true` ellentétes élek nyílhegyei {#concentrate-true-opposing-edge-arrowheads}

Amikor a `concentrate=true` egy ellenpárhuzamos párt (`A->B; B->A`) egyetlen
fennmaradó éllé von össze, annak az élnek **mindkét** végén nyílhegyet kell rajzolnia. Ez mostanra
portolva van (az `arrow_flags` `conc_opp_flag` ága; lásd
`src/common/splines-clip.ts:arrowFlags`), így a `graphs-b135`, `167` és `2087`
egyezik (a hiányzó nyílhegyes `element-count` eltérés és a vágatlan spline-
`@d` mellékhatása egyaránt megszűnt).

Egyes concentrate gráfok **külön, korábbról meglevő maradékot őriznek**, amelyet a
nyílhegy-javítás **nem** kezel — ez csúcs **x-koordináta** pozíció-
eltérés (x-hálózati szimplex / iránytűport), nem nyílhegy-hiba:

- **`graphs-b15`, `graphs-b69`** — a nagy rekord-/klaszter-„felvonó” gráfok.
  A concentrate aktiválódik és helyesen von össze; a maradék ~1 pt-os csúcs-x eltérés,
  amely `element-count`/spline `@d` különbséggé erősödik. Maga a nyílhegy-
  kibocsátás most helyes (a b69 megkapja a hiányzó nyílhegy-sokszögeit). Az x-koordináta gyökérokáért lásd
  a `b69-concentrate-undermerge` ügynöki jegyzetet.
- **`1453`** — továbbra is a legfelső szintű `element-count` okból tér el, amely nem függ össze
  a conc_opp_flag nyílheggyel.
- **`2825`** — e nyílhegy-javítás idején a legfelső szintű
  `element-count` okból tért el, amely nem függ össze a conc_opp_flag-gel (ott nem
  vált ki ellenpár-összevonást); azóta lezárta a fix-2825-rebuild-vlists küldetés,
  lásd fent az A4-et.

Ezek nyomon követett x-koordináta / szerkezeti tételek, **nem** nyílhegy-hibák.

### Elrendezéshűségi hiányosságok a 2.0 hűségi küldetésből (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

A 2.0 hűségi küldetés a portolatlan attribútumértékeket hangos hibává tette (lásd az
`UNSUPPORTED_FEATURE` táblázatot itt:
[Hibák és kivételek](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
A következőket hagyta meg, amelyek a `plans/v2-fidelity/decision-journal.md` fájlban vannak rögzítve.

**Hangos, portolatlan.** Az `overlap=voronoi` átfedő csúcsokkal továbbra is
`UNSUPPORTED_FEATURE` hibát dob a neatóban, twopiban, circóban és sfdp-ben: maga a Voronoi-igazító
(a `vAdjust` algoritmusa) nincs portolva. Az az átfedésteszt, amely eldönti,
hogy dobjon-e hibát, a C sajátja (`countOverlap` a `poly.c` csúcssokszögein).

**Ismert hiányosságok, még mindig néma.** A portolt változat ezeket hiba nélkül rendereli, és
eltér a natív Graphviz-től. A `v2-silent-gaps` küldetés találta meg
(`plans/v2-silent-gaps/decision-journal.md`); nem elfogadott eltérések.

- **A `getAdjustMode` „Unrecognized overlap value” figyelmeztetése nem kerül kibocsátásra.**
- **Az elforgatott sokszögcsúcsok az utolsó biteken eltérhetnek a natívtól
  (redukálhatatlan: a gazda matematikai könyvtára).** A `poly_init` minden csúcsot az
  `atan2`, `hypot`, `sin` és `cos` függvényekkel tájol. Bitre azonos bemenetekkel a macOS libm és a
  V8 különböző utolsó biteket ad vissza (pl. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` a következő csúcsnál:
  libm `…fffd`, V8 `…fffe`), így egy `orientation=20` dobozú csúcs y-ja
  `-18` a portolt változatban és `-17.999999999999996` natívan. A natív Graphviz maga is
  a platform libm-jétől függően változik, és a böngésző nem tudja meghívni. A portolt változat saját
  aritmetikája egyezik a C-vel (a `RADIANS` sorrend rögzítve; a mintavételezett 1664 csúcskoordinátából 776
  bitre azonos, a többi csak a libm miatt tér el). Hatás:
  a pontos érintkezést vizsgáló `polyOverlap` ítéletek átbillenhetnek; natív csúcsokkal minden
  ítélet egyezik.
- **Az sfdp macOS-en eltérhet a natívtól (redukálhatatlan: a gazda libm `pow` függvénye).**
  Műszerezett natív sfdp-vel diagnosztizálva: a pozíciók bitre azonosak maradnak,
  amíg egy taszítóerő-tag, a `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, tehát `pow(x, 2)`), a macOS libm-től 1 ulp-pal kisebbet nem ad, mint `x*x`
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, helyesen kerekítve
  `…396`; macOS `pow(v, 2) != v*v` a mintavételezett 16201 `v` értékből 20-nál). Ez megváltoztatja
  az iteráció `Fnorm` értékét az utolsó bitben; az sfdp adaptív hűtése felerősíti ezt
  egy másik (gyakran tükrözött) elrendezéssé. A portolt `armPow` az ARM
  optimized-routines `pow` függvénye (glibc ≥ 2.28), azaz amit a Linux Graphviz számol;
  a macOS orákulum a kakukktojás. Kizárva: a magozás (az explicit `start=` értékek
  egyeznek), a `pcp_rotate` (ugyanaz a bemenet ugyanazt a kimenetet adja), a pozíciók és
  a vonzó tag (bitre azonos). Példa: egy magányos háromszög `a--b; a--c; b--c`
  az alapértelmezett maggal.
- **Az fdp eltérhet a natívtól a gazda libm `cos`/`sin` függvényei miatt.** Az fdp a
  Graphviz 15.0.0 utáni viselkedést követi (hypot-távolságú taszítás, `Mlimit`), a gazda
  libm `hypot` függvényét bitre pontosan reprodukálva (`src/common/libm-hypot.ts`, 0
  eltérés 400k mintán). Az fdp-vel renderelhető 252 golden bemenetből 251
  pontosan egyezik a natív builddel; a megmaradt egy
  (`parallel-cluster-ldbxtried`) a klaszterportcsúcsokat a
  `T_Wd * cos(alpha)` kifejezéssel helyezi el, és a macOS libm `cos(-2.3840764867756761)` értéke 1 ulp-ra van a
  V8 `Math.cos` értékétől; az fdp erőciklusa ezt kb. 3 hüvelykre erősíti. Az Apple
  `cos` függvénye nem reprodukálható rövid modellből úgy, ahogy a `hypot`.
- **Natív összeomlások, amelyeket a portolt változat definiál.** A natív Graphviz 139-es kóddal lép ki a neato
  `mode=KK` + `model=mds` és egy él `len` attribútuma esetén (az `mds_model` a `GD_dist`
  tömböt 1-alapú sorszámmal indexeli: heap-túlcsordulás), valamint `model=circuit` mellett
  nem összefüggő gráfon. A portolt változat az első esetben eldobja a tartományon kívüli cellákat, a
  másodikban pedig a legrövidebb utakra esik vissza; nincs natív kimenet,
  amellyel összehasonlítható lenne.

---

## Szándékosan nem portolt (nem-célok) {#intentionally-not-ported-non-goals}

Ezek szándékos hatókörhatárok, nem hibák. A könyvtár az **SVG**-t célozza
(valamint a `json` / `xdot` / `dot` / imagemap köztes szövegformátumokat).

- **Más kimeneti formátumok.** A raszteres (PNG/JPG/GIF/WebP/BMP), a PostScript/PDF/EPS,
  és a GUI-s/interaktív háttérrendszerek hatókörön kívül vannak. Használja az SVG-kimenetet, és alakítsa át
  utólag, ha rasztert igényel.
- **`page=` lapozás SVG-hez.** A natív `dot` sem lapozza az SVG-t (az
  SVG-eszköz nem állít be lapozási jelzőt), így a `page=` ezen az úton mindkét
  implementációban hatástalan — itt csak azért dokumentáljuk, mert gyakori
  félreértés.
- **`-Tplain` szöveges kimenet.** Elhalasztott (hű szöveges formátum), nem kizárt.
- **`gvpr`** (a gráffeldolgozó szkriptnyelv) — hatókörön kívül.
- **C++ kényelmi burkolók** (`cgraph++`, `gvc++`) — a C API-t portoltuk
  először; egy idiomatikus TypeScript kényelmi réteg, ha igény van rá, külön
  csomag lenne.
- **`fontnames=svg|ps` böngészős szövegmérésben.** Böngészőben a
  canvas-mérő a betűtípusát a PostScript alias
  `fontnames=native` családlistájából építi (`Times-Roman` → `Times, serif`), ugyanazt az
  arcot, amelyet az SVG-kibocsátó alapértelmezetten renderel. A `TextMeasurer` nem hordoz gráfkontextust,
  így azokat a gráfokat, amelyek `fontnames=svg` vagy `fontnames=ps` értéket állítanak, a
  natív listához mérjük, míg az SVG az svg/ps családot nevezi meg. Azokat az alias-
  súlyokat, amelyeket a CSS nem definiál (`book`, `demi`, `light`, `medium`, `roman`),
  szó szerint bocsátjuk ki, mint a C; a böngészők figyelmen kívül hagyják őket, és normál
  súlyt renderelnek, a mérő pedig az egyezés érdekében normál súlyt mér. A Node-kimenetet
  ez nem érinti (sosem használja a canvas-mérőt).
- **Natív-csak mechanizmusok** böngészőbiztos megfelelőkkel helyettesítve: a dinamikus
  bővítménybetöltést (`dlopen`) statikus motor-/renderelő-regisztráció váltja fel;
  a fájlrendszer-olvasásokat (betűtípusok, képek, konfiguráció) a hívó által megadott
  visszahívások (pl. `setImageSizer`). A viselkedés megmarad; a mechanizmus különbözik.

---

## Eltérés bejelentése {#reporting-a-divergence}

Ha olyan kimenetet talál, amely eltér a C-től, és **nem** a fenti elfogadott eltérés,
nincs a `PARITY-dot.md` fájlban, és nem nem-cél, az bejelentésre érdemes hiba — a C
forráskód a specifikáció, és a fel nem sorolt eltéréseket hibának tekintjük, nem
elfogadott viselkedésnek.
