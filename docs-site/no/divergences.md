---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Kjente avvik fra C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine tar sikte på størst mulig troskap mot den kanoniske C-implementasjonen.
C-kildekoden er spesifikasjonen; en forskjell som ikke er oppført, behandles som en
feil, ikke som akseptert oppførsel.

> **Hva «samsvar» betyr her.** Korpusets paritetsdom `conformant`
> er en **stram deterministisk toleranse**, *ikke* bokstavelig byte-for-byte-likhet
> i SVG: numeriske koordinater og baner må stemme innenfor **±0.01**, og alt
> ikke-numerisk innhold (tagger, farger, tekst) må være nøyaktig likt
> (`compareSvg(…, 'deterministic')`). Gjennom hele dette dokumentet viser «samsvar» og
> «samsvarende» til den toleransedommen. Full definisjon:
> [Samsvar](./conformance.md).

Der utdataene *avviker*, havner de i nøyaktig én av tre klasser:

1. **Godkjente deltaer** — forskjeller vi har undersøkt, forstår helt ned til
   rotårsaken, og som vi **bevisst har valgt å ikke gjøre samsvarende**. Hver av dem er avgrenset,
   karakterisert og begrunnet nedenfor. Dette er ikke feil og vil ikke bli
   «rettet» uten en spesifikk, separat avgrenset grunn.
2. **Sporet lang hale** — kjente hull som *vil* bli lukket, hvert med en
   orakelfestet rettelse. Disse ligger med levende tall i
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Ikke-mål** — tilsiktede omfangsgrenser (formater og mekanikker vi aldri
   har hatt som mål å gjenskape).

De autoritative, kontinuerlig oppdaterte oversiktene er
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(paritetsdashbord per inndata mot innebygd `dot`) og
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(status for portering på algoritmenivå).

Den **maskinlesbare** sannhetskilden for hvilke grafer som er *godkjent* (klasse 1
nedenfor) er
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Verktøyene kobler den inn ved rapporteringstidspunktet: `PARITY-dot.md` skiller **godkjente deltaer** fra
den **sporede** restansen, og regelporten henter sin tillatelsesliste derfra. Prosaseksjonene
nedenfor forklarer hver oppføring (A1 og A3 er aktive; A2 er lukket og
beholdt som historikk); en CI-test (`accepted-divergences.test.ts`) sørger for at
hver godkjent graf fortsatt avviker, slik at denne listen ikke stille kan råtne.

---

## Godkjente deltaer (vi gjør dem bevisst ikke samsvarende) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Vi godkjenner et delta — i stedet for å jage byte-paritet — bare når **alt** av
følgende gjelder:

- Rotårsaken er en **portabilitetsbegrensning** (noe JavaScript-/nettleserkjøretiden
  ikke kan gjenskape nøyaktig), ikke en logikkfeil i porten.
- Forskjellen ligger **under persepsjonsterskelen** og er beviselig **avgrenset**.
- En rettelse ville hatt **uforholdsmessig kostnad og spredningsomfang** i forhold til
  gevinsten (typisk: den ville berørt en delt primitiv som brukes av hundrevis av
  allerede samsvarende grafer, med risiko for regresjoner for en gevinst på en
  brøkdel av en piksel).

Når vi godkjenner et delta, karakteriserer vi det her slik at forbrukere aldri blir overrasket.
Grafer som berøres av et godkjent delta, valideres mot et **strukturelt /
toleransebasert** krav i stedet for et bytekrav.

### A1. Flyttallsdeterminisme (kraftbaserte motorer) {#a1-floating-point-determinism-force-directed-engines}

**Berørt:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (de iterative
fjærmodellmotorene). *Layouten* til `dot`-motoren er **ikke** berørt av denne
iterative modelldeterminismen; et separat, snevert avgrenset flyttallsdelta i `dot`s
spline-ruting er behandlet under **A3** nedenfor.

> **Omfang, historisk et uttestet forbehold — nå delvis målt.** Den
> **viktigste SVG-undersøkelsen for dot-motoren** (`test/corpus/survey.ts`) er fortsatt
> **kun for dot**: det innebygde orakelet kjøres under `GVBINDIR=/tmp/ghl`, som
> lenker **bare** pluginene `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` går gjennom nøyaktig `core dot_layout`
> — ingen layoutplugin for `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` er til stede),
> og både orakel og port kjøres med `dot`-motoren. Korpus-id-er
> som `*_neato` / `*_circo` / `root_twopi` er altså *filnavn* som legges ut med
> `dot` i den undersøkelsen, ikke med sin egen motor, og A1 treffer **null**
> grafer der — ikke fordi motorene er bevist samsvarende, men fordi
> akkurat den undersøkelsen aldri bruker dem.
>
> **Men alle seks A1-motorene har nå sin egen undersøkelse med innebygd motor**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (uavhengig av `GVBINDIR` —
> hver starter `dot -K <engine> -Txdot` direkte), på to ulike strenghetsnivåer
> som er dokumentert hver for seg nedenfor: `circo`/`twopi`/`osage` kjøres med samme
> **deterministiske ±0.01**-toleranse som dot-undersøkelsen, med rotårsaksanalyse per id
> («Godkjenning på motorsporet» nedenfor); `neato`/`fdp`/`sfdp` kjøres med en
> løsere **±0.5-karakterisering** uten analyse per id ennå
> («Karakterisering av iterative motorer» nedenfor). Gjeldende tall på tvers av motorer:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Karakterisering.** Disse motorene kjører iterative numeriske layouter hvis resultater
avhenger av flyttallsavrunding — nærmere bestemt fused multiply-add (FMA) og
`Math.pow`, som kan variere mellom JavaScript-motorer og CPU-arkitekturer. Porten
følger Cs operasjonsrekkefølge der den kan (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — f.eks. låser `sfdp` seg til ~6 gjeldende siffer mot det
innebygde orakelet med en samsvarende PRNG og `fma` — men nøyaktig, identisk
gjenskaping av koordinatene er **ikke garantert på tvers av plattformer**. Topologien bevares; det
potensielle avviket ligger i de fine nodekoordinatene.

**Hvorfor godkjent.** Dette er en hard begrensning ved å kjøre i JS, ikke et designvalg
— samme familie som A3s Apple-`hypot`-følsomhet. Det finnes ingen måte å garantere
bit-identiske transcendente/FMA-resultater på tvers av alle målkjøretider, så et bytekrav
ville vært umulig å teste i stedet for bare dyrt. **Å vurdere A1** (i motsetning til
bare å ta forbehold) krevde et eget paritetsspor mot innebygd motor — bygget
2026-07-11 som `test/corpus/engine-walk.ts` + `parity-report.ts`, som undersøker hver
inndata under sin egen motor i stedet for `dot`. Det ærlige taket for dette arbeidet er
å **innsnevre** A1 til «ingen aktivt avvik på referanseplattformen», aldri å
fjerne forbeholdet om tvers av plattformer; resultatene så langt (nedenfor) holder seg til
det taket: `circo`/`twopi`/`osage` har hver avdekket og rotårsaksanalysert en håndfull
ekte A1/A9-tilfeller, og `neato`/`fdp`/`sfdp` ligger nå på 90.8/77.5/68.0 %
innenfor 0.5pt av innebygd over universet på 910 elementer, noe som betyr at den portede
aritmetikken (`fma.ts`, `arm-pow.ts`, samsvarende PRNG) holder for de fleste grafer — og
hver gjenværende avvikende id er individuelt tilskrevet ved injeksjon (løserdrift
mot portfeil) i stedet for å bli stående som uanalysert drift; se
karakteriseringen av iterative motorer nedenfor.

**Godkjenning på motorsporet: twopi-pilfamilien.** <a id="a1-twopi-arrows-family"></a>
Blokksitatet ovenfor beskriver SVG-undersøkelsen for dot-motoren, der A1 treffer null
grafer; det separate `twopi` **xdot-motorsporet** (`parity-twopi.json`, innebygd
`dot -K twopi -Txdot`-orakel, `test/corpus/engine-walk.ts`) kjøres *faktisk* under sin
egen motor og avdekker et konkret, verifisert A1-tilfelle på 9 korpus-id-er:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
og (lagt til 2026-07-28, nytt i universet på 905 elementer) søsteren
`tree-graphs-directed-oldarrows` i directed/ — hver avviker på én dominerende kant
(`Z->I` eller `i->Z`; 12–64 forskjeller i tegneoperasjoner). Injeksjons-A/B (beslutningsjournal, 2026-07-10, oppføringen «injection A/B verdicts:
twopi arrows family EXONERATED...») beviste mekanismen direkte:
å dumpe det innebygde `spline_edges`' inngangs-`ND_pos` og injisere det i
portens `splineEdgesShifted` gir **fullt samsvarende** utdata på
`graphs-arrows` (`Z->I` blir byte-identisk med orakelet, samme spline med 7/14 punkter)
— så avviket er 100 % nodeposisjonsdrift før rutingen ut av
`twopi`s PRISM-løser for overlappfjerning, og portens splineruting/-emisjon
er frikjent. Det synlige symptomet på 6 av de 8 id-ene er en omslag i antall
bezier-punkter (`unfilled_bezier[ptCount]: 8 vs 14`): antallet tilpassede deler fra `Proutespline`
er følsomt for hvilken side av en hindergrense den drevne nodeposisjonen
havner på, så en posisjonsforskjell under én ULP nedstrøms for PRISMs iterative
løsning slår om antallet segmenter i den tilpassede splinen (de to andre id-ene,
`graphs-arrowsize`/`nshare-arrows_dot`, viser samme drift som et mindre
rent posisjonsdelta uten omslag i antall deler). Godkjent på motorsporsnivå
via `test/corpus/accepted-divergences-engines.json`, koblet inn i
`PARITY-twopi.md` av `parity-report.ts` — den samme koblingen som `accepted.ts` utfører
for dot-sporet `PARITY-dot.md`.

`oldarrows`-RCA-en (2026-07-28) pekte ut det nøyaktige omslagspunktet for familiens
punktantallssymptom. Dens `i`–`Z`–`I`-vifte er kollineær på en ringdiameter, og
pathplan `directVis`' `intersect()` blokkerer en siktlinje når et hindertopppunkt
ligger «på» segmentet — der `wind()`s kollinearitetstoleranse på 1e-4
får selv en node 270pt unna segmentet til å telle som kollineær, og
`inBetween()` (som forutsetter kollinearitet) degenererer da til å teste bare
**x-projeksjonen**: toppunktet blokkerer hvis og bare hvis x ligger strengt innenfor
det ULP-brede intervallet mellom de to endepunktenes x-koordinater. Hvilken av de to
speilede radiale kantene som bøyer, avhenger derfor av ULP-rekkefølgen i siste bit for
tre nominelt like x-verdier fra PRISMs løsning — C bøyer `Z->I`
(nodens `i` aksetoppunkt havner innenfor intervallet sitt), porten bøyer `i->Z`
(nodens `I` toppunkt havner innenfor sitt eget). Å gjenskape `directVis` frakoblet på
hver sides dumpede hindersett reproduserer hver sides beslutning nøyaktig, og
å injisere orakelets `ND_pos` før ruting i porten gir 0 forskjeller
(`attribution-twopi.json`) — ruting og emisjon er byte-trofaste.

`1855` er den radiale/stjerne-**speilvarianten** av den samme PRISM-FP-mekanismen
før ruting (godkjent 2026-07-11): de 31 bladene ligger nøyaktig på en sirkel, så
stjernelayouten er speilsymmetrisk og PRISMs overlappfjerning sitter på en
symmetri-ustabil likevekt; en forskjell på 1 ULP mellom V8 og libm i `cos`/`sin` ved 5
bladvinkler i `circleLayout`s `setAbsolutePos` velger det motsatte speilbassenget,
og hele den radiale layouten havner som det nøyaktige x-akse-speilbildet av
orakelets (maks. nodeforskyvning 6.04pt, bb bevart). Injeksjons-A/B beviste
begge retninger: å mate Cs nøyaktige `circleLayout`-posisjoner inn i portens PRISM
reproduserer orakelet node for node (3e-14), og å gjenopprette bare de 5
ULP-avvikende bladposisjonene snur hele layouten tilbake til portens
speil. Full RCA: `.agent-notes/twopi-radial-drift-rca.md` (beslutningsjournal
2026-07-11).

**Karakterisering av iterative motorer: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
I motsetning til motorsporene `circo`/`twopi`/`osage` ovenfor er `neato`/`fdp`/`sfdp`
ennå **ikke** analysert per id — `engine-walk.ts` registrerer et felt `tolerance: 0.5`
for disse tre, og `parity-report.ts` viser dem i en egen seksjon,
«Iterative engines (±0.5 characterization)», i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
uttrykkelig **ikke** sammenlignbar med de deterministiske ±0.01-beståttandelene ellers
i dette dokumentet. Gjeldende tall (univers på 910 elementer; beståttprosenten utelater
inndata C-orakelet ikke kan rendere, jf. [Samsvar](./conformance.md)):

| motor | undersøkt | innenfor ±0.5pt | ikke samsvarende (alle tilskrevet, godkjent) | portfeil / tidsavbrudd | orakelfeil |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8 %) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5 %) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0 %) | 290 | 1 | 0 |

