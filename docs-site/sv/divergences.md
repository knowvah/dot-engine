---
sourceHash: 0a68fd7d6b8dd40085337d733bd33392aa624e404444abc9e45e45a56b8072f4
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Kända avvikelser från C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine strävar efter största möjliga trohet mot den kanoniska
C-implementationen. C-källkoden är specifikationen; en ej listad skillnad
behandlas som en defekt, inte som godkänt beteende.

> **Vad ”matchar” betyder här.** Korpusens paritetsutlåtande `conformant`
> är en **snäv deterministisk tolerans**, *inte* bokstavlig byte-för-byte-likhet
> hos SVG: numeriska koordinater och banor måste stämma inom **±0.01** och allt
> icke-numeriskt innehåll (taggar, färger, text) måste vara exakt lika
> (`compareSvg(…, 'deterministic')`). I hela det här dokumentet syftar ”matchar”
> och ”konform” på det toleransutlåtandet. Fullständig definition:
> [Överensstämmelse](./conformance.md).

Där utdata *faktiskt* skiljer sig faller det i exakt en av tre klasser:

1. **Godkända avvikelser** — skillnader som vi har undersökt, förstått ned till
   grundorsaken och **medvetet valt att inte göra konforma**. Var och en är
   avgränsad, karakteriserad och motiverad nedan. Det här är inga buggar och de
   kommer inte att ”fixas” utan en specifik, separat avgränsad anledning.
2. **Spårad lång svans** — kända luckor som *kommer* att täppas till, var och en med
   en orakelförankrad rättning. De finns med aktuella antal i
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Icke-mål** — avsiktliga omfångsgränser (format och mekanismer som vi aldrig
   avsåg att återge).

De auktoritativa, löpande uppdaterade underlagen är
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(paritetsinstrumentpanel per indata mot inbyggd `dot`) och
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventering av porteringsstatus på algoritmnivå).

Den **maskinläsbara** sanningskällan för vilka grafer som är *godkända* (klass 1
nedan) är
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Verktygen sammanfogar den vid rapporttillfället: `PARITY-dot.md` skiljer **godkända
avvikelser** från den **spårade** restlistan, och regelspärren hämtar sin tillåtelselista
därifrån. Prosaavsnitten nedan förklarar varje post (A1 är aktiv; A2, A3 och A8 är stängda
och bevarade som historik; A10 är aktiv som ett godkännande av ett portfel i registren
per motor). Två CI-tester hindrar den här listan från att ruttna i tysthet:
`accepted-divergences.test.ts` säkerställer att varje godkänd graf fortfarande avviker,
och `registry-staleness.test.ts` misslyckas när en post i ett register per motor inte
längre stämmer med sin incheckade genomgångsrad.

---

## Godkända avvikelser (vi gör dem medvetet inte konforma) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Vi godkänner en avvikelse — i stället för att jaga byte-paritet — bara när **alla**
följande villkor är uppfyllda:

- Grundorsaken är en **portabilitetsbegränsning** (något som JavaScript-/
  webbläsarmiljön inte kan återge exakt), inte ett logikfel i porteringen.
- Skillnaden är **omärkbar** och bevisligen **begränsad**.
- En rättning skulle ha **oproportionerlig kostnad och påverkansyta** i förhållande till
  vinsten (typiskt: den skulle röra en delad primitiv som hundratals redan konforma
  grafer använder, och riskera regressioner för en vinst på en bråkdel av en pixel).

När vi godkänner en avvikelse karakteriserar vi den här så att användare aldrig blir
överraskade. Grafer som berörs av en godkänd avvikelse valideras mot en
**strukturell / toleransbaserad** ribba i stället för en byte-ribba.

### A1. Flyttalsdeterminism (kraftbaserade motorer) {#a1-floating-point-determinism-force-directed-engines}

**Berörda:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (de iterativa
fjädermodellmotorerna). Motorn `dot` och dess *layout* **påverkas inte** av den här
iterativa modellens determinism; de tidigare flyttalsavvikelserna i
`dot`s splinedragning (A3, A8) är stängda och bevaras nedan som historik.

