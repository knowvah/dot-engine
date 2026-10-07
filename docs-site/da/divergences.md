---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Kendte afvigelser fra C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine sigter mod den størst mulige troskab mod den kanoniske
C-implementering. C-kildekoden er specifikationen; en forskel, der ikke er anført,
behandles som en fejl, ikke som accepteret adfærd.

> **Hvad „match“ betyder her.** Korpussets paritetsdom `conformant`
> er en **stram deterministisk tolerance**, *ikke* bogstavelig byte-for-byte-lighed
> i SVG: numeriske koordinater og stier skal stemme inden for **±0.01**, og alt
> ikke-numerisk indhold (tags, farver, tekst) skal være nøjagtigt ens
> (`compareSvg(…, 'deterministic')`). Overalt i dette dokument henviser „match“ og
> „conformant“ til denne tolerancedom. Fuld definition:
> [Overensstemmelse](./conformance.md).

Hvor outputtet *afviger*, falder det i præcis én af tre klasser:

1. **Accepterede afvigelser** — forskelle, vi har undersøgt, forstår helt ned til
   årsagen og **bevidst har valgt ikke at gøre conformant**. Hver af dem er afgrænset,
   karakteriseret og begrundet nedenfor. De er ikke fejl og bliver ikke
   „rettet“ uden en specifik, særskilt afgrænset grund.
2. **Sporet lang hale** — kendte huller, som *vil* blive lukket, hver med en
   orakel-forankret rettelse. De føres med aktuelle tal i
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Ikke-mål** — bevidste afgrænsninger af omfanget (formater og mekanismer, vi
   aldrig har haft til hensigt at gengive).

De autoritative, løbende opdaterede optegnelser er
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(paritets-dashboard pr. input mod den native `dot`) og
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(opgørelse over portstatus på algoritmeniveau).

Den **maskinlæsbare** sandhedskilde for, hvilke grafer der er *accepteret* (klasse 1
nedenfor), er
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Værktøjerne forbinder den ved rapporttidspunktet: `PARITY-dot.md` adskiller **accepterede
afvigelser** fra den **sporede** efterslæbskø, og regel-gaten henter sin
tilladelsesliste derfra. Prosaafsnittene nedenfor forklarer hver post (A1 og A3
er aktive; A2 er lukket og bevaret som historik); en CI-test
(`accepted-divergences.test.ts`) sikrer, at hver accepteret graf
stadig afviger, så denne liste ikke stille rådner op.

---

## Accepterede afvigelser (vi gør dem bevidst ikke conformant) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Vi accepterer en afvigelse — frem for at jagte byte-paritet — kun, når **alle**
følgende gælder:

- Grundårsagen er en **portabilitetsbegrænsning** (noget, JavaScript-/
  browser-kørselsmiljøet ikke kan gengive nøjagtigt), ikke en logikfejl i porten.
- Forskellen er **umærkelig** og beviseligt **afgrænset**.
- En rettelse ville have en **uforholdsmæssig pris og sprængradius** i forhold til
  gevinsten (typisk: den ville røre en delt primitiv, som hundredvis af
  allerede conformante grafer bruger, med risiko for regressioner for en
  gevinst på en brøkdel af en pixel).

Når vi accepterer en afvigelse, karakteriserer vi den her, så forbrugere aldrig bliver overrasket.
Grafer, der er berørt af en accepteret afvigelse, valideres mod et **strukturelt /
tolerancebaseret** krav i stedet for et bytekrav.

### A1. Kommatals-determinisme (kraftbaserede motorer) {#a1-floating-point-determinism-force-directed-engines}

**Berørt:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (de iterative
fjedermodelmotorer). `dot`-motorens *layout* er **ikke** berørt af denne
iterative models determinisme; en separat, snævert afgrænset kommatalsafvigelse i
`dot`'s spline-føring er behandlet under **A3** nedenfor.

> **Omfang, historisk et ikke-målt forbehold — nu delvist målt.** Den
> **primære SVG-undersøgelse af dot-motoren** (`test/corpus/survey.ts`) er stadig
> **kun dot**: det native orakel kører under `GVBINDIR=/tmp/ghl`, som
> kun symlinker plugin'erne `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` gennemløber netop `core dot_layout`
> — der er ingen layoutplugin til `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`),
> og både orakel og port kaldes med `dot`-motoren. Korpus-id'er
> som `*_neato` / `*_circo` / `root_twopi` er derfor *filnavne*, der er lagt ud med
> `dot` i den undersøgelse, ikke med deres native motor, og A1 matcher **nul**
> grafer dér — ikke fordi motorerne er bevist conformante, men fordi
> netop den undersøgelse aldrig bruger dem.
>
> **Men alle seks A1-motorer har nu deres egen native-motor-undersøgelse**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (uafhængig af `GVBINDIR` —
> hver kalder `dot -K <engine> -Txdot` direkte), på to forskellige stringensniveauer,
> dokumenteret hver for sig nedenfor: `circo`/`twopi`/`osage` kører med samme
> **±0.01 deterministiske** tolerance som dot-undersøgelsen med årsagstriage pr. id
> („Accept på motorsporet“ nedenfor); `neato`/`fdp`/`sfdp` kører med en
> løsere **±0.5-karakteriserende** tolerance uden triage pr. id endnu
> („Karakterisering af de iterative motorer“ nedenfor). Aktuelle tal på tværs af motorer:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Karakterisering.** Disse motorer kører iterative numeriske layouts, hvis resultater
afhænger af kommatalsafrunding — specifikt fused multiply-add (FMA) og
`Math.pow`, som kan variere mellem JavaScript-motorer og CPU-arkitekturer. Porten
følger C's operationsrækkefølge, hvor det er muligt (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — fx fastlåser `sfdp` sig til ~6 betydende cifre mod det
native orakel med en matchet PRNG og `fma` — men præcis, koordinatidentisk
gengivelse er **ikke garanteret på tværs af platforme**. Topologien bevares; den
potentielle afvigelse ligger i de fine knudekoordinater.

**Hvorfor accepteret.** Dette er en hård begrænsning ved at køre i JS, ikke et designvalg
— samme familie som A3's Apple-`hypot`-følsomhed. Der er ingen måde at garantere
bit-identiske transcendente/FMA-resultater på tværs af alle målkørselsmiljøer, så et bytekrav
ville være utestbart og ikke blot dyrt. At **vurdere A1** (frem for blot
at tage forbehold) krævede et separat native-motor-paritetsspor — bygget
2026-07-11 som `test/corpus/engine-walk.ts` + `parity-report.ts`, der undersøger hvert
input under sin egen motor i stedet for `dot`. Det ærlige loft for dette arbejde er
at **indsnævre** A1 til „ingen aktiv afvigelse på referenceplatformen“ og aldrig at
fjerne forbeholdet om tværplatform; resultaterne indtil videre (nedenfor) holder sig under
det loft: `circo`/`twopi`/`osage` har hver afdækket og årsagsanalyseret en håndfuld
ægte A1/A9-tilfælde, og `neato`/`fdp`/`sfdp` ligger nu på 90.8/77.5/68.0%
inden for 0.5pt af native over de 910 elementer, hvilket betyder, at den porterede
aritmetik (`fma.ts`, `arm-pow.ts`, matchet PRNG) holder for de fleste grafer —
og hvert resterende afvigende id er individuelt tilskrevet ved injektion (solver-
drift mod portfejl) i stedet for at blive efterladt som uanalyseret drift; se
karakteriseringen af de iterative motorer nedenfor.

