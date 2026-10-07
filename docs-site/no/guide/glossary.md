---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Ordliste

Én definisjon per begrep, i alfabetisk rekkefølge etter det engelske begrepet (derfor står overskriftene i samme rekkefølge som på den engelske siden). Hver av dem lenker til veiledningssiden (eller
kildekoden) som dekker begrepet i dybden.

## Klynge

Et delgraf hvis navn starter med `cluster` (f.eks. `subgraph cluster_build`) —
Graphviz tegner den som en egen boks som grupperer medlemsnodene. Internt gir
@knowvah/dot-engines geometri-øyeblikksbilde hver klyngedelgraf et posisjonsbasert
navn som `cluster6` (`ClusterGeometry.name`) i stedet for navnet fra
DOT-kildekoden, så en forbruker som trenger det opprinnelige navnet bygger et
`idByName`-kart før layout og gir `snapshot.clusters` nye nøkler etterpå. Se
[Oppskrifter](/no/guide/recipes) for mønsteret med nye nøkler og
[Bygg en graf](/no/guide/build-a-graph) for å lage klynger via `addSubgraph`.

## Samsvar

Den maskinelt kontrollerte egenskapen bak påstanden om at en @knowvah/dot-engine-rendering
«samsvarer» med C-orakelet. Etter at begge SVG-ene er parset til normaliserte
elementtrær, må hver numeriske verdi (koordinater, stidata, `points`) stemme
innenfor en fast toleranse — **±0,01 pt** for de deterministiske motorene
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) og **±0,5 pt** for de
iterative kraftbaserte motorene (`neato`, `fdp`, `sfdp`) — og hver
ikke-numeriske verdi (tagger, farger, tekst) må være nøyaktig lik. Det er ikke
en påstand om byte-for-byte-lik SVG-utdata. Se [Samsvar](/no/conformance).

## Koordinatramme / y-akse

Graphviz' native koordinatsystem er **y-opp**, med origo i nedre venstre
hjørne; nettlesere og skjermer er **y-ned**, med origo i øvre venstre hjørne.
`getLayout` har `yAxis: 'down'` som standard (snur hver y og normaliserer
`bounds` til `(0, 0)`) og godtar `yAxis: 'up'` for å returnere native Graphviz-koordinater
uendret. xdot-tegneoperasjoner (fra `getDrawOps`) er alltid i den
native y-opp-rammen. Se [Les beregnet geometri](/no/guide/geometry).

## Avvik

En forskjell mellom en @knowvah/dot-engine-rendering og orakelet som er
undersøkt, rotårsaksanalysert og katalogisert — i motsetning til å bli stilltiende
tolerert. Katalogiserte avvik faller i én av tre klasser: godtatte
deltaer (bevisst ikke gjort samsvarende, f.eks. ikke-determinisme i flyttall
på tvers av plattformer), en sporet lang hale som fortsatt lukkes, og
uttrykkelige ikke-mål. En forskjell som ikke er oppført, regnes som en feil, ikke som
godtatt oppførsel. Se [Kjente avvik](/no/divergences).

## DOT

Grafbeskrivelsesspråket — `digraph { ... }` / `graph { ... }` med
setninger for noder, kanter og attributter — som @knowvah/dot-engine parser før
resultatet gis videre til en layoutmotor. Se [Komme i gang](/no/guide/getting-started).

## Bildemåler / bildeløser

De to injiserbare koblingspunktene for eksterne bilder (usershape-noder og `<IMG>`-celler
i HTML-etiketter). En `ImageSizer` rapporterer et bildes naturlige bredde/høyde slik at
nodestørrelse og etikettlayout kan gå videre uten å laste pikseldata; en
`ImageResolver` leverer de faktiske bildebytene som bygges inn ved renderingstidspunktet.
Se [Bilder](/no/guide/images).

## Layoutmotor

En av de åtte layoutalgoritmene @knowvah/dot-engine registrerer, valgt ved navn
(`renderSvg(dot, engine)`): `dot` (hierarkisk/lagdelt), `neato`
(fjærmodell, Kamada–Kawai), `fdp` (kraftbasert), `sfdp` (flerskala
kraftbasert, for store grafer), `circo` (sirkulær), `twopi` (radial),
`osage` (klyngebasert) og `patchwork` (squarified treemap). Se
[Layoutmotorer](/no/guide/engines).

## Orakel

Den innebygde C-binærfilen for Graphviz `dot`, bygget fra den kanoniske C-kildekoden,
som hver @knowvah/dot-engine-rendering valideres mot. @knowvah/dot-engine starter denne
binærfilen direkte (aldri en WASM-bygging) for å unngå ABI-drift mellom
referansen og porteringen. Se [Samsvar](/no/conformance) og
[Paritet](/parity) for hvordan orakelsammenligningene kjøres og rapporteres.

## Rank / rankdir

I `dot`s hierarkiske layout er en **rank** et lag av noder plassert på samme
dybde i tegningen. `rankdir` setter retningen ranker flyter i — standard
`TB` (topp til bunn), eller `LR`, `BT`, `RL` — satt som et grafattributt
(`b.setAttr('rankdir', 'LR')`). Se [Bygg en graf](/no/guide/build-a-graph).

## Spline / kantruting

Den kurvede (Bézier-)stien en kant tegnes langs, beregnet av rutingkode
som styrer utenom node- og klyngehindringer. @knowvah/dot-engine eksponerer de
rutede kontrollpunktene som `EdgeGeometry.points` — en ordnet tabell med
`{x, y}`-punkter, i punkter — fra `getLayout`. Se
[Les beregnet geometri](/no/guide/geometry).

## Tekstmåler

Det injiserbare koblingspunktet (`TextMeasurer`) som rapporterer bredde/høyde på etiketter slik at
størrelsen på noder og kantetiketter kan fastsettes før layout. @knowvah/dot-engine velger én
automatisk per rendering — først en eksplisitt `setTextMeasurer`, deretter
nettleserens `<canvas>` hvis den finnes, deretter den innebygde deterministiske
`EstimateTextMeasurer` i Node — eller godtar en egen implementasjon. Se
[Tekstmåling](/no/guide/text-measurement).

## Usershape

Graphvizs begrep for en node hvis form er et eksternt levert bilde
(via attributtet `image`) i stedet for en tegnet polygon eller ellipse.
@knowvah/dot-engine løser usershapes via det injiserbare koblingspunktet for bildemåler/-løser
i stedet for å lese filer direkte, slik at biblioteket forblir nettlesersikkert.
Se [Bilder](/no/guide/images).

## xdot

Det utvidede DOT-formatet for tegneoperasjoner: en strukturert strøm av operasjoner (sett
fyll-/strekfarge, sett font, fyll/strek en ellipse eller polygon, tegn en
Bézier-kurve, tegn tekst) som beskriver nøyaktig hvordan en rendret graf skal
males, i malerekkefølge. `getDrawOps` returnerer denne strømmen som typede `XdotOp`-verdier
for å drive en egen renderer (canvas, WebGL, PDF) uten å parse
SVG. Se [Egen rendering med xdot-tegneoperasjoner](/no/guide/xdot-drawops).