(Den første kjøringen, 2026-07-11 med 762 elementer, målte 263/311/260 innenfor
±0.5pt — hoppet til dagens tall kom av rettelser per id som er landet siden,
først og fremst neatos uportede håndtering av `user_pos`/`P_SET`, konsolideringen av motorinitialisering,
og rettelsen av `setEdgeType` (makro mot funksjon).)

I motsetning til ved første kjøring er hver avvikende rad nå individuelt tilskrevet:
injeksjonsverktøyet (`test/corpus/attribute-divergence.ts`) mater det
innebygde orakelets `ND_pos` før ruting inn i porten og sammenligner på nytt, og
hver gjeldende avvikende id er enten `drift-exonerated` (portens ruting
og emisjon reproduserer orakelet nøyaktig så snart løserdriften er fjernet)
eller ett av en håndfull separat godkjente rester per id (`241_0`s
CDT-incircle-likhet på alle tre motorene, neato `2239`, sfdp `42`/`2556`).
Klassegodkjenningen nedenfor formaliserer den frikjente mengden; levende tall i
dashbordene per motor
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Klassegodkjenning av A1-drift (iterative motorer, beregnet medlemskap).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
har én `"A1-drift"`-**klasse**-oppføring per iterativ motor (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — forskjellig fra
oppføringene per id som brukes av sporene `circo`/`twopi`/`osage` ovenfor (D2,
`plans/iterative-parity-campaign/decisions.md`). I motsetning til en oppføring per id
er klassemedlemskap aldri håndopplistet i registeret: `parity-report.ts`
beregner det ved rapporteringstidspunktet fra den tilhørende `attribution-<engine>.json`
(T1s injeksjonstilskrivingsverktøy, `test/corpus/attribute-divergence.ts`)
— hver avvikende id hvis innebygde `ND_pos` før ruting ble injisert i
porten og sammenlignet på nytt og samsvarer ved ±0.5, får `verdict: 'drift-exonerated'` i
den filen, noe som betyr at de to motorenes iterative løsere konvergerte mot
numerisk ulike, men hver for seg internt konsistente layouter (en forskjell i
flyttallsakkumulering i henhold til A1-karakteriseringen ovenfor, ikke en feil i portens ruting
eller emisjon). Bevis per id — bøttenes form, antall forskjeller før og etter injeksjon,
påvisning av jevn translasjon/speiling — ligger i selve tilskrivingsartefakten,
ikke duplisert i dette dokumentet eller registeret (D2). En id
som senere begynner å bestå helt, eller hvis ny tilskriving endrer dom,
faller ut av klassen automatisk ved neste regenerering av rapporten — ingen foreldet
godkjenningsredigering kreves, og ingen vaktetest feiler. Motorer der
`attribution-<engine>.json` ennå ikke er generert, viser klassen som
«attribution pending» med null medlemmer, identisk med å ikke ha noen godkjenning
i det hele tatt — klasseoppføringen kan komme før dataene sine (se
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Tekstmåling (skriftmetrikk) → etikettdrevet layout — LUKKET <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): lukket.** Ingen korpus-id er lenger godkjent under denne klassen;
seksjonen beholdes som historisk dokumentasjon av mekanismen og av
koblingspunktet med injiserbar `TextMeasurer` som nøytraliserte den.
Påfølgende tekstmålingsrettelser (overgangen til `EstimateTextMeasurer`,
skriftbevisste vertikale metrikker, rettelsen for UTF-8-byte utenfor ASCII) løste nesten
alle etikettdrevne layoutavvik som tidligere hørte hjemme her. **`proc3d`** —
det tidligere kanoniske A2-eksemplet — er fullt **`conformant`** på alle tre
korpusmappene (`graphs-`/`share-`/`windows-proc3d`): samsvarende bbox, null
forskjeller i banedata, null forskjeller i etikettankre.

**De siste medlemmene ble pensjonert (2026-07-01).** **`NaN`-familien**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) ble ført her lenge etter at
nodegeometrien allerede samsvarte nøyaktig med C (76/76 referansepunkter). Den
virkelige resten — 8 endepunkter på rette kanter på fire motstående 2-syklus-par
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) forskjøvet 6–14 pt — ble diagnostisert på nytt og viste seg å være
**ingen skriftmetrikkeffekt overhodet**, men to portfeil i dots
multikantruting (oppdrag `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Banerekkefølge for motstående par.** Porten sorterte hver gruppe av parallelle kanter
   på nytt etter opprinnelig opprettelses-seq før Multisep-banekompensasjoner ble tildelt; C
   tildeler baner i den innsamlede edgecmp-rekkefølgen (MAINGRAPH-foroverrepresentant
   først, AUXGRAPH reversert medlem som nummer to — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). En 2-syklus der det reverserte medlemmet var
   deklarert først, tegnet hver kant i den andres 18 pt-korridor.
2. **Falsk flat-nærhet på sammenslåtte kanter mellom ranger.** `markAdjacent`
   markerte `ND_other`-oppføringer uten Cs vakt for samme rang
   (`flat.c:272-276`), slik at `groupSize`s kortslutning for flat nærhet
   svelget portcmp-gruppeskiller.

Med begge rettet trofast er familien **`conformant`** på alle tre
mapper (per element: noder 0, kanter 0 som avviker), og den samme mekanismen
lukket `42`, `clust2`, `ngk10_4` (structural-match → conformant) og flyttet
`b124` fra diverged til structural-match — alle på 2-syklus-/parallellpar.

**Begge undersøkelsessider kjører den samme estimatoren — målingen er nøytralisert.**
Det innebygde `dot`-orakelet kjøres under en hodeløs `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) som bare lenker
pluginene `core` og `dot_layout` — ingen tekstlayoutplugin for `gd`/`pango`/`quartz`.
Når den plassen er tom, faller graphviz tilbake på sin innebygde
`estimate_textspan_size`. TypeScript-portens `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) er en trofast port av den samme rutinen og er
standarden i Node, løst opp av `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Begge sider av hver
paritetssammenligning måler derfor tekst med den identiske estimatoren** — ekte
glyfbredder fra FreeType/pango kommer aldri inn i sammenligningen. Det er derfor en
domregresjon her peker på layoutkode, ikke på en skrift, og det er derfor
rettelser av estimatorens egne feil (telling av UTF-8-byte, skriftbevissthet i
vertikale metrikker) lukket det meste av denne klassen helt i stedet for bare å
innsnevre et skriftmetrikkgap.

**Koblingspunktet med injiserbar `TextMeasurer`.** Denne nøytraliseringen er bare mulig
fordi tekstmåling er et bevisst koblingspunkt, ikke fastkodet i noen av
motorene. `TextMeasurer` er et grensesnitt med én metode (`measure(text, font, size,
flags) → {w, h, …}`) som injiseres i hvert kallsted som størrelsesbestemmer etiketter —
`polyInit`, `recordInit`, `initEdgeLabels` og `buildNodeLabel` tar hver
måleren som parameter; ingenting måler tekst gjennom en global. Den
låses for tester/CI via `setTextMeasurer(...)` eller `GV_TEXT_MEASURER=estimate`.
Koblingspunktet lar oss også *bevise* at en rest bare skyldes måling: mat porten med de
nøyaktige breddene C målte (hentet fra orakelet) og kontroller om layouten
da gjenskaper C nøyaktig. Det eksperimentet var det som opprinnelig ga grunnlag for
A2-dommen for `proc3d` (se det historiske tillegget nedenfor) — teknikken
er fortsatt gyldig. Dens omvendte pensjonerte klassen: siden målingen
beviselig var nøytralisert på begge undersøkelsessider, kunne `NaN`-kantresten ikke
være en skriftmetrikkeffekt, noe som tvang frem ny diagnose som fant de to
rutingfeilene ovenfor.

::: details Historisk analyse (avløst 2026-06-30) — beholdt for ettertiden
Materialet nedenfor beskriver en tidligere tilstand for denne klassen, før
overgangen til `EstimateTextMeasurer`, skriftbevisste vertikale metrikker og
rettelsen for UTF-8-byte utenfor ASCII lukket det meste av den. Det beskriver ikke lenger gjeldende
oppførsel — det er bare beholdt slik at resonnementet som førte hit ikke går tapt. Spesielt:
(1) «innebygd C»-breddetallene i målingstabellen nedenfor er
**FreeType**-verdier fra en rendering med ekte skrift; paritetsundersøkelsen
bruker aldri den veien — begge sider kjører `estimate_textspan_size` (se
ovenfor) — så tabellen gjenspeiler ikke hvordan paritet måles i dag; (2)
overleggsfigurene og golden-/vår-renderingene nedenfor viser en **ikke-korpus**-variant av
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt) som ikke er med i
paritetsundersøkelsen; korpusets `proc3d`-varianter er nå samsvarende uten
forskjeller, så det finnes intet overlegg å vise for dem; (3) fortellingen om
`NaN`/`ratio=compress` og node-x nedenfor er avløst — gjeldende måling viser at alle 76 nodepunkter
samsvarer nøyaktig, så kjeden breddefeil → nodeforskyvning som den beskriver
ikke lenger gjelder for `NaN`.