**Accept på motorsporet: twopi-pilefamilien.** <a id="a1-twopi-arrows-family"></a>
Blokcitatet ovenfor beskriver dot-motorens SVG-undersøgelse, hvor A1 matcher nul
grafer; det separate `twopi` **xdot-motorspor** (`parity-twopi.json`, native
`dot -K twopi -Txdot`-orakel, `test/corpus/engine-walk.ts`) kører *under*
sin native motor og afdækker et konkret, verificeret A1-tilfælde på 9 korpus-id'er:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
og (tilføjet 2026-07-28, nyt i de 905 elementer) søsteren i directed/
`tree-graphs-directed-oldarrows` — hver afviger på én dominerende kant
(`Z->I` eller `i->Z`; 12–64 draw-op-forskelle). Injektions-A/B (beslutningsjournalen, 2026-07-10, indlægget „injection A/B verdicts:
twopi arrows family EXONERATED...“) beviste mekanismen direkte:
at dumpe den native `spline_edges`'s indgangs-`ND_pos` og injicere den i
portens `splineEdgesShifted` giver **fuldt conformant** output på
`graphs-arrows` (`Z->I` bliver byte-identisk med oraklet, samme 7/14-punkts
spline) — så afvigelsen er 100% knudepositionsdrift før føringen ud af
`twopi`'s PRISM-overlapfjernelsessolver, og portens splineføring/-emission
er frikendt. Det synlige symptom på 6 af de 8 id'er er et bezier-punktantal, der
vipper (`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`'s tilpassede stykketal
er følsomt over for, hvilken side af en forhindringsgrænse den afdrevne knudeposition
lander på, så en position, der er under én ULP forskellig efter PRISM's iterative
løsning, vipper den tilpassede splines segmentantal (de øvrige 2 id'er,
`graphs-arrowsize`/`nshare-arrows_dot`, viser den samme drift som et mindre
rent positionsdelta uden vip i stykketallet). Accepteret på motorsporniveau
via `test/corpus/accepted-divergences-engines.json`, forbundet i
`PARITY-twopi.md` af `parity-report.ts` — den samme forbindelse, som `accepted.ts` udfører
for dot-sporets `PARITY-dot.md`.

`oldarrows`-RCA'en (2026-07-28) udpegede det præcise vippested for familiens
punktantalssymptom. Dens `i`–`Z`–`I`-vifte er kollineær på en ringdiameter, og
pathplan `directVis`'s `intersect()` blokerer en sigtelinje, når et forhindringshjørne
ligger „på“ segmentet — hvor `wind()`'s kollinearitetstolerance på 1e-4
får selv en knude 270pt fra segmentet til at tælle som kollineær, og
`inBetween()` (som antager kollinearitet) derefter degenererer til kun at teste
**x-projektionen**: hjørnet blokerer, hvis og kun hvis dets x ligger strengt inden for det
ULP-brede interval mellem de to endepunkters x-koordinater. Hvilken af de to
spejlede radiale kanter, der bøjer, afhænger derfor af sidste-ULP-rækkefølgen af
tre nominelt ens x-værdier fra PRISM's løsning — C bøjer `Z->I`
(knude `i`'s akshjørne lander inden for dens interval), porten bøjer `i->Z`
(knude `I`'s hjørne lander inden for sit eget). At gengive `directVis` offline på
hver sides dumpede forhindringssæt reproducerer hver sides beslutning nøjagtigt,
og at injicere oraklets `ND_pos` før føring i porten giver 0 forskelle
(`attribution-twopi.json`) — føring og emission er byte-tro.

`1855` er den radiale/stjerneformede **spejl**variant af den samme
PRISM-FP-mekanisme før føring (accepteret 2026-07-11): dens 31 blade er præcis cocirkulære, så
stjernelayoutet er spejlingssymmetrisk, og PRISM's overlapfjernelse sidder på en
symmetri-ustabil ligevægt; en V8-mod-libm `cos`/`sin`-forskel på 1 ULP ved 5
bladvinkler i `circleLayout`'s `setAbsolutePos` vælger det modsatte spejlbassin,
og hele det radiale layout lander som det nøjagtige x-akse-spejl af
oraklets (største knudeforskydning 6.04pt, bb bevaret). Injektions-A/B beviste
begge retninger: at fodre C's nøjagtige `circleLayout`-positioner ind i portens PRISM
reproducerer oraklet knude for knude (3e-14), og at gendanne kun de 5
ULP-afvigende bladpositioner vipper hele layoutet tilbage til portens
spejl. Fuld RCA: `.agent-notes/twopi-radial-drift-rca.md` (beslutningsjournal
2026-07-11).

**Karakterisering af de iterative motorer: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
I modsætning til motorsporene `circo`/`twopi`/`osage` ovenfor er `neato`/`fdp`/`sfdp`
**endnu ikke** triageret pr. id — `engine-walk.ts` registrerer et felt `tolerance: 0.5`
for disse tre, og `parity-report.ts` viser dem i et separat afsnit,
„Iterative engines (±0.5 characterization)“, i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
udtrykkeligt **ikke** sammenligneligt med de deterministiske beståprocenter på ±0.01 andre steder
i dette dokument. Aktuelle tal (910 elementer; beståprocenten udelader
inputs, som C-oraklet ikke kan rendere, jf. [Overensstemmelse](./conformance.md)):

| motor | undersøgt | inden for ±0.5pt | ikke-conformant (alle tilskrevet, accepteret) | porteringsfejl / timeout | orakelfejl |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Den første kørsel, 2026-07-11 ved 762 elementer, målte 263/311/260 inden for
±0.5pt — springet til de nuværende rater kom fra rettelser pr. id, som er landet siden,
især neatos uportede `user_pos`/`P_SET`-håndtering, konsolideringen af motorinit
og rettelsen af `setEdgeType` makro-mod-funktion.)

I modsætning til ved første kørsel er hver afvigende række nu individuelt tilskrevet:
injektionsværktøjet (`test/corpus/attribute-divergence.ts`) fodrer det
native orakels `ND_pos` før føring ind i porten og sammenligner igen, og
hvert nuværende afvigende id er enten `drift-exonerated` (portens føring
og emission reproducerer oraklet nøjagtigt, når solver-driften er fjernet)
eller et af de få separat accepterede rester pr. id (`241_0`'s
CDT-incircle-uafgjort på alle tre motorer, neato `2239`, sfdp `42`/`2556`).
Klasseaccepten nedenfor formaliserer den frikendte mængde; aktuelle tal i
dashboards pr. motor
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Klasseaccept af A1-drift (iterative motorer, beregnet medlemskab).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
indeholder én `"A1-drift"`-**klasse**-post pr. iterativ motor (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — adskilt fra de
poster pr. id, som sporene `circo`/`twopi`/`osage` ovenfor bruger (D2,
`plans/iterative-parity-campaign/decisions.md`). I modsætning til en post pr. id
opregnes klassemedlemskab aldrig i hånden i registret: `parity-report.ts`
beregner det ved rapporttidspunktet ud fra den matchende `attribution-<engine>.json`
(T1's injektionstilskrivningsværktøj, `test/corpus/attribute-divergence.ts`)
— hvert afvigende id, hvis native `ND_pos` før føring blev injiceret i
porten og sammenlignet igen, og som er conformant ved ±0.5, får `verdict: 'drift-exonerated'` i
den fil, hvilket betyder, at de to motorers iterative solvere konvergerede til
numerisk forskellige, men hver for sig internt konsistente layouts (en forskel i
kommatalsakkumulering iht. A1-karakteriseringen ovenfor, ikke en fejl i portens føring
eller emission). Evidens pr. id — bucket-form, antal forskelle for base mod injiceret,
detektering af ensartet translation/spejling — findes i selve
tilskrivningsartefakten, ikke duplikeret i dette dokument eller i registret (D2). Et id,
der senere begynder at bestå helt, eller hvis gentilskrivning ændrer dom,
falder automatisk ud af klassen ved næste regenerering af rapporten — ingen forældet
accept-redigering er nødvendig, og ingen fejl i vagttesten. Motorer, hvis
`attribution-<engine>.json` endnu ikke er genereret, viser klassen som
„attribution pending“ med nul medlemmer, identisk med slet ingen accept —
klassens post må gå forud for sine data (se
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Tekstmåling (skrifttypemetrik) → layout drevet af labels — LUKKET <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): lukket.** Intet korpus-id accepteres længere under denne klasse;
afsnittet bevares som historisk dokumentation af mekanismen og af den
injicerbare `TextMeasurer`-snitflade, der neutraliserede den.
Efterfølgende rettelser af tekstmåling (overgangen til `EstimateTextMeasurer`,
skrifttypebevidste lodrette metrikker, rettelsen af ikke-ASCII UTF-8-bytes) løste næsten
alle labeldrevne layoutafvigelser, som tidligere hørte hjemme her. **`proc3d`** —
det tidligere kanoniske A2-eksempel — er fuldt **`conformant`** i alle tre
korpusmapper (`graphs-`/`share-`/`windows-proc3d`): matchende bbox, nul
forskelle i stidata, nul forskelle i label-ankre.

**De sidste medlemmer blev pensioneret (2026-07-01).** **`NaN`-familien**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) blev ført her længe efter, at dens
knudegeometri allerede matchede C nøjagtigt (76/76 referencepunkter). Dens reelle
rest — 8 endepunkter på rette kanter i fire modsatrettede 2-cyklus-par
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) forskudt 6–14 pt — blev diagnosticeret påny og viste sig at være
**slet ikke en skrifttypemetrik-effekt**, men to portfejl i dot's
føring af multikanter (mission `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Banerækkefølge for modsatrettede par.** Porten sorterede hver gruppe af parallelle kanter
   om efter oprindeligt oprettelsesløbenummer, før Multisep-banernes forskydninger blev tildelt; C
   tildeler baner i den indsamlede edgecmp-rækkefølge (MAINGRAPH-fremadrepræsentant
   først, AUXGRAPH-omvendt medlem som nummer to — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). En 2-cyklus, hvis omvendte medlem blev erklæret først,
   tegnede hver kant i den andens 18 pt-korridor.
2. **Falsk flat-adjacency på sammenfletede kanter på tværs af rang.** `markAdjacent`
   markerede `ND_other`-poster uden C's vagt for samme rang
   (`flat.c:272-276`), så `groupSize`'s kortslutning for flat-adjacent
   slugte portcmp-gruppebrud.

Med begge rettet tro mod C er familien **`conformant`** i alle tre
mapper (pr. element: knuder 0, kanter 0 afvigende), og den samme mekanisme
lukkede `42`, `clust2`, `ngk10_4` (structural-match → conformant) og flyttede
`b124` fra diverged til structural-match — alt sammen på 2-cyklus-/parallelpar.

**Begge undersøgelsessider kører den samme estimator — målingen er neutraliseret.**
Det native `dot`-orakel kører under en headless `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), som kun symlinker
plugin'erne `core` og `dot_layout` — intet tekstlayout-plugin `gd`/`pango`/`quartz`.
Når den plads er tom, falder graphviz tilbage på sin indbyggede
`estimate_textspan_size`. TypeScript-portens `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) er en tro port af den samme rutine og er
Node-standarden, fundet af `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Begge sider af enhver paritetssammenligning
måler derfor tekst med den identiske estimator** — ægte
FreeType-/pango-glyfbredder indgår aldrig i sammenligningen. Derfor peger en
domsregression her på layoutkode, ikke på en skrifttype, og derfor lukkede
rettelsen af estimatorens egne fejl (UTF-8-bytetælling, skrifttypebevidsthed i lodrette metrikker)
det meste af denne klasse helt i stedet for blot at indsnævre et skrifttypemetrikgab.

**Den injicerbare `TextMeasurer`-snitflade.** Denne neutralisering er kun mulig,
fordi tekstmåling er en bevidst snitflade og ikke hårdkodet ind i nogen af
motorerne. `TextMeasurer` er en grænseflade med én metode (`measure(text, font, size,
flags) → {w, h, …}`), som dependency-injiceres i hvert sted, der dimensionerer labels —
`polyInit`, `recordInit`, `initEdgeLabels` og `buildNodeLabel` tager hver
måleren som parameter; intet måler tekst via en global. Den fastlåses til tests/CI via
`setTextMeasurer(...)` eller `GV_TEXT_MEASURER=estimate`.
Snitfladen gør det også muligt at *bevise*, at en rest kun er måling: fodr porten med de
nøjagtige bredder, C målte (indfanget fra oraklet), og kontrollér, om layoutet
derefter reproducerer C nøjagtigt. Det eksperiment var oprindeligt det, der gav grundlag for
A2-dommen for `proc3d` (se det historiske appendiks nedenfor) — teknikken
er stadig gyldig. Dens omvendte pensionerede klassen: fordi målingen
beviseligt var neutraliseret på begge undersøgelsessider, kunne `NaN`-kantresten ikke
være en skrifttypemetrik-effekt, hvilket tvang den nye diagnose, der fandt de to
føringsfejl ovenfor.

::: details Historisk analyse (forældet 2026-06-30) — bevaret af hensyn til optegnelsen
Materialet nedenfor beskriver en tidligere tilstand af denne klasse, før
overgangen til `EstimateTextMeasurer`, skrifttypebevidste lodrette metrikker og
rettelsen af ikke-ASCII UTF-8-bytes lukkede det meste af den. Det beskriver ikke længere
den nuværende adfærd — det er kun bevaret, så ræsonnementet, der førte hertil, ikke går tabt. Navnlig:
(1) tallene for „native C“-bredde i målingstabellen nedenfor er
**FreeType**-værdier fra en rendering med ægte skrifttype; paritetsundersøgelsen
bruger aldrig den sti — begge sider kører `estimate_textspan_size` (se
ovenfor) — så tabellen afspejler ikke, hvordan paritet måles i øjeblikket; (2)
overlejringsfigurerne og golden-/vores-renderingerne nedenfor viser en **ikke-korpus**-
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt), som ikke er en del af
paritetsundersøgelsen; korpussets `proc3d`-varianter er nu conformante med nul
forskelle, så der er ingen overlejring at vise for dem; (3) fortællingen om knude-x for
`NaN`/`ratio=compress` nedenfor er forældet — den nuværende måling viser, at alle 76 knudepunkter
matcher nøjagtigt, så kæden breddefejl → knudeforskydning, som den beskriver, ikke
længere holder for `NaN`.

**`NaN` under `ratio=compress` (historisk).** Familien
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) var et
A2-tilfælde, hvis dom dengang landede på *diverged* frem for
*structural-match*. Compress-stien med x-netværkssimpleks var tro mod C — hvert
betingelsesinput matchede C (breddebetingelsens værdi, `containNodes`-minlens,
antal hjælpekanter 471/vægt 1612, `lrBalance` og alle rangrækkefølger identiske)
*bortset fra* de halve bredder for 9 knuder, som måleren rapporterede 0.5–1.03 pt
bredere end C. `ratio=compress`'s pakning med vægt 1000 gjorde de normalt slappe
venstre-til-højre-separationsbetingelser **bindende**, så den fejl i bredde under en pixel — usynlig uden compress — viste sig som en indre
x-forskydning på −3..−5 pt. Den forskydning vippede den rette `Target<->TThread`-spline 0.55 pt
forbi en knudeboksvæg, så føringen bøjede den til et ekstra bezier-stykke (7
punkter mod C's 4) — et *strukturelt* delta, derfor *diverged*. At tvinge de 9 bredder
til C's værdier reproducerede C nøjagtigt (knude-x 53/76→0/76 forkerte; spline 7→4 punkter),
hvilket bekræftede, at resten var 100% opstrøms skrifttypemetrik, ikke compress- eller
splinekoden, **for den tidligere afvigelse**. Fuld evidens (med en visuel
golden-mod-vores-sammenligning side om side + overlejringen af 4-mod-7-punkts-spline-deltaet):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (skriftlig
gennemgang: `…/nan-compress-xcoord.md`).

**Eksempel på måling af skrifttypemetrik (historisk — FreeType mod estimat).**
Native Graphviz måler, når det kører med et ægte tekstlayout-plugin (ikke det headless
orakel, paritetsundersøgelsen bruger), tekst med FreeType-/libgd-glyfbredder.
Portens `EstimateTextMeasurer` replikerer ikke en glyf-rasterizer. For de fleste strenge
er de to enige nøjagtigt; for nogle afviger de med
en brøkdel af et punkt. Målt eksempel — Times-Roman 14 pt, strengen
`"/home/ek/work/src/lefty/lefty.c"` (31 tegn):

| | bredde |
|---|---|
| native C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimat) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

