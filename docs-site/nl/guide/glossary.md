---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Woordenlijst

Eén definitie per term, alfabetisch volgens de Engelse term (de volgorde van de koppen is dus
die van de Engelse pagina). Elke verwijst naar de handleidingpagina (of de broncode) die de term
uitvoerig behandelt.

## Cluster

Een subgraaf waarvan de naam met `cluster` begint (bijv. `subgraph cluster_build`) —
Graphviz tekent hem als een eigen kader dat zijn lidknopen groepeert. Intern
geeft de geometrische momentopname van @knowvah/dot-engine elke clustersubgraaf
een positionele naam zoals `cluster6` (`ClusterGeometry.name`) in plaats van de naam
uit de DOT-broncode. Wie de oorspronkelijke naam nodig heeft, bouwt vóór de lay-out een
`idByName`-map op en geeft daarna de sleutels van `snapshot.clusters` opnieuw toe. Zie
[Recepten](/nl/guide/recipes) voor het patroon om sleutels opnieuw toe te kennen en
[Een graaf bouwen in code](/nl/guide/build-a-graph) voor het aanmaken van clusters via `addSubgraph`.

## Conformiteit

De machinaal gecontroleerde eigenschap achter de bewering dat een rendering van
@knowvah/dot-engine "overeenkomt" met het C-orakel. Nadat beide SVG's tot genormaliseerde
elementenbomen zijn geparsed, moet elke numerieke waarde (coördinaten, paddata, `points`)
binnen een vaste tolerantie overeenkomen — **±0,01 pt** bij de deterministische
engines (`dot`, `circo`, `twopi`, `osage`, `patchwork`) en **±0,5 pt** bij de iteratieve
krachtgestuurde engines (`neato`, `fdp`, `sfdp`) — en elke niet-numerieke waarde (tags,
kleuren, tekst) moet exact gelijk zijn. Het is geen claim van byte-voor-byte gelijke
SVG-uitvoer. Zie [Conformiteit](/nl/conformance).

## Coördinatenstelsel / y-as

Het native coördinatenstelsel van Graphviz is **y-omhoog** met de oorsprong in de
linkeronderhoek; browsers en schermen zijn **y-omlaag** met de oorsprong linksboven.
`getLayout` gebruikt standaard `yAxis: 'down'` (spiegelt elke y en normaliseert
`bounds` naar `(0, 0)`) en accepteert `yAxis: 'up'` om native Graphviz-coördinaten
ongewijzigd terug te geven. xdot-tekenbewerkingen (uit `getDrawOps`) staan altijd in het native
y-omhoog-coördinatenstelsel. Zie [Berekende geometrie uitlezen](/nl/guide/geometry).

## Afwijking

Een verschil tussen een rendering van @knowvah/dot-engine en het orakel dat
is onderzocht, tot zijn oorzaak is herleid en is gecatalogiseerd — in tegenstelling tot een
stilzwijgend getolereerd verschil. Gecatalogiseerde afwijkingen vallen in een van drie
klassen: geaccepteerde delta's (bewust niet conform gemaakt, bijv. platformoverschrijdend
drijvendekomma-non-determinisme), een gevolgde lange staart die nog wordt gedicht, en
uitdrukkelijke niet-doelen. Een niet-vermeld verschil geldt als defect, niet als
geaccepteerd gedrag. Zie [Bekende afwijkingen](/nl/divergences).

## DOT

De graafbeschrijvingstaal — `digraph { ... }` / `graph { ... }` met knoop-, kant-
en attribuutstatements — die @knowvah/dot-engine parseert voordat het resultaat aan een
lay-out-engine wordt doorgegeven. Zie [Aan de slag](/nl/guide/getting-started).

## Image sizer / resolver

