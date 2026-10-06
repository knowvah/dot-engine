---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Ordliste

Én definition pr. begreb, i alfabetisk rækkefølge efter det engelske begreb
(overskrifterne står derfor i den engelske rækkefølge). Hver henviser til den
guideside (eller kildekode), der dækker begrebet i dybden.

## Cluster

En delgraf, hvis navn starter med `cluster` (f.eks. `subgraph cluster_build`) —
Graphviz tegner den som en særskilt boks, der grupperer dens medlemsknuder. Internt
giver @knowvah/dot-engines geometri-snapshot hver clusterdelgraf et
positionsbaseret navn som `cluster6` (`ClusterGeometry.name`) i stedet for navnet
fra DOT-kildekoden, så en forbruger, der har brug for det oprindelige navn,
bygger et `idByName`-map før layout og giver bagefter nøglerne i
`snapshot.clusters` nye navne. Se
[Opskrifter](/da/guide/recipes) for mønstret til nye nøgler og
[Byg en graf](/da/guide/build-a-graph) for at oprette clustre via `addSubgraph`.

## Conformance (overensstemmelse)

Den maskinelt kontrollerede egenskab bag påstanden om, at et render fra @knowvah/dot-engine
„matcher“ C-orakelet. Når begge SVG'er er parset til normaliserede elementtræer,
skal hver numerisk værdi (koordinater, stidata, `points`) stemme inden for en fast
tolerance — **±0,01pt** for de deterministiske motorer
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) og **±0,5pt** for de iterative
kraftstyrede motorer (`neato`, `fdp`, `sfdp`) — og hver ikke-numerisk værdi
(tags, farver, tekst) skal være nøjagtigt ens. Det er ikke et krav om
byte-for-byte SVG-output. Se [Overensstemmelse](/da/conformance).

## Coordinate frame / y-axis (koordinatsystem / y-akse)

Graphviz' native koordinatsystem er **y opad**, med origo i nederste venstre
hjørne; browsere og skærme er **y nedad**, med origo i øverste venstre hjørne.
`getLayout` bruger som standard `yAxis: 'down'` (vender hver y og normaliserer
`bounds` til `(0, 0)`) og accepterer `yAxis: 'up'` for at returnere native
graphviz-koordinater uændret. xdot-tegneoperationer (fra `getDrawOps`) er altid i
det native y-opad-system. Se [Læs beregnet geometri](/da/guide/geometry).

## Divergence (afvigelse)

En forskel mellem et render fra @knowvah/dot-engine og orakelet, som er blevet
undersøgt, årsagsanalyseret og katalogiseret — i modsætning til stiltiende at blive
tolereret. Katalogiserede afvigelser falder i én af tre klasser: accepterede
deltaer (bevidst ikke gjort overensstemmende, f.eks. flydende-komma-ikke-determinisme
på tværs af platforme), en sporet lang hale, der stadig lukkes, og
udtrykkelige ikke-mål. En forskel, der ikke står på listen, behandles som en fejl,
ikke som accepteret adfærd. Se [Kendte afvigelser](/da/divergences).

## DOT

Grafbeskrivelsessproget — `digraph { ... }` / `graph { ... }` med
knude-, kant- og attributsætninger — som @knowvah/dot-engine parser, før resultatet
gives videre til en layoutmotor. Se [Kom godt i gang](/da/guide/getting-started).

## Image sizer / resolver (billedmåler / billedopløser)

De to injicerbare snitflader for eksterne billeder (usershape-knuder og
`<IMG>`-celler i HTML-etiketter). En `ImageSizer` rapporterer et billedes naturlige
bredde/højde, så knudestørrelse og etiketlayout kan fortsætte uden at indlæse
pixeldata; en `ImageResolver` leverer de egentlige billedbytes til indlejring ved
rendertidspunktet. Se [Billeder](/da/guide/images).

## Layout engine (layoutmotor)

Én af de otte layoutalgoritmer, @knowvah/dot-engine registrerer, valgt ved navn
(`renderSvg(dot, engine)`): `dot` (hierarkisk/lagdelt), `neato`
(fjedermodel, Kamada–Kawai), `fdp` (kraftstyret), `sfdp` (multiskala
kraftstyret, til store grafer), `circo` (cirkulær), `twopi` (radial),
`osage` (clusteropdelt) og `patchwork` (kvadreret trækort). Se
[Layoutmotorer](/da/guide/engines).

## Oracle (orakel)

Den native C-Graphviz-binær `dot`, bygget fra den kanoniske C-kildekode, som hvert
render fra @knowvah/dot-engine valideres mod. @knowvah/dot-engine starter denne
binær direkte (aldrig en WASM-build) for at undgå ABI-drift mellem
referencen og porteringen. Se [Overensstemmelse](/da/conformance) og
[Paritet](/parity) for, hvordan orakelsammenligninger køres og rapporteres.

## Rank / rankdir

I `dot`s hierarkiske layout er en **rank** et lag af knuder placeret på samme
dybde i tegningen. `rankdir` angiver den retning, ranks løber i — standarden
`TB` (top til bund), eller `LR`, `BT`, `RL` — angivet som en grafattribut
(`b.setAttr('rankdir', 'LR')`). Se [Byg en graf](/da/guide/build-a-graph).

## Spline / edge routing (spline / kantføring)

Den buede (Bézier-)sti, en kant tegnes langs, beregnet af føringskode, der styrer
udenom knude- og clusterhindringer. @knowvah/dot-engine eksponerer de
førte kontrolpunkter som `EdgeGeometry.points` — et ordnet array af
`{x, y}`-punkter, i points — fra `getLayout`. Se
[Læs beregnet geometri](/da/guide/geometry).

## Text measurer (tekstmåler)

Den injicerbare snitflade (`TextMeasurer`), der rapporterer etiketters bredde/højde,
så størrelsesberegning af knuder og kantetiketter kan fortsætte før layout.
@knowvah/dot-engine finder automatisk én pr. render — først en eksplicit
`setTextMeasurer`, derefter browserens `<canvas>`, hvis den findes, derefter den
indbyggede deterministiske `EstimateTextMeasurer` i Node — eller accepterer en
egen implementering. Se [Tekstmåling](/da/guide/text-measurement).

## Usershape

Graphviz' betegnelse for en knude, hvis form er et eksternt leveret billede
(via attributten `image`) frem for en tegnet polygon eller ellipse.
@knowvah/dot-engine opløser usershapes gennem den injicerbare billedmåler/-opløser-snitflade
frem for at læse filer direkte, hvilket holder biblioteket browsersikkert.
Se [Billeder](/da/guide/images).

## xdot

Det udvidede DOT-format for tegneoperationer: en struktureret strøm af operationer
(sæt fyld-/stregfarve, sæt skrifttype, fyld/streg en ellipse eller polygon, tegn en
Bézier, tegn tekst), der beskriver præcis, hvordan en renderet graf skal
males, i malerrækkefølge. `getDrawOps` returnerer denne strøm som typede `XdotOp`-værdier
til at drive en egen renderer (canvas, WebGL, PDF) uden at parse
SVG. Se [Egen rendering med xdot-tegneoperationer](/da/guide/xdot-drawops).
