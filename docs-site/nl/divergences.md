---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bekende afwijkingen van C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine streeft naar de grootst mogelijke getrouwheid aan de canonieke
C-implementatie. De C-broncode is de specificatie; een niet-vermeld verschil wordt
behandeld als een defect, niet als geaccepteerd gedrag.

> **Wat „overeenkomen” hier betekent.** Het corpus-pariteitsoordeel met de naam
> `conformant` is een **strakke deterministische tolerantie**, *niet* letterlijke
> byte-voor-byte-gelijkheid van de SVG: numerieke coördinaten en paden moeten binnen
> **±0.01** overeenkomen en alle niet-numerieke inhoud (tags, kleuren, tekst) moet
> exact gelijk zijn (`compareSvg(…, 'deterministic')`). In dit hele document verwijzen
> „overeenkomen” en „conform” naar dat toleranties-oordeel. Volledige definitie:
> [Conformiteit](./conformance.md).

Waar de uitvoer *wel* verschilt, valt dat in precies een van drie klassen:

1. **Geaccepteerde afwijkingen** — verschillen die we hebben onderzocht, tot op de
   grondoorzaak begrijpen en **bewust niet conform hebben gemaakt**. Elk is begrensd,
   gekarakteriseerd en hieronder gerechtvaardigd. Dit zijn geen bugs en ze worden niet
   „verholpen” zonder een specifieke, afzonderlijk afgebakende reden.
2. **Gevolgde long tail** — bekende hiaten die *wel* worden gedicht, elk met een
   door het orakel vastgepinde oplossing. Deze staan met actuele aantallen in
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Niet-doelen** — bewuste afbakeningen van de scope (formaten en mechanismen die we
   nooit hebben willen reproduceren).

De gezaghebbende, continu bijgewerkte registers zijn
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(pariteitsdashboard per invoer t.o.v. native `dot`) en
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventaris van de port-status op algoritmeniveau).

De **machineleesbare** bron van waarheid over welke grafen *geaccepteerd* zijn (klasse 1
hieronder) is
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
De tooling voegt die samen bij het genereren van het rapport: `PARITY-dot.md` scheidt
**geaccepteerde afwijkingen** van de **gevolgde** backlog, en de regels-gate haalt zijn
toelatingslijst eruit. De proza-secties hieronder lichten elke vermelding toe (A1 en A3
zijn actueel; A2 is gesloten en bewaard als geschiedenis); een CI-test
(`accepted-divergences.test.ts`) dwingt af dat elke geaccepteerde graaf nog steeds
afwijkt, zodat deze lijst niet ongemerkt kan verouderen.

---

## Geaccepteerde afwijkingen (we maken ze bewust niet conform) {#accepted-deltas-we-deliberately-do-not-make-conformant}

We accepteren een afwijking — in plaats van byte-pariteit na te jagen — alleen als **aan
alles** hieronder is voldaan:

- De grondoorzaak is een **portabiliteitsbeperking** (iets wat de JavaScript-/
  browser-runtime niet exact kan reproduceren), geen logische fout in de port.
- Het verschil is **niet waarneembaar** en aantoonbaar **begrensd**.
- Een oplossing zou **onevenredig veel kosten en een onevenredig grote impact** hebben ten
  opzichte van de opbrengst (typisch: ze zou een gedeeld primitief raken dat door honderden
  reeds conforme grafen wordt gebruikt, met regressierisico's voor winst van een fractie
  van een pixel).

Wanneer we een afwijking accepteren, karakteriseren we haar hier, zodat gebruikers nooit
voor verrassingen komen te staan. Grafen die door een geaccepteerde afwijking worden
geraakt, worden gevalideerd tegen een **structurele/tolerantie**-lat in plaats van een
byte-lat.

### A1. Drijvendekomma-determinisme (krachtgestuurde engines) {#a1-floating-point-determinism-force-directed-engines}

**Getroffen:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (de iteratieve,
veermodel-engines). De *lay-out* van de `dot`-engine wordt **niet** getroffen door dit
iteratieve-model-determinisme; een afzonderlijke, nauw begrensde drijvendekomma-afwijking
in de spline-routering van `dot` wordt hieronder behandeld onder **A3**.

