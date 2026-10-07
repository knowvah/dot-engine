---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
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
därifrån. Prosaavsnitten nedan förklarar varje post (A1 och A3 är aktiva; A2 är stängd
och bevarad som historik); ett CI-test (`accepted-divergences.test.ts`) säkerställer att
varje godkänd graf fortfarande avviker, så att den här listan inte kan ruttna i tysthet.

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
iterativa modellens determinism; en separat, snävt avgränsad flyttalsavvikelse i
`dot`s splinedragning behandlas under **A3** nedan.

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
designval — samma familj som A3:s känslighet för Apples `hypot`. Det går inte att
garantera bitidentiska transcendenta/FMA-resultat över alla målmiljöer, så ett
byte-krav vore otestbart snarare än bara dyrt. **Att bedöma A1** (i stället för att
bara förbehålla sig) krävde ett separat paritetsspår med inbyggd motor — byggt
2026-07-11 som `test/corpus/engine-walk.ts` + `parity-report.ts`, som undersöker varje
indata under sin egen motor i stället för `dot`. Det ärliga taket för det arbetet är
att **minska** A1 till ”ingen aktiv avvikelse på referensplattformen”, aldrig att
eliminera förbehållet om olika plattformar; resultaten hittills (nedan) håller sig
till det taket: `circo`/`twopi`/`osage` har var och en dragit fram och orsaksanalyserat ett
fåtal verkliga A1/A9-fall, och `neato`/`fdp`/`sfdp` ligger nu på 90.8/77.5/68.0%
inom 0.5pt från inbyggd över universumet på 910 poster, vilket betyder att den
portade aritmetiken (`fma.ts`, `arm-pow.ts`, matchad PRNG) håller för de flesta
grafer — och varje kvarvarande avvikande id är individuellt tillskrivet genom injektion
(lösardrift mot portfel) i stället för att lämnas som otriagerad drift; se
karakteriseringen av de iterativa motorerna nedan.

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

**Karakterisering av iterativa motorer: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Till skillnad från motorspåren för `circo`/`twopi`/`osage` ovan är `neato`/`fdp`/`sfdp`
ännu **inte** triagerade per id — `engine-walk.ts` registrerar ett fält `tolerance: 0.5`
för dessa tre och `parity-report.ts` återger dem i ett separat avsnitt,
”Iterative engines (±0.5 characterization)”, i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
uttryckligen **inte** jämförbart med de deterministiska godkännandegraderna på ±0.01 på andra ställen
i det här dokumentet. Aktuella antal (universum på 910 poster; godkändandeprocenten utelämnar
indata som C-oraklet inte kan rendera, enligt [Överensstämmelse](./conformance.md)):

| motor | undersökta | inom ±0.5pt | icke-konforma (alla tillskrivna, godkända) | portfel / timeout | orakelfel |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Den första genomgången, 2026-07-11 vid 762 poster, mätte 263/311/260 inom
±0.5pt — hoppet till dagens nivåer kom från rättningar per id som landat sedan dess,
främst neatos oportade hantering av `user_pos`/`P_SET`, konsolideringen av
motorinitieringen och rättningen av `setEdgeType` (makro mot funktion).)

Till skillnad från vid första genomgången är nu varje avvikande rad individuellt tillskriven:
injektionsverktyget (`test/corpus/attribute-divergence.ts`) matar in det
inbyggda oraklets `ND_pos` före dragningen i porteringen och jämför på nytt, och
varje nuvarande avvikande id är antingen `drift-exonerated` (porteringens dragning
och emission återger oraklet exakt när lösardriften är borttagen)
eller ett av de få separat godkända residualerna per id (`241_0`:s
CDT-incircle-oavgjort på alla tre motorerna, neato `2239`, sfdp `42`/`2556`).
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