> **Omfång, historiskt en omätt reservation — nu delvis mätt.** Den
> **huvudsakliga SVG-undersökningen för dot-motorn** (`test/corpus/survey.ts`) är
> fortfarande **enbart dot**: det inbyggda oraklet körs under `GVBINDIR=/tmp/ghl`,
> som symlänkar **endast** insticksmodulerna `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` loopar över exakt `core dot_layout`
> — ingen layoutmodul för `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` finns), och
> både orakel och portering anropas med motorn `dot`. Korpus-id:n
> som `*_neato` / `*_circo` / `root_twopi` är alltså *filnamn* som läggs ut med
> `dot` i den undersökningen, inte med sin egen motor, och A1 matchar **noll**
> grafer där — inte för att motorerna bevisats konforma, utan för att just den
> undersökningen aldrig använder dem.
>
> **Men alla sex A1-motorer har nu sin egen undersökning med inbyggd motor**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (oberoende av `GVBINDIR` —
> var och en startar `dot -K <engine> -Txdot` direkt), på två olika
> stringensnivåer som dokumenteras separat nedan: `circo`/`twopi`/`osage` körs med samma
> **±0.01 deterministiska** tolerans som dot-undersökningen, med orsaksanalys per id
> (”Godkännande på motorspårsnivå” nedan); `neato`/`fdp`/`sfdp` körs med en lösare
> **±0.5-karakterisering** utan triage per id ännu (”Karakterisering av iterativa
> motorer” nedan). Aktuella siffror över alla motorer:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Karakterisering.** Dessa motorer kör iterativa numeriska layouter vars resultat
beror på flyttalsavrundning — särskilt fused multiply-add (FMA) och
`Math.pow`, som kan skilja sig mellan JavaScript-motorer och processorarkitekturer.
Porteringen följer C:s operationsordning där den kan (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — t.ex. låser `sfdp` sig vid ~6 signifikanta siffror mot det
inbyggda oraklet med en matchad PRNG och `fma` — men exakt, koordinatidentisk
återgivning är **inte garanterad mellan plattformar**. Topologin bevaras; den
potentiella avvikelsen ligger i nodernas finare koordinater.

**Varför godkänd.** Detta är en hård begränsning med att köra i JS, inte ett
designval — samma familj som de (sedan stängda) känsligheterna för `hypot`/FMA i A3/A8. Det går inte att
garantera bitidentiska transcendenta/FMA-resultat över alla målmiljöer, så ett
byte-krav vore otestbart snarare än bara dyrt. **Att bedöma A1** (i stället för att
bara förbehålla sig) krävde ett separat paritetsspår med inbyggd motor — byggt
2026-07-11 som `test/corpus/engine-walk.ts` + `parity-report.ts`, som undersöker varje
indata under sin egen motor i stället för `dot`. Det ärliga taket för det arbetet är
att **minska** A1 till ”ingen aktiv avvikelse på referensplattformen”, aldrig att
eliminera förbehållet om olika plattformar; resultaten hittills (nedan) håller sig
till det taket: `circo`/`twopi`/`osage` har var och en dragit fram och orsaksanalyserat ett
fåtal verkliga A1/A9-fall, och `neato`/`fdp`/`sfdp` ligger nu på 90.5/96.5/68.1%
inom 0.5pt från inbyggd över universumet på 929 poster (graphviz 16.1.0), vilket
betyder att den portade aritmetiken (`fma.ts`, `arm-pow.ts`, matchad PRNG) håller
för de flesta grafer — och varje avvikande id i universumet på 929 poster är
individuellt tillskrivet genom injektion (lösardrift mot portfel) i stället för
att lämnas som otriagerad drift. Se karakteriseringen av de iterativa motorerna nedan.

**Godkännande på motorspårsnivå: twopi-pilfamiljen.** <a id="a1-twopi-arrows-family"></a>
Blockcitatet ovan beskriver dot-motorns SVG-undersökning, där A1 matchar noll
grafer; det separata **xdot-motorspåret** för `twopi` (`parity-twopi.json`, inbyggt
`dot -K twopi -Txdot` som orakel, `test/corpus/engine-walk.ts`) körs *faktiskt* under sin
inbyggda motor och visar ett konkret, verifierat A1-fall på 9 korpus-id:n:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
och (tillagt 2026-07-28, nytt i universumet på 905 poster) systerposten i directed/
`tree-graphs-directed-oldarrows` — var och en avviker på en enda dominerande kant
(`Z->I` eller `i->Z`; 12–64 skillnader i ritoperationer). Injektions-A/B (beslutsjournal, 2026-07-10, posten ”injection A/B verdicts:
twopi arrows family EXONERATED...”) bevisade mekanismen direkt:
att dumpa den inbyggda `spline_edges`s ingående `ND_pos` och injicera den i
portens `splineEdgesShifted` ger **fullt konform** utdata för
`graphs-arrows` (`Z->I` blir byte-identisk med oraklet, samma spline med 7/14 punkter)
— så avvikelsen är till 100 % nodpositionsdrift före dragningen ur `twopi`s
PRISM-lösare för överlappsborttagning, och porteringens splinedragning/emission är
frikänd. Det synliga symptomet på 6 av 8 id:n är ett byte av antalet bezierpunkter
(`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`s antal anpassade delar
är känsligt för vilken sida av en hindergräns den drivna nodpositionen
hamnar på, så en position som skiljer sig mindre än en ULP efter PRISM:s iterativa
lösning vänder den anpassade splinens segmentantal (de andra 2 id:na,
`graphs-arrowsize`/`nshare-arrows_dot`, visar samma drift som en mindre
enbart positionsmässig skillnad utan byte av delantal). Godkänd på motorspårsnivå
via `test/corpus/accepted-divergences-engines.json`, som `parity-report.ts` sammanfogar i
`PARITY-twopi.md` — samma sammanfogning som `accepted.ts` gör
för dot-spårets `PARITY-dot.md`.

Orsaksanalysen av `oldarrows` (2026-07-28) pekade ut den exakta vändplatsen för
familjens symptom med antalet punkter. Dess `i`–`Z`–`I`-solfjäder är kollinjär på en ringdiameter, och
pathplans `directVis`-funktion `intersect()` blockerar en siktlinje när en hinderspunkt
ligger ”på” segmentet — där `wind()`s kollinjäritetstolerans på 1e-4
gör att till och med en nod 270pt från segmentet räknas som kollinjär, och
`inBetween()` (som förutsätter kollinjäritet) degenererar då till att bara testa
**x-projektionen**: hörnet blockerar om och endast om dess x ligger strikt inom
det ULP-breda intervallet mellan de två ändpunkternas x-koordinater. Vilken av de två
speglade radiella kanterna som böjs hänger därför på sista-ULP-ordningen hos
tre nominellt lika x-värden ur PRISM:s lösning — C böjer `Z->I`
(nodens `i` axelhörn hamnar inom sitt intervall), porteringen böjer `i->Z`
(nodens `I` hörn hamnar inom sitt eget). Att replikera `directVis` offline på
varje sidas dumpade hinderuppsättning återger varje sidas beslut exakt, och
att injicera oraklets `ND_pos` före dragningen i porteringen ger 0 skillnader
(`attribution-twopi.json`) — dragning och emission är bytetrogna.

`1855` är radial-/stjärnvarianten, **spegelbilden**, av samma flyttalsmekanism i PRISM före
dragningen (godkänd 2026-07-11): dess 31 löv ligger exakt på en cirkel, så
stjärnlayouten är spegelsymmetrisk och PRISM:s överlappsborttagning vilar på en
symmetriinstabil jämvikt; en skillnad på 1 ULP mellan V8 och libm i `cos`/`sin` vid 5
lövvinklar i `circleLayout`s `setAbsolutePos` väljer den motsatta spegelbassängen,
och hela den radiella layouten hamnar som exakt x-axelspegling av
oraklets (största nodförskjutning 6.04pt, bb bevarad). Injektions-A/B bevisade
båda riktningarna: att mata in C:s exakta `circleLayout`-positioner i porteringens
PRISM återger oraklet nod för nod (3e-14), och att återställa enbart de 5
ULP-avvikande lövpositionerna vänder hela layouten tillbaka till porteringens
spegel. Fullständig orsaksanalys: `.agent-notes/twopi-radial-drift-rca.md` (beslutsjournal
2026-07-11).

Samma stjärna avviker på `circo`-spåret (godkänd 2026-10-16, 599
draw-op-skillnader, högst 0.71pt). Porten efterliknar clangs FMA-kontraktion och
evalueringsordning i `circpos.c`, så 31 av de 32 positioner som går in i PRISM
är bitexakta. Den sista avviker med 1 ULP, eftersom V8 och Apples libm avrundar
`cos`/`sin` olika vid tre barnvinklar i `positionChildren`. PRISMs
Delaunay-triangulering vänder sedan en nästan kocirkulär diagonal på
spegelaxeln. Injektions-A/B: med de nativa `cos`/`sin`-värdena stämmer porten
med oraklet. Med V8:s värden ger den nativa builden oraklets layout i 22 av 30
körningar och portens layout i de övriga 8, eftersom GTS ordnar sina kanter
efter allokeringsadress.

**Karakterisering av iterativa motorer: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Till skillnad från motorspåren för `circo`/`twopi`/`osage` ovan är `neato`/`fdp`/`sfdp`
ännu **inte** triagerade per id — `engine-walk.ts` registrerar ett fält `tolerance: 0.5`
för dessa tre och `parity-report.ts` återger dem i ett separat avsnitt,
”Iterative engines (±0.5 characterization)”, i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
uttryckligen **inte** jämförbart med de deterministiska godkännandegraderna på ±0.01 på andra ställen
i det här dokumentet. Aktuella antal mot graphviz 16.1.0 (universum på 929 poster; godkändandeprocenten
utelämnar indata som C-oraklet inte kan rendera, enligt [Överensstämmelse](./conformance.md)):

| motor | undersökta | inom ±0.5pt | icke-konforma | portfel / timeout | orakelfel |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 840 (90.5%) | 86 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 294 | 1 | 0 |

(Godkännandegraden för `fdp` steg från 77.5% eftersom den tidigare incheckade
genomgången föregick porteringsläget från det föregående uppdraget.)

(Den första genomgången, 2026-07-11 vid 762 poster, mätte 263/311/260 inom
±0.5pt — hoppet till dagens nivåer kom från rättningar per id som landat sedan dess,
främst neatos oportade hantering av `user_pos`/`P_SET`, konsolideringen av
motorinitieringen och rättningen av `setEdgeType` (makro mot funktion).)

Till skillnad från vid första genomgången är varje avvikande rad i universumet på 929 poster
individuellt tillskriven mot graphviz 16.1.0: injektionsverktyget
(`test/corpus/attribute-divergence.ts`) matar in det inbyggda oraklets `ND_pos` före dragningen i
porteringen och jämför på nytt, och varje nuvarande avvikande id är `drift-exonerated` (porteringens
dragning och emission återger oraklet exakt när lösardriften är borttagen) utom två. Två är separat
godkända residualer per id: sfdp `241_0`:s värdens libm-`pow`-drift (omdiagnostiserad av T28) samt sfdp `2556`:s
NaN-layout. fdp `241_0` klarar sig sedan `fix(T9): start swapped cdt faces at
the new diagonal as gts does` (se fdp-stycket under A9). fdp `2471` och sfdp `2371` behöll tidigare kantetikettpositioner (`lp`) som
skilde sig efter injektion, dvs. xlabel-placeraren valde en annan kandidat. `2471`
löstes när porteringens `dotneato_closest` började avrunda som clangs sammanslagna de
Casteljau-beräkning och DIST2: kantetiketternas ankare skilde sig med 1–2 ULP, vilket
tippade placerarens strikta inneslutningstest. `2371` löstes när porteringens R-träd
började kopiera rektanglar som värden, som C gör. Den inbyggda fdp-layouten för `2471`
varierar från körning till körning, så dess rad registrerar en körning. (sfdp `42` är A1-drift, se
[`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md).)
Klassgodkännandet nedan formaliserar den frikända mängden; aktuella antal finns i
instrumentpanelerna per motor
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Klassgodkännande av A1-drift (iterativa motorer, beräknat medlemskap).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
innehåller en **klass**post `"A1-drift"` per iterativ motor (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — skild från de
poster per id som används i spåren för `circo`/`twopi`/`osage` ovan (D2,
`plans/iterative-parity-campaign/decisions.md`). Till skillnad från en post per id
räknas aldrig klassmedlemskapet upp för hand i registret: `parity-report.ts`
beräknar det vid rapporttillfället ur motsvarande `attribution-<engine>.json`
(T1:s injektionstillskrivningsverktyg, `test/corpus/attribute-divergence.ts`)
— varje avvikande id vars inbyggda `ND_pos` före dragningen injicerades i
porteringen och jämfördes på nytt, och som konformerar vid ±0.5, får `verdict: 'drift-exonerated'` i
den filen, vilket betyder att de två motorernas iterativa lösare konvergerade mot
numeriskt olika men var för sig internt konsekventa layouter (en skillnad i
flyttalsackumulering enligt A1-karakteriseringen ovan, inte ett fel i porteringens dragning
eller emission). Belägg per id — hinkform, antal skillnader före och efter injektion,
detektering av enhetlig translation/spegling — finns i själva
tillskrivningsartefakten, och dubbleras inte i det här dokumentet eller i registret (D2). Ett id
som senare börjar passera helt, eller vars omtillskrivning ändrar utlåtandet,
faller ut ur klassen automatiskt vid nästa omgenerering av rapporten — ingen inaktuell
godkännanderedigering krävs, och inget vaktprov faller. Motorer vars
`attribution-<engine>.json` ännu inte har genererats återger klassen som
”attribution pending” med noll medlemmar, identiskt med att inte ha något godkännande
alls — klasseposten får föregå sin data (se
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Textmätning (typsnittsmått) → etikettdriven layout — STÄNGD <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): stängd.** Inget korpus-id är längre godkänt under den här
klassen; avsnittet bevaras som historisk dokumentation av mekanismen och av den
injicerbara kopplingspunkten `TextMeasurer` som neutraliserade den.
Successiva rättningar av textmätningen (övergången till `EstimateTextMeasurer`,
typsnittsmedvetna vertikala mått, rättningen av icke-ASCII UTF-8-byte) löste nästan
varje etikettdriven layoutavvikelse som tidigare fanns här. **`proc3d`** —
det tidigare kanoniska A2-exemplet — är helt **`conformant`** i alla tre
korpuskataloger (`graphs-`/`share-`/`windows-proc3d`): matchande bbox, noll
skillnader i banddata, noll skillnader i etikettankare.

**De sista medlemmarna drogs tillbaka (2026-07-01).** **`NaN`-familjen**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) fördes här långt efter att dess
nodgeometri redan matchade C exakt (76/76 referenspunkter). Dess verkliga
residual — 8 ändpunkter hos raka kanter på fyra motsatta tvåcykelpar
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) förskjutna 6–14 pt — diagnostiserades om och visade sig vara
**ingen typsnittsmåttseffekt alls**, utan två portfel i dots
dragning av multikanter (uppdrag `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Filordning för motsatta par.** Porteringen sorterade om varje grupp av parallella
   kanter efter ursprunglig skapandesekvens innan Multisep-filförskjutningar tilldelades; C
   tilldelar filer i den ordning edgecmp samlar dem (MAINGRAPH:s framåtriktade
   representant först, AUXGRAPH:s omvända medlem som andra — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). En tvåcykel vars omvända medlem deklarerades först
   ritade varje kant i den andras 18 pt-korridor.
2. **Falsk platt angränsning på sammanslagna kanter mellan ranker.** `markAdjacent`
   markerade `ND_other`-poster utan C:s skydd för samma rank
   (`flat.c:272-276`), så att `groupSize`s genväg för platt angränsning svalde
   gruppavbrott i portcmp.

Med båda rättade troget är familjen **`conformant`** i alla tre
kataloger (per element: 0 noder, 0 kanter som skiljer sig), och samma mekanism
stängde `42`, `clust2`, `ngk10_4` (structural-match → conformant) och flyttade
`b124` från diverged till structural-match — alla på tvåcykel-/parallellpar.

**Båda undersökningssidorna kör samma estimator — mätningen är neutraliserad.**
Det inbyggda orakel-`dot` körs under en headless `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) som endast symlänkar
insticksmodulerna `core` och `dot_layout` — ingen textlayoutmodul för `gd`/`pango`/`quartz`.
Med den platsen tom faller graphviz tillbaka på sin inbyggda
`estimate_textspan_size`. TypeScript-porteringens `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) är en trogen portering av samma rutin och är
standard i Node, löst av `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Båda sidor i varje paritetsjämförelse
mäter därför text med identisk estimator** — verkliga FreeType-/pango-glyfsteg
kommer aldrig in i jämförelsen. Därför pekar en regression i utlåtandet här på
layoutkod, inte på ett typsnitt, och därför löste en rättning av estimatorns egna
buggar (räkning av UTF-8-byte, typsnittsmedvetenhet i vertikala mått) större delen av
den här klassen helt i stället för att bara minska ett glapp i typsnittsmått.

**Den injicerbara kopplingspunkten `TextMeasurer`.** Den här neutraliseringen är bara möjlig
eftersom textmätning är en avsiktlig kopplingspunkt, inte hårdkodad i någon av
motorerna. `TextMeasurer` är ett gränssnitt med en metod (`measure(text, font, size,
flags) → {w, h, …}`) som injiceras i varje anropsställe som storleksbestämmer etiketter —
`polyInit`, `recordInit`, `initEdgeLabels` och `buildNodeLabel` tar var och en
mätaren som parameter; ingenting mäter text via en global. Den låses för tester/CI via
`setTextMeasurer(...)` eller `GV_TEXT_MEASURER=estimate`.
Kopplingspunkten gör det också möjligt att *bevisa* att en residual enbart beror på mätning: mata in i porteringen de
exakta bredder som C mätte (inhämtade från oraklet) och kontrollera om layouten
då återger C exakt. Det experimentet var det som ursprungligen motiverade
A2-utlåtandet för `proc3d` (se den historiska bilagan nedan) — tekniken
är fortfarande giltig. Dess omvändning avvecklade klassen: eftersom mätningen
bevisligen var neutraliserad på båda undersökningssidorna kunde `NaN`-kantresidualen inte
vara en typsnittsmåttseffekt, vilket tvingade fram omdiagnosen som hittade de två
dragningsfelen ovan.

::: details Historisk analys (ersatt 2026-06-30) — bevarad för dokumentationens skull
Materialet nedan beskriver ett tidigare tillstånd för den här klassen, innan
övergången till `EstimateTextMeasurer`, de typsnittsmedvetna vertikala måtten och
rättningen av icke-ASCII UTF-8-byte stängde större delen av den. Det beskriver inte längre aktuellt
beteende — det behålls bara så att resonemanget som ledde hit inte går förlorat. I
synnerhet: (1) breddsiffrorna för ”inbyggd C” i mätningstabellen nedan
är **FreeType**-värden från en renderingsväg med verkliga typsnitt; paritetsundersökningen
använder aldrig den vägen — båda sidor kör `estimate_textspan_size` (se
ovan) — så tabellen speglar inte hur paritet mäts i dag; (2)
överlagringsbilderna och golden/vår-renderingarna nedan visar en **icke-korpus-**
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt) som inte ingår i
paritetsundersökningen; korpusens `proc3d`-varianter är nu konforma med noll
skillnader, så det finns ingen överlagring att visa för dem; (3) berättelsen om
nod-x för `NaN`/`ratio=compress` nedan är ersatt — aktuell mätning visar att alla 76 nodpunkter
matchar exakt, så kedjan breddfel → nodförskjutning som den beskriver
inte längre gäller för `NaN`.

**`NaN` under `ratio=compress` (historiskt).** Familjen
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) var ett
A2-fall vars utlåtande då hamnade på *diverged* snarare än
*structural-match*. Vägen för komprimerad x-nätverkssimplex var trogen — varje
villkorsindata matchade C (breddvillkorets värde, `containNodes`-minlens,
antal hjälpkanter 471/vikt 1612, `lrBalance` och rankordningar var alla identiska)
*utom* de halva bredderna hos 9 noder, som mätaren rapporterade 0.5–1.03 pt
bredare än C. Packningen med vikt 1000 i `ratio=compress` gjorde de normalt slacka
vänster-till-höger-separationsvillkoren **bindande**, så det subpixelbreddfelet
— osynligt utan compress — kom upp till ytan som en inre x-förskjutning på −3..−5 pt. Den
förskjutningen fick den raka splinen `Target<->TThread` att hamna 0.55 pt
bortom en nodrutans vägg, så att dragningen böjde den till en extra bezierdel (7
punkter mot C:s 4) — en *strukturell* skillnad, därav *diverged*. Att tvinga de 9 bredderna
till C:s värden återgav C exakt (nod-x 53/76→0/76 avvikande; spline 7→4 punkter),
vilket bekräftade att residualen till 100 % berodde på typsnittsmått uppströms, inte på compress- eller
splinekoden, **för just den tidigare avvikelsen**. Fullständigt underlag (med en visuell
golden-mot-vår-jämförelse bredvid varandra + överlagringen av skillnaden mellan splinen med 4 och 7 punkter):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (skriftlig
genomgång: `…/nan-compress-xcoord.md`).

**Exempel på mätning av typsnittsmått (historiskt — FreeType mot estimat).**
Inbyggd Graphviz mäter, när den körs med en riktig textlayoutmodul (inte det headless
orakel som paritetsundersökningen använder), text med glyfsteg från FreeType/libgd.
Porteringens `EstimateTextMeasurer` replikerar inte en glyfrastrerare. För de flesta strängar
stämmer de två exakt överens; för vissa skiljer de sig med
en bråkdel av en punkt. Uppmätt exempel — Times-Roman 14 pt, strängen
`"/home/ek/work/src/lefty/lefty.c"` (31 tecken):

| | bredd |
|---|---|
| inbyggd C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimat) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

Samma nods andra etikettrad, `"93736-32246"`, mättes **identiskt**
(96.00 pt för båda) — felet är strängberoende och ackumuleras per glyf,
det är inte en enhetlig skalfaktor. Det här glappet mellan FreeType och estimat är verkligt men är
**inte** vad paritetsundersökningen mäter (båda sidor kör `estimate`); det skulle
bara spela roll om utdata från @knowvah/dot-engine jämfördes med en C-rendering med verkliga typsnitt
utanför den här undersökningen.

**Följdeffekt på den tidigare `proc3d`-avvikelsen (historiskt).** Etikettens
bredd styr nodstorleken, som styr layouten:

1. En bredare etikett → en något bredare nodruta (för en *ellips*nod skalas bredden
   dessutom med √2, så +0.75 pt text → +0.53 pt halv bredd).
2. Nodernas halva bredder sätter vänster-till-höger-separationsvillkoren i
   nätverkssimplex för x-koordinater; de villkoren `ROUND()`-as till
   heltal, så en breddändring på subpixelnivå kan välta ett villkor från *N* till
   *N+1*.
3. Nätverkssimplex väljer då en annan — men lika optimal —
   heltalstilldelning av x, vilket förskjuter vissa nodpositioner i x med 1–2 enheter.

För icke-korpus-`proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, inte
medlem i paritetsundersökningen) gav det en skillnad på **≤ 3.55 pt** i utsträckning i x
(**0.13%**), överlagrad nedan — **grönt = inbyggd C-`dot` (golden), rött =
@knowvah/dot-engine (vår)**:

![proc3d, överlagring av golden och vår: grönt = C, rött = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Förstorad syntes kanten nästan helt på de långa ovala
etiketterna med filsökvägar:

![proc3d, överlagring förstorad på de breda ovala sökvägsetiketterna: grönt = C, rött = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — inbyggd `dot` | Vår — @knowvah/dot-engine |
|---|---|
| ![proc3d renderad av C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderad av @knowvah/dot-engine](/img/proc3d-ours.svg) |

Den fristående genomgången (grundorsak, siffror per mått, reproduktionskommando)
finns på en egen sida:
[**proc3d — den kanoniska A2-avvikelsen i typsnittsmått (historisk)**](/sv/divergences-proc3d-a2).
Den sidan beskriver en löst avvikelse på en indata utanför korpusen; de aktuella
korpusvarianterna av `proc3d` är konforma.

**Varför den godkändes på sin tid.** Att byte-matcha FreeTypes glyfsteg
över alla typsnitt och strängar skulle ha krävt att dess
måtttabeller, hintning och avrundning replikerades — stort, ömtåligt och ändå inte
garanterat exakt. Textmätaren är en delad primitiv: varje etikett i
korpusen går genom den, så en rättning riktad mot en sträng riskerade att ge regressioner
för andra mot en omärklig vinst.
:::

### A3. `hypot`-oavgörande i splinedragning (`dot`) — STÄNGD {#a3-hypot-tie-break-in-spline-routing-dot}

**Status (2026-10-12): stängd.** Inget korpus-id godkänns längre under den här
klassen; avsnittet bevaras som historisk dokumentation av mekanismen. De tidigare
medlemmarna (`2368`, `graphs-b100`, `graphs-b104`, `241_1`, `2413_1`, `2413_2`,
`graphs-decorate`, `2371`) är alla **`conformant`** i den nya genomgången
(`test/corpus/parity-probe.json`).

**Mekanismen, och vad som stängde den.** Splineanpassaren (`Proutespline` ->
`findMaxDev`, `src/pathplan/route.ts`) delar en anpassad bezier vid den inre
dragningspunkt som har störst avvikelse. På en geometriskt symmetrisk kanal skiljer
sig kandidaternas avvikelser med ~1 ULP, så vinnaren avgörs av aritmetikens sista
bit. Porteringen hade tillskrivits ett oreducerbart glapp (”Apples `hypot`
matchar ingen portabel `hypot`”) och kompenserade med ett tolerant,
translationsekvivariant oavgörande. Den tillskrivningen vederlades: oavgörandet
avgörs av C:s *exakta* aritmetik, som går att återge. Commit `cdf597bc`
(`fix(pathplan): split splines at C's max-deviation point bit for bit`) portade
den: libms `hypot` för avståndet (`route.c:448`), C:s strikta `>`-jämförelse
(`route.c:139`) och clangs `fp-contract`-sammanslagning av bezierevalueringen
(`route.c:137-138`), determinanterna i `mkspline` (`route.c:181-183`), `dot`
(459), `normv` (413), `B01` (488) och `B23` (494). Det toleranta oavgörandet är
borta; knuten för `241_0` är låst i C:s dragningsram, eftersom C inte är
translationsekvivariant vid sådana oavgjorda lägen. Detta stängde `2368`, `2371`,
`2413_1`, `2413_2`, `graphs-b100`, `graphs-b104` och `graphs-decorate`.

`241_1` var inget `hypot`-oavgörande: den stängdes av `87347711`
(`fix(dot): match port-less edge endpoints in flat-adjacent aux layout`). C
grupperar varje angränsande platt kant som delar en huvudkant i ett enda
anrop av `make_flat_adj_edges` och testar efter portar över hela gruppen, så ett
portlöst syskon till en kant med port dras genom hjälpgrafen. Porteringen
delade gruppen efter förekomst av port och drog syskonet genom
`makeSimpleFlat`, vars klippning hamnar på en annan `bezier_clip`-punkt
(54.28 mot inbyggd 54.46).

Båda rättningarna verifierades med nya korpusgenomgångar utan regressioner
(journalrader ”T5 land” och ”T6 land”,
`plans/plantuml-tracker-2/decision-journal.md`).

**Belägg före rättningen (historiskt).** `2368` var referensmedlemmen.
Dess båge `376->76` delades mot motsatt hörn jämfört med C; grafen och
de rättningsföregående banorna från C och porteringen för den bågen bevaras för
protokollet.

::: details Grafdefinition (`2368.dot`)
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

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```


### A4. Orakel i ett erkänt trasigt tillstånd (familjen init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Berörda (graphviz 16.1-genomgång):** `1435` (structural-match, maxΔ 0.39 på
en spline-kontrollpunkt; var 503 mot 15.x-oraklet — nedgången bisekterades inte) och
`1581` (diverged: antal barn på toppnivå 39 mot 22, maxΔ 0). Familjemedlemmarna
`1939` och `2825` är **conformant** och har ingen post, och `2470`
och `graphs-structs` anslöt sig till dem 2026-07-11 (båda kollapsade till conformant
sedan ortho-rättningarna för adjacency-spill/chancmpid, fmadd `polylineMidpoint` och
half-even-avrundning av oavgjorda värden landat — porteringen återger nu oraklets
återhämtningsutdata exakt, inklusive de identiska förlorade kanterna); deras
godkännandeposter är avvecklade. **`2796` och `2471` anslöt sig till dem
vid graphviz 16.1** (båda `conformant` i den nya genomgången, godkännandeposterna
avvecklade): porteringen och 16.1-oraklet är nu överens om återhämtningsutdata för
`init_rank`, inklusive de förlorade kanterna. Orsaken isolerades inte med bisektion
(16.1-porteringen av dotgen `3cfbf55c` och rättningen av konsumtionen av förlorade
kanter `5b6b9bfc` är kandidaterna); beskrivningen av `init_rank` nedan bevaras som
klassens mekanism, och de två id:na är fastlåsta som conformant av paritetsgenomgången.

`1581` och `2825` var återhämtningsfall efter krasch (uppdraget fix-element-count-bucket):
fuzzer-/degenererade indata där uppströmstesterna hävdar **enbart**
att dot inte kraschar (`test_1581`: ingen ASan-överträdelse; `test_2825`: ingen
krasch när `rebuild_vlists` returnerar -1). C råkar ut för ett internt `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`) och dess återhämtning
kastar bort layoutinnehåll; porteringen når de **identiska besluten om
borttagning av ranksets** (varningsparitet verifierad: samma nod-/grafnamn i
`mark_clusters`-varningarna ”already in a rankset”, cluster.c:317-320).

`2825` är nu helt stängd. Uppdraget fix-2825-rebuild-vlists (efter 1581)
stängde först glappet ett lager: porteringen når C:s *exakta* interna felläge
— byte-identisk stderr inklusive meddelandeordning
(`Error: rebuild_vlists: lead is null for rank 1` därefter den oprefixade
fortsättningen `agerr(AGPREV, ...)`, `concentrate=true may not work
correctly.`) — där `dotLayoutPipeline` korrekt propagerar
`dot_position`s misslyckande för att hoppa över `dot_splines`/`dotneato_postprocess`,
som i C:s `dotLayout` (`if (r != 0) return r;` efter `dot_position`,
dotinit.c:322-325). En uppföljning (del 2) stängde sedan det återstående glappet i
renderingslagret: C:s `emit_node` spärrar varje nod med `node_in_box(n,
job->clip)` (emit.c:1806-1809), och på den här avbrottsvägen är `job->clip` degenererad eftersom
`GD_bb` aldrig sattes av `set_aspect` (inne i den överhoppade
svansen av `dot_position`) — så C emitterar *noll* noder, bara de (likaså
degenererade) klusterramarna. Porteringen portade samma `node_in_box`-spärr
(`src/gvc/device.ts:renderNode`, med `job.bb`/`job.pad` som
motsvarighet för en enda sida till `job->clip`) och slutade räkna om en
rimlig bbox ur levande nodpositioner när `g.info.bb` inte är satt
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` ordagrant, som
`init_gvc`s `gvc->bb = GD_bb(g)`, emit.c:3272) — varje layoutmotor
sätter redan `g.info.bb` själv innan `render()` körs på varje väg utan avbrott, så detta är byte-identiskt på friska grafer och ändrar bara utdata
på den här avbrottsvägen. `2825` är nu `conformant` (utdata med 4 element,
byte-identiska med oraklet). Se
`.agent-notes/2825-rebuild-vlists-abort.md` för det fullständiga mekanismspåret
för båda delarna. `1581` når aldrig det inkonsekventa tillståndet alls (en
*annan* uppströmsbugg i klusterfönster, inte `rebuild_vlists`), så den
lägger ut sin överlevande graf i sin helhet — det glappet är fortfarande öppet. Oraklets utdata
för `1581` är återhämtningsskräp utan uppströmsdefinierad semantik. Belägg:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). På
var och en av dessa indata är det **C-oraklet** som är trasigt, enligt
graphviz egen bedömning: `2471`, `1939` och `1435` är
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
uppströms (ärenden
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), jfr
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); det enda
rättningsförsöket, [utkast-MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
är fortfarande ett osammanfogat utkast (senast redigerat 2026-03-20). `graphs-structs` är
den urgamla förlustklassen för postruttning (#102/#242/#274/#1323) som stabila
graphviz 15.0.0 renderar korrekt — en regression i orakel byggt från utvecklingsgrenen.

**Vad C gör.** På `init_rank`-medlemmarna (`2796`, `2471`, `1939`)
sluter native dots hjälpgraf för x-koordinater en riktad cykel genom
klustrens väggvillkorskanter; dess
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
kan inte skanna alla noder, skriver ut `Error: trouble in init_rank`, och
layouten fortsätter från det återhämtningstillståndet — på `2471`/`2796` slutar den i
skräp från `Pshortestpath`-triangulering och förlorade kanter. På `1435` och
`graphs-structs` är det trasiga steget pathplan självt (återvändsgränder i
triangulering med örklippning; en förlorad postportkant).

**Indata verifierade, därefter gjorda trogna (det här är den bärande delen).**
Uppdraget `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
dumpade villkorsgrafen som båda sidor matar in i nätverkssimplex, rad för rad,
för varje familjemedlem — och fann att porteringens tidigare ”rena” beteende på
den här familjen kom från **fyra verkliga portfel**, alla rättade:

1. `flatEdges` hoppade över C:s
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)-
   anrop, vilket lämnade klustrens rankfönster inaktuella efter infogning av vnoder för platta etiketter
   (enbart detta fick porteringen att förlora **9** kanter på `2471` där C
   förlorar 6).
2. Straffet för kanter i samma `group` utlöstes på självloopar i stället för på
   ändpunkter i samma icke-tomma grupp
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` använde C:s `_WIN32`-värde 100; orakelplattformen använder 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. En återvändsgränd i trianguleringen avbröt `Pshortestpath` i stället för C:s
   varna-och-fortsätt + reservväg med rak linje
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Efter rättningarna är familjens NS-villkorsdumpar **radidentiska** med C
(253 rank2-anrop på `2471`; alla anrop på `1939`/`1435`/`graphs-structs`),
och porteringen följer C genom den erkänt trasiga återhämtningen: samma
förlorade kanter (`3->16` på 2796; de identiska 6 på 2471), samma elementträd.
`1939` blev helt konform. De återstående numeriska deltana (och 1435:s
avvikande pathplan-skräp) är beteende *inne i* återhämtningstillståndet, som
projektets policy medvetet inte jagar.

**`2723` (segmenteringsfel; fastnaglad, inte jagad).** Inbyggd `dot` får segmenteringsfel (exit 139)
på `tests/2723.dot` (oriktad, grupper med `rank=same`, märkta kanter), så C har
ingen utdata att matcha. Uppströmsärende
[#2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) är öppet och
`tests/test_regression.py:test_2723` är `xfail`. Porteringen kastar
`InternalError` (`INTERNAL_ERROR`, med en `TypeError` som orsak från
`src/layout/dot/flat.ts:flatLabelYpos`, där `rank[r-1]` är odefinierad). Utan
korrekt orakel står det ärliga misslyckandet kvar och porteringen ändras inte;
`src/layout/dot/flat-2723.test.ts` låser det. Uppdatera det testet om uppströms rättar
ärendet.

**Policyanmärkning.** Den tidigare hållningen för A4 (”porteringen uppfyller ärendets
förväntningar; replikera inte”) byggde på tron att porteringens
acykliska hjälpgraf kom från en harmlös lokal variant. Så var det inte — den kom
från defekt (1), som bevisligen förfelade `2471`. Trohet mot C-källkoden
vann: porteringen återger nu C:s erkänt trasiga utfall från
verifierat identiska indata, och varje post här bör **mätas om
när uppströms rättar motsvarande ärende** (oraklets utdata
kommer att ändras; räkna med att dessa id:n lyser upp som regressioner vid den uppgraderingen — det
är avsikten, inte röta).

**Belägg.** Jämförelsesidor per id (renderingar bredvid varandra + beläggsposter):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`tillägg efter rättning för 2796`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(baslinjen före rättning bevarad i
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnosartefakter: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ogiltiga indatabyte (teckenkodningsrepresentation) {#a5-invalid-input-bytes-encoding-representation}

**Berörda:** `1367` (diverged, maxΔ 0 — exakt en strukturell skillnad).

**Vad som skiljer sig.** Indatafilen innehåller en naken UTF-8-fortsättningsbyte (`0x80`)
i ett nodnamn. C behandlar nakna fortsättningsbyte 0x80–0xBF som ”giltiga
tecken som representerar sig själva” (`lib/common/utils.c:1200-1207`, ingen
varning), och `<title>`-texten för nodnamn förbigår teckenuppsättningskonverteringen helt
(`agnameof`-byte flödar rakt till `gvputs_xml`). Orakel-SVG:n innehåller därför
råbyten och är **inte giltig UTF-8** trots sin deklarerade
kodning. Porteringen avkodar ogiltig UTF-8-indata med reservvägen latin1
(`0x80 → U+0080`) och avger välformad UTF-8 (`\xc2\x80`).

**Varför godkänd.** Porteringens I/O-gräns är JS-strängar (webbläsarbibliotek).
En rå ogiltig byte kan inte tur-och-retur genom `renderSvg`s returvärde
som sträng; att byte-matcha C skulle innebära att förstöra utdatas kodning för varje
konsument. Reservvägen latin1 speglar C:s egen återhämtningssemantik ”behandlas som Latin-1”
(`utils.c:1249`). Det här är en begränsning under koden — representationslagret — inte
ett portabelt beteende som vi avstod från att portera.
Allt annat i 1367 är konformt: elementantal (23 polyline /
103 text / 44 polygon / 24 path) och alla koordinater matchar efter
rättningen av decorate (T6).

**Detsamma gäller varningar för HTML-`SIDES`.** `sidesfn` (`lib/common/htmllex.c`)
varnar en gång för varje byte i värdet som inte är `l`, `t`, `r` eller `b`. Den
skriver ut byten med `%c` och dess teckenbärande `char`-värde med `%d`. För en
icke-ASCII-bokstav (`é` är `0xC3 0xA9`) skriver den inbyggda versionen två ensamma
byte, så dess stderr är inte heller giltig UTF-8. Porten skriver ut samma två
varningar med samma tal (`-61`, `-87`). Eftersom dess varningar är JS-strängar visar
den varje byte som tecknet med den Latin-1-kodpunkten (`Ã`, `©`).

**Detsamma gäller vissa numeriska teckenreferenser i etiketter.** `htmlEntityUTF8` (`lib/common/utils.c`) skriver själv en referens värde som en till tre byte. För `&#127;`, `&#2047;`, ett surrogat (`&#55296;` till `&#57343;`) och varje värde över `0xFFFF` (`&#128512;` ger `FF 98 80`) är dessa byte inte giltig UTF-8, och den native versionen skriver dem som de är. Porteringen skriver det tecken som referensen anger. Textbredden uppskattas per byte, så även etikettens bredd kan skilja sig. HTML-etiketter påverkas inte: expat avkodar deras referenser till giltig UTF-8.

**Belägg.**
Jämförelsesidan för [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(rendering bredvid varandra + beläggspost).

---

### A6. Överflöd i `unsigned int` för ritytan vid degenererad indata {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Berörda:** sfdp `2556` (en NaN-layout; se posten för motorspåret). `1314`
— en fuzzer-härledd indata (`fontsize="991836031967s8"`) vars absurda
typsnittsstorlek blåser upp teckningen till ~2.75e11 pt — är **conformant** vid
graphviz 16.1 och dess godkännande är avvecklat: porteringen avkortar nu sidstorleken på
samma sätt som den inbyggda `ROUND`-konverteringen (`47f3165d`) och bygger sidklippet i
ordningen från `setup_page` (`da6c4a53`). Mekanismstyckena nedan beskriver den
ursprungliga skillnaden.

**Vad som händer.** C lagrar `job->width` / `job->height` som **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` av den enorma punktstorleken (`emit.c:1249-1250`)
svämmar över 32 bitar och slår runt modulo 2³², och SVG-bakänden skriver ut det genom en
**signerad** `%d` (`gvrender_core_svg.c:258-259`) — så C skriver
`height="-425618343"`. Porteringen behåller det matematiskt konsekventa (icke-runtslagna)
värdet. Alla andra värden — nodellipsens `cx/cy/rx/ry`, rotens `translate`,
polygonen, textens `font-size` — är byte-identiska; bara den översta `<svg>`s
width/height skiljer sig.

**Varför vi inte jagar det.** Att replikera C:s 32-bitars heltalsöverflöd är inget
layoutbeteende som är värt att portera, och indatan är degenererad. Ta upp det igen om uppströms
rättar överflödet (t.ex. genom att vidga fältet eller begränsa storleken).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenererad NaN-layout (`sfdp`, patologisk `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Berörda:** `2556` — `repulsiveforce=100` (⇒ den repulsiva kraften använder
`pow(dist, 101)`), vilket driver fjäder-elektrisk-lösaren till **NaN i båda
motorerna**. Det inbyggda oraklet avger självt `nan` för alla nod-/kantpositioner och en
degenererad omslutande ruta.

**Vad som händer.** Med alla koordinater NaN serialiserar de två implementationerna
skräpet olika: (1) grafens bb / bakgrundspolygon — C avrundar `NaN`
till `int`, vilket på arm64 ger skräp i skalan `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); porteringen behåller `0`. (2) Kanternas ritoperationer — den inbyggdas emit-pass
undertrycker `_draw_`/`_hdraw_` för en NaN-spline (och emitterar bara `pos`),
medan porteringen emitterar dem med NaN-kontrollpunkter. Nodritningar matchar (båda
undertrycker dem). Ingen verklig layout finns på någondera sidan.

**Varför vi inte jagar det.** Porteringen återger redan *samma* NaN-sammanbrott som
den inbyggda — rättningen som tog den dit är genuin (se nedan); det som återstår är bara
hur var och en serialiserar NaN-skräp. Att replikera C:s odefinierade beteende för `(int)NaN`
och dess undertryckande av ritning för NaN-splines är ingen meningsfull layouttrohet på en indata
vars layout är degenererad i båda motorerna. Ta upp det igen om uppströms begränsar
`repulsiveforce` eller sanerar NaN-positioner.

**Rättningar i porteringen som gjorde detta nåbart (inte bortjagade — verkliga buggar).** Innan
dessa kunde porteringen inte ens nå det degenererade tillståndet: (1) `armPow`
(`src/common/arm-pow.ts`) kastade fel på varje argument utanför snabbvägen; den portar nu ARM
`pow.c`s fullständiga specialfallsgren så att `pow(NaN, y) = NaN` som i libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) loopade oändligt på NaN-kontrollpunkter
eftersom dess konvergenstest var den naiva negationen av C:s `while (ABS > .5)`
(ekvivalent för ändliga värden, men inte för NaN); den speglar nu C exakt och
terminerar på NaN. Båda är C-trogna och påverkar bara NaN-indata.

---

### A7. Avrundningsgräns för boxvägg med `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Berörda:** `graphs-honda-tokoro` och (tillagt 2026-07-28, nytt i universumet på 905
poster) dess syskon i `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(båda structural-match, maxΔ ≈ 1 pt på den enda kanten `n012->n011`). Syskonet
skiljer sig bara genom attributen `samearrowhead`, som inte rör det här parets
dragning — dess geometri för `n012->n011` är byte-identisk med det godkända id:t på
både portens och oraklets sida, så mekanismen nedan gäller ordagrant även där.

**Vad som skiljer sig.** `maximal_bbox`s boxvägg för huvudkorridoren hamnar vid internt
x=90 i C mot x=89 i porteringen för den delade `samehead`-porten hos de två
parallella `n012->n011`. Konstruktionen av den delade porten (`buildSharedPort`) och
grupperingen av parallella är båda bytekonforma med C; glappet på 1 px är enbart en
artefakt av avrundningsgränsen för `round()` — ~1e-14 flyttalsbrus uppströms
välter ett värde som ligger exakt på en `.5`-gräns till det angränsande heltalet.
Porteringens `maximal_bbox`-formel speglar redan C:s exakt.

**Varför vi inte jagar det.** `round()` är en primitiv som varje dragen kant i
korpusen går genom; att putta på dess gränsbeteende för att matcha just det här fallet är en
korpusövergripande regressionsrisk för 1 px på 2 kanter — samma begränsning med delad primitiv
som avrundningen av kontrollhöljet som noteras i
`bbox-class-control-hull-vs-curve`. Fullständig diagnos:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-avrundning mot strikt IEEE (`dot`) — STÄNGD {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Status (2026-10-12): stängd.** Inget korpus-id godkänns längre under den här
klassen; avsnittet bevaras som historisk dokumentation. Båda kända fallen är
**`conformant`**: `2620` (2026-07-11) och `2646` (2026-10-12).

**Klass.** clang arm64 kompilerar orakelbinären med `-ffp-contract=on`,
vilket slår ihop utvalda multiplicera-addera-sekvenser till enskilda FMA-instruktioner;
porteringen körs på V8, som utför strikt IEEE-754-avrundning. På bitidentiska
indata skiljer de sig åt med 1–2 ULP i det uttryck som kompilatorn valde att
kontrahera. Två fall var kända, på två olika ställen, med två olika
förstärkningsmekanismer:

- **2646** — ULP:n uppstod inne i `Proutespline`s kubiska lösning med `points2coeff`/`solve3`
  och vände direkt antalet rötter i splineanpassaren.
- **2620** — ULP:n uppstod i `poly_init`s slinga för polygonens hörnutsträckning
  (nodstorlek) och förstärktes längre fram av `ortho`s trogna avkortning till heltal vid varje relax
  till en vändning av ett oavgjort läge med lika kostnad i labyrintkorridoren.

**Stängd: `2646` (`0cc05181`, `fix(pathplan): mirror clang fma contraction in
spline intersection`).** Tre långa kantben i smode (`edge2575`, `edge3905`,
`edge15467`) slutar vid en barriärvägg med parallell tangent, så
skärningskubiken i `splinefits` har en nästan dubbelrot. `points2coeff`
bygger den kubiken genom katastrofal utplåning; oraklet slår ihop
`route.c:397-398` och `solvers.c:43`, så den strikta IEEE-porteringen fick ett annat
antal rötter i `solve3`, en falsk korsning och en extra halvering av `a` (maxΔ
42.09). Den tidigare slutsatsen att detta var oreducerbart (”programvaru-FMA-emulering
över hela splineanpassaren”, med en delrättning som vederlagts) vederlades: kontraktionsplatserna
är ändliga och går att räkna upp. Porteringen speglar nu varje kontraktion i
`points2coeff` (`route.c:397-398`), `splineintersectsline` (371-372, 374,
360-361, 383-384), `solve3` (`solvers.c:41, 43, 46`) och dess inlinade `solve2`
(80, 85), och `solve3`/`solve2`/`solve1` är omportade till C:s form. Alla 42 432
fångade anrop av `Proutespline` för `2646` är bitidentiska med oraklet (journalrad
”T7 land”). Ursprunglig diagnos (fortfarande giltig för mekanismen):
`plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Berörda (historiskt):** `2620` (var structural-match, maxΔ 585; 423 skillnader
på 24 kantbanor + 22 pilspetsar). **Kollapsade till conformant 2026-07-11**:
den trogna porteringen av `sgraph`-spill i angränsningsbufferten + dubbelriktad
inneslutning i `chancmpid` (se `.agent-notes/ortho-maze-circo-rca.md`) tog bort
avvikelsen; godkännandeposten är avvecklad och det här avsnittet behålls som
dokumentation av A8-klassen.

**Vad som skiljer sig.** Pipelinen `ortho` (`splines=ortho`) är bytekonform
med C givet identiska indata — bevisat genom att injicera C:s exakta labyrintindata
(koordinater, `xsize`/`ysize`) i porteringens ortho-steg: 378/378 dragna
segment kommer ut byte-identiska, så ingenting i `src/ortho` är felaktigt.
Den faktiska avvikelsen är 1–2 ULP i labyrintens *indata*: nodens `ysize` (och, genom
ackumulering inom ranken, `ND_coord.y`) som beräknas i C:s slinga för polygonens
hörnutsträckning i `poly_init` (`shapes.c`), där `-ffp-contract=on`
slår ihop `R.x += sidelength*cosx` till en FMA som är ~1
ULP större än porteringens strikta IEEE-aritmetik (båda sidor implementerar det
aritmetiskt identiska uttrycket). `2620` har 173 polygonnoder med bråkbredd;
alla visar C ≥ port med 1–2 ULP. Den ULP:n förstärks — inte
införs — av `ortho`s Dijkstra-relax, som troget avkortar sitt
löpande avstånd steg för steg (`sgraph.c:165`, speglat av porteringen som
`Math.trunc`) över vikter härledda ur råa cellutsträckningar
(`maze.c:257`). Den ULP-förskjutna geometrin vänder ett oavgjort läge med lika kostnad i en korridor
för 4 dragna kanter (banor + deras pilspetsar); de återstående skillnaderna är
följdeffekter i form av omnumrering med ±1 spår från de 4 vändningarna.

**Varför godkänd (oreducerbarhet bevisad med ett kontrollerat experiment).** En
fristående C-testrigg som varierade enbart `-ffp-contract` återgav båda sidor
på det avvikande hexagonhörnet: `-ffp-contract=on` → `310.29250168188713`
(matchar oraklet), `-ffp-contract=off` → `310.29250168188707` (matchar
porteringen), med den avvikande operationen isolerad till hörn `i=3`
(`R.x=-0.50000000000000011` sammanslagen mot `-0.5` osammanslagen). Ett andra
experiment med indatainjektion (enda variabel: ortho-indatavärdena) bekräftade
förstärkaren: att mata porteringens egen `orthoEdges` med C:s exakta
`coord`/`xsize`/`ysize` kollapsar alla 4 korridoravvikelser till 0 — ortho-koden
har ingen defekt, den är bara känslig (liksom C:s egen kostnadsbaserade labyrintdragning) för en
förskjutning på 1–2 ULP i sin indata. Att matcha skulle innebära att emulera
clangs specifika FMA-kontraktion av ett kompilerat uttrycksträd i
`poly_init` — att jaga en kompilerad artefakt, inte att portera källsemantik.
Fullständig diagnos: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulerat undantag (inte godkänt): `triang.c:ccw`.** En kontraktionsplats
återges bit för bit i stället för att godkännas: pathplans `ccw`
kompileras till `fnmul`+`fmadd` (exakt första produkt − avrundad andra), så en
frågepunkt som är bitlika med en segmentändpunkt testar ISCW/ISCCW i stället för
ISON. `shortest.c:pointintri` förkastar då polygonhörn som ändpunkter
(”destination point not in any triangle”) och `makeMultiSpline` faller tillbaka
på vanlig dragning för varje sammanslagen tvåcykel — ett stort, diskret,
korpusövergripande beteende som porteringen måste matcha. Till skillnad från platserna `solve3`/`poly_init`
ovan (djupt inne i kompilerade uttrycksträd, rättning vederlagd) är `ccw`
en enskild fristående kompilerad funktion med ren semantik, så
`src/pathplan/triang.ts` emulerar den: en snabb väg med vanliga double och en
konservativ felgräns där vanliga och sammanslagna tecken bevisligen stämmer överens, och
en exakt väg med Dekker-produkt + dyadiska BigInt för fall nära noll.

---

### A9. libm-trigonometri med 1 ULP → vändning av CDT:s kocirkulära oavgjorda läge (`circo`/`twopi`-multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klass.** V8:s `Math.sin`/`Math.cos` är inte bitidentiska med Apples libm-
`sin`/`cos` (bevisat: oenighet på 1 ULP vid `2π·4.5/8`, en av de åtta
ellipshindrens hörnvinklar). V8:s trigonometriska avrundning beror också på CPU:n och Node-versionen: vid den vinkeln returnerar Node 22–26 på arm64 värdet som är 1 ULP fel, medan Node 26 på x64 och Node 20 på arm64 returnerar det korrekt avrundade. Genomgångarna och RCA:erna i denna logg kördes bredvid oraklet på dess macOS arm64-värd. `makeObstacle`s omskrivna 8-hörningars hörn
ärver den ULP:n, så triangeldragarens indatakoordinater skiljer sig från
oraklets med ≤6e-14. Symmetriska layouter (lika stora noder på en rank/ring) gör
dragarens fyrhörningar **exakt kocirkulära** i verklig aritmetik, så
det exakta incircle-predikatet ligger på en knivsegg: indata-ULP:n vänder dess tecken,
den begränsade Delaunay-diagonalen vänder, och korridorpolygonen som misslyckas i
`Pshortestpath` i oraklet (”destination point not in any triangle” →
reservväg med vanlig spline) lyckas i porteringen (eller tvärtom). De resulterande
splinerna skiljer sig med ~0.2–0.5pt. Syskon till de (nu stängda) **A3**/**A8**: en oreducerbar
flyttalsportabilitetsbegränsning under C:s källsemantik — att matcha
skulle kräva att återge Apples libm:s exakta avrundning av `sin`/`cos` i JS.

**16.1-omläggning av utgångsläget.** Geometrin i multisplinekorridoren saknade clangs
FMA-kontraktion (radikanden för ellipshörnet, `mkCtrlPts`, `DIST` = sqrt(fmadd),
punktprodukten i `line_intersect`); `f66ac638` (`fix(neato): mirror fma contraction in
multispline routing geometry`) speglade den. twopi- och neato-`241_0` — som den här
klassen hade tillskrivit det kocirkulära oavgjorda läget nedan — blev **conformant**
(godkännandena avvecklade), och sfdp `42` visade sig inte ha något oavgjort läge alls
(det är A1-drift, se [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). fdp-`241_0`
blev **conformant** senare, efter en andra rättning på porteringssidan i trianguleringen
(hörnordningen för ytor efter en kantvändning; se fdp-stycket nedan). circo-`241_0` blev **conformant** med `fix(T28): use host libm cos/sin for the
ellipse obstacle 8-gon`: på arm64 ligger V8:s `Math.sin(9π/8)` 1 ULP från det korrekt avrundade
libm-värdet, vilket flyttade ett hörn på varje ellipshinder och vände korridoren
(godkännandet avvecklat). Porteringen läser nu alla nio hörnvärden från en värd-libm-tabell, så resultatet beror inte längre på körmiljöns `Math.sin`. sfdp-`241_0` omdiagnostiserades av samma uppgift och är nu A1
(se sfdp-stycket nedan).

**Berörda:** `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 skillnader i etikettposition vardera — libm-ULP:n på 1 uppstår i
`poly_init`s enhetshörnstrigonometri (`hypot`/`atan2`/`sin`), lägger en nods
beräknade höjd en ULP förbi minimistorleksgränsen som oraklet landar på
exakt, och kaskaderar genom `floor()` i R-trädsladdningen för xlabel till en
enda vändning av etikettkandidat. En rättning med korrekt avrundad hypot provades och
VEDERLADES: den rättade `2343` men gav regression för `2168_3`, vars oktagonstorlek
går genom samma anrop där oraklets värde INTE är det korrekt
avrundade — ingen deterministisk hypot-policy matchar oraklet på båda).
`2168_1` hörde ursprungligen till den här klassen men blev
konform när porteringen emulerade oraklets fp-kontraherade `ccw`
(pathplan `triang.ts`): dess korridormisslyckande styrs av den FMA-bearbetade
`pointintri`-avvisningen av hörn som ändpunkter, som porteringen nu återger
bit för bit, så CDT-diagonalens ULP-oavgjorda läge dyker inte längre upp där.

**Varför godkänd (oreducerbarhet bevisad med ett kontrollerat experiment).**
CDT självt är frikänd: porteringens `mkSurface` är en trogen portering av GTS
0.7.6:s inkrementella insättning (`cdt.c`: delning 1→3 + rekursiv
`swap_if_in_circle`, villkorskanter skapade i förväg och obytbara,
`remove_intersected_*` + `triangulate_polygon` som upprätthåller villkoren), och
en fristående C-testrigg som länkar det **verkliga GTS-biblioteket** och matas med porteringens
bitexakta dragarindata återger porteringens triangulering yta för yta
(2168_1: 22/22; 241_0: 185/185). Exakt rationell utvärdering av incircle-
determinanten på de två indatamängderna bekräftar teckenvändningen (+1 med
porteringens indata, −1 med oraklets). Den återstående variabeln — skillnaden på 1 ULP
i trigonometrin — isolerades genom att jämföra bitmönster för `Math.sin`/`sin`
direkt.

**Godkännande på motorspårsnivå (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **xdot-motorspåren** för twopi/circo
(`parity-twopi.json` / `parity-circo.json`, inbyggt `dot -K <engine>
-Txdot` som orakel, `test/corpus/engine-walk.ts`, semantisk jämförelse av ritoperationer vid
±0.01 — se `test/golden/compare-xdot.ts`) visar samma mekanism
oberoende av SVG-undersökningen för dot-motorn som nämns ovan: twopi `2239` (1
skillnad i ritoperation — vändningen av textpositionen för etiketten `_ldraw_` på kanten, samma
ULP i enhetshörnstrigonometrin i `poly_init` som kaskaderar genom
R-trädskedjan för xlabel med `floor()`; `2343`, `share-b29` och `windows-b29`, som ursprungligen godkändes
under den här posten, *rättades* 2026-07-11 genom den trogna fmadd-kontraktionen
i `polylineMidpoint` — se stycket om b29-familjen nedan) och circo `241_0` (41
skillnader i ritoperationer, Δ≈0.2pt på bezierkurvan som dragits för kanten `1->2` — samma
vändning av CDT-diagonalens korridor; beslutsjournal, 2026-07-10, posten ”CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”; **avvecklad 2026-10-23** — conformant sedan porteringen tar värdens libm-`cos`/`sin`
för hindrets 8-hörning, se 16.1-omläggningen ovan). Godkänd på motorspårsnivå via
`test/corpus/accepted-divergences-engines.json`, som `parity-report.ts` sammanfogar i
`PARITY-twopi.md`/`PARITY-circo.md` — samma sammanfogning som
`accepted.ts` gör för dot-spårets `PARITY-dot.md`.

**circo `2475_2` och `2095_1` — kocirkulärt oavgjort läge för hypot i
closestNode (åtgärdat).** I en komponent med 28 noder i den här grafen på 10762
noder väljer circos `getRotation` (`circpos.c:73-92`) den blocknod som ligger
närmast layoutens origo med `hypot` för att avgöra delblockets rotation. Två
kocirkulära noder är i praktiken lika långt bort; V8:s korrekt avrundade
`Math.hypot` och Apples libm-`hypot` avrundar det avståndet 2 ULP från varandra,
vilket vänder det strikta `<`, väljer en annan nod och roterar/speglar
delblocket ~20° (18 noder flyttas, max 296.7pt; de andra 10744 noderna är
bitidentiska, liksom blockträdet, cirkelordningen och varje `centerAngle`).
`2095_1` träffade samma oavgjorda läge (2197 draw-op-skillnader, tre stela
blockrotationer). Båda var godkända fram till 2026-10-16, då sökningen efter
närmaste nod gick över till portens bitexakta modell av Apples `hypot`
(`src/common/libm-hypot.ts`); båda är nu konforma. Fristående reproduktion:
`.agent-notes/circo-2475-590-repro.dot`; fullständig orsaksanalys:
`.agent-notes/circo-b81-2475-rca.md`.

**twopi `2470` — ULP i radiella koordinater förstärkt av R-trädet för xlabel.**
2470 är en graf med 140 kanter vars HTML-`<table>`-etiketter på kanter klustrar sig vid
nästan sammanfallande radiella ankare. I neato-familjen placeras kantetiketter
som externa etiketter av den giriga xlabel-placeraren (`label/xlabels.c`),
som väljer det hörnkandidat som överlappar minst via ett Hilbert-ordnat R-träd.
Porteringens splines och nodkoordinater matchar oraklet ned till emissionsprecisionen
(noll skillnader i spline/nod/bbox även vid 1e-7), men en nods radiella
`ND_coord.y` skiljer sig med ~2 ULP (Apples libm-`sin`/`cos` mot V8:s `Math`) — långt
under överensstämmelseribban, men det ligger på vardera sidan om gränsen `floor(pos.y − sz.y/2)`
vid exakt 0 i `objplpmks`, och vänder det objektets R-trädsrektangel med
en enhet. Ändringen av Hilbert-ordning/trädgruppering gör att `RTreeSearch` beskär
en annan gren, så att ~140 etiketter vardera hoppar till det angränsande kandidathörnet
(varje skillnad är ett fast steg (+bredd, −radhöjd)). Placeraren, objektordningen,
rektangelavrundningen, `CombineRect` (som troget speglar C:s min-min-egenhet) och
Hilbert-nyckeln i int32 verifierades var och en som trogna; avvikelsen
är ULP:n i radiell trigonometri uppströms, oreducerbar av samma skäl
som twopi `1855`. Godkänd 2026-07-11; fullständig orsaksanalys:
`.agent-notes/twopi-2470-rca.md` (som också dokumenterar att id:ts
”godkänt” på morgonen var en artefakt av en inaktuell orakelbinär, inte en regression
i porteringen).

**osage `1855` — fp-contract-smetning av hindrens hörn.** Skilt från twopi-
`1855`-posten om radiell spegling ovan: under osage är nodcentrum bitexakta
mot oraklet, och de 110 skillnaderna i ritoperationer är tre hinderdragna kanter
placerade på spegelsidan av en nodrad (X bitexakt, Y speglat). Oktagonhindrens hörn
från `circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) skiljer sig
från C med 3–4 ULP eftersom clangs `-ffp-contract=on` slår ihop kedjorna `a·b±c`
i `ellipse_tangent_slope`/`line_intersection` till FMA:er med en enda avrundning
medan V8 avrundar varje operation: C:s sammanslagna avrundning kollapsar en ränndalskolumn av
hörn-x-värden till en enda bitidentisk double (exakt kollinjär),
porteringens delar den i två värden som ligger 1 ULP isär. Det vänder
tangeringstestet `clear()` för sikt — ränndalen är inte längre blockerad — vilket lägger till ~20
siktkanter, och Dijkstra löser det oavgjorda läget i homotopin upp/ned åt
spegelsidan. Kontrollerat experiment: att injicera C:s exakta hinderkoordinater
i den i övrigt orörda porteringen ger **noll** avvikande
kanter, vilket frikänner kedjan med laglig arrangering, sikt, Dijkstra och spline
helt; att injicera enbart C:s libm-`cos`/`sin` gör ingenting. Godkänd
2026-07-11; fullständig orsaksanalys: `.agent-notes/osage-spline-family-rca.md`.

**b29-familjen (twopi, åtgärdad).** De fyra b29-varianterna delade en knivsegg:
etiketten `EqmtTyp` på en kant (`Node14732->Node14731`) låg på ett exakt oavgjort läge i
sidval i placeLabels, vars utfall berodde på layoutdrift på 1 ULP i twopi i de omgivande
objekten. Med den trogna fmadd-kontraktionen i `polylineMidpoint` (rättning för
states-familjen, 2026-07-11) blev porteringens etikettankare bitidentiskt med oraklets,
men det oavgjorda läget avgjordes ändå åt motsatt håll på två av de fyra varianterna
(`graphs-b29`, `linux.i386-b29`) medan de andra två (`share-b29`, `windows-b29`)
konformerade — och `2343`s godkända A9- etikettskillnad försvann helt. Gräns: 1
ritoperation, Δ12pt i etikettens y. Den 2026-10-20 började varje Bézier-evaluering i
porteringen gå via en enda sammanslagen `bezier()`, eftersom clang kontraherar graphvizs
`Bezier` (`e37e72f0`). Det eliminerade driften uppströms: `graphs-b29` och
`linux.i386-b29` konformerar nu också, och deras godkännanden är återkallade.
Fullständig orsaksanalys: `.agent-notes/twopi-states-rca.md`.

Samma knivsegg i placeLabels dök upp på **osage**-spåret (godkänd 2026-07-11,
fullständig orsaksanalys: `.agent-notes/osage-small-tail-rca.md`): `linux.i386-b29` och
`share-b29` (2 skillnader i ritoperationer vardera — en kantetiketts x-ankare hamnar på
878.28 mot 841.06, placerat symmetriskt kring den bitidentiska splinemittpunkten 859.67,
dvs. ±halva etikettens bredd; de två varianterna speglar varandra) och `1652` (2
skillnader i ritoperationer — två kanter vänder vardera ett etikettankare kring en
identisk mittpunkt, en i x och en i y, med bitidentiska splines och pilspetsar; oraklet
renderar fullständigt, så detta är inte det kända timeout-flaket hos den inbyggda). I
varje fall var kantgeometrin bitexakt och bara det oavgjorda läget i etikettens sidval
avgjordes åt motsatt håll på omgivningar med 1 ULP drift. Den sammanslagna `bezier()`
från 2026-10-20 (`e37e72f0`) eliminerade även den driften: alla tre konformerar nu,
liksom det ogodkända osage-`2371`, och deras godkännanden är återkallade.

Osage-spåret har tripletten `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; godkänd 2026-07-11, fullständig orsaksanalys i
`.agent-notes/patchwork-tail-rca.md`): den enda avvikande operationen är
den nakna transcendenta `cos(π+θ)` vid ett förvridet fyrhörnings hörn med orientering 180 —
V8:s `Math.cos` är korrekt avrundad medan Apples libm-`cos` har ett
argumentberoende fel på ±1 ULP (så bara under libm är `|cos(π+θ)| ≠
|cos(θ)|`); nodstorleksdeltat på 1 ULP matas in i packs `GRID`/`ceil`, välter ett
oavgjort läge i omkretsen, och qsort placerar två komponenter i varandras packningsceller —
ett stelt byte av hela noder utan form- eller dragningsfel. Ingen
deterministisk omskrivning kan återge en inte korrekt avrundad libm-
transcendent, den typiska formen för A9.

Samma mekanism bekräftades 2026-07-28 på det större syskonet
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nytt i
universumet på 905 poster; 112 skillnader i ritoperationer, enbart osage). Den avvikande operationen
är samma ULP-plats på 1 i `cos(π+θ)` för nod `9004` — C:s och porteringens `bb.x`-
värden matchar den ursprungliga orsaksanalysen byte för byte — men på den här indatan med 76 noder
går propageringen i stället genom osages `arrayRects`: `acmpf` sorterar packceller
efter den råa summan `width+height`, och libms för höga bredd på 1 ULP gör att
`9004` sorteras strikt före sina roterade syskon `9000/9002/9006` medan
V8:s korrekt avrundade värde lämnar ett exakt oavgjort läge mellan fyra för den instabila
qsort att ordna annorlunda — olika radvisa celler, ett byte mellan `9002`/`9006`
och en kaskad av `fmax` på kolumnbredd som förskjuter 8 grannar i x.
Att mata porteringens egen `arrayRects` med C:s nodstorlekar jämfört med porteringens nodstorlekar
återger genomgångens 10 flyttade noder med byte-matchande x-deltan,
vilket sluter orsakskedjan.

Ytterligare två fall på motorspåret orsaksanalyserades och godkändes 2026-07-11
(fullständig orsaksanalys: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 skillnader i ritoperationer,
då tillskrivna samma CDT-kocirkulära incircle-oavgjorda läge som circo-posten ovan;
**avvecklad vid graphviz 16.1** — den är conformant sedan
`f66ac638`, så vändningen av korridoren mellan 14 och 8 punkter var den ospeglade
FMA-kontraktionen, inte ett oavgjort läge) och circo
`windows-tree` (10 skillnader i ritoperationer på en solfjäderkant — circos placeringstrigonometri
lägger `node2.y` en enda ULP ovanför `node8.y` kring det exakt symmetriska
värdet 18.0, och `closestSide`s val av dyna-huvudport vänder TOP/BOTTOM vid
just det oavgjorda läget; nodpositioner och rutor är i övrigt bitidentiska med
oraklet; **avförd 2026-10-18** — den är konform sedan porteringens DIST2 använder clangs sammanslagna form, som avgör just denna oavgjorda jämförelse som C).

**sfdp-motorspåret — `241_0` (omklassificerad A9 → A1, 2026-10-23).**
<a id="a9-sfdp-fp-ties"></a> sfdp:s xdot-motorspår (`parity-sfdp.json`,
inbyggt `dot -Ksfdp -Txdot`, ±0.5) förde här upp `241_0` som CDT:s kocirkulära
incircle-oavgjorda läge. `fix(T28)` omdiagnostiserade det med en instrumenterad inbyggd sfdp:

- `241_0` — 7 skillnader i ritoperationer på kant 1->2 (`ptCount 8 vs 20`). Layouten driver
  från den första repulsiva kraftermen, där macOS libm:s `pow(dist, 2)` returnerar 1 ULP
  under korrekt avrundning (grövsta nivån, iteration 22; se posten om värdens libm-`pow`
  under luckor i layouttrohet), och adaptiv kylning förstärker det till positioner på
  knivseggen där kant 1->2 dras annorlunda. Injektion av inbyggda `pow`-värden gör varje
  spårrad och den slutliga xdot identiska. Dragningsresidualen som sågs med injicerade
  positioner var dels en injektionsartefakt och dels V8:s `Math.sin(9π/8)` (1 ULP fel på arm64) i hindrets
  8-hörning, som porteringen nu tar från värdens libm (rättningen som även gjorde
  circo-`241_0` conformant). Det som återstår är A1-drift.

> **sfdp `42` omklassificerad från A9 till A1-drift (graphviz 16.1-synk).** Den fördes upp
> här som ett CDT/libm-incircle-oavgjort läge. Uppdraget fann något annat
> ([`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)): den tidigare
> korridorvändningen var en FMA-felportering på portsidan i multisplinekorridorens geometri,
> rättad av `f66ac638` (`fix(neato): mirror fma contraction in multispline
> routing geometry`); med inbyggda positioner injicerade återger porteringen nu
> den inbyggda xdot exakt. Den återstående residualen (nodförskjutningar 0.06-0.65 pt) är
> iterativ drift som seedas av en oenighet på 1 ULP i Apples libm-
> `pow(dist, 2)` mot porteringens ARM-`pow` på den grövsta nivån, förstärkt av
> de finare nivåerna — A1 (se [A1](#a1-floating-point-determinism-force-directed-engines)).

> **`2095` omklassificerad från A9 till A1-drift (2026-07-22).** Den fördes tidigare
> upp här som ”hypot-syskonet” (drift under 0.7pt på kanterna hos en nod
> med tomt namn `""->"4"`). Den residualen var en **artefakt i verktyget**: attribueringsinjektorns
> regex `GVTS_POS` krävde ≥1 namntecken, så noden med namnet `""` injicerades aldrig
> och drog med sig sina två anslutna kanter. Med injektorn rättad att matcha
> tomma namn (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`) injiceras sfdp `2095`
> till **0 residual** — ren kraftdrift, täckt av den beräknade klassen A1-drift,
> inte ett oavgjort flyttalsläge i dragningen. Dess godkännande per id togs bort från
> `accepted-divergences-engines.json`. (Samma fynd som för fdp `2095` nedan.)

**Nytt kontrollerat experiment (2026-07-21).** En sond för `hypot`, inbyggd mot V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): att kompilera
systemets C-`hypot` och jämföra med Nodes `Math.hypot` på representativa
avvikelseindata för platta kanter visar en oenighet på 1 ULP för 2 av 6 (Δ 7.1e-15 och
5.7e-14) — knivseggen vid delningströskeln som vänder antalet delningar.
Oreducerbar: ingen portabel hypot återger Apples libm (precedensfallet
`arm-pow.ts` för samma gräns). `sfdp.241_0`, en gång godkänd under den här klassen,
är A1-drift sedan T28 (se ovan). `sfdp.42` ingår **inte** i den här
klassen: dess registerpost är A1 (`comparisons/sfdp-42.md`), och sonden ovan
förklarade den inte.

**fdp**-xdot-motorspåret (`parity-fdp.json`, inbyggt `dot -Kfdp -Txdot`,
±0.5) visade tidigare samma graf, `241_0`, som den här klassen: med
oraklets exakta positioner före dragningen injicerade återstod 11 numeriska
skillnader i `unfilled_bezier` på en kant (`0->1#0`, maxΔ 3.39pt), och de
tillskrevs det kocirkulära incircle-läget. Den tillskrivningen var fel. `fix(T9): start swapped
cdt faces at the new diagonal as gts does` (2026-10-22) hittade ett fel i
porteringen: GTS `swap_if_in_circle` bygger sina två nya ytor som
`gts_face_new(en, e5, e2)` och `gts_face_new(en, e3, e4)` (`cdt.c:509-511`),
och `gts_triangle_vertices` läser en yta utifrån dess kantordning, så den inbyggda
listar dem som (v3, v4, v2) och (v4, v3, v1); porteringen lagrade båda roterade ett steg,
och multisplineroutens `triCenter` summerade hörnen i den ordningen. Med
ordningen rättad stämmer fdp `241_0` med den inbyggda på varje spår (xdot klarar, json
conformant, plain och stderr lika), och dess poster i `accepted-divergences-engines.json`
och `accepted-divergences-json.json` är avvecklade. fdp:s `2095` är däremot **A1-drift, inte A9**: att injicera den
enda noden med tomt namn (efter att attribueringsinjektorn rättats att matcha
noder med namnet `""`) kollapsar dess residual till noll — den tidigare ”A9-svansen” var
den oinjicerade noden med tomt namn som drog med sig sina anslutna kanter. Godkännandet
för sfdp `2095` hade samma blinda fläck — en ny omgenerering av sfdp-attribueringen (2026-07-22) med den rättade
injektorn bekräftade att även den injiceras till 0, och dess godkännande togs bort (se
notisen `2095 omklassificerad` ovan).

**sfdp `2168_3` — Apple-libm-`sin` 1 ULP i `poly_init` (stängt, oreducerbart).** **Berörda:** sfdp `2168_3` (endast stderr: porten skriver ut en extra `Pshortestpath`-varning; xdot-motorspårets genomgång passerar, eftersom båda sidor faller tillbaka på raka linjer). **Vad som skiljer sig:** `shapes.c:2329` beräknar `temp = GAP / sin(gamma)` (port `src/common/poly-sizing.ts:379`); för gamma = 1.0092081171617377 ger macOS-libm 0.8464104077694533, V8 det korrekt avrundade värdet 0.8464104077694532 (1 ULP). Skillnaden når multispline-routern (`neatosplines.c:428,444` → `multispline.c:598`) som routerpunkt 10/18, y 28.391789367446776 mot …78; den kocirkulära trapetsen (punkterna 9, 10, 15, 16) trianguleras då med en annan Delaunay-diagonal, så kantens 1 korridorpolygon skiljer sig och `Pshortestpath` misslyckas på portens polygon. **Varför accepterat:** ett kontrollerat experiment som endast injicerar det `sin`-värdet gör stderr, trianglar, polygoner och xdot identiska med nativ (`atan2` ensamt gör det inte); sfdp-positionerna är bitidentiska, och incircle-predikatet, pathplan, `makeObstacle`-hypot och aritmetikordningen i konturringen har uteslutits. Att matcha det kräver en bitexakt modell av Apples `sin`, vars källkod inte är offentlig; ingen portabel kod kan reproducera det (samma gräns som prejudikatet `arm-pow.ts`). **Belägg:** [`plans/post-16-1-followups-2/decision-journal.md`](https://github.com/knowvah/dot-engine/blob/main/plans/post-16-1-followups-2/decision-journal.md), raden 2026-10-20 T13.

---

### A10. V8:s `Map`-storleksgräns vid polyominopackning (`2784`, fem pack-baserade motorer) {#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}

**Berörda:** `2784` på `circo`, `twopi`, `neato`, `fdp` och `sfdp`. Porteringen
kastar fel i xdot- och imagemap-genomgångarna för alla fem motorerna och i `json`-genomgången
för `circo`. I `json`-genomgångarna för `twopi`, `neato`, `fdp` och `sfdp`, och i
`plain`-genomgångarna för alla fem, blir det inbyggda oraklet självt inte klart inom
genomgångens tidsbudget, så de raderna är orakelfel. På `dot`, `osage` och
`patchwork` går den igenom.

**Vad som händer.** `lib/pack/pack.c` registrerar de celler som en komponent upptar i
en `PointSet`. För `2784` (en enda nod som är 3e16 pt hög, `splines="ortho"`) kräver den
trogna heltalsaritmetiken för `step`/placering 2 011 656 764 celler; inbyggd
16.1.0 blir klar på 482 s med 67.3 GB resident (101 GB som mest). Porteringens
`PointSet` är en JavaScript-`Map`, som V8 begränsar till 2^24 poster, så den kastar
`Map maximum size exceeded`.

**Varför godkänd.** En körmiljögräns under koden, inte ett logiskt glapp; orsaken är
den trogna aritmetiken i `97fcccd8` (före den räknade porteringen fram en liten,
felaktig layout och nådde aldrig gränsen). Det godkända utfallet är ett kastat
fel snarare än ett utlåtande `diverged`, så posterna i
`accepted-divergences-engines.json`, `accepted-divergences-json.json` och
`accepted-divergences-map.json` deklarerar `verdict: "port-error"` med
`errIncludes: "Map maximum size exceeded"`: de godkänner ett portfel endast när
det bär det meddelandet. Ett annat fel på `2784` skulle dyka upp som ett ej godkänt fel,
och `registry-staleness.test.ts` skulle flagga posten som inaktuell. Belägg:
[`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md).

### A11. Ordningen på GTS Delaunay-ytor vid degenererad indata — irreducibel {#a11-gts-delaunay-face-order-on-degenerate-input}

**Berörda:** Layouter som trianguleras via GTS (`lib/neatogen/delaunay.c`; 16.1-oraklet länkar GTS 0.7.6) vid degenererad indata: punkter på kanter eller kocirkulära rutnät.

**Vad som skiljer sig.** Porten numrerar Delaunay-ytor och ordnar varje ytas grannar (`neigh`) efter skapandeordning. Nativ GTS numrerar ytor i `GHashTable`-ordning: `closest_face` itererar en tabell med pekare som nycklar, så yt-id:n och grannordning beror på heap-adresser och varierar mellan körningar. Allt som härleds ur ytordningen kan därför avvika från en given nativ körning.

**Varför godkänd.** Inget deterministiskt mål finns. 60 körningar av den native binären på en degenererad indata gav 22 olika utdata, även med ASLR avstängt och `MallocNanoZone=0`; variationen är en egenskap hos oraklet under koden, inte ett fel i porten. Jämför ytor efter hörnmängd, inte id. Belägg: GTS-anteckningar från del 3 (`.agent-notes/post-16-1-followups-3.md`, "GTS face vertex order and nondeterminism").

### A12. Inget `<stdin>: `-prefix på lexerfel {#a12-no-stdin-prefix-on-lexer-errors}

**Berörda:** DOT-syntaxfel som lexern (`aagerror`) rapporterar på stderr.

**Vad som skiljer sig.** Den native `dot`-CLI:n som läser standardindata skriver `<stdin>: syntax error in line N …`; porten skriver samma meddelande utan prefixet `<stdin>: `.

**Varför godkänd.** `aagerror` (`lib/cgraph/scan.l:157`) lägger bara till `InputFile: ` när `InputFile` är satt. CLI:n sätter den till `<stdin>` vid läsning av standardindata; biblioteksingången `agmemread`, som porten speglar, lämnar den osatt och skriver inget prefix. Porten har ingen CLI, så det finns inget att rapportera. stderr-proben normaliserar prefixet vid jämförelse.

---

## Spårad lång svans (`dot`-attribut & specialfall) {#tracked-long-tail-dot-attribute-edge-case}

Vid **standardvärden** matchar motorn `dot` C-binären inom en snäv deterministisk
tolerans på golden-korpusen (utlåtandet `conformant`; se noten överst).
De återstående skillnaderna är den **långa svansen av attribut och
specialfall** — den historiskt svåra delen av varje Graphviz-portering. Till skillnad från
de godkända avvikelserna ovan *kommer* dessa att täppas till; de spåras live, med
antal, i
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategori | Vad som skiljer sig |
|---|---|
| **path-structure** | Splinedragning för kanter i vissa konfigurationer (t.ex. vissa fall med platta kanter och täta korridorer). |
| **element-count** | En funktion som avger fler/färre SVG-element än C i vissa grafer. |
| **color-stroke** | Skillnader i emission av linje/fyllning för specifika stilattribut. |
| **parser-gap** | Ett litet antal DOT-indata som tolken ännu inte helt accepterar. |

Om din graf bara använder vanliga attribut och motorn `dot` är du nästan
säkert på matchningsvägen med deterministisk tolerans. Om en layout ser fel ut, kontrollera `PARITY-dot.md` för
den indataklassen — det är sannolikt en spårad post med ett orakelförankrat
rättningsuppdrag, inte en okänd.

> **Notering om etikettdrivna fall.** Klassen för textmätning (A2) är stängd —
> ingen `dot`-graf är längre godkänd under den. En graf som i dag ligger på
> structural-match är en spårad lucka, inte en avvikelse i typsnittsmått.

### Pilspetsar på motsatta kanter med `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

När `concentrate=true` slår ihop ett antiparallellt par (`A->B; B->A`) till en
enda överlevande kant måste den kanten rita en pilspets i **båda** ändar. Detta är nu
portat (grenen `conc_opp_flag` i `arrow_flags`; se
`src/common/splines-clip.ts:arrowFlags`), så `graphs-b135`, `167` och `2087`
matchar (avvikelsen `element-count` med saknad pilspets och dess bieffekt på `@d` för oklippt spline
är båda borta).

Vissa concentrate-grafer **behåller en separat, sedan tidigare befintlig residual** som
rättningen av pilspetsar **inte** åtgärdar — det är en skillnad i nodens **x-koordinat**
(x-nätverkssimplex / kompassport), inte en defekt i pilspetsen:

- **`graphs-b15`, `graphs-b69`** — de stora postgraferna/klustergraferna av ”hiss”-typ.
  Concentrate aktiveras och slår ihop korrekt; residualen är ett x-delta på ~1pt i noden
  som förstärks till en skillnad i `element-count`/spline-`@d`. Själva emissionen av pilspetsen
  är nu korrekt (b69 får sina saknade pilspetspolygoner). Se
  agentanteckningen `b69-concentrate-undermerge` för grundorsaken i x-koordinaten.
- **`1453`** — avviker fortfarande på en `element-count`-orsak på toppnivå som inte har med
  pilspetsen i conc_opp_flag att göra.
- **`2825`** — avvek vid tidpunkten för den här pilspetsrättningen på en `element-count`-orsak
  på toppnivå som inte har med conc_opp_flag att göra (ingen sammanslagning av motsatta par
  utlöses där); sedan dess stängd av uppdraget fix-2825-rebuild-vlists,
  se A4 ovan.

Det här är spårade poster om x-koordinater / struktur, **inte** buggar i pilspetsar.

### Luckor i layouttrohet från fidelity-uppdraget 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Fidelity-uppdraget 2.0 gjorde oportade attributvärden till högljudda fel (se tabellen
`UNSUPPORTED_FEATURE` i
[Fel och undantag](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Det lämnade följande kvar, antecknat i `plans/v2-fidelity/decision-journal.md`.

**Högljudd, oportad.** `overlap=voronoi` med överlappande noder kastar fortfarande
`UNSUPPORTED_FEATURE` i neato, twopi, circo och sfdp: själva Voronoi-justeraren
(`vAdjust`s algoritm) är inte portad. Överlappstestet som avgör
om ett fel ska kastas är C:s eget (`countOverlap` över nodpolygonerna i `poly.c`).

**Kända luckor, fortfarande tysta.** Porteringen renderar dessa utan fel och
skiljer sig från inbyggd Graphviz. Funna av uppdraget `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); inte godkända avvikelser.

- **Varningen ”Unrecognized overlap value” från `getAdjustMode` avges inte.**
- **Roterade polygonhörn kan skilja sig från inbyggd i de sista bitarna
  (oreducerbart: värdens matematikbibliotek).** `poly_init` orienterar varje hörn med
  `atan2`, `hypot`, `sin` och `cos`. Med bitidentiska indata returnerar libm på macOS och
  V8 olika sista bitar (t.ex. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` vid nästa hörn:
  libm `…fffd`, V8 `…fffe`), så en ruta med `orientation=20` får hörnets y
  `-18` i porteringen och `-17.999999999999996` i den inbyggda. Inbyggd Graphviz självt
  varierar med plattformens libm, och en webbläsare kan inte anropa den. Porteringens egen
  aritmetik matchar C (ordningen i `RADIANS` fixerad; 776 av 1664 samplade hörn-
  koordinater är bitidentiska, resten skiljer sig enbart genom libm). Effekt:
  utlåtanden från `polyOverlap` för exakt beröring kan vända; med inbyggda hörn matchar varje
  utlåtande.
- **sfdp kan skilja sig från inbyggd på macOS (oreducerbart: värdens libm-`pow`).**
  Diagnostiserat med en instrumenterad inbyggd sfdp: positionerna förblir bitidentiska
  tills en term i den repulsiva kraften, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1` så `pow(x, 2)`), returnerar 1 ulp mindre än `x*x` från macOS libm
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, korrekt avrundat
  `…396`; macOS `pow(v, 2) != v*v` för 20 av 16201 samplade `v`). Det ändrar
  iterationens `Fnorm` i sista biten; sfdp:s adaptiva avkylning förstärker det
  till en annan (ofta speglad) layout. Porteringens `armPow` är ARM:s
  optimerade `pow` ur optimized-routines (glibc ≥ 2.28), dvs. det som Graphviz på Linux beräknar;
  orakelt på macOS är undantaget. Uteslutet: seedning (explicita `start=`-värden
  matchar), `pcp_rotate` (samma indata ger samma utdata), positioner och
  den attraktiva termen (bitidentiska). Exempel: en ensam triangel `a--b; a--c; b--c`
  med standardseed.
- **fdp kan skilja sig från inbyggd genom värdens libm-`cos`/`sin`.** fdp följer
  Graphviz efter 15.0.0 (repulsion med hypot-avstånd, `Mlimit`), med värdens
  libm-`hypot` återgiven bit för bit (`src/common/libm-hypot.ts`, 0
  avvikelser på 400k sampel). 251 av de 252 fdp-renderbara golden-indata
  matchar den inbyggda byggnaden exakt; den återstående
  (`parallel-cluster-ldbxtried`) placerar klusterportnoder med
  `T_Wd * cos(alpha)`, och macOS libm-`cos(-2.3840764867756761)` ligger 1 ulp från
  V8:s `Math.cos`; fdp:s kraftloop förstärker det till ungefär 3 tum. Apples
  `cos` går inte att återskapa ur en kort modell på det sätt som `hypot` går.
- **Inbyggda krascher som porteringen definierar.** Inbyggd Graphviz avslutas med 139 för neato
  `mode=KK` med `model=mds` och en kant med `len` (`mds_model` indexerar `GD_dist`
  med ett 1-baserat sekvensnummer: heapöverflöd), och för `model=circuit` med en
  osammanhängande graf. Porteringen släpper celler utanför intervallet i det första fallet
  och faller tillbaka på kortaste vägar i det andra; det finns ingen inbyggd utdata att
  jämföra med.

---

## Avsiktligt inte portat (icke-mål) {#intentionally-not-ported-non-goals}

Det här är medvetna omfångsgränser, inte buggar. Biblioteket riktar sig mot **SVG**
(plus de mellanliggande textformaten `json` / `xdot` / `dot` / imagemap).

- **Andra utdataformat.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  och GUI-/interaktiva bakändar ligger utanför omfånget. Använd SVG-utdata och konvertera
  vidare om du behöver raster.
- **Sidindelning med `page=` för SVG.** Inbyggd `dot` delar inte heller upp SVG på sidor (SVG-
  enheten sätter ingen sidindelningsflagga), så `page=` är verkningslöst på den här vägen i båda
  implementationerna — dokumenterat här bara för att det är ett vanligt
  förvirringsmoment.
- **Textutdata med `-Tplain`.** Uppskjutet (ett trogen textformat), inte uteslutet.
- **`gvpr`** (skriptspråket för grafbearbetning) — utanför omfånget.
- **C++-bekvämlighetsomslag** (`cgraph++`, `gvc++`) — C-API:t portas
  först; ett idiomatiskt TypeScript-bekvämlighetslager, om det önskas, skulle vara ett
  separat paket.
- **`fontnames=svg|ps` i textmätning i webbläsare.** I en webbläsare bygger
  canvas-mätaren sitt typsnitt av PostScript-aliasets
  familjelista för `fontnames=native` (`Times-Roman` → `Times, serif`), samma
  typsnitt som SVG-emittern renderar som standard. `TextMeasurer` bär inget
  grafsammanhang, så grafer som sätter `fontnames=svg` eller `fontnames=ps` mäts
  mot den inbyggda listan medan SVG anger svg-/ps-familjen. Aliasvikter
  som CSS inte definierar (`book`, `demi`, `light`, `medium`, `roman`)
  emitteras ordagrant, som i C; webbläsare ignorerar dem och renderar normal
  vikt, och mätaren mäter normal vikt för att matcha. Utdata i Node
  påverkas inte (den använder aldrig canvas-mätaren).
- **Indata med flera grafer och `NULL` för tom indata.** `parse` och `renderSvg` läser
  en DOT-sträng på samma sätt som cgraphs `agmemread`. Efter den första grafens
  avslutande klammer anropar `endgraph` (`lib/cgraph/grammar.y`) `aglexeof`
  (`lib/cgraph/scan.l`), som skjuter tillbaka en filslutstoken, så att inget efter den
  klammern lexas: efterföljande text, oavslutade strängar eller kommentarer och
  ytterligare grafer ignoreras utan fel eller varning. `dot`-CLI:t anropar i stället
  `agread` igen och renderar varje graf i en fil, så en fil med två grafer ger där två
  SVG-dokument och här ett (porteringens rendering matchar CLI:ts första dokument på
  korpusfilerna med flera grafer `1845`, `2835` och `graphs-multi`, som förblir i
  karantän). För att rendera flera grafer delar man upp källan och anropar `renderSvg`
  en gång per graf. För tom indata eller indata med bara kommentarer returnerar
  `agmemread` `NULL`, och CLI:t skriver inte ut något; `parse` returnerar i stället en
  tom oriktad graf och `renderSvg` renderar den, eftersom API:t returnerar en `Graph`
  och en SVG per anrop.
- **Enbart inbyggda mekanismer** ersatta av webbläsarsäkra motsvarigheter: dynamisk
  inläsning av insticksmoduler (`dlopen`) ersätts av statisk registrering av motorer/renderare;
  filsystemsläsningar (typsnitt, bilder, konfiguration) ersätts av återanrop som anroparen tillhandahåller
  (t.ex. `setImageSizer`). Beteendet bevaras; mekanismen skiljer sig.

---

## Rapportera en avvikelse {#reporting-a-divergence}

Om du hittar utdata som skiljer sig från C och som **inte** är en godkänd avvikelse ovan,
inte finns i `PARITY-dot.md` och inte är ett icke-mål, är det en bugg som är värd att rapportera — C-
källkoden är specifikationen, och ej listade avvikelser behandlas som defekter, inte som
godkänt beteende.
