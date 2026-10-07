---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformiteit: wat „overeenkomen” betekent {#conformance-what-match-means}

@knowvah/dot-engine wordt gevalideerd tegen de canonieke C-Graphviz-binary als orakel.
Wanneer dit project zegt dat een graaf **overeenkomt** met C — het pariteitsoordeel
met de naam `conformant` —, dan bedoelen we een specifieke, mechanisch gecontroleerde
eigenschap, **niet** letterlijke byte-voor-byte-gelijkheid van de SVG-tekst.

> **Definitie.** Een port-rendering is **conform** aan de orakel-rendering wanneer,
> nadat beide SVG's zijn ingelezen in een genormaliseerde elementenboom:
>
> 1. elke **numerieke** waarde (coördinaten, padgegevens, `points`, `viewBox`,
>    `transform`-parameters) binnen een vaste **tolerantie** overeenkomt met het orakel, en
> 2. elke **niet-numerieke** waarde (tagnamen, kleuren, tekstinhoud,
>    attribuutsleutels, opsombare attribuutwaarden) **exact gelijk** is.
>
> Als een numerieke waarde de tolerantie overschrijdt, of een niet-numerieke waarde
> verschilt, is de rendering **niet** conform.

## Waarom geen letterlijke bytes? {#why-not-literal-bytes}

SVG serialiseert drijvendekomma-coördinaten als decimale tekst. Twee wiskundig
gelijkwaardige renderings kunnen toch in het laatst afgedrukte cijfer verschillen door
IEEE-754-afronding, de volgorde van drijvendekomma-bewerkingen en platformafhankelijk
`libm`-/FMA-gedrag dat per CPU en JS-engine verschilt. Een letterlijke bytelat zou
daarom over de runtimes waarop deze bibliotheek mikt (browsers, Node, verschillende
CPU's) niet alleen streng zijn, maar **ontestbaar**. Conformiteit legt de eigenschap vast
waar het werkelijk op aankomt — de geometrie en inhoud die een kijker ziet — en wel
binnen een grens die klein genoeg is om niet waarneembaar te zijn.

## De exacte tolerantie {#the-exact-tolerance}

De tolerantie geldt **per engineklasse** en is gedefinieerd in
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klasse | Tolerantie (pt) | Engines |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

De deterministische engines reproduceren de gehele/afgedrukte coördinaten van C in
wezen exact, zodat ±0.01 alleen ruis in de decimale opmaak opvangt. De iteratieve
(krachtgestuurde) engines hangen af van transcendente functies waarvan de resultaten in
het laatste bit niet reproduceerbaar zijn over platforms heen; ze krijgen daarom een
ruimere grens en worden bovendien gecontroleerd op **structurele** gelijkheid
(dezelfde elementenboom).

Eén kanttekening voor het oppervlak **plain/plain-ext**: plain drukt coördinaten af in
inches met 5 significante cijfers (`%.5g`), zodat bij groottes ≥ 100 het afdrukkwantum
(0.01) gelijk is aan de tolerantie van ±0.01. Bij zeer grote grafen wordt een
lay-outverschil kleiner dan één ULP dat toevallig over een afrondingsgrens van het 5e
cijfer valt, afgedrukt als een volledige stap van 0.01 en gemarkeerd, ook al is de
onderliggende geometrie identiek tot ~1e-11 pt (zie de circo-acceptatie `2108`,
journaal 2026-07-28). De oppervlakken xdot/json, die in punten afdrukken, zijn in dat
bereik de gezaghebbende geometrievergelijking.

De **pariteitssurvey van het corpus** beoordeelt elke graaf in de modus `deterministic`
(±0.01), ongeacht de engine — zie
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## De code lezen {#read-the-code}

De bovenstaande definitie is geen proza-ambitie — het is precies wat de vergelijkingscode
doet. Zo kunt u het zelf controleren:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (de tabel ±0.01 / ±0.5) en `compareSvg`, dat de twee
  genormaliseerde bomen doorloopt en regel (1) numeriek-binnen-tolerantie en
  regel (2) niet-numeriek-exact attribuut voor attribuut toepast.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hoe ruwe SVG wordt ingelezen in de vergelijkbare elementenboom.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, dat een van de onderstaande oordelen toekent. `survey.ts` bestrijkt
  alleen het `dot`-SVG-spoor.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — de **xdot**-survey per engine (`npx tsx test/corpus/engine-walk.ts <engine>`), die
  dezelfde klassenindeling toepast als de bovenstaande tabel
  (`TOLERANCE = 0.5` voor `neato`/`fdp`/`sfdp`, `0.01` voor elke andere engine)
  en semantische tekenbewerkingsstromen (`compareXdot`) vergelijkt in plaats van SVG. Zo
  worden de sporen `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`
  gemeten; het eigen xdot-spoor van `dot` gebruikt het zusterprogramma
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## De oordelen {#the-verdicts}

De survey kent aan elke graaf precies één oordeel toe. Actuele aantallen per spoor:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
vat elk spoor van engine × oppervlak samen (zowel deterministisch als iteratief);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
is het SVG-dashboard van `dot`, en elke andere engine heeft daarnaast in `test/corpus/`
een eigen dashboard `PARITY-<engine>.md`:

| Oordeel | Betekenis |
|---|---|
| **`conformant`** | Komt volgens de bovenstaande definitie overeen met het orakel (numeriek binnen tolerantie, niet-numeriek exact). |
| **`structural-match`** | Dezelfde elementenboom, maar een of meer numerieke waarden overschrijden de tolerantie. |
| **`diverged`** | De elementenbomen verschillen (een ontbrekend/extra element of een niet-numerieke afwijking). |
| **`errored` / `timeout`** | De port kon de invoer niet renderen (`errored`; `port-error` op de sporen per engine) of overschreed zijn tijdsbudget (`timeout`). Telt als mislukking: wordt meegeteld in de noemer van het slagingspercentage, nooit als geslaagd. |
| **`oracle-error`** | Het C-orakel kon de invoer niet renderen, dus er is geen referentie om mee te vergelijken. Buiten bereik: uitgesloten van de noemer van het slagingspercentage. |

Het **slagingspercentage** op elk dashboard is `conformant / (surveyed − oracle-error)`.

„Conformant” is de lat; „structural-match” is betekenisvolle vooruitgang (juiste vorm,
coördinaten wijken nog af); „diverged”, „errored” en „timeout” zijn echte hiaten.
Geen van deze oordelen beweert byte-voor-byte-gelijke uitvoer.

Sommige grafen krijgen bij een bepaalde engine **helemaal geen oordeel**: zie
*Engine-uitsluitingen* hieronder.

### Engine-uitsluitingen {#engine-exclusions}

Een uitgesloten paar (graaf, engine) wordt niet doorlopen en is dus noch conform noch
afwijkend — het wordt daar simpelweg niet gemeten. Dat verschilt van een geaccepteerde
afwijking, waarbij de vergelijking *wel* heeft plaatsgevonden en het verschil wordt
vergeven met een gedocumenteerde oorzaak.

De lat ligt bewust hoog, omdat een ongecontroleerde graaf een dekkingshiaat is en geen
bekende kostenpost. Een vermelding vereist alle drie: het algoritme van de engine kan
aantoonbaar niet aangrijpen op de invoer, overslaan bespaart echte tijd, en hetzelfde
gedrag is geverifieerd op een goedkoper spoor. *Traag* zijn is uitdrukkelijk niet
voldoende — een slechte port/orakel-verhouding is precies hoe een echt prestatiedefect
eruitziet, en daarop uitsluiten zou juist verbergen waarvoor het corpus bestaat.

Elke uitsluiting is met haar mechanisme vermeld in
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
het register is `test/corpus/engine-exclusions.json`. Het motiverende geval is
`2222`, dat 28.303 knopen en geen kanten declareert: omdat er niets is om met elkaar in
verband te brengen, delegeren alle krachtgestuurde en radiale engines naar de gedeelde
componentenpacker en draait geen van hun eigen algoritmen — bevestigd doordat hun
orakeluitvoer byte-identiek is. `dot` neemt een ander pad en dekt het in zes seconden
conform af.