### A3. `hypot`-oavgörande i splinedragning (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Berörda:** `dot`-grafer med en **geometriskt symmetrisk** kantdragningskanal
— typiskt en kort, symmetrisk båge för platta kanter. Observerat exempel: `2368`,
som stannar på *structural-match* (maxΔ ≈ 10.2 pt på **en** kant, `376->76`).
Samma oavgörande dyker också upp på en **lång** kant (över flera ranker) in till ett nav
med högt inflöde när korridoren är exakt spegelsymmetrisk: `graphs-b100` /
`graphs-b104` (identisk källa) avviker med maxΔ 20 (exakt en rankrad) på den
enda knuten hos `Node23730->Node23729` — varje nodposition och all uppströms
box-/polygon-/spänd-bana-struktur är byte-identisk med C; endast `findMaxDev`s
val, på ~1 ULP, av vilken spegelsymmetrisk inre punkt som blir bezierknuten
skiljer sig. Den korta formen för platta kanter dyker också upp som `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — det avvikande syskonet till den orakelförankrade `241_0`, som C:s
brus i stället låter behålla den första. Samma oavgörande ger en delning av
slitskorridoren för en märkt tvåcykels bakåtkant i `2413_1` (structural-match, maxΔ 67.65) och
`2413_2` (maxΔ ≤99.55 när T11-rättningen av swapBezier-reverse landar — tills dess
domineras filens rapporterade maxΔ 1922.26 av en orelaterad, separat
spårad defekt), och en enda märkt kant inom ett kluster i `graphs-decorate`
(maxΔ 43.54); i vart och ett av fallen ligger de två kandidathörnen för delning inom
5.7e-13 (2413-familjen) / 3e-14 (decorate) från varandra innan
det positionsberoende bruset i Apples `hypot` väljer en vinnare. `2371`
(structural-match, maxΔ 16.8) visar samma fingeravtryck på två orelaterade
kanter (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): porteringen
avger den exakta spegelbilden av oraklets kontrollpunktsföljd på båda,
med knuten y vänd med identiskt Δ16.8 (övre/undre delningsbråk ombytta).
Dess ursprung bedöms med **MEDEL**förtroende snarare än med det BEKRÄFTADE
förtroendet för de andra medlemmarna: `2371` packar ~199 komponenter, vilket
kopplar loss pathplans lokala koordinater från sidkoordinater, så oavgörandet
kunde inte korreleras live till `route.ts:209` i tre
instrumenteringsförsök; ett ursprung i uppdelning av rakt läge eller i `recover_slack` efter klippning är
inte helt uteslutet. Fullständig diagnos:
`plans/residual-cleanup/analysis/2371-mirror.md`. De flesta dragna kanter
påverkas inte.

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

**Karakterisering.** Splineanpassaren (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) delar en anpassad bezier vid den inre dragningspunkt som har
störst avvikelse. När kanalen är symmetrisk är de två kandidatpunkterna för delning
ett **exakt matematiskt oavgjort läge**, och vinnaren avgörs då av ~1e-14 i
flyttalsutplåningsbrus i en bezierevaluering i absoluta koordinater
vars **tecken beror på absolut position**.

C:s avvikelseavstånd är libms `hypot`, och Apples `hypot` på macOS som
genererade oraklet är en proprietär implementation som bitvis matchar **ingen**
portabel `hypot` (uppmätt mot den i graphviz koordinatregim, bitvis
identiska andelar: V8:s `Math.hypot` ≈ 63%, en korrekt avrundad `hypot` /
Arm-stil ≈ 84%, fdlibms `hypot` ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). På grund av det ULP-bruset
**är C självt inte konsekvent**: det delar två *translationskongruenta* bågar mot
**motsatta** hörn. Inom `2368` är bågen `376->76` spegelbilden av den
geometriskt identiska bågen `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Hela deltat, överlagrat (12× förstoring på bågen `376->76` / `to1`) — **grönt = C
Graphviz, rött = @knowvah/dot-engine**. Båda är samma flacka nedåtbåge mellan
samma nodkanter; de skiljer sig med ~1–2 pt vid buken (den mittersta bezier-
kontrollpunkten), där C:s oavgjorda läge föll åt det motsatta hörnet:

![2368, båge 376->76: grönt = C, rött = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Allt annat matchar inom toleransen — samma omslutande ruta (608×148), nodpositioner,
etiketter, pilspetsar och alla andra kanter. De fullständiga renderingarna är visuellt
omöjliga att skilja åt:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 renderad av C Graphviz](/img/2368-c.png) | ![2368 renderad av @knowvah/dot-engine](/img/2368-port.png) |

Porteringen använder ett **translationsekvivariant** oavgörande (ett sant oavgjort läge löses alltid
till det första indexet), så den ritar *varje* sådan båge på samma sätt oavsett
position — den är självkonsekvent, och matchar C på de bågar där C:s brus också
behåller den första (t.ex. `256->436` och `241_0 5:ne->8:nw`), och avviker bara där C:s
brus vänder åt andra hållet (`376->76`). Ändpunkter, pilspetsens mål, de andra
kanterna, alla noder, etiketter och den omslutande rutan matchar inom toleransen; bara de
inre kontrollpunkterna hos den enda bågen flyttar sig (~1–2 pt vid buken).

**Varför godkänd.** Apples `hypot` är inte mer reproducerbar mellan JS-motorer och
processorer än FMA/`pow` i **A1** — det är samma portabilitetsbegränsning, bara
i `dot`s splinedragare. Att matcha C:s *positionsberoende* val skulle innebära att
anta C:s strikta oavgörande, som ligger i en **delad primitiv** som varje dragen
kant går genom: att göra det byter matchningen av `376->76` mot *nya* avvikelser på
de bågar där C landar åt andra hållet (det ger regression för `241_0` och ett orakelfall
med platt kant och `cnt=3`), ett nollsummespel som dessutom offrar porteringens
translationsekvivarians. Därför behåller vi den konsekventa (ekvivarianta) dragaren. Det här är
en begränsad, omärklig `dot`-avvikelse — inte en öppen bugg. Fullständig undersökning:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orakel i ett erkänt trasigt tillstånd (familjen init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Berörda:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Familjemedlemmarna
`1939` och `2825` är **conformant** och har ingen post, och `2470`
och `graphs-structs` anslöt sig till dem 2026-07-11 (båda kollapsade till conformant
sedan ortho-rättningarna för adjacency-spill/chancmpid, fmadd `polylineMidpoint` och
half-even-avrundning av oavgjorda värden landat — porteringen återger nu oraklets
återhämtningsutdata exakt, inklusive de identiska förlorade kanterna); deras
godkännandeposter är avvecklade.

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

**Belägg.**
Jämförelsesidan för [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(rendering bredvid varandra + beläggspost).

---

### A6. Överflöd i `unsigned int` för ritytan vid degenererad indata {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Berörda:** `1314` — en fuzzer-härledd indata (`fontsize="991836031967s8"`)
vars absurda typsnittsstorlek blåser upp teckningen till ~2.75e11 pt.

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

### A8. `fp-contract`/FMA-avrundning mot strikt IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klass.** clang arm64 kompilerar orakelbinären med `-ffp-contract=on`,
vilket slår ihop utvalda multiplicera-addera-sekvenser till enskilda FMA-instruktioner;
porteringen körs på V8, som utför strikt IEEE-754-avrundning och inte kan avge
`fma`. På bitidentiska indata skiljer de sig åt med 1–2 ULP i det
uttryck som kompilatorn valde att kontrahera. Portsidan är alltid det
strikta IEEE-754-resultatet; oraklesidan är alltid det FMA-kontraherade
resultatet. Det här är en portabilitetsbegränsning i kompilator/körmiljö under C-
källkodens semantik, inte en logisk defekt i porteringen — oreducerbar utan att
emulera clangs specifika kontraktionsval i programvara. Två fall
är kända, på två olika ställen, med två olika förstärkningsmekanismer:

- **2646** — ULP:n uppstår inne i `Proutespline`s kubiska lösning med `points2coeff`/`solve3`
  och vänder direkt antalet rötter i splineanpassaren.
- **2620** — ULP:n uppstår i `poly_init`s slinga för polygonens hörnutsträckning
  (nodstorlek) och förstärks längre fram av `ortho`s trogna avkortning till heltal vid varje relax
  till en vändning av ett oavgjort läge med lika kostnad i labyrintkorridoren.

**Berörda:** `2646` (structural-match, maxΔ 42.09 på 3 av 21 216 kanter:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — alla
långa kantdragningar med postport `:c->:nb_part` i smode). Syskon till **A3**: båda
klasserna är oreducerbara oavgjorda lägen på grund av flyttalsportabilitet inne i
`Proutespline`, men mekanismen är en annan — en artefakt av kompilatorns `fp-contract`,
inte libms `hypot`.

**Vad som skiljer sig.** På alla tre kanter avviker bara det sista anropet av `routesplines` (ett
rakt ben in i huvudporten). Dess ändpunkt ligger bitexakt på
barriärpolygonens undre vägg med tangenten parallell med den väggen
(`evs[1]=(1,-1.22e-16)`), så varje `splinefits`-kandidat tangerar
barriären vid `t=1` — en nästan dubbelrot till skärningskubiken.
`points2coeff` beräknar den kubiken genom katastrofal utplåning
(termer kring ~7446 som kollapsar till ~0.099). Oraklet (clang/arm64,
`-ffp-contract=on`) kontraherar `v3 + 3*v1 - (v0 + 3*v2)` till sammanslagna
multiplicera-adderingar, medan V8 utför strikt IEEE-avrundning — de två skiljer sig åt med
~9.1e-13 på **bitidentiska indata**, och det bruset vänder tecknet på
`solve3`s diskriminant: C hittar 1 rot (866.7, inom segmentet); porteringen
hittar 3 rötter med en falsk partnerrot vid `t=0.9999975 < 1-EPSILON2`. Den
falska roten utlöser en extra halvering av `a`, vilket vänder
sista delens tangentstorlek med en faktor 2 (i endera riktningen över
de 3 kanterna), vilket ger maxΔ 42.09 efter klippning (26 SVG-skillnader).

**Varför godkänd (oreducerbarhet bevisad med ett kontrollerat experiment).** Alla sex
anrop av `routesplines` dumpades på båda sidor — box, polygon, `PL`, start,
slut och `evs` är byte-identiska, liksom det tidigare (icke-slutliga) anropets
utdataspline; den enda avvikelsen finns i det sista anropets `solve3`. En
fristående testrigg med orörd C isolerade den enda variabeln: kompilering med
`-ffp-contract=off` återger **porteringen** bitexakt på alla 3 kanter; den
förvalda (`on`) kontraktionen återger **oraklet** bitexakt på alla 3
kanter. Porteringen stämmer alltså redan med C enligt strikt IEEE-754; avvikelsen
är helt och hållet orakelkompilatorns val av FMA-kontraktion, under C-
källkodens semantik — det finns ingen otrohet på källnivå att rätta. En
riktad rättning (att för hand emulera kontraktionen i `points2coeff`) provades och
vederlades: den rättar 2 av de 3 kanterna men inte den tredje, vars vändning
har sitt ursprung i `solve3`s egen interna kontraktion. En fullständig rättning skulle
kräva programvaru-FMA-emulering över hela splineanpassaren — en kostnad i den heta slingan
med korpusövergripande påverkansyta för avrundning, för en vinst på under en pixel på 3 kanter.
Fullständig diagnos: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

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
ellipshindrens hörnvinklar). `makeObstacle`s omskrivna 8-hörningars hörn
ärver den ULP:n, så triangeldragarens indatakoordinater skiljer sig från
oraklets med ≤6e-14. Symmetriska layouter (lika stora noder på en rank/ring) gör
dragarens fyrhörningar **exakt kocirkulära** i verklig aritmetik, så
det exakta incircle-predikatet ligger på en knivsegg: indata-ULP:n vänder dess tecken,
den begränsade Delaunay-diagonalen vänder, och korridorpolygonen som misslyckas i
`Pshortestpath` i oraklet (”destination point not in any triangle” →
reservväg med vanlig spline) lyckas i porteringen (eller tvärtom). De resulterande
splinerna skiljer sig med ~0.2–0.5pt. Syskon till **A3**/**A8**: en oreducerbar
flyttalsportabilitetsbegränsning under C:s källsemantik — att matcha
skulle kräva att återge Apples libm:s exakta avrundning av `sin`/`cos` i JS.

**Berörda:** `241_0` (circo Δ≈0.2 / twopi-rityta Δ≈9 genom korridorvändningen
på kanten `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
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
filed”). Godkänd på motorspårsnivå via
`test/corpus/accepted-divergences-engines.json`, som `parity-report.ts` sammanfogar i
`PARITY-twopi.md`/`PARITY-circo.md` — samma sammanfogning som
`accepted.ts` gör för dot-spårets `PARITY-dot.md`.

**circo `2475_2` — kocirkulärt oavgjort läge för hypot i closestNode.** I en
komponent med 28 noder i den här grafen på 10762 noder väljer circos `getRotation`
(`circpos.c:73-92`) den blocknod som ligger närmast layoutens origo med
`hypot` för att avgöra delblockets rotation. Två kocirkulära noder är
i praktiken lika långt bort; V8:s korrekt avrundade `Math.hypot` och Apples
libm-`hypot` avrundar det avståndet 2 ULP från varandra, vilket vänder det strikta `<`,
väljer en annan nod och roterar/speglar delblocket ~20° (18 noder
flyttas, max 296.7pt; de andra 10744 noderna är bitidentiska, liksom
blockträdet, cirkelordningen och varje `centerAngle`). Policyn med korrekt avrundad hypot
vederlades redan för den här klassen (2026-07-10). Fristående reproduktion:
`.agent-notes/circo-2475-590-repro.dot`; fullständig orsaksanalys:
`.agent-notes/circo-b81-2475-rca.md` (godkänd 2026-07-11).

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

**b29-familjen (twopi).** De fyra b29-varianterna delar en knivsegg: etiketten
`EqmtTyp` på en kant (`Node14732->Node14731`) ligger på ett exakt oavgjort läge i sidval i placeLabels,
vars utfall beror på layoutdrift på 1 ULP i twopi i de
omgivande objekten. Med den trogna fmadd-kontraktionen i
`polylineMidpoint` (rättning för states-familjen, 2026-07-11) är porteringens etikettankare
bitidentiskt med oraklets, men det oavgjorda läget avgörs ändå åt motsatt håll på
två av de fyra varianterna (`graphs-b29`, `linux.i386-b29`) medan de andra
två (`share-b29`, `windows-b29`) nu konformerar — och `2343`s godkända A9-
etikettskillnad försvann helt. Gräns: 1 ritoperation, Δ12pt i etikettens y. Oreducerbar
utan att eliminera driften uppströms. Fullständig orsaksanalys:
`.agent-notes/twopi-states-rca.md`.

Samma knivsegg i placeLabels dyker upp på **osage**-spåret (godkänd
2026-07-11, fullständig orsaksanalys: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` och `share-b29` (2 skillnader i ritoperationer vardera — en kantetiketts
x-ankare hamnar på 878.28 mot 841.06, placerat symmetriskt kring den
bitidentiska splinemittpunkten 859.67, dvs. ±halva etikettens bredd; de två
varianterna speglar varandra) och `1652` (2 skillnader i ritoperationer — två kanter vänder
vardera ett etikettankare kring en identisk mittpunkt, en i x och en i y,
med bitidentiska splines och pilspetsar; oraklet renderar fullständigt,
så detta är inte det kända timeout-flaket hos den inbyggda). I varje fall är kantgeometrin
bitexakt och bara det oavgjorda läget i etikettens sidval avgörs
åt motsatt håll på omgivningar med 1 ULP drift.

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
(fullständig orsaksanalys: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 skillnader i ritoperationer
— syskonet till circo-posten ovan: samma CDT-kocirkulära
incircle-oavgjorda läge, vänt av libm-`sin`/`cos` med 1 ULP, gör att porteringens
multisplinekorridor lyckas med en spline på 14 punkter där den inbyggda
faller tillbaka på vanlig dragning med 8 punkter; punktdeltan < 0.07pt) och circo
`windows-tree` (10 skillnader i ritoperationer på en solfjäderkant — circos placeringstrigonometri
lägger `node2.y` en enda ULP ovanför `node8.y` kring det exakt symmetriska
värdet 18.0, och `closestSide`s val av dyna-huvudport vänder TOP/BOTTOM vid
just det oavgjorda läget; nodpositioner och rutor är i övrigt bitidentiska med
oraklet).

**sfdp-motorspåret — oavgjorda flyttalslägen på kanter (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> sfdp:s xdot-motorspår (`parity-sfdp.json`,
inbyggt `dot -Ksfdp -Txdot`, ±0.5) visar CDT:s kocirkulära incircle-oavgjorda läge när
exakta inbyggda positioner före dragningen injiceras (så avvikelsen är INTE
iterativ drift — se klassen A1-drift — utan ett diskret oavgjort predikat):

- `42` och `241_0` — CDT:s kocirkulära incircle-oavgjorda läge (multisplinekorridoren).
  Med injicerade positioner är residualen en **vändning av segmentantal**: `42`
  `opCount 5 vs 9` (kant 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kant 3->2) — porteringens begränsade Delaunay-diagonal vänder mot
  oraklets, så multisplinekorridoren lyckas med en spline på N punkter där den
  inbyggda faller tillbaka på en kortare vanlig väg (eller tvärtom), precis som i
  twopi/circo-posten för `241_0` ovan. Porteringen emulerar redan arm64-
  kontraktionen `fmadd` i predikaten incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) och använder robust incircle-Delaunay; residualen är
  skillnaden på 1 ULP mellan V8 och Apples libm i `sin`/`hypot` i predikatets indata, som ingen portabel
  kod återger.

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
`arm-pow.ts` för samma gräns). Godkänd på motorspårsnivå via
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

**fdp**-xdot-motorspåret (`parity-fdp.json`, inbyggt `dot -Kfdp -Txdot`,
±0.5) visar SAMMA kocirkulära CDT-läge för samma graf, `241_0`: med
oraklets exakta positioner före dragningen injicerade är residualen 11 numeriska
skillnader i `unfilled_bezier`, begränsade till en kant (`0->1#0`, maxΔ 3.39pt). Eftersom
nodpositionerna är injicerat identiska ligger avvikelsen längre ned i
pathplans multisplinekorridor — samma oavgjorda incircle-läge med 1 ULP i libm som i
twopi/circo/sfdp `241_0` (exakt rationell incircle 185/185 ovan). Spakarna är
redan tillämpade (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); det oavgjorda läget är oreducerbart. Godkänd via `accepted-divergences-engines.json`
`fdp.241_0`. fdp:s `2095` är däremot **A1-drift, inte A9**: att injicera den
enda noden med tomt namn (efter att attribueringsinjektorn rättats att matcha
noder med namnet `""`) kollapsar dess residual till noll — den tidigare ”A9-svansen” var
den oinjicerade noden med tomt namn som drog med sig sina anslutna kanter. Godkännandet
för sfdp `2095` hade samma blinda fläck — en ny omgenerering av sfdp-attribueringen (2026-07-22) med den rättade
injektorn bekräftade att även den injiceras till 0, och dess godkännande togs bort (se
notisen `2095 omklassificerad` ovan).

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