Den samme knudes anden labellinje, `"93736-32246"`, blev målt **identisk**
(96.00 pt begge steder) — fejlen er strengafhængig og akkumuleres pr. glyf,
ikke en ensartet skaleringsfaktor. Dette gab mellem FreeType og estimat er reelt, men er
**ikke** det, paritetsundersøgelsen måler (begge sider kører `estimate`); det ville
kun have betydning, hvis @knowvah/dot-engines output blev sammenlignet med en C-rendering
med ægte skrifttype uden for denne undersøgelse.

**Nedstrømseffekt på den tidligere `proc3d`-afvigelse (historisk).** Labelbredde
afgør knudestørrelse, som afgør layout:

1. En bredere label → en lidt bredere knudeboks (for en *ellipse*-knude skaleres bredden
   yderligere med √2, så +0.75 pt tekst → +0.53 pt halv bredde).
2. Knudernes halve bredder fastsætter venstre-til-højre-separationsbetingelserne for
   x-koordinat-netværkssimplekset; disse betingelser afrundes med `ROUND()` til
   heltal, så en breddeændring under en pixel kan vippe en betingelse fra *N* til
   *N+1*.
3. Netværkssimplekset vælger derefter en anden — men lige så optimal —
   heltallig x-tildeling, hvilket forskyder nogle knudes x-positioner med 1–2 enheder.

For den ikke-korpus-`proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, ikke
medlem af paritetsundersøgelsen) gav det en forskel på **≤ 3.55 pt** i x-udstrækning
(**0.13%**), lagt oven på hinanden nedenfor — **grøn = native C `dot` (golden), rød =
@knowvah/dot-engine (vores)**:

![proc3d golden mod vores som overlejring: grøn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Forstørret optrådte kanten næsten udelukkende på de lange ovale
filsti-labels:

![proc3d-overlejring forstørret på de brede ovale sti-labels: grøn = C, rød = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — native `dot` | Vores — @knowvah/dot-engine |
|---|---|
| ![proc3d renderet af C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderet af @knowvah/dot-engine](/img/proc3d-ours.svg) |

Den selvstændige gennemgang (årsag, tal pr. måling, reproduktionskommando)
findes på sin egen side:
[**proc3d — den kanoniske A2-afvigelse i skrifttypemetrik (historisk)**](/da/divergences-proc3d-a2).
Den side beskriver en løst afvigelse på et ikke-korpus-input; de nuværende
korpus-`proc3d`-varianter er conformante.

**Hvorfor dette blev accepteret dengang.** At byte-matche FreeType's glyfbredder pr. glyf
på tværs af alle skrifttyper og strenge ville have krævet, at man replikerede dets
metriktabeller, hinting og afrunding — stort, skrøbeligt og stadig ikke
garanteret nøjagtigt. Tekstmåleren er en delt primitiv: hver label i
korpusset går gennem den, så en rettelse rettet mod én streng risikerede at give regression
for andre for en umærkelig gevinst.
:::

### A3. `hypot`-uafgjort i splineføring (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Berørt:** `dot`-grafer med en **geometrisk symmetrisk** kantføringskanal
— typisk en kort, symmetrisk bue for en flad kant. Observeret eksempel: `2368`,
som forbliver på *structural-match* (maxΔ ≈ 10.2 pt på **én** kant, `376->76`).
Den samme uafgjort-afgørelse optræder også på en **lang** kant (over flere rang) ind i
en hub med høj indgående grad, når korridoren er præcis spejlsymmetrisk: `graphs-b100` /
`graphs-b104` (identisk kilde) afviger med maxΔ 20 (præcis én rangrække) på
det enkelte knæk i `Node23730->Node23729` — hver knudeposition og al opstrøms
boks-/polygon-/stramt-stistruktur er byte-identisk med C; kun `findMaxDev`'s
valg på ~1 ULP af, hvilket spejlsymmetrisk indre punkt der bliver bezier-knæk,
adskiller sig. Den korte form for flad kant optræder også som `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — den afvigende søster til den orakelfastlåste `241_0`, som C's
støj i stedet beholder først-valget for. Den samme uafgjort-afgørelse giver en opdeling i en labelet 2-cyklus-
bagkant i slidskorridoren i `2413_1` (structural-match, maxΔ 67.65) og
`2413_2` (maxΔ ≤99.55, når T11 swapBezier-reverse-rettelsen lander — indtil da
domineres filens rapporterede maxΔ 1922.26 af en urelateret, separat
sporet fejl), og en enkelt labelet kant inden for en klynge i `graphs-decorate`
(maxΔ 43.54); i hvert tilfælde ligger de to kandidater til opdelingshjørne inden for
5.7e-13 (2413-familien) / 3e-14 (decorate) af hinanden, før den
positionsafhængige Apple-`hypot`-støj udpeger en vinder. `2371`
(structural-match, maxΔ 16.8) viser det samme fingeraftryk på to urelaterede
kanter (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): porten
udsender det nøjagtige kontrolpunktsekvens-spejl af oraklet på begge,
knæk-y vendt med et identisk Δ16.8 (øvre/nedre opdelingsbrøker byttet om).
Dens oprindelse er kvalificeret med **MEDIUM** konfidens frem for den
BEKRÆFTEDE konfidens for de andre medlemmer: `2371` pakker ~199 komponenter, hvilket
afkobler pathplan-lokale koordinater fra sidekoordinater, så uafgjorten
ikke kunne korreleres live til `route.ts:209` over tre instrumenteringsforsøg;
en oprindelse i straight-mode-segmentering eller post-clip `recover_slack` er
ikke fuldt udelukket. Fuld diagnose:
`plans/residual-cleanup/analysis/2371-mirror.md`. De fleste førte kanter er
upåvirkede.

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

**Karakterisering.** Splinetilpasseren (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) deler en tilpasset bezier ved det indre rutepunkt med
maksimal afvigelse. Når kanalen er symmetrisk, er de to kandidater til opdelingspunkt
en **eksakt matematisk uafgjort**, og vinderen afgøres derefter af ~1e-14
kommatalsudslettelsesstøj i en bezier-evaluering i absolutte koordinater,
hvis **fortegn afhænger af den absolutte position**.

C's afvigelsesafstand er libm `hypot`, og den macOS-Apple-`hypot`, der
genererede oraklet, er en proprietær implementering, der bit-matcher **ingen**
portabel `hypot` (målt mod den i graphviz' koordinatregime, bit-
identiske rater: V8 `Math.hypot` ≈ 63%, en korrekt afrundet / Arm-agtig `hypot`
≈ 84%, fdlibm `hypot` ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). På grund af den ULP-støj
**er C selv ikke konsistent**: den deler to *translationskongruente* buer mod
**modsatte** hjørner. Inden for `2368` er `376->76`-buen spejlbilledet af den
geometrisk identiske `256->436`-bue:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Hele deltaet, lagt oven på hinanden (12× zoom på buen `376->76` / `to1`) — **grøn = C
Graphviz, rød = @knowvah/dot-engine**. Begge er den samme lave nedadgående bue mellem de
samme knudegrænser; de afviger med ~1–2 pt ved bugen (det midterste bezier-
kontrolpunkt), hvor C's uafgjort faldt ud mod det modsatte hjørne:

![2368 376->76-bue: grøn = C, rød = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Alt andet matcher inden for tolerancen — samme afgrænsningsboks (608×148), knudepositioner,
labels, pilespidser og alle andre kanter. De fulde renderinger er visuelt
umulige at skelne:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 renderet af C Graphviz](/img/2368-c.png) | ![2368 renderet af @knowvah/dot-engine](/img/2368-port.png) |

