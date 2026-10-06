---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Megfelelőség: mit jelent az „egyezés” {#conformance-what-match-means}

A @knowvah/dot-engine helyességét a kanonikus, C nyelvű Graphviz bináris, mint orákulum alapján ellenőrizzük.
Amikor ez a projekt azt mondja, hogy egy gráf **egyezik** a C-vel — ez a
`conformant` nevű paritásminősítés —, az egy meghatározott, gépi úton ellenőrzött
tulajdonságot jelent, **nem** az SVG-szöveg szó szerinti, bájtról bájtra való
azonosságát.

> **Definíció.** Egy portolt renderelés akkor **megfelelő** (conformant) az orákulum
> renderelésével, ha a két SVG normalizált elemfává való beolvasása után:
>
> 1. minden **numerikus** érték (koordináták, útvonaladatok, `points`, `viewBox`,
>    `transform` paraméterek) egy rögzített **tűrésen** belül egyezik az orákulum
>    értékével, és
> 2. minden **nem numerikus** érték (címkenevek, színek, szövegtartalom,
>    attribútumkulcsok, felsorolt attribútumértékek) **pontosan egyenlő**.
>
> Ha bármelyik numerikus érték meghaladja a tűrést, vagy bármelyik nem numerikus
> érték eltér, a renderelés **nem** megfelelő.

## Miért nem szó szerint a bájtok? {#why-not-literal-bytes}

Az SVG a lebegőpontos koordinátákat tizedes szövegként szerializálja. Két
matematikailag egyenértékű renderelés is eltérhet az utolsó kiírt számjegyben az
IEEE-754 kerekítés, a lebegőpontos műveletek sorrendje, valamint a CPU-tól és a
JS-motortól függően változó platformfüggő `libm`/FMA-viselkedés miatt. A
szó szerinti bájtegyezés mércéje ezért – azokon a futtatókörnyezeteken, amelyeket ez a
könyvtár megcéloz (böngészők, Node, különböző CPU-k) – nem csupán szigorú, hanem
**tesztelhetetlen** lenne. A megfelelőség azt a tulajdonságot rögzíti, amely
valóban számít – a geometriát és a tartalmat, amelyet a nézők látnak –, egy olyan
kicsiny határon belül, amely az érzékelési küszöb alatt marad.

## A pontos tűrés {#the-exact-tolerance}

A tűrés **motorosztályonként** van meghatározva a
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
fájlban:

| Osztály | Tűrés (pt) | Motorok |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

A determinisztikus motorok lényegében pontosan reprodukálják a C egész értékű/kiírt
koordinátáit, így a ±0.01 csak a tizedes formázás zaját nyeli el. Az iteratív
(erővezérelt) motorok olyan transzcendens függvényektől függnek, amelyek
utolsó bitre pontos eredménye platformok között nem reprodukálható, ezért lazább
határt kapnak, és ezen felül **szerkezeti** egyezésre (azonos elemfa) is
ellenőrizzük őket.

Egy kikötés a **plain/plain-ext** felületre: a plain a koordinátákat hüvelykben,
5 értékes számjeggyel (`%.5g`) írja ki, így ≥ 100 nagyságrendnél a kiírás
kvantuma (0.01) megegyezik a ±0.01 tűréssel. Nagyon nagy gráfoknál egy
ULP alatti elrendezésbeli különbség, amely épp az 5. számjegy kerekítési határára esik,
egy teljes 0.01-es lépésként íródik ki, és megjelölésre kerül, noha az alapul fekvő
geometria ~1e-11 pt pontossággal azonos (lásd a circo `2108` elfogadását,
napló: 2026-07-28). Ebben a tartományban a pontban kiíró xdot/json felületek
jelentik a mérvadó geometriai összehasonlítást.

A **korpusz paritásfelmérése** minden gráfot a `deterministic` módban (±0.01)
értékel, a motortól függetlenül — lásd:
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Olvassa el a kódot {#read-the-code}

A fenti definíció nem prózai ábránd — pontosan az, amit az összehasonlító kód
csinál. Hogy saját maga ellenőrizhesse:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (a ±0.01 / ±0.5 táblázat), és `compareSvg`, amely végigjárja a két
  normalizált fát, és attribútumonként alkalmazza az (1) numerikus-a-tűrésen-belül és a (2)
  nem-numerikus-pontos szabályt.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hogyan olvasódik be a nyers SVG az összehasonlítható elemfába.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, amely az alábbi minősítések egyikét rendeli hozzá. A `survey.ts` csak
  a `dot` SVG-sávját fedi le.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — a motoronkénti **xdot**-felmérés (`npx tsx test/corpus/engine-walk.ts <engine>`),
  amely ugyanazt az osztályfelosztást alkalmazza, mint a fenti táblázat
  (`TOLERANCE = 0.5` a `neato`/`fdp`/`sfdp` esetén, `0.01` minden más motornál),
  és SVG helyett szemantikus rajzolásiművelet-folyamokat (`compareXdot`) hasonlít össze. Így
  mérjük a `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` sávokat; a
  `dot` saját xdot-sávja a testvér
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts)
  eszközt használja.

## A minősítések {#the-verdicts}

A felmérés minden gráfhoz pontosan egy minősítést rendel. Az élő számok sávonként:
a [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
összesíti az összes motor × felület sávot (determinisztikusakat és iteratívakat egyaránt);
a [`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
a `dot` SVG-irányítópultja, és minden más motornak saját
`PARITY-<engine>.md` irányítópultja van mellette a `test/corpus/` könyvtárban:

| Minősítés | Jelentés |
|---|---|
| **`conformant`** | A fenti definíció szerint egyezik az orákulummal (numerikus a tűrésen belül, nem numerikus pontos). |
| **`structural-match`** | Azonos elemfa, de egy vagy több numerikus érték meghaladja a tűrést. |
| **`diverged`** | Az elemfák eltérnek (hiányzó/többlet elem vagy nem numerikus eltérés). |
| **`errored` / `timeout`** | A portolt változat nem tudta renderelni a bemenetet (`errored`; a motoronkénti sávokon `port-error`), vagy túllépte az időkeretét (`timeout`). Kudarcnak számít: beleszámít az átmenési arány nevezőjébe, soha nem számít átmenőnek. |
| **`oracle-error`** | A C orákulum nem tudta renderelni a bemenetet, így nincs mihez hasonlítani. Hatókörön kívüli: kimarad az átmenési arány nevezőjéből. |

Az **átmenési arány** minden irányítópulton `conformant / (surveyed − oracle-error)`.

A „conformant” a mérce; a „structural-match” érdemi előrelépés (jó alak, a
koordináták még csúsznak); a „diverged”, az „errored” és a „timeout” valódi hiányosság.
Ezek egyike sem állítja, hogy a kimenet bájtra azonos.

Egyes gráfok egy adott motoron **egyáltalán nem kapnak minősítést**: lásd a
*motorkizárások* részt alább.

### Motorkizárások {#engine-exclusions}

Egy kizárt `(gráf, motor)` pár nem kerül bejárásra, így nem megfelelő és nem is
eltérő — egyszerűen nem mérjük ott. Ez különbözik az elfogadott eltéréstől, ahol az
összehasonlítás *megtörtént*, és a különbséget dokumentált okkal megbocsátjuk.

A mérce szándékosan magas, mert egy meg nem vizsgált gráf lefedettségi lyuk,
nem pedig ismert költség. Egy bejegyzéshez mindhárom feltétel szükséges: a motor
algoritmusa bizonyíthatóan nem tud érvényesülni a bemeneten, a kihagyás valódi időt
takarít meg, és ugyanez a viselkedés egy olcsóbb sávon igazolt. A *lassúság* kifejezetten
nem elegendő — a rossz portolt/orákulum arány pontosan úgy néz ki, mint egy valódi
teljesítményhiba, és ennek alapján kizárni éppen azt rejtené el, amiért a korpusz létezik.

Minden kizárás a mechanizmusával együtt fel van sorolva a
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions)
fájlban; a nyilvántartás a `test/corpus/engine-exclusions.json`. A mozgatórugó eset
a `2222`, amely 28 303 csúcsot és nulla élt deklarál: mivel nincs mit egymással
viszonyba hozni, minden erővezérelt és sugaras motor a közös
komponenscsomagolóra delegál, és a saját algoritmusaik közül egyik sem fut — ezt
az igazolja, hogy az orákulumkimeneteik bájtra azonosak. A `dot` más úton jár, és hat
másodperc alatt megfelelően lefedi.