De twee injecteerbare koppelpunten voor externe afbeeldingen (usershape-knopen en
`<IMG>`-cellen in HTML-labels). Een `ImageSizer` meldt de natuurlijke breedte/hoogte van een
afbeelding, zodat knoopafmetingen en label-lay-out kunnen worden bepaald zonder pixeldata te laden;
een `ImageResolver` levert tijdens het renderen de eigenlijke afbeeldingsbytes om
in te sluiten. Zie [Afbeeldingen](/nl/guide/images).

## Lay-out-engine

Een van de acht lay-outalgoritmen die @knowvah/dot-engine registreert en die op naam
worden gekozen (`renderSvg(dot, engine)`): `dot` (hiërarchisch/gelaagd), `neato`
(veermodel, Kamada–Kawai), `fdp` (krachtgestuurd), `sfdp` (multischaal krachtgestuurd, voor
grote grafen), `circo` (cirkelvormig), `twopi` (radiaal), `osage` (geclusterd) en
`patchwork` (squarified treemap). Zie [Lay-out-engines](/nl/guide/engines).

## Orakel

De native C-Graphviz-binary `dot`, gebouwd uit de canonieke C-broncode, waartegen elke
rendering van @knowvah/dot-engine wordt gevalideerd. @knowvah/dot-engine start deze
binary rechtstreeks (nooit een WASM-build), om ABI-drift tussen referentie en port
te voorkomen. Zie [Conformiteit](/nl/conformance) en [Pariteit](/parity) voor hoe
orakelvergelijkingen worden uitgevoerd en gerapporteerd.

## Rank / rankdir

In de hiërarchische lay-out van `dot` is een **rank** een laag knopen die in de
tekening op dezelfde diepte staan. `rankdir` bepaalt de richting waarin de ranks
lopen — standaard `TB` (van boven naar beneden) of `LR`, `BT`, `RL` — en wordt als
grafattribuut ingesteld (`b.setAttr('rankdir', 'LR')`). Zie
[Een graaf bouwen in code](/nl/guide/build-a-graph).

## Spline / kantroutering

Het gekromde (Bézier-)pad waarlangs een kant wordt getekend, berekend door
routeringscode die knoop- en clusterobstakels ontwijkt. @knowvah/dot-engine stelt
de gerouteerde controlepunten via `getLayout` beschikbaar als `EdgeGeometry.points` — een
geordende array van `{x, y}`-punten, in punten. Zie
[Berekende geometrie uitlezen](/nl/guide/geometry).

## Tekstmeter

Het injecteerbare koppelpunt (`TextMeasurer`) dat de breedte/hoogte van labels meldt, zodat
knoop- en kantlabelafmetingen vóór de lay-out kunnen worden bepaald.
@knowvah/dot-engine bepaalt per rendering automatisch een tekstmeter — eerst een expliciete
`setTextMeasurer`, dan de `<canvas>` van de browser indien aanwezig, dan in Node de
ingebouwde deterministische `EstimateTextMeasurer` — of accepteert een eigen
implementatie. Zie [Tekstmeting](/nl/guide/text-measurement).

## Usershape

De Graphviz-term voor een knoop waarvan de vorm een extern aangeleverde afbeelding is
(via het attribuut `image`) in plaats van een getekende polygoon of ellips.
@knowvah/dot-engine lost usershapes op via het injecteerbare image-sizer-/resolver-koppelpunt
in plaats van bestanden rechtstreeks te lezen, en blijft zo browserveilig. Zie
[Afbeeldingen](/nl/guide/images).

## xdot

Het uitgebreide DOT-drawop-formaat: een gestructureerde stroom van bewerkingen (vul-/
lijnkleur instellen, lettertype instellen, een ellips of polygoon vullen/tekenen, een
Bézier tekenen, tekst tekenen) die in schilderrichting precies beschrijft hoe een
gerenderde graaf moet worden geschilderd. `getDrawOps` geeft deze stroom terug als getypeerde
`XdotOp`-waarden om een eigen renderer (canvas, WebGL, PDF) aan te sturen zonder SVG te parsen.
Zie [Eigen rendering met xdot-tekenbewerkingen](/nl/guide/xdot-drawops).