**`NaN` under `ratio=compress` (historisk).** Familien
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) var et
A2-tilfelle hvis dom den gang havnet på *diverged* snarere enn
*structural-match*. Compress-banen for x-nettverkssimpleks var trofast — alle
begrensningsinndata samsvarte med C (breddebegrensningsverdi, `containNodes`-minlens,
antall hjelpekanter 471/wt 1612, `lrBalance` og rangrekkefølger identiske)
*bortsett fra* halvbreddene til 9 noder, som måleren rapporterte 0.5–1.03 pt
bredere enn C. `ratio=compress`s pakking med vekt 1000 gjorde de normalt slakke
separasjonsbegrensningene fra venstre til høyre **bindende**, slik at den
breddefeilen under pikselnivå — usynlig uten compress — kom til syne som en indre
x-forskyvning på −3..−5 pt. Den forskyvningen presset den rette splinen `Target<->TThread` 0.55 pt
forbi en nodeboksvegg, så ruteren bøyde den til en ekstra bezier-del (7
punkter mot Cs 4) — et *strukturelt* delta, derfor *diverged*. Å tvinge de 9 breddene
til Cs verdier gjenskapte C nøyaktig (node-x 53/76→0/76 feil; spline 7→4 punkter),
noe som bekreftet at resten var 100 % oppstrøms skriftmetrikk, ikke compress- eller
splinekoden, **for det tidligere avviket**. Fullt bevismateriale (med en visuell
side-ved-side av golden mot vår + overlegg av deltaet på 4 mot 7 splinepunkter):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (skriftlig
fremstilling: `…/nan-compress-xcoord.md`).

**Eksempel på skriftmetrikkmåling (historisk — FreeType mot estimat).**
Innebygd Graphviz, når det kjøres med en ekte tekstlayoutplugin (ikke det hodeløse
orakelet som paritetsundersøkelsen bruker), måler tekst med glyfbredder fra FreeType/libgd.
Portens `EstimateTextMeasurer` gjenskaper ikke en glyfrasterisator.
For de fleste strenger stemmer de to nøyaktig; for noen avviker de med
en brøkdel av et punkt. Målt eksempel — Times-Roman 14 pt, strengen
`"/home/ek/work/src/lefty/lefty.c"` (31 tegn):

| | bredde |
|---|---|
| innebygd C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimat) | 176.75 pt |
| delta | **+0.75 pt (+0.43 %)** |

Samme nodes andre etikettlinje, `"93736-32246"`, målte **identisk**
(96.00 pt på begge) — feilen er strengavhengig og akkumuleres per glyf,
ikke en jevn skaleringsfaktor. Dette gapet mellom FreeType og estimat er reelt, men er
**ikke** det paritetsundersøkelsen måler (begge sider kjører `estimate`); det ville
bare betydd noe hvis utdata fra @knowvah/dot-engine ble sammenlignet med en C-rendering
med ekte skrift utenfor denne undersøkelsen.

**Nedstrøms effekt på det tidligere `proc3d`-avviket (historisk).** Etikettbredde
styrer nodestørrelse, som styrer layout:

1. En bredere etikett → en litt bredere nodeboks (for en *ellipse*-node skaleres bredden
   videre med √2, så +0.75 pt tekst → +0.53 pt halvbredde).
2. Nodenes halvbredder fastsetter separasjonsbegrensningene fra venstre til høyre i
   nettverkssimpleksen for x-koordinater; disse begrensningene `ROUND()`-avrundes til
   heltall, så en breddeendring under pikselnivå kan flytte en begrensning fra *N* til
   *N+1*.
3. Nettverkssimpleksen velger da en annen — men like optimal —
   heltallig x-tilordning, som forskyver noen nodes x-posisjoner med 1–2 enheter.

For ikke-korpus-filen `proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, ikke med i
paritetsundersøkelsen) ga det en forskjell på **≤ 3.55 pt** i x-utstrekning
(**0.13 %**), lagt over nedenfor — **grønn = innebygd C `dot` (golden), rød =
@knowvah/dot-engine (vår)**:

![proc3d golden mot vår som overlegg: grønn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Zoomet inn viste kanten seg nesten utelukkende på de lange
filsti-ovalene:

![proc3d-overlegg, zoomet inn på de brede sti-etikett-ovalene: grønn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — innebygd `dot` | Vår — @knowvah/dot-engine |
|---|---|
| ![proc3d rendret av C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendret av @knowvah/dot-engine](/img/proc3d-ours.svg) |

Den selvstendige fremstillingen (rotårsak, tall per måling, reproduksjonskommando)
ligger på en egen side:
[**proc3d — det kanoniske A2-avviket i skriftmetrikk (historisk)**](/no/divergences-proc3d-a2).
Den siden beskriver et løst avvik på en ikke-korpus-inndata; de gjeldende
korpusvariantene av `proc3d` er samsvarende.

**Hvorfor dette ble godkjent den gang.** Å byte-matche FreeTypes bredder per glyf
på tvers av alle skrifter og strenger ville krevd å gjenskape metrikktabellene,
hintingen og avrundingen — stort, skjørt og fortsatt ikke
garantert nøyaktig. Tekstmåleren er en delt primitiv: hver etikett i
korpuset går gjennom den, så en rettelse rettet mot én streng risikerte å regressere
andre for en gevinst under persepsjonsterskelen.
:::

### A3. `hypot`-likhetsavgjørelse i splineruting (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Berørt:** `dot`-grafer med en **geometrisk symmetrisk** kantrutingskanal
— typisk en kort, symmetrisk flat kantbue. Observert eksempel: `2368`,
som blir stående på *structural-match* (maxΔ ≈ 10.2 pt på **én** kant, `376->76`).
Den samme likhetsavgjørelsen dukker også opp på en **lang** kant (over flere ranger) inn i et
nav med høy innkommende grad når korridoren er nøyaktig speilsymmetrisk: `graphs-b100` /
`graphs-b104` (identisk kilde) avviker med maxΔ 20 (nøyaktig én rangrad) på
det enkelte knekkpunktet til `Node23730->Node23729` — hver nodeposisjon og all oppstrøms
boks-/polygon-/stram-bane-struktur er byte-identisk med C; bare `findMaxDev`s
valg (~1 ULP) av hvilket speilsymmetrisk indre punkt som blir bezier-knekkpunkt
er forskjellig. Den korte flate kantformen dukker også opp som `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — den avvikende søsteren til den orakelfestede `241_0`, som Cs
støy i stedet beholder første av. Den samme likhetsavgjørelsen gir en delt
spaltekorridor for en etikettert 2-syklus-tilbakekant i `2413_1` (structural-match, maxΔ 67.65) og
`2413_2` (maxΔ ≤99.55 når T11-rettelsen av swapBezier-reverse lander — inntil da
domineres filens rapporterte maxΔ 1922.26 av en urelatert, separat sporet
feil), og en enkelt etikettert kant innenfor en klynge i `graphs-decorate`
(maxΔ 43.54); i hvert tilfelle ligger de to kandidatene for delingshjørne innenfor
5.7e-13 (2413-familien) / 3e-14 (decorate) av hverandre før den
posisjonsavhengige støyen fra Apples `hypot` velger en vinner. `2371`
(structural-match, maxΔ 16.8) viser det samme fingeravtrykket på to urelaterte
kanter (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): porten
avgir det nøyaktige speilbildet av orakelets kontrollpunktsekvens på begge,
med knekkpunktets y snudd med et identisk Δ16.8 (øvre/nedre delingsbrøker byttet).
Opprinnelsen er vurdert med **MIDDELS** konfidens snarere enn den BEKREFTEDE
konfidensen til de andre medlemmene: `2371` pakker ~199 komponenter, noe som
kobler pathplan-lokale koordinater fra sidekoordinater, så likheten
kunne ikke korreleres live til `route.ts:209` på tre
instrumenteringsforsøk; en opprinnelse i rett-modus-segmentering eller i `recover_slack` etter klipping er
ikke helt utelukket. Full diagnose:
`plans/residual-cleanup/analysis/2371-mirror.md`. De fleste rutede kanter
er upåvirket.

::: details Grafdefinisjon (`2368.dot`)
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

**Karakterisering.** Splinetilpasseren (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) deler en tilpasset bezier ved det indre rutepunktet med
maksimalt avvik. Når kanalen er symmetrisk, er de to kandidatene for delingspunkt
en **eksakt matematisk likhet**, og vinneren avgjøres da av ~1e-14
flyttallskanselleringsstøy i en bezier-evaluering i absolutte koordinater
hvis **fortegn avhenger av absolutt posisjon**.

Cs avviksavstand er libm `hypot`, og macOS' Apple-`hypot` som
genererte orakelet er en proprietær implementasjon som bit-matcher **ingen**
portabel `hypot` (målt mot den i graphviz' koordinatområde, bit-
identiske andeler: V8 `Math.hypot` ≈ 63 %, en korrekt avrundet / Arm-lignende `hypot`
≈ 84 %, fdlibm `hypot` ≈ 90 %, `sqrt(dx²+dy²)` ≈ 94 %). På grunn av den ULP-støyen
**er C selv ikke konsekvent**: den deler to *translasjonskongruente* buer mot
**motsatte** hjørner. I `2368` er `376->76`-buen speilbildet av den
geometrisk identiske `256->436`-buen:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Hele deltaet, lagt over (12× zoom på buen `376->76` / `to1`) — **grønn = C
Graphviz, rød = @knowvah/dot-engine**. Begge er den samme grunne nedoverbuen mellom de
samme nodegrensene; de avviker med ~1–2 pt i buken (bezierens midtre
kontrollpunkt), der Cs likhetsavgjørelse falt mot motsatt hjørne:

![2368 376->76-bue: grønn = C, rød = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Alt annet samsvarer innenfor toleransen — samme avgrensningsboks (608×148), nodeposisjoner,
etiketter, pilspisser og alle andre kanter. De fulle renderingene er visuelt
umulige å skille:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 rendret av C Graphviz](/img/2368-c.png) | ![2368 rendret av @knowvah/dot-engine](/img/2368-port.png) |

