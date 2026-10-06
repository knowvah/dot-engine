---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yhdenmukaisuus: mitä ”vastaavuus” tarkoittaa {#conformance-what-match-means}

@knowvah/dot-engine validoidaan kanonista C-Graphviz-binääriä vastaan oraakkelina.
Kun tämä projekti sanoo, että graafi **vastaa** C:tä — pariteettiarvio nimeltä
`conformant` —, se tarkoittaa tiettyä, koneellisesti tarkistettua ominaisuutta,
**ei** SVG-tekstin kirjaimellista tavu tavulta -yhtäläisyyttä.

> **Määritelmä.** Porttauksen renderöinti on oraakkelin renderöinnin kanssa
> **yhdenmukainen** (conformant), kun molemmat SVG:t on jäsennetty
> normalisoiduksi elementtipuuksi ja
>
> 1. jokainen **numeerinen** arvo (koordinaatit, polkudata, `points`, `viewBox`,
>    `transform`-parametrit) on oraakkelin kanssa samaa mieltä kiinteän
>    **toleranssin** sisällä ja
> 2. jokainen **ei-numeerinen** arvo (tagien nimet, värit, tekstisisältö,
>    attribuuttien avaimet, luettelomuotoiset attribuuttiarvot) on **täsmälleen
>    sama**.
>
> Jos jokin numeerinen arvo ylittää toleranssin tai jokin ei-numeerinen arvo
> eroaa, renderöinti **ei** ole yhdenmukainen.

## Miksei kirjaimellisesti tavuja? {#why-not-literal-bytes}

SVG serialisoi liukulukukoordinaatit desimaalitekstinä. Kaksi matemaattisesti
ekvivalenttia renderöintiä voi silti erota viimeisessä tulostetussa numerossa
IEEE-754-pyöristyksen, liukulukuoperaatioiden järjestyksen sekä alustakohtaisen
`libm`-/FMA-käyttäytymisen vuoksi, joka vaihtelee suorittimen ja JS-moottorin
mukaan. Kirjaimellinen tavuvaatimus olisi siksi kaikissa ajoympäristöissä, joihin
tämä kirjasto tähtää (selaimet, Node, eri suorittimet), paitsi ankara myös
**testaamaton**. Yhdenmukaisuus kiinnittää ratkaisevan ominaisuuden — geometrian
ja sisällön, jonka katsoja näkee — rajaan, joka on niin pieni, ettei sitä voi
havaita.

## Tarkka toleranssi {#the-exact-tolerance}

Toleranssi on **moottoriluokkakohtainen**, ja se on määritelty tiedostossa
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Luokka | Toleranssi (pt) | Moottorit |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Deterministiset moottorit toistavat C:n kokonaisluku- ja tulostetut koordinaatit
käytännössä täsmälleen, joten ±0.01 vain absorboi desimaalimuotoilun kohinan.
Iteratiiviset (voimaperusteiset) moottorit riippuvat transsendenttifunktioista,
joiden viimeisen bitin tulokset eivät ole toistettavissa alustojen välillä, joten
niille on asetettu väljempi raja, ja lisäksi ne tarkistetaan **rakenteellisen**
yhtäläisyyden suhteen (sama elementtipuu).

Yksi varaus **plain/plain-ext**-pinnalle: plain tulostaa koordinaatit tuumina
viidellä merkitsevällä numerolla (`%.5g`), joten suuruusluokissa ≥ 100
tulostuskvantti (0.01) vastaa ±0.01:n toleranssia. Hyvin suurissa graafeissa
alle yhden ULP:n asettelusuuruinen ero, joka sattuu osumaan viidennen numeron
pyöristysrajan yli, tulostuu täytenä 0.01:n askeleena ja merkitään, vaikka
taustalla oleva geometria on identtinen noin 1e-11 pt:n tarkkuudella (ks.
circo-hyväksyntä `2108`, päiväkirja 2026-07-28). Pisteinä tulostavat xdot- ja
json-pinnat ovat tällä alueella ratkaiseva geometrian vertailu.

**Korpuksen pariteettikartoitus** arvioi jokaisen graafin tilassa `deterministic`
(±0.01) moottorista riippumatta — katso
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Lue koodi {#read-the-code}

Yllä oleva määritelmä ei ole pelkkää proosatavoitetta — se on täsmälleen se, mitä
vertailukoodi tekee. Voit tarkistaa sen itse:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (taulukko ±0.01 / ±0.5) ja `compareSvg`, joka käy läpi kaksi
  normalisoitua puuta ja soveltaa sääntöä (1) numeerinen-toleranssin-sisällä sekä
  sääntöä (2) ei-numeerinen-täsmälleen attribuutti attribuutilta.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — miten raaka SVG jäsennetään vertailtavaksi elementtipuuksi.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, joka antaa yhden alla olevista arvioista. `survey.ts` kattaa
  vain `dot`-SVG-raidan.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — moottorikohtainen **xdot**-kartoitus (`npx tsx test/corpus/engine-walk.ts <engine>`),
  joka soveltaa samaa luokkajakoa kuin yllä oleva taulukko
  (`TOLERANCE = 0.5` moottoreille `neato`/`fdp`/`sfdp`, `0.01` kaikille muille)
  ja vertailee semanttisia piirto-operaatiovirtoja (`compareXdot`) SVG:n sijaan.
  Näin mitataan raidat `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`;
  `dot`in oma xdot-raita käyttää sisarmoduulia
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Arviot {#the-verdicts}

Kartoitus antaa jokaiselle graafille täsmälleen yhden arvion. Ajantasaiset
lukumäärät raidoittain:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
kokoaa yhteen jokaisen moottori × pinta -raidan (sekä deterministiset että
iteratiiviset);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
on `dot`in SVG-kojelauta, ja jokaisella muulla moottorilla on oma
`PARITY-<engine>.md`-kojelautansa sen vieressä hakemistossa `test/corpus/`:

| Arvio | Merkitys |
|---|---|
| **`conformant`** | Vastaa oraakkelia yllä olevan määritelmän mukaan (numeeriset arvot toleranssin sisällä, ei-numeeriset täsmälleen samat). |
| **`structural-match`** | Sama elementtipuu, mutta yksi tai useampi numeerinen arvo ylittää toleranssin. |
| **`diverged`** | Elementtipuut eroavat (puuttuva/ylimääräinen elementti tai ei-numeerinen ero). |
| **`errored` / `timeout`** | Porttaus ei onnistunut renderöimään syötettä (`errored`; `port-error` moottorikohtaisilla raidoilla) tai ylitti aikabudjettinsa (`timeout`). Lasketaan epäonnistumiseksi: kuuluu läpäisyprosentin nimittäjään, ei koskaan läpäisyksi. |
| **`oracle-error`** | C-oraakkeli ei onnistunut renderöimään syötettä, joten vertailukohtaa ei ole. Soveltamisalan ulkopuolella: jätetään pois läpäisyprosentin nimittäjästä. |

**Läpäisyprosentti** jokaisella kojelaudalla on `conformant / (surveyed − oracle-error)`.

”Conformant” on vaatimustaso; ”structural-match” on merkittävää edistystä (oikea
muoto, koordinaatit vielä ajelehtivat); ”diverged”, ”errored” ja ”timeout” ovat
todellisia aukkoja. Mikään näistä ei väitä tulosteen olevan tavu tavulta sama.

Joillakin graafeilla ei ole tietyllä moottorilla **lainkaan arviota**: katso
*moottorien poissulkemiset* alla.

### Moottorien poissulkemiset {#engine-exclusions}

Poissuljettua paria (graafi, moottori) ei käydä läpi, joten se ei ole
yhdenmukainen eikä poikkeava — sitä ei yksinkertaisesti mitata siellä. Tämä eroaa
hyväksytystä poikkeamasta, jossa vertailu *tehtiin* ja ero annetaan anteeksi
dokumentoidulla syyllä.

Rima on tarkoituksella korkealla, koska tarkistamaton graafi on kattavuusaukko
eikä tunnettu kustannus. Merkintä vaatii kaikki kolme ehtoa: moottorin algoritmi ei
todistettavasti voi tarttua syötteeseen, ohittaminen säästää todellista aikaa ja
sama käyttäytyminen on varmennettu halvemmalla raidalla. Se, että on *hidas*, ei
nimenomaisesti riitä — huono porttaus/oraakkeli-suhde on juuri sitä, miltä todellinen
suorituskykyvika näyttää, ja sen perusteella poissulkeminen kätkisi täsmälleen sen,
mitä varten korpus on olemassa.

Jokainen poissulkeminen on lueteltu mekanismeineen tiedostossa
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
rekisteri on `test/corpus/engine-exclusions.json`. Motivoiva tapaus on
`2222`, joka määrittelee 28 303 solmua eikä yhtään kaarta: kun mitään ei ole
suhteutettavana, jokainen voimaperusteinen ja säteittäinen moottori delegoi
yhteiselle komponenttipakkaajalle, eikä mikään niiden omista algoritmeista aja —
minkä vahvistaa se, että niiden oraakkelitulosteet ovat tavu tavulta identtiset.
`dot` kulkee toista polkua ja kattaa sen yhdenmukaisesti kuudessa sekunnissa.
