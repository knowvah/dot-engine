---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Ordlista

En definition per term, i alfabetisk ordning efter den engelska termen (rubrikerna
behåller alltså den engelska ordningen). Varje term länkar till guidesidan (eller
källkoden) som behandlar den på djupet.

## Kluster {#cluster}

En delgraf vars namn börjar med `cluster` (t.ex. `subgraph cluster_build`) —
Graphviz ritar den som en egen ruta som grupperar dess medlemsnoder. Internt
ger @knowvah/dot-engines geometriska ögonblicksbild varje klusterdelgraf
ett positionsbaserat namn som `cluster6` (`ClusterGeometry.name`) i stället för namnet
i DOT-källkoden, så en konsument som behöver det ursprungliga namnet bygger en
`idByName`-karta före layouten och byter nycklar på `snapshot.clusters` efteråt. Se
[Receptsamling](/sv/guide/recipes) för mönstret för nyckelbyte och
[Bygg en graf i kod](/sv/guide/build-a-graph) för att skapa kluster via `addSubgraph`.

## Överensstämmelse {#conformance}

Den maskinellt kontrollerade egenskapen bakom påståendet att en rendering från @knowvah/dot-engine
”matchar” C-oraklet. Efter att båda SVG-filerna har tolkats till normaliserade
elementträd måste varje numeriskt värde (koordinater, banuppgifter, `points`)
överensstämma inom en fast tolerans — **±0,01 pt** för de deterministiska motorerna
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) och **±0,5 pt** för de
iterativa kraftstyrda motorerna (`neato`, `fdp`, `sfdp`) — och varje
icke-numeriskt värde (taggar, färger, text) måste vara exakt lika. Det är inte ett
påstående om SVG-utdata byte för byte. Se [Överensstämmelse](/sv/conformance).

## Koordinatsystem / y-axel {#coordinate-frame}

Graphviz inbyggda koordinatsystem har **y uppåt** med origo i nedre vänstra
hörnet; webbläsare och skärmar har **y nedåt** med origo uppe till vänster.
`getLayout` använder som standard `yAxis: 'down'` (vänder varje y och normaliserar
`bounds` till `(0, 0)`) och accepterar `yAxis: 'up'` för att returnera ursprungliga
Graphviz-koordinater oförändrade. Ritoperationer i xdot (från `getDrawOps`) ligger alltid i det
ursprungliga koordinatsystemet med y uppåt. Se [Läs beräknad geometri](/sv/guide/geometry).

## Avvikelse {#divergence}

En skillnad mellan en rendering från @knowvah/dot-engine och oraklet som har
undersökts, rotorsaksanalyserats och katalogiserats — i motsats till att tyst
tolereras. Katalogiserade avvikelser tillhör en av tre klasser: godtagna
skillnader (medvetet inte gjorda överensstämmande, t.ex. plattformsoberoende
indeterminism i flyttal), en spårad lång svans som fortfarande stängs och
uttryckliga icke-mål. En skillnad som inte finns i listan behandlas som en defekt, inte som
godtaget beteende. Se [Kända avvikelser](/sv/divergences).

## DOT {#dot}

Grafbeskrivningsspråket — `digraph { ... }` / `graph { ... }` med
sats för noder, kanter och attribut — som @knowvah/dot-engine tolkar innan det
lämnar resultatet till en layoutmotor. Se [Kom igång](/sv/guide/getting-started).

## Bildmätare / bildhämtare {#image-sizer-resolver}

De två injicerbara kopplingspunkterna för externa bilder (usershape-noder och `<IMG>`-celler i
HTML-etiketter). En `ImageSizer` rapporterar en bilds naturliga bredd/höjd så att
nodstorlek och etikettlayout kan fortsätta utan att pixeldata läses in; en
`ImageResolver` levererar själva bildbytena för infogning vid renderingstillfället.
Se [Arbeta med bilder](/sv/guide/images).

## Layoutmotor {#layout-engine}

En av de åtta layoutalgoritmer som @knowvah/dot-engine registrerar, vald med namn
(`renderSvg(dot, engine)`): `dot` (hierarkisk/lagerindelad), `neato`
(fjädermodell, Kamada–Kawai), `fdp` (kraftstyrd), `sfdp` (flerskalig
kraftstyrd, för stora grafer), `circo` (cirkulär), `twopi` (radiell),
`osage` (klustrad) och `patchwork` (kvadrerad träddiagramskarta). Se
[Layoutmotorer](/sv/guide/engines).

## Orakel {#oracle}

Den inbyggda C-binären för Graphviz `dot`, byggd från den kanoniska C-källkoden, som
varje rendering från @knowvah/dot-engine valideras mot. @knowvah/dot-engine startar denna
binär direkt (aldrig ett WASM-bygge) för att undvika ABI-drift mellan
referensen och porten. Se [Överensstämmelse](/sv/conformance) och
[Paritet](/parity) för hur orakeljämförelser körs och rapporteras.

## Rang / rankdir {#rank-rankdir}

I `dot`s hierarkiska layout är en **rang** (rank) ett lager av noder som placeras på
samma djup i ritningen. `rankdir` anger i vilken riktning rangerna löper — standardvärdet
`TB` (uppifrån och ned), eller `LR`, `BT`, `RL` — och sätts som ett grafattribut
(`b.setAttr('rankdir', 'LR')`). Se [Bygg en graf i kod](/sv/guide/build-a-graph).

## Spline / kantdragning {#spline-edge-routing}

Den kurvade (Bézier-)bana som en kant ritas längs, beräknad av dragningskod
som styr runt hinder i form av noder och kluster. @knowvah/dot-engine exponerar de
dragna kontrollpunkterna som `EdgeGeometry.points` — en ordnad array av
`{x, y}`-punkter, i punkter — från `getLayout`. Se
[Läs beräknad geometri](/sv/guide/geometry).

## Textmätare {#text-measurer}

Den injicerbara kopplingspunkten (`TextMeasurer`) som rapporterar etikettens bredd/höjd så att
storleksberäkningen för noder och kantetiketter kan ske före layouten. @knowvah/dot-engine väljer en
automatiskt vid varje rendering — först en uttrycklig `setTextMeasurer`, sedan
webbläsarens `<canvas>` om den finns, sedan den inbyggda deterministiska
`EstimateTextMeasurer` i Node — eller tar emot en egen implementation. Se
[Textmätning](/sv/guide/text-measurement).

## Usershape {#usershape}

Graphviz term för en nod vars form är en externt tillhandahållen bild
(via attributet `image`) i stället för en ritad polygon eller ellips.
@knowvah/dot-engine löser usershapes via den injicerbara kopplingspunkten för bildmätare/bildhämtare
i stället för att läsa filer direkt, vilket håller biblioteket webbläsarsäkert.
Se [Arbeta med bilder](/sv/guide/images).

## xdot {#xdot}

Formatet för utökade DOT-ritoperationer: en strukturerad ström av operationer (sätt
fyllnads-/linjefärg, sätt typsnitt, fyll/dra en ellips eller polygon, rita en
Bézier-kurva, rita text) som beskriver exakt hur en renderad graf ska
målas, i målningsordning. `getDrawOps` returnerar denna ström som typade
`XdotOp`-värden för att driva en egen renderare (canvas, WebGL, PDF) utan att tolka
SVG. Se [Egen rendering med xdot](/sv/guide/xdot-drawops).