Porten bruker en **translasjonsekvariant** likhetsavgjørelse (en sann likhet løses alltid
til første indeks), så den tegner *hver* slik bue på samme måte uavhengig av
posisjon — den er selvkonsistent, og samsvarer med C på buene der Cs støy også
beholder første (f.eks. `256->436` og `241_0 5:ne->8:nw`), og avviker bare der Cs
støy slår motsatt vei (`376->76`). Endepunkter, pilspissmål, de andre
kantene, alle noder, etiketter og avgrensningsboksen samsvarer innenfor toleransen; bare de
indre kontrollpunktene til den ene buen flytter seg (~1–2 pt i buken).

**Hvorfor godkjent.** Apples `hypot` er ikke mer reproduserbar på tvers av JS-motorer og
CPU-er enn FMA/`pow` i **A1** — det er den samme portabilitetsbegrensningen, bare
i `dot`-splineruteren. Å matche Cs *posisjonsavhengige* valg ville bety å
ta i bruk Cs strenge likhetsavgjørelse, som ligger i en **delt primitiv** som hver rutet
kant går gjennom: det ville byttet `376->76`-samsvaret mot *nye* avvik på
buene der C lander andre vei (det regresserer `241_0` og et `cnt=3`
orakeltilfelle med flat kant), en netto null som også ofrer portens
translasjonsekvarians. Så vi beholder den konsekvente (ekvariante) ruteren. Dette er
et avgrenset `dot`-delta under persepsjonsterskelen — ikke en åpen feil. Full undersøkelse:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orakel i en erkjent ødelagt tilstand (init_rank-/pathplan-familien) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Berørt:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Familiemedlemmene
`1939` og `2825` er **samsvarende** og har ingen oppføring, og `2470`
og `graphs-structs` sluttet seg til dem 2026-07-11 (begge kollapset til samsvarende
etter at rettelsene for ortho-nærhetsoverløp/chancmpid, fmadd `polylineMidpoint` og
half-even-likhetsavrunding landet — porten gjenskaper nå orakelets
gjenopprettingsutdata nøyaktig, inkludert de identiske tapte kantene); deres
godkjenningsoppføringer er pensjonert.

`1581` og `2825` var tilfeller av krasjgjenoppretting (oppdraget fix-element-count-bucket):
fuzzer-/degenererte inndata der oppstrøms tester kun hevder
at dot ikke krasjer (`test_1581`: ingen ASan-brudd; `test_2825`: ingen
krasj når `rebuild_vlists` returnerer -1). C treffer en intern `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`), og gjenopprettingen
forkaster layoutinnhold; porten kommer frem til de **identiske beslutningene om
sletting av rangsett** (varselparitet verifisert: de samme node-/grafnavnene i
`mark_clusters`' «already in a rankset»-varsler, cluster.c:317-320).

`2825` er nå fullt lukket. Oppdraget fix-2825-rebuild-vlists (etter 1581)
lukket først gapet ett lag: porten når Cs *nøyaktige* interne feiltilstand
— byte-identisk stderr inkludert meldingsrekkefølge
(`Error: rebuild_vlists: lead is null for rank 1`, deretter den uprefiksede
fortsettelsen `agerr(AGPREV, ...)`, `concentrate=true may not work
correctly.`) — der `dotLayoutPipeline` korrekt propagerer
`dot_position`s feil for å hoppe over `dot_splines`/`dotneato_postprocess`,
i samsvar med Cs `dotLayout` (`if (r != 0) return r;` etter `dot_position`,
dotinit.c:322-325). En oppfølger (del 2) lukket deretter det gjenværende
gapet i render-laget: Cs `emit_node` vokter hver node med `node_in_box(n,
job->clip)` (emit.c:1806-1809), og på denne avbruddsveien er `job->clip` degenerert fordi `GD_bb` aldri ble satt av `set_aspect` (inne i den
overhoppede halen av `dot_position`) — så C emitterer *null* noder, bare de (også
degenererte) klyngerammene. Porten portet den samme `node_in_box`-vakten
(`src/gvc/device.ts:renderNode`, med `job.bb`/`job.pad` som
enkeltside-ekvivalenten til `job->clip`) og sluttet å omberegne en
plausibel bbox fra levende nodeposisjoner når `g.info.bb` ikke er satt
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` ordrett, i speil av
`init_gvc`s `gvc->bb = GD_bb(g)`, emit.c:3272) — hver layoutmotor
setter allerede `g.info.bb` selv før `render()` kjøres på hver vei uten avbrudd, så dette er byte-identisk på friske grafer og endrer bare utdata
på denne avbruddsveien. `2825` er nå `conformant` (utdata med 4 elementer,
byte-identisk med orakelet). Se
`.agent-notes/2825-rebuild-vlists-abort.md` for hele mekanismesporingen
av begge deler. `1581` når aldri den inkonsistente tilstanden i det hele tatt (en
*annen* oppstrøms feil i klyngevinduet, ikke `rebuild_vlists`), så den legger
ut den overlevende grafen i sin helhet — det gapet forblir åpent. Orakelets utdata
på `1581` er gjenopprettingsrusk uten oppstrøms definert semantikk. Bevis:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). På
hver av disse inndataene er det **C-orakelet** som er ødelagt, etter
graphviz' egen vurdering: `2471`, `1939` og `1435` er
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
oppstrøms (saker
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), jf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); det eneste
rettelsesforsøket, [utkast-MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
forblir et ikke-flettet utkast (sist redigert 2026-03-20). `graphs-structs` er
den eldgamle tapsklassen for record-ruting (#102/#242/#274/#1323) som stabile
graphviz 15.0.0 rendrer korrekt — en regresjon i dev-bygg-orakelet.

**Hva C gjør.** På `init_rank`-medlemmene (`2796`, `2471`, `1939`)
lukker native dots hjelpegraf for x-koordinater en rettet syklus gjennom
klyngeveggens begrensningskanter; dens
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
kan ikke skanne hver node, skriver ut `Error: trouble in init_rank`, og
layouten fortsetter fra den gjenopprettingstilstanden — på `2471`/`2796` med slutt i
`Pshortestpath`-trianguleringsrusk og tapte kanter. På `1435` og
`graphs-structs` er det ødelagte trinnet selve pathplan (blindveier i
ear-clip-triangulering; en tapt record-port-kant).

**Inndata verifisert, deretter gjort trofaste (dette er den bærende delen).**
Oppdraget `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
dumpet begrensningsgrafen som begge sider mater inn i nettverkssimpleksen, linje for linje,
for hvert familiemedlem — og fant at portens tidligere «rene» oppførsel på
denne familien skyldtes **fire ekte portfeil**, alle rettet:

1. `flatEdges` hoppet over Cs
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)-kall,
   slik at klyngenes rangvinduer ble stående foreldet etter innsetting av vnoder for flate etiketter
   (dette alene gjorde at porten mistet **9** kanter på `2471` der C
   mister 6).
2. Straffen for kanter i samme `group` slo inn på selvløkker i stedet for på
   endepunkter i samme ikke-tomme gruppe
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` brukte Cs `_WIN32`-verdi 100; orakelplattformen bruker 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. En blindvei i triangulering avbrøt `Pshortestpath` i stedet for Cs
   advar-og-fortsett + reserveløsning med rett linje
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Etter rettelsen er familiens NS-begrensningsdumper **linjeidentiske** med C
(253 rank2-kall på `2471`; alle kall på `1939`/`1435`/`graphs-structs`),
og porten følger C gjennom den erkjent ødelagte gjenopprettingen: de samme
tapte kantene (`3->16` på 2796; de identiske 6 på 2471), de samme elementtrærne.
`1939` ble fullt samsvarende. De gjenværende numeriske deltaene (og 1435s
avvikende pathplan-rusk) er oppførsel *inne i* gjenopprettingstilstanden, som
prosjektets policy bevisst ikke jager.

**`2723` (segfault; festet, ikke jaget).** Innebygd `dot` segfaulter (exit 139)
på `tests/2723.dot` (urettet, `rank=same`-grupper, etikettede kanter), så C har
ingen utdata å matche. Oppstrøms
[sak #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) er åpen, og
`tests/test_regression.py:test_2723` er `xfail`. Porten kaster
`InternalError` (`INTERNAL_ERROR`, med en `TypeError`-årsak fra
`src/layout/dot/flat.ts:flatLabelYpos`, der `rank[r-1]` er undefined). Uten
et korrekt orakel står den ærlige feilen, og porten endres ikke;
`src/layout/dot/flat-2723.test.ts` fester den. Oppdater den testen hvis oppstrøms retter
saken.

**Policymerknad.** Det tidligere A4-standpunktet («porten oppfyller sakens
forventninger; ikke gjenskap») bygde på troen på at portens
asykliske hjelpegraf kom fra en harmløs lokal variant. Det gjorde den ikke — den kom
fra feil (1), som påviselig førte til feil på `2471`. Troskap mot C-kildekoden
vant: porten gjenskaper nå Cs erkjent ødelagte utfall fra
verifisert identiske inndata, og hver oppføring her bør **måles på nytt
når oppstrøms retter den tilsvarende saken** (orakelutdataene vil
endre seg; forvent at disse id-ene lyser opp som regresjoner ved den oppgraderingen — det
er tilsiktet, ikke råte).

**Bevis.** Sammenligningssider per id (side-ved-side-renderinger + bevis-
poster):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(grunnlinjen før rettelsen er bevart i
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnoseartefakter: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ugyldige inndatabyte (kodingsrepresentasjon) {#a5-invalid-input-bytes-encoding-representation}

**Berørt:** `1367` (diverged, maxΔ 0 — nøyaktig én strukturell forskjell).

**Hva som er forskjellig.** Inndatafilen inneholder en naken UTF-8-etterfølgerbyte (`0x80`)
inne i et nodenavn. C behandler nakne etterfølgerbyte 0x80–0xBF som «gyldige
tegn som representerer seg selv» (`lib/common/utils.c:1200-1207`, ingen
advarsel), og `<title>`-teksten til nodenavn omgår tegnsettkonvertering helt
(`agnameof`-byte flyter rett til `gvputs_xml`). Orakel-SVG-en inneholder derfor den rå byten og er **ikke gyldig UTF-8** til tross for sin deklarerte
koding. Porten dekoder inndata med ugyldig UTF-8 med latin1-reserveløsningen
(`0x80 → U+0080`) og emitterer velformet UTF-8 (`\xc2\x80`).

**Hvorfor godkjent.** Portens I/O-grense er JS-strenger (nettleserbibliotek).
En rå ugyldig byte kan ikke gå rundt gjennom `renderSvg`s returverdi som streng;
å byte-matche C ville bety å ødelegge utdatakodingen for alle
forbrukere. Latin1-reserveløsningen speiler Cs egen «behandlet som Latin-1»-gjenoppretting
(`utils.c:1249`). Dette er en begrensning under koden —
representasjonslaget — ikke en portabel oppførsel vi lot være å portere.
Alt annet i 1367 er samsvarende: elementantall (23 polyline /
103 text / 44 polygon / 24 path) og alle koordinater samsvarer etter
decorate-rettelsen (T6).

**Bevis.**
Sammenligningssiden for [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(side-ved-side-rendering + bevispost).

---

### A6. Overflyt av `unsigned int` i lerretet ved degenerert inndata {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Berørt:** `1314` — en fuzzer-utledet inndata (`fontsize="991836031967s8"`)
hvis absurde skriftstørrelse blåser opp tegningen til ~2.75e11 pt.

**Hva som skjer.** C lagrer `job->width` / `job->height` som **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` av den enorme punktstørrelsen (`emit.c:1249-1250`)
flyter over 32 bit og går rundt mod 2³², og SVG-backenden skriver den ut gjennom en
**fortegnsbehaftet** `%d` (`gvrender_core_svg.c:258-259`) — så C skriver
`height="-425618343"`. Porten beholder den matematisk konsistente (urundede)
verdien. Alle andre verdier — nodeellipsens `cx/cy/rx/ry`, rotens `translate`,
polygonet, tekstens `font-size` — er byte-identiske; bare `<svg>`-elementets
width/height på toppnivå er forskjellige.

