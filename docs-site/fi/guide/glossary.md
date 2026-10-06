---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Sanasto

Yksi määritelmä termiä kohden, aakkostettuna englanninkielisen termin mukaan (otsikot
säilyttävät englanninkielisen järjestyksen). Jokainen viittaa oppaan sivulle (tai
lähdekoodiin), joka käsittelee sen syvällisesti.

## Klusteri

Aligraafi, jonka nimi alkaa sanalla `cluster` (esim. `subgraph cluster_build`) —
Graphviz piirtää sen omana laatikkonaan, joka ryhmittelee jäsensolmunsa. Sisäisesti
@knowvah/dot-enginen geometriatilannekuva nimeää jokaisen klusterin aligraafin
uudelleen sijaintiin perustuvaksi nimeksi, kuten `cluster6` (`ClusterGeometry.name`),
eikä DOT-lähdekoodin nimeksi, joten kuluttaja, joka tarvitsee alkuperäisen nimen,
rakentaa `idByName`-kartan ennen asettelua ja nimeää `snapshot.clusters`-kentän
uudelleen sen jälkeen. Katso
[Reseptit](/fi/guide/recipes) uudelleennimeämismallista ja
[Graafin rakentaminen](/fi/guide/build-a-graph) klusterien luomisesta `addSubgraph`-funktiolla.

## Yhdenmukaisuus

Koneellisesti tarkistettu ominaisuus, jonka varaan väite siitä, että @knowvah/dot-enginen renderöinti
”vastaa” C-oraakkelia, perustuu. Kun molemmat SVG:t on jäsennetty normalisoiduiksi elementtipuiksi,
jokaisen numeerisen arvon (koordinaatit, polkudata, `points`) on oltava
samat kiinteän toleranssin sisällä — **±0,01 pt** deterministisillä moottoreilla
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) ja **±0,5 pt**
iteratiivisilla voimaohjatuilla moottoreilla (`neato`, `fdp`, `sfdp`) — ja jokaisen
ei-numeerisen arvon (tagit, värit, teksti) on oltava täsmälleen yhtä suuri. Se ei ole
väite tavu tavulta samasta SVG-tuotoksesta. Katso [Yhdenmukaisuus](/fi/conformance).

## Koordinaatisto / y-akseli

Graphvizin natiivikoordinaatisto on **y-ylös**, origo vasemmassa alakulmassa;
selaimet ja näytöt ovat **y-alas**, origo vasemmassa yläkulmassa.
`getLayout` käyttää oletuksena arvoa `yAxis: 'down'` (kääntää jokaisen y:n ja normalisoi
`bounds`-arvon pisteeseen `(0, 0)`) ja hyväksyy arvon `yAxis: 'up'` palauttaakseen
natiivit graphviz-koordinaatit muuttamattomina. xdotin piirto-operaatiot (`getDrawOps`-funktiosta)
ovat aina natiivissa y-ylös-kehyksessä. Katso [Lasketun geometrian lukeminen](/fi/guide/geometry).

## Poikkeama

Ero @knowvah/dot-enginen renderöinnin ja oraakkelin välillä, joka on
tutkittu, jonka juurisyy on selvitetty ja joka on luetteloitu — toisin kuin hiljaa
sallittu. Luetteloidut poikkeamat kuuluvat yhteen kolmesta luokasta: hyväksytyt
erot (joita ei tarkoituksella saateta yhdenmukaisiksi, esim. alustojen välinen
liukulukujen epädeterminismi), seurattu pitkä häntä, jota vielä suljetaan, ja
nimenomaiset ei-tavoitteet. Luettelemattomaan eroon suhtaudutaan virheenä, ei
hyväksyttynä käyttäytymisenä. Katso [Tunnetut poikkeamat](/fi/divergences).

## DOT

Graafien kuvauskieli — `digraph { ... }` / `graph { ... }` solmu-,
kaari- ja attribuuttilauseineen — jonka @knowvah/dot-engine jäsentää, ennen kuin
se antaa tuloksen asettelumoottorille. Katso [Aloitus](/fi/guide/getting-started).

## Image sizer / resolver