> **Reikwijdte, historisch een ongemeten kanttekening — nu gedeeltelijk gemeten.** De
> **hoofd-SVG-survey van de dot-engine** (`test/corpus/survey.ts`) is nog steeds
> **alleen voor dot**: het native orakel draait onder `GVBINDIR=/tmp/ghl`, dat
> **alleen** de plug-ins `core` + `dot_layout` symlinkt
> (`test/corpus/gen-headless-gvbindir.sh` doorloopt precies `core dot_layout`
> — er is geen lay-outplug-in voor `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`
> aanwezig), en zowel orakel als port worden met de `dot`-engine aangeroepen. Corpus-id's
> als `*_neato` / `*_circo` / `root_twopi` zijn in die survey dus *bestandsnamen* die met
> `dot` zijn ingedeeld, niet met hun native engine, en A1 raakt daar **nul**
> grafen — niet omdat de engines bewezen conform zijn, maar omdat die specifieke survey
> ze nooit gebruikt.
>
> **Maar alle zes de A1-engines hebben nu hun eigen survey met de native engine**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (onafhankelijk van `GVBINDIR` —
> elk start rechtstreeks `dot -K <engine> -Txdot`), op twee verschillende
> striktheidsniveaus die hieronder apart worden beschreven: `circo`/`twopi`/`osage` draaien
> op dezelfde **deterministische tolerantie van ±0.01** als de dot-survey met
> grondoorzaakanalyse per id („Engine-spoor-acceptatie” hieronder); `neato`/`fdp`/`sfdp`
> draaien op een ruimere **karakteriseringstolerantie van ±0.5** en nog zonder analyse per
> id („Karakterisering van de iteratieve engines” hieronder). Actuele cijfers over alle
> engines heen:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Karakterisering.** Deze engines voeren iteratieve numerieke lay-outs uit waarvan de
resultaten afhangen van drijvendekomma-afronding — in het bijzonder fused multiply-add
(FMA) en `Math.pow`, die per JavaScript-engine en CPU-architectuur kunnen verschillen. De
port volgt de bewerkingsvolgorde van C waar dat kan (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — bijv. komt `sfdp` met een overeenkomende PRNG en `fma` op ~6
significante cijfers overeen met het native orakel — maar exacte reproductie met
identieke coördinaten is **niet gegarandeerd over platforms heen**. De topologie blijft
behouden; de mogelijke afwijking zit in de fijne knoopcoördinaten.

**Waarom geaccepteerd.** Dit is een harde beperking van het draaien in JS, geen
ontwerpkeuze — uit dezelfde familie als de Apple-`hypot`-gevoeligheid van A3. Er is geen
manier om bit-identieke resultaten van transcendente functies/FMA over alle doel-runtimes
te garanderen, dus een byte-lat zou ontestbaar zijn in plaats van alleen duur. Om A1 te
**beoordelen** (in plaats van er alleen een kanttekening bij te maken) was een apart
pariteitsspoor met de native engine nodig — op 2026-07-11 gebouwd als
`test/corpus/engine-walk.ts` + `parity-report.ts`, dat elke invoer onder zijn eigen engine
doorlicht in plaats van onder `dot`. Het eerlijke plafond van dat werk is A1 te
**beperken** tot „geen actieve afwijking op het referentieplatform”, nooit om de
kanttekening over platforms heen weg te nemen; de resultaten tot nu toe (hieronder)
blijven binnen dat plafond: `circo`/`twopi`/`osage` hebben elk een handvol echte
A1/A9-gevallen blootgelegd en tot de grondoorzaak herleid, en `neato`/`fdp`/`sfdp` zitten
nu op 90.8/77.5/68.0% binnen 0.5pt van native over het universum van 910 items, wat
betekent dat de geporteerde rekenkunde (`fma.ts`, `arm-pow.ts`, overeenkomende PRNG) voor
de meeste grafen standhoudt — en elk resterend afwijkend id wordt afzonderlijk door
injectie toegeschreven (solverdrift vs. portdefect) in plaats van als niet-geanalyseerde
drift te worden achtergelaten; zie de karakterisering van de iteratieve engines hieronder.

**Engine-spoor-acceptatie: twopi-pijlenfamilie.** <a id="a1-twopi-arrows-family"></a>
De bovenstaande blockquote beschrijft de SVG-survey van de dot-engine, waar A1 nul
grafen raakt; het afzonderlijke **xdot-enginespoor** van `twopi` (`parity-twopi.json`,
native `dot -K twopi -Txdot`-orakel, `test/corpus/engine-walk.ts`) draait *wel* onder
zijn native engine en legt een concreet, geverifieerd A1-geval bloot bij 9 corpus-id's:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
en (toegevoegd 2026-07-28, nieuw in het universum van 905 items) de directed/-zus
`tree-graphs-directed-oldarrows` — elk afwijkend op één dominante kant
(`Z->I` of `i->Z`; 12–64 draw-op-verschillen). Injectie-A/B (beslissingsjournaal, 2026-07-10, vermelding „injection A/B verdicts:
twopi arrows family EXONERATED...”) bewees het mechanisme rechtstreeks:
het dumpen van de `ND_pos` bij binnenkomst in de native `spline_edges` en dat injecteren
in `splineEdgesShifted` van de port levert **volledig conforme** uitvoer op
`graphs-arrows` (`Z->I` wordt byte-identiek aan het orakel, dezelfde spline van 7/14
punten) — de afwijking is dus voor 100% knooppositiedrift vóór de routering, afkomstig uit
de PRISM-overlapverwijderingssolver van `twopi`, en de spline-routering/-uitvoer van de
port is vrijgesproken. Het zichtbare symptoom bij 6 van de 8 id's is een omslag van het
aantal bezierpunten (`unfilled_bezier[ptCount]: 8 vs 14`): het aantal passtukken van
`Proutespline` is gevoelig voor aan welke kant van een obstakelgrens de afgedreven
knooppositie terechtkomt, zodat een positieverschil onder één ULP stroomafwaarts van de
iteratieve PRISM-oplossing het aantal segmenten van de gefitte spline laat omslaan (de
andere 2 id's, `graphs-arrowsize`/`nshare-arrows_dot`, tonen dezelfde drift als een kleiner
verschil in alleen positie, zonder omslag van het aantal passtukken). Geaccepteerd op
enginespoor-niveau via `test/corpus/accepted-divergences-engines.json`, door
`parity-report.ts` samengevoegd in `PARITY-twopi.md` — dezelfde samenvoeging die
`accepted.ts` uitvoert voor het dot-spoor `PARITY-dot.md`.

De `oldarrows`-RCA (2026-07-28) wees de exacte omslagplek van het
puntaantal-symptoom van de familie aan. Zijn `i`–`Z`–`I`-waaier ligt collineair op een
ringdiameter, en de `intersect()` van pathplan-`directVis` blokkeert een zichtlijn wanneer
een obstakelhoekpunt „op” het segment ligt — waarbij de collineariteitstolerantie van 1e-4
in `wind()` zelfs een knoop op 270pt van het segment als collineair laat tellen, en
`inBetween()` (dat collineariteit aanneemt) vervolgens degenereert tot het testen van
alleen de **x-projectie**: het hoekpunt blokkeert dan en slechts dan als zijn x strikt
binnen het ULP-brede interval tussen de x-coördinaten van de twee eindpunten valt. Welke
van de twee gespiegelde radiale kanten buigt, hangt dus af van de ULP-volgorde van drie
nominaal gelijke x-waarden uit de PRISM-oplossing — C buigt `Z->I` (het asvertex van
knoop `i` valt binnen zijn interval), de port buigt `i->Z` (het vertex van knoop `I` valt
binnen zijn eigen interval). Het offline nabootsen van `directVis` op de gedumpte
obstakelverzameling van elke kant reproduceert de beslissing van elke kant exact, en het
injecteren van de pre-routerings-`ND_pos` van het orakel in de port levert 0 verschillen
op (`attribution-twopi.json`) — routering en uitvoer zijn byte-getrouw.

`1855` is de radiale/ster-**spiegel**variant van hetzelfde pre-routerings-FP-mechanisme
van PRISM (geaccepteerd 2026-07-11): zijn 31 bladeren liggen exact op één cirkel, zodat de
sterlay-out spiegelsymmetrisch is en de overlapverwijdering van PRISM op een
symmetrie-instabiel evenwicht zit; een verschil van 1 ULP tussen V8 en libm in `cos`/`sin`
bij 5 bladhoeken in `setAbsolutePos` van `circleLayout` kiest het tegenovergestelde
spiegelbassin, en de hele radiale lay-out landt als de exacte x-spiegel van die van het
orakel (maximale knoopverplaatsing 6.04pt, bb behouden). Injectie-A/B bewees beide
richtingen: de exacte `circleLayout`-posities van C in de PRISM van de port voeren
reproduceert het orakel knoop voor knoop (3e-14), en alleen de 5 ULP-afwijkende
bladposities terugzetten laat de hele lay-out terugslaan naar de spiegel van de port.
Volledige RCA: `.agent-notes/twopi-radial-drift-rca.md` (beslissingsjournaal
2026-07-11).

**Karakterisering van de iteratieve engines: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Anders dan de enginesporen `circo`/`twopi`/`osage` hierboven zijn `neato`/`fdp`/`sfdp`
nog **niet** per id geanalyseerd — `engine-walk.ts` legt voor deze drie een veld
`tolerance: 0.5` vast en `parity-report.ts` toont ze in een aparte sectie
„Iteratieve engines (karakterisering ±0.5)” van
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
uitdrukkelijk **niet** vergelijkbaar met de deterministische slagingspercentages van ±0.01
elders in dit document. Actuele aantallen (universum van 910 items; het slagings-% laat
invoer weg die het C-orakel niet kan renderen, volgens [Conformiteit](./conformance.md)):

| engine | surveyed | binnen ±0.5pt | niet-conform (allemaal toegeschreven, geaccepteerd) | port-fout / timeout | orakelfout |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(De eerste sweep, 2026-07-11 bij 762 items, mat 263/311/260 binnen
±0.5pt — de sprong naar de huidige percentages kwam door sindsdien doorgevoerde
correcties per id, voornamelijk de niet-geporteerde `user_pos`/`P_SET`-afhandeling van
neato, de consolidatie van de engine-initialisatie en de correctie van `setEdgeType`
als macro vs. functie.)

Anders dan bij de eerste sweep is nu elke afwijkende rij afzonderlijk toegeschreven:
het injectietestharnas (`test/corpus/attribute-divergence.ts`) voert de pre-routerings-`ND_pos`
van het native orakel in de port in en vergelijkt opnieuw, en
elk huidig afwijkend id is ofwel `drift-exonerated` (routering en uitvoer van de port
reproduceren het orakel exact zodra de solverdrift is weggenomen)
ofwel een van de handvol afzonderlijk geaccepteerde restgevallen per id (de CDT-incircle-
gelijkstand van `241_0` op alle drie de engines, neato `2239`, sfdp `42`/`2556`).
De klasse-acceptatie hieronder formaliseert de vrijgesproken verzameling; actuele aantallen
in de dashboards per engine
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**A1-drift-klasse-acceptatie (iteratieve engines, berekend lidmaatschap).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
bevat per iteratieve engine (`neato`,
`fdp`, `sfdp`) één `"A1-drift"`-**klasse**-vermelding — `{ class: true, attributionFile, ref }` — anders dan de
vermeldingen per id die de sporen `circo`/`twopi`/`osage` hierboven gebruiken (D2,
`plans/iterative-parity-campaign/decisions.md`). Anders dan bij een vermelding per id wordt
klasselidmaatschap nooit met de hand in het register opgesomd: `parity-report.ts`
berekent het bij het genereren van het rapport uit het bijbehorende `attribution-<engine>.json`
(de injectie-attributietestharnas van T1, `test/corpus/attribute-divergence.ts`)
— elk afwijkend id waarvan de native pre-routerings-`ND_pos` in de
port is geïnjecteerd en bij hernieuwde vergelijking op ±0.5 conform blijkt, krijgt `verdict: 'drift-exonerated'` in
dat bestand, wat betekent dat de iteratieve solvers van de twee engines
convergeerden naar numeriek verschillende maar elk intern consistente lay-outs (een
verschil in drijvendekomma-accumulatie volgens de A1-karakterisering hierboven, geen
routerings- of uitvoerbug in de port). Het bewijs per id — vorm van de bucket, aantal verschillen basis vs. geïnjecteerd,
detectie van uniforme translatie/spiegeling — staat in het attributieartefact
zelf, niet gedupliceerd in dit document of het register (D2). Een id
dat later zonder meer gaat slagen, of waarvan de heratribuering van oordeel verandert,
valt bij de volgende regeneratie van het rapport automatisch uit de klasse — geen verouderde
acceptatie om aan te passen en geen falende bewakingstest. Engines waarvan
`attribution-<engine>.json` nog niet is gegenereerd, tonen de klasse als
„attribution pending” met nul leden, identiek aan helemaal geen acceptatie
— de klassevermelding mag aan haar gegevens voorafgaan (zie
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Tekstmeting (lettertypemetriek) → door labels bepaalde lay-out — GESLOTEN <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): gesloten.** Onder deze klasse wordt geen corpus-id meer
geaccepteerd; de sectie blijft behouden als historische documentatie van het mechanisme
en van het injecteerbare koppelpunt `TextMeasurer` dat het heeft geneutraliseerd.
Opeenvolgende correcties in de tekstmeting (de omschakeling naar `EstimateTextMeasurer`,
lettertypebewuste verticale metriek, de correctie voor niet-ASCII-UTF-8-bytes) losten
vrijwel elke door labels bepaalde lay-outafwijking op die hier vroeger stond. **`proc3d`** —
het voormalige canonieke A2-voorbeeld — is volledig **`conformant`** in alle drie de
corpusmappen (`graphs-`/`share-`/`windows-proc3d`): overeenkomende bbox, nul
verschillen in padgegevens, nul verschillen in labelankers.

**De laatste leden zijn afgevoerd (2026-07-01).** De **`NaN`-familie**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) werd hier nog lang meegedragen terwijl haar
knoopgeometrie al exact met C overeenkwam (76/76 referentiepunten). Haar werkelijke
restverschil — 8 eindpunten van rechte kanten bij vier tegengestelde 2-cyclusparen
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) die 6–14 pt verschoven waren — werd opnieuw gediagnosticeerd en bleek
**helemaal geen lettertypemetriekeffect**, maar twee portdefecten in de
multi-kantroutering van dot (missie `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Rijvolgorde bij tegengestelde paren.** De port sorteerde elke groep parallelle kanten
   opnieuw op oorspronkelijke aanmaakvolgorde (seq) voordat de Multisep-baanoffsets werden toegekend; C
   kent banen toe in de door edgecmp verzamelde volgorde (voorwaartse MAINGRAPH-rep
   eerst, omgekeerd AUXGRAPH-lid als tweede — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Bij een 2-cyclus waarvan het omgekeerde lid eerst was
   gedeclareerd, werd elke kant op de 18 pt-corridor van de ander getekend.
2. **Valse platte aangrenzendheid bij samengevoegde kanten tussen rangen.** `markAdjacent`
   markeerde `ND_other`-vermeldingen zonder de same-rank-bewaking van C
   (`flat.c:272-276`), waardoor de kortsluiting voor plat-aangrenzend in `groupSize`
   de groepsgrenzen van portcmp opslokte.

Met beide getrouw gecorrigeerd is de familie **`conformant`** in alle drie de
mappen (per element: knopen 0, kanten 0 afwijkend), en hetzelfde mechanisme
sloot `42`, `clust2`, `ngk10_4` (structural-match → conformant) en verplaatste
`b124` van diverged naar structural-match — allemaal bij 2-cyclus-/parallelle paren.

**Beide survey-kanten gebruiken dezelfde schatter — de meting is geneutraliseerd.**
Het native `dot`-orakel draait onder een headless `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) dat alleen de plug-ins
`core` en `dot_layout` symlinkt — geen tekstlay-outplug-in `gd`/`pango`/`quartz`.
Met die lege plek valt graphviz terug op zijn ingebouwde
`estimate_textspan_size`. De `EstimateTextMeasurer` van de TypeScript-port
(`src/common/textmeasure.ts`) is een getrouwe port van dezelfde routine en is
de Node-standaard, opgelost door `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Beide kanten van elke pariteitsvergelijking
meten tekst dus met exact dezelfde schatter** — echte FreeType-/pango-glyphbreedtes
komen nooit in de vergelijking voor. Daarom wijst een oordeelsregressie hier naar
lay-outcode en niet naar een lettertype, en daarom loste het repareren van de eigen bugs
van de schatter (UTF-8-bytetelling, lettertypebewustheid van de verticale metriek) het grootste deel van deze klasse
volledig op in plaats van alleen een lettertypemetriekkloof te verkleinen.

**Het injecteerbare koppelpunt `TextMeasurer`.** Deze neutralisatie is alleen mogelijk
omdat tekstmeting een bewust koppelpunt is en niet vast in een van beide
engines is verweven. `TextMeasurer` is een interface met één methode (`measure(text, font, size,
flags) → {w, h, …}`) die via dependency injection aan elke plek wordt doorgegeven die labels afmeet —
`polyInit`, `recordInit`, `initEdgeLabels` en `buildNodeLabel` krijgen elk de
meter als parameter; niets meet tekst via een globale. Voor tests/CI wordt hij
vastgepind met `setTextMeasurer(...)` of `GV_TEXT_MEASURER=estimate`.
Het koppelpunt maakt het ook mogelijk een restverschil als louter meetgerelateerd te *bewijzen*: geef de port de
exacte breedtes die C heeft gemeten (vastgelegd uit het orakel) en controleer of de lay-out
dan C exact reproduceert. Dat experiment gaf oorspronkelijk de grondslag voor het
A2-oordeel over `proc3d` (zie de historische bijlage hieronder) — de techniek
blijft geldig. Haar omgekeerde sloot de klasse: omdat de meting aantoonbaar aan beide
survey-kanten was geneutraliseerd, kon het `NaN`-kantrestverschil geen
lettertypemetriekeffect zijn, wat de herdiagnose afdwong die de twee
routeringsdefecten hierboven vond.

::: details Historische analyse (achterhaald sinds 2026-06-30) — bewaard voor het archief
Het onderstaande materiaal beschrijft een eerdere toestand van deze klasse, voordat de
omschakeling naar `EstimateTextMeasurer`, de lettertypebewuste verticale metriek en de
correctie voor niet-ASCII-UTF-8-bytes het grootste deel ervan sloten. Het beschrijft niet langer het huidige
gedrag — het wordt alleen bewaard zodat de redenering die hier toe leidde niet verloren gaat. In het
bijzonder: (1) de „native C”-breedtegetallen in de onderstaande meettabel
zijn **FreeType**-waarden uit een echt-lettertype-renderpad; de pariteitssurvey
gebruikt dat pad nooit — beide kanten draaien `estimate_textspan_size` (zie
hierboven) — dus de tabel weerspiegelt niet hoe pariteit nu wordt gemeten; (2)
de overlay-figuren en golden-/ours-renders hieronder tonen een **niet-corpus**-`proc3d`
(`graphs/directed/proc3d.gv`, ~2620 pt) die geen deel uitmaakt van de
pariteitssurvey; de corpus-varianten van `proc3d` zijn nu conform met nul
verschillen, dus er is voor hen geen overlay om te tonen; (3) het
`NaN`/`ratio=compress`-knoop-x-verhaal hieronder is achterhaald — de huidige meting toont dat alle 76 knoop-
punten exact overeenkomen, dus de keten van breedtefout → knoopverschuiving die het beschrijft
geldt niet meer voor `NaN`.

**`NaN` onder `ratio=compress` (historisch).** De
`NaN.gv`-familie (`orientation=landscape; ratio=compress; size="16,10"`) was een
A2-geval waarvan het oordeel destijds op *diverged* uitkwam in plaats van op
*structural-match*. Het compress-x-netwerksimplexpad was getrouw — elke
beperkingsinvoer kwam overeen met C (breedtebeperkingswaarde, `containNodes`-minlens,
aantallen hulpkanten 471/wt 1612, `lrBalance` en rangvolgordes allemaal identiek)
*behalve* de halve breedtes van 9 knopen, die de meter 0.5–1.03 pt
breder rapporteerde dan C. Het packen met gewicht 1000 van `ratio=compress` maakte de normaal ruime
links-naar-rechts-scheidingsbeperkingen **bindend**, zodat die subpixel-breedtefout
— zonder compress onzichtbaar — naar boven kwam als een inwendige x-verschuiving van −3..−5 pt. Die verschuiving bracht de rechte spline
`Target<->TThread` 0.55 pt voorbij een knoopboxwand, zodat de router hem in een extra bezierstuk boog (7
punten tegenover de 4 van C) — een *structureel* verschil, dus *diverged*. De 9 breedtes forceren
naar de waarden van C reproduceerde C exact (knoop-x 53/76→0/76 afwijkend; spline 7→4 punten),
wat bevestigde dat het restverschil voor 100% uit lettertypemetriek stroomopwaarts kwam, niet uit de compress- of
splinecode, **voor die voormalige afwijking**. Volledig bewijs (met een visuele
golden-vs-ours-vergelijking naast elkaar + de overlay van het 4-vs-7-punten-splineverschil):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (proza-
verslag: `…/nan-compress-xcoord.md`).

**Voorbeeld van lettertypemetriekmeting (historisch — FreeType vs. schatting).**
Native Graphviz meet, wanneer het met een echte tekstlay-outplug-in draait (niet het headless
orakel dat de pariteitssurvey gebruikt), tekst met FreeType-/libgd-glyphbreedtes.
De `EstimateTextMeasurer` van de port repliceert geen glyph-rasterizer. Voor de meeste strings komen de twee exact overeen; voor sommige verschillen ze
een fractie van een punt. Gemeten voorbeeld — Times-Roman 14 pt, de string
`"/home/ek/work/src/lefty/lefty.c"` (31 tekens):

| | breedte |
|---|---|
| native C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (schatting) | 176.75 pt |
| verschil | **+0.75 pt (+0.43%)** |

De andere labelregel van dezelfde knoop, `"93736-32246"`, mat **identiek**
(beide 96.00 pt) — de fout is afhankelijk van de string en stapelt zich per glyph op,
het is geen uniforme schaalfactor. Deze FreeType-vs-schatting-kloof is echt maar is
**niet** wat de pariteitssurvey meet (beide kanten draaien `estimate`); ze zou
alleen van belang zijn als de uitvoer van @knowvah/dot-engine zou worden vergeleken met een C-rendering met een echt lettertype
buiten deze survey.

**Doorwerking op de voormalige `proc3d`-afwijking (historisch).** Labelbreedte
bepaalt de knoopgrootte, die de lay-out bepaalt:

1. Een breder label → een iets bredere knoopbox (bij een *ellips*-knoop wordt de breedte
   verder met √2 geschaald, dus +0.75 pt tekst → +0.53 pt halve breedte).
2. Halve knoopbreedtes bepalen de links-naar-rechts-scheidingsbeperkingen van het
   netwerksimplex voor x-coördinaten; die beperkingen worden met `ROUND()` op
   gehele getallen afgerond, zodat een subpixel-breedteverandering een beperking van *N* naar
   *N+1* kan doen omslaan.
3. Het netwerksimplex kiest dan een andere — maar even optimale —
   gehele x-toewijzing, waardoor sommige knoop-x-posities 1–2 eenheden verschuiven.

Voor de niet-corpus-`proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, geen
lid van de pariteitssurvey) gaf dat een verschil van **≤ 3.55 pt** in x-uitgestrektheid
(**0.13%**), hieronder over elkaar gelegd — **groen = native C-`dot` (golden), rood =
@knowvah/dot-engine (ours)**:

![Overlay proc3d golden vs. ours: groen = C, rood = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ingezoomd zat de rand vrijwel volledig op de lange ovale labels met bestandspaden:

![Overlay proc3d, ingezoomd op de brede ovalen met padlabels: groen = C, rood = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — native `dot` | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d gerenderd door C Graphviz](/img/proc3d-golden.svg) | ![proc3d gerenderd door @knowvah/dot-engine](/img/proc3d-ours.svg) |

Het zelfstandige verslag (grondoorzaak, cijfers per metriek, reproductieopdracht)
staat op een eigen pagina:
[**proc3d — de canonieke A2-lettertypemetriekafwijking (historisch)**](/nl/divergences-proc3d-a2).
Die pagina beschrijft een opgeloste afwijking op een niet-corpusinvoer; de huidige
corpus-varianten van `proc3d` zijn conform.

**Waarom dit destijds werd geaccepteerd.** Het byte-voor-byte evenaren van de per-glyph-
breedtes van FreeType voor elk lettertype en elke string had vereist dat de metriektabellen,
hinting en afronding werden gerepliceerd — groot, kwetsbaar en nog steeds niet
gegarandeerd exact. De tekstmeter is een gedeeld primitief: elk label in
het corpus loopt erdoorheen, dus een correctie gericht op één string riskeerde
andere te laten regresseren voor een niet-waarneembare opbrengst.

:::

### A3. `hypot`-gelijkstandsbeslissing in de spline-routering (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Getroffen:** `dot`-grafen met een **geometrisch symmetrisch** kantroutering-
kanaal — typisch een korte, symmetrische boog van een platte kant. Waargenomen voorbeeld: `2368`,
dat op *structural-match* blijft (maxΔ ≈ 10.2 pt op **één** kant, `376->76`).
Dezelfde gelijkstandsbeslissing komt ook naar boven bij een **lange** kant (over meerdere rangen) naar een
hub met hoge in-graad wanneer de corridor exact spiegelsymmetrisch is: `graphs-b100` /
`graphs-b104` (identieke bron) wijken met maxΔ 20 (precies één rangrij) af op de
enkele knoop van `Node23730->Node23729` — elke knooppositie en alle stroomopwaartse
box-/polygoon-/strakke-padstructuur is byte-identiek aan C; alleen de keuze van `findMaxDev`
op ~1 ULP welk spiegelsymmetrisch inwendig punt de bezierknoop wordt,
verschilt. De korte platte-kantvorm komt ook naar voren als `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — de afwijkende zus van het door het orakel vastgepinde `241_0`, waarbij de ruis van C
juist het eerste behoudt. Dezelfde gelijkstandsbeslissing veroorzaakt een gesplitste
spleetcorridor van een gelabelde 2-cyclus-terugkant in `2413_1` (structural-match, maxΔ 67.65) en
`2413_2` (maxΔ ≤99.55 zodra de T11-swapBezier-reverse-correctie landt — tot dan
wordt de gerapporteerde maxΔ 1922.26 van het bestand gedomineerd door een niet-gerelateerd, apart
gevolgd defect), en een enkele gelabelde kant binnen een cluster in `graphs-decorate`
(maxΔ 43.54); in elk geval liggen de twee kandidaat-splitshoeken binnen
5.7e-13 (2413-familie) / 3e-14 (decorate) van elkaar voordat de
positieafhankelijke Apple-`hypot`-ruis een winnaar kiest. `2371`
(structural-match, maxΔ 16.8) toont dezelfde vingerafdruk op twee niet-gerelateerde
kanten (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): de port
levert op beide de exacte spiegel van de controlepuntenreeks van het orakel,
met knoop-y omgeslagen met een identieke Δ16.8 (boven-/onder-splitsingsfracties verwisseld).
De oorsprong ervan is met **MIDDELHOGE** zekerheid gekwalificeerd in plaats van met de BEVESTIGDE
zekerheid van de andere leden: `2371` packt ~199 componenten, wat de pathplan-lokale coördinaten
ontkoppelt van paginacoördinaten, zodat de gelijkstand in drie instrumentatiepogingen
niet live aan `route.ts:209` kon worden gekoppeld; een oorsprong in straight-mode-segmentatie of in post-clip-`recover_slack`
is niet volledig uitgesloten. Volledige diagnose:
`plans/residual-cleanup/analysis/2371-mirror.md`. De meeste gerouteerde kanten
worden niet getroffen.

::: details Graafdefinitie (`2368.dot`)
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

**Karakterisering.** De splinefitter (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) splitst een gefitte bezier op het inwendige routepunt met
maximale afwijking. Wanneer het kanaal symmetrisch is, vormen de twee kandidaat-splitspunten
een **exacte wiskundige gelijkstand**, en de winnaar wordt dan bepaald door ~1e-14
drijvendekomma-annulatieruis in een bezier-evaluatie met absolute coördinaten
waarvan het **teken van de absolute positie afhangt**.

De afwijkingsafstand van C is libm-`hypot`, en de macOS-Apple-`hypot` die
het orakel genereerde is een propriëtaire implementatie die met **geen enkele**
draagbare `hypot` bit voor bit overeenkomt (gemeten daartegen in het graphviz-coördinatenregime, bit-
identieke percentages: V8-`Math.hypot` ≈ 63%, een correct afgeronde / Arm-achtige `hypot`
≈ 84%, fdlibm-`hypot` ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Door die ULP-ruis
**is C zelf niet consistent**: het splitst twee *translatiecongruente* bogen naar
**tegengestelde** hoeken. Binnen `2368` is de boog `376->76` het spiegelbeeld van de
geometrisch identieke boog `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

De volledige afwijking, over elkaar gelegd (12× zoom op de boog `376->76` / `to1`) — **groen = C
Graphviz, rood = @knowvah/dot-engine**. Beide zijn dezelfde vlakke neerwaartse boog tussen dezelfde
knoopgrenzen; ze verschillen ~1–2 pt in de buik (het middelste bezier-
controlepunt), waar de gelijkstand van C naar de tegenovergestelde hoek viel:

![2368 boog 376->76: groen = C, rood = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Al het overige komt binnen tolerantie overeen — dezelfde bounding box (608×148), knoopposities,
labels, pijlpunten en alle andere kanten. De volledige renders zijn visueel
niet te onderscheiden:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 gerenderd door C Graphviz](/img/2368-c.png) | ![2368 gerenderd door @knowvah/dot-engine](/img/2368-port.png) |

De port gebruikt een **translatie-equivariante** gelijkstandsbeslissing (een echte gelijkstand wordt altijd
naar de eerste index opgelost), dus hij tekent *elke* dergelijke boog op dezelfde manier, ongeacht
de positie — hij is zelfconsistent en komt overeen met C op de bogen waar de ruis van C ook
het eerste behoudt (bijv. `256->436` en `241_0 5:ne->8:nw`), en wijkt alleen af waar de
ruis van C de andere kant op slaat (`376->76`). Eindpunten, pijlpuntdoel, de andere
kanten, alle knopen, labels en de bounding box komen binnen tolerantie overeen; alleen de
inwendige controlepunten van die ene boog verschuiven (~1–2 pt in de buik).

**Waarom geaccepteerd.** De `hypot` van Apple is niet beter reproduceerbaar over JS-engines en
CPU's heen dan de FMA/`pow` van **A1** — het is dezelfde portabiliteitsbeperking, alleen
in de `dot`-splinerouter. De *positieafhankelijke* keuze van C evenaren zou betekenen dat de strikte
gelijkstandsbeslissing van C wordt overgenomen, die in een **gedeeld primitief** leeft waar elke gerouteerde
kant doorheen loopt: dat ruilt de overeenkomst op `376->76` voor *nieuwe* afwijkingen op
de bogen waar C de andere kant op uitkomt (het laat `241_0` en een `cnt=3`-
platte-kant-orakelgeval regresseren), per saldo nul, wat bovendien de
translatie-equivariantie van de port opoffert. We houden dus de consistente (equivariante) router. Dit is
een begrensde, niet-waarneembare `dot`-afwijking — geen openstaande bug. Volledig onderzoek:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orakel in een erkend defecte toestand (de familie init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Getroffen:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). De familieleden
`1939` en `2825` zijn **conformant** en hebben geen vermelding, en `2470`
en `graphs-structs` voegden zich daar op 2026-07-11 bij (beide werden conformant
nadat de correcties voor ortho-aangrenzendheidsoverloop/chancmpid, fmadd-`polylineMidpoint` en
half-even-gelijkstandsafronding waren doorgevoerd — de port reproduceert nu de herstel-uitvoer van het orakel
exact, inclusief de identieke verloren kanten); hun
acceptatievermeldingen zijn ingetrokken.

`1581` en `2825` waren crashherstelgevallen (missie fix-element-count-bucket):
fuzzer-/gedegenereerde invoer waarbij de upstream-tests **alleen** controleren
dat dot niet crasht (`test_1581`: geen ASan-overtreding; `test_2825`: geen
crash wanneer `rebuild_vlists` -1 teruggeeft). C loopt tegen een interne `Error:` aan
(`install_in_rank` / `rebuild_vlists: lead is null`) en zijn herstel
gooit lay-outinhoud weg; de port komt tot **identieke beslissingen om ranksets te verwijderen**
(waarschuwingspariteit geverifieerd: dezelfde knoop-/graafnamen in de
„already in a rankset”-waarschuwingen van `mark_clusters`, cluster.c:317-320).

`2825` is nu volledig gesloten. De missie fix-2825-rebuild-vlists (na 1581)
sloot eerst de kloof één laag: de port bereikt de *exacte* interne-fouttoestand van C
— byte-identieke stderr inclusief berichtvolgorde
(`Error: rebuild_vlists: lead is null for rank 1` en daarna de niet-geprefixte
`agerr(AGPREV, ...)`-voortzetting `concentrate=true may not work
correctly.`) — waarbij `dotLayoutPipeline` het falen van
`dot_position` correct doorgeeft om `dot_splines`/`dotneato_postprocess` over te slaan,
overeenkomstig de `dotLayout` van C (`if (r != 0) return r;` na `dot_position`,
dotinit.c:322-325). Een vervolg (deel 2) sloot daarna de resterende
kloof in de renderlaag: de `emit_node` van C bewaakt elke knoop met `node_in_box(n,
job->clip)` (emit.c:1806-1809), en op dit afbreekpad is `job->clip`
gedegenereerd omdat `GD_bb` nooit door `set_aspect` is gezet (binnen de
overgeslagen staart van `dot_position`) — dus C geeft *nul* knopen uit, alleen de (eveneens
gedegenereerde) clusterkaders. De port heeft dezelfde `node_in_box`-bewaking geport
(`src/gvc/device.ts:renderNode`, met `job.bb`/`job.pad` als het
eenpagina-equivalent van `job->clip`) en is gestopt met het herberekenen van een
aannemelijke bbox uit levende knoopposities wanneer `g.info.bb` niet is gezet
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` letterlijk, overeenkomstig
`gvc->bb = GD_bb(g)` van `init_gvc`, emit.c:3272) — elke lay-outengine
zet `g.info.bb` zelf al voordat `render()` draait op elk niet-afbreekpad, dus dit is byte-identiek
op gezonde grafen en verandert alleen de uitvoer
op dit afbreekpad. `2825` is nu `conformant` (uitvoer van 4 elementen,
byte-identiek aan het orakel). Zie
`.agent-notes/2825-rebuild-vlists-abort.md` voor de volledige mechanismetrace
van beide delen. `1581` bereikt de inconsistente toestand helemaal niet (een
*andere* upstream-clustervensterbug, niet `rebuild_vlists`), dus hij legt
zijn overlevende graaf volledig uit — die kloof blijft open. De orakel-uitvoer
op `1581` is herstelpuin zonder upstream-gedefinieerde semantiek. Bewijs:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Bij
elk van deze invoeren is het volgens graphviz zelf het **C-orakel** dat defect is: `2471`, `1939` en `1435` zijn
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), vgl.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); de enige
oplossingspoging, [concept-MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
blijft een ongemergd concept (laatst bewerkt 2026-03-20). `graphs-structs` is de
oeroude klasse van record-routeringsverlies (#102/#242/#274/#1323) die stabiele
graphviz 15.0.0 correct rendert — een regressie van het dev-build-orakel.

**Wat C doet.** Bij de `init_rank`-leden (`2796`, `2471`, `1939`) sluit
de hulpgraaf voor x-coördinaten van native dot een gerichte cyclus via
clusterwandbeperkingskanten; zijn
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
kan niet elke knoop doorlopen, drukt `Error: trouble in init_rank` af, en de
lay-out gaat verder vanuit die herstelstoestand — bij `2471`/`2796` eindigend in
`Pshortestpath`-triangulatiepuin en verloren kanten. Bij `1435` en
`graphs-structs` is de defecte fase pathplan zelf (doodlopende wegen in de ear-clip-
triangulatie; een verloren record-portkant).

**Invoer geverifieerd en daarna getrouw gemaakt (dit is het dragende deel).**
De missie `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
dumpte regel voor regel de beperkingsgraaf die beide kanten aan het netwerksimplex voeren,
voor elk familielid — en ontdekte dat het eerdere „schone” gedrag van de port bij
deze familie voortkwam uit **vier echte portdefecten**, alle gecorrigeerd:

1. `flatEdges` sloeg de aanroep van
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   van C over, waardoor de rangvensters van clusters verouderd bleven na het invoegen van vnodes voor platte labels
   (alleen dit liet de port **9** kanten verliezen op `2471` waar C er 6
   verliest).
2. De kantstraf voor dezelfde `group` werd op self-loops toegepast in plaats van op
   eindpunten met dezelfde niet-lege groep
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` gebruikte de `_WIN32`-waarde 100 van C; het orakelplatform gebruikt 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Een doodlopende weg in de triangulatie brak `Pshortestpath` af in plaats van de
   waarschuw-en-ga-door + rechte-lijn-terugval van C
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Na de correctie zijn de NS-beperkingsdumps van de familie **regel voor regel identiek** aan C
(253 rank2-aanroepen bij `2471`; alle aanroepen bij `1939`/`1435`/`graphs-structs`),
en de port volgt C door het erkend defecte herstel: dezelfde
verloren kanten (`3->16` bij 2796; dezelfde 6 bij 2471), dezelfde elementenbomen.
`1939` werd volledig conformant. De resterende numerieke verschillen (en het
afwijkende pathplan-puin van 1435) zijn gedrag *binnen* de herstelstoestand, dat
het projectbeleid bewust niet najaagt.

**`2723` (segfault; vastgepind, niet nagejaagd).** Native `dot` segfault (exit 139)
op `tests/2723.dot` (ongericht, `rank=same`-groepen, gelabelde kanten), dus C heeft
geen uitvoer om mee te vergelijken. Upstream-
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) staat open en
`tests/test_regression.py:test_2723` is `xfail`. De port gooit
`InternalError` (`INTERNAL_ERROR`, met een `TypeError`-oorzaak uit
`src/layout/dot/flat.ts:flatLabelYpos`, waar `rank[r-1]` undefined is). Zonder
correct orakel blijft het eerlijke falen staan en wordt de port niet gewijzigd;
`src/layout/dot/flat-2723.test.ts` pint het vast. Werk die test bij als upstream
het issue verhelpt.

**Beleidsnotitie.** Het eerdere A4-standpunt („de port voldoet aan de verwachtingen van het issue; niet repliceren”)
was gebaseerd op de overtuiging dat de acyclische hulpgraaf van de port uit een goedaardige
lokale variant kwam. Dat was niet zo — hij kwam
uit defect (1), dat `2471` aantoonbaar verkeerd heeft geplaatst. Getrouwheid aan de C-
broncode won: de port reproduceert nu de erkend defecte uitkomsten van C uit
geverifieerd identieke invoer, en elke vermelding hier moet **opnieuw worden gemeten
wanneer upstream het bijbehorende issue verhelpt** (de orakel-uitvoer zal
veranderen; verwacht dat deze id's bij die upgrade als regressies oplichten — dat
is bedoeld, geen verval).

**Bewijs.** Vergelijkingspagina's per id (renders naast elkaar + bewijs-
records):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 addendum na de correctie`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(basislijn van vóór de correctie bewaard in
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnose-artefacten: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ongeldige invoerbytes (representatie van codering) {#a5-invalid-input-bytes-encoding-representation}

**Getroffen:** `1367` (diverged, maxΔ 0 — precies één structureel verschil).

**Wat verschilt.** Het invoerbestand bevat een kale UTF-8-vervolgbyte (`0x80`)
in een knoopnaam. C behandelt kale vervolgbytes 0x80–0xBF als „geldige
tekens die zichzelf vertegenwoordigen” (`lib/common/utils.c:1200-1207`, geen
waarschuwing), en de `<title>`-tekst van knoopnamen omzeilt tekenset-conversie volledig
(`agnameof`-bytes stromen rechtstreeks naar `gvputs_xml`). De orakel-SVG
bevat dus de ruwe byte en is **geen geldige UTF-8** ondanks de gedeclareerde
codering. De port decodeert invoer met ongeldige UTF-8 via de latin1-terugval
(`0x80 → U+0080`) en geeft goedgevormde UTF-8 uit (`\xc2\x80`).

**Waarom geaccepteerd.** De I/O-grens van de port zijn JS-strings (browserbibliotheek).
Een ruwe ongeldige byte kan niet de rondreis maken door de stringretourwaarde van `renderSvg`;
byte-voor-byte evenaren van C zou betekenen dat de uitvoercodering voor elke
gebruiker wordt beschadigd. De latin1-terugval spiegelt de eigen „als Latin-1 behandeld”-herstelsemantiek van C
(`utils.c:1249`). Dit is een beperking onder de code — de
representatielaag — geen draagbaar gedrag dat we weigerden te porten.
Al het overige in 1367 is conformant: elementaantallen (23 polyline /
103 text / 44 polygon / 24 path) en alle coördinaten komen overeen na de
decorate-correctie (T6).

**Bewijs.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
vergelijkingspagina (render naast elkaar + bewijsrecord).

---

### A6. Overloop van het canvas bij `unsigned int` bij gedegenereerde invoer {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Getroffen:** `1314` — een van een fuzzer afgeleide invoer (`fontsize="991836031967s8"`)
waarvan de absurde lettergrootte de tekening opblaast tot ~2.75e11 pt.

**Wat er gebeurt.** C slaat `job->width` / `job->height` op als **`unsigned int`**
(`gvcjob.h:327-328`). De `ROUND(...)` van de enorme puntgrootte (`emit.c:1249-1250`)
loopt over 32 bits over en wikkelt modulo 2³², en de SVG-backend voert die uit via een
**getekende** `%d` (`gvrender_core_svg.c:258-259`) — dus C drukt
`height="-425618343"` af. De port behoudt de wiskundig consistente (niet-gewikkelde)
waarde. Elke andere waarde — de ellips `cx/cy/rx/ry` van de knoop, de root-`translate`, de
polygoon, de tekst-`font-size` — is byte-identiek; alleen de width/height van de
`<svg>` op het hoogste niveau verschillen.

**Waarom we het niet najagen.** Het repliceren van de 32-bits-gehele-getal-overloop van C is geen
lay-outgedrag dat het porten waard is, en de invoer is gedegenereerd. Heroverweeg als upstream
de overloop verhelpt (bijv. door het veld te verbreden of de grootte te begrenzen).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Gedegenereerde NaN-lay-out (`sfdp`, pathologische `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Getroffen:** `2556` — `repulsiveforce=100` (⇒ de afstotende kracht gebruikt
`pow(dist, 101)`), wat de veer-elektrische solver in **beide engines op NaN** laat uitkomen.
Het native orakel zelf geeft overal `nan` als knoop-/kantposities uit en een
gedegenereerde bounding box.

**Wat er gebeurt.** Als elke coördinaat NaN is, serialiseren de twee implementaties
de rommel verschillend: (1) de graaf-bb / achtergrondpolygoon — C rondt `NaN`
af naar `int`, wat op arm64 rommel ter grootte van `INT_MIN` oplevert (`bb="0,0,-4.295e+09,
-4.295e+09"`); de port houdt `0`. (2) Kanttekenbewerkingen — de emit-pass van native
onderdrukt de `_draw_`/`_hdraw_` van een NaN-spline (en geeft alleen de `pos` uit),
terwijl de port ze met NaN-controlepunten uitgeeft. Knooptekeningen komen overeen (beide
onderdrukken ze). Aan beide kanten bestaat geen echte lay-out.

**Waarom we het niet najagen.** De port reproduceert al dezelfde NaN-uitbarsting als
native — de correctie die dat mogelijk maakte is echt (zie hieronder); wat overblijft is alleen
hoe elk de NaN-rommel serialiseert. Het repliceren van het ongedefinieerde gedrag van C bij `(int)NaN`
en zijn onderdrukking van NaN-splinetekeningen is geen betekenisvolle lay-outgetrouwheid bij een invoer
waarvan de lay-out in beide engines gedegenereerd is. Heroverweeg als upstream
`repulsiveforce` begrenst of NaN-posities opschoont.

**Portcorrecties die dit bereikbaar maakten (niet weggejaagd — echte bugs).** Daarvoor
kon de port de gedegenereerde toestand niet eens bereiken: (1) `armPow`
(`src/common/arm-pow.ts`) gooide bij elk argument buiten het snelle pad; het port nu de volledige
bijzonderheden-tak van ARM-`pow.c`, zodat `pow(NaN, y) = NaN` zoals in libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) liep eindeloos bij NaN-controlepunten
omdat zijn convergentietest de naïeve negatie van de `while (ABS > .5)` van C was
(gelijkwaardig voor eindige waarden, niet voor NaN); hij spiegelt C nu exact en
eindigt bij NaN. Beide zijn C-getrouw en raken alleen NaN-invoer.

---

### A7. Rondingsgrens van de boxwand bij `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Getroffen:** `graphs-honda-tokoro` en (toegevoegd 2026-07-28, nieuw in het universum van
905 items) zijn `graphs/directed/`-zus `tree-graphs-directed-honda-tokoro`
(beide structural-match, maxΔ ≈ 1 pt op de enkele kant `n012->n011`). De
zus verschilt alleen in `samearrowhead`-attributen, die de routering van dit paar niet raken
— zijn `n012->n011`-geometrie is byte-identiek aan het geaccepteerde id aan
zowel port- als orakelzijde, dus het onderstaande mechanisme is er letterlijk op van toepassing.

**Wat verschilt.** De kopcorridor-boxwand van `maximal_bbox` komt in C op interne
x=90 uit tegenover x=89 in de port voor de gedeelde `samehead`-port van de twee
parallelle `n012->n011`-kanten. De gedeelde-portconstructie (`buildSharedPort`) en de
parallelgroepering zijn beide byte-conform aan C; het gat van 1 px is puur een
artefact van de `round()`-rondingsgrens — ~1e-14 aan upstream-drijvendekomma-ruis
laat een waarde die precies op een `.5`-grens zit naar het naburige gehele getal omslaan. De
formule `maximal_bbox` van de port spiegelt die van C al exact.

**Waarom we het niet najagen.** `round()` is een primitief waar elke gerouteerde kant in het
corpus doorheen loopt; het gedrag op de grens ervan bijstellen om dit ene geval te evenaren is een
corpusbrede regressierisico voor 1 px bij 2 kanten — dezelfde gedeeld-primitief-
beperking als de afronding van de controlehull genoteerd in
`bbox-class-control-hull-vs-curve`. Volledige diagnose:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-afronding vs. strikte IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klasse.** clang arm64 compileert de orakel-binary met `-ffp-contract=on`,
waarbij geselecteerde vermenigvuldig-optelreeksen tot enkele FMA-instructies worden samengevoegd; de
port draait op V8, dat strikte IEEE-754-afronding toepast en geen
`fma` kan uitgeven. Bij bit-identieke invoer verschillen de twee 1-2 ULP bij welke
expressie de compiler ook koos samen te voegen. De portzijde is altijd het
strikte-IEEE-754-resultaat; de orakelzijde is altijd het met FMA samengevoegde
resultaat. Dit is een compiler-/runtime-portabiliteitsbeperking onder de semantiek van de C-
broncode, geen logisch defect in de port — onherleidbaar zonder
de specifieke samenvoegkeuzes van clang in software te emuleren. Twee gevallen
zijn bekend, op twee verschillende plaatsen, met twee verschillende versterkingsmechanismen:

- **2646** — de ULP ontstaat binnen de kubische oplossing `points2coeff`/`solve3` van
  `Proutespline` en laat rechtstreeks het aantal wortels van de splinefitter omslaan.
- **2620** — de ULP ontstaat in de polygoon-hoekpuntomvanglus van `poly_init`
  (knoopgrootte) en wordt stroomafwaarts versterkt door de getrouwe per-relax-
  int-afkapping van `ortho` tot een omslag van een gelijkwaardige doolhofcorridor-gelijkstand.

**Getroffen:** `2646` (structural-match, maxΔ 42.09 bij 3 van 21.216 kanten:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — allemaal
record-port-`:c->:nb_part`-smode-routes voor lange kanten). Zus van **A3**: beide
klassen zijn onherleidbare drijvendekomma-portabiliteitsgelijkstanden binnen
`Proutespline`, maar het mechanisme is een ander — een compiler-`fp-contract`-
artefact, niet libm-`hypot`.

**Wat verschilt.** Bij alle drie de kanten wijkt alleen de laatste aanroep van `routesplines` (een
recht eindstuk naar de kop-port) af. Het eindpunt ligt bit-exact op
de onderwand van de barrièrepolygoon met zijn raaklijn evenwijdig aan die wand
(`evs[1]=(1,-1.22e-16)`), zodat elke `splinefits`-kandidaat bij `t=1` raakt aan de
barrière — een bijna-dubbele wortel van de snijdingskubiek.
`points2coeff` berekent die kubiek via catastrofale cancellatie (termen
rond ~7446 die tot ~0.099 instorten). Het orakel (clang/arm64,
`-ffp-contract=on`) voegt `v3 + 3*v1 - (v0 + 3*v2)` samen tot fused
multiply-adds, terwijl V8 strikte IEEE-afronding toepast — de twee verschillen
~9.1e-13 bij **bit-identieke invoer**, en die ruis laat het teken van de
`solve3`-discriminant omslaan: C vindt 1 wortel (866.7, binnen het segment); de port
vindt 3 wortels met een valse partnerwortel bij `t=0.9999975 < 1-EPSILON2`. De
valse wortel veroorzaakt één extra `a`-halveringsiteratie, die de
raaklijnlengte van het laatste stuk met een factor 2 laat omslaan (in beide richtingen over
de 3 kanten), wat na het clippen de maxΔ 42.09 oplevert (26 SVG-verschillen).

**Waarom geaccepteerd (onherleidbaarheid bewezen met een gecontroleerd experiment).** Alle zes
`routesplines`-aanroepen werden aan beide kanten gedumpt — box, polygoon, `PL`, start,
einde en `evs` zijn byte-identiek, net als de uitvoerspline van de eerdere (niet-laatste) aanroep; de enige afwijking zit binnen de `solve3` van de laatste aanroep. Een
zelfstandig testharnas met pristine C isoleerde de enige variabele: compileren met
`-ffp-contract=off` reproduceert de **port** bit-exact bij alle 3 kanten; de
standaard (`on`) samenvoeging reproduceert het **orakel** bit-exact bij alle 3
kanten. De port komt dus al overeen met strikte-IEEE-754-C; de
afwijking is geheel de FMA-samenvoegkeuze van de orakelcompiler, onder de semantiek van de
C-broncode — er is geen ontrouw op bronniveau te herstellen. Een
gerichte correctie (de samenvoeging met de hand emuleren in `points2coeff`) werd geprobeerd en
weerlegd: ze corrigeert 2 van de 3 kanten maar niet de derde, waarvan de omslag
ontstaat in de eigen interne samenvoeging van `solve3`. Een volledige oplossing zou
software-FMA-emulatie in de hele splinefitter vereisen — een kostenpost in de hete lus
met corpusbrede afrondingsimpact voor een subpixel-opbrengst bij 3 kanten.
Volledige diagnose: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Getroffen (historisch):** `2620` (was structural-match, maxΔ 585; 423 verschillen
bij 24 kantpaden + 22 pijlpunten). **Conformant geworden op 2026-07-11**:
de getrouwe port van het overlopen van de `sgraph`-aangrenzendheidsbuffer + de bidirectionele
insluiting in `chancmpid` (zie `.agent-notes/ortho-maze-circo-rca.md`) nam de
afwijking weg; de acceptatievermelding is ingetrokken en deze sectie blijft behouden als
documentatie van de A8-klasse.

**Wat verschilt.** De pijplijn `ortho` (`splines=ortho`) is byte-conform
aan C bij identieke invoer — bewezen door de exacte doolhofinvoer van C
(coördinaten, `xsize`/`ysize`) in de ortho-fase van de port te injecteren: 378/378 gerouteerde
segmenten komen byte-identiek uit, dus niets in `src/ortho` is de schuldige.
De werkelijke afwijking is 1-2 ULP in de doolhof-*invoer*: de knoop-`ysize` (en, door
accumulatie binnen de rang, `ND_coord.y`) berekend in de polygoon-hoekpuntomvanglus
`poly_init` van C (`shapes.c`), die onder
`-ffp-contract=on` `R.x += sidelength*cosx` samenvoegt tot een FMA die ~1
ULP groter is dan de strikte-IEEE-rekenkunde van de port (beide kanten implementeren de
rekenkundig identieke expressie). `2620` heeft 173 polygoonknopen met fractionele breedte;
allemaal tonen C ≥ port met 1-2 ULP. Die ULP wordt versterkt — niet
geïntroduceerd — door de Dijkstra-relax van `ortho`, die getrouw zijn
lopende afstand per stap afkapt (`sgraph.c:165`, door de port gespiegeld als
`Math.trunc`) over gewichten afgeleid van ruwe celomvang
(`maze.c:257`). De door ULP verschoven geometrie laat een gelijkwaardige corridor-gelijkstand omslaan
bij 4 gerouteerde kanten (paden + hun pijlpunten); de overige verschillen zijn
heropnummering van ±1 spoor als uitvloeisel van die 4 omslagen.

**Waarom geaccepteerd (onherleidbaarheid bewezen met een gecontroleerd experiment).** Een
zelfstandig C-testharnas dat alleen `-ffp-contract` varieerde, reproduceerde beide kanten op het
afwijkende zeshoekhoekpunt: `-ffp-contract=on` → `310.29250168188713`
(komt overeen met het orakel), `-ffp-contract=off` → `310.29250168188707` (komt overeen met
de port), met de afwijkende bewerking geïsoleerd tot hoekpunt `i=3`
(`R.x=-0.50000000000000011` samengevoegd vs. `-0.5` niet samengevoegd). Een tweede
invoerinjectie-experiment (enige variabele: ortho-invoerwaarden) bevestigde
de versterker: het voeren van de exacte
`coord`/`xsize`/`ysize` van C aan de eigen `orthoEdges` van de port laat alle 4 corridorafwijkingen tot 0 instorten — de
ortho-code heeft geen defect, hij is slechts gevoelig (zoals de eigen doolhofkostenroutering van C)
voor een verschuiving van 1-2 ULP in zijn invoer. Evenaren zou betekenen dat de
specifieke FMA-samenvoeging van clang van één gecompileerde expressieboom in
`poly_init` wordt geëmuleerd — een gecompileerd artefact najagen, geen bronsemantiek porten.
Volledige diagnose: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Geëmuleerde uitzondering (niet geaccepteerd): `triang.c:ccw`.** Eén samenvoegplek
wordt wél bit-voor-bit gereproduceerd in plaats van geaccepteerd: de `ccw` van pathplan
compileert tot `fnmul`+`fmadd` (exact eerste product − afgerond tweede), zodat een
querypunt dat bit-gelijk is aan een segmenteindpunt ISCW/ISCCW test in plaats van
ISON. `shortest.c:pointintri` verwerpt dan eindpunten die polygoonhoekpunten zijn
(„destination point not in any triangle”) en `makeMultiSpline` valt terug
op gewone routering voor elke samengevoegde 2-cyclus — een groot, discreet,
corpusbreed gedrag dat de port moet evenaren. Anders dan de plaatsen `solve3`/`poly_init`
hierboven (diep in gecompileerde expressiebomen, oplossing weerlegd), is `ccw`
een enkele zelfstandige gecompileerde functie met heldere semantiek, dus
`src/pathplan/triang.ts` emuleert hem: een snel pad met gewone doubles met
een conservatieve foutgrens waar het gewone en samengevoegde teken aantoonbaar overeenkomen, en
een exact pad met Dekker-product + dyadische BigInt voor de bijna-nulgevallen.

---

### A9. libm-trigonometrie 1 ULP → omslag van de CDT-gelijkstand bij cocirculariteit (`circo`/`twopi`-multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klasse.** `Math.sin`/`Math.cos` van V8 zijn niet bit-identiek aan `sin`/`cos` van
Apple-libm (bewezen: 1-ULP-verschil bij `2π·4.5/8`, een van de acht
hoeken van de ellips-obstakels). De hoeken van de omgeschreven 8-hoek van `makeObstacle`
erven die ULP, zodat de invoercoördinaten van de driehoeksrouter met ≤6e-14 van die
van het orakel verschillen. Symmetrische lay-outs (even grote knopen op een rang/ring) maken
de vierhoeken van de router in reële rekenkunde **exact cocirculair**, zodat het exacte
incircle-predicaat op een mesrand staat: de invoer-ULP laat zijn teken omslaan,
de diagonaal van de constrained-Delaunay slaat om, en de corridorpolygoon die in het orakel
`Pshortestpath` laat falen („destination point not in any triangle” →
terugval op gewone spline) slaagt in de port (of omgekeerd). De resulterende
splines verschillen ~0.2–0.5pt. Zus van **A3**/**A8**: een onherleidbare
drijvendekomma-portabiliteitsbeperking onder de bronsemantiek van C — evenaren
zou vereisen dat de exacte `sin`/`cos`-afronding van Apple-libm in JS wordt gereproduceerd.

**Getroffen:** `241_0` (circo Δ≈0.2 / twopi-canvas Δ≈9 via de corridoromslag
op kant `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
elk 1–2 verschillen in de positie van kantlabels — de libm-1-ULP ontstaat in
de eenheidshoekpunt-trigonometrie van `poly_init` (`hypot`/`atan2`/`sin`), zet de
berekende hoogte van één knoop een ULP voorbij de minimumgrootte-begrenzing waar het orakel
exact op uitkomt, en werkt via `floor()` in de xlabel-R-tree-lading door tot een
enkele omslag van een labelkandidaat. Een oplossing met correct afgeronde hypot werd geprobeerd en
WEERLEGD: ze loste `2343` op maar liet `2168_3` regresseren, waarvan de achthoekgrootte
via dezelfde aanroep loopt waar de waarde van het orakel NIET de correct
afgeronde is — geen enkel deterministisch hypot-beleid komt bij beide met het orakel overeen).
`2168_1` zat oorspronkelijk in deze klasse maar werd
conformant zodra de port de fp-gecontraheerde `ccw` van het orakel emuleerde
(pathplan `triang.ts`): zijn corridorfalen wordt bepaald door de met FMA samengevoegde
verwerping van eindpunten die hoekpunten zijn in `pointintri`, wat de port nu
bit-voor-bit reproduceert, zodat de ULP-gelijkstand van de CDT-diagonaal daar niet meer naar boven komt.

**Waarom geaccepteerd (onherleidbaarheid bewezen met een gecontroleerd experiment).** De
CDT zelf is vrijgesproken: de `mkSurface` van de port is een getrouwe port van de incrementele
invoeging van GTS 0.7.6 (`cdt.c`: 1→3-splitsing + recursieve
`swap_if_in_circle`, constraint-kanten vooraf aangemaakt en niet verwisselbaar,
afdwinging van beperkingen via `remove_intersected_*` + `triangulate_polygon`), en
een zelfstandig C-testharnas dat de **echte GTS-bibliotheek** linkt en de bit-exacte routerinvoer van de port
kreeg, reproduceert de triangulatie van de port vlak voor vlak
(2168_1: 22/22; 241_0: 185/185). Exacte rationale evaluatie van de incircle-determinant
op de twee invoerverzamelingen bevestigt de tekenomslag (+1 met de
invoer van de port, −1 met die van het orakel). De resterende variabele — het 1-ULP-
trigonometrieverschil — werd geïsoleerd door de bitpatronen van `Math.sin`/`sin`
rechtstreeks te vergelijken.

**Engine-spoor-acceptatie (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> De **xdot-enginesporen** voor twopi/circo
(`parity-twopi.json` / `parity-circo.json`, native `dot -K <engine>
-Txdot`-orakel, `test/corpus/engine-walk.ts`, semantische tekenbewerkingsvergelijking op
±0.01 — zie `test/golden/compare-xdot.ts`) leggen datzelfde mechanisme bloot,
onafhankelijk van de hierboven genoemde SVG-survey van de dot-engine: twopi `2239` (1
tekenbewerkingsverschil — de omslag van de tekstpositie van het kantlabel `_ldraw_`, dezelfde
trigonometrie-ULP van het eenheidshoekpunt in `poly_init` die via de `floor()`-xlabel-
R-tree-keten doorwerkt; `2343`, `share-b29` en `windows-b29`, oorspronkelijk geaccepteerd
onder deze vermelding, werden op 2026-07-11 *opgelost* door de getrouwe fmadd-samenvoeging
in `polylineMidpoint` — zie de alinea over de b29-familie hieronder) en circo `241_0` (41
tekenbewerkingsverschillen, Δ≈0.2pt op de gerouteerde bezier van kant `1->2` — dezelfde
omslag van de CDT-diagonaal in de corridor; beslissingsjournaal, 2026-07-10, vermelding „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”). Geaccepteerd op enginespoor-niveau via
`test/corpus/accepted-divergences-engines.json`, door `parity-report.ts` samengevoegd in
`PARITY-twopi.md`/`PARITY-circo.md` — dezelfde samenvoeging die
`accepted.ts` uitvoert voor het dot-spoor `PARITY-dot.md`.

**circo `2475_2` — cocirculaire closestNode-hypot-gelijkstand.** In één component van 28 knopen
van deze graaf met 10762 knopen kiest de `getRotation` van circo
(`circpos.c:73-92`) via `hypot` de blokknoop die het dichtst bij de lay-outoorsprong ligt,
om de rotatie van het deelblok te bepalen. Twee cocirculaire knopen liggen
vrijwel even ver; de correct afgeronde `Math.hypot` van V8 en de `hypot` van Apple-libm
ronden die afstand 2 ULP uiteen af, wat de strikte `<` laat omslaan,
een andere knoop kiest en het deelblok ~20° roteert/spiegelt (18 knopen
verplaatsen, max 296.7pt; de andere 10744 knopen zijn bit-identiek, evenals de
bloktree, cirkelvolgorde en elke `centerAngle`). Het CR-hypot-beleid werd
voor deze klasse al weerlegd (2026-07-10). Zelfstandige reproductie:
`.agent-notes/circo-2475-590-repro.dot`; volledige RCA:
`.agent-notes/circo-b81-2475-rca.md` (geaccepteerd 2026-07-11).

**twopi `2470` — ULP in radiale coördinaat versterkt door de xlabel-R-tree.**
2470 is een graaf met 140 kanten waarvan de HTML-`<table>`-kantlabels clusteren
op bijna samenvallende radiale ankers. In de neato-familie worden kantlabels geplaatst
als externe labels door de hebzuchtige xlabel-plaatser (`label/xlabels.c`), die
de kandidaathoek met de minste overlap kiest via een Hilbert-geordende R-tree.
De splines en knoopcoördinaten van de port komen met het orakel overeen tot op
uitvoerprecisie (nul spline-/knoop-/bbox-verschillen zelfs bij 1e-7), maar de radiale
`ND_coord.y` van één knoop verschilt ~2 ULP (Apple-libm `sin`/`cos` vs. V8-`Math`) — ver
onder de conformiteitslat, maar hij ligt precies op 0 aan weerszijden van de grens
`floor(pos.y − sz.y/2)` in `objplpmks`, waardoor de R-tree-rechthoek van dat object
één eenheid omslaat. De verandering in Hilbert-volgorde/boomgroepering laat `RTreeSearch`
een andere tak snoeien, zodat ~140 labels elk naar de naburige kandidaathoek springen
(elk verschil een vaste stap van (+breedte, −regelhoogte)). De plaatser, objectvolgorde, rechthoekafronding, `CombineRect` (dat de min-min-eigenaardigheid van C
getrouw spiegelt) en de int32-Hilbert-sleutel werden elk getrouw bevonden; de
afwijking is de upstream-radiale-trigonometrie-ULP, onherleidbaar om dezelfde reden
als bij twopi `1855`. Geaccepteerd 2026-07-11; volledige RCA:
`.agent-notes/twopi-2470-rca.md` (die ook vastlegt dat de „slaging” van dit id
die ochtend een artefact was van een verouderde orakel-binary, geen port-
regressie).

**osage `1855` — uitsmering van de fp-contract bij obstakelhoekpunten.** Anders dan de twopi-
`1855`-vermelding voor radiale spiegeling hierboven: onder osage zijn de knoopmiddelpunten bit-exact
gelijk aan het orakel, en de 110 tekenbewerkingsverschillen zijn drie door obstakels gerouteerde kanten
die aan de spiegelzijde van een knooprij zijn geplaatst (X bit-exact, Y gespiegeld). De
achthoekige obstakelhoekpunten uit
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) wijken
3–4 ULP van C af omdat de `-ffp-contract=on` van clang de `a·b±c`-
ketens in `ellipse_tangent_slope`/`line_intersection` samenvoegt tot FMA's met enkele afronding
terwijl V8 elke bewerking afrondt: de samengevoegde afronding van C laat een goot-
kolom van hoekpunt-x-waarden instorten tot één bit-identieke double (exact collineair),
terwijl die van de port hem in twee waarden splitst die 1 ULP uit elkaar liggen. Dat laat de zichtbaarheids-
`clear()`-raaklijntest omslaan — de goot is niet langer geblokkeerd — waardoor ~20
zichtbaarheidskanten bijkomen, en Dijkstra de gelijkstand van de op/neer-homotopie naar de
spiegelzijde oplost. Gecontroleerd experiment: de exacte obstakelcoördinaten van C in de
verder onaangeroerde port injecteren levert **nul** afwijkende
kanten op, wat de keten van legale schikking, zichtbaarheid, Dijkstra en spline
volledig vrijspreekt; alleen de libm-`cos`/`sin` van C injecteren is een no-op. Geaccepteerd
2026-07-11; volledige RCA: `.agent-notes/osage-spline-family-rca.md`.

**b29-familie (twopi).** De vier b29-varianten delen één mesrand: het
kantlabel `EqmtTyp` (`Node14732->Node14731`) zit op een exacte gelijkstand bij de zijkeuze van placeLabels
waarvan de uitkomst afhangt van 1-ULP-drift van de twopi-lay-out in de
omringende objecten. Met de getrouwe fmadd-samenvoeging in
`polylineMidpoint` (correctie voor de states-familie, 2026-07-11) is het labelanker van de port
bit-identiek aan dat van het orakel, maar de gelijkstand wordt bij
twee van de vier varianten (`graphs-b29`, `linux.i386-b29`) nog steeds tegengesteld opgelost terwijl de andere
twee (`share-b29`, `windows-b29`) nu conform zijn — en het geaccepteerde A9-
labelverschil van `2343` verdween volledig. Grens: 1 tekenbewerking, Δ12pt label-y. Onherleidbaar
zonder de upstream-drift weg te nemen. Volledige RCA:
`.agent-notes/twopi-states-rca.md`.

Dezelfde mesrand van placeLabels komt naar boven op het **osage**-spoor (geaccepteerd
2026-07-11, volledige RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` en `share-b29` (elk 2 tekenbewerkingsverschillen — het x-anker van één kantlabel
landt op 878.28 tegenover 841.06, symmetrisch geplaatst rond het
bit-identieke splinemidden 859.67, d.w.z. ±de halve labelbreedte; de twee
varianten spiegelen elkaar) en `1652` (2 tekenbewerkingsverschillen — twee kanten slaan elk
één labelanker om rond een identiek midden, één in x en één in y,
met bit-identieke splines en pijlpunten; het orakel rendert volledig,
dus dit is niet de bekende native-timeout-flake). In elk geval is de kantgeometrie bit-exact en wordt alleen de
gelijkstand bij de zijkeuze van het label tegengesteld opgelost bij een omgeving met 1 ULP drift.

Het osage-spoor draagt het `polypoly`-drietal (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; geaccepteerd 2026-07-11, volledige RCA in
`.agent-notes/patchwork-tail-rca.md`): de enige afwijkende bewerking is de
kale transcendente `cos(π+θ)` op een hoekpunt met oriëntatie 180 van een vervormde vierhoek —
de `Math.cos` van V8 is correct afgerond terwijl de `cos` van Apple-libm een
van het argument afhankelijke fout van ±1 ULP heeft (dus alleen onder libm is `|cos(π+θ)| ≠
|cos(θ)|`); het 1-ULP-verschil in knoopgrootte voedt `GRID`/`ceil` van pack, laat een
omtrekgelijkstand omslaan, en de qsort plaatst twee componenten in elkaars pakkings-
cellen — een rigide verwisseling van hele knopen zonder vorm- of routeringsfout. Geen
deterministische herschrijving kan een niet-correct-afgeronde libm-
transcendente reproduceren, de schoolboekvorm van A9.

Hetzelfde mechanisme werd op 2026-07-28 bevestigd bij de grotere zus
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nieuw in het
universum van 905 items; 112 tekenbewerkingsverschillen, alleen osage). De afwijkende bewerking
is dezelfde 1-ULP-plek `cos(π+θ)` van knoop `9004` — de `bb.x`-waarden van C en port
komen byte voor byte overeen met de oorspronkelijke RCA — maar bij deze invoer van 76 knopen
loopt de voortplanting via `arrayRects` van osage: `acmpf` sorteert pakkings-
cellen op de ruwe som `width+height`, en de 1-ULP-hogere breedte van libm laat
`9004` strikt vóór zijn geroteerde zussen `9000/9002/9006` sorteren terwijl
de correct afgeronde waarde van V8 een exacte 4-voudige gelijkstand laat die de onstabiele
qsort anders ordent — andere rij-na-rij-cellen, een verwisseling van `9002`/`9006`,
en een `fmax`-cascade in kolombreedte die 8 buren in x verschuift.
Het voeren van de knoopgroottes van C versus die van de port aan de eigen `arrayRects` van de port
reproduceert de 10 verplaatste knopen van de sweep met byte-overeenkomende x-verschuivingen,
waarmee de oorzakelijke keten sluit.

Twee verdere gevallen op enginespoor-niveau werden op 2026-07-11 tot de grondoorzaak herleid en geaccepteerd
(volledige RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 tekenbewerkings-
verschillen — de zus van de circo-vermelding hierboven: dezelfde cocirculaire CDT-
incircle-gelijkstand, omgeslagen door libm-`sin`/`cos` 1 ULP, laat de
multispline-corridor van de port slagen met een spline van 14 punten terwijl de native build
terugvalt op gewone routering van 8 punten; puntverschillen < 0.07pt) en circo
`windows-tree` (10 tekenbewerkingsverschillen op één waaierkant — de plaatsingstrigonometrie van circo
legt `node2.y` een enkele ULP boven `node8.y` rond de exact symmetrische
waarde 18.0, en de dyna-kop-portselectie van `closestSide` slaat TOP/BOTTOM om bij
die exacte gelijkstand; knoopposities en boxen zijn verder bit-identiek aan het
orakel).

**sfdp-enginespoor — FP-gelijkstanden bij kanten (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Het xdot-enginespoor van sfdp (`parity-sfdp.json`,
native `dot -Ksfdp -Txdot`, ±0.5) legt de cocirculaire CDT-incircle-gelijkstand bloot zodra
exacte native pre-routeringsposities worden geïnjecteerd (de afwijking is dus NIET
iteratieve drift — zie de A1-drift-klasse — maar een discrete predicaatgelijkstand):

- `42` en `241_0` — cocirculaire CDT-incircle-gelijkstand (de multispline-corridor).
  Met geïnjecteerde posities is het restverschil een **omslag van het aantal segmenten**: `42`
  `opCount 5 vs 9` (kant 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kant 3->2) — de constrained-Delaunay-diagonaal van de port slaat om ten opzichte van het
  orakel, zodat de multispline-corridor slaagt met een spline van N punten terwijl de
  native build terugvalt op een kortere gewone route (of omgekeerd), precies zoals bij
  de twopi/circo-vermelding `241_0` hierboven. De port emuleert de arm64-
  `fmadd`-samenvoeging in het incircle-/`ccw`-predicaat al (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) en gebruikt robuuste-incircle-Delaunay; het restverschil is de
  1-ULP van V8 vs. Apple-libm in `sin`/`hypot` in de predicaatinvoer, die geen enkele draagbare
  code reproduceert.

> **`2095` geherclassificeerd van A9 → A1-drift (2026-07-22).** Het stond eerder
> hier vermeld als „de hypot-zus” (drift onder 0.7pt op de kanten van een knoop
> met lege naam `""->"4"`). Dat restverschil was een **artefact van het testharnas**: de
> regex `GVTS_POS` van de attributie-injector eiste ≥1 naamteken, dus de knoop met naam `""`
> werd nooit geïnjecteerd en sleepte zijn twee aangrenzende kanten mee. Nu de injector zo is gecorrigeerd dat hij lege
> namen herkent (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), injecteert sfdp `2095`
> tot **0 restverschil** — pure krachtdrift, gedekt door de berekende A1-drift-
> klasse, geen FP-gelijkstand in de routering. De acceptatie per id is verwijderd uit
> `accepted-divergences-engines.json`. (Dezelfde bevinding als bij fdp `2095` hieronder.)

**Vers gecontroleerd experiment (2026-07-21).** Een native-vs-V8-`hypot`-sonde
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): het compileren van de
C-`hypot` van het systeem en vergelijken met Node-`Math.hypot` op representatieve
afwijkingsinvoer voor platte kanten toont een 1-ULP-verschil bij 2 van 6 (Δ 7.1e-15 en
5.7e-14) — de mesrand van de splitsdrempel die het aantal onderverdelingen laat omslaan.
Onherleidbaar: geen enkele draagbare hypot reproduceert Apple-libm (het precedent `arm-pow.ts`
voor dezelfde grens). Geaccepteerd op enginespoor-niveau via
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

Het **fdp**-xdot-enginespoor (`parity-fdp.json`, native `dot -Kfdp -Txdot`,
±0.5) legt DEZELFDE cocirculaire CDT-gelijkstand bloot op dezelfde graaf, `241_0`: met de
exacte pre-routeringsposities van het orakel geïnjecteerd is het restverschil 11 numerieke
`unfilled_bezier`-verschillen, beperkt tot één kant (`0->1#0`, maxΔ 3.39pt). Omdat
de knoopposities geïnjecteerd-identiek zijn, zit de afwijking stroomafwaarts in de
pathplan-multispline-corridor — dezelfde libm-1-ULP-incircle-gelijkstand als bij
twopi/circo/sfdp `241_0` (exact-rationale incircle 185/185 hierboven). De hefbomen zijn
al toegepast (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); de gelijkstand is onherleidbaar. Geaccepteerd via `accepted-divergences-engines.json`
`fdp.241_0`. `2095` van fdp daarentegen is **A1-drift, geen A9**: het injecteren van de
enkele knoop met lege naam (nadat de attributie-injector was gecorrigeerd om knopen met naam
`""` te herkennen) laat zijn restverschil tot nul instorten — de eerdere „A9-staart” was de
niet-geïnjecteerde lege knoop die zijn aangrenzende kanten meesleepte. De sfdp-`2095`-acceptatie was
dezelfde blinde vlek — een verse regeneratie van de sfdp-attributie (2026-07-22) met de gecorrigeerde
injector bevestigde dat ook die tot 0 injecteert, en de acceptatie ervan is verwijderd (zie de
notitie `2095 geherclassificeerd` hierboven).

---

## Gevolgde long tail (`dot`-attributen & randgevallen) {#tracked-long-tail-dot-attribute-edge-case}

Bij **standaardwaarden** komt de `dot`-engine met de C-binary overeen binnen een strakke deterministische
tolerantie op het golden-corpus (het oordeel `conformant`; zie de opmerking bovenaan).
De resterende verschillen zijn de **long tail van attributen en
randgevallen** — het historisch moeilijke deel van elke Graphviz-port. Anders dan de
geaccepteerde afwijkingen hierboven *worden* deze gedicht; ze worden live gevolgd, met
aantallen, in
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Categorie | Wat verschilt |
|---|---|
| **path-structure** | Splineroutering van kanten in specifieke configuraties (bijv. sommige gevallen met platte kanten en dichte corridors). |
| **element-count** | Een functie die in bepaalde grafen meer/minder SVG-elementen uitgeeft dan C. |
| **color-stroke** | Verschillen in de uitvoer van lijn/vulling bij specifieke stijlattributen. |
| **parser-gap** | Een klein aantal DOT-invoeren die de parser nog niet volledig accepteert. |

Als uw graaf alleen gangbare attributen en de `dot`-engine gebruikt, bevindt u zich vrijwel
zeker op het pad van overeenkomst binnen de deterministische tolerantie. Als een lay-out er verkeerd uitziet, controleer dan `PARITY-dot.md` voor
die invoerklasse — het is waarschijnlijk een gevolgd punt met een door het orakel vastgepinde oplossingsmissie,
geen onbekende.

> **Opmerking over door labels bepaalde gevallen.** De klasse tekstmeting (A2) is gesloten —
> geen enkele `dot`-graaf wordt er nog onder geaccepteerd. Een graaf die vandaag op
> structural-match staat, is een gevolgd hiaat, geen lettertypemetriekverschil.

### Pijlpunten van tegengestelde kanten bij `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Wanneer `concentrate=true` een antiparallel paar (`A->B; B->A`) samenvoegt tot één
overblijvende kant, moet die kant aan **beide** uiteinden een pijlpunt tekenen. Dit is nu
geport (de tak `conc_opp_flag` van `arrow_flags`; zie
`src/common/splines-clip.ts:arrowFlags`), zodat `graphs-b135`, `167` en `2087`
overeenkomen (de ontbrekende-pijlpunt-afwijking van `element-count` en haar bijwerking op de niet-geclipte spline
`@d` zijn beide verdwenen).

Sommige concentrate-grafen **behouden een afzonderlijk, reeds bestaand restverschil** dat de
pijlpuntcorrectie **niet** verhelpt — het is een verschil in **x-coördinaat** van knopen
(x-netwerksimplex / kompas-port), geen pijlpuntdefect:

- **`graphs-b15`, `graphs-b69`** — de grote record-/cluster-„liftschacht”-grafen.
  Concentrate wordt geactiveerd en voegt correct samen; het restverschil is een knoop-x-verschil van ~1pt
  dat uitgroeit tot een verschil in `element-count`/spline-`@d`. De pijlpuntuitvoer
  zelf is nu correct (b69 krijgt zijn ontbrekende pijlpuntpolygonen). Zie
  de agentnotitie `b69-concentrate-undermerge` voor de grondoorzaak in de x-coördinaat.
- **`1453`** — wijkt nog steeds af door een `element-count`-oorzaak op het hoogste niveau die los staat
  van de pijlpunt van conc_opp_flag.
- **`2825`** — afwijkend ten tijde van deze pijlpuntcorrectie door een `element-count`-
  oorzaak op het hoogste niveau die los staat van conc_opp_flag (er wordt daar geen samenvoeging van een tegengesteld paar
  getriggerd); inmiddels gesloten door de missie fix-2825-rebuild-vlists,
  zie A4 hierboven.

Dit zijn gevolgde x-coördinaat-/structurele punten, **geen** pijlpuntbugs.

### Hiaten in de lay-outgetrouwheid uit de fidelity-missie 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

De fidelity-missie 2.0 liet niet-geporte attribuutwaarden luid falen (zie de
`UNSUPPORTED_FEATURE`-tabel in
[Fouten en uitzonderingen](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Ze liet het volgende achter, vastgelegd in `plans/v2-fidelity/decision-journal.md`.

**Luid, niet geport.** `overlap=voronoi` met overlappende knopen gooit nog steeds
`UNSUPPORTED_FEATURE` in neato, twopi, circo en sfdp: de Voronoi-aanpasser
zelf (het algoritme van `vAdjust`) is niet geport. De overlaptest die beslist
of er wordt gegooid is die van C zelf (`countOverlap` over de knooppolygonen van `poly.c`).

**Bekende hiaten, nog steeds stil.** De port rendert deze zonder fout en
wijkt af van native Graphviz. Gevonden door de missie `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); geen geaccepteerde afwijkingen.

- **De waarschuwing „Unrecognized overlap value” van `getAdjustMode` wordt niet uitgegeven.**
- **Geroteerde polygoonhoekpunten kunnen in de laatste bits van native afwijken
  (onherleidbaar: wiskundebibliotheek van de host).** `poly_init` oriënteert elk hoekpunt met
  `atan2`, `hypot`, `sin` en `cos`. Bij bit-identieke invoer geven macOS-libm en
  V8 verschillende laatste bits terug (bijv. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` bij het volgende hoekpunt:
  libm `…fffd`, V8 `…fffe`), zodat een box met `orientation=20` hoekpunt-y
  `-18` krijgt in de port en `-17.999999999999996` native. Native Graphviz zelf
  varieert met de libm van het platform, en een browser kan die niet aanroepen. De eigen
  rekenkunde van de port komt met C overeen (volgorde van `RADIANS` vastgelegd; 776 van 1664 getrokken hoekpunt-
  coördinaten zijn bit-identiek, de rest verschilt uitsluitend via libm). Effect:
  oordelen van `polyOverlap` bij exacte aanraking kunnen omslaan; met native hoekpunten komt elk
  oordeel overeen.
- **sfdp kan op macOS van native afwijken (onherleidbaar: libm-`pow` van de host).**
  Gediagnosticeerd met een geïnstrumenteerde native sfdp: posities blijven bit-identiek
  tot één afstotende-krachtterm, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, dus `pow(x, 2)`), 1 ulp minder teruggeeft dan `x*x` van macOS-libm
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, correct afgerond
  `…396`; macOS `pow(v, 2) != v*v` voor 20 van 16201 getrokken `v`). Dat verandert
  de `Fnorm` van de iteratie in het laatste bit; de adaptieve afkoeling van sfdp versterkt dat
  tot een andere (vaak gespiegelde) lay-out. De `armPow` van de port is de
  `pow` van ARM's optimized-routines (glibc ≥ 2.28), d.w.z. wat Linux-Graphviz berekent;
  het macOS-orakel is de uitzondering. Uitgesloten: seeding (expliciete `start=`-waarden
  komen overeen), `pcp_rotate` (dezelfde invoer geeft dezelfde uitvoer), posities en de
  aantrekkende term (bit-identiek). Voorbeeld: een alleenstaande driehoek `a--b; a--c; b--c`
  bij de standaard-seed.
- **fdp kan via libm-`cos`/`sin` van de host van native afwijken.** fdp volgt
  Graphviz na 15.0.0 (afstoting op hypot-afstand, `Mlimit`), waarbij de `hypot` van de libm van de host
  bit-voor-bit wordt gereproduceerd (`src/common/libm-hypot.ts`, 0
  afwijkingen bij 400k steekproeven). 251 van de 252 golden-invoeren die fdp kan renderen
  komen exact overeen met de native build; de overgebleven
  (`parallel-cluster-ldbxtried`) plaatst clusterportknopen met
  `T_Wd * cos(alpha)`, en macOS-libm `cos(-2.3840764867756761)` ligt 1 ulp van
  de `Math.cos` van V8; de krachtenlus van fdp versterkt dat tot ongeveer 3 inch. De `cos` van Apple
  is niet te reproduceren met een kort model zoals dat voor `hypot` kan.
- **Native crashes die de port definieert.** Native Graphviz sluit af met 139 bij neato
  `mode=KK` met `model=mds` en een kant-`len` (`mds_model` indexeert `GD_dist`
  met een 1-gebaseerd volgnummer: heap-overloop), en bij `model=circuit` met een
  niet-samenhangende graaf. De port laat in het eerste geval cellen buiten het bereik vallen en
  valt in het tweede terug op kortste paden; er is geen native uitvoer om
  mee te vergelijken.

---

## Bewust niet geport (niet-doelen) {#intentionally-not-ported-non-goals}

Dit zijn bewuste scope-afbakeningen, geen bugs. De bibliotheek richt zich op **SVG**
(plus de tussenliggende tekstformaten `json` / `xdot` / `dot` / imagemap).

- **Andere uitvoerformaten.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  en GUI-/interactieve backends vallen buiten de scope. Gebruik de SVG-uitvoer en converteer
  verderop als u een raster nodig hebt.
- **`page=`-paginering voor SVG.** Native `dot` pagineert SVG ook niet (het
  SVG-device zet geen pagineringsvlag), dus `page=` doet op dit pad in beide
  implementaties niets — hier alleen gedocumenteerd omdat het een veelvoorkomend
  punt van verwarring is.
- **`-Tplain`-tekstuitvoer.** Uitgesteld (een getrouw tekstformaat), niet uitgesloten.
- **`gvpr`** (de scripttaal voor graafverwerking) — buiten de scope.
- **C++-gemaksomhulsels** (`cgraph++`, `gvc++`) — de C-API wordt eerst
  geport; een idiomatische TypeScript-gemakslaag zou, indien gewenst, een
  apart pakket zijn.
- **`fontnames=svg|ps` bij tekstmeting in de browser.** In een browser bouwt de
  canvas-meter zijn lettertype op uit de `fontnames=native`-familielijst van de PostScript-alias
  (`Times-Roman` → `Times, serif`), hetzelfde
  lettertype dat de SVG-uitvoerder standaard rendert. `TextMeasurer` heeft geen grafencontext,
  dus grafen die `fontnames=svg` of `fontnames=ps` zetten, worden gemeten
  tegen de native lijst terwijl de SVG de svg/ps-familie noemt. Aliasgewichten
  die CSS niet definieert (`book`, `demi`, `light`, `medium`, `roman`)
  worden letterlijk uitgegeven, zoals in C; browsers negeren ze en renderen het normale
  gewicht, en de meter meet het normale gewicht om daarbij aan te sluiten. Node-uitvoer wordt
  niet beïnvloed (die gebruikt de canvas-meter nooit).
- **Native-only mechanismen** vervangen door browserveilige equivalenten: dynamisch
  laden van plug-ins (`dlopen`) is vervangen door statische registratie van engines/renderers;
  bestandsleesacties (lettertypen, afbeeldingen, configuratie) zijn vervangen door door de aanroeper geleverde
  callbacks (bijv. `setImageSizer`). Het gedrag blijft behouden; het mechanisme verschilt.

---

## Een afwijking melden {#reporting-a-divergence}

Als u uitvoer vindt die van C verschilt en **geen** geaccepteerde afwijking hierboven is,
niet in `PARITY-dot.md` staat en geen niet-doel is, dan is dat een bug die het melden waard is — de C-
broncode is de specificatie, en niet-vermelde afwijkingen worden behandeld als defecten, niet als
geaccepteerd gedrag.