**Hvorfor vi ikke jager det.** Å gjenskape Cs 32-biters heltallsoverflyt er ikke en
layoutoppførsel det er verdt å portere, og inndataene er degenererte. Ta det opp igjen hvis oppstrøms
retter overflyten (f.eks. ved å utvide feltet eller begrense størrelsen).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenerert NaN-layout (`sfdp`, patologisk `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Berørt:** `2556` — `repulsiveforce=100` (⇒ den frastøtende kraften bruker
`pow(dist, 101)`), som driver fjær-elektrisk-løseren til **NaN i begge
motorer**. Det innebygde orakelet emitterer selv bare `nan` som node-/kantposisjoner og en
degenerert avgrensningsboks.

**Hva som skjer.** Med NaN i hver koordinat serialiserer de to implementasjonene
søpla ulikt: (1) graf-bb / bakgrunnspolygon — C runder `NaN`
til `int`, noe som på arm64 gir søppel i `INT_MIN`-skala (`bb="0,0,-4.295e+09,
-4.295e+09"`); porten beholder `0`. (2) Tegneoperasjoner for kanter — det innebygdes emit-pass
undertrykker `_draw_`/`_hdraw_` for en NaN-spline (og emitterer bare `pos`),
mens porten emitterer dem med NaN-kontrollpunkter. Nodetegninger samsvarer (begge
undertrykker dem). Ingen reell layout finnes på noen av sidene.

**Hvorfor vi ikke jager det.** Porten gjenskaper allerede den *samme* NaN-eksplosjonen som
det innebygde — rettelsen som førte den dit er ekte (se nedenfor); det som gjenstår er bare
hvordan hver serialiserer NaN-søppel. Å gjenskape Cs `(int)NaN` med udefinert oppførsel
og dens undertrykking av tegning for NaN-spliner er ikke meningsfull layouttroskap på en inndata
hvis layout er degenerert i begge motorer. Ta det opp igjen hvis oppstrøms begrenser
`repulsiveforce` eller renser NaN-posisjoner.

**Portrettelser som gjorde dette nåbart (ikke bortjaget — ekte feil).** Før
disse kunne ikke porten engang nå den degenererte tilstanden: (1) `armPow`
(`src/common/arm-pow.ts`) kastet ved ethvert argument utenfor hurtigveien; den portet nå ARM
`pow.c`s fulle spesialtilfellegren slik at `pow(NaN, y) = NaN` som i libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) gikk i evig løkke på NaN-kontrollpunkter
fordi konvergenstesten var den naive negasjonen av Cs `while (ABS > .5)`
(ekvivalent for endelige verdier, ikke for NaN); den speiler nå C nøyaktig og
terminerer på NaN. Begge er C-trofaste og påvirker bare NaN-inndata.

---

### A7. Avrundingsgrense for boksvegg ved `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Berørt:** `graphs-honda-tokoro` og (lagt til 2026-07-28, nytt i universet på 905
elementer) søsteren i `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(begge structural-match, maxΔ ≈ 1 pt på den enkelte kanten `n012->n011`). Søsteren
skiller seg bare med `samearrowhead`-attributter, som ikke berører rutingen til dette paret
— dens `n012->n011`-geometri er byte-identisk med den godkjente id-en på
både port- og orakelsiden, så mekanismen nedenfor gjelder ordrett.

**Hva som er forskjellig.** `maximal_bbox`s boksvegg for hodekorridoren lander på intern
x=90 i C mot x=89 i porten for den delte `samehead`-porten til de to
parallelle `n012->n011`. Konstruksjonen av delt port (`buildSharedPort`) og
grupperingen av parallelle er begge byte-samsvarende med C; gapet på 1 px er rent et
artefakt av `round()`-avrundingsgrensen — ~1e-14 oppstrøms flyttallsstøy
tipper en verdi som ligger nøyaktig på en `.5`-grense over til nabo-heltallet.
Portens `maximal_bbox`-formel speiler allerede Cs nøyaktig.

**Hvorfor vi ikke jager det.** `round()` er en primitiv som hver rutet kant i
korpuset går gjennom; å skyve på grenseoppførselen for å matche dette ene tilfellet er en
korpusomfattende regresjonsrisiko for 1 px på 2 kanter — den samme begrensningen med delt primitiv
som avrundingen av kontrollskroget notert i
`bbox-class-control-hull-vs-curve`. Full diagnose:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-avrunding mot streng IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klasse.** clang arm64 kompilerer orakelbinærfilen med `-ffp-contract=on`,
som slår sammen utvalgte multipliser-legg-sammen-sekvenser til enkelte FMA-instruksjoner;
porten kjører på V8, som utfører streng IEEE-754-avrunding og ikke kan emittere
`fma`. På bit-identiske inndata er de to uenige med 1-2 ULP i det uttrykket
kompilatoren valgte å kontrahere. Portsiden er alltid
strengt IEEE-754-resultat; orakelsiden er alltid det FMA-kontraherte
resultatet. Dette er en kompilator-/kjøretidsportabilitetsbegrensning under C-
kildekodens semantikk, ikke en logikkfeil i porten — ureduserbar uten å
emulere clangs spesifikke kontraksjonsvalg i programvare. To tilfeller
er kjent, på to ulike steder, med to ulike forsterkningsmekanismer:

- **2646** — ULP-en oppstår inne i `Proutespline`s `points2coeff`/`solve3`-
  kubikkløsning og snur direkte antallet røtter i splinetilpasseren.
- **2620** — ULP-en oppstår i `poly_init`s løkke for polygontoppunkters utstrekning
  (nodestørrelse) og forsterkes nedstrøms av `ortho`s trofaste heltallsavkorting per relax
  til en likhetsvending for en labyrintkorridor med lik kostnad.

**Berørt:** `2646` (structural-match, maxΔ 42.09 på 3 av 21 216 kanter:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — alle
record-port `:c->:nb_part` smode-ruter for lange kanter). Søsken til **A3**: begge
klassene er ureduserbare likheter i flyttallsportabilitet inne i
`Proutespline`, men mekanismen er en annen — et kompilatorartefakt fra `fp-contract`,
ikke libm `hypot`.

**Hva som er forskjellig.** På alle tre kantene avviker bare det siste `routesplines`-kallet (et
rett ledd inn i hodeporten). Endepunktet ligger bit-eksakt på
barrierepolygonets bunnvegg med tangenten parallell med veggen
(`evs[1]=(1,-1.22e-16)`), så hver `splinefits`-kandidat er tangent til
barrieren ved `t=1` — en nær-dobbeltrot i skjæringskubikken.
`points2coeff` beregner den kubikken gjennom katastrofal kansellering (ledd
rundt ~7446 som kollapser til ~0.099). Orakelet (clang/arm64,
`-ffp-contract=on`) kontraherer `v3 + 3*v1 - (v0 + 3*v2)` til fused
multiply-add, mens V8 utfører streng IEEE-avrunding — de to er uenige med
~9.1e-13 på **bit-identiske inndata**, og den støyen snur fortegnet på
`solve3`-diskriminanten: C finner 1 rot (866.7, innenfor segmentet); porten
finner 3 røtter med en falsk partnerrot ved `t=0.9999975 < 1-EPSILON2`. Den
falske roten utløser én ekstra `a`-halveringsiterasjon, som snur det
siste stykkets tangentstørrelse med en faktor 2 (i begge retninger på de
3 kantene), noe som gir maxΔ 42.09 etter klipping (26 SVG-forskjeller).

**Hvorfor godkjent (ureduserbarhet bevist ved et kontrollert eksperiment).** Alle seks
`routesplines`-kall ble dumpet på begge sider — boks, polygon, `PL`, start,
slutt og `evs` er byte-identiske, det samme er utdatasplinen fra det tidligere (ikke-siste) kallet; den eneste
forskjellen ligger inne i det siste kallets `solve3`. En
frittstående ren-C-testrigg isolerte den ene variabelen: kompilering med
`-ffp-contract=off` gjenskaper **porten** bit-eksakt på alle 3 kanter; standard
(`on`) kontraksjon gjenskaper **orakelet** bit-eksakt på alle 3
kanter. Porten stemmer altså allerede med strengt IEEE-754-C; avviket
er helt og holdent orakelkompilatorens valg av FMA-kontraksjon, under
C-kildekodens semantikk — det finnes ingen utroskap på kildenivå å rette. En
målrettet rettelse (å emulere kontraksjonen for hånd i `points2coeff`) ble forsøkt og
tilbakevist: den retter 2 av de 3 kantene, men ikke den tredje, hvis vending
oppstår inne i `solve3`s egen interne kontraksjon. En fullstendig rettelse ville
kreve programvare-FMA-emulering gjennom hele splinetilpasseren — en kostnad i den varme løkken
med korpusomfattende avrundingsspredning for en gevinst under pikselnivå på 3 kanter.
Full diagnose: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Berørt (historisk):** `2620` (var structural-match, maxΔ 585; 423 forskjeller
på 24 kantbaner + 22 pilspisser). **Kollapset til samsvarende 2026-07-11**:
den trofaste porten av `sgraph`-nærhetsbufferoverløp + toveis
inneslutning i `chancmpid` (se `.agent-notes/ortho-maze-circo-rca.md`) fjernet
avviket; godkjenningsoppføringen er pensjonert, og denne seksjonen beholdes som
dokumentasjon av A8-klassen.

**Hva som er forskjellig.** `ortho`-pipelinen (`splines=ortho`) er byte-samsvarende
med C gitt identiske inndata — bevist ved å injisere Cs eksakte labyrintinndata
(koordinater, `xsize`/`ysize`) i portens ortho-trinn: 378/378 rutede
segmenter kommer ut byte-identiske, så ingenting i `src/ortho` er skyld i det.
Det faktiske avviket er 1-2 ULP i labyrintens *inndata*: nodens `ysize` (og, ved
akkumulering innenfor rang, `ND_coord.y`) beregnet i Cs `poly_init`-løkke for
polygontoppunkters utstrekning (`shapes.c`), som under
`-ffp-contract=on` slår sammen `R.x += sidelength*cosx` til en FMA som er ~1
ULP større enn portens strenge IEEE-aritmetikk (begge sider implementerer det
aritmetisk identiske uttrykket). `2620` har 173 polygonnoder med brøkbredde;
alle viser C ≥ port med 1-2 ULP. Den ULP-en forsterkes — ikke
introduseres — av `ortho`s Dijkstra-relax, som trofast avkorter sin
løpende avstand per steg (`sgraph.c:165`, speilet av porten som
`Math.trunc`) over vekter utledet fra rå celleutstrekninger
(`maze.c:257`). Den ULP-forskjøvne geometrien snur en likhet mellom korridorer med lik kostnad
for 4 rutede kanter (baner + pilspissene deres); de gjenværende forskjellene er
omnummerering av ±1 spor som følgevirkning av de 4 vendingene.

**Hvorfor godkjent (ureduserbarhet bevist ved et kontrollert eksperiment).** En
frittstående C-testrigg som bare varierte `-ffp-contract` gjenskapte begge sider
på det avvikende sekskantstoppunktet: `-ffp-contract=on` → `310.29250168188713`
(samsvarer med orakelet), `-ffp-contract=off` → `310.29250168188707` (samsvarer med
porten), der den avvikende operasjonen er isolert til toppunkt `i=3`
(`R.x=-0.50000000000000011` fusjonert mot `-0.5` ufusjonert). Et andre
inndatainjeksjonseksperiment (eneste variabel: ortho-inndataverdier) bekreftet
forsterkeren: å mate portens egen `orthoEdges` med Cs eksakte
`coord`/`xsize`/`ysize` kollapser alle 4 korridoravvik til 0 — ortho-koden
har ingen feil, den er bare følsom (som Cs egen kostnadsbaserte labyrintruting) for et skift på 1-2 ULP i
inndataene. Å matche ville bety å emulere
clangs spesifikke FMA-kontraksjon av ett kompilert uttrykkstre i
`poly_init` — å jage et kompilert artefakt, ikke å portere kildesemantikk.
Full diagnose: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulert unntak (ikke godkjent): `triang.c:ccw`.** Ett kontraksjonssted
reproduseres bit for bit i stedet for å godkjennes: pathplans `ccw`
kompileres til `fnmul`+`fmadd` (eksakt første produkt − avrundet andre), så et
spørringspunkt som er bit-likt et segmentendepunkt, testes som ISCW/ISCCW i stedet for
ISON. `shortest.c:pointintri` avviser da endepunkter som er polygontoppunkter
(«destination point not in any triangle»), og `makeMultiSpline` faller tilbake
på vanlig ruting for hver sammenslått 2-syklus — en stor, diskret, korpusomfattende
oppførsel porten må matche. I motsetning til stedene `solve3`/`poly_init`
ovenfor (dypt inne i kompilerte uttrykkstrær, rettelse tilbakevist) er `ccw`
en enkelt frittstående kompilert funksjon med ren semantikk, så
`src/pathplan/triang.ts` emulerer den: en rask vei med vanlige double og
en konservativ feilgrense der vanlige og fusjonerte fortegn beviselig stemmer, og
en eksakt vei med Dekker-produkt + dyadisk BigInt for tilfellene nær null.

---

### A9. libm-trig 1-ULP → vending av likhet i CDT ved kosirkularitet (`circo`/`twopi`-multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klasse.** V8s `Math.sin`/`Math.cos` er ikke bit-identiske med Apples libm-
`sin`/`cos` (bevist: 1-ULP-uenighet ved `2π·4.5/8`, en av de åtte
hjørnevinklene for ellipsehindre). `makeObstacle`s omskrevne 8-kant-hjørner
arver den ULP-en, så trekantruterens inndatakoordinater avviker fra
orakelets med ≤6e-14. Symmetriske layouter (like store noder på en rang/ring) gjør
ruterens firkanter **eksakt kosirkulære** i reell aritmetikk, så det eksakte
incircle-predikatet sitter på en knivsegg: inndata-ULP-en snur fortegnet,
den begrensede Delaunay-diagonalen snur, og korridorpolygonet som feiler
`Pshortestpath` i orakelet («destination point not in any triangle» →
reserveløsning med vanlig spline) lykkes i porten (eller omvendt). De resulterende
splinene avviker med ~0.2–0.5pt. Søsken til **A3**/**A8**: en ureduserbar
flyttallsportabilitetsbegrensning under C-kildens semantikk — å matche
ville kreve å gjenskape Apples libm-avrunding av `sin`/`cos` nøyaktig i JS.

**Berørt:** `241_0` (circo Δ≈0.2 / twopi lerret Δ≈9 via korridorvendingen
på kanten `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 forskjeller i etikettposisjon hver — libm-1-ULP oppstår i
`poly_init`s enhetstoppunkt-trig (`hypot`/`atan2`/`sin`), setter én nodes
beregnede høyde en ULP forbi minstestørrelsesbegrensningen orakelet lander
på nøyaktig, og kaskaderer gjennom `floor()` i R-tre-lastingen for xlabel til en
enkelt vending av etikettkandidat. En rettelse med korrekt avrundet hypot ble forsøkt og
TILBAKEVIST: den rettet `2343` men regresserte `2168_3`, hvis åttekantstørrelse
går gjennom det samme kallet der orakelets verdi IKKE er den korrekt
avrundede — ingen deterministisk hypot-policy matcher orakelet på begge).
`2168_1` hørte opprinnelig hjemme i denne klassen, men ble
samsvarende da porten emulerte orakelets fp-kontraherte `ccw`
(pathplan `triang.ts`): korridorfeilen styres av den FMA-behandlede
avvisningen av toppunktendepunkter i `pointintri`, som porten nå reproduserer
bit for bit, så CDT-diagonalens ULP-likhet ikke lenger dukker opp der.