Porten bruger en **translationsekvivariant** uafgjort-afgørelse (en ægte uafgjort løses altid
til det første indeks), så den tegner *hver* sådan bue på samme måde uanset
position — den er selvkonsistent og matcher C på de buer, hvor C's støj også
beholder først-valget (fx `256->436` og `241_0 5:ne->8:nw`), og afviger kun, hvor C's
støj vipper den anden vej (`376->76`). Endepunkter, pilespidsmål, de andre
kanter, alle knuder, labels og afgrænsningsboksen matcher inden for tolerancen; kun de
indre kontrolpunkter på den ene bue flytter sig (~1–2 pt ved bugen).

**Hvorfor accepteret.** Apples `hypot` er ikke mere reproducerbar på tværs af JS-motorer og
CPU'er end FMA/`pow` i **A1** — det er den samme portabilitetsbegrænsning, blot
i `dot`'s splinefører. At matche C's *positionsafhængige* valg ville betyde at
overtage C's strenge uafgjort-afgørelse, som ligger i en **delt primitiv**, som hver ført
kant går igennem: at gøre det bytter `376->76`-matchet for *nye* uoverensstemmelser på
de buer, hvor C lander den anden vej (det giver regression for `241_0` og et `cnt=3`-
orakeltilfælde med flad kant), et nulsumsspil, der også ofrer portens
translationsekvivarians. Derfor beholder vi den konsistente (ekvivariante) fører. Det er
en afgrænset, umærkelig `dot`-afvigelse — ikke en åben fejl. Fuld undersøgelse:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orakel i en anerkendt defekt tilstand (familien init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Berørt:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Familiens
medlemmer `1939` og `2825` er **conformante** og har ingen post, og `2470`
og `graphs-structs` sluttede sig til dem 2026-07-11 (begge kollapsede til conformant,
efter at rettelserne af ortho-adjacency-spill/chancmpid, fmadd `polylineMidpoint`
og half-even-tiebreak-afrunding landede — porten reproducerer nu oraklets
genoprettelsesoutput nøjagtigt, inklusive de identiske tabte kanter); deres
accept-poster er pensioneret.

`1581` og `2825` var nedbrudsgenoprettelsestilfælde (fix-element-count-bucket-
missionen): fuzzer-/degenererede inputs, hvor de opstrøms tests **kun** hævder,
at dot ikke går ned (`test_1581`: ingen ASan-overtrædelse; `test_2825`: intet
nedbrud, når `rebuild_vlists` returnerer -1). C rammer en intern `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`), og dens genoprettelse
kasserer layoutindhold; porten når de **identiske beslutninger om sletning af ranksæt**
(advarselsparitet verificeret: de samme knude-/grafnavne i
`mark_clusters`' „already in a rankset“-advarsler, cluster.c:317-320).

`2825` er nu helt lukket. Missionen fix-2825-rebuild-vlists (efter 1581)
lukkede først gabet ét lag: porten når C's *nøjagtige* interne fejltilstand
— byte-identisk stderr inklusive meddelelsesrækkefølge
(`Error: rebuild_vlists: lead is null for rank 1` og derefter den upræfikserede
`agerr(AGPREV, ...)`-fortsættelse `concentrate=true may not work
correctly.`) — idet `dotLayoutPipeline` korrekt propagerer
`dot_position`'s fejl for at springe `dot_splines`/`dotneato_postprocess` over,
svarende til C's `dotLayout` (`if (r != 0) return r;` efter `dot_position`,
dotinit.c:322-325). En opfølgning (del 2) lukkede derefter det resterende
gab i render-laget: C's `emit_node` portstyrer hver knude med `node_in_box(n,
job->clip)` (emit.c:1806-1809), og på denne afbrydelsessti er `job->clip`
degenereret, fordi `GD_bb` aldrig blev sat af `set_aspect` (inde i den
oversprungne `dot_position`-hale) — så C udsender *nul* knuder, kun de (også
degenererede) klyngerammer. Porten portede den samme `node_in_box`-port
(`src/gvc/device.ts:renderNode`, med `job.bb`/`job.pad` som
enkeltside-ækvivalenten til `job->clip`) og holdt op med at genberegne en
plausibel bbox ud fra levende knudepositioner, når `g.info.bb` er usat
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` ordret, svarende til
`init_gvc`'s `gvc->bb = GD_bb(g)`, emit.c:3272) — hver layoutmotor
sætter allerede selv `g.info.bb`, før `render()` kører på enhver ikke-afbrydelsessti, så
dette er byte-identisk på sunde grafer og ændrer kun output
på denne afbrydelsessti. `2825` er nu `conformant` (output med 4 elementer,
byte-identisk med oraklet). Se
`.agent-notes/2825-rebuild-vlists-abort.md` for det fulde mekanismespor
for begge dele. `1581` når slet aldrig den inkonsistente tilstand (en
*anden* opstrøms fejl i klyngevinduet, ikke `rebuild_vlists`), så den
lægger sin overlevende graf ud i sin helhed — det gab er stadig åbent. Oraklets output
for `1581` er genoprettelsesaffald uden opstrøms-defineret semantik. Evidens:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). På
hvert af disse inputs er det **C-oraklet**, der er defekt, efter
graphviz' egen vurdering: `2471`, `1939` og `1435` er
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
opstrøms (issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), jf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); det eneste
rettelsesforsøg, [kladde-MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
er stadig en ikke-flettet kladde (sidst redigeret 2026-03-20). `graphs-structs` er
den gamle klasse med tab af record-føring (#102/#242/#274/#1323), som stabil
graphviz 15.0.0 renderer korrekt — en regression i et dev-build-orakel.

**Hvad C gør.** På `init_rank`-medlemmerne (`2796`, `2471`, `1939`) lukker
native dot's x-koordinat-hjælpegraf en rettet cyklus gennem
klyngevægbetingelseskanter; dens
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
kan ikke scanne hver knude, udskriver `Error: trouble in init_rank`, og
layoutet fortsætter fra den genoprettelsestilstand — på `2471`/`2796` med slutning i
`Pshortestpath`-trianguleringsaffald og tabte kanter. På `1435` og
`graphs-structs` er det pathplan selv, der er det ødelagte trin (blindgyder i
ear-clip-triangulering; en tabt record-port-kant).

**Inputs verificeret og derefter gjort tro (dette er den bærende del).**
Missionen `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
dumpede den betingelsesgraf, som begge sider fodrer netværkssimplekset, linje for linje,
for hvert familiemedlem — og fandt, at portens tidligere „rene“ adfærd på
denne familie skyldtes **fire ægte portfejl**, alle rettet:

1. `flatEdges` sprang C's
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)-
   kald over, så klyngers rangvinduer blev forældede efter indsættelse af vnoder for flade labels
   (alene dette fik porten til at miste **9** kanter på `2471`, hvor C
   mister 6).
2. Straffen for kanter i samme `group` blev udløst på selvløkker i stedet for
   på endepunkter i samme ikke-tomme gruppe
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` brugte C's `_WIN32`-værdi 100; orakelplatformen bruger 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. En blindgyde i triangulering afbrød `Pshortestpath` i stedet for C's
   advar-og-fortsæt + reserveløsning med ret linje
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Efter rettelsen er familiens NS-betingelsesdumps **linjeidentiske** med C
(253 rank2-kald på `2471`; alle kald på `1939`/`1435`/`graphs-structs`),
og porten følger C gennem den anerkendt ødelagte genoprettelse: samme
tabte kanter (`3->16` på 2796; de identiske 6 på 2471), samme elementtræer.
`1939` blev fuldt conformant. De resterende numeriske deltaer (og 1435's
afvigende pathplan-affald) er adfærd *inde i* genoprettelsestilstanden, som
projektets politik bevidst ikke jager.

**`2723` (segfault; fastlåst, ikke jagtet).** Native `dot` segfaulter (exit 139)
på `tests/2723.dot` (urettet, `rank=same`-grupper, labelede kanter), så C har
intet output at matche. Opstrøms
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) er åbent, og
`tests/test_regression.py:test_2723` er `xfail`. Porten kaster
`InternalError` (`INTERNAL_ERROR`, med en `TypeError`-årsag fra
`src/layout/dot/flat.ts:flatLabelYpos`, hvor `rank[r-1]` er undefined). Uden
korrekt orakel står den ærlige fejl ved magt, og porten ændres ikke;
`src/layout/dot/flat-2723.test.ts` fastlåser den. Opdatér den test, hvis opstrøms retter
problemet.

**Note om politik.** Den tidligere A4-holdning („porten opfylder issuets
forventninger; undlad at replikere“) byggede på den antagelse, at portens
acykliske hjælpegraf stammede fra en harmløs lokal variant. Det gjorde den ikke — den
stammede fra fejl (1), som påviseligt fejlplacerede `2471`. Troskab mod C-
kildekoden vandt: porten reproducerer nu C's anerkendt ødelagte udfald ud fra
verificeret identiske inputs, og hver post her bør **måles igen,
når opstrøms retter det tilsvarende issue** (oraklets output vil
ændre sig; forvent, at disse id'er lyser op som regressioner ved den opgradering — det
er tilsigtet, ikke råd).

**Evidens.** Sammenligningssider pr. id (renderinger side om side + evidens-
optegnelser):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(baseline før rettelsen bevaret i
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnoseartefakter: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ugyldige inputbytes (kodningsrepræsentation) {#a5-invalid-input-bytes-encoding-representation}

**Berørt:** `1367` (diverged, maxΔ 0 — præcis én strukturel forskel).

**Hvad der afviger.** Inputfilen indeholder en nøgen UTF-8-hale-byte (`0x80`)
inde i et knudenavn. C behandler nøgne halebytes 0x80–0xBF som „gyldige
tegn, der repræsenterer sig selv“ (`lib/common/utils.c:1200-1207`, ingen
advarsel), og `<title>`-teksten for knudenavne omgår tegnsætkonvertering helt
(`agnameof`-bytes flyder direkte til `gvputs_xml`). Orakel-SVG'en indeholder derfor
den rå byte og er **ikke gyldig UTF-8** trods sin erklærede
kodning. Porten afkoder input med ugyldig UTF-8 med latin1-reserveløsningen
(`0x80 → U+0080`) og udsender velformet UTF-8 (`\xc2\x80`).

**Hvorfor accepteret.** Portens I/O-grænse er JS-strenge (browserbibliotek).
En rå ugyldig byte kan ikke rundturstransporteres gennem `renderSvg`'s strengreturværdi;
at byte-matche C ville betyde at ødelægge outputkodningen for alle
forbrugere. Latin1-reserveløsningen afspejler C's egen „behandlet som Latin-1“-genoprettelses-
semantik (`utils.c:1249`). Det er en begrænsning under koden —
repræsentationslaget — ikke en portabel adfærd, vi har fravalgt at porte.
Alt andet i 1367 er conformant: elementantal (23 polyline /
103 text / 44 polygon / 24 path) og alle koordinater matcher efter
decorate-rettelsen (T6).

**Evidens.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
sammenligningsside (rendering side om side + evidensoptegnelse).

---

### A6. Overløb af lærredet i `unsigned int` ved degenereret input {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Berørt:** `1314` — et fuzzer-afledt input (`fontsize="991836031967s8"`),
hvis absurde skriftstørrelse puster tegningen op til ~2.75e11 pt.

**Hvad der sker.** C gemmer `job->width` / `job->height` som **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` af den enorme punktstørrelse (`emit.c:1249-1250`)
løber over i 32 bit og ombrydes mod 2³², og SVG-backenden udsender den gennem et
**fortegnsbehæftet** `%d` (`gvrender_core_svg.c:258-259`) — så C udskriver
`height="-425618343"`. Porten beholder den matematisk konsistente (uomsluttede)
værdi. Alle andre værdier — knudeellipsens `cx/cy/rx/ry`, rodens `translate`,
polygonen, tekstens `font-size` — er byte-identiske; kun den øverste `<svg>`'s
width/height afviger.

**Hvorfor vi ikke jager det.** At replikere C's 32-bit heltalsoverløb er ikke en
layoutadfærd, der er værd at porte, og inputtet er degenereret. Tag det op igen, hvis opstrøms
retter overløbet (fx ved at udvide feltet eller begrænse størrelsen).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenereret NaN-layout (`sfdp`, patologisk `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Berørt:** `2556` — `repulsiveforce=100` (⇒ den frastødende kraft bruger
`pow(dist, 101)`), som driver fjeder-elektrisk-solveren til **NaN i begge
motorer**. Selve det native orakel udsender kun `nan`-positioner for knuder/kanter og en
degenereret afgrænsningsboks.

**Hvad der sker.** Når hver koordinat er NaN, serialiserer de to implementeringer
affaldet forskelligt: (1) grafens bb / baggrundspolygon — C runder `NaN`
til `int`, hvilket på arm64 giver affald i størrelsesordenen `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); porten beholder `0`. (2) Draw-ops for kanter — natives emit-pas
undertrykker `_draw_`/`_hdraw_` for en NaN-spline (udsender kun `pos`),
mens porten udsender dem med NaN-kontrolpunkter. Knudetegninger matcher (begge
undertrykker dem). Intet reelt layout findes på nogen af siderne.

**Hvorfor vi ikke jager det.** Porten reproducerer allerede den *samme* NaN-opblæsning som
native — rettelsen, der bragte den dertil, er ægte (se nedenfor); det, der er tilbage, er kun,
hvordan hver serialiserer NaN-affald. At replikere C's `(int)NaN`-udefinerede adfærd
og dens undertrykkelse af tegning af NaN-splines er ikke meningsfuld layouttroskab på et input,
hvis layout er degenereret i begge motorer. Tag det op igen, hvis opstrøms begrænser
`repulsiveforce` eller renser NaN-positioner.

**Portrettelser, der gjorde dette nåeligt (ikke bortjagede — ægte fejl).** Før
disse kunne porten end ikke nå den degenererede tilstand: (1) `armPow`
(`src/common/arm-pow.ts`) kastede ved ethvert argument uden for hurtigstien; den porterer nu ARM
`pow.c`'s fulde specialtilfældegren, så `pow(NaN, y) = NaN` ligesom i libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) løb i det uendelige på NaN-kontrolpunkter,
fordi dens konvergenstest var den naive negation af C's `while (ABS > .5)`
(ækvivalent for endelige værdier, ikke for NaN); den afspejler nu C nøjagtigt og
terminerer på NaN. Begge er C-tro og påvirker kun NaN-inputs.

---

### A7. Afrundingsgrænse for boksvæg ved `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Berørt:** `graphs-honda-tokoro` og (tilføjet 2026-07-28, nyt i de 905
elementer) dens søster i `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(begge structural-match, maxΔ ≈ 1 pt på den enkelte kant `n012->n011`).
Søsteren afviger kun i `samearrowhead`-attributter, som ikke rører dette pars
føring — dens `n012->n011`-geometri er byte-identisk med det accepterede id på
både port- og orakelsiden, så mekanismen nedenfor overføres ordret.

**Hvad der afviger.** `maximal_bbox`'s boksvæg i hovedkorridoren lander ved intern
x=90 i C mod x=89 i porten for den delte `samehead`-port for de to
parallelle `n012->n011`. Konstruktionen af den delte port (`buildSharedPort`) og
den parallelle gruppering er begge byte-conformante med C; forskellen på 1 px er udelukkende
en `round()`-afrundingsgrænsekunstighed — ~1e-14 opstrøms kommatalsstøj
vipper en værdi, der ligger præcis på en `.5`-grænse, over på det nabo-heltal. Portens
`maximal_bbox`-formel afspejler allerede C's nøjagtigt.

**Hvorfor vi ikke jager det.** `round()` er en primitiv, som hver ført kant i
korpusset går igennem; at justere dens grænseadfærd for at matche dette ene tilfælde er en
regressionsrisiko for hele korpusset for 1 px på 2 kanter — den samme begrænsning for delt primitiv
som afrundingen af kontrolskroget, der er nævnt i
`bbox-class-control-hull-vs-curve`. Fuld diagnose:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-afrunding mod streng IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klasse.** clang arm64 kompilerer orakelbinæren med `-ffp-contract=on`,
hvilket smelter udvalgte multiplicer-addér-sekvenser sammen til enkelte FMA-instruktioner;
porten kører på V8, som udfører streng IEEE-754-afrunding og ikke kan udsende
`fma`. På bit-identiske inputs er de to uenige med 1-2 ULP i det udtryk,
som kompileren valgte at kontrahere. Portsiden er altid det
strengt-IEEE-754-resultat; oraklesiden er altid det FMA-kontraherede
resultat. Det er en portabilitetsbegrænsning i kompiler/kørselsmiljø under C-
kildekodens semantik, ikke en logikfejl i porten — uløselig uden at
emulere clangs specifikke kontraktionsvalg i software. To tilfælde
kendes, på to forskellige steder, med to forskellige forstærkningsmekanismer:

- **2646** — ULP'en opstår inde i `Proutespline`'s kubiske løsning
  med `points2coeff`/`solve3` og vipper direkte et rodantal i splinetilpasseren.
- **2620** — ULP'en opstår i `poly_init`'s løkke for polygonhjørneudstrækning
  (knudedimensionering) og forstærkes nedstrøms af `ortho`'s trofaste heltalsafkortning
  pr. relax til en uafgjort-vipning mellem lige dyre labyrintkorridorer.

**Berørt:** `2646` (structural-match, maxΔ 42.09 på 3 af 21.216 kanter:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — alle
record-port-`:c->:nb_part`-lange smode-kantføringer). Søster til **A3**: begge
klasser er uløselige kommatalsportabilitets-uafgjorte inde i
`Proutespline`, men mekanismen er forskellig — en kompiler-`fp-contract`-
artefakt, ikke libm `hypot`.

**Hvad der afviger.** På alle tre kanter afviger kun det sidste `routesplines`-kald (et
lige ben ind i hovedporten). Dets endepunkt ligger bit-nøjagtigt på
barrierepolygonens bundvæg med sin tangent parallel med den væg
(`evs[1]=(1,-1.22e-16)`), så hver `splinefits`-kandidat er tangent til
barrieren ved `t=1` — en næsten dobbelt rod i skæringskubikken.
`points2coeff` beregner den kubik gennem katastrofal udslettelse (led
omkring ~7446, der kollapser til ~0.099). Oraklet (clang/arm64,
`-ffp-contract=on`) kontraherer `v3 + 3*v1 - (v0 + 3*v2)` til fused
multiply-adds, mens V8 udfører streng IEEE-afrunding — de to er uenige med
~9.1e-13 på **bit-identiske inputs**, og den støj vipper fortegnet på
`solve3`'s diskriminant: C finder 1 rod (866.7, inden for segmentet); porten
finder 3 rødder med en falsk partnerrod ved `t=0.9999975 < 1-EPSILON2`. Den
falske rod udløser én ekstra `a`-halveringsiteration, som vender
det sidste stykkes tangentstørrelse med en faktor 2 (i begge retninger over
de 3 kanter), hvilket giver maxΔ 42.09 efter clip (26 SVG-forskelle).

**Hvorfor accepteret (uløseligheden bevist ved et kontrolleret eksperiment).** Alle seks
`routesplines`-kald blev dumpet på begge sider — boks, polygon, `PL`, start,
slut og `evs` er byte-identiske, ligesom det tidligere (ikke-sidste) kalds
outputspline; den eneste afvigelse er inde i det sidste kalds `solve3`. En
selvstændig harness i uberørt C isolerede den ene variabel: kompilering med
`-ffp-contract=off` reproducerer **porten** bit-nøjagtigt på alle 3 kanter; den
standard (`on`) kontraktion reproducerer **oraklet** bit-nøjagtigt på alle 3
kanter. Porten stemmer derfor allerede med streng-IEEE-754-C; afvigelsen
er helt og holdent orakelkompilerens valg af FMA-kontraktion, under C-
kildekodens semantik — der er ingen troskabsfejl på kildeniveau at rette. En
målrettet rettelse (håndemulering af kontraktionen i `points2coeff`) blev prøvet og
afkræftet: den retter 2 af de 3 kanter, men ikke den tredje, hvis vip
stammer fra `solve3`'s egen interne kontraktion. En fuldstændig rettelse ville
kræve software-FMA-emulering gennem hele splinetilpasseren — en pris i den varme løkke
med afrundingssprængradius på tværs af korpusset for en gevinst under en pixel på 3 kanter.
Fuld diagnose: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Berørt (historisk):** `2620` (var structural-match, maxΔ 585; 423 forskelle
på 24 kantstier + 22 pilespidser). **Kollapsede til conformant 2026-07-11**:
den trofaste port af `sgraph`-adjacensbufferens spill + `chancmpid`'s tovejs-
indeslutning (se `.agent-notes/ortho-maze-circo-rca.md`) fjernede
afvigelsen; accept-posten er pensioneret, og dette afsnit bevares som
dokumentation af A8-klassen.

**Hvad der afviger.** `ortho`-pipelinen (`splines=ortho`) er byte-conformant
med C givet identiske inputs — bevist ved at injicere C's nøjagtige labyrintinput
(koordinater, `xsize`/`ysize`) i portens ortho-trin: 378/378 førte
segmenter kommer ud byte-identiske, så intet i `src/ortho` er skyld i det.
Den egentlige afvigelse er 1-2 ULP i labyrintens *input*: knudens `ysize` (og, ved
akkumulering inden for rang, `ND_coord.y`) beregnet i C's `poly_init`-
løkke for polygonhjørneudstrækning (`shapes.c`), som under
`-ffp-contract=on` smelter `R.x += sidelength*cosx` sammen til en FMA, der er ~1
ULP større end portens strenge IEEE-aritmetik (begge sider implementerer det
aritmetisk identiske udtryk). `2620` har 173 polygonknuder med brøkbredde;
alle viser C ≥ port med 1-2 ULP. Den ULP forstærkes — ikke
introduceres — af `ortho`'s Dijkstra-relax, som trofast afkorter sin
løbende afstand pr. trin (`sgraph.c:165`, afspejlet af porten som
`Math.trunc`) over vægte afledt af rå celleudstrækninger
(`maze.c:257`). Den ULP-forskudte geometri vipper en uafgjort mellem lige dyre korridorer
for 4 førte kanter (stier + deres pilespidser); de resterende forskelle er
følgevirkninger af ±1-sporomnummerering fra de 4 vip.

**Hvorfor accepteret (uløselighed bevist ved et kontrolleret eksperiment).** En
selvstændig C-harness, der kun varierede `-ffp-contract`, reproducerede begge sider
på det afvigende sekskanthjørne: `-ffp-contract=on` → `310.29250168188713`
(matcher oraklet), `-ffp-contract=off` → `310.29250168188707` (matcher
porten), med den afvigende operation isoleret til hjørne `i=3`
(`R.x=-0.50000000000000011` fusioneret mod `-0.5` ufusioneret). Et andet
input-injektionseksperiment (eneste variabel: ortho-inputværdier) bekræftede
forstærkeren: at fodre portens egen `orthoEdges` med C's nøjagtige
`coord`/`xsize`/`ysize` kollapser alle 4 korridorafvigelser til 0 — ortho-
koden har ingen fejl, den er bare følsom (som C's egen labyrintomkostningsføring)
over for et skift på 1-2 ULP i sit input. At matche ville betyde at emulere
clangs specifikke FMA-kontraktion af ét kompileret udtrykstræ i
`poly_init` — at jagte en kompileret artefakt, ikke at porte kildesemantik.
Fuld diagnose: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emuleret undtagelse (ikke accepteret): `triang.c:ccw`.** Ét kontraktionssted
ER reproduceret bit for bit i stedet for accepteret: pathplans `ccw`
kompileres til `fnmul`+`fmadd` (eksakt første produkt − afrundet andet), så et
forespørgselspunkt, der er bit-lig med et segmentendepunkt, tester ISCW/ISCCW i stedet for
ISON. `shortest.c:pointintri` afviser derefter polygonhjørne-endepunkter
(„destination point not in any triangle“), og `makeMultiSpline` falder tilbage
på almindelig føring for hver sammensmeltet 2-cyklus — en stor, diskret,
adfærd på tværs af hele korpusset, som porten må matche. I modsætning til stederne
`solve3`/`poly_init` ovenfor (dybt inde i kompilerede udtrykstræer, rettelse afkræftet) er `ccw`
en enkelt selvstændig kompileret funktion med ren semantik, så
`src/pathplan/triang.ts` emulerer den: en hurtig sti med almindelige double med en
konservativ fejlgrænse, hvor almindelige og fusionerede fortegn beviseligt stemmer overens, og
en eksakt Dekker-produkt- + dyadisk-BigInt-sti til de næsten-nul-tilfælde.

---

### A9. libm-trigonometri på 1 ULP → vip i CDT's cocirkulære uafgjort (`circo`/`twopi`-multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klasse.** V8's `Math.sin`/`Math.cos` er ikke bit-identiske med Apple libm's
`sin`/`cos` (bevist: uenighed på 1 ULP ved `2π·4.5/8`, en af de otte
ellipseforhindringers hjørnevinkler). `makeObstacle`'s omskrevne 8-kants-hjørner
arver den ULP, så trekantføringens inputkoordinater afviger fra
oraklets med ≤6e-14. Symmetriske layouts (lige store knuder på en rang/ring) gør
førerens firkanter **præcis cocirkulære** i reel aritmetik, så det eksakte
incircle-prædikat sidder på en knivsæg: input-ULP'en vipper dets fortegn,
den begrænsede Delaunay-diagonal vipper, og den korridorpolygon, der fejler
`Pshortestpath` i oraklet („destination point not in any triangle“ →
reserveløsning med almindelig spline), lykkes i porten (eller omvendt). De resulterende
splines afviger med ~0.2–0.5pt. Søster til **A3**/**A8**: en uløselig
kommatalsportabilitetsbegrænsning under C-kildesemantik — at matche
ville kræve at gengive Apple libm's nøjagtige `sin`/`cos`-afrunding i JS.

**Berørt:** `241_0` (circo Δ≈0.2 / twopi-lærred Δ≈9 via korridorvippet
på kanten `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 afvigelser i label-position pr. stk. — libm-1-ULP'en opstår i
`poly_init`'s trigonometri for enhedshjørner (`hypot`/`atan2`/`sin`), lægger én knudes
beregnede højde en ULP forbi minimumsstørrelsesbegrænsningen, som oraklet lander på
nøjagtigt, og kaskaderer gennem `floor()` i xlabel-R-træets indlæsning til ét
vip af labelkandidat. En rettelse med korrekt afrundet hypot blev prøvet og
AFKRÆFTET: den rettede `2343`, men gav regression for `2168_3`, hvis ottekantdimensionering
går gennem det samme kald, hvor oraklets værdi IKKE er den korrekt
afrundede — ingen deterministisk hypot-politik matcher oraklet på begge).
`2168_1` hørte oprindeligt til i denne klasse, men blev
conformant, da porten emulerede oraklets fp-kontraherede `ccw`
(pathplan `triang.ts`): dens korridorfejl styres af den FMA'ede
afvisning af `pointintri`-hjørneendepunkter, som porten nu reproducerer
bit for bit, så CDT-diagonalens ULP-uafgjort ikke længere dukker op dér.

**Hvorfor accepteret (uløselighed bevist ved et kontrolleret eksperiment).** Selve
CDT'en er frikendt: portens `mkSurface` er en tro port af GTS
0.7.6's inkrementelle indsættelse (`cdt.c`: 1→3-opdeling + rekursiv
`swap_if_in_circle`, begrænsningskanter oprettet på forhånd og ubyttelige,
`remove_intersected_*` + `triangulate_polygon` til håndhævelse af begrænsninger), og
en selvstændig C-harness, der linker det **rigtige GTS-bibliotek** og fodres med portens
bit-nøjagtige førerinputs, reproducerer portens triangulering flade for flade
(2168_1: 22/22; 241_0: 185/185). Eksakt rationel evaluering af incircle-
determinanten på de to inputsæt bekræfter fortegnsvippet (+1 med
portens inputs, −1 med oraklets). Den resterende variabel — forskellen på 1 ULP
i trigonometri — blev isoleret ved direkte at sammenligne bitmønstre for `Math.sin`/`sin`.

**Accept på motorsporet (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **xdot-motorsporene** for twopi/circo
(`parity-twopi.json` / `parity-circo.json`, native `dot -K <engine>
-Txdot`-orakel, `test/corpus/engine-walk.ts`, semantisk draw-op-sammenligning ved
±0.01 — se `test/golden/compare-xdot.ts`) afdækker den samme mekanisme
uafhængigt af den dot-motor-SVG-undersøgelse, der er nævnt ovenfor: twopi `2239` (1
draw-op-forskel — vippet i tekstposition for `_ldraw_`-kantlabelen, den samme
`poly_init`-enhedshjørne-trigonometri-ULP, der kaskaderer gennem `floor()`-xlabel-
R-træ-kæden; `2343`, `share-b29` og `windows-b29`, oprindeligt accepteret
under denne post, blev *rettet* 2026-07-11 ved den trofaste fmadd-kontraktion i
`polylineMidpoint` — se afsnittet om b29-familien nedenfor) og circo `241_0` (41
draw-op-forskelle, Δ≈0.2pt på kanten `1->2`'s førte bezier — det samme
CDT-diagonal-korridorvip; beslutningsjournal, 2026-07-10, indlægget „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Accepteret på motorsporniveau via
`test/corpus/accepted-divergences-engines.json`, forbundet i
`PARITY-twopi.md`/`PARITY-circo.md` af `parity-report.ts` — den samme forbindelse, som
`accepted.ts` udfører for dot-sporets `PARITY-dot.md`.

**circo `2475_2` — cocirkulær `hypot`-uafgjort for closestNode.** I én komponent med 28 knuder i
denne graf med 10762 knuder vælger circos `getRotation`
(`circpos.c:73-92`) blokknuden, der er tættest på layoutets origo, via
`hypot` for at afgøre underblokkens rotation. To cocirkulære knuder er
reelt lige langt væk; V8's korrekt afrundede `Math.hypot` og Apple
libm's `hypot` runder den afstand 2 ULP forskelligt, hvilket vipper det strenge `<`,
vælger en anden knude og roterer/spejler underblokken ~20° (18 knuder
flytter sig, maks. 296.7pt; de øvrige 10744 knuder er bit-identiske, ligesom
bloktræet, cirkelrækkefølgen og hver `centerAngle`). CR-hypot-politikken var
allerede afkræftet for denne klasse (2026-07-10). Selvstændig repro:
`.agent-notes/circo-2475-590-repro.dot`; fuld RCA:
`.agent-notes/circo-b81-2475-rca.md` (accepteret 2026-07-11).

**twopi `2470` — radial-koordinat-ULP forstærket af xlabel-R-træet.**
2470 er en graf med 140 kanter, hvis HTML-`<table>`-kantlabels klynger sig om
næsten sammenfaldende radiale ankre. I neato-familien placeres kantlabels
som eksterne labels af den grådige xlabel-placerer (`label/xlabels.c`),
som vælger det mindst overlappende kandidathjørne via et Hilbert-ordnet R-træ.
Portens splines og knudekoordinater matcher oraklet til emissionspræcision
(nul forskelle i spline/knude/bbox selv ved 1e-7), men én knudes radiale
`ND_coord.y` afviger med ~2 ULP (Apple libm `sin`/`cos` mod V8 `Math`) — langt
under overensstemmelseskravet, men den ligger på tværs af grænsen `floor(pos.y − sz.y/2)`
ved præcis 0 i `objplpmks`, så det objekts R-træ-rektangel vippes med
én enhed. Ændringen i Hilbert-rækkefølge/trægruppering får `RTreeSearch` til at beskære
en anden gren, så ~140 labels hver især knipser til det nabokandidathjørne
(hver forskel et fast trin på (+bredde, −linjehøjde)). Placereren, objekt-
rækkefølgen, rektangelafrundingen, `CombineRect` (som trofast afspejler C's min-min-
særhed) og Hilbert-nøglen i int32 blev hver verificeret trofaste; afvigelsen
er den opstrøms radiale trigonometri-ULP, uløselig af samme grund
som twopi `1855`. Accepteret 2026-07-11; fuld RCA:
`.agent-notes/twopi-2470-rca.md` (som også dokumenterer, at id'ets
„bestået“ om morgenen var en artefakt af en forældet orakelbinær, ikke en
portregression).

**osage `1855` — udtværing af fp-contract i forhindringshjørner.** Adskilt fra twopi-
`1855`'s radiale spejlpost ovenfor: under osage er knudecentrene bit-nøjagtige
med oraklet, og de 110 draw-op-forskelle er tre forhindringsførte kanter,
placeret på spejlsiden af en knuderække (X bit-nøjagtig, Y spejlet). Ottekantforhindringens hjørner fra
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) afviger
fra C med 3–4 ULP, fordi clangs `-ffp-contract=on` smelter `a·b±c`-
kæderne i `ellipse_tangent_slope`/`line_intersection` sammen til FMA'er med enkelt afrunding,
mens V8 runder hver operation: C's fusionerede afrunding kollapser en rendekolonne
af hjørne-x-værdier til ét bit-identisk double (præcis kollineær),
portens splitter den i to værdier 1 ULP fra hinanden. Det vipper synlighedens
`clear()`-tangenstest — renden er ikke længere blokeret — og tilføjer ~20
synlighedskanter, og Dijkstra afgør op/ned-homotopiuafgjorten til
spejlsiden. Kontrolleret eksperiment: at injicere C's nøjagtige forhindringskoordinater
i den ellers urørte port giver **nul** afvigende
kanter, hvilket frikender kæden af lovlig arrangering, synlighed, Dijkstra og spline
fuldstændigt; at injicere C's libm `cos`/`sin` alene er en no-op. Accepteret
2026-07-11; fuld RCA: `.agent-notes/osage-spline-family-rca.md`.

**b29-familien (twopi).** De fire b29-varianter deler én knivsæg:
`EqmtTyp`-kantlabelen (`Node14732->Node14731`) sidder på en eksakt uafgjort ved
placeLabels' valg af side, hvis udfald afhænger af 1-ULP-drift i twopi-layoutet i de
omgivende objekter. Med den trofaste fmadd-kontraktion i
`polylineMidpoint` (rettelsen for states-familien, 2026-07-11) er portens labelanker
bit-identisk med oraklets, men uafgjorten løses alligevel modsat på
to af de fire varianter (`graphs-b29`, `linux.i386-b29`), mens de to andre
(`share-b29`, `windows-b29`) nu er conformante — og `2343`'s accepterede A9-
labelforskel forsvandt helt. Grænse: 1 draw-op, Δ12pt label-y. Uløselig
uden at fjerne den opstrøms drift. Fuld RCA:
`.agent-notes/twopi-states-rca.md`.

Den samme knivsæg i placeLabels optræder på **osage**-sporet (accepteret
2026-07-11, fuld RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` og `share-b29` (2 draw-op-forskelle hver — én kantlabels
x-anker lander på 878.28 mod 841.06, placeret symmetrisk om det
bit-identiske splinemidtpunkt 859.67, dvs. ±halvdelen af labelbredden; de to
varianter spejler hinanden) og `1652` (2 draw-op-forskelle — to kanter vipper hver
et labelanker om et identisk midtpunkt, én i x og én i y,
med bit-identiske splines og pilespidser; oraklet renderer fuldstændigt,
så dette er ikke den kendte native timeout-flake). I alle tilfælde er kantgeometrien
bit-nøjagtig, og kun uafgjorten i valg af labelside løses
modsat i omgivelser med 1-ULP-drift.

Osage-sporet har `polypoly`-tripletten (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; accepteret 2026-07-11, fuld RCA i
`.agent-notes/patchwork-tail-rca.md`): den eneste afvigende operation er
den nøgne transcendente `cos(π+θ)` ved et orientering-180-hjørne i en forvrænget firkant —
V8's `Math.cos` er korrekt afrundet, mens Apple libm's `cos` har en
argumentafhængig fejl på ±1 ULP (så kun under libm er `|cos(π+θ)| ≠
|cos(θ)|`); deltaet på 1 ULP i knudestørrelse fodres ind i packs `GRID`/`ceil`, vipper en
omkredsuafgjort, og qsort placerer to komponenter i hinandens pakkeceller —
et stift ombytning af hele knuder uden form- eller føringsfejl. Ingen
deterministisk omskrivning kan reproducere en ikke-korrekt-afrundet libm-
transcendental, den klassiske A9-form.

Den samme mekanisme blev bekræftet 2026-07-28 på den større søster
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, ny i de
905 elementer; 112 draw-op-forskelle, kun osage). Den afvigende operation
er det identiske sted for knude `9004`'s `cos(π+θ)` på 1 ULP — C's og portens `bb.x`-
værdier matcher den oprindelige RCA byte for byte — men på dette input med 76 knuder
løber udbredelsen i stedet gennem osages `arrayRects`: `acmpf` sorterer pakkeceller
efter den rå sum `width+height`, og libm's bredde, der er 1 ULP for høj, får
`9004` til at sortere strengt foran sine roterede søskende `9000/9002/9006`, mens
V8's korrekt afrundede værdi efterlader en eksakt uafgjort mellem 4, som den ustabile
qsort ordner anderledes — andre rækkemajor-celler, en ombytning af `9002`/`9006`
og en `fmax`-kaskade i kolonnebredde, der forskyder 8 naboer i x.
At fodre portens egen `arrayRects` med C's knudestørrelser mod portens knudestørrelser
reproducerer de 10 flyttede knuder fra kørslen med byte-matchende x-deltaer
og lukker dermed den kausale kæde.

To yderligere tilfælde på motorsporene blev årsagsanalyseret og accepteret 2026-07-11
(fuld RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 draw-op-
forskelle — søsteren til circo-posten ovenfor: den samme cocirkulære CDT-
incircle-uafgjort, vippet af libm `sin`/`cos` på 1 ULP, får portens
multispline-korridor til at lykkes med en spline på 14 punkter, hvor det native build
falder tilbage på almindelig føring med 8 punkter; punktdeltaer < 0.07pt) og circo
`windows-tree` (10 draw-op-forskelle på én viftekant — circos placeringstrigonometri
lander `node2.y` præcis én ULP over `node8.y` omkring den præcist symmetriske
værdi 18.0, og `closestSide`'s valg af dyna-hovedport vipper TOP/BOTTOM ved
den præcise uafgjort; knudepositioner og bokse er ellers bit-identiske med
oraklet).

**sfdp-motorsporet — FP-uafgjorte på kanter (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Sfdp's xdot-motorspor (`parity-sfdp.json`,
native `dot -Ksfdp -Txdot`, ±0.5) afdækker den cocirkulære CDT-incircle-uafgjort, når
eksakte native positioner før føring injiceres (så afvigelsen er IKKE
iterativ drift — se A1-drift-klassen — men en diskret prædikatuafgjort):

- `42` og `241_0` — cocirkulær CDT-incircle-uafgjort (multispline-korridoren).
  Med injicerede positioner er resten et **vip i segmentantal**: `42`
  `opCount 5 vs 9` (kant 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (kant 3->2) — portens begrænsede Delaunay-diagonal vipper i forhold til
  oraklet, så multispline-korridoren lykkes med en N-punkts spline, hvor det
  native build falder tilbage på en kortere almindelig rute (eller omvendt), præcis som
  posten for twopi/circo `241_0` ovenfor. Porten emulerer allerede arm64-
  `fmadd`-kontraktionen i prædikatet incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) og bruger robust-incircle-Delaunay; resten er
  1-ULP-forskellen mellem V8 og Apple libm i `sin`/`hypot` i prædikatinputtet, som ingen portabel
  kode reproducerer.

> **`2095` omklassificeret A9 → A1-drift (2026-07-22).** Det blev tidligere anført
> her som „hypot-søsteren“ (drift under 0.7pt på kanterne af en knude med tomt navn
> `""->"4"`). Den rest var en **harness-artefakt**: attributionsinjektorens
> `GVTS_POS`-regex krævede ≥1 navnetegn, så knuden med navnet `""` aldrig
> blev injiceret og trak sine to tilstødende kanter med. Med injektoren rettet til at matche
> tomme navne (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`) injicerer sfdp `2095`
> til **0 rest** — ren kraftdrift, dækket af den beregnede A1-drift-
> klasse, ikke en FP-uafgjort i føringen. Dens accept pr. id blev fjernet fra
> `accepted-divergences-engines.json`. (Samme fund som fdp `2095` nedenfor.)

**Frisk kontrolleret eksperiment (2026-07-21).** En probe af native mod V8 `hypot`
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): at kompilere
systemets C-`hypot` og sammenligne med Nodes `Math.hypot` på repræsentative
afvigelsesinputs for flade kanter viser en uenighed på 1 ULP på 2 af 6 (Δ 7.1e-15 og
5.7e-14) — knivsæggen ved opdelingstærsklen, der vipper antallet af underinddelinger.
Uløselig: ingen portabel hypot reproducerer Apple libm (præcedensen med `arm-pow.ts`
for den samme grænse). Accepteret på motorsporniveau via
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

**fdp**-xdot-motorsporet (`parity-fdp.json`, native `dot -Kfdp -Txdot`,
±0.5) afdækker den SAMME cocirkulære CDT-uafgjort på den samme graf, `241_0`: med
oraklets nøjagtige positioner før føring injiceret er resten 11 numeriske
`unfilled_bezier`-forskelle begrænset til én kant (`0->1#0`, maxΔ 3.39pt). Fordi
knudepositionerne er injiceret-identiske, ligger afvigelsen nedstrøms i
pathplans multispline-korridor — den samme libm-1-ULP-incircle-uafgjort som
twopi/circo/sfdp `241_0` (eksakt rationel incircle 185/185 ovenfor). Håndtagene er
allerede anvendt (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); uafgjorten er uløselig. Accepteret via `accepted-divergences-engines.json`
`fdp.241_0`. fdp's `2095` er derimod **A1-drift, ikke A9**: at injicere den
ene knude med tomt navn (efter at attributionsinjektoren blev rettet til at matche
knuder med navnet `""`) kollapser dens rest til nul — den tidligere „A9-hale“ var
den uinjicerede tomme knude, der trak sine tilstødende kanter med. Sfdp's `2095`-accept var
den samme blinde vinkel — en frisk regenerering af sfdp-attributionen (2026-07-22) med den rettede
injektor bekræftede, at den også injicerer til 0, og dens accept blev fjernet (se
noten `2095 reclassified` ovenfor).

---

## Sporet lang hale (`dot`-attributter og kanttilfælde) {#tracked-long-tail-dot-attribute-edge-case}

Ved **standardindstillinger** matcher `dot`-motoren C-binæren inden for en stram deterministisk
tolerance på golden-korpusset (dommen `conformant`; se noten øverst).
De resterende forskelle er den **lange hale af attributter og
kanttilfælde** — den historisk svære del af enhver Graphviz-port. I modsætning til de
accepterede afvigelser ovenfor *vil* disse blive lukket; de spores live, med
tal, i
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategori | Hvad der afviger |
|---|---|
| **path-structure** | Kantsplineføring i bestemte konfigurationer (fx nogle tilfælde med flade kanter og tætte korridorer). |
| **element-count** | En funktion, der udsender flere/færre SVG-elementer end C i visse grafer. |
| **color-stroke** | Forskelle i emission af streg/udfyldning for bestemte stilattributter. |
| **parser-gap** | Et lille antal DOT-inputs, som parseren endnu ikke accepterer fuldt ud. |

Hvis din graf kun bruger almindelige attributter og `dot`-motoren, er du næsten
helt sikkert på den deterministiske tolerance-match-sti. Hvis et layout ser forkert ud, så tjek `PARITY-dot.md` for
den inputklasse — det er sandsynligvis et sporet punkt med en orakelfastlåst rettelsesmission,
ikke et ukendt.

> **Note om labeldrevne tilfælde.** Tekstmålingsklassen (A2) er lukket —
> ingen `dot`-graf accepteres længere under den. En graf, der i dag ligger på
> structural-match, er et sporet hul, ikke et skrifttypemetrik-delta.

### Pilespidser på modsatrettede kanter ved `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Når `concentrate=true` fletter et antiparallelt par (`A->B; B->A`) sammen til én
overlevende kant, skal den kant tegne en pilespids i **begge** ender. Det er nu
porteret (grenen `conc_opp_flag` i `arrow_flags`; se
`src/common/splines-clip.ts:arrowFlags`), så `graphs-b135`, `167` og `2087`
matcher (`element-count`-afvigelsen med den manglende pilespids og dens bivirkning
med uklippet spline-`@d` er begge væk).

Nogle concentrate-grafer **beholder en separat, allerede eksisterende rest**, som
pilespidsrettelsen **ikke** adresserer — det er en forskel i knudens **x-koordinat**-
position (x-netværkssimpleks / kompasport), ikke en pilespidsfejl:

- **`graphs-b15`, `graphs-b69`** — de store record-/klyngegrafer af „elevator“-typen.
  Concentrate aktiveres og fletter korrekt; resten er et knude-x-delta på ~1pt,
  der forstærkes til en `element-count`-/spline-`@d`-forskel. Selve pilespidsemissionen
  er nu korrekt (b69 får sine manglende pilespidspolygoner). Se
  agentnoten `b69-concentrate-undermerge` for årsagen til x-koordinaten.
- **`1453`** — afviger stadig på en `element-count`-årsag på øverste niveau, som er urelateret
  til pilespidsen i conc_opp_flag.
- **`2825`** — afveg på tidspunktet for denne pilespidsrettelse på en `element-count`-
  årsag på øverste niveau, urelateret til conc_opp_flag (ingen sammenfletning af
  modsatrettede par udløses dér); siden lukket af missionen fix-2825-rebuild-vlists,
  se A4 ovenfor.

Det er sporede x-koordinat-/strukturelle punkter, **ikke** pilespidsfejl.

### Huller i layouttroskab fra fidelity-missionen 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Fidelity-missionen 2.0 fik uporterede attributværdier til at fejle højlydt (se
tabellen `UNSUPPORTED_FEATURE` i
[Fejl og undtagelser](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Den efterlod følgende, registreret i `plans/v2-fidelity/decision-journal.md`.

**Højlydt, uporteret.** `overlap=voronoi` med overlappende knuder kaster stadig
`UNSUPPORTED_FEATURE` i neato, twopi, circo og sfdp: selve Voronoi-justeringen
(`vAdjust`'s algoritme) er ikke porteret. Overlaptesten, der afgør,
om der kastes, er C's egen (`countOverlap` over `poly.c`-knudepolygoner).

**Kendte huller, stadig tavse.** Porten renderer disse uden fejl og
afviger fra native Graphviz. Fundet af missionen `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); ikke accepterede afvigelser.

- **`getAdjustMode`'s advarsel „Unrecognized overlap value“ udsendes ikke.**
- **Roterede polygonhjørner kan afvige fra native i de sidste bit
  (uløselig: værtens matematikbibliotek).** `poly_init` orienterer hvert hjørne med
  `atan2`, `hypot`, `sin` og `cos`. Med bit-identiske inputs returnerer macOS libm og
  V8 forskellige sidste bit (fx `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` ved det næste hjørne:
  libm `…fffd`, V8 `…fffe`), så en boks med `orientation=20` får hjørne-y
  `-18` i porten og `-17.999999999999996` native. Native Graphviz selv
  varierer med platformens libm, og en browser kan ikke kalde den. Portens egen
  aritmetik matcher C (rækkefølgen i `RADIANS` rettet; 776 af 1664 stikprøvede hjørne-
  koordinater er bit-identiske, resten afviger kun gennem libm). Effekt:
  `polyOverlap`-afgørelser ved præcis berøring kan vippe; med native hjørner matcher hver
  afgørelse.
- **sfdp kan afvige fra native på macOS (uløselig: værtens libm-`pow`).**
  Diagnosticeret med en instrumenteret native sfdp: positionerne forbliver bit-identiske,
  indtil ét frastødningskrafts-led, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, altså `pow(x, 2)`), returnerer 1 ulp mindre end `x*x` fra macOS libm
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, korrekt afrundet
  `…396`; macOS `pow(v, 2) != v*v` for 20 af 16201 stikprøvede `v`). Det ændrer
  iterationens `Fnorm` i den sidste bit; sfdp's adaptive afkøling forstærker det
  til et anderledes (ofte spejlet) layout. Portens `armPow` er ARM's
  optimized-routines-`pow` (glibc ≥ 2.28), dvs. det, Linux-Graphviz beregner;
  macOS-oraklet er den afvigende. Udelukket: seeding (eksplicitte `start=`-værdier
  matcher), `pcp_rotate` (samme input giver samme output), positioner og
  det tiltrækkende led (bit-identiske). Eksempel: en enkelt trekant `a--b; a--c; b--c`
  ved standard-seed.
- **fdp kan afvige fra native gennem værtens libm-`cos`/`sin`.** fdp følger
  Graphviz efter 15.0.0 (hypot-afstandsfrastødning, `Mlimit`), med værtens
  libm-`hypot` gengivet bit for bit (`src/common/libm-hypot.ts`, 0
  uoverensstemmelser på 400k stikprøver). 251 af de 252 fdp-renderbare golden-inputs
  matcher det native build nøjagtigt; den ene tilbageværende
  (`parallel-cluster-ldbxtried`) placerer klyngeportknuder med
  `T_Wd * cos(alpha)`, og macOS libm `cos(-2.3840764867756761)` er 1 ulp fra
  V8's `Math.cos`; fdp's kraftløkke forstærker det til omkring 3 tommer. Apples
  `cos` kan ikke reproduceres ud fra en kort model, sådan som `hypot` kan.
- **Native nedbrud, som porten definerer.** Native Graphviz afslutter med 139 på neato
  `mode=KK` med `model=mds` og en kant-`len` (`mds_model` indekserer `GD_dist`
  med et 1-baseret løbenummer: heap-overløb), og på `model=circuit` med en
  usammenhængende graf. Porten dropper celler uden for intervallet i det første tilfælde og
  falder tilbage på korteste veje i det andet; der er intet native output at
  sammenligne med.

---

## Bevidst ikke porteret (ikke-mål) {#intentionally-not-ported-non-goals}

Det er bevidste afgrænsninger af omfanget, ikke fejl. Biblioteket retter sig mod **SVG**
(plus de mellemliggende tekstformater `json` / `xdot` / `dot` / imagemap).

- **Andre outputformater.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  og GUI-/interaktive backends er uden for omfanget. Brug SVG-outputtet og konvertér
  efterfølgende, hvis du har brug for et raster.
- **`page=`-paginering for SVG.** Native `dot` paginerer heller ikke SVG (SVG-
  enheden sætter intet pagineringsflag), så `page=` er en no-op på denne sti i begge
  implementeringer — dokumenteret her kun fordi det er et almindeligt punkt for
  forvirring.
- **`-Tplain`-tekstoutput.** Udskudt (et trofast tekstformat), ikke udelukket.
- **`gvpr`** (grafbehandlingsscriptsproget) — uden for omfanget.
- **C++-bekvemmelighedswrappere** (`cgraph++`, `gvc++`) — C-API'et porteres
  først; et idiomatisk TypeScript-bekvemmelighedslag ville, hvis ønsket, være
  en separat pakke.
- **`fontnames=svg|ps` i tekstmåling i browseren.** I en browser bygger
  canvas-måleren sin skrifttype ud fra PostScript-aliassets
  `fontnames=native`-familieliste (`Times-Roman` → `Times, serif`), det samme
  skriftsnit, som SVG-emitteren renderer som standard. `TextMeasurer` bærer ingen
  grafkontekst, så grafer, der sætter `fontnames=svg` eller `fontnames=ps`, måles
  mod den native liste, mens SVG'en navngiver svg/ps-familien. Aliasvægte,
  som CSS ikke definerer (`book`, `demi`, `light`, `medium`, `roman`),
  udsendes ordret, som i C; browsere ignorerer dem og renderer normal
  vægt, og måleren måler normal vægt for at matche. Node-output
  er upåvirket (det bruger aldrig canvas-måleren).
- **Kun-native mekanikker** erstattet af browsersikre ækvivalenter: dynamisk
  plugin-indlæsning (`dlopen`) erstattes af statisk motor-/rendererregistrering;
  filsystemlæsninger (skrifttyper, billeder, konfiguration) erstattes af callbacks leveret af kalderen
  (fx `setImageSizer`). Adfærden bevares; mekanismen er en anden.

---

## Meld en afvigelse {#reporting-a-divergence}

Hvis du finder output, der afviger fra C og **ikke** er en accepteret afvigelse ovenfor,
ikke står i `PARITY-dot.md` og ikke er et ikke-mål, er det en fejl, det er værd at melde — C-
kildekoden er specifikationen, og ikke-anførte afvigelser behandles som fejl, ikke som
accepteret adfærd.