Kaksi injektoitavaa liitäntäkohtaa ulkoisille kuville (usershape-solmut ja `<IMG>`-solut
HTML-nimiöissä). `ImageSizer` ilmoittaa kuvan luontaisen leveyden/korkeuden, jotta
solmujen mitoitus ja nimiöiden asettelu voivat edetä lataamatta pikseleitä;
`ImageResolver` toimittaa varsinaiset kuvatavut upotettavaksi renderöintihetkellä.
Katso [Kuvat](/fi/guide/images).

## Asettelumoottori

Yksi kahdeksasta asettelualgoritmista, jotka @knowvah/dot-engine rekisteröi ja jotka valitaan nimellä
(`renderSvg(dot, engine)`): `dot` (hierarkkinen/kerroksellinen), `neato`
(jousimalli, Kamada–Kawai), `fdp` (voimaohjattu), `sfdp` (monitasoinen
voimaohjattu, suurille graafeille), `circo` (ympyrämäinen), `twopi` (säteittäinen),
`osage` (klusteroitu) ja `patchwork` (neliöity puukartta). Katso
[Asettelumoottorit](/fi/guide/engines).

## Oraakkeli

Natiivi C-Graphvizin `dot`-binääri, rakennettu kanonisesta C-lähdekoodista, jota vasten
jokainen @knowvah/dot-enginen renderöinti validoidaan. @knowvah/dot-engine käynnistää tämän
binäärin suoraan (ei koskaan WASM-versiota) välttääkseen ABI-ajautuman
referenssin ja porttauksen välillä. Katso [Yhdenmukaisuus](/fi/conformance) ja
[Pariteetti](/parity) siitä, miten oraakkelivertailut ajetaan ja raportoidaan.

## Rank / rankdir

`dot`in hierarkkisessa asettelussa **rank** on kerros solmuja, jotka on sijoitettu samalle
syvyydelle piirroksessa. `rankdir` asettaa suunnan, johon rankit virtaavat —
oletus `TB` (ylhäältä alas) tai `LR`, `BT`, `RL` — asetettuna graafin attribuuttina
(`b.setAttr('rankdir', 'LR')`). Katso [Graafin rakentaminen](/fi/guide/build-a-graph).

## Splini / kaarten reititys

Kaareva (Bézier) polku, jota pitkin kaari piirretään ja jonka laskee reitityskoodi,
joka kiertää solmu- ja klusteriesteet. @knowvah/dot-engine tarjoaa
reititetyt ohjauspisteet kenttänä `EdgeGeometry.points` — järjestetty taulukko
`{x, y}`-pisteitä pisteinä (points) — `getLayout`-funktiosta. Katso
[Lasketun geometrian lukeminen](/fi/guide/geometry).

## Tekstinmittaaja

Injektoitava liitäntäkohta (`TextMeasurer`), joka ilmoittaa nimiön leveyden/korkeuden, jotta solmujen
ja kaarten nimiöiden mitoitus voi edetä ennen asettelua. @knowvah/dot-engine ratkaisee
sellaisen automaattisesti renderöintikohtaisesti — ensin eksplisiittinen `setTextMeasurer`, sitten
selaimen `<canvas>`, jos saatavilla, sitten sisäänrakennettu deterministinen
`EstimateTextMeasurer` Nodessa — tai hyväksyy oman toteutuksen. Katso
[Tekstin mittaus](/fi/guide/text-measurement).

## Usershape

Graphvizin termi solmulle, jonka muoto on ulkoisesti toimitettu kuva
(`image`-attribuutin kautta) piirretyn monikulmion tai ellipsin sijaan.
@knowvah/dot-engine ratkaisee usershapet injektoitavan kuvan mittaajan/ratkaisijan
liitäntäkohdan kautta eikä lue tiedostoja suoraan, mikä pitää kirjaston selaimessa turvallisena.
Katso [Kuvat](/fi/guide/images).

## xdot

Laajennettu DOT:n piirto-operaatioformaatti: jäsennelty operaatiovirta (aseta
täyttö-/viivaväri, aseta fontti, täytä/piirrä ellipsi tai monikulmio, piirrä
Bézier, piirrä teksti), joka kuvaa täsmälleen, miten renderöity graafi tulee
maalata, piirtojärjestyksessä. `getDrawOps` palauttaa tämän virran tyypitettyinä `XdotOp`-
arvoina oman renderöijän (canvas, WebGL, PDF) ohjaamiseksi ilman SVG:n
jäsentämistä. Katso [Oma renderöinti xdotilla](/fi/guide/xdot-drawops).