**Hvorfor godkjent (ureduserbarhet bevist ved et kontrollert eksperiment).** Selve
CDT-en er frikjent: portens `mkSurface` er en trofast port av GTS
0.7.6s inkrementelle innsetting (`cdt.c`: 1→3-deling + rekursiv
`swap_if_in_circle`, begrensningskanter forhåndsopprettet og ubyttbare,
`remove_intersected_*` + `triangulate_polygon` for håndheving av begrensninger), og
en frittstående C-testrigg som lenker mot det **ekte GTS-biblioteket** og mates med portens
bit-eksakte ruterinndata, gjenskaper portens triangulering flate for flate
(2168_1: 22/22; 241_0: 185/185). Eksakt rasjonal evaluering av incircle-
determinanten på de to inndatasettene bekrefter fortegnsvendingen (+1 med
portens inndata, −1 med orakelets). Den gjenværende variabelen — 1-ULP-
trigforskjellen — ble isolert ved å sammenligne bitmønstrene til `Math.sin`/`sin`
direkte.

**Godkjenning på motorsporet (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **xdot-motorsporene** for twopi/circo
(`parity-twopi.json` / `parity-circo.json`, innebygd `dot -K <engine>
-Txdot`-orakel, `test/corpus/engine-walk.ts`, semantisk sammenligning av tegneoperasjoner ved
±0.01 — se `test/golden/compare-xdot.ts`) avdekker denne samme mekanismen
uavhengig av SVG-undersøkelsen for dot-motoren som er nevnt ovenfor: twopi `2239` (1
forskjell i tegneoperasjon — vendingen av tekstposisjonen for `_ldraw_`-kantetiketten, den samme
trig-ULP-en for enhetstoppunkt i `poly_init` som kaskaderer gjennom `floor()`-
R-tre-kjeden for xlabel; `2343`, `share-b29` og `windows-b29`, opprinnelig godkjent
under denne oppføringen, ble *rettet* 2026-07-11 av den trofaste fmadd-kontraksjonen
i `polylineMidpoint` — se b29-familieavsnittet nedenfor) og circo `241_0` (41
forskjeller i tegneoperasjoner, Δ≈0.2pt på bezieren til kanten `1->2` — den samme
vendingen av CDT-diagonalen i korridoren; beslutningsjournal, 2026-07-10, oppføringen «CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed»). Godkjent på motorsporsnivå via
`test/corpus/accepted-divergences-engines.json`, koblet inn i
`PARITY-twopi.md`/`PARITY-circo.md` av `parity-report.ts` — den samme koblingen
`accepted.ts` utfører for dot-sporet `PARITY-dot.md`.

**circo `2475_2` — kosirkulær closestNode-hypot-likhet.** I én komponent med 28 noder i
denne grafen på 10762 noder velger circos `getRotation`
(`circpos.c:73-92`) blokknoden nærmest layoutens origo via
`hypot` for å avgjøre underblokkens rotasjon. To kosirkulære noder er
i praksis like langt unna; V8s korrekt avrundede `Math.hypot` og Apples
libm-`hypot` runder den avstanden 2 ULP fra hverandre, noe som snur det strenge `<`,
velger en annen node og roterer/speiler underblokken ~20° (18 noder
flyttes, maks. 296.7pt; de andre 10744 nodene er bit-identiske, det samme er
blokktreet, sirkelrekkefølgen og hver `centerAngle`). CR-hypot-policyen var
allerede tilbakevist for denne klassen (2026-07-10). Frittstående repro:
`.agent-notes/circo-2475-590-repro.dot`; full RCA:
`.agent-notes/circo-b81-2475-rca.md` (godkjent 2026-07-11).

**twopi `2470` — radialkoordinat-ULP forsterket av R-treet for xlabel.**
2470 er en graf med 140 kanter der HTML-`<table>`-kantetiketter klynger seg
på nesten sammenfallende radiale ankre. I neato-familien plasseres kantetiketter
som eksterne etiketter av den grådige xlabel-plasseringen (`label/xlabels.c`),
som velger hjørnekandidaten med minst overlapp via et Hilbert-ordnet R-tre.
Portens spliner og nodekoordinater samsvarer med orakelet til
emisjonspresisjon (null forskjeller i spline/node/bbox selv ved 1e-7), men én nodes radiale
`ND_coord.y` er forskjellig med ~2 ULP (Apples libm-`sin`/`cos` mot V8s `Math`) — langt
under samsvarskravet, men den ligger på tvers av grensen `floor(pos.y − sz.y/2)`
nøyaktig ved 0 i `objplpmks`, og snur dermed R-tre-rektangelet til det objektet med
én enhet. Endringen i Hilbert-rekkefølge/tregruppering får `RTreeSearch` til å beskjære
en annen gren, så ~140 etiketter hver hopper til den naboliggende kandidathjørnet
(hver forskjell er et fast steg (+bredde, −linjehøyde)). Plasseringen, objektrekkefølgen,
rektangelavrundingen, `CombineRect` (som trofast speiler Cs min-min-
egenhet) og int32-Hilbert-nøkkelen ble hver for seg verifisert trofaste; avviket
er oppstrøms radial-trig-ULP, ureduserbar av samme grunn
som twopi `1855`. Godkjent 2026-07-11; full RCA:
`.agent-notes/twopi-2470-rca.md` (som også dokumenterer at id-ens
«bestått» om morgenen var et artefakt av en foreldet orakelbinærfil, ikke en
portregresjon).

**osage `1855` — utsmøring av toppunkter i hindre ved fp-contract.** Forskjellig fra twopi-
oppføringen `1855` med radialt speil ovenfor: under osage er nodesentrene bit-eksakte
mot orakelet, og de 110 forskjellene i tegneoperasjoner er tre hindrerutede kanter
plassert på speilsiden av en noderad (X bit-eksakt, Y speilet). Åttekantens
hindertoppunkter fra
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) avviker
fra C med 3–4 ULP fordi clangs `-ffp-contract=on` slår sammen `a·b±c`-
kjedene i `ellipse_tangent_slope`/`line_intersection` til FMA-er med én avrunding,
mens V8 runder hver operasjon: Cs fusjonerte avrunding kollapser en renne-
kolonne av hjørne-x-verdier til én bit-identisk double (nøyaktig kollineær),
mens portens deler den i to verdier 1 ULP fra hverandre. Det snur synlighetens
`clear()`-tangenstest — rennen er ikke lenger blokkert — og legger til ~20
synlighetskanter, og Dijkstra løser likheten i opp/ned-homotopi mot
speilsiden. Kontrollert eksperiment: å injisere Cs eksakte hinderkoordinater i den ellers urørte porten gir **null** avvikende
kanter, noe som frikjenner kjeden med lovlig arrangement, synlighet, Dijkstra og spline
helt; å injisere Cs libm-`cos`/`sin` alene er uten virkning. Godkjent
2026-07-11; full RCA: `.agent-notes/osage-spline-family-rca.md`.

