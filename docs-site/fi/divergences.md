---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Tunnetut poikkeamat C Graphvizista {#known-divergences-from-c-graphviz}

@knowvah/dot-engine tavoittelee mahdollisimman tarkkaa uskollisuutta kanoniselle
C-toteutukselle. C-lähdekoodi on määrittely; luettelosta puuttuva ero
käsitellään virheenä, ei hyväksyttynä käyttäytymisenä.

> **Mitä ”vastaavuus” tarkoittaa tässä.** Korpuksen pariteettiarvio nimeltä
> `conformant` on **tiukka deterministinen toleranssi**, *ei* SVG:n
> kirjaimellista tavu tavulta -yhtäläisyyttä: numeeristen koordinaattien ja
> polkujen on täsmättävä **±0.01**:n sisällä, ja kaiken ei-numeerisen sisällön
> (tagit, värit, teksti) on oltava täsmälleen sama
> (`compareSvg(…, 'deterministic')`). Tässä dokumentissa ”vastaavuus” ja
> ”yhdenmukainen” viittaavat tähän toleranssiarvioon. Täydellinen määritelmä:
> [Yhdenmukaisuus](./conformance.md).

Kun tuloste *todella* eroaa, ero kuuluu täsmälleen yhteen kolmesta luokasta:

1. **Hyväksytyt erot** — erot, jotka olemme tutkineet, ymmärtäneet juurisyyhyn
   asti ja **päättäneet tietoisesti olla tekemättä yhdenmukaisiksi**. Jokainen on
   rajattu, luonnehdittu ja perusteltu alla. Nämä eivät ole virheitä, eikä niitä
   ”korjata” ilman erityistä, erikseen rajattua syytä.
2. **Seurattu pitkä häntä** — tunnetut aukot, jotka *suljetaan*, kukin
   oraakkeliin sidotulla korjauksella. Ne ovat ajantasaisine lukuineen
   tiedostossa
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Ei-tavoitteet** — tarkoituksellisia soveltamisalan rajoja (muodot ja
   mekanismit, joita emme koskaan aikoneet toistaa).

Ensisijaiset, jatkuvasti päivitettävät tietueet ovat
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(syötekohtainen pariteettikojelauta natiivia `dot`ia vastaan) ja
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(algoritmitason porttauksen tilaluettelo).

**Koneluettava** totuuden lähde sille, mitkä graafit on *hyväksytty* (luokka 1
alla), on
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Työkalut yhdistävät sen raportointihetkellä: `PARITY-dot.md` erottaa
**hyväksytyt erot** **seuratusta** työjonosta, ja sääntöportti ottaa sallittujen
luettelonsa siitä. Alla olevat proosaosiot selittävät jokaisen merkinnän (A1 ja
A3 ovat voimassa; A2 on suljettu ja säilytetty historiana); CI-testi
(`accepted-divergences.test.ts`) valvoo, että jokainen hyväksytty graafi yhä
poikkeaa, joten tämä luettelo ei voi huomaamatta rapistua.

---

## Hyväksytyt erot (emme tietoisesti tee niitä yhdenmukaisiksi) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Hyväksymme eron — sen sijaan että jahtaisimme tavupariteettia — vain, kun **kaikki**
seuraavat ehdot täyttyvät:

- Juurisyy on **siirrettävyysrajoite** (jotain, mitä JavaScript-/
  selainajoympäristö ei pysty toistamaan täsmälleen), ei loogista virhettä
  porttauksessa.
- Ero on **alle havaintokynnyksen** ja todistettavasti **rajattu**.
- Korjauksella olisi **suhteeton hinta ja vaikutusalue** hyötyyn nähden
  (tyypillisesti: se koskisi jaettua primitiiviä, jota satojen jo
  yhdenmukaisten graafien käsittely käyttää, ja riskinä olisivat regressiot
  murto-osapikselin hyödyn vuoksi).

Kun hyväksymme eron, luonnehdimme sen tässä, jotta käyttäjät eivät koskaan joudu
yllätetyiksi. Hyväksytyn eron koskemat graafit validoidaan **rakenteellisella /
toleranssi**-vaatimuksella tavuvaatimuksen sijaan.

### A1. Liukulukudeterminismi (voimaperusteiset moottorit) {#a1-floating-point-determinism-force-directed-engines}

**Koskee:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (iteratiiviset,
jousimallia käyttävät moottorit). `dot`-moottorin *asettelua* tämä
iteratiivisten mallien determinismi **ei** koske; erillinen, kapeasti rajattu
`dot`in splinereititykseen liittyvä liukulukuero on käsitelty alla kohdassa
**A3**.

> **Soveltamisala, historiallisesti mittaamaton varaus — nyt osittain mitattu.**
> **Pää-dot-moottorin SVG-kartoitus** (`test/corpus/survey.ts`) on yhä
> **vain dot**: natiivi oraakkeli ajetaan `GVBINDIR=/tmp/ghl`-asetuksella, joka
> linkittää symbolisesti **vain** `core`- ja `dot_layout`-liitännäiset
> (`test/corpus/gen-headless-gvbindir.sh` käy läpi täsmälleen `core dot_layout`
> — yhtään `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`-asettelutiedostoliitännäistä
> ei ole), ja sekä oraakkeli että porttaus kutsutaan `dot`-moottorilla. Korpuksen
> tunnisteet kuten `*_neato` / `*_circo` / `root_twopi` ovat siis tuossa
> kartoituksessa *tiedostonimiä*, jotka on aseteltu `dot`illa, eivät niiden
> natiivilla moottorilla, ja A1 vastaa tässä **nollaa** graafia — ei siksi, että
> moottorit olisi todistettu yhdenmukaisiksi, vaan koska tuo kartoitus ei
> koskaan käytä niitä.
>
> **Mutta kaikilla kuudella A1-moottorilla on nyt oma natiivimoottorikartoituksensa**
> tiedostojen `test/corpus/engine-walk.ts` + `parity-report.ts` kautta
> (`GVBINDIR`-riippumaton — kukin käynnistää `dot -K <engine> -Txdot`in
> suoraan), kahdella eri tarkkuustasolla, jotka on dokumentoitu erikseen
> alla: `circo`/`twopi`/`osage` ajetaan samalla **±0.01:n deterministisellä**
> toleranssilla kuin dot-kartoitus ja syykohtaisella juurisyyluokittelulla
> (”Moottoriraidan hyväksyntä” alla); `neato`/`fdp`/`sfdp` ajetaan
> väljemmällä **±0.5:n luonnehdinta**-toleranssilla ilman syykohtaista
> luokittelua toistaiseksi (”Iteratiivisten moottorien luonnehdinta” alla).
> Nykyiset moottorien väliset luvut:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Luonnehdinta.** Nämä moottorit suorittavat iteratiivisia numeerisia asetteluja,
joiden tulokset riippuvat liukulukupyöristyksestä — erityisesti
yhdistetystä kerto-yhteenlaskusta (FMA) ja funktiosta `Math.pow`, jotka voivat
poiketa JavaScript-moottorien ja suoritinarkkitehtuurien välillä. Porttaus
vastaa C:n operaatiojärjestystä, missä voi (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — esim. `sfdp` kiinnittyy noin kuuteen
merkitsevään numeroon natiivia oraakkelia vasten täsmäävällä PRNG:llä ja
`fma`:lla — mutta täsmällinen, identtiset koordinaatit tuottava toisto **ei ole
taattu alustojen välillä**. Topologia säilyy; mahdollinen poikkeama on
solmujen hienoissa koordinaateissa.

**Miksi hyväksytty.** Tämä on JS:ssä ajamisen kova rajoite, ei suunnitteluvalinta
— samaa perhettä kuin A3:n Apple-`hypot`-herkkyys. Ei ole keinoa taata
bittitarkasti identtisiä transsendentti-/FMA-tuloksia kaikissa kohdeajoympäristöissä,
joten tavuvaatimus olisi testaamaton eikä pelkästään kallis. **A1:n arviointi**
(pelkän varauksen esittämisen sijaan) vaati erillisen natiivimoottoripariteettiraidan —
rakennettu 2026-07-11 nimellä `test/corpus/engine-walk.ts` + `parity-report.ts`,
joka kartoittaa jokaisen syötteen sen omalla moottorilla `dot`in sijaan. Rehellinen
katto tälle työlle on **kaventaa** A1 muotoon ”ei aktiivista poikkeamaa
vertailualustalla”, ei koskaan poistaa alustojen välistä varausta; tähänastiset
tulokset (alla) pysyvät tuossa katossa: `circo`/`twopi`/`osage` ovat kukin
tuoneet esiin ja juurisyyanalysoineet kourallisen aitoja A1/A9-tapauksia, ja
`neato`/`fdp`/`sfdp` ovat nyt 90.8/77.5/68.0 %:ssa 0.5 pt:n sisällä natiivista
910 kohteen joukossa, mikä tarkoittaa, että porttattu aritmetiikka
(`fma.ts`, `arm-pow.ts`, vastaava PRNG) pitää useimmilla graafeilla — ja
jokainen jäljellä oleva poikkeava tunniste on yksitellen selitetty injektiolla
(ratkaisijan ajelehtiminen vs. porttauksen vika) eikä jätetty luokittelemattomaksi
ajelehtimiseksi; katso iteratiivisten moottorien luonnehdinta alla.

**Moottoriraidan hyväksyntä: twopi-nuolten perhe.** <a id="a1-twopi-arrows-family"></a>
Yllä oleva lainauslohko kuvaa dot-moottorin SVG-kartoitusta, jossa A1 vastaa nollaa
graafia; erillinen `twopi` **xdot-moottoriraita** (`parity-twopi.json`, natiivi
`dot -K twopi -Txdot` -oraakkeli, `test/corpus/engine-walk.ts`) ajetaan
*natiivilla* moottorillaan ja tuo esiin konkreettisen, varmennetun A1-tapauksen
9 korpuksen tunnisteella:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
ja (lisätty 2026-07-28, uusi 905 kohteen joukossa) directed/-sisar
`tree-graphs-directed-oldarrows` — kukin poikkeaa yhdellä hallitsevalla kaarella
(`Z->I` tai `i->Z`; 12–64 piirto-operaatioeroa). Injektio-A/B (päätöspäiväkirja,
2026-07-10 -merkintä ”injection A/B verdicts:
twopi arrows family EXONERATED...”) osoitti mekanismin suoraan:
natiivin `spline_edges`in sisääntulo-`ND_pos`in tallennus ja injektointi
porttauksen `splineEdgesShifted`iin tuottaa **täysin yhdenmukaisen** tulosteen
tunnisteella `graphs-arrows` (`Z->I` muuttuu tavu tavulta identtiseksi oraakkelin
kanssa, sama 7/14 pisteen splini) — joten ero on 100-prosenttisesti
reititystä edeltävää solmusijaintien ajelehtimista `twopi`n PRISM-päällekkäisyyden
poistoratkaisijasta, ja porttauksen splinereititys/-emissio on vapautettu epäilystä.
Näkyvä oire 8 tunnisteesta 6:lla on bezier-pistemäärän
kääntyminen (`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`n sovitettu palamäärä
on herkkä sille, kummalle puolelle esteen rajaa ajelehtinut solmusijainti
osuu, joten PRISMin iteratiivisen ratkaisun jälkeinen alle ULP:n sijaintiero
kääntää sovitetun splinin segmenttimäärän (kaksi muuta tunnistetta,
`graphs-arrowsize`/`nshare-arrows_dot`, näyttävät saman ajelehtimisen pienempänä
pelkkänä sijaintierona ilman palamäärän kääntymistä). Hyväksytty moottoriraidan
tasolla tiedoston `test/corpus/accepted-divergences-engines.json` kautta, joka
yhdistetään `PARITY-twopi.md`:hen `parity-report.ts`:llä — sama yhdistäminen, jonka
`accepted.ts` tekee dot-raidan `PARITY-dot.md`:lle.

`oldarrows`-juurisyyanalyysi (2026-07-28) paikansi perheen pistemääräoireen täsmällisen
kääntymiskohdan. Sen `i`–`Z`–`I`-viuhka on kollineaarinen renkaan halkaisijalla, ja
pathplanin `directVis`in `intersect()` estää näkölinjan, kun esteen
kärki on ”segmentillä” — jolloin `wind()`in 1e-4:n kollineaarisuustoleranssi
saa jopa 270 pt segmentistä etäällä olevan solmun lasketuksi kollineaariseksi, ja
`inBetween()` (joka olettaa kollineaarisuuden) rappeutuu testaamaan vain
**x-projektion**: kärki estää silloin ja vain silloin, kun sen x on tiukasti
kahden päätepisteen x-koordinaatin välisen ULP:n levyisen välin sisällä. Kumpi
kahdesta peilatusta säteittäisestä kaaresta taipuu, riippuu siis PRISMin
ratkaisun kolmen nimellisesti yhtä suuren x-arvon viimeisen ULP:n järjestyksestä
— C taivuttaa `Z->I`:n (solmun `i` akselikärki osuu sen välin sisään), porttaus
taivuttaa `i->Z`:n (solmun `I` kärki osuu omaan väliinsä). `directVis`in
toistaminen offline-tilassa kummankin puolen tallennetulla estejoukolla
toistaa kummankin puolen päätöksen täsmälleen, ja oraakkelin reititystä
edeltävän `ND_pos`in injektointi porttaukseen tuottaa 0 eroa
(`attribution-twopi.json`) — reititys ja emissio ovat tavutarkasti uskollisia.

`1855` on saman reititystä edeltävän PRISM-FP-mekanismin säteittäinen/tähtimäinen
**peilivariantti** (hyväksytty 2026-07-11): sen 31 lehteä ovat täsmälleen
samalla ympyrällä, joten tähtiasettelu on peilisymmetrinen ja PRISMin
päällekkäisyyden poisto on symmetriaepästabiilissa tasapainossa; 1 ULP:n V8-vs-libm
`cos`/`sin`-ero 5 lehtikulmassa `circleLayout`in `setAbsolutePos`issa valitsee
vastakkaisen peilialtaan, ja koko säteittäinen asettelu päätyy oraakkelin
täsmälliseksi x-akselipeilikuvaksi (suurin solmusiirtymä 6.04 pt, bb säilyy).
Injektio-A/B osoitti molemmat suunnat: C:n täsmällisten `circleLayout`-sijaintien
syöttäminen porttauksen PRISMiin toistaa oraakkelin solmu solmulta (3e-14), ja
vain 5 ULP-poikkeavan lehtisijainnin palauttaminen kääntää koko asettelun takaisin
porttauksen peiliin. Täysi juurisyyanalyysi: `.agent-notes/twopi-radial-drift-rca.md` (päätöspäiväkirja
2026-07-11).

**Iteratiivisten moottorien luonnehdinta: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Toisin kuin edellä olevat `circo`/`twopi`/`osage`-moottoriraidat, `neato`/`fdp`/`sfdp`
**ei** ole vielä luokiteltu syykohtaisesti — `engine-walk.ts` kirjaa näille kolmelle
kentän `tolerance: 0.5`, ja `parity-report.ts` renderöi ne erilliseen
”Iteratiiviset moottorit (±0.5 luonnehdinta)” -osioon tiedostossa
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
nimenomaisesti **ei** vertailukelpoisina muualla tässä dokumentissa esiintyviin
±0.01:n deterministisiin läpäisyprosentteihin. Nykyiset lukumäärät (910 kohteen joukko; läpäisyprosentti jättää pois
syötteet, joita C-oraakkeli ei pysty renderöimään, kohdan [Yhdenmukaisuus](./conformance.md) mukaisesti):

| moottori | kartoitettu | ±0.5 pt:n sisällä | ei-yhdenmukainen (kaikki selitetty, hyväksytty) | porttausvirhe / aikakatkaisu | oraakkelivirhe |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Ensimmäinen ajo, 2026-07-11 762 kohteella, mittasi 263/311/260 ±0.5 pt:n
sisällä — hyppy nykyisiin lukemiin tuli sittemmin toteutetuista
syykohtaisista korjauksista, pääasiassa neaton porttaamattoman `user_pos`/`P_SET`-käsittelyn,
moottorin alustuksen yhdistämisen ja `setEdgeType`-makro-vs-funktio-korjauksen ansiosta.)

Toisin kuin ensimmäisellä ajolla, jokainen poikkeava rivi on nyt yksitellen selitetty:
injektiotyökalu (`test/corpus/attribute-divergence.ts`) syöttää
natiivin oraakkelin reititystä edeltävän `ND_pos`in porttaukseen ja vertaa uudelleen, ja
jokainen nykyinen poikkeava tunniste on joko `drift-exonerated` (porttauksen reititys
ja emissio toistavat oraakkelin täsmälleen, kun ratkaisijan ajelehtiminen poistetaan)
tai yksi kourallisesta erikseen hyväksyttyjä syykohtaisia jäännöksiä (`241_0`:n
CDT:n incircle-tasapeli kaikilla kolmella moottorilla, neaton `2239`, sfdp:n `42`/`2556`).
Alla oleva luokkahyväksyntä vahvistaa vapautetun joukon; ajantasaiset luvut
moottorikohtaisilla kojelaudoilla
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**A1-drift-luokkahyväksyntä (iteratiiviset moottorit, laskettu jäsenyys).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
sisältää yhden `"A1-drift"`-**luokka**merkinnän iteratiivista moottoria kohti (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — erillään
`circo`/`twopi`/`osage`-raidoilla yllä käytetyistä syykohtaisista merkinnöistä (D2,
`plans/iterative-parity-campaign/decisions.md`). Toisin kuin syykohtaisessa merkinnässä,
luokan jäsenyyttä ei koskaan luetella käsin rekisterissä: `parity-report.ts`
laskee sen raportointihetkellä vastaavasta `attribution-<engine>.json`ista
(T1:n injektioselitystyökalu, `test/corpus/attribute-divergence.ts`)
— jokainen poikkeava tunniste, jonka natiivi reititystä edeltävä `ND_pos` injektoitiin
porttaukseen ja vertailu uudelleen on yhdenmukainen ±0.5:llä, saa
`verdict: 'drift-exonerated'` tuossa tiedostossa, mikä tarkoittaa, että kahden moottorin
iteratiiviset ratkaisijat suppenivat numeerisesti erilaisiin mutta kumpikin sisäisesti
johdonmukaisiin asetteluihin (liukulukujen kertymäero yllä olevan A1-luonnehdinnan mukaan,
ei porttauksen reitityksen tai emission virhe). Syykohtainen näyttö — ämpärin muoto, perus- vs. injektoitu eromäärä,
tasaisen siirron/peilin tunnistus — on itse selitetiedostossa,
ei kopioituna tähän dokumenttiin tai rekisteriin (D2). Tunniste,
joka myöhemmin alkaa läpäistä suoraan tai jonka uudelleenselityksen arvio muuttuu,
putoaa luokasta automaattisesti seuraavassa raportin uudelleengeneroinnissa — ei vanhentunutta
hyväksyntämuokkausta eikä vartiotestin epäonnistumista. Moottorit, joiden
`attribution-<engine>.json`ia ei ole vielä generoitu, renderöivät luokan
muodossa ”attribution pending” nollalla jäsenellä, identtisesti kuin jos hyväksyntää
ei olisi lainkaan — luokkamerkintä saa edeltää dataansa (katso
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Tekstinmittaus (fonttimetriikka) → nimiölähtöinen asettelu — SULJETTU <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Tila (2026-07-01): suljettu.** Tämän luokan alla ei enää hyväksytä yhtään
korpuksen tunnistetta; osio säilytetään historiallisena dokumentaationa
mekanismista ja sen neutraloineesta injektoitavasta `TextMeasurer`-liitäntäkohdasta.
Peräkkäiset tekstinmittauskorjaukset (`EstimateTextMeasurer`-siirtymä,
fonttitietoiset pystymetriikat, ei-ASCII-UTF-8-tavukorjaus) ratkaisivat lähes
jokaisen nimiölähtöisen asetteluerotuksen, joka tähän ennen kuului. **`proc3d`** —
entinen kanoninen A2-esimerkki — on täysin **`conformant`** kaikissa kolmessa
korpushakemistossa (`graphs-`/`share-`/`windows-proc3d`): vastaava bbox, nolla
polkudataeroa, nolla nimiön ankkurieroa.

**Viimeiset jäsenet poistettiin (2026-07-01).** **`NaN`-perhe**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) oli täällä pitkään sen jälkeen, kun sen
solmugeometria jo vastasi C:tä täsmälleen (76/76 vertailupistettä). Sen todellinen
jäännös — 8 suoran kaaren päätepistettä neljällä vastakkaisella 2-syklin parilla
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) siirtyneinä 6–14 pt — diagnosoitiin uudelleen, ja se osoittautui
**ei lainkaan fonttimetriikkailmiöksi**, vaan kahdeksi porttauksen viaksi dotin
monikaarireitityksessä (mission `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Vastakkaisparin kaistajärjestys.** Porttaus järjesti jokaisen rinnakkaiskaariryhmän
   uudelleen alkuperäisen luontijärjestysnumeron mukaan ennen Multisep-kaistasiirtymien
   määräämistä; C määrää kaistat edgecmp-keruujärjestyksessä (MAINGRAPH-eteenpäinedustaja
   ensin, AUXGRAPH-käänteinen jäsen toisena — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). 2-sykli, jonka käänteinen jäsen oli määritelty
   ensin, piirsi kumpikin kaaren toisen 18 pt:n käytävälle.
2. **Turha litteä vierekkäisyys rankien yli yhdistetyillä kaarilla.** `markAdjacent`
   merkitsi `ND_other`-merkinnät ilman C:n samaa rankia koskevaa vartijaa
   (`flat.c:272-276`), jolloin `groupSize`n flat-adjacent-oikopolku nielaisi
   portcmp-ryhmärajat.

Kun molemmat on korjattu uskollisesti, perhe on **`conformant`** kaikissa kolmessa
hakemistossa (elementeittäin: solmuja 0, kaaria 0 poikkeavaa), ja sama mekanismi
sulki tunnisteet `42`, `clust2`, `ngk10_4` (structural-match → conformant) ja siirsi
`b124`:n arviosta diverged arvioon structural-match — kaikki 2-sykli-/rinnakkaispareja.

**Molemmat kartoituspuolet käyttävät samaa estimaattoria — mittaus on neutraloitu.**
Natiivi `dot`-oraakkeli ajetaan headless-`GVBINDIR`:llä
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), joka linkittää symbolisesti vain
`core`- ja `dot_layout`-liitännäiset — ei `gd`/`pango`/`quartz`-tekstiasetteluliitännäistä.
Kun tuo paikka on tyhjä, graphviz turvautuu sisäänrakennettuun
`estimate_textspan_size`en. TypeScript-porttauksen `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) on saman rutiinin uskollinen porttaus ja
Noden oletus, jonka `createMeasurer()` ratkaisee
(`src/common/textmeasure-factory.ts`). **Molemmat puolet jokaisessa pariteettivertailussa
mittaavat siis tekstin identtisellä estimaattorilla** — todelliset
FreeType-/pango-glyfien etenemät eivät koskaan tule vertailuun. Siksi tämän verdiktin
regressio osoittaa asettelukoodiin, ei fonttiin, ja siksi estimaattorin omien
virheiden korjaaminen (UTF-8-tavulaskenta, pystymetriikan fonttitietoisuus) sulki
suurimman osan tästä luokasta kokonaan eikä vain kaventanut fonttimetriikkaeroa.

**Injektoitava `TextMeasurer`-liitäntäkohta.** Tämä neutralointi on mahdollinen vain siksi,
että tekstinmittaus on tietoinen liitäntäkohta, ei kovakoodattu kumpaankaan
moottoriin. `TextMeasurer` on yhden metodin rajapinta (`measure(text, font, size,
flags) → {w, h, …}`), joka injektoidaan jokaiseen nimiön koon laskentakohtaan —
`polyInit`, `recordInit`, `initEdgeLabels` ja `buildNodeLabel` ottavat kukin
mittaajan parametrina; mikään ei mittaa tekstiä globaalin kautta. Se kiinnitetään
testeille/CI:lle kutsulla `setTextMeasurer(...)` tai `GV_TEXT_MEASURER=estimate`.
Liitäntäkohta mahdollistaa myös sen *todistamisen*, että jäännös on pelkkää mittausta: syötä
porttaukselle täsmälleen ne leveydet, jotka C mittasi (otettu oraakkelista), ja tarkista,
toistaako asettelu sen jälkeen C:n täsmälleen. Tuo koe alun perin oikeutti
A2-arvion `proc3d`:lle (katso historiallinen liite alla) — tekniikka
on yhä pätevä. Sen käänteinen käyttö sulki luokan: koska mittaus oli
todistettavasti neutraloitu kummallakin kartoituspuolella, `NaN`-kaaren jäännös ei voinut
olla fonttimetriikkailmiö, mikä pakotti uudelleendiagnoosiin, joka löysi kaksi yllä olevaa
reitityksen vikaa.

::: details Historiallinen analyysi (korvattu 2026-06-30) — säilytetty tietueeksi
Alla oleva aineisto kuvaa tämän luokan aiempaa tilaa, ennen kuin
`EstimateTextMeasurer`-siirtymä, fonttitietoiset pystymetriikat ja
ei-ASCII-UTF-8-tavukorjaus sulkivat sen suurimmaksi osaksi. Se ei enää kuvaa nykyistä
käyttäytymistä — säilytetty vain, jottei tähän johtanut päättely katoa.
Erityisesti: (1) alla olevan mittaustaulukon ”natiivi C” -leveysluvut ovat
**FreeType**-arvoja todellisen fonttipolun renderöinnistä; pariteettikartoitus
ei koskaan käytä tuota polkua — molemmat puolet ajavat `estimate_textspan_size`a (katso
yllä) — joten taulukko ei kuvasta, miten pariteetti nykyisin mitataan; (2)
päällekkäiskuvat ja golden/meidän-renderöinnit alla esittävät **ei-korpus**-`proc3d`:n
(`graphs/directed/proc3d.gv`, ~2620 pt), joka ei kuulu
pariteettikartoitukseen; korpuksen `proc3d`-variantit ovat nyt yhdenmukaisia nolla
erolla, joten niille ei ole päällekkäiskuvaa näytettäväksi; (3) alla oleva
`NaN`/`ratio=compress`-solmu-x-kertomus on korvattu — nykyinen mittaus näyttää kaikkien 76 solmupisteen
täsmäävän täsmälleen, joten sen kuvaama leveysvirhe → solmusiirtymä -ketju ei
enää päde `NaN`:lle.

**`NaN` asetuksella `ratio=compress` (historiallinen).**
`NaN.gv`-perhe (`orientation=landscape; ratio=compress; size="16,10"`) oli
A2-tapaus, jonka arvio tuolloin päätyi arvoon *diverged* eikä
*structural-match*. Compress-x-verkkosimpleksipolku oli uskollinen — jokainen
rajoitesyöte vastasi C:tä (leveysrajoitearvo, `containNodes`-minlenit,
apukaarimäärät 471/wt 1612, `lrBalance` ja rankjärjestykset identtisiä)
*lukuun ottamatta* 9 solmun puolileveyksiä, jotka mittaaja raportoi
0.5–1.03 pt leveämmiksi kuin C. `ratio=compress`in painon 1000 pakkaus teki
normaalisti löysistä vasemmalta oikealle -erotusrajoitteista **sitovia**, joten
tuo alipikselin leveysvirhe — näkymätön ilman compressia — nousi esiin −3..−5 pt:n
sisäisenä x-siirtymänä. Tuo siirtymä työnsi `Target<->TThread`-suoran splinin 0.55 pt
solmulaatikon seinän yli, joten reititin taivutti sen ylimääräiseksi bezier-palaksi (7
pistettä vs. C:n 4) — *rakenteellinen* ero, siksi *diverged*. 9 leveyden pakottaminen
C:n arvoihin toisti C:n täsmälleen (solmu-x 53/76→0/76 pielessä; splini 7→4 pistettä),
mikä vahvisti, että jäännös oli 100-prosenttisesti ylävirran fonttimetriikkaa, ei compress- tai
splinekoodia, **tuon entisen poikkeaman osalta**. Täysi näyttö (visuaalisella
golden-vs-meidän-rinnakkaiskuvalla + 4-vs-7-pisteen splinieron päällekkäiskuvalla):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (proosakirjoitus:
`…/nan-compress-xcoord.md`).

**Fonttimetriikan mittausesimerkki (historiallinen — FreeType vs. estimate).**
Natiivi Graphviz mittaa tekstin, kun sitä ajetaan todellisella tekstiasetteluliitännäisellä (ei
pariteettikartoituksen käyttämällä headless-oraakkelilla), FreeType-/libgd-glyfien
etenemillä. Porttauksen `EstimateTextMeasurer` ei jäljennä glyfirasteroijaa.
Useimmilla merkkijonoilla nämä täsmäävät täsmälleen; joillakin ne eroavat
murto-osan pistettä. Mitattu esimerkki — Times-Roman 14 pt, merkkijono
`"/home/ek/work/src/lefty/lefty.c"` (31 merkkiä):

| | leveys |
|---|---|
| natiivi C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| ero | **+0.75 pt (+0.43%)** |

Saman solmun toinen nimiörivi, `"93736-32246"`, mitattiin **identtisesti**
(96.00 pt molemmilla) — virhe riippuu merkkijonosta ja kertyy glyfeittäin,
ei ole tasainen skaalauskerroin. Tämä FreeType-vs-estimate-ero on todellinen, mutta
**ei** sitä, mitä pariteettikartoitus mittaa (molemmat puolet ajavat `estimate`a); sillä olisi
merkitystä vain, jos @knowvah/dot-enginen tulostetta verrattaisiin todellisella fontilla
tehtyyn C-renderöintiin tämän kartoituksen ulkopuolella.

**Alavirran vaikutus entiseen `proc3d`-poikkeamaan (historiallinen).** Nimiön
leveys vaikuttaa solmun kokoon, joka vaikuttaa asetteluun:

1. Leveämpi nimiö → hieman leveämpi solmulaatikko (*ellipsisolmulla* leveys
   skaalataan lisäksi √2:lla, joten +0.75 pt tekstiä → +0.53 pt puolileveyttä).
2. Solmujen puolileveydet määräävät x-koordinaattiverkkosimpleksin vasemmalta oikealle
   -erotusrajoitteet; nuo rajoitteet `ROUND()`-pyöristetään kokonaisluvuiksi, joten
   alipikselin leveysmuutos voi kääntää rajoitteen arvosta *N* arvoon
   *N+1*.
3. Verkkosimpleksi valitsee sitten erilaisen — mutta yhtä optimaalisen —
   kokonaislukuisen x-sijoittelun, siirtäen joidenkin solmujen x-sijainteja 1–2 yksikköä.

Ei-korpus-`proc3d.gv`:llä (`graphs/directed/proc3d.gv`, ~2620 pt, ei
pariteettikartoituksen jäsen) tämä tuotti **≤ 3.55 pt**:n eron x-ulottuvuudessa
(**0.13%**), päällekkäin alla — **vihreä = natiivi C `dot` (golden), punainen =
@knowvah/dot-engine (meidän)**:

![proc3d golden-vs-meidän-päällekkäiskuva: vihreä = C, punainen = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Zoomattuna reunus oli lähes kokonaan pitkissä tiedostopolkuovaalinimiöissä:

![proc3d-päällekkäiskuva zoomattuna leveisiin polkunimiöovaaleihin: vihreä = C, punainen = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natiivi `dot` | Meidän — @knowvah/dot-engine |
|---|---|
| ![proc3d C Graphvizin renderöimänä](/img/proc3d-golden.svg) | ![proc3d @knowvah/dot-enginen renderöimänä](/img/proc3d-ours.svg) |

Erillinen kirjoitus (juurisyy, metriikkakohtaiset luvut, toistokomento)
on omalla sivullaan:
[**proc3d — kanoninen A2-fonttimetriikkapoikkeama (historiallinen)**](/fi/divergences-proc3d-a2).
Tuo sivu kuvaa ratkaistun poikkeaman ei-korpus-syötteellä; nykyiset
korpuksen `proc3d`-variantit ovat yhdenmukaisia.

**Miksi tämä hyväksyttiin tuolloin.** FreeTypen glyfikohtaisten
etenemien täsmäyttäminen tavu tavulta jokaisella fontilla ja merkkijonolla olisi vaatinut sen
metriikkataulukoiden, hinttauksen ja pyöristyksen jäljentämistä — laajaa, hauraata ja silti ei
taatusti täsmällistä. Tekstinmittaaja on jaettu primitiivi: jokainen korpuksen
nimiö kulkee sen läpi, joten yhteen merkkijonoon tähdätty korjaus riskeerasi regressiot
muille havaintokynnyksen alapuolisen hyödyn vuoksi.
:::

### A3. `hypot`-tasapelin ratkaisu splinereitityksessä (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Koskee:** `dot`-graafeja, joilla on **geometrisesti symmetrinen** kaarireititysväylä
— tyypillisesti lyhyt, symmetrinen litteän kaaren kaari. Havaittu esimerkki: `2368`,
joka pysyy tilassa *structural-match* (maxΔ ≈ 10.2 pt **yhdellä** kaarella, `376->76`).
Sama tasapelin ratkaisu ilmenee myös **pitkällä** (usean rankin) kaarella suureen
sisääntuloasteen keskittimeen, kun käytävä on täsmälleen peilisymmetrinen: `graphs-b100` /
`graphs-b104` (identtinen lähde) poikkeavat maxΔ 20 (täsmälleen yksi rankrivi)
`Node23730->Node23729`:n yksittäisessä solmukohdassa — jokainen solmusijainti ja kaikki
ylävirran laatikko-/polygoni-/taut-path-rakenne on tavu tavulta identtinen C:n kanssa; vain `findMaxDev`in
~1 ULP:n valinta siitä, mikä peilisymmetrinen sisäpiste
tulee bezierin solmuksi, eroaa. Lyhyt litteän kaaren muoto ilmenee myös tunnisteena `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — oraakkeliin kiinnitetyn `241_0`:n poikkeava sisar, jonka C:n
kohina sen sijaan ratkaisee ensimmäisen hyväksi. Sama tasapelin ratkaisu tuottaa nimetyn
2-syklin takakaaren rakokäytävän jaon tunnisteessa `2413_1` (structural-match, maxΔ 67.65) ja
`2413_2` (maxΔ ≤99.55, kun T11 swapBezier-reverse-korjaus laskeutuu — siihen asti
tiedoston raportoitu maxΔ 1922.26 määräytyy aivan toisen, erikseen
seuratun vian mukaan), sekä yhden klusterinsisäisen nimetyn kaaren tunnisteessa `graphs-decorate`
(maxΔ 43.54); kummassakin tapauksessa kaksi ehdokasjakokulmaa ovat tasan
5.7e-13 (2413-perhe) / 3e-14 (decorate) sisällä toisistaan ennen kuin
sijaintiriippuvainen Apple-`hypot`-kohina valitsee voittajan. `2371`
(structural-match, maxΔ 16.8) näyttää saman sormenjäljen kahdella toisiinsa liittymättömällä
kaarella (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`):
porttaus emittoi oraakkelin täsmällisen ohjauspistejonon peilikuvan kummallakin,
solmun y käännettynä identtisellä Δ16.8:lla (ylä-/alajakoosuudet vaihtuneet).
Sen alkuperä luokitellaan **KOHTALAISEKSI** luottamukseksi eikä muiden jäsenten
VAHVISTETUKSI luottamukseksi: `2371` pakkaa ~199 komponenttia, mikä irrottaa
pathplan-paikalliset koordinaatit sivukoordinaateista, joten tasapeliä ei
voitu korreloida suorana `route.ts:209`:ään kolmella instrumentointiyrityksellä;
suoran tilan segmentointi tai leikkauksen jälkeinen `recover_slack`-alkuperä ei ole
täysin poissuljettu. Täysi diagnoosi:
`plans/residual-cleanup/analysis/2371-mirror.md`. Useimmat reititetyt kaaret
eivät ole vaikutuksen alaisia.

::: details Graafin määritelmä (`2368.dot`)
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

**Luonnehdinta.** Splinesovitin (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) jakaa sovitetun bezierin reitin sisäpisteessä, jossa
poikkeama on suurin. Kun väylä on symmetrinen, kaksi ehdokasjakopistettä
ovat **täsmällinen matemaattinen tasapeli**, ja voittaja ratkeaa ~1e-14:n
liukulukukatoamiskohinasta absoluuttikoordinaattisessa bezier-evaluoinnissa,
jonka **etumerkki riippuu absoluuttisesta sijainnista**.

C:n poikkeamaetäisyys on libm-`hypot`, ja oraakkelin generoinut macOS:n Apple-`hypot`
on suljettu toteutus, joka ei bittitäsmää **yhtään** siirrettävää `hypot`ia
(mitattu sitä vastaan graphvizin koordinaattialueella, bittitäsmäysasteet:
V8 `Math.hypot` ≈ 63 %, oikein pyöristävä / Arm-tyylinen `hypot`
≈ 84 %, fdlibm `hypot` ≈ 90 %, `sqrt(dx²+dy²)` ≈ 94 %). Tuon ULP-kohinan vuoksi
**C itsekään ei ole johdonmukainen**: se jakaa kaksi *siirtoyhteneväistä* kaarta
**vastakkaisiin** kulmiin. Tunnisteessa `2368` kaari `376->76` on
geometrisesti identtisen kaaren `256->436` peilikuva:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Koko ero päällekkäin (12× zoomaus kaarella `376->76` / `to1`) — **vihreä = C
Graphviz, punainen = @knowvah/dot-engine**. Molemmat ovat sama matala alaspäin kaareva
kaari samojen solmureunojen välillä; ne eroavat ~1–2 pt vatsakohdassa (bezierin keskimmäinen
ohjauspiste), jossa C:n tasapeli ratkesi vastakkaiseen kulmaan:

![2368 376->76 -kaari: vihreä = C, punainen = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Kaikki muu täsmää toleranssin sisällä — sama rajaava laatikko (608×148), solmusijainnit,
nimiöt, nuolenkärjet ja kaikki muut kaaret. Täydet renderöinnit ovat visuaalisesti
erottamattomat:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 C Graphvizin renderöimänä](/img/2368-c.png) | ![2368 @knowvah/dot-enginen renderöimänä](/img/2368-port.png) |

Porttaus käyttää **siirtoekvivarianttia** tasapelin ratkaisua (todellinen tasapeli ratkeaa aina
ensimmäiseen indeksiin), joten se piirtää *jokaisen* tällaisen kaaren samalla tavalla sijainnista
riippumatta — se on itsensä kanssa johdonmukainen ja täsmää C:hen kaarilla, joilla C:n kohinakin
valitsee ensimmäisen (esim. `256->436` ja `241_0 5:ne->8:nw`), poiketen vain siellä, missä C:n
kohina kääntyy toisin päin (`376->76`). Päätepisteet, nuolenkärjen kohde, muut
kaaret, kaikki solmut, nimiöt ja rajaava laatikko täsmäävät toleranssin sisällä; vain
yhden kaaren sisäiset ohjauspisteet liikkuvat (~1–2 pt vatsakohdassa).

**Miksi hyväksytty.** Applen `hypot` ei ole sen toistettavampi JS-moottorien ja
suorittimien välillä kuin **A1**:n FMA/`pow` — kyseessä on sama siirrettävyysrajoite, vain
`dot`in splinereitittimessä. C:n *sijaintiriippuvaisen* valinnan täsmäyttäminen tarkoittaisi
C:n tiukan tasapelinratkaisun omaksumista, joka asuu **jaetussa primitiivissä**, jonka läpi jokainen reititetty
kaari kulkee: se vaihtaisi `376->76`:n täsmäyksen *uusiin* epätäsmäyksiin
kaarilla, joilla C päätyy toisin päin (se regressoi `241_0`:n ja `cnt=3`
-litteänkaaren oraakkelitapauksen), nollasummapeliin, joka lisäksi uhraa porttauksen
siirtoekvarianssin. Siksi pidämme johdonmukaisen (ekvivariantin) reitittimen. Tämä on
rajattu, havaintokynnyksen alapuolinen `dot`-ero — ei avoin vika. Täysi tutkimus:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oraakkeli tunnustetusti rikkinäisessä tilassa (init_rank / pathplan -perhe) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Koskee:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Perheen
jäsenet `1939` ja `2825` ovat **yhdenmukaisia** eikä niillä ole merkintää, ja `2470`
sekä `graphs-structs` liittyivät niihin 2026-07-11 (molemmat muuttuivat yhdenmukaisiksi
ortho-vierekkäisyysvuodon/chancmpidin, fmadd-`polylineMidpoint`in ja
puolipariton tasapelipyöristyksen korjausten laskeuduttua — porttaus toistaa nyt
oraakkelin palautustulosteen täsmälleen, mukaan lukien identtiset kadonneet kaaret);
niiden hyväksyntämerkinnät on poistettu.

`1581` ja `2825` olivat kaatumisen palautumistapauksia (fix-element-count-bucket
mission): fuzzer-/rappeutuneita syötteitä, joissa upstreamin testit varmistavat **vain**,
ettei dot kaadu (`test_1581`: ei ASan-rikkomusta; `test_2825`: ei
kaatumista, kun `rebuild_vlists` palauttaa -1). C osuu sisäiseen `Error:`iin
(`install_in_rank` / `rebuild_vlists: lead is null`) ja sen palautuminen
hylkää asettelusisällön; porttaus päätyy **identtisiin rankset-poistopäätöksiin**
(varoituspariteetti varmennettu: samat solmu-/graafinimet
`mark_clusters`in ”already in a rankset” -varoituksissa, cluster.c:317-320).

`2825` on nyt täysin suljettu. fix-2825-rebuild-vlists-mission (1581:n jälkeen)
sulki aukon ensin yhden kerroksen verran: porttaus saavuttaa C:n *täsmällisen* sisäisen
virhetilan — tavu tavulta identtinen stderr viestijärjestyksineen
(`Error: rebuild_vlists: lead is null for rank 1` ja sitten etuliitteetön
`agerr(AGPREV, ...)`-jatko `concentrate=true may not work
correctly.`) — kun `dotLayoutPipeline` välittää oikein
`dot_position`in epäonnistumisen ohittaakseen `dot_splines`/`dotneato_postprocess`in,
vastaten C:n `dotLayout`ia (`if (r != 0) return r;` `dot_position`in jälkeen,
dotinit.c:322-325). Jatkotyö (osa 2) sulki sitten jäljellä olevan
renderöintikerroksen aukon: C:n `emit_node` portittaa jokaisen solmun ehdolla `node_in_box(n,
job->clip)` (emit.c:1806-1809), ja tällä keskeytyspolulla `job->clip` on
rappeutunut, koska `GD_bb`tä ei koskaan asetettu `set_aspect`illa (ohitetun
`dot_position`in lopun sisällä) — joten C emittoi *nolla* solmua, vain (myös
rappeutuneet) klusterikehykset. Porttaus porttasi saman `node_in_box`-portin
(`src/gvc/device.ts:renderNode`, käyttäen `job.bb`/`job.pad`ia
`job->clip`in yhden sivun vastineena) ja lopetti uskottavan bboxin
uudelleenlaskennan elävistä solmusijainneista, kun `g.info.bb` on asettamatta
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` sellaisenaan, vastaten
`init_gvc`in `gvc->bb = GD_bb(g)`:tä, emit.c:3272) — jokainen asettelumoottori
asettaa `g.info.bb`n itse ennen kuin `render()` ajetaan kaikilla
ei-keskeytyspoluilla, joten tämä on tavu tavulta identtinen terveillä graafeilla ja muuttaa
tulostetta vain tällä keskeytyspolulla. `2825` on nyt `conformant` (4 elementin tuloste,
tavu tavulta identtinen oraakkelin kanssa). Katso
`.agent-notes/2825-rebuild-vlists-abort.md` molempien osien täydellistä
mekanismijäljitystä varten. `1581` ei koskaan edes saavuta epäjohdonmukaista tilaa (*toinen*
upstreamin klusteri-ikkunavika, ei `rebuild_vlists`), joten se asettelee
eloonjääneen graafinsa kokonaan — tuo aukko on yhä auki. Oraakkelin tuloste
tunnisteella `1581` on palautumisjätettä, jolla ei ole upstreamin määrittelemää semantiikkaa. Näyttö:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Jokaisella
näistä syötteistä **C-oraakkeli** on rikki graphvizin oman tilityksen mukaan: `2471`, `1939` ja `1435` ovat
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstreamissa (issuet
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), vrt.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); ainoa
korjausyritys, [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
on yhä yhdistämätön luonnos (viimeksi muokattu 2026-03-20). `graphs-structs` on
muinainen record-reitityksen häviöluokka (#102/#242/#274/#1323), jonka vakaa
graphviz 15.0.0 renderöi oikein — dev-build-oraakkelin regressio.

**Mitä C tekee.** `init_rank`-jäsenillä (`2796`, `2471`, `1939`)
natiivin dotin x-koordinaattiapugraafi sulkee suunnatun syklin klusterin
seinärajoitekaarten kautta; sen
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
ei pysty skannaamaan jokaista solmua, tulostaa `Error: trouble in init_rank`, ja
asettelu jatkuu tuosta palautumistilasta — tunnisteilla `2471`/`2796` päätyen
`Pshortestpath`-kolmiointijätteeseen ja kadonneisiin kaariin. Tunnisteilla `1435` ja
`graphs-structs` rikkinäinen vaihe on itse pathplan (korvaleikkauskolmioinnin
umpikujat; kadonnut record-porttikaari).

**Syötteet varmennettu, sitten tehty uskollisiksi (tämä on kantava osa).**
`verify-oracle-bug-family`-mission
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
tallensi rajoitegraafin, jonka kumpikin puoli syöttää verkkosimpleksille, rivi riviltä
jokaiselle perheen jäsenelle — ja havaitsi, että porttauksen aiempi ”siisti” käyttäytyminen
tällä perheellä johtui **neljästä aidosta porttausviasta**, jotka kaikki korjattiin:

1. `flatEdges` ohitti C:n
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   -kutsun, jolloin klusterin rankikkunat jäivät vanhentuneiksi flat-label-vnoden
   lisäyksen jälkeen (tämä yksin sai porttauksen menettämään **9** kaarta tunnisteella `2471`, kun C
   menettää 6).
2. Saman-`group`-kaarirangaistus laukesi silmukkakaarilla eikä saman
   ei-tyhjän ryhmän päätepisteillä
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` käytti C:n `_WIN32`-arvoa 100; oraakkelialusta käyttää arvoa 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Kolmioinnin umpikuja keskeytti `Pshortestpath`in C:n varoita-ja-jatka +
   suoraviivaisen varareitin sijaan
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Korjausten jälkeen perheen NS-rajoitetallenteet ovat **rivi riviltä identtiset** C:n kanssa
(253 rank2-kutsua tunnisteella `2471`; kaikki kutsut tunnisteilla `1939`/`1435`/`graphs-structs`),
ja porttaus seuraa C:tä tunnustetusti rikkinäisen palautumisen läpi: samat
kadonneet kaaret (`3->16` tunnisteella 2796; identtiset 6 tunnisteella 2471), samat elementtipuut.
`1939` muuttui täysin yhdenmukaiseksi. Jäljelle jääneet numeeriset erot (ja tunnisteen 1435
poikkeava pathplan-jäte) ovat käyttäytymistä palautumistilan *sisällä*, jota
projektin politiikka tietoisesti ei jahtaa.

**`2723` (segfault; kiinnitetty, ei jahdattu).** Natiivi `dot` kaatuu segfaultiin (poistumiskoodi 139)
tiedostolla `tests/2723.dot` (suuntaamaton, `rank=same`-ryhmät, nimetyt kaaret), joten C:llä
ei ole tulostetta, johon täsmätä. Upstreamin
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) on auki ja
`tests/test_regression.py:test_2723` on `xfail`. Porttaus heittää
`InternalError`in (`INTERNAL_ERROR`, `TypeError`-syyllä
kohdasta `src/layout/dot/flat.ts:flatLabelYpos`, jossa `rank[r-1]` on määrittelemätön). Ilman
oikeaa oraakkelia rehellinen epäonnistuminen pysyy eikä porttausta muuteta;
`src/layout/dot/flat-2723.test.ts` kiinnittää sen. Päivitä tuo testi, jos upstream korjaa
issuen.

**Politiikkahuomautus.** Aiempi A4-kanta (”porttaus täyttää issuen
odotukset; älä toista”) perustui uskomukseen, että porttauksen
syklitön apugraafi tuli hyvänlaatuisesta paikallisesta variantista. Se ei tullut — se tuli
viasta (1), joka todistettavasti hukkasi `2471`:n. Uskollisuus C-lähdekoodille
voitti: porttaus toistaa nyt C:n tunnustetusti rikkinäiset lopputulokset
varmennetusti identtisistä syötteistä, ja jokainen tämän osion merkintä tulee
**mitata uudelleen, kun upstream korjaa vastaavan issuen** (oraakkelin tuloste
muuttuu; odota näiden tunnisteiden syttyvän regressioina tuossa päivityksessä — se
on tarkoituksellista, ei rapistumista).

**Näyttö.** Tunnistekohtaiset vertailusivut (rinnakkaisrenderöinnit + näyttötietueet):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(korjausta edeltävä perustaso säilytetty tiedostossa
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnoosiartefaktit: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Virheelliset syötetavut (koodauksen esitys) {#a5-invalid-input-bytes-encoding-representation}

**Koskee:** `1367` (diverged, maxΔ 0 — täsmälleen yksi rakenne-ero).

**Mikä eroaa.** Syötetiedosto sisältää alastoman UTF-8-jälkitavun (`0x80`)
solmun nimen sisällä. C käsittelee alastomat jälkitavut 0x80–0xBF ”kelvollisina
itseään edustavina merkkeinä” (`lib/common/utils.c:1200-1207`, ei
varoitusta), ja solmunimen `<title>`-teksti ohittaa merkistömuunnoksen kokonaan
(`agnameof`-tavut virtaavat suoraan `gvputs_xml`ään). Oraakkelin SVG sisältää siksi
raakatavun eikä ole **kelvollista UTF-8:aa** ilmoitetusta koodauksestaan huolimatta.
Porttaus dekoodaa virheellisen UTF-8-syötteen latin1-varareitillä
(`0x80 → U+0080`) ja emittoi hyvinmuodostettua UTF-8:aa (`\xc2\x80`).

**Miksi hyväksytty.** Porttauksen I/O-raja on JS-merkkijonot (selainkirjasto).
Raaka virheellinen tavu ei voi kulkea `renderSvg`in merkkijonopaluuarvon läpi
muuttumattomana; C:hen tavutäsmäys tarkoittaisi tulostekoodauksen turmelemista
jokaiselle käyttäjälle. Latin1-varareitti vastaa C:n omaa ”käsitellään Latin-1:nä” -palautumis-
semantiikkaa (`utils.c:1249`). Tämä on koodin alapuolinen rajoite —
esityskerros — ei siirrettävä käyttäytyminen, jonka porttaamisesta olisimme kieltäytyneet.
Kaikki muu tunnisteessa 1367 on yhdenmukaista: elementtimäärät (23 polyline /
103 text / 44 polygon / 24 path) ja kaikki koordinaatit täsmäävät decorate (T6)
-korjauksen jälkeen.

**Näyttö.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
-vertailusivu (rinnakkaisrenderöinti + näyttötietue).

---

### A6. `unsigned int` -piirtoalueen ylivuoto rappeutuneella syötteellä {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Koskee:** `1314` — fuzzerilla johdettu syöte (`fontsize="991836031967s8"`),
jonka järjetön fonttikoko paisuttaa piirroksen noin 2.75e11 pt:n kokoiseksi.

**Mitä tapahtuu.** C tallentaa `job->width` / `job->height` **`unsigned int`**-tyyppisinä
(`gvcjob.h:327-328`). Valtavan pistekoon `ROUND(...)` (`emit.c:1249-1250`)
ylivuotaa 32 bittiä ja kiertyy modulo 2³², ja SVG-taustajärjestelmä emittoi sen
**etumerkillisen** `%d`:n kautta (`gvrender_core_svg.c:258-259`) — joten C tulostaa
`height="-425618343"`. Porttaus säilyttää matemaattisesti johdonmukaisen (kiertymättömän)
arvon. Jokainen muu arvo — solmuellipsin `cx/cy/rx/ry`, juuren `translate`, 
polygoni, tekstin `font-size` — on tavu tavulta identtinen; vain ylimmän tason `<svg>`:n
width/height eroavat.

**Miksi emme jahtaa sitä.** C:n 32-bittisen kokonaislukuylivuodon toistaminen ei ole
asettelukäyttäytymistä, jota kannattaisi porttata, ja syöte on rappeutunut. Palaa asiaan, jos upstream
korjaa ylivuodon (esim. levittää kentän tai rajaa koon).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Rappeutunut NaN-asettelu (`sfdp`, patologinen `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Koskee:** `2556` — `repulsiveforce=100` (⇒ hylkivä voima käyttää
`pow(dist, 101)`), mikä ajaa jousi-sähköratkaisijan **NaN:iin molemmissa
moottoreissa**. Natiivi oraakkeli itse emittoi kaikki solmu-/kaarisijainnit arvona `nan` ja
rappeutuneen rajaavan laatikon.

**Mitä tapahtuu.** Kun jokainen koordinaatti on NaN, kaksi toteutusta serialisoi
roskan eri tavoin: (1) graafin bb / taustapolygoni — C pyöristää `NaN`in
`int`iksi, mikä arm64:llä tuottaa `INT_MIN`-luokan roskaa (`bb="0,0,-4.295e+09,
-4.295e+09"`); porttaus säilyttää arvon `0`. (2) Kaaren piirto-operaatiot — natiivin
emit-vaihe vaimentaa NaN-splinin `_draw_`/`_hdraw_`in (emittoiden vain `pos`in),
kun taas porttaus emittoi ne NaN-ohjauspisteillä. Solmupiirrot täsmäävät (molemmat
vaimentavat ne). Kummallakaan puolella ei ole todellista asettelua.

**Miksi emme jahtaa sitä.** Porttaus toistaa jo *saman* NaN-räjähdyksen kuin
natiivi — siihen johtanut korjaus on aito (katso alla); jäljellä on vain se,
miten kumpikin serialisoi NaN-roskaa. C:n `(int)NaN`-määrittelemättömän käyttäytymisen
ja sen NaN-splinin piirtovaimennuksen toistaminen ei ole mielekästä asetteluuskollisuutta syötteellä,
jonka asettelu on rappeutunut molemmissa moottoreissa. Palaa asiaan, jos upstream rajaa
`repulsiveforce`n tai siivoaa NaN-sijainnit.

**Porttauksen korjaukset, jotka tekivät tämän saavutettavaksi (ei pois jahdattu — aitoja vikoja).** Ennen
näitä porttaus ei päässyt edes rappeutuneeseen tilaan: (1) `armPow`
(`src/common/arm-pow.ts`) heitti poikkeuksen jokaisesta ei-pikapolun argumentista; se porttaa nyt
ARM `pow.c`:n koko erikoistapaushaaran, joten `pow(NaN, y) = NaN` kuten libm:ssä. (2)
`bezierClip` (`src/common/splines-geom.ts`) pyöri ikuisesti NaN-ohjauspisteillä,
koska sen suppenemistesti oli C:n `while (ABS > .5)`:n naiivi negaatio
(ekvivalentti äärellisille arvoille, ei NaN:lle); se peilaa nyt C:tä täsmälleen ja
päättyy NaN:illa. Molemmat ovat C-uskollisia ja koskevat vain NaN-syötteitä.

---

### A7. `round()`-laatikkoseinän pyöristysraja (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Koskee:** `graphs-honda-tokoro` ja (lisätty 2026-07-28, uusi 905 kohteen
joukossa) sen `graphs/directed/`-sisar `tree-graphs-directed-honda-tokoro`
(molemmat structural-match, maxΔ ≈ 1 pt yksittäisellä kaarella `n012->n011`).
Sisar eroaa vain `samearrowhead`-attribuuteilla, jotka eivät vaikuta tämän parin
reititykseen — sen `n012->n011`-geometria on tavu tavulta identtinen hyväksytyn tunnisteen kanssa
sekä porttauksen että oraakkelin puolella, joten alla oleva mekanismi pätee sellaisenaan.

**Mikä eroaa.** `maximal_bbox`in pääkäytävälaatikon seinä päätyy sisäiseen
x=90:een C:ssä vs. x=89:ään porttauksessa kahden
`n012->n011`-rinnakkaiskaaren jaetulle `samehead`-portille. Jaetun portin rakenne (`buildSharedPort`) ja
rinnakkaisryhmittely ovat molemmat tavutarkasti yhdenmukaisia C:n kanssa; 1 px:n ero on puhtaasti
`round()`-pyöristysrajan artefakti — ~1e-14 ylävirran liukulukukohinaa
kääntää täsmälleen `.5`-rajalla olevan arvon naapurikokonaisluvuksi. Porttauksen
`maximal_bbox`-kaava jäljittelee jo täsmälleen C:n kaavaa.

**Miksi emme jahtaa sitä.** `round()` on primitiivi, jonka läpi jokainen korpuksen reititetty kaari kulkee;
sen rajakäyttäytymisen nykäisy tämän yhden tapauksen täsmäämiseksi on koko korpuksen regressioriski
1 px:n vuoksi kahdella kaarella — sama jaetun primitiivin rajoite kuin
kohdassa `bbox-class-control-hull-vs-curve` mainittu ohjausverhon pyöristys. Täysi diagnoosi:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-pyöristys vs. tiukka IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Luokka.** clang arm64 kääntää oraakkelibinäärin asetuksella `-ffp-contract=on`,
yhdistäen valitut kerto-yhteenlaskujonot yksittäisiksi FMA-käskyiksi;
porttaus ajetaan V8:lla, joka suorittaa tiukan IEEE-754-pyöristyksen eikä voi emittoida
`fma`a. Bitti bitiltä identtisillä syötteillä nämä ovat 1–2 ULP eri mieltä
siinä lausekkeessa, jonka kääntäjä päätti yhdistää. Porttauksen puoli on aina
tiukka IEEE-754-tulos; oraakkelin puoli on aina FMA-yhdistetty
tulos. Tämä on C-lähdekoodin semantiikan alapuolinen kääntäjän/ajoympäristön siirrettävyysrajoite,
ei looginen vika porttauksessa — palautumaton ilman
clangin erityisten yhdistämisvalintojen emulointia ohjelmistona. Kaksi tapausta
tunnetaan, kahdessa eri kohdassa, kahdella eri vahvistusmekanismilla:

- **2646** — ULP syntyy `Proutespline`n `points2coeff`/`solve3`
  -kuutioratkaisussa ja kääntää suoraan splinesovittimen juurimäärän.
- **2620** — ULP syntyy `poly_init`in polygonin kärkiulottuvuussilmukassa
  (solmun mitoitus), ja `ortho`n uskollinen relax-kohtainen
  int-typistys vahvistaa sen alavirrassa yhtä kalliiksi labyrinttikäytävän tasapelin käännöksi.

**Koskee:** `2646` (structural-match, maxΔ 42.09 kolmella 21 216 kaaresta:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — kaikki
record-port `:c->:nb_part` smode-pitkän kaaren reittejä). **A3**:n sisar: molemmat
luokat ovat palautumattomia liukulukusiirrettävyystasapelejä `Proutespline`n
sisällä, mutta mekanismi on eri — kääntäjän `fp-contract`-artefakti, ei libm `hypot`.

**Mikä eroaa.** Kaikilla kolmella kaarella vain viimeinen `routesplines`-kutsu
(suora osuus pääportille) poikkeaa. Sen päätepiste on bittitarkasti
estepolygonin alaseinällä ja sen tangentti on yhdensuuntainen seinän kanssa
(`evs[1]=(1,-1.22e-16)`), joten jokainen `splinefits`-ehdokas on tangentti
esteelle kohdassa `t=1` — leikkauskuution lähes kaksoisjuuri.
`points2coeff` laskee tuon kuution katastrofaalisen kumoutumisen kautta (termit
noin ~7446 romahtavat arvoon ~0.099). Oraakkeli (clang/arm64,
`-ffp-contract=on`) yhdistää `v3 + 3*v1 - (v0 + 3*v2)`:n yhdistetyiksi
kerto-yhteenlaskuiksi, kun taas V8 suorittaa tiukan IEEE-pyöristyksen — nämä ovat
~9.1e-13:n verran eri mieltä **bitti bitiltä identtisillä syötteillä**, ja tuo kohina kääntää
`solve3`:n diskriminantin etumerkin: C löytää 1 juuren (866.7, segmentin sisällä); porttaus
löytää 3 juurta ja epäaidon kumppanijuuren kohdassa `t=0.9999975 < 1-EPSILON2`. Epäaito
juuri laukaisee yhden ylimääräisen `a`-puolituskierroksen, joka kääntää
viimeisen palan tangenttisuuruuden kertoimella 2 (kumpaankin suuntaan
kolmella kaarella), tuottaen maxΔ 42.09 leikkauksen jälkeen (26 SVG-eroa).

**Miksi hyväksytty (palautumattomuus todistettu kontrolloidulla kokeella).** Kaikki kuusi
`routesplines`-kutsua tallennettiin molemmilla puolilla — laatikko, polygoni, `PL`, alku,
loppu ja `evs` ovat tavu tavulta identtiset, samoin aiemman (ei-viimeisen) kutsun
tulosspliini; ainoa ero on viimeisen kutsun `solve3`:n sisällä. Erillinen
puhdas-C-työkalu eristi yksittäisen muuttujan: käännös asetuksella
`-ffp-contract=off` toistaa **porttauksen** bittitarkasti kaikilla 3 kaarella; oletus
(`on`) -yhdistäminen toistaa **oraakkelin** bittitarkasti kaikilla 3
kaarella. Porttaus on siis jo samaa mieltä tiukan IEEE-754-C:n kanssa; ero
johtuu kokonaan oraakkelikääntäjän FMA-yhdistämisvalinnasta, C-lähdekoodin
semantiikan alapuolella — lähdetasolla ei ole korjattavaa epäuskollisuutta.
Kohdennettua korjausta (yhdistämisen käsin emulointi `points2coeff`issa) kokeiltiin ja
se kumottiin: se korjaa 2 kolmesta kaaresta mutta ei kolmatta, jonka kääntyminen
on peräisin `solve3`:n omasta sisäisestä yhdistämisestä. Täydellinen korjaus
vaatisi ohjelmisto-FMA-emulointia koko splinesovittimessa — kuuma silmukkahinta
ja koko korpuksen pyöristysvaikutusala alipikselin, 3 kaaren hyödyn vuoksi.
Täysi diagnoosi: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Koskee (historiallinen):** `2620` (oli structural-match, maxΔ 585; 423 eroa
24 kaaripolulla + 22 nuolenkärjessä). **Muuttui yhdenmukaiseksi 2026-07-11**:
uskollinen `sgraph`in vierekkäisyyspuskurin vuoto + `chancmpid`in kaksisuuntaisen
sisältymisen porttaus (katso `.agent-notes/ortho-maze-circo-rca.md`) poisti
eron; hyväksyntämerkintä on poistettu ja tämä osio säilytetään
A8-luokan dokumentaationa.

**Mikä eroaa.** `ortho`-putki (`splines=ortho`) on tavutarkasti yhdenmukainen
C:n kanssa identtisillä syötteillä — todistettu injektoimalla C:n täsmällinen labyrinttisyöte
(koordinaatit, `xsize`/`ysize`) porttauksen ortho-vaiheeseen: 378/378 reititettyä
segmenttiä tulee ulos tavu tavulta identtisinä, joten `src/ortho`ssa ei ole vikaa.
Todellinen ero on 1–2 ULP labyrinttisyötteessä: solmun `ysize` (ja
ranksisäisen kertymän kautta `ND_coord.y`) laskettuna C:n `poly_init`in
polygonin kärkiulottuvuussilmukassa (`shapes.c`), joka asetuksella
`-ffp-contract=on` yhdistää `R.x += sidelength*cosx`:n FMA:ksi, joka on ~1
ULP suurempi kuin porttauksen tiukka IEEE-aritmetiikka (molemmat puolet toteuttavat
aritmeettisesti identtisen lausekkeen). `2620`:ssä on 173 murtoleveyksistä
polygonisolmua; kaikissa C ≥ porttaus 1–2 ULP:lla. Tuo ULP vahvistuu — ei
synny — `ortho`n Dijkstra-relaxissa, joka uskollisesti typistää
juoksevan etäisyytensä askeleittain (`sgraph.c:165`, porttauksessa peilattu
`Math.trunc`ina) painoilla, jotka on johdettu raakasolujen ulottuvuuksista
(`maze.c:257`). ULP-siirtynyt geometria kääntää yhtä kalliin käytävätasapelin
4 reititetylle kaarelle (polut + niiden nuolenkärjet); jäljelle jäävät erot
ovat näistä 4 käännöksestä seuraavaa ±1-raidan uudelleennumerointia.

**Miksi hyväksytty (palautumattomuus todistettu kontrolloidulla kokeella).** Erillinen
C-työkalu, joka vaihtoi vain `-ffp-contract`ia, toisti molemmat puolet
poikkeavalla kuusikulmion kärjellä: `-ffp-contract=on` → `310.29250168188713`
(täsmää oraakkeliin), `-ffp-contract=off` → `310.29250168188707` (täsmää
porttaukseen), poikkeava operaatio eristettynä kärkeen `i=3`
(`R.x=-0.50000000000000011` yhdistettynä vs. `-0.5` yhdistämättä). Toinen
syötteeninjektiokoe (ainoa muuttuja: ortho-syötearvot) vahvisti
vahvistimen: porttauksen omalle `orthoEdges`ille C:n täsmällisten
`coord`/`xsize`/`ysize`n syöttäminen romahduttaa kaikki 4 käytäväeroa nollaan —
ortho-koodissa ei ole vikaa, se on vain herkkä (kuten C:n oma labyrintti-
kustannusreititys) 1–2 ULP:n siirtymälle syötteessään. Täsmäys tarkoittaisi
clangin erityisen FMA-yhdistämisen emulointia yhdelle käännetylle lausekepuulle
`poly_init`issa — käännetyn artefaktin jahtaamista, ei lähdesemantiikan porttaamista.
Täysi diagnoosi: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emuloitu poikkeus (ei hyväksytty): `triang.c:ccw`.** Yksi yhdistämiskohta
TOISTETAAN bitti bitiltä eikä hyväksytä: pathplanin `ccw`
kääntyy `fnmul`+`fmadd`iksi (täsmällinen ensimmäinen tulo − pyöristetty toinen), joten
segmentin päätepisteeseen bitti bitiltä yhtä suuri kyselypiste testautuu ISCW/ISCCW eikä
ISON. `shortest.c:pointintri` hylkää sitten polygonikärkipäätepisteet
(”destination point not in any triangle”) ja `makeMultiSpline` palaa
tavalliseen reititykseen jokaiselle yhdistetylle 2-syklille — laaja, diskreetti,
koko korpuksen käyttäytyminen, johon porttauksen on täsmättävä. Toisin kuin edellä olevat `solve3`/`poly_init`
-kohdat (syvällä käännetyissä lausekepuissa, korjaus kumottu), `ccw` on
yksittäinen itsenäinen käännetty funktio, jolla on selkeä semantiikka, joten
`src/pathplan/triang.ts` emuloi sitä: tavallinen double-pikapolku konservatiivisella
virherajalla, jossa tavallinen ja yhdistetty etumerkki todistettavasti täsmäävät, sekä
täsmällinen Dekker-tulo + dyadinen BigInt-polku lähes-nollatapauksille.

---

### A9. libm-trigonometrian 1 ULP → CDT:n samalle ympyrälle osuvan tasapelin käännös (`circo`/`twopi`-multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Luokka.** V8:n `Math.sin`/`Math.cos` eivät ole bitti bitiltä identtisiä Apple libm:n
`sin`/`cos`in kanssa (todistettu: 1 ULP:n ero kohdassa `2π·4.5/8`, yhdessä kahdeksasta
ellipsiesteen kulmakulmasta). `makeObstacle`n ympäri piirretyn 8-kulmion kulmat
perivät tuon ULP:n, joten kolmioreitittimen syötekoordinaatit eroavat
oraakkelin koordinaateista ≤6e-14:n verran. Symmetriset asettelut (yhtä suuret solmut rankilla/renkaalla)
tekevät reitittimen nelikulmioista **täsmälleen samalla ympyrällä olevia** reaaliaritmetiikassa,
joten täsmällinen incircle-predikaatti on veitsenterällä: syötteen ULP kääntää sen etumerkin,
rajoitetun Delaunay-lävistäjän kääntyminen, ja käytäväpolygoni, joka epäonnistuu
`Pshortestpath`issa oraakkelissa (”destination point not in any triangle” →
tavallisen splinin varareitti), onnistuu porttauksessa (tai päinvastoin). Tuloksena olevat
splinit eroavat ~0.2–0.5 pt. **A3**:n/**A8**:n sisar: palautumaton
liukulukusiirrettävyysrajoite C:n lähdesemantiikan alapuolella — täsmäys
vaatisi Apple libm:n täsmällisen `sin`/`cos`-pyöristyksen toistamista JS:ssä.

**Koskee:** `241_0` (circo Δ≈0.2 / twopi-piirtoalue Δ≈9 käytäväkäännöksen kautta
kaarella `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 kaarinimiön sijaintieroa kukin — libm:n 1 ULP syntyy
`poly_init`in yksikkökärkitrigonometriassa (`hypot`/`atan2`/`sin`), asettaa yhden solmun
lasketun korkeuden ULP:n verran minimikokorajan yli, jolle oraakkeli osuu
täsmälleen, ja kaskadoituu `floor()`in kautta xlabel-R-puun latauksessa
yhdeksi nimiöehdokkaan käännökseksi. Oikein pyöristävän hypotin korjausta kokeiltiin ja
se KUMOTTIIN: se korjasi tunnisteen `2343` mutta regressoi `2168_3`:n, jonka
kahdeksankulmion mitoitus kulkee saman kutsun kautta, jossa oraakkelin arvo EI ole
oikein pyöristetty — mikään deterministinen hypot-politiikka ei täsmää oraakkeliin molemmilla).
`2168_1` kuului alun perin tähän luokkaan mutta muuttui
yhdenmukaiseksi, kun porttaus emuloi oraakkelin fp-yhdistettyä `ccw`:ta
(pathplan `triang.ts`): sen käytäväepäonnistuminen määräytyy FMA-yhdistetyn
`pointintri`n kärkipäätepisteen hylkäyksen mukaan, jonka porttaus nyt toistaa
bitti bitiltä, joten CDT-lävistäjän ULP-tasapeli ei enää ilmene siellä.

**Miksi hyväksytty (palautumattomuus todistettu kontrolloidulla kokeella).**
CDT itse on vapautettu epäilystä: porttauksen `mkSurface` on GTS 0.7.6:n
inkrementaalisen lisäyksen uskollinen porttaus (`cdt.c`: 1→3-jako + rekursiivinen
`swap_if_in_circle`, rajoitekaaret luotu etukäteen ja vaihtamattomia,
`remove_intersected_*` + `triangulate_polygon` -rajoitteen pakotus), ja
erillinen C-työkalu, joka linkittää **todellisen GTS-kirjaston** ja jolle syötetään porttauksen
bittitarkat reitittimen syötteet, toistaa porttauksen kolmioinnin tahko tahkolta
(2168_1: 22/22; 241_0: 185/185). Incircle-determinantin täsmällinen rationaaliarvointi
kahdella syötejoukolla vahvistaa etumerkin käännöksen (+1 porttauksen
syötteillä, −1 oraakkelin syötteillä). Jäännösmuuttuja — 1 ULP:n
trigonometriaero — eristettiin vertaamalla `Math.sin`/`sin`in bittikuvioita
suoraan.

**Moottoriraidan hyväksyntä (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Twopi-/circo-**xdot-moottoriraidat**
(`parity-twopi.json` / `parity-circo.json`, natiivi `dot -K <engine>
-Txdot` -oraakkeli, `test/corpus/engine-walk.ts`, semanttinen piirto-operaatiovertailu
±0.01:llä — katso `test/golden/compare-xdot.ts`) tuovat esiin saman mekanismin
riippumatta yllä viitatusta dot-moottorin SVG-kartoituksesta: twopi `2239` (1
piirto-operaatioero — `_ldraw_`-kaarinimiön tekstisijainnin käännös, sama
`poly_init`in yksikkökärkitrigonometrian ULP kaskadoituen `floor()`-xlabel-
R-puuketjun kautta; `2343`, `share-b29` ja `windows-b29`, jotka alun perin hyväksyttiin
tämän merkinnän alla, *korjattiin* 2026-07-11 uskollisella fmadd-yhdistämisellä
`polylineMidpoint`issa — katso b29-perhettä käsittelevä kappale alla) ja circo `241_0` (41
piirto-operaatioeroa, Δ≈0.2 pt kaaren `1->2` reititetyssä bezierissä — sama
CDT-lävistäjän käytäväkäännös; päätöspäiväkirja, 2026-07-10 -merkintä ”CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”). Hyväksytty moottoriraidan tasolla tiedoston
`test/corpus/accepted-divergences-engines.json` kautta, yhdistettynä
`PARITY-twopi.md`:hen/`PARITY-circo.md`:hen `parity-report.ts`llä — sama yhdistäminen,
jonka `accepted.ts` tekee dot-raidan `PARITY-dot.md`:lle.

**circo `2475_2` — samalla ympyrällä olevan closestNode-hypotin tasapeli.** Yhdessä
tämän 10762 solmun graafin 28 solmun komponentissa circon `getRotation`
(`circpos.c:73-92`) valitsee lähimpänä asettelun origoa olevan lohkosolmun
`hypot`in avulla päättääkseen alilohkon kierron. Kaksi samalla ympyrällä olevaa solmua ovat
käytännössä yhtä kaukana; V8:n oikein pyöristävä `Math.hypot` ja Apple
libm:n `hypot` pyöristävät tuon etäisyyden 2 ULP:n päähän toisistaan, mikä kääntää tiukan `<`:n,
valitsee eri solmun ja kiertää/peilaa alilohkon ~20° (18 solmua
liikkuu, enintään 296.7 pt; muut 10744 solmua ovat bitti bitiltä identtisiä, samoin
lohkopuu, ympyräjärjestys ja jokainen `centerAngle`). CR-hypot-politiikka oli
jo kumottu tälle luokalle (2026-07-10). Itsenäinen toisto:
`.agent-notes/circo-2475-590-repro.dot`; täysi juurisyyanalyysi:
`.agent-notes/circo-b81-2475-rca.md` (hyväksytty 2026-07-11).

**twopi `2470` — xlabel-R-puun vahvistama säteittäiskoordinaatin ULP.**
2470 on 140 kaaren graafi, jonka HTML-`<table>`-kaarinimiöt kasautuvat
lähes yhtenevien säteittäisten ankkureiden ympärille. Neato-perheessä kaarinimiöt sijoitetaan
ulkoisina nimiöinä ahneella xlabel-sijoittajalla (`label/xlabels.c`),
joka valitsee vähiten päällekkäisen ehdokaskulman Hilbert-järjestetyn R-puun kautta.
Porttauksen splinit ja solmukoordinaatit täsmäävät oraakkeliin emissiotarkkuudella
(nolla spliini-/solmu-/bbox-eroa jopa 1e-7:ssä), mutta yhden solmun säteittäinen
`ND_coord.y` eroaa ~2 ULP:n verran (Apple libm `sin`/`cos` vs. V8 `Math`) — selvästi
yhdenmukaisuusrajan alapuolella, mutta se ylittää `floor(pos.y − sz.y/2)`
-rajan täsmälleen kohdassa 0 funktiossa `objplpmks`, kääntäen kyseisen objektin R-puun suorakulmion
yhdellä yksiköllä. Hilbert-järjestyksen/puuryhmittelyn muutos saa `RTreeSearch`in karsimaan
eri haaran, joten ~140 nimiötä kukin napsahtaa naapuriehdokaskulmaan
(kukin ero kiinteä (+leveys, −rivinkorkeus) -askel). Sijoittaja, objektijärjestys,
suorakulmion pyöristys, `CombineRect` (joka uskollisesti peilaa C:n min-min-oikun) ja
int32-Hilbert-avain varmennettiin kukin uskollisiksi; ero on
ylävirran säteittäisen trigonometrian ULP, palautumaton samasta syystä
kuin twopi `1855`. Hyväksytty 2026-07-11; täysi juurisyyanalyysi:
`.agent-notes/twopi-2470-rca.md` (joka dokumentoi myös, että tunnisteen
aamuinen ”läpäisy” oli vanhentuneen oraakkelibinäärin artefakti, ei porttauksen
regressio).

**osage `1855` — esteen kärkien fp-contract-tahriutuminen.** Erillään yllä olevasta twopi
`1855`:n säteittäisestä peilimerkinnästä: osagella solmujen keskipisteet ovat bittitarkkoja
oraakkelin kanssa, ja 110 piirto-operaatioeroa ovat kolme esteitä kiertävää kaarta,
jotka on sijoitettu solmurivin peilipuolelle (X bittitarkka, Y peilattu).
Kahdeksankulmioesteen kärjet funktiosta
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) eroavat
C:stä 3–4 ULP, koska clangin `-ffp-contract=on` yhdistää `a·b±c`
-ketjut kohdissa `ellipse_tangent_slope`/`line_intersection` yksittäispyöristyksellä
FMA:iksi, kun V8 pyöristää jokaisen operaation: C:n yhdistetty pyöristys romahduttaa
kulmakärkien x-arvojen kuilusarakkeen yhdeksi bitti bitiltä identtiseksi doubleksi (täsmälleen kollineaarinen),
porttaus jakaa sen kahdeksi toisistaan 1 ULP:n päässä oleviksi arvoiksi. Se kääntää näkyvyyden
`clear()`-tangenttitestin — kuilu ei enää ole estetty — lisäten ~20
näkyvyyskaarta, ja Dijkstra ratkaisee ylös/alas-homotopiatasapelin
peilipuolelle. Kontrolloitu koe: C:n täsmällisten estekoordinaattien injektointi
muutoin koskemattomaan porttaukseen tuottaa **nolla** poikkeavaa
kaarta, vapauttaen laillisen järjestelyn, näkyvyyden, Dijkstran ja splinen
ketjun kokonaan epäilystä; pelkän C:n libm `cos`/`sin`in injektointi ei vaikuta mihinkään. Hyväksytty
2026-07-11; täysi juurisyyanalyysi: `.agent-notes/osage-spline-family-rca.md`.

**b29-perhe (twopi).** Neljällä b29-variantilla on yksi yhteinen veitsenterä:
`EqmtTyp`-kaarinimiö (`Node14732->Node14731`) on täsmällisessä placeLabels-
puolenvalinnan tasapelissä, jonka lopputulos riippuu ympäröivien objektien 1 ULP:n
twopi-asetteluajelehtimisesta. Uskollisella fmadd-yhdistämisellä
`polylineMidpoint`issa (states-perheen korjaus, 2026-07-11) porttauksen nimiöankkuri
on bitti bitiltä identtinen oraakkelin kanssa, mutta tasapeli ratkeaa silti vastakkain
kahdella neljästä variantista (`graphs-b29`, `linux.i386-b29`), kun taas
kaksi muuta (`share-b29`, `windows-b29`) ovat nyt yhdenmukaisia — ja `2343`:n hyväksytty A9-
nimiöero poistui kokonaan. Raja: 1 piirto-operaatio, Δ12 pt nimiön y. Palautumaton
ilman ylävirran ajelehtimisen poistamista. Täysi juurisyyanalyysi:
`.agent-notes/twopi-states-rca.md`.

Sama placeLabels-veitsenterä ilmenee **osage**-raidalla (hyväksytty
2026-07-11, täysi juurisyyanalyysi: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` ja `share-b29` (2 piirto-operaatioeroa kummassakin — yhden kaarinimiön
x-ankkuri päätyy arvoon 878.28 vs. 841.06, sijoitettuna symmetrisesti bitti bitiltä
identtisen splinen keskipisteen 859.67 ympärille, eli ±puolet nimiön leveydestä; nämä kaksi
varianttia peilaavat toisiaan) ja `1652` (2 piirto-operaatioeroa — kaksi kaarta kumpikin
kääntää yhden nimiöankkurin identtisen keskipisteen ympäri, toisen x:ssä ja toisen y:ssä,
bitti bitiltä identtisillä splineillä ja nuolenkärjillä; oraakkeli renderöi kokonaan,
joten tämä ei ole tunnettu natiivin aikakatkaisun epävakaus). Kaikissa tapauksissa kaaren
geometria on bittitarkka ja vain nimiön puolenvalinnan tasapeli ratkeaa
vastakkain 1 ULP:n ajelehtineessa ympäristössä.

Osage-raidalla on `polypoly`-kolmikko (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; hyväksytty 2026-07-11, täysi juurisyyanalyysi
tiedostossa `.agent-notes/patchwork-tail-rca.md`): ainoa poikkeava operaatio on
paljas transsendenttifunktio `cos(π+θ)` vääristyneen nelikulmion suunnan 180
-kärjessä — V8:n `Math.cos` on oikein pyöristetty, kun taas Apple libm:n `cos` kantaa
±1 ULP:n argumenttiriippuvaisen virheen (joten vain libm:ssä `|cos(π+θ)| ≠
|cos(θ)|`); 1 ULP:n solmukokoero syöttyy packin `GRID`/`ceil`iin, kääntää
kehätasapelin, ja qsort sijoittaa kaksi komponenttia toistensa pakkaussoluihin —
jäykkä koko solmun vaihto ilman muoto- tai reititysvirhettä. Mikään
deterministinen uudelleenkirjoitus ei voi toistaa ei-oikein-pyöristävää libm-
transsendenttifunktiota, oppikirjamainen A9-muoto.

Sama mekanismi vahvistettiin 2026-07-28 suuremmalla sisarella
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, uusi
905 kohteen joukossa; 112 piirto-operaatioeroa, vain osage). Poikkeava operaatio
on identtinen solmun `9004` `cos(π+θ)`:n 1 ULP:n kohta — C:n ja porttauksen `bb.x`
-arvot täsmäävät alkuperäiseen juurisyyanalyysiin tavu tavulta — mutta tällä 76 solmun syötteellä
eteneminen kulkee osagen `arrayRects`in kautta: `acmpf` lajittelee pakkaussolut
raa'an `width+height`-summan mukaan, ja libm:n 1 ULP korkeampi leveys saa
`9004`:n lajittumaan tiukasti kiertyneiden sisarustensa `9000/9002/9006` edelle, kun taas
V8:n oikein pyöristetty arvo jättää täsmällisen nelisuuntaisen tasapelin epästabiilille
qsortille järjestettäväksi toisin — eri rivijärjestyssolut, `9002`/`9006`
-vaihto ja sarakeleveyden `fmax`-kaskadi siirtävät 8 naapuria x:ssä.
Porttauksen oman `arrayRects`in syöttäminen C:n solmukoilla vs. porttauksen solmukoilla
toistaa ajon 10 siirtynyttä solmua tavu tavulta täsmäävin x-delta-arvoin,
sulkien kausaaliketjun.

Kaksi muuta moottoriraidan tapausta juurisyyanalysoitiin ja hyväksyttiin 2026-07-11
(täysi juurisyyanalyysi: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 piirto-operaatio-
eroa — yllä olevan circo-merkinnän sisar: sama CDT:n samalla ympyrällä oleva
incircle-tasapeli, libm `sin`/`cos`in 1 ULP:n kääntämänä, saa porttauksen
multispline-käytävän onnistumaan 14 pisteen splinellä, kun natiivi käännös
palaa tavalliseen 8 pisteen reititykseen; pisteerot < 0.07 pt) ja circo
`windows-tree` (10 piirto-operaatioeroa yhdellä viuhkakaarella — circon sijoitustrigonometria
asettaa `node2.y`:n yhden ULP:n verran arvon `node8.y` yläpuolelle täsmälleen symmetrisen
arvon 18.0 ympärillä, ja `closestSide`n dyna-pääportin valinta kääntää TOP/BOTTOM
tuossa täsmällisessä tasapelissä; solmusijainnit ja laatikot ovat muutoin bitti bitiltä identtiset
oraakkelin kanssa).

**sfdp-moottoriraita — kaarten FP-tasapelit (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> sfdp-xdot-moottoriraita (`parity-sfdp.json`,
natiivi `dot -Ksfdp -Txdot`, ±0.5) tuo esiin CDT:n samalla ympyrällä olevan incircle-tasapelin, kun
täsmälliset natiivit reititystä edeltävät sijainnit injektoidaan (joten ero EI ole
iteratiivista ajelehtimista — katso A1-drift-luokka — vaan diskreetti predikaattitasapeli):

- `42` ja `241_0` — CDT:n samalla ympyrällä oleva incircle-tasapeli (multispline-käytävä).
  Injektoiduilla sijainneilla jäännös on **segmenttimäärän käännös**: `42`
  `opCount 5 vs 9` (kaari 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kaari 3->2) — porttauksen rajoitetun Delaunay-lävistäjän käännös oraakkeliin nähden,
  joten multispline-käytävä onnistuu N pisteen splinellä, kun natiivi
  käännös palaa lyhyempään tavalliseen reittiin (tai päinvastoin), täsmälleen kuten
  yllä oleva twopi/circo `241_0` -merkintä. Porttaus emuloi jo arm64:n
  `fmadd`-yhdistämistä incircle-/`ccw`-predikaatissa (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) ja käyttää robustia incircle-Delaunayta; jäännös on
  predikaatin syötteessä oleva V8-vs-Apple-libm `sin`/`hypot` 1 ULP, jota mikään siirrettävä
  koodi ei toista.

> **`2095` luokiteltiin uudelleen A9 → A1-drift (2026-07-22).** Se oli aiemmin lueteltu
> täällä ”hypot-sisarena” (alle 0.7 pt:n ajelehtiminen tyhjännimisen
> solmun `""->"4"` kaarilla). Tuo jäännös oli **työkaluartefakti**: attribuutioinjektorin
> `GVTS_POS`-regex vaati ≥1 nimimerkkiä, joten `""`-nimistä solmua ei
> koskaan injektoitu ja se veti mukanaan kaksi siihen liittyvää kaarta. Kun injektori korjattiin
> täsmäämään tyhjiin nimiin (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), sfdp `2095`
> injektoituu **0 jäännökseen** — puhdasta voima-ajelehtimista, jonka laskettu A1-drift-
> luokka kattaa, ei reititys-FP-tasapeli. Sen syykohtainen hyväksyntä poistettiin tiedostosta
> `accepted-divergences-engines.json`. (Sama havainto kuin fdp `2095` alla.)

**Tuore kontrolloitu koe (2026-07-21).** Natiivi-vs-V8-`hypot`-luotain
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): järjestelmän C-`hypot`in
kääntäminen ja vertailu Noden `Math.hypot`iin edustavilla litteän kaaren poikkeamasyötteillä näyttää 1 ULP:n
eron 2:ssa 6:sta (Δ 7.1e-15 ja
5.7e-14) — jakokynnyksen veitsenterä, joka kääntää alajaon määrän.
Palautumaton: mikään siirrettävä hypot ei toista Apple libm:ää (`arm-pow.ts`
-ennakkotapaus samalle rajalle). Hyväksytty moottoriraidan tasolla tiedoston
`accepted-divergences-engines.json` kautta (`sfdp.42`, `sfdp.241_0`).

**fdp**-xdot-moottoriraita (`parity-fdp.json`, natiivi `dot -Kfdp -Txdot`,
±0.5) tuo esiin SAMAN CDT:n samalla ympyrällä olevan tasapelin samalla graafilla, `241_0`: kun
oraakkelin täsmälliset reititystä edeltävät sijainnit injektoidaan, jäännös on 11 numeerista
`unfilled_bezier`-eroa yhdellä kaarella (`0->1#0`, maxΔ 3.39 pt). Koska
solmusijainnit ovat injektoidusti identtiset, ero on alavirrassa
pathplanin multispline-käytävässä — sama libm-1-ULP-incircle-tasapeli kuin
twopi/circo/sfdp `241_0` (täsmällinen rationaali-incircle 185/185 yllä). Vivut on
jo otettu käyttöön (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); tasapeli on palautumaton. Hyväksytty tiedoston `accepted-divergences-engines.json`
`fdp.241_0` kautta. fdp:n `2095` sitä vastoin on **A1-drift, ei A9**: yksittäisen
tyhjännimisen solmun injektointi (kun attribuutioinjektori oli korjattu täsmäämään
`""`-nimisiin solmuihin) romahduttaa sen jäännöksen nollaan — aiempi ”A9-häntä” oli
injektoimaton tyhjä solmu, joka veti mukanaan siihen liittyviä kaaria. Sfdp:n `2095`-hyväksyntä
oli sama sokea piste — tuore sfdp-attribuution uudelleengenerointi (2026-07-22) korjatulla
injektorilla vahvisti, että sekin injektoituu 0:aan, ja sen hyväksyntä poistettiin (katso
yllä oleva `2095`:n uudelleenluokitusta koskeva huomautus).

---

## Seurattu pitkä häntä (`dot`-attribuutit ja reunatapaukset) {#tracked-long-tail-dot-attribute-edge-case}

**Oletusarvoilla** `dot`-moottori vastaa C-binääriä tiukalla deterministisellä
toleranssilla golden-korpuksella (arvio `conformant`; katso huomautus aivan
alussa). Jäljelle jääneet erot ovat **attribuuttien ja reunatapausten pitkä häntä**
— minkä tahansa Graphviz-porttauksen historiallisesti vaikea osa. Toisin kuin yllä olevat
hyväksytyt erot, nämä *suljetaan*; niitä seurataan elävästi, lukuineen,
tiedostossa
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Luokka | Mikä eroaa |
|---|---|
| **path-structure** | Kaarten splinereititys tietyissä kokoonpanoissa (esim. jotkin litteän kaaren ja tiheän käytävän tapaukset). |
| **element-count** | Ominaisuus, joka emittoi tietyillä graafeilla enemmän/vähemmän SVG-elementtejä kuin C. |
| **color-stroke** | Viivan/täytön emissioerot tietyille tyyliattribuuteille. |
| **parser-gap** | Pieni määrä DOT-syötteitä, joita jäsennin ei vielä täysin hyväksy. |

Jos graafisi käyttää vain yleisiä attribuutteja ja `dot`-moottoria, olet lähes
varmasti deterministisen toleranssin täsmäysreitillä. Jos asettelu näyttää väärältä, tarkista `PARITY-dot.md`
tälle syöteluokalle — se on todennäköisesti seurattu kohde oraakkeliin sidotulla korjausmissiolla,
ei tuntematon.

> **Huomautus nimiölähtöisistä tapauksista.** Tekstinmittausluokka (A2) on suljettu —
> yhtään `dot`-graafia ei enää hyväksytä sen alla. Graafi, joka on tänään tilassa
> structural-match, on seurattu aukko, ei fonttimetriikkaero.

### `concentrate=true` — vastakkaisten kaarten nuolenkärjet {#concentrate-true-opposing-edge-arrowheads}

Kun `concentrate=true` yhdistää antirinnakkaisen parin (`A->B; B->A`) yhdeksi
eloonjääväksi kaareksi, kaaren on piirrettävä nuolenkärki **molempiin** päihin. Tämä on nyt
porttattu (`arrow_flags`in `conc_opp_flag`-haara; katso
`src/common/splines-clip.ts:arrowFlags`), joten `graphs-b135`, `167` ja `2087`
täsmäävät (puuttuvan nuolenkärjen `element-count`-ero ja sen leikkaamattoman splinen
`@d`-sivuvaikutus ovat kumpikin poissa).

Joillakin concentrate-graafeilla on **erillinen, aiemmin olemassa ollut jäännös**, jota
nuolenkärkikorjaus **ei** käsittele — se on solmun **x-koordinaatin** sijaintiero
(x-verkkosimpleksi / kompassiportti), ei nuolenkärkivika:

- **`graphs-b15`, `graphs-b69`** — suuret record-/klusterihissigraafit.
  Concentrate aktivoituu ja yhdistää oikein; jäännös on ~1 pt:n solmu-x-ero,
  joka vahvistuu `element-count`-/spliini-`@d`-eroksi. Nuolenkärjen emissio
  itsessään on nyt oikea (b69 saa puuttuvat nuolenkärkipolygoninsa). Katso
  `b69-concentrate-undermerge`-agenttimuistiinpano x-koordinaatin juurisyystä.
- **`1453`** — poikkeaa yhä ylimmän tason `element-count`-syystä, joka ei liity
  conc_opp_flag-nuolenkärkeen.
- **`2825`** — tämän nuolenkärkikorjauksen aikaan poikkesi ylimmän tason
  `element-count`-syystä, joka ei liittynyt conc_opp_flagiin (vastakkaisparin yhdistämistä
  ei laukaista siellä); sittemmin suljettu fix-2825-rebuild-vlists-missionilla,
  katso A4 yllä.

Nämä ovat seurattuja x-koordinaatti-/rakennekohteita, **ei** nuolenkärkivikoja.

### Asettelun uskollisuusaukot 2.0-uskollisuusmissiosta (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0-uskollisuusmissio sai porttaamattomat attribuuttiarvot epäonnistumaan äänekkäästi (katso
`UNSUPPORTED_FEATURE`-taulukko sivulla
[Virheet ja poikkeukset](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Se jätti jäljelle seuraavat, kirjattuna tiedostoon `plans/v2-fidelity/decision-journal.md`.

**Äänekäs, porttaamaton.** `overlap=voronoi` päällekkäisillä solmuilla heittää yhä
`UNSUPPORTED_FEATURE`n neatossa, twopissa, circossa ja sfdp:ssä: Voronoi-säätäjä
itse (`vAdjust`in algoritmi) ei ole porttattu. Päällekkäisyystesti, joka päättää,
heitetäänkö poikkeus, on C:n oma (`countOverlap` `poly.c`-solmupolygoneilla).

**Tunnetut aukot, yhä äänettömiä.** Porttaus renderöi nämä ilman virhettä ja
eroaa natiivista Graphvizista. Löydetty `v2-silent-gaps`-missionilla
(`plans/v2-silent-gaps/decision-journal.md`); ei hyväksyttyjä eroja.

- **`getAdjustMode`n ”Unrecognized overlap value” -varoitusta ei emittoida.**
- **Kierrettyjen polygonien kärjet voivat erota natiivista viimeisissä biteissä
  (palautumaton: isäntämatematiikkakirjasto).** `poly_init` orientoi jokaisen kärjen
  `atan2`, `hypot`, `sin` ja `cos` -funktioilla. Bitti bitiltä identtisillä syötteillä macOS:n libm ja
  V8 palauttavat eri viimeiset bitit (esim. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` seuraavassa kärjessä:
  libm `…fffd`, V8 `…fffe`), joten laatikon, jolla on `orientation=20`, kärjen y on
  `-18` porttauksessa ja `-17.999999999999996` natiivisti. Natiivi Graphviz itse
  vaihtelee alustan libm:n mukaan, eikä selain voi kutsua sitä. Porttauksen oma
  aritmetiikka vastaa C:tä (`RADIANS`-järjestys kiinnitetty; 776 / 1664 otantakärkikoordinaatista
  on bitti bitiltä identtisiä, loput eroavat vain libm:n kautta). Vaikutus:
  tarkan kosketuksen `polyOverlap`-arviot voivat kääntyä; natiiveilla kärjillä jokainen
  arvio täsmää.
- **sfdp voi erota natiivista macOS:llä (palautumaton: isäntä-libm:n `pow`).**
  Diagnosoitu instrumentoidulla natiivilla sfdp:llä: sijainnit pysyvät bitti bitiltä identtisinä,
  kunnes yksi hylkivän voiman termi, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1` joten `pow(x, 2)`), palauttaa macOS:n libm:stä 1 ulp vähemmän kuin `x*x`
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, oikein pyöristetty
  `…396`; macOS:llä `pow(v, 2) != v*v` 20:lle 16201 otanta-arvosta `v`). Se muuttaa
  iteraation `Fnorm`in viimeistä bittiä; sfdp:n adaptiivinen jäähdytys vahvistaa sen
  erilaiseksi (usein peilatuksi) asetteluksi. Porttauksen `armPow` on ARMin
  optimized-routines-`pow` (glibc ≥ 2.28), eli sitä, mitä Linux-Graphviz laskee;
  macOS-oraakkeli on poikkeus. Poissuljettu: siementäminen (eksplisiittiset `start=`-arvot
  täsmäävät), `pcp_rotate` (sama syöte antaa saman tulosteen), sijainnit ja
  vetävä termi (bitti bitiltä identtiset). Esimerkki: yksinäinen kolmio `a--b; a--c; b--c`
  oletussiemenellä.
- **fdp voi erota natiivista isäntä-libm:n `cos`/`sin`in kautta.** fdp seuraa
  Graphvizia version 15.0.0 jälkeen (hypot-etäisyyshylkintä, `Mlimit`), ja isäntä-
  libm:n `hypot` on toistettu bitti bitiltä (`src/common/libm-hypot.ts`, 0
  eroa 400 000 otoksella). 251 / 252 fdp-renderöitävästä golden-syötteestä
  täsmää natiiviin käännökseen täsmälleen; jäljelle jäävä yksi
  (`parallel-cluster-ldbxtried`) sijoittaa klusteriportin solmut kaavalla
  `T_Wd * cos(alpha)`, ja macOS:n libm `cos(-2.3840764867756761)` on 1 ulp:n päässä
  V8:n `Math.cos`ista; fdp:n voimasilmukka vahvistaa sen noin 3 tuumaksi. Applen
  `cos` ei ole toistettavissa lyhyellä mallilla niin kuin `hypot`.
- **Natiivit kaatumiset, jotka porttaus määrittelee.** Natiivi Graphviz poistuu koodilla 139
  neaton `mode=KK` -tilassa asetuksella `model=mds` ja kaaren `len`illä (`mds_model` indeksoi `GD_dist`in
  1-pohjaisella järjestysnumerolla: kekoylivuoto), sekä asetuksella `model=circuit` epäyhtenäisellä graafilla.
  Porttaus pudottaa alueen ulkopuoliset solut ensimmäisessä tapauksessa ja
  turvautuu lyhimpiin polkuihin toisessa; natiivia tulostetta, johon verrata, ei ole.

---

## Tarkoituksella porttaamatta (ei-tavoitteet) {#intentionally-not-ported-non-goals}

Nämä ovat tarkoituksellisia soveltamisalan rajoja, ei vikoja. Kirjasto kohdistuu **SVG**:hen
(sekä tekstimuotoisiin välimuotoihin `json` / `xdot` / `dot` / imagemap).

- **Muut tulostemuodot.** Rasteri (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  sekä GUI-/interaktiiviset taustajärjestelmät ovat soveltamisalan ulkopuolella. Käytä SVG-tulostetta ja muunna
  jatkokäsittelyssä, jos tarvitset rasterin.
- **`page=`-sivutus SVG:lle.** Natiivi `dot` ei sivuta SVG:tä myöskään (SVG-laite
  ei aseta sivutuslippua), joten `page=` on tällä polulla tyhjäoperaatio molemmissa
  toteutuksissa — dokumentoitu tässä vain, koska se on yleinen sekaannuksen
  aihe.
- **`-Tplain`-tekstitulostus.** Lykätty (uskollinen tekstimuoto), ei poissuljettu.
- **`gvpr`** (graafinkäsittelyn skriptauskieli) — soveltamisalan ulkopuolella.
- **C++-mukavuuskääreet** (`cgraph++`, `gvc++`) — C-API porttataan
  ensin; idiomaattinen TypeScript-mukavuuskerros, jos sellaista halutaan, olisi
  erillinen paketti.
- **`fontnames=svg|ps` selaimen tekstinmittauksessa.** Selaimessa
  canvas-mittaaja rakentaa fontin PostScript-aliaksen
  `fontnames=native`-perheluettelosta (`Times-Roman` → `Times, serif`), samasta
  kasvosta, jolla SVG-emitteri oletuksena renderöi. `TextMeasurer` ei kanna mitään
  graafikontekstia, joten graafit, jotka asettavat `fontnames=svg` tai `fontnames=ps`, mitataan
  natiivia luetteloa vasten, kun taas SVG nimeää svg/ps-perheen. Aliaspainot,
  joita CSS ei määrittele (`book`, `demi`, `light`, `medium`, `roman`),
  emittoidaan sellaisinaan kuten C:ssä; selaimet ohittavat ne ja renderöivät normaalipainon,
  ja mittaaja mittaa normaalipainon vastaavasti. Noden tuloste
  ei ole vaikutuksen alainen (se ei koskaan käytä canvas-mittaajaa).
- **Vain natiivit mekanismit**, jotka on korvattu selaimen kanssa turvallisilla vastineilla: dynaaminen
  liitännäisten lataus (`dlopen`) korvataan staattisella moottori-/renderöijärekisteröinnillä;
  tiedostojärjestelmälukemat (fontit, kuvat, konfiguraatio) korvataan kutsujan toimittamilla
  takaisinkutsuilla (esim. `setImageSizer`). Käyttäytyminen säilyy; mekanismi eroaa.

---

## Poikkeaman ilmoittaminen {#reporting-a-divergence}

Jos löydät tulosteen, joka eroaa C:stä ja **ei** ole yllä hyväksytty ero,
ei ole tiedostossa `PARITY-dot.md` eikä ole ei-tavoite, se on ilmoittamisen arvoinen vika — C-
lähdekoodi on määrittely, ja luetteloimattomat poikkeamat käsitellään virheinä, ei
hyväksyttynä käyttäytymisenä.