**b29-familien (twopi).** De fire b29-variantene deler én knivsegg:
`EqmtTyp`-kantetiketten (`Node14732->Node14731`) ligger på en eksakt likhet i placeLabels-sidevalg
hvis utfall avhenger av 1-ULP-drift i twopi-layouten i de
omkringliggende objektene. Med den trofaste fmadd-kontraksjonen i
`polylineMidpoint` (states-familierettelse, 2026-07-11) er portens etikettanker
bit-identisk med orakelets, men likheten løses likevel motsatt på
to av de fire variantene (`graphs-b29`, `linux.i386-b29`), mens de to andre
(`share-b29`, `windows-b29`) nå samsvarer — og `2343`s godkjente A9-
etikettforskjell forsvant helt. Grense: 1 tegneoperasjon, Δ12pt etikett-y. Ureduserbar
uten å eliminere oppstrøms drift. Full RCA:
`.agent-notes/twopi-states-rca.md`.

Den samme placeLabels-kniveggen dukker opp på **osage**-sporet (godkjent
2026-07-11, full RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` og `share-b29` (2 forskjeller i tegneoperasjoner hver — én kantetiketts
x-anker lander på 878.28 mot 841.06, plassert symmetrisk om det
bit-identiske splinemidtpunktet 859.67, dvs. ±halve etikettbredden; de to
variantene speiler hverandre) og `1652` (2 forskjeller i tegneoperasjoner — to kanter hver
snur ett etikettanker om et identisk midtpunkt, ett i x og ett i y,
med bit-identiske spliner og pilspisser; orakelet rendrer fullstendig,
så dette er ikke den kjente tilfeldige feilen med tidsavbrudd i det innebygde). I hvert tilfelle
er kantgeometrien bit-eksakt, og bare likheten i valg av etikettside løses
motsatt i omgivelser med 1-ULP-drift.

Osage-sporet har `polypoly`-trioen (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; godkjent 2026-07-11, full RCA i
`.agent-notes/patchwork-tail-rca.md`): den eneste avvikende operasjonen er den
nakne transcendente `cos(π+θ)` ved et toppunkt med orientering 180 i en forvrengt firkant —
V8s `Math.cos` er korrekt avrundet mens Apples libm-`cos` har en
argumentavhengig feil på ±1 ULP (så bare under libm er `|cos(π+θ)| ≠
|cos(θ)|`); nodestørrelsesdeltaet på 1 ULP mates inn i packs `GRID`/`ceil`, snur en
omkretslikhet, og qsort plasserer to komponenter i hverandres pakkeceller
— et stivt bytte av hele noder uten form- eller rutingfeil. Ingen
deterministisk omskriving kan gjenskape en ikke-korrekt-avrundet libm-
transcendental, den typiske A9-formen.

Den samme mekanismen ble bekreftet 2026-07-28 på den større søsteren
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, ny i
universet på 905 elementer; 112 forskjeller i tegneoperasjoner, bare osage). Den avvikende operasjonen
er det identiske `cos(π+θ)`-stedet med 1 ULP for node `9004` — C- og port-`bb.x`-
verdiene samsvarer med den opprinnelige RCA-en byte for byte — men på denne inndataen med 76 noder
går propagasjonen i stedet gjennom osages `arrayRects`: `acmpf` sorterer pakkeceller
etter den rå summen `width+height`, og libms bredde som er 1 ULP høy gjør at
`9004` sorteres strengt foran sine roterte søsken `9000/9002/9006`, mens
V8s korrekt avrundede verdi etterlater en eksakt 4-veis likhet som den ustabile
qsort ordner annerledes — andre radvise celler, et `9002`/`9006`-
bytte og en kaskade av kolonnebredde-`fmax` som forskyver 8 naboer i x.
Å mate portens egen `arrayRects` med C-nodestørrelsene mot portens nodestørrelser
reproduserer kjøringens 10 flyttede noder med byte-samsvarende x-deltaer,
og lukker dermed årsakskjeden.

To ytterligere tilfeller på motorsporet ble rotårsaksanalysert og godkjent 2026-07-11
(full RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 forskjeller i tegneoperasjoner
— søsknet til circo-oppføringen ovenfor: den samme kosirkulære CDT-
incircle-likheten, snudd av libm-`sin`/`cos` med 1 ULP, får portens
multispline-korridor til å lykkes med en spline på 14 punkter der det innebygde bygget
faller tilbake på vanlig ruting med 8 punkter; punktdeltaer < 0.07pt) og circo
`windows-tree` (10 forskjeller i tegneoperasjoner på én viftekant — circos plasserings-trig
lander `node2.y` én enkelt ULP over `node8.y` rundt den nøyaktig symmetriske
verdien 18.0, og `closestSide`s dyna-valg av hodeport snur TOP/BOTTOM ved
akkurat den likheten; nodeposisjoner og bokser er ellers bit-identiske med
orakelet).

**sfdp-motorsporet — FP-likheter i kanter (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> sfdps xdot-motorspor (`parity-sfdp.json`,
innebygd `dot -Ksfdp -Txdot`, ±0.5) avdekker den kosirkulære CDT-incircle-likheten så snart
eksakte innebygde posisjoner før ruting injiseres (så avviket er IKKE
iterativ drift — se A1-driftklassen — men en diskret predikatlikhet):

- `42` og `241_0` — kosirkulær CDT-incircle-likhet (multispline-korridoren).
  Med injiserte posisjoner er resten en **vending i segmentantall**: `42`
  `opCount 5 vs 9` (kant 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kant 3->2) — portens constrained-Delaunay-diagonal snur mot
  orakelet, så multispline-korridoren lykkes med en spline på N punkter der det
  innebygde bygget faller tilbake på en kortere vanlig rute (eller omvendt), akkurat som
  twopi-/circo-oppføringen `241_0` ovenfor. Porten emulerer allerede arm64-
  `fmadd`-kontraksjonen i incircle-/`ccw`-predikatet (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) og bruker robust-incircle Delaunay; resten er
  1-ULP-forskjellen mellom V8 og Apple-libm i `sin`/`hypot` i predikatinndataene, som ingen portabel
  kode gjenskaper.

> **`2095` omklassifisert A9 → A1-drift (2026-07-22).** Den var tidligere oppført
> her som «hypot-søsknet» (drift under 0.7pt på kantene til en node
> med tomt navn `""->"4"`). Den resten var et **testriggartefakt**: tilskrivningsinjektorens
> `GVTS_POS`-regex krevde ≥1 navnetegn, så noden med navnet `""` ble aldri
> injisert og dro med seg sine to tilstøtende kanter. Med injektoren rettet til å matche
> tomme navn (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`) injiserer sfdp `2095`
> til **0 rest** — ren kraftdrift, dekket av den beregnede A1-driftklassen, ikke
> en FP-likhet i rutingen. Dens godkjenning per id ble fjernet fra
> `accepted-divergences-engines.json`. (Samme funn som fdp `2095` nedenfor.)

**Nytt kontrollert eksperiment (2026-07-21).** En probe av innebygd mot V8-`hypot`
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): å kompilere
systemets C-`hypot` og sammenligne med Nodes `Math.hypot` på representative
avviksinndata for flate kanter viser 1-ULP-uenighet på 2 av 6 (Δ 7.1e-15 og
5.7e-14) — deleterskelens knivsegg som snur delingsantallet.
Ureduserbar: ingen portabel hypot gjenskaper Apples libm (presedensen `arm-pow.ts`
for den samme grensen). Godkjent på motorsporsnivå via
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

**fdp**-xdot-motorsporet (`parity-fdp.json`, innebygd `dot -Kfdp -Txdot`,
±0.5) avdekker den SAMME kosirkulære CDT-likheten på den samme grafen, `241_0`: med
orakelets eksakte posisjoner før ruting injisert er resten 11 numeriske
`unfilled_bezier`-forskjeller begrenset til én kant (`0->1#0`, maxΔ 3.39pt). Siden
nodeposisjonene er injisert-identiske, ligger avviket nedstrøms i
pathplan-multispline-korridoren — den samme libm-1-ULP-incircle-likheten som
for twopi/circo/sfdp `241_0` (eksakt-rasjonal incircle 185/185 ovenfor). Spakene er
allerede brukt (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); likheten er ureduserbar. Godkjent via `accepted-divergences-engines.json`
`fdp.241_0`. fdps `2095` er derimot **A1-drift, ikke A9**: å injisere den
ene noden med tomt navn (etter at tilskrivningsinjektoren ble rettet til å matche
noder med navnet `""`) kollapser resten til null — den tidligere «A9-halen» var
den ikke-injiserte tomme noden som dro med seg sine tilstøtende kanter. Godkjenningen av sfdp `2095` var
den samme blindsonen — en ny regenerering av sfdp-tilskrivingen (2026-07-22) med den rettede
injektoren bekreftet at den også injiserer til 0, og godkjenningen ble fjernet (se
merknaden om `2095` omklassifisert ovenfor).

---

## Sporet lang hale (`dot`-attributter og kanttilfeller) {#tracked-long-tail-dot-attribute-edge-case}

Ved **standardinnstillinger** samsvarer `dot`-motoren med C-binærfilen innenfor en stram deterministisk
toleranse på golden-korpuset (`conformant`-dommen; se merknaden øverst).
De gjenværende forskjellene er **den lange halen av attributter og
kanttilfeller** — den historisk vanskelige delen av enhver Graphviz-port. I motsetning til
de godkjente deltaene ovenfor *vil* disse bli lukket; de spores live, med
tall, i
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategori | Hva som er forskjellig |
|---|---|
| **path-structure** | Splineruting av kanter i bestemte konfigurasjoner (f.eks. noen tilfeller med flate kanter og tette korridorer). |
| **element-count** | En funksjon som emitterer flere/færre SVG-elementer enn C i visse grafer. |
| **color-stroke** | Forskjeller i emisjon av strek/fyll for bestemte stilattributter. |
| **parser-gap** | Et lite antall DOT-inndata som parseren ennå ikke aksepterer fullt ut. |

Hvis grafen din bare bruker vanlige attributter og `dot`-motoren, er du nesten
helt sikkert på veien med deterministisk toleransesamsvar. Hvis en layout ser feil ut, sjekk `PARITY-dot.md` for
den inndataklassen — det er sannsynligvis et sporet punkt med et orakelfestet rettelsesoppdrag,
ikke et ukjent.

> **Merknad om etikettdrevne tilfeller.** Tekstmålingsklassen (A2) er lukket —
> ingen `dot`-graf er lenger godkjent under den. En graf som i dag ligger på
> structural-match er et sporet gap, ikke et skriftmetrikkdelta.

### Pilspisser på motstående kanter ved `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Når `concentrate=true` slår sammen et antiparallelt par (`A->B; B->A`) til én
gjenlevende kant, må den kanten tegne en pilspiss i **begge** ender. Dette er nå
portet (grenen `conc_opp_flag` i `arrow_flags`; se
`src/common/splines-clip.ts:arrowFlags`), så `graphs-b135`, `167` og `2087`
samsvarer (`element-count`-avviket med manglende pilspiss og dets bivirkning på uklippet spline-`@d`
er begge borte).

Noen concentrate-grafer **beholder en separat, allerede eksisterende rest** som
pilspissrettelsen **ikke** tar tak i — det er et delta i nodens **x-koordinat**
(x-nettverkssimpleks / kompassport), ikke en pilspissfeil:

- **`graphs-b15`, `graphs-b69`** — de store record-/klyngegrafene av «heis»-typen.
  Concentrate aktiveres og slår korrekt sammen; resten er et node-x-delta på ~1pt
  som forsterkes til en forskjell i `element-count`/spline-`@d`. Selve pilspissemisjonen
  er nå korrekt (b69 får sine manglende pilspisspolygoner). Se
  agentnotatet `b69-concentrate-undermerge` for rotårsaken i x-koordinaten.
- **`1453`** — avviker fortsatt på en `element-count`-årsak på toppnivå uten tilknytning
  til conc_opp_flag-pilspissen.
- **`2825`** — på tidspunktet for denne pilspissrettelsen avvek den på en `element-count`-
  årsak på toppnivå uten tilknytning til conc_opp_flag (ingen sammenslåing av motstående par
  utløses der); siden lukket av oppdraget fix-2825-rebuild-vlists,
  se A4 ovenfor.

Dette er sporede punkter for x-koordinat / struktur, **ikke** pilspissfeil.

### Hull i layouttroskap fra 2.0-troskapsoppdraget (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0-troskapsoppdraget fikk uportede attributtverdier til å feile høylytt (se
tabellen `UNSUPPORTED_FEATURE` i
[Feil og unntak](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Det etterlot følgende, registrert i `plans/v2-fidelity/decision-journal.md`.

**Høylytt, uportet.** `overlap=voronoi` med overlappende noder kaster fortsatt
`UNSUPPORTED_FEATURE` i neato, twopi, circo og sfdp: selve Voronoi-justereren
(`vAdjust`s algoritme) er ikke portet. Overlappstesten som avgjør
om det skal kastes, er Cs egen (`countOverlap` over `poly.c`-nodepolygoner).

**Kjente hull, fortsatt stille.** Porten rendrer disse uten feil og
avviker fra innebygd Graphviz. Funnet av oppdraget `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); ikke godkjente deltaer.

- **Advarselen «Unrecognized overlap value» fra `getAdjustMode` emitteres ikke.**
- **Roterte polygontoppunkter kan avvike fra innebygd i de siste bitene
  (ureduserbart: vertens matematikkbibliotek).** `poly_init` orienterer hvert toppunkt med
  `atan2`, `hypot`, `sin` og `cos`. Med bit-identiske inndata returnerer macOS-libm og
  V8 ulike siste bit (f.eks. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` ved neste toppunkt:
  libm `…fffd`, V8 `…fffe`), så en boks med `orientation=20` får toppunkt-y
  `-18` i porten og `-17.999999999999996` i innebygd. Innebygd Graphviz selv
  varierer med plattformens libm, og en nettleser kan ikke kalle den. Portens egen
  aritmetikk samsvarer med C (`RADIANS`-rekkefølgen er fastsatt; 776 av 1664 utvalgte
  toppunktkoordinater er bit-identiske, resten avviker bare gjennom libm). Effekt:
  `polyOverlap`-dommer ved eksakt berøring kan snu; med innebygde toppunkter samsvarer
  hver dom.
- **sfdp kan avvike fra innebygd på macOS (ureduserbart: vertens libm-`pow`).**
  Diagnostisert med en instrumentert innebygd sfdp: posisjonene forblir bit-identiske
  inntil ett frastøtingskraftledd, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1` så `pow(x, 2)`), returnerer 1 ulp mindre enn `x*x` fra macOS-libm
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, korrekt avrundet
  `…396`; macOS `pow(v, 2) != v*v` for 20 av 16201 utvalgte `v`). Det endrer
  iterasjonens `Fnorm` i siste bit; sfdps adaptive avkjøling forsterker det
  til en annen (ofte speilet) layout. Portens `armPow` er ARMs
  optimized-routines-`pow` (glibc ≥ 2.28), dvs. det Graphviz på Linux beregner;
  macOS-orakelet er avviker. Utelukket: seeding (eksplisitte `start=`-verdier
  samsvarer), `pcp_rotate` (samme inndata gir samme utdata), posisjoner og
  det tiltrekkende leddet (bit-identiske). Eksempel: en enslig trekant `a--b; a--c; b--c`
  med standard seed.
- **fdp kan avvike fra innebygd gjennom vertens libm-`cos`/`sin`.** fdp følger
  Graphviz etter 15.0.0 (hypot-avstand i frastøting, `Mlimit`), med vertens
  libm-`hypot` gjenskapt bit for bit (`src/common/libm-hypot.ts`, 0
  avvik på 400k prøver). 251 av de 252 golden-inndataene som kan rendres med fdp
  samsvarer nøyaktig med det innebygde bygget; den gjenværende
  (`parallel-cluster-ldbxtried`) plasserer klyngeportnoder med
  `T_Wd * cos(alpha)`, og macOS-libm `cos(-2.3840764867756761)` ligger 1 ulp fra
  V8s `Math.cos`; fdps kraftløkke forsterker det til omtrent 3 tommer. Apples
  `cos` kan ikke gjenskapes fra en kort modell slik `hypot` kan.
- **Innebygde krasj som porten definerer.** Innebygd Graphviz avslutter med 139 på neato
  `mode=KK` med `model=mds` og en kant-`len` (`mds_model` indekserer `GD_dist`
  med et 1-basert sekvensnummer: heapoverflyt), og på `model=circuit` med en
  usammenhengende graf. Porten dropper celler utenfor rekkevidde i det første tilfellet og
  faller tilbake på korteste veier i det andre; det finnes ingen innebygd utdata å
  sammenligne mot.

---

## Bevisst ikke portert (ikke-mål) {#intentionally-not-ported-non-goals}

Dette er bevisste omfangsgrenser, ikke feil. Biblioteket retter seg mot **SVG**
(pluss de mellomliggende tekstformatene `json` / `xdot` / `dot` / imagemap).

- **Andre utdataformater.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  og GUI-/interaktive backender er utenfor omfang. Bruk SVG-utdata og konverter
  nedstrøms hvis du trenger raster.
- **`page=`-paginering for SVG.** Innebygd `dot` paginerer heller ikke SVG (
  SVG-enheten setter ingen pagineringsflagg), så `page=` er en no-op på denne veien i begge
  implementasjonene — dokumentert her bare fordi det er et vanlig
  forvirringspunkt.
- **`-Tplain`-tekstutdata.** Utsatt (et trofast tekstformat), ikke utelatt.
- **`gvpr`** (skriptspråket for grafbehandling) — utenfor omfang.
- **C++-bekvemmelighetsomslag** (`cgraph++`, `gvc++`) — C-APIet portes
  først; et idiomatisk TypeScript-bekvemmelighetslag, hvis det er ønsket, ville være en
  egen pakke.
- **`fontnames=svg|ps` i tekstmåling i nettleseren.** I en nettleser bygger
  canvas-måleren skriften sin fra PostScript-aliasets
  `fontnames=native`-familieliste (`Times-Roman` → `Times, serif`), den samme
  skriften SVG-emitteren rendrer som standard. `TextMeasurer` bærer ingen grafkontekst,
  så grafer som setter `fontnames=svg` eller `fontnames=ps` måles
  mot den innebygde listen mens SVG-en navngir svg-/ps-familien. Aliasvekter
  som CSS ikke definerer (`book`, `demi`, `light`, `medium`, `roman`)
  emitteres ordrett, som i C; nettlesere ignorerer dem og rendrer normal
  vekt, og måleren måler normal vekt for å samsvare. Node-utdata
  er upåvirket (den bruker aldri canvas-måleren).
- **Innebygde mekanikker** erstattet med nettleserikre ekvivalenter: dynamisk
  plugin-lasting (`dlopen`) er erstattet av statisk registrering av motorer/rendere;
  filsystemlesing (skrifter, bilder, konfigurasjon) er erstattet av tilbakekall levert av kalleren
  (f.eks. `setImageSizer`). Oppførselen er bevart; mekanismen er forskjellig.

---

## Å melde et avvik {#reporting-a-divergence}

Hvis du finner utdata som avviker fra C og **ikke** er et godkjent delta ovenfor,
ikke står i `PARITY-dot.md` og ikke er et ikke-mål, er det en feil som er verdt å melde — C-
kildekoden er spesifikasjonen, og uoppførte avvik behandles som feil, ikke som
akseptert oppførsel.
