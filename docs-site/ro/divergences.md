---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Divergențe cunoscute față de C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine urmărește cea mai mare fidelitate posibilă față de implementarea C
canonică. Sursa C este specificația; o diferență nelistată este tratată ca defect, nu ca
un comportament acceptat.

> **Ce înseamnă „potrivire” aici.** Verdictul de paritate al corpusului numit `conformant`
> este o **toleranță deterministă strânsă**, *nu* egalitate literală, octet cu octet, a SVG-ului:
> coordonatele numerice și traseele trebuie să coincidă în limita **±0.01**, iar tot
> conținutul nenumeric (etichete, culori, text) trebuie să fie exact egal
> (`compareSvg(…, 'deterministic')`). În tot acest document, „potrivire” și
> „conform” se referă la acest verdict de toleranță. Definiția completă:
> [Conformitate](./conformance.md).

Acolo unde ieșirea *chiar* diferă, ea se încadrează în exact una dintre trei clase:

1. **Diferențe acceptate** — deosebiri pe care le-am investigat, le-am înțeles până la
   cauza rădăcină și am ales **în mod deliberat să nu le facem conforme**. Fiecare este
   delimitată, caracterizată și justificată mai jos. Acestea nu sunt defecte și nu vor fi
   „remediate” fără un motiv specific, cu un domeniu separat.
2. **Coada lungă urmărită** — lacune cunoscute care *vor* fi închise, fiecare cu o
   remediere ancorată în oracol. Ele se află, cu numărători live, în
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Non-obiective** — limite intenționate ale domeniului (formate și mecanisme pe care
   nu ne-am propus niciodată să le reproducem).

Evidențele autoritative, actualizate continuu, sunt
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(panoul de paritate pe fiecare intrare față de `dot` nativ) și
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventarul stării portării la nivel de algoritm).

Sursa de adevăr **citibilă de mașină** privind care grafuri sunt *acceptate* (clasa 1
de mai jos) este
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Instrumentele o îmbină în momentul generării raportului: `PARITY-dot.md` separă **diferențele
acceptate** de restanța **urmărită**, iar poarta de reguli își ia lista de permisiuni din ea.
Secțiunile în proză de mai jos explică fiecare intrare (A1 și A3 sunt active; A2 este închisă
și păstrată ca istorie); un test CI (`accepted-divergences.test.ts`) impune ca
fiecare graf acceptat să mai divergă încă, astfel încât această listă să nu putrezească pe tăcute.

---

## Diferențe acceptate (nu le facem conforme în mod deliberat) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Acceptăm o diferență — în loc să urmărim paritatea octet cu octet — doar când **toate**
condițiile următoare sunt îndeplinite:

- Cauza rădăcină este o **constrângere de portabilitate** (ceva ce mediul de execuție
  JavaScript/browser nu poate reproduce exact), nu o eroare de logică a portării.
- Diferența este **sub pragul perceptibil** și demonstrabil **mărginită**.
- O remediere ar avea un **cost și o rază de impact disproporționate** față de
  câștig (de regulă: ar atinge o primitivă comună folosită de sute de grafuri deja
  conforme, riscând regresii pentru un câștig de o fracțiune de pixel).

Când acceptăm o diferență, o caracterizăm aici, ca utilizatorii să nu fie niciodată surprinși.
Grafurile afectate de o diferență acceptată sunt validate după un prag **structural /
de toleranță**, în loc de unul pe octeți.

### A1. Determinismul în virgulă mobilă (motoare bazate pe forțe) {#a1-floating-point-determinism-force-directed-engines}

**Afectate:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (motoarele iterative,
cu model de tip arc). *Aranjarea* motorului `dot` **nu** este afectată de acest
determinism al modelelor iterative; o diferență separată, strict delimitată, de virgulă
mobilă în rutarea spline-urilor din `dot` este tratată la **A3** mai jos.

> **Domeniu, istoric o rezervă nemăsurată — acum parțial măsurată.** **Sondajul SVG
> principal al motorului dot** (`test/corpus/survey.ts`) este în continuare
> **doar pentru dot**: oracolul nativ rulează sub `GVBINDIR=/tmp/ghl`, care
> face legături simbolice **doar** către pluginurile `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` parcurge exact `core dot_layout`
> — nu există niciun plugin de aranjare `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`),
> iar atât oracolul, cât și portarea sunt invocate cu motorul `dot`. Așadar id-urile din corpus
> precum `*_neato` / `*_circo` / `root_twopi` sunt *nume de fișiere* aranjate cu
> `dot` în acel sondaj, nu cu motorul lor nativ, iar A1 nu se potrivește cu **niciun**
> graf acolo — nu pentru că motoarele ar fi dovedite conforme, ci pentru că
> acel sondaj anume nu le solicită niciodată.
>
> **Dar toate cele șase motoare A1 au acum propriul sondaj cu motorul nativ**, prin
> `test/corpus/engine-walk.ts` + `parity-report.ts` (independent de `GVBINDIR` —
> fiecare lansează direct `dot -K <engine> -Txdot`), la două niveluri diferite de
> rigoare, documentate separat mai jos: `circo`/`twopi`/`osage` rulează la aceeași
> toleranță **deterministă de ±0.01** ca sondajul dot, cu triere a cauzei rădăcină pe
> fiecare id („Acceptarea pe flux de motor” mai jos); `neato`/`fdp`/`sfdp` rulează la o
> toleranță de **caracterizare de ±0.5** mai laxă, încă fără triere pe id
> („Caracterizarea motoarelor iterative” mai jos). Numerele curente între motoare:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Caracterizare.** Aceste motoare rulează aranjări numerice iterative ale căror rezultate
depind de rotunjirea în virgulă mobilă — în special de înmulțirea-adunarea fuzionată (FMA) și de
`Math.pow`, care pot diferi între motoarele JavaScript și arhitecturile CPU. Portarea
respectă ordinea operațiilor din C acolo unde poate (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — de exemplu `sfdp` se aliniază la ~6 cifre semnificative cu
oracolul nativ, cu un PRNG și un `fma` potrivite — dar reproducerea exactă, cu coordonate
identice, **nu este garantată între platforme**. Topologia este păstrată; divergența
potențială se află în coordonatele fine ale nodurilor.

**De ce este acceptată.** Aceasta este o constrângere dură a rulării în JS, nu o alegere de
design — din aceeași familie cu sensibilitatea la `hypot` a Apple de la A3. Nu există nicio
cale de a garanta rezultate transcendente/FMA identice bit cu bit pe toate mediile de
execuție țintă, deci un prag pe octeți ar fi netestabil, nu doar costisitor. **Evaluarea lui A1**
(spre deosebire de simpla lui menționare ca rezervă) a cerut un flux separat de paritate cu motorul nativ
— construit pe 2026-07-11 ca `test/corpus/engine-walk.ts` + `parity-report.ts`, care sondează
fiecare intrare cu propriul motor, în loc de `dot`. Plafonul onest al acestei activități este
**restrângerea** lui A1 la „nicio divergență activă pe platforma de referință”, niciodată
eliminarea rezervei privind platformele multiple; rezultatele de până acum (mai jos) respectă acest
plafon: `circo`/`twopi`/`osage` au scos la iveală și au elucidat până la cauza rădăcină
câteva instanțe autentice A1/A9, iar `neato`/`fdp`/`sfdp` se situează acum la 90.8/77.5/68.0%
în limita a 0.5pt față de nativ pe universul de 910 elemente, ceea ce înseamnă că aritmetica
portată (`fma.ts`, `arm-pow.ts`, PRNG potrivit) se menține pentru majoritatea grafurilor — iar
fiecare id divergent rămas este atribuit individual prin injecție (derivă a solverului față de
defect al portării), nu lăsat ca derivă netriată; vedeți mai jos caracterizarea
motoarelor iterative.

**Acceptarea pe flux de motor: familia de săgeți twopi.** <a id="a1-twopi-arrows-family"></a>
Citatul de mai sus descrie sondajul SVG al motorului dot, în care A1 nu se potrivește cu niciun
graf; **fluxul xdot de motor** separat pentru `twopi` (`parity-twopi.json`, oracol nativ
`dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *rulează* sub
motorul nativ și scoate la iveală o instanță A1 concretă, verificată, pe 9 id-uri din corpus:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
și (adăugat pe 2026-07-28, nou în universul de 905 elemente) frate din directed/,
`tree-graphs-directed-oldarrows` — fiecare divergând pe o singură muchie dominantă
(`Z->I` sau `i->Z`; 12–64 diferențe de operații de desenare). Injecția A/B (jurnalul de decizii, intrarea din 2026-07-10 „injection A/B verdicts:
twopi arrows family EXONERATED...”) a dovedit direct mecanismul:
extragerea lui `ND_pos` de la intrarea în `spline_edges` nativ și injectarea lui în
`splineEdgesShifted` al portării produce o ieșire **complet conformă** pe
`graphs-arrows` (`Z->I` devine identic octet cu octet cu oracolul, același
spline cu 7/14 puncte) — deci divergența este 100% derivă a pozițiilor nodurilor înainte
de rutare, provenită din solverul de eliminare a suprapunerilor PRISM al lui `twopi`, iar rutarea
și emiterea spline-urilor din portare sunt exonerate. Simptomul vizibil la 6 dintre cele 8 id-uri este o
inversare a numărului de puncte ale curbei bezier (`unfilled_bezier[ptCount]: 8 vs 14`): numărul de
segmente potrivite de `Proutespline` este sensibil la partea limitei unui obstacol pe care
cade poziția nodului derivat, astfel că o diferență de poziție sub un ULP, în aval de
rezolvarea iterativă PRISM, inversează numărul de segmente al spline-ului potrivit (celelalte 2 id-uri,
`graphs-arrowsize`/`nshare-arrows_dot`, arată aceeași derivă ca o diferență de
poziție mai mică, fără inversarea numărului de piese). Acceptată la nivelul
fluxului de motor prin `test/corpus/accepted-divergences-engines.json`, îmbinat în
`PARITY-twopi.md` de `parity-report.ts` — aceeași îmbinare pe care o execută `accepted.ts`
pentru `PARITY-dot.md` al fluxului dot.

Analiza cauzei rădăcină `oldarrows` (2026-07-28) a identificat locul exact al inversării
simptomului numărului de puncte al familiei. Evantaiul `i`–`Z`–`I` este coliniar pe un diametru
al inelului, iar `intersect()` din `directVis` al pathplan blochează o linie de vizibilitate când un
vârf de obstacol se află „pe” segment — unde toleranța de coliniaritate de 1e-4 a lui `wind()`
face ca până și un nod aflat la 270pt de segment să conteze drept coliniar, iar
`inBetween()` (care presupune coliniaritate) degenerează apoi în testarea doar a
**proiecției pe x**: vârful blochează dacă și numai dacă x-ul său cade strict în interiorul
intervalului de lățime un ULP dintre coordonatele x ale celor două capete. Care dintre cele două
muchii radiale în oglindă se curbează depinde, prin urmare, de ordinea la ultimul ULP a
trei valori x nominal egale ieșite din rezolvarea PRISM — C curbează `Z->I`
(vârful de axă al nodului `i` cade în interiorul intervalului său), portarea curbează `i->Z`
(vârful nodului `I` cade în interiorul intervalului propriu). Replicarea lui `directVis` offline pe
setul de obstacole extras din fiecare parte reproduce exact decizia fiecăreia, iar
injectarea lui `ND_pos` dinaintea rutării din oracol în portare dă 0 diferențe
(`attribution-twopi.json`) — rutarea și emiterea sunt fidele octet cu octet.

`1855` este varianta **în oglindă** radială/stea a aceluiași mecanism FP PRISM dinaintea
rutării (acceptat 2026-07-11): cele 31 de frunze ale sale sunt exact cocirculare, astfel că
aranjarea stea este simetrică prin reflexie, iar eliminarea suprapunerilor din PRISM se află pe un echilibru
instabil la simetrie; o diferență de 1 ULP între `cos`/`sin` din V8 și libm la 5
unghiuri de frunze din `setAbsolutePos` al lui `circleLayout` selectează bazinul de oglindire
opus, iar întreaga aranjare radială ajunge imaginea exactă în oglindă, pe axa x, a celei
din oracol (deplasare maximă a nodurilor 6.04pt, bb păstrat). Injecția A/B a dovedit
ambele direcții: alimentarea PRISM-ului portării cu pozițiile exacte `circleLayout` ale lui C
reproduce oracolul nod cu nod (3e-14), iar restaurarea doar a celor 5 poziții de frunze
divergente la ULP răstoarnă întreaga aranjare înapoi la oglinda portării. Analiza completă a cauzei rădăcină: `.agent-notes/twopi-radial-drift-rca.md` (jurnalul de decizii
2026-07-11).

**Caracterizarea motoarelor iterative: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Spre deosebire de fluxurile de motor `circo`/`twopi`/`osage` de mai sus, `neato`/`fdp`/`sfdp`
**nu** sunt încă triate pe id — `engine-walk.ts` înregistrează un câmp `tolerance: 0.5`
pentru aceste trei, iar `parity-report.ts` le afișează într-o secțiune separată,
„Iterative engines (±0.5 characterization)”, din
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
în mod explicit **necomparabilă** cu ratele de reușită deterministe de ±0.01 din restul
acestui document. Numerele curente (univers de 910 elemente; procentul de reușită exclude
intrările pe care oracolul C nu le poate randa, conform [Conformitate](./conformance.md)):

| motor | sondate | în limita ±0.5pt | neconforme (toate atribuite, acceptate) | eroare portare / timeout | eroare oracol |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Prima trecere, 2026-07-11, la 762 de elemente, a măsurat 263/311/260 în limita
±0.5pt — saltul la ratele actuale a venit din remedieri pe id integrate de atunci,
în principal gestionarea neportată `user_pos`/`P_SET` din neato, consolidarea
inițializării motoarelor și remedierea `setEdgeType` între macro și funcție.)

Spre deosebire de prima trecere, fiecare rând divergent este acum atribuit individual:
instrumentul de injecție (`test/corpus/attribute-divergence.ts`) alimentează portarea cu
`ND_pos` dinaintea rutării din oracolul nativ și compară din nou, iar
fiecare id divergent curent este fie `drift-exonerated` (rutarea și emiterea portării
reproduc exact oracolul odată ce deriva solverului este eliminată),
fie unul dintre puținele reziduuri acceptate separat pe id (egalitatea la testul incircle din CDT pentru `241_0`
pe toate cele trei motoare, neato `2239`, sfdp `42`/`2556`).
Acceptarea pe clasă de mai jos formalizează mulțimea exonerată; numerătorile live se află în
panourile pe motor
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Acceptarea clasei A1-drift (motoare iterative, membri calculați).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
conține câte o intrare de **clasă** `"A1-drift"` pentru fiecare motor iterativ (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — distinctă de intrările
pe id folosite de fluxurile `circo`/`twopi`/`osage` de mai sus (D2,
`plans/iterative-parity-campaign/decisions.md`). Spre deosebire de o intrare pe id, apartenența
la clasă nu este niciodată enumerată de mână în registru: `parity-report.ts`
o calculează la generarea raportului din `attribution-<engine>.json` corespunzător
(instrumentul de atribuire prin injecție al lui T1, `test/corpus/attribute-divergence.ts`)
— fiecare id divergent al cărui `ND_pos` nativ dinaintea rutării a fost injectat în
portare și comparat din nou, conformându-se la ±0.5, primește `verdict: 'drift-exonerated'` în
acel fișier, ceea ce înseamnă că solverele iterative ale celor două motoare au convers la
aranjări diferite numeric, dar fiecare consistentă intern (o diferență de
acumulare în virgulă mobilă conform caracterizării A1 de mai sus, nu un defect de rutare
sau de emitere al portării). Dovezile pe id — forma grupului, numărul de diferențe de bază față de cel injectat,
detectarea translației uniforme/oglindirii — se află în artefactul de
atribuire însuși, nu sunt duplicate în acest document sau în registru (D2). Un id
care începe ulterior să treacă de-a dreptul, sau a cărui re-atribuire schimbă verdictul,
iese automat din clasă la următoarea regenerare a raportului — fără a fi nevoie de o modificare
a acceptării perimate și fără eșec al testului de gardă. Motoarele al căror
`attribution-<engine>.json` nu a fost încă generat afișează clasa ca
„attribution pending” cu zero membri, identic cu a nu avea nicio acceptare
— intrarea de clasă are voie să preceadă datele ei (vedeți
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Măsurarea textului (metrici de font) → aranjare dictată de etichete — ÎNCHISĂ <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Stare (2026-07-01): închisă.** Nicio id din corpus nu mai este acceptată sub această clasă;
secțiunea este păstrată ca documentație istorică a mecanismului și a
punctului de extensie `TextMeasurer` injectabil care l-a neutralizat.
Remedierile succesive ale măsurării textului (trecerea la `EstimateTextMeasurer`,
metricile verticale sensibile la font, remedierea octeților UTF-8 non-ASCII) au rezolvat aproape
fiecare divergență de aranjare dictată de etichete care locuia aici. **`proc3d`** —
fostul exemplu canonic A2 — este complet **`conformant`** pe toate cele trei
directoare din corpus (`graphs-`/`share-`/`windows-proc3d`): bbox potrivit, zero
diferențe în datele de traseu, zero diferențe la ancorele etichetelor.

**Ultimii membri retrași (2026-07-01).** **Familia `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) a fost menținută aici mult după ce
geometria nodurilor ei se potrivea deja exact cu C (76/76 puncte de referință). Reziduul ei real —
8 capete de muchii drepte pe patru perechi opuse de cicluri de lungime 2
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) deplasate cu 6–14 pt — a fost re-diagnosticat și s-a dovedit
a nu avea **nicio legătură cu metricile fontului**, ci a fi două defecte ale portării în
rutarea muchiilor multiple din dot (misiunea `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Ordinea culoarelor la perechile opuse.** Portarea re-sorta fiecare grup de muchii paralele
   după seq-ul original de creare înainte de a atribui decalajele de culoar Multisep; C
   atribuie culoarele în ordinea colectată de edgecmp (reprezentantul MAINGRAPH înainte
   primul, membrul AUXGRAPH inversat al doilea — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Un ciclu de lungime 2 al cărui membru inversat era
   declarat primul desena fiecare muchie pe culoarul de 18 pt al celeilalte.
2. **Adiacență plată falsă pe muchii îmbinate între ranguri.** `markAdjacent`
   marca intrările `ND_other` fără garda de același rang din C
   (`flat.c:272-276`), lăsând scurtcircuitul de adiacență plată din `groupSize`
   să înghită întreruperile de grup din portcmp.

Cu ambele remediate fidel, familia este **`conformant`** pe toate cele trei
directoare (pe element: noduri 0, muchii 0 diferite), iar același mecanism a
închis `42`, `clust2`, `ngk10_4` (structural-match → conformant) și a mutat
`b124` de la diverged la structural-match — toate pe perechi de cicluri de lungime 2/paralele.

**Ambele părți ale sondajului rulează același estimator — măsurarea este neutralizată.**
Oracolul `dot` nativ rulează sub un `GVBINDIR` fără interfață grafică
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) care face legături simbolice doar către
pluginurile `core` și `dot_layout` — niciun plugin de aranjare a textului `gd`/`pango`/`quartz`.
Cu acel slot gol, graphviz revine la `estimate_textspan_size` încorporat.
`EstimateTextMeasurer` al portării TypeScript
(`src/common/textmeasure.ts`) este o portare fidelă a aceleiași rutine și este
implicitul pentru Node, rezolvat de `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Ambele părți ale fiecărei comparații de
paritate măsoară deci textul cu estimatorul identic** — avansurile reale de glife
FreeType/pango nu intră niciodată în comparație. Din acest motiv o regresie de verdict aici
indică codul de aranjare, nu un font, și de aceea remedierea defectelor proprii ale
estimatorului (numărarea octeților UTF-8, sensibilitatea la font a metricilor verticale) a închis
cea mai mare parte a acestei clase de-a binelea, nu doar a îngustat o diferență de metrică a fontului.

**Punctul de extensie `TextMeasurer` injectabil.** Această neutralizare este posibilă doar
pentru că măsurarea textului este un punct de extensie deliberat, nu este legată rigid în
niciunul dintre motoare. `TextMeasurer` este o interfață cu o singură metodă (`measure(text, font, size,
flags) → {w, h, …}`) injectată prin dependență în fiecare loc de apel care dimensionează etichete —
`polyInit`, `recordInit`, `initEdgeLabels` și `buildNodeLabel` primesc fiecare
măsurătorul ca parametru; nimic nu măsoară text printr-un global. Este
fixat pentru teste/CI prin `setTextMeasurer(...)` sau `GV_TEXT_MEASURER=estimate`.
Punctul de extensie permite, de asemenea, ca un reziduu să fie *demonstrat* ca fiind doar de măsurare: se
alimentează portarea cu lățimile exacte măsurate de C (capturate din oracol) și se verifică dacă aranjarea
reproduce apoi exact C. Acel experiment a fost cel care a justificat inițial verdictul
A2 pentru `proc3d` (vedeți anexa istorică de mai jos) — tehnica
rămâne valabilă. Inversul ei a retras clasa: deoarece măsurarea a fost
demonstrabil neutralizată pe ambele părți ale sondajului, reziduul muchiilor `NaN` nu putea
fi un efect de metrică a fontului, ceea ce a forțat re-diagnosticarea care a găsit cele două
defecte de rutare de mai sus.

::: details Analiză istorică (depășită 2026-06-30) — păstrată pentru evidență
Materialul de mai jos descrie o stare anterioară a acestei clase, înainte ca trecerea la
`EstimateTextMeasurer`, metricile verticale sensibile la font și remedierea octeților UTF-8
non-ASCII să o închidă în mare parte. Nu mai descrie comportamentul curent
— este păstrat doar pentru ca raționamentul care ne-a adus aici să nu se piardă. În
special: (1) cifrele de lățime „C nativ” din tabelul de măsurare de mai jos
sunt valori **FreeType** dintr-o cale de randare cu font real; sondajul de paritate
nu solicită niciodată acea cale — ambele părți rulează `estimate_textspan_size` (vedeți
mai sus) — deci tabelul nu reflectă modul în care se măsoară în prezent paritatea; (2)
figurile de suprapunere și randările golden/ale noastre de mai jos înfățișează un `proc3d`
**din afara corpusului** (`graphs/directed/proc3d.gv`, ~2620 pt) care nu face parte din
sondajul de paritate; variantele `proc3d` din corpus sunt acum conforme, cu zero
diferențe, deci nu există nicio suprapunere de arătat pentru ele; (3) narațiunea despre deplasarea x a
nodurilor `NaN`/`ratio=compress` de mai jos este depășită — măsurătoarea curentă arată că toate cele 76 de puncte
de nod se potrivesc exact, deci lanțul eroare de lățime → deplasare de nod pe care îl descrie nu mai
este valabil pentru `NaN`.

**`NaN` sub `ratio=compress` (istoric).** Familia
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) a fost un caz
A2 al cărui verdict de la acea vreme a ajuns la *diverged*, nu la
*structural-match*. Calea x-network-simplex cu compress era fidelă — fiecare intrare
de constrângere se potrivea cu C (valoarea constrângerii de lățime, minlen-urile `containNodes`,
numărul de muchii auxiliare 471/pondere 1612, `lrBalance` și toate ordinile de rang identice)
*cu excepția* semilățimilor a 9 noduri, pe care măsurătorul le raporta cu 0.5–1.03 pt
mai late decât în C. Împachetarea cu pondere 1000 din `ratio=compress` a făcut ca
constrângerile de separare stânga-dreapta, în mod normal slabe, să devină **active**, astfel că acea eroare de
lățime sub-pixel — invizibilă fără compress — a ieșit la suprafață ca o deplasare x interioară de −3..−5 pt.
Deplasarea a împins spline-ul drept `Target<->TThread` cu 0.55 pt
dincolo de peretele unei casete de nod, astfel că rutatorul l-a curbat într-o piesă bezier în plus (7
puncte față de 4 în C) — o diferență *structurală*, deci *diverged*. Forțarea celor 9 lățimi
la valorile din C a reprodus exact C (x-nod 53/76→0/76 diferite; spline 7→4 puncte),
confirmând că reziduul provenea 100% din metricile fontului din amonte, nu din codul compress sau
al spline-urilor, **pentru acea fostă divergență**. Dovada completă (cu o comparație vizuală
golden-versus-al nostru alăturată + suprapunerea diferenței dintre spline-ul cu 4 și cel cu 7 puncte):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (descriere în proză:
`…/nan-compress-xcoord.md`).

**Exemplu de măsurare a metricilor de font (istoric — FreeType față de estimare).**
Graphviz nativ, când rulează cu un plugin real de aranjare a textului (nu oracolul fără
interfață grafică folosit de sondajul de paritate), măsoară textul cu avansurile de glife FreeType/libgd.
`EstimateTextMeasurer` al portării nu replică un rasterizator de glife. Pentru majoritatea șirurilor cele două
coincid exact; pentru unele, diferă cu
o fracțiune de punct. Exemplu măsurat — Times-Roman 14 pt, șirul
`"/home/ek/work/src/lefty/lefty.c"` (31 de caractere):

| | lățime |
|---|---|
| C nativ (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimare) | 176.75 pt |
| diferență | **+0.75 pt (+0.43%)** |

Cealaltă linie de etichetă a aceluiași nod, `"93736-32246"`, s-a măsurat **identic**
(96.00 pt la ambele) — eroarea depinde de șir și se acumulează pe glifă,
nu este un factor de scară uniform. Această diferență FreeType-versus-estimare este reală, dar
**nu** este ceea ce măsoară sondajul de paritate (ambele părți rulează `estimate`); ar conta
doar dacă ieșirea @knowvah/dot-engine ar fi comparată cu o randare C cu font real
în afara acestui sondaj.

**Efectul în aval asupra fostei divergențe `proc3d` (istoric).** Lățimea etichetei
alimentează dimensiunea nodului, care alimentează aranjarea:

1. O etichetă mai lată → o casetă de nod puțin mai lată (pentru un nod *elipsă*, lățimea este
   scalată în plus cu √2, deci +0.75 pt de text → +0.53 pt de semilățime).
2. Semilățimile nodurilor stabilesc constrângerile de separare stânga-dreapta ale
   network simplex pentru coordonata x; aceste constrângeri sunt rotunjite cu `ROUND()` la
   întregi, deci o schimbare sub-pixel a lățimii poate împinge o constrângere de la *N* la
   *N+1*.
3. Network simplex alege apoi o atribuire x întreagă diferită — dar la fel de optimă —,
   deplasând unele poziții x ale nodurilor cu 1–2 unități.

Pentru `proc3d.gv` din afara corpusului (`graphs/directed/proc3d.gv`, ~2620 pt, nu face parte din
sondajul de paritate), aceasta a produs o diferență de **≤ 3.55 pt** în extinderea pe x
(**0.13%**), suprapusă mai jos — **verde = `dot` nativ C (golden), roșu =
@knowvah/dot-engine (al nostru)**:

![proc3d golden-vs-ours overlay: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay.svg)

La mărire, marginea apărea aproape în întregime pe etichetele lungi ale ovalelor cu
căi de fișiere:

![proc3d overlay, zoomed on the wide path-label ovals: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — `dot` nativ | Al nostru — @knowvah/dot-engine |
|---|---|
| ![proc3d rendered by C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendered by @knowvah/dot-engine](/img/proc3d-ours.svg) |

Analiza de sine stătătoare (cauza rădăcină, cifre pe metrică, comanda de reproducere)
se află pe propria pagină:
[**proc3d — divergența canonică A2 de metrică a fontului (istoric)**](/ro/divergences-proc3d-a2).
Acea pagină descrie o divergență rezolvată pe o intrare din afara corpusului; variantele
`proc3d` curente din corpus sunt conforme.

**De ce a fost acceptată la acea vreme.** Potrivirea octet cu octet a avansurilor pe glifă ale FreeType
pentru fiecare font și șir ar fi cerut replicarea tabelelor sale de metrici, a hinting-ului și a rotunjirii — mare, fragil și tot
fără garanția de a fi exact. Măsurătorul de text este o primitivă comună: fiecare etichetă din
corpus trece prin el, deci o remediere vizând un singur șir risca regresii în
altele pentru un câștig sub pragul perceptibil.
:::

### A3. Departajarea `hypot` în rutarea spline-urilor (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Afectate:** grafurile `dot` cu un canal de rutare a muchiilor **simetric geometric** —
de regulă un arc plat scurt și simetric. Exemplu observat: `2368`,
care rămâne la *structural-match* (maxΔ ≈ 10.2 pt pe **o singură** muchie, `376->76`).
Aceeași departajare apare și pe o muchie **lungă** (pe mai multe ranguri) către un
hub cu intrare mare când coridorul este exact simetric în oglindă: `graphs-b100` /
`graphs-b104` (sursă identică) divergă cu maxΔ 20 (exact un rând de rang) pe
singurul nod al muchiei `Node23730->Node23729` — fiecare poziție de nod și toată structura de
casetă/poligon/traseu întins din amonte este identică octet cu octet cu C; doar alegerea de ~1 ULP a lui `findMaxDev`
privind care punct interior simetric în oglindă devine nodul bezier
diferă. Forma cu muchie plată scurtă apare și ca `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — fratele divergent al lui `241_0`, ancorat în oracol, pe care zgomotul din C
îl păstrează, în schimb, pe primul. Aceeași departajare produce o împărțire a culoarului-fantă
pentru muchia de întoarcere a unui ciclu de lungime 2 cu etichetă în `2413_1` (structural-match, maxΔ 67.65) și
`2413_2` (maxΔ ≤99.55 după ce intră remedierea T11 swapBezier-reverse — până atunci
maxΔ 1922.26 raportat pentru fișier este dominat de un defect fără legătură, urmărit separat),
precum și o singură muchie cu etichetă din interiorul unui cluster în `graphs-decorate`
(maxΔ 43.54); în fiecare caz cele două colțuri candidate de împărțire sunt egale în limita
a 5.7e-13 (familia 2413) / 3e-14 (decorate) înainte ca zgomotul `hypot` Apple dependent de
poziție să aleagă un câștigător. `2371`
(structural-match, maxΔ 16.8) arată aceeași amprentă pe două muchii fără legătură
(`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): portarea
emite imaginea exactă în oglindă, ca secvență de puncte de control, a oracolului pe ambele,
cu y-ul nodului răsturnat cu același Δ16.8 (fracțiile de împărțire sus/jos schimbate între ele).
Originea sa este calificată cu încredere **MEDIE**, nu cu încrederea CONFIRMATĂ
a celorlalți membri: `2371` împachetează ~199 de componente, ceea ce decuplează
coordonatele locale pathplan de coordonatele paginii, astfel că egalitatea nu a putut
fi corelată live cu `route.ts:209` în trei încercări de instrumentare; o origine în
segmentarea în mod drept sau în `recover_slack` de după tăiere nu este
complet exclusă. Diagnostic complet:
`plans/residual-cleanup/analysis/2371-mirror.md`. Majoritatea muchiilor rutate nu
sunt afectate.

::: details Definiția grafului (`2368.dot`)
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

**Caracterizare.** Potrivitorul de spline-uri (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) împarte un bezier potrivit în punctul interior al rutei cu
deviația maximă. Când canalul este simetric, cele două puncte candidate de împărțire
sunt o **egalitate matematică exactă**, iar câștigătorul este decis de zgomotul de
anulare în virgulă mobilă de ~1e-14 dintr-o evaluare bezier în coordonate absolute,
al cărui **semn depinde de poziția absolută**.

Distanța de deviație din C este `hypot` din libm, iar `hypot`-ul Apple de pe macOS care a
generat oracolul este o implementare proprietară care nu se potrivește bit cu bit cu **niciun**
`hypot` portabil (măsurat față de ea pe regimul de coordonate graphviz, rate
identice bit cu bit: V8 `Math.hypot` ≈ 63%, un `hypot` corect rotunjit / în stil Arm
≈ 84%, `hypot` fdlibm ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Din cauza acestui zgomot ULP,
**C însuși nu este consecvent**: împarte două arce *congruente prin translație* spre colțuri
**opuse**. În `2368`, arcul `376->76` este imaginea în oglindă a arcului `256->436`,
identic geometric:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Întreaga diferență, suprapusă (mărire 12× pe arcul `376->76` / `to1`) — **verde = C
Graphviz, roșu = @knowvah/dot-engine**. Ambele sunt același arc jos, puțin adânc, între
aceleași limite de noduri; diferă cu ~1–2 pt la burtă (punctul de control bezier
din mijloc), unde departajarea din C a căzut spre colțul opus:

![2368 376->76 arc: green = C, red = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Tot restul se potrivește în limita toleranței — aceeași casetă de încadrare (608×148), poziții de noduri,
etichete, vârfuri de săgeată și toate celelalte muchii. Randările complete sunt vizual
indistinguibile:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 rendered by C Graphviz](/img/2368-c.png) | ![2368 rendered by @knowvah/dot-engine](/img/2368-port.png) |

Portarea folosește o departajare **echivariantă la translație** (o egalitate adevărată se rezolvă
întotdeauna la primul index), deci desenează *fiecare* astfel de arc la fel, indiferent de
poziție — este auto-consecventă și se potrivește cu C pe arcele unde zgomotul din C
păstrează tot primul (de ex. `256->436` și `241_0 5:ne->8:nw`), divergând doar acolo unde zgomotul din C
înclină în cealaltă parte (`376->76`). Capetele, ținta vârfului de săgeată, celelalte
muchii, toate nodurile, etichetele și caseta de încadrare se potrivesc în limita toleranței; doar
punctele de control interioare ale unui singur arc se mișcă (~1–2 pt la burtă).

**De ce este acceptată.** `hypot`-ul Apple nu este mai reproductibil între motoarele JS și
CPU-uri decât FMA/`pow` de la **A1** — este aceeași constrângere de portabilitate, doar
în rutatorul de spline-uri din `dot`. Potrivirea alegerii din C, *dependentă de poziție*, ar însemna
adoptarea departajării stricte din C, care se află într-o **primitivă comună** prin care trece fiecare muchie
rutată: aceasta ar schimba potrivirea `376->76` pentru *noi* nepotriviri pe
arcele unde C cade în cealaltă parte (ar regresa `241_0` și un caz de oracol cu
muchie plată `cnt=3`), un echilibru net nul, care sacrifică și
echivarianța la translație a portării. Așadar păstrăm rutatorul consecvent (echivariant). Aceasta este
o diferență `dot` mărginită, sub pragul perceptibil — nu un defect deschis. Investigația completă:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oracol într-o stare recunoscută ca defectă (familia init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Afectate:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Membrii
familiei `1939` și `2825` sunt **conformi** și nu au nicio intrare, iar `2470`
și `graphs-structs` li s-au alăturat pe 2026-07-11 (ambele au colapsat la conforme
după ce au intrat remedierile ortho adjacency-spill/chancmpid, fmadd `polylineMidpoint` și
rotunjirea la egalitate către par — portarea reproduce acum exact ieșirea de recuperare a oracolului,
inclusiv aceleași muchii pierdute); intrările lor
de acceptare sunt retrase.

`1581` și `2825` au fost cazuri de recuperare după prăbușire (misiunea fix-element-count-bucket):
intrări de tip fuzzer/degenerate pentru care testele upstream afirmă **doar**
că dot nu se prăbușește (`test_1581`: nicio încălcare ASan; `test_2825`: nicio
prăbușire când `rebuild_vlists` returnează -1). C întâlnește un `Error:` intern
(`install_in_rank` / `rebuild_vlists: lead is null`) și recuperarea sa
aruncă conținutul aranjării; portarea ajunge la **aceleași decizii de ștergere a rankset-urilor**
(paritatea avertismentelor verificată: aceleași nume de nod/graf în
avertismentele „already in a rankset” din `mark_clusters`, cluster.c:317-320).

`2825` este acum complet închisă. Misiunea fix-2825-rebuild-vlists (după 1581)
a închis mai întâi diferența cu un strat: portarea ajunge la starea de eroare internă *exactă* a lui C
— stderr identic octet cu octet, inclusiv ordinea mesajelor
(`Error: rebuild_vlists: lead is null for rank 1`, apoi continuarea
`agerr(AGPREV, ...)` fără prefix `concentrate=true may not work
correctly.`) — cu `dotLayoutPipeline` propagând corect
eșecul lui `dot_position` pentru a sări peste `dot_splines`/`dotneato_postprocess`,
potrivindu-se cu `dotLayout` din C (`if (r != 0) return r;` după `dot_position`,
dotinit.c:322-325). O continuare (partea 2) a închis apoi diferența rămasă
din stratul de randare: `emit_node` din C condiționează fiecare nod de `node_in_box(n,
job->clip)` (emit.c:1806-1809), iar pe această cale de abandonare `job->clip` este
degenerat pentru că `GD_bb` nu a fost niciodată setat de `set_aspect` (în
coada sărită a lui `dot_position`) — deci C emite *zero* noduri, doar cadrele de cluster
(de asemenea degenerate). Portarea a preluat aceeași poartă `node_in_box`
(`src/gvc/device.ts:renderNode`, folosind `job.bb`/`job.pad` ca echivalent pe pagină unică
al lui `job->clip`) și a încetat să recalculeze un bbox
plauzibil din pozițiile live ale nodurilor când `g.info.bb` nu este setat
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` ad litteram, oglindind
`gvc->bb = GD_bb(g)` din `init_gvc`, emit.c:3272) — fiecare motor de aranjare
își setează deja singur `g.info.bb` înainte ca `render()` să ruleze pe fiecare cale
fără abandonare, deci aceasta este identică octet cu octet pe grafurile sănătoase și schimbă ieșirea
doar pe această cale de abandonare. `2825` este acum `conformant` (ieșire cu 4 elemente,
identică octet cu octet cu oracolul). Vedeți
`.agent-notes/2825-rebuild-vlists-abort.md` pentru urmărirea completă a mecanismului
ambelor părți. `1581` nu ajunge niciodată în starea inconsistentă (un
*alt* defect upstream al ferestrei de cluster, nu `rebuild_vlists`), deci își
aranjează integral graful supraviețuitor — acea diferență rămâne deschisă. Ieșirea oracolului
pe `1581` este reziduu de recuperare, fără semantică definită upstream. Dovadă:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Pe
fiecare dintre aceste intrări **oracolul C** este cel defect, după propria
mărturisire a graphviz: `2471`, `1939` și `1435` sunt
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issue-urile
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); singura încercare de
remediere, [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
rămâne un draft nefuzionat (ultima editare 2026-03-20). `graphs-structs` este
vechea clasă de pierdere a rutării pentru înregistrări (#102/#242/#274/#1323) pe care
graphviz stabil 15.0.0 o randează corect — o regresie a oracolului din build-ul de dezvoltare.

**Ce face C.** Pe membrii `init_rank` (`2796`, `2471`, `1939`),
graful auxiliar al coordonatei x din dot nativ închide un ciclu orientat prin
muchiile de constrângere ale pereților de cluster; funcția sa
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
nu poate parcurge fiecare nod, afișează `Error: trouble in init_rank`, iar
aranjarea continuă din acea stare de recuperare — pe `2471`/`2796` sfârșind în
reziduuri de triangulare `Pshortestpath` și muchii pierdute. Pe `1435` și
`graphs-structs` etapa defectă este pathplan însuși (fundături ale triangulării prin
tăierea urechilor; o muchie de port de înregistrare pierdută).

**Intrări verificate, apoi făcute fidele (aceasta este partea esențială).**
Misiunea `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
a extras linie cu linie graful de constrângeri pe care ambele părți îl dau lui network simplex,
pentru fiecare membru al familiei — și a constatat că comportamentul „curat” anterior al portării pe
această familie provenea din **patru defecte autentice ale portării**, toate remediate:

1. `flatEdges` sărea peste apelul din C la
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333),
   lăsând ferestrele de rang ale clusterelor învechite după inserarea vnode-urilor de etichetă plată
   (doar aceasta făcea ca portarea să piardă **9** muchii pe `2471`, unde C
   pierde 6).
2. Penalizarea de muchie cu același `group` se declanșa pe bucle proprii în loc de
   capete din același grup nevid
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` folosea valoarea `_WIN32` din C, 100; platforma oracolului folosește 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. O fundătură de triangulare întrerupea `Pshortestpath` în loc de
   avertizare-și-continuare + revenirea la linie dreaptă din C
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

După remediere, extragerile constrângerilor NS ale familiei sunt **identice linie cu linie** cu C
(253 de apeluri rank2 pe `2471`; toate apelurile pe `1939`/`1435`/`graphs-structs`),
iar portarea urmează C prin recuperarea recunoscută ca defectă: aceleași
muchii pierdute (`3->16` pe 2796; aceleași 6 pe 2471), aceleași arbori de elemente.
`1939` a devenit complet conformă. Diferențele numerice reziduale (și reziduurile pathplan diferite
ale lui 1435) sunt comportament *în interiorul* stării de recuperare, pe care politica
proiectului alege în mod deliberat să nu-l urmărească.

**`2723` (segfault; fixat, nu urmărit).** `dot` nativ face segfault (cod de ieșire 139)
pe `tests/2723.dot` (neorientat, grupuri `rank=same`, muchii cu etichete), deci C nu are
ieșire cu care să ne potrivim. [Issue-ul upstream #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) este deschis, iar
`tests/test_regression.py:test_2723` este `xfail`. Portarea aruncă
`InternalError` (`INTERNAL_ERROR`, cu o cauză `TypeError` din
`src/layout/dot/flat.ts:flatLabelYpos`, unde `rank[r-1]` este nedefinit). Fără
un oracol corect, eșecul onest rămâne, iar portarea nu este schimbată;
`src/layout/dot/flat-2723.test.ts` îl fixează. Actualizați acel test dacă upstream remediază
problema.

**Notă de politică.** Poziția anterioară pentru A4 („portarea îndeplinește
așteptările issue-ului; nu replicați”) se baza pe convingerea că graful auxiliar aciclic al portării
provenea dintr-o variantă locală benignă. Nu a fost așa — provenea
din defectul (1), care a rătăcit demonstrabil `2471`. Fidelitatea față de sursa
C a câștigat: portarea reproduce acum rezultatele recunoscute ca defecte ale lui C pornind de la
intrări verificate ca identice, iar fiecare intrare de aici trebuie **remăsurată
când upstream remediază issue-ul corespunzător** (ieșirea oracolului
se va schimba; așteptați-vă ca aceste id-uri să se aprindă ca regresii la acea actualizare — aceasta
este intenționat, nu degradare).

**Dovezi.** Pagini de comparare pe id (randări alăturate + înregistrări de dovezi):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(baza dinaintea remedierii păstrată la
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Artefacte de diagnostic: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Octeți de intrare invalizi (reprezentarea codificării) {#a5-invalid-input-bytes-encoding-representation}

**Afectate:** `1367` (diverged, maxΔ 0 — exact o singură diferență structurală).

**Ce diferă.** Fișierul de intrare conține un octet final UTF-8 gol (`0x80`)
în interiorul unui nume de nod. C tratează octeții finali goi 0x80–0xBF drept „caractere
valide care se reprezintă pe ele însele” (`lib/common/utils.c:1200-1207`, fără
avertisment), iar textul `<title>` al numelui de nod ocolește complet conversia setului de caractere
(octeții `agnameof` ajung direct la `gvputs_xml`). SVG-ul oracolului conține deci octetul brut și
**nu este UTF-8 valid**, în ciuda codificării declarate. Portarea decodează intrarea
UTF-8 invalidă cu alternativa latin1
(`0x80 → U+0080`) și emite UTF-8 bine format (`\xc2\x80`).

**De ce este acceptată.** Granița de I/O a portării o reprezintă șirurile JS (bibliotecă pentru browser).
Un octet brut invalid nu poate parcurge dus-întors valoarea șir returnată de `renderSvg`;
potrivirea octet cu octet cu C ar însemna coruperea codificării ieșirii pentru fiecare
consumator. Alternativa latin1 oglindește propria semantică de recuperare din C, „tratat ca Latin-1”
(`utils.c:1249`). Aceasta este o constrângere de sub cod — stratul de
reprezentare — nu un comportament portabil pe care am refuzat să-l portăm.
Tot restul din 1367 este conform: numărul de elemente (23 polyline /
103 text / 44 polygon / 24 path) și toate coordonatele se potrivesc după
remedierea decorate (T6).

**Dovadă.**
Pagina de comparare [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(randare alăturată + înregistrare de dovezi).

---

### A6. Depășirea pânzei `unsigned int` pe intrare degenerată {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Afectate:** `1314` — o intrare derivată dintr-un fuzzer (`fontsize="991836031967s8"`)
a cărei dimensiune absurdă a fontului umflă desenul la ~2.75e11 pt.

**Ce se întâmplă.** C stochează `job->width` / `job->height` ca **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` aplicat dimensiunii uriașe în puncte (`emit.c:1249-1250`)
depășește 32 de biți și se înfășoară modulo 2³², iar backend-ul SVG o emite printr-un `%d`
**cu semn** (`gvrender_core_svg.c:258-259`) — astfel C tipărește
`height="-425618343"`. Portarea păstrează valoarea consecventă matematic (neînfășurată).
Orice altă valoare — `cx/cy/rx/ry` ale elipsei nodului, `translate` rădăcină,
poligonul, `font-size` al textului — este identică octet cu octet; diferă doar
width/height ale elementului `<svg>` de nivel superior.

**De ce nu o urmărim.** Replicarea depășirii de întregi pe 32 de biți din C nu este un comportament
de aranjare care merită portat, iar intrarea este degenerată. Reluați dacă upstream
remediază depășirea (de ex. lărgește câmpul sau limitează dimensiunea).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Aranjare degenerată NaN (`sfdp`, `repulsiveforce` patologic) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Afectate:** `2556` — `repulsiveforce=100` (⇒ forța de respingere folosește
`pow(dist, 101)`), ceea ce duce solverul spring-electrical la **NaN în ambele
motoare**. Oracolul nativ însuși emite toate pozițiile nodurilor/muchiilor ca `nan` și o casetă de
încadrare degenerată.

**Ce se întâmplă.** Cu fiecare coordonată NaN, cele două implementări serializează
reziduul diferit: (1) bb-ul grafului / poligonul de fundal — C rotunjește `NaN`
la `int`, ceea ce pe arm64 produce reziduuri la scara `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); portarea păstrează `0`. (2) Operațiile de desenare ale muchiilor — pasul de emitere al
nativului suprimă `_draw_`/`_hdraw_` pentru un spline NaN (emițând doar `pos`),
în timp ce portarea le emite cu puncte de control NaN. Desenele nodurilor se potrivesc (ambele
le suprimă). Pe niciuna dintre părți nu există o aranjare reală.

**De ce nu o urmărim.** Portarea reproduce deja *aceeași* explozie NaN ca
nativul — remedierea care a dus-o acolo este autentică (vedeți mai jos); rămâne doar
modul în care fiecare serializează reziduul NaN. Replicarea comportamentului nedefinit `(int)NaN` din C
și a suprimării desenării spline-urilor NaN nu înseamnă fidelitate de aranjare pe o intrare
a cărei aranjare este degenerată în ambele motoare. Reluați dacă upstream limitează
`repulsiveforce` sau curăță pozițiile NaN.

**Remedieri ale portării care au făcut acest caz accesibil (nu eludate — defecte reale).** Înainte de
acestea, portarea nici măcar nu putea ajunge în starea degenerată: (1) `armPow`
(`src/common/arm-pow.ts`) arunca excepție la orice argument din afara căii rapide; acum portează
întreaga ramură de cazuri speciale din `pow.c` ARM, astfel că `pow(NaN, y) = NaN`, ca în libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) intra într-o buclă infinită pe puncte de control NaN
deoarece testul său de convergență era negația naivă a lui `while (ABS > .5)` din C
(echivalentă pentru valori finite, nu pentru NaN); acum oglindește exact C și
se termină pe NaN. Ambele sunt fidele lui C și afectează doar intrările NaN.

---

### A7. Limita de rotunjire `round()` a peretelui casetei (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Afectate:** `graphs-honda-tokoro` și (adăugat 2026-07-28, nou în universul de
905 elemente) fratele său din `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(ambele structural-match, maxΔ ≈ 1 pt pe singura muchie `n012->n011`). Fratele
diferă doar prin atributele `samearrowhead`, care nu ating rutarea acestei perechi —
geometria sa `n012->n011` este identică octet cu octet cu id-ul acceptat pe
ambele părți, portare și oracol, deci mecanismul de mai jos se transferă ad litteram.

**Ce diferă.** Peretele casetei coridorului de cap din `maximal_bbox` ajunge la x intern
=90 în C față de x=89 în portare pentru portul `samehead` comun al celor două
paralele `n012->n011`. Construcția portului comun (`buildSharedPort`) și
gruparea paralelelor sunt ambele conforme octet cu octet cu C; diferența de 1 px este strict un
artefact de limită de rotunjire `round()` — ~1e-14 de zgomot în virgulă mobilă din amonte
împinge o valoare aflată exact pe o limită `.5` către întregul vecin.
Formula `maximal_bbox` a portării oglindește deja exact formula din C.

**De ce nu o urmărim.** `round()` este o primitivă prin care trece fiecare muchie rutată din
corpus; ajustarea comportamentului său la limită pentru a se potrivi cu acest caz este un
risc de regresie la nivelul întregului corpus pentru 1 px pe 2 muchii — aceeași constrângere de primitivă comună
ca la rotunjirea învelișului convex al punctelor de control menționată în
`bbox-class-control-hull-vs-curve`. Diagnostic complet:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Rotunjirea `fp-contract`/FMA față de IEEE strict (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Clasă.** clang arm64 compilează binarul oracolului cu `-ffp-contract=on`,
fuzionând anumite secvențe de înmulțire-adunare în instrucțiuni FMA unice;
portarea rulează pe V8, care efectuează rotunjire strictă IEEE-754 și nu poate emite
`fma`. Pe intrări identice bit cu bit, cele două diferă cu 1-2 ULP în orice
expresie pe care compilatorul a ales să o contracteze. Partea portării este întotdeauna
rezultatul IEEE-754 strict; partea oracolului este întotdeauna rezultatul
contractat prin FMA. Aceasta este o constrângere de portabilitate compilator/mediu de execuție, aflată sub
semantica codului sursă C, nu un defect de logică al portării — ireductibilă fără
emularea în software a alegerilor specifice de contracție ale lui clang. Se cunosc două instanțe,
în două locuri diferite, cu două mecanisme de amplificare diferite:

- **2646** — ULP-ul apare în interiorul rezolvării cubice `points2coeff`/`solve3` din
  `Proutespline` și inversează direct numărul de rădăcini ale potrivitorului de spline-uri.
- **2620** — ULP-ul apare în bucla de extindere a vârfurilor poligonului din `poly_init`
  (dimensionarea nodurilor) și este amplificat în aval de trunchierea fidelă la întreg, la fiecare relaxare,
  din `ortho`, într-o inversare a unei egalități de cost egal între coridoare ale labirintului.

**Afectate:** `2646` (structural-match, maxΔ 42.09 pe 3 din 21.216 de muchii:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — toate
trasee lungi smode de tip port de înregistrare `:c->:nb_part`). Frate al lui **A3**: ambele
clase sunt egalități ireductibile de portabilitate în virgulă mobilă în interiorul lui
`Proutespline`, dar mecanismul este distinct — un artefact de compilator `fp-contract`,
nu `hypot` din libm.

**Ce diferă.** Pe toate cele trei muchii, doar apelul final `routesplines` (un
segment drept în portul de cap) diverge. Capătul său se află exact bit cu bit pe
peretele inferior al poligonului-barieră, cu tangenta paralelă cu acel perete
(`evs[1]=(1,-1.22e-16)`), deci fiecare candidat `splinefits` este tangent la
barieră la `t=1` — o rădăcină aproape dublă a cubicei de intersecție.
`points2coeff` calculează acea cubică printr-o anulare catastrofală (termeni
în jur de ~7446 prăbușindu-se la ~0.099). Oracolul (clang/arm64,
`-ffp-contract=on`) contractă `v3 + 3*v1 - (v0 + 3*v2)` în înmulțiri-adunări
fuzionate, în timp ce V8 efectuează rotunjire strictă IEEE — cele două diferă cu
~9.1e-13 pe **intrări identice bit cu bit**, iar acel zgomot inversează semnul
discriminantului `solve3`: C găsește 1 rădăcină (866.7, în interiorul segmentului); portarea
găsește 3 rădăcini, cu o rădăcină-partener falsă la `t=0.9999975 < 1-EPSILON2`. Rădăcina
falsă declanșează o iterație suplimentară de înjumătățire `a`, ceea ce inversează
magnitudinea tangentei piesei finale cu un factor de 2 (în ambele direcții pe
cele 3 muchii), producând maxΔ 42.09 după tăiere (26 de diferențe SVG).

**De ce este acceptată (ireductibilitate dovedită printr-un experiment controlat).** Toate cele șase
apeluri `routesplines` au fost extrase pe ambele părți — caseta, poligonul, `PL`, începutul,
sfârșitul și `evs` sunt identice octet cu octet, la fel ca spline-ul de ieșire al apelului anterior
(nefinal); singura divergență se află în `solve3` din apelul final. Un
harness C pur, de sine stătător, a izolat singura variabilă: compilarea cu
`-ffp-contract=off` reproduce **portarea** exact bit cu bit pe toate cele 3 muchii;
contracția implicită (`on`) reproduce **oracolul** exact bit cu bit pe toate cele 3
muchii. Portarea este deci deja de acord cu C în IEEE-754 strict; divergența
este în întregime alegerea de contracție FMA a compilatorului oracolului, sub
semantica codului sursă C — nu există nicio infidelitate la nivel de sursă de remediat. O
remediere țintită (emularea de mână a contracției în `points2coeff`) a fost încercată și
infirmată: corectează 2 din cele 3 muchii, dar nu pe a treia, a cărei inversare
își are originea în contracția internă a lui `solve3`. O remediere completă ar
cere emulare FMA în software în tot potrivitorul de spline-uri — un cost în bucla critică,
cu o rază de impact de rotunjire la nivelul întregului corpus, pentru un câștig sub-pixel pe 3 muchii.
Diagnostic complet: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Afectate (istoric):** `2620` (a fost structural-match, maxΔ 585; 423 de diferențe
pe 24 de trasee de muchii + 22 de vârfuri de săgeată). **A colapsat la conformă pe 2026-07-11**:
portarea fidelă a revărsării bufferului de adiacență `sgraph` + a conținerii bidirecționale
`chancmpid` (vedeți `.agent-notes/ortho-maze-circo-rca.md`) a eliminat
divergența; intrarea de acceptare este retrasă, iar această secțiune este păstrată ca
documentație a clasei A8.

**Ce diferă.** Conducta `ortho` (`splines=ortho`) este conformă octet cu octet
cu C la intrări identice — dovedit prin injectarea intrării exacte a labirintului din C
(coordonate, `xsize`/`ysize`) în etapa ortho a portării: 378/378 segmente rutate
ies identice octet cu octet, deci nimic din `src/ortho` nu este vinovat.
Divergența reală este de 1-2 ULP în *intrarea* labirintului: `ysize` al nodului (și, prin
acumulare în interiorul rangului, `ND_coord.y`) calculat în bucla de extindere a vârfurilor poligonului
din `poly_init` al lui C (`shapes.c`), care sub
`-ffp-contract=on` fuzionează `R.x += sidelength*cosx` într-un FMA cu ~1
ULP mai mare decât aritmetica strict IEEE a portării (ambele părți implementează
expresia identică aritmetic). `2620` are 173 de noduri poligonale cu lățime
fracționară; toate arată C ≥ portare cu 1-2 ULP. Acel ULP este amplificat — nu
introdus — de relaxarea Dijkstra din `ortho`, care trunchiază fidel distanța
curentă la fiecare pas (`sgraph.c:165`, oglindită de portare ca
`Math.trunc`) peste ponderi derivate din extinderile brute ale celulelor
(`maze.c:257`). Geometria deplasată cu un ULP inversează o egalitate de coridor cu cost egal
pentru 4 muchii rutate (trasee + vârfurile lor de săgeată); diferențele rămase sunt
renumerotări ±1 de pistă, în cascadă după acele 4 inversări.

**De ce este acceptată (ireductibilitate dovedită printr-un experiment controlat).** Un
harness C de sine stătător, variind doar `-ffp-contract`, a reprodus ambele părți pe
vârful divergent al hexagonului: `-ffp-contract=on` → `310.29250168188713`
(se potrivește cu oracolul), `-ffp-contract=off` → `310.29250168188707` (se potrivește cu
portarea), cu operația divergentă izolată la vârful `i=3`
(`R.x=-0.50000000000000011` fuzionat față de `-0.5` nefuzionat). Un al doilea
experiment de injectare a intrării (singura variabilă: valorile de intrare ortho) a confirmat
amplificatorul: alimentarea `orthoEdges` al portării cu `coord`/`xsize`/`ysize` exacte din C
reduce la 0 toate cele 4 divergențe de coridor — codul ortho
nu are defect, este doar sensibil (ca și rutarea cu cost de labirint din C) la o deplasare
de 1-2 ULP a intrării. Potrivirea ar însemna emularea contracției FMA specifice a lui
clang pentru un arbore de expresii compilat din `poly_init` —
urmărirea unui artefact compilat, nu portarea semanticii sursei.
Diagnostic complet: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Excepție emulată (neacceptată): `triang.c:ccw`.** Un loc de contracție
ESTE reprodus bit cu bit în loc să fie acceptat: `ccw` din pathplan
compilează în `fnmul`+`fmadd` (primul produs exact − al doilea rotunjit), astfel că un
punct de interogare egal bit cu bit cu un capăt de segment testează ISCW/ISCCW în loc de
ISON. `shortest.c:pointintri` respinge apoi capetele aflate în vârfurile poligonului
(„destination point not in any triangle”), iar `makeMultiSpline` revine
la rutarea simplă pentru fiecare ciclu de lungime 2 coalescent — un comportament mare, discret,
la nivelul întregului corpus, pe care portarea trebuie să-l potrivească. Spre deosebire de locurile
`solve3`/`poly_init` de mai sus (adânc în arbori de expresii compilați, remediere infirmată), `ccw` este
o singură funcție compilată de sine stătătoare, cu semantică curată, deci
`src/pathplan/triang.ts` o emulează: cale rapidă în dublă precizie simplă cu o
margine de eroare conservatoare acolo unde semnele simplu și fuzionat coincid demonstrabil, și
o cale exactă cu produs Dekker + BigInt diadic pentru cazurile apropiate de zero.

---

### A9. Trigonometrie libm cu 1-ULP → inversarea egalității cocirculare CDT (multispline `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Clasă.** `Math.sin`/`Math.cos` din V8 nu sunt identice bit cu bit cu `sin`/`cos`
din libm Apple (dovedit: dezacord de 1 ULP la `2π·4.5/8`, unul dintre cele opt
unghiuri de colț ale obstacolului-elipsă). Colțurile octogonului circumscris din `makeObstacle`
moștenesc acel ULP, astfel că de coordonatele de intrare ale rutatorului cu triunghiuri diferă de
cele ale oracolului cu ≤6e-14. Aranjările simetrice (noduri de aceeași dimensiune pe un rang/inel) fac
patrulaterele rutatorului **exact cocirculare** în aritmetica reală, deci predicatul exact de
incircle se află pe muchie de cuțit: ULP-ul de intrare îi inversează semnul,
diagonala Delaunay constrânsă se inversează, iar poligonul de coridor care eșuează la
`Pshortestpath` în oracol („destination point not in any triangle” →
revenire la spline simplu) reușește în portare (sau invers). Spline-urile rezultate
diferă cu ~0.2–0.5pt. Frate al lui **A3**/**A8**: o constrângere ireductibilă de
portabilitate în virgulă mobilă, aflată sub semantica sursei C — potrivirea
ar cere reproducerea în JS a rotunjirii exacte `sin`/`cos` din libm Apple.

**Afectate:** `241_0` (circo Δ≈0.2 / twopi pânză Δ≈9 prin inversarea coridorului
pe muchia `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
câte 1–2 diferențe de poziție a etichetelor de muchie — ULP-ul libm de 1 apare în
trigonometria vârfurilor unitare din `poly_init` (`hypot`/`atan2`/`sin`), aduce înălțimea
calculată a unui nod cu un ULP dincolo de limitarea la dimensiunea minimă pe care oracolul
o atinge exact, și se propagă prin `floor()` în încărcarea R-tree pentru xlabel într-o
singură inversare de candidat de etichetă. O remediere cu hypot corect rotunjit a fost încercată și
INFIRMATĂ: a remediat `2343`, dar a regresat `2168_3`, a cărui dimensionare de octogon
trece prin același apel în care valoarea oracolului NU este cea corect
rotunjită — nicio politică deterministă de hypot nu se potrivește cu oracolul pe ambele).
`2168_1` stătea inițial în această clasă, dar a devenit
conformă odată ce portarea a emulat `ccw`-ul cu fp-contract al oracolului
(pathplan `triang.ts`): eșecul său de coridor este guvernat de respingerea cu FMA a capetelor-vârf în
`pointintri`, pe care portarea o reproduce acum
bit cu bit, deci egalitatea de ULP a diagonalei CDT nu mai apare acolo.

**De ce este acceptată (ireductibilitate dovedită printr-un experiment controlat).**
CDT-ul însuși este exonerat: `mkSurface` al portării este o portare fidelă a inserției incrementale din GTS
0.7.6 (`cdt.c`: împărțire 1→3 + `swap_if_in_circle` recursiv, muchiile de constrângere
pre-create și nepermutabile, impunerea constrângerilor prin
`remove_intersected_*` + `triangulate_polygon`), iar
un harness C de sine stătător care leagă **biblioteca GTS reală** și primește intrările
exacte bit cu bit ale rutatorului din portare reproduce triangularea portării față cu față
(2168_1: 22/22; 241_0: 185/185). Evaluarea în numere raționale exacte a determinantului
incircle pe cele două seturi de intrare confirmă inversarea semnului (+1 cu intrările
portării, −1 cu cele ale oracolului). Variabila reziduală — diferența de 1 ULP la
trigonometrie — a fost izolată prin compararea directă a tiparelor de biți `Math.sin`/`sin`.

**Acceptarea pe flux de motor (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **Fluxurile xdot de motor** twopi/circo
(`parity-twopi.json` / `parity-circo.json`, oracol nativ `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, comparație semantică a operațiilor de desenare la
±0.01 — vedeți `test/golden/compare-xdot.ts`) scot la iveală același mecanism,
independent de sondajul SVG al motorului dot citat mai sus: twopi `2239` (1
diferență de operație de desenare — inversarea poziției textului etichetei `_ldraw_` a muchiei, același
ULP de trigonometrie a vârfurilor unitare din `poly_init` propagat prin lanțul R-tree xlabel cu `floor()`;
`2343`, `share-b29` și `windows-b29`, acceptate inițial
sub această intrare, au fost *remediate* pe 2026-07-11 prin contracția fmadd fidelă din
`polylineMidpoint` — vedeți paragraful familiei b29 de mai jos) și circo `241_0` (41
de diferențe de operații de desenare, Δ≈0.2pt pe bezier-ul rutat al muchiei `1->2` — aceeași
inversare de coridor prin diagonala CDT; jurnalul de decizii, intrarea din 2026-07-10 „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”). Acceptate la nivelul fluxului de motor prin
`test/corpus/accepted-divergences-engines.json`, îmbinat în
`PARITY-twopi.md`/`PARITY-circo.md` de `parity-report.ts` — aceeași îmbinare pe care
o execută `accepted.ts` pentru `PARITY-dot.md` al fluxului dot.

**circo `2475_2` — egalitate hypot cocirculară la closestNode.** Într-o componentă
de 28 de noduri a acestui graf de 10762 de noduri, `getRotation` din circo
(`circpos.c:73-92`) alege nodul blocului cel mai apropiat de originea aranjării prin
`hypot`, pentru a decide rotația sub-blocului. Două noduri cocirculare sunt
practic echidistante; `Math.hypot` din V8, corect rotunjit, și `hypot` din libm Apple
rotunjesc acea distanță la 2 ULP unul de celălalt, ceea ce inversează `<` strict,
selectează alt nod și rotește/reflectă sub-blocul cu ~20° (18 noduri
se mută, maxim 296.7pt; celelalte 10744 de noduri sunt identice bit cu bit, la fel ca
arborele de blocuri, ordinea cercului și fiecare `centerAngle`). Politica CR-hypot a fost
deja infirmată pentru această clasă (2026-07-10). Reproducere de sine stătătoare:
`.agent-notes/circo-2475-590-repro.dot`; analiza completă a cauzei rădăcină:
`.agent-notes/circo-b81-2475-rca.md` (acceptat 2026-07-11).

**twopi `2470` — ULP la coordonata radială amplificat de R-tree-ul xlabel.**
2470 este un graf cu 140 de muchii ale cărui etichete de muchie HTML `<table>` se grupează
pe ancore radiale aproape coincidente. În familia neato, etichetele de muchie sunt plasate
ca etichete externe de plasatorul xlabel lacom (`label/xlabels.c`), care
alege colțul candidat cu cea mai mică suprapunere printr-un R-tree ordonat Hilbert.
Spline-urile și coordonatele nodurilor portării se potrivesc cu oracolul la precizia de emitere
(zero diferențe de spline/nod/bbox chiar și la 1e-7), dar `ND_coord.y` radial al unui nod
diferă cu ~2 ULP (`sin`/`cos` din libm Apple față de `Math` din V8) — mult
sub pragul de conformitate, dar se așază pe limita `floor(pos.y − sz.y/2)`
exact la 0 în `objplpmks`, inversând dreptunghiul R-tree al acelui obiect cu
o unitate. Schimbarea ordinii Hilbert/grupării arborelui face ca `RTreeSearch` să elagheze
o altă ramură, astfel că ~140 de etichete se așază fiecare pe colțul candidat vecin
(fiecare diferență fiind un pas fix (+lățime, −înălțime de linie)). Plasatorul, ordinea
obiectelor, rotunjirea dreptunghiurilor, `CombineRect` (care oglindește fidel particularitatea
min-min din C) și cheia Hilbert int32 au fost verificate fiecare ca fidele; divergența
este ULP-ul trigonometriei radiale din amonte, ireductibil din același motiv
ca twopi `1855`. Acceptat 2026-07-11; analiza completă a cauzei rădăcină:
`.agent-notes/twopi-2470-rca.md` (care documentează și faptul că „trecerea”
id-ului de dimineață a fost un artefact al unui binar de oracol învechit, nu o regresie
a portării).

**osage `1855` — împrăștiere fp-contract la vârfurile obstacolelor.** Distinct de intrarea twopi
`1855` cu oglindire radială de mai sus: sub osage centrele nodurilor sunt exacte bit cu bit față de
oracol, iar cele 110 diferențe de operații de desenare sunt trei muchii rutate în jurul obstacolelor
plasate pe partea în oglindă a unui rând de noduri (X exact bit cu bit, Y în oglindă). Vârfurile
octogonului-obstacol din
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) diferă
de C cu 3–4 ULP deoarece `-ffp-contract=on` din clang fuzionează lanțurile `a·b±c`
din `ellipse_tangent_slope`/`line_intersection` în FMA-uri cu o singură rotunjire,
în timp ce V8 rotunjește fiecare operație: rotunjirea fuzionată din C prăbușește o coloană de culoar
cu valori x ale colțurilor într-un singur dublu identic bit cu bit (exact coliniar),
iar cea a portării o împarte în două valori la 1 ULP distanță. Aceasta inversează testul de tangență
de vizibilitate `clear()` — culoarul nu mai este blocat — adăugând ~20
de muchii de vizibilitate, iar Dijkstra rezolvă egalitatea de homotopie sus/jos spre
partea în oglindă. Experiment controlat: injectarea coordonatelor exacte ale obstacolelor din C în
portarea altfel neatinsă dă **zero** muchii divergente, exonerând complet lanțul
aranjării legale, al vizibilității, al Dijkstra și al spline-urilor; injectarea doar a `cos`/`sin` libm din C nu are niciun efect. Acceptat
2026-07-11; analiza completă a cauzei rădăcină: `.agent-notes/osage-spline-family-rca.md`.

**Familia b29 (twopi).** Cele patru variante b29 împart o singură muchie de cuțit:
eticheta de muchie `EqmtTyp` (`Node14732->Node14731`) se află pe o egalitate exactă la selecția laturii în placeLabels,
al cărei rezultat depinde de deriva de 1 ULP a aranjării twopi în
obiectele din jur. Cu contracția fmadd fidelă din
`polylineMidpoint` (remedierea familiei states, 2026-07-11), ancora etichetei portării
este identică bit cu bit cu cea a oracolului, dar egalitatea se rezolvă totuși invers pe
două dintre cele patru variante (`graphs-b29`, `linux.i386-b29`), în timp ce celelalte
două (`share-b29`, `windows-b29`) sunt acum conforme — iar diferența de etichetă A9 acceptată pentru `2343` a dispărut complet. Limită: 1 operație de desenare, Δ12pt la y-ul etichetei. Ireductibilă
fără eliminarea derivei din amonte. Analiza completă a cauzei rădăcină:
`.agent-notes/twopi-states-rca.md`.

Aceeași muchie de cuțit din placeLabels apare pe fluxul **osage** (acceptat
2026-07-11, analiza completă a cauzei rădăcină: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` și `share-b29` (câte 2 diferențe de operații de desenare — ancora x a unei etichete de muchie
ajunge la 878.28 față de 841.06, plasată simetric față de
mijlocul spline-ului identic bit cu bit 859.67, adică ±jumătate din lățimea etichetei; cele două
variante se oglindesc una pe alta) și `1652` (2 diferențe de operații de desenare — două muchii inversează
fiecare câte o ancoră de etichetă în jurul unui mijloc identic, una pe x și una pe y,
cu spline-uri și vârfuri de săgeată identice bit cu bit; oracolul randează complet,
deci nu este instabilitatea cunoscută de timeout nativ). În fiecare caz
geometria muchiilor este exactă bit cu bit și doar egalitatea de selecție a laturii etichetei se rezolvă
invers, pe un mediu derivat cu 1 ULP.

Fluxul osage poartă tripletul `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; acceptat 2026-07-11, analiza completă a cauzei rădăcină în
`.agent-notes/patchwork-tail-rca.md`): singura operație divergentă este
transcendenta simplă `cos(π+θ)` la un vârf cu orientare 180 al unui patrulater distorsionat —
`Math.cos` din V8 este corect rotunjit, în timp ce `cos` din libm Apple poartă o
eroare de ±1 ULP dependentă de argument (deci doar sub libm `|cos(π+θ)| ≠
|cos(θ)|`); diferența de 1 ULP la dimensiunea nodului alimentează `GRID`/`ceil` din pack, înclină o
egalitate de perimetru, iar qsort plasează două componente în celulele de împachetare una
alteia — o schimbare rigidă a unui nod întreg, fără eroare de formă sau de rutare. Nicio
rescriere deterministă nu poate reproduce o transcendentă libm care nu este corect
rotunjită, forma de manual a lui A9.

Același mecanism a fost confirmat pe 2026-07-28 pe fratele mai mare
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nou în
universul de 905 elemente; 112 diferențe de operații de desenare, doar osage). Operația divergentă
este același loc de 1 ULP al lui `cos(π+θ)` pentru nodul `9004` — valorile `bb.x` din C și din portare
se potrivesc octet cu octet cu analiza cauzei rădăcină originală — dar pe această intrare cu 76 de noduri
propagarea trece prin `arrayRects` din osage: `acmpf` sortează celulele de împachetare
după suma brută `width+height`, iar lățimea cu 1 ULP mai mare din libm face ca
`9004` să se sorteze strict înaintea fraților săi rotiți `9000/9002/9006`, în timp ce
valoarea corect rotunjită din V8 lasă o egalitate exactă în 4 pe care qsort-ul
instabil o ordonează diferit — celule diferite pe rânduri, o
schimbare `9002`/`9006` și o cascadă `fmax` pe lățimea coloanelor care deplasează 8 vecini pe x.
Alimentarea `arrayRects` al portării cu dimensiunile nodurilor din C față de cele din portare
reproduce cele 10 noduri mutate ale sondajului cu delte x care se potrivesc octet cu octet,
închizând lanțul cauzal.

Alte două instanțe pe fluxuri de motor au fost elucidate până la cauza rădăcină și acceptate pe 2026-07-11
(analiza completă a cauzei rădăcină: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 diferențe de operații de desenare
— fratele intrării circo de mai sus: aceeași egalitate cocirculară incircle din CDT,
inversată de 1 ULP la `sin`/`cos` din libm, face ca coridorul multispline al portării să reușească cu un spline de 14 puncte, acolo unde build-ul nativ
revine la rutarea simplă de 8 puncte; deltele punctelor < 0.07pt) și circo
`windows-tree` (10 diferențe de operații de desenare pe o muchie de evantai — trigonometria de plasare din circo
aduce `node2.y` cu un singur ULP deasupra lui `node8.y` în jurul valorii exact simetrice 18.0, iar selecția portului de cap dyna din `closestSide` inversează TOP/BOTTOM la
acea egalitate exactă; pozițiile și casetele nodurilor sunt în rest identice bit cu bit cu
oracolul).

**Fluxul de motor sfdp — egalități FP la muchii (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Fluxul xdot de motor sfdp (`parity-sfdp.json`,
`dot -Ksfdp -Txdot` nativ, ±0.5) scoate la iveală egalitatea cocirculară incircle din CDT odată ce
pozițiile native exacte dinaintea rutării sunt injectate (deci divergența NU este
derivă iterativă — vedeți clasa A1-drift — ci o egalitate discretă de predicat):

- `42` și `241_0` — egalitate cocirculară incircle din CDT (coridorul multispline).
  Cu pozițiile injectate, reziduul este o **inversare a numărului de segmente**: `42`
  `opCount 5 vs 9` (muchia 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (muchia 3->2) — diagonala Delaunay constrânsă a portării se inversează față de
  oracol, astfel că coridorul multispline reușește cu un spline de N puncte acolo unde
  build-ul nativ revine la o rută simplă mai scurtă (sau invers), exact ca la
  intrarea twopi/circo `241_0` de mai sus. Portarea emulează deja contracția arm64
  `fmadd` în predicatul incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) și folosește Delaunay cu incircle robust; reziduul este
  ULP-ul de 1 al `sin`/`hypot` din V8 față de libm Apple în intrarea predicatului, pe care niciun
  cod portabil nu îl reproduce.

> **`2095` reclasificat A9 → A1-drift (2026-07-22).** Anterior era listat
> aici ca „fratele hypot” (derivă sub 0.7pt pe muchiile unui nod cu nume gol
> `""->"4"`). Acel rezidu a fost un **artefact al instrumentului**: regex-ul `GVTS_POS` al
> injectorului de atribuire cerea ≥1 caracter de nume, deci nodul cu numele `""` nu a fost niciodată
> injectat și își trăgea după el cele două muchii incidente. Cu injectorul remediat pentru a potrivi
> nume goale (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), sfdp `2095`
> se injectează la **0 rezidu** — derivă pură de forțe, acoperită de clasa A1-drift
> calculată, nu o egalitate FP de rutare. Acceptarea sa pe id a fost eliminată din
> `accepted-divergences-engines.json`. (Aceeași constatare ca la fdp `2095` mai jos.)

**Experiment controlat nou (2026-07-21).** O sondă `hypot` nativ-față-de-V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): compilarea
`hypot` din C-ul sistemului și compararea cu `Math.hypot` din Node pe intrări reprezentative
de deviație a muchiilor plate arată un dezacord de 1 ULP la 2 din 6 (Δ 7.1e-15 și
5.7e-14) — muchia de cuțit a pragului de împărțire care inversează numărul de subdiviziuni.
Ireductibil: niciun hypot portabil nu reproduce libm Apple (precedentul `arm-pow.ts`
pentru aceeași limită). Acceptat la nivelul fluxului de motor prin
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

Fluxul xdot de motor **fdp** (`parity-fdp.json`, `dot -Kfdp -Txdot` nativ,
±0.5) scoate la iveală ACEEAȘI egalitate cocirculară CDT pe același graf, `241_0`: cu
pozițiile exacte dinaintea rutării ale oracolului injectate, reziduul este de 11 diferențe numerice
`unfilled_bezier`, limitate la o singură muchie (`0->1#0`, maxΔ 3.39pt). Deoarece
pozițiile nodurilor sunt injectate identic, divergența este în aval, în
coridorul multispline din pathplan — aceeași egalitate incircle cu 1 ULP libm ca la
twopi/circo/sfdp `241_0` (incircle în numere raționale exacte 185/185 de mai sus). Pârghiile
sunt deja aplicate (`src/pathplan/triang.ts` fmadd, `Math.hypot` în `src/pathplan/route.ts:198`);
egalitatea este ireductibilă. Acceptat prin `accepted-divergences-engines.json`
`fdp.241_0`. În schimb, `2095` din fdp este **A1-drift, nu A9**: injectarea
singurului nod cu nume gol (după ce injectorul de atribuire a fost remediat pentru a potrivi
nodurile cu numele `""`) reduce rezidul la zero — „coada A9” de dinainte era
nodul gol neinjectat care își trăgea după el muchiile incidente. Acceptarea sfdp `2095` a avut
același punct orb — o regenerare nouă a atribuirii sfdp (2026-07-22) cu injectorul remediat
a confirmat că și aceasta se injectează la 0, iar acceptarea ei a fost eliminată (vedeți nota
`2095 reclassified` de mai sus).

---

## Coada lungă urmărită (atribute `dot` și cazuri-limită) {#tracked-long-tail-dot-attribute-edge-case}

La **valorile implicite**, motorul `dot` se potrivește cu binarul C în limita unei toleranțe
deterministe strânse pe corpusul golden (verdictul `conformant`; vedeți nota de la
început). Diferențele rămase sunt **coada lungă a atributelor și a
cazurilor-limită** — partea istoric dificilă a oricărei portări Graphviz. Spre deosebire de
diferențele acceptate de mai sus, acestea *vor* fi închise; sunt urmărite live, cu
numărători, în
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Categorie | Ce diferă |
|---|---|
| **path-structure** | Rutarea spline-urilor muchiilor în configurații specifice (de ex. unele cazuri cu muchii plate și coridoare dense). |
| **element-count** | O funcționalitate care emite mai multe/mai puține elemente SVG decât C în anumite grafuri. |
| **color-stroke** | Diferențe de emitere a contururilor/umpluturii pentru anumite atribute de stil. |
| **parser-gap** | Un număr mic de intrări DOT pe care parserul nu le acceptă încă pe deplin. |

Dacă graful dumneavoastră folosește doar atribute uzuale și motorul `dot`, sunteți aproape
sigur pe calea de potrivire cu toleranță deterministă. Dacă o aranjare pare greșită, consultați `PARITY-dot.md` pentru
acea clasă de intrări — este probabil un element urmărit, cu o misiune de remediere ancorată în oracol,
nu o necunoscută.

> **Notă despre cazurile dictate de etichete.** Clasa de măsurare a textului (A2) este închisă —
> niciun graf `dot` nu mai este acceptat sub ea. Un graf care se află astăzi la
> structural-match este o lacună urmărită, nu o diferență de metrică a fontului.

### Vârfurile de săgeată ale muchiilor opuse la `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Când `concentrate=true` îmbină o pereche antiparalelă (`A->B; B->A`) într-o singură
muchie supraviețuitoare, acea muchie trebuie să deseneze un vârf de săgeată la **ambele** capete. Aceasta este acum
portată (ramura `conc_opp_flag` din `arrow_flags`; vedeți
`src/common/splines-clip.ts:arrowFlags`), astfel că `graphs-b135`, `167` și `2087`
se potrivesc (divergența `element-count` cu vârf de săgeată lipsă și efectul său secundar asupra
`@d` al spline-ului netăiat au dispărut ambele).

Unele grafuri concentrate **păstrează un reziduu separat, preexistent**, pe care remedierea
vârfului de săgeată **nu** îl abordează — este o diferență de poziție pe **coordonata x** a nodurilor
(x-network-simplex / port de busolă), nu un defect de vârf de săgeată:

- **`graphs-b15`, `graphs-b69`** — grafurile mari de tip „lift” cu înregistrări/clustere.
  Concentrate se activează și îmbină corect; reziduul este o diferență de ~1pt pe x a nodurilor
  care se amplifică într-o diferență `element-count`/`@d` de spline. Emiterea vârfului de săgeată
  în sine este acum corectă (b69 primește poligoanele de vârf de săgeată lipsă). Vedeți
  nota de agent `b69-concentrate-undermerge` pentru cauza rădăcină pe coordonata x.
- **`1453`** — încă diverge pe o cauză `element-count` la nivel superior, fără legătură
  cu vârful de săgeată `conc_opp_flag`.
- **`2825`** — la momentul acestei remedieri a vârfului de săgeată, diverga pe o cauză
  `element-count` la nivel superior, fără legătură cu conc_opp_flag (acolo nu se declanșează
  nicio îmbinare de pereche opusă); între timp închisă de misiunea fix-2825-rebuild-vlists,
  vedeți A4 mai sus.

Acestea sunt elemente urmărite de coordonată x / structurale, **nu** defecte de vârf de săgeată.

### Lacune de fidelitate a aranjării din misiunea de fidelitate 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Misiunea de fidelitate 2.0 a făcut ca valorile de atribute neportate să eșueze zgomotos (vedeți tabelul
`UNSUPPORTED_FEATURE` din
[Erori și excepții](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Ea a lăsat următoarele, consemnate în `plans/v2-fidelity/decision-journal.md`.

**Zgomotos, neportat.** `overlap=voronoi` cu noduri suprapuse încă aruncă
`UNSUPPORTED_FEATURE` în neato, twopi, circo și sfdp: ajustorul Voronoi
însuși (algoritmul `vAdjust`) nu este portat. Testul de suprapunere care decide
dacă se aruncă excepția este cel propriu lui C (`countOverlap` peste poligoanele de noduri din `poly.c`).

**Lacune cunoscute, încă tăcute.** Portarea le randează fără eroare și
diferă de Graphviz nativ. Găsite de misiunea `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); nu sunt diferențe acceptate.

- **Avertismentul „Unrecognized overlap value” din `getAdjustMode` nu este emis.**
- **Vârfurile poligoanelor rotite pot diferi de nativ la ultimii biți
  (ireductibil: biblioteca matematică a gazdei).** `poly_init` orientează fiecare vârf cu
  `atan2`, `hypot`, `sin` și `cos`. La intrări identice bit cu bit, libm din macOS și
  V8 returnează ultimi biți diferiți (de ex. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` la vârful următor:
  libm `…fffd`, V8 `…fffe`), astfel că o casetă cu `orientation=20` primește y-ul vârfului
  `-18` în portare și `-17.999999999999996` nativ. Graphviz nativ însuși
  variază cu libm-ul platformei, iar un browser nu îl poate apela. Aritmetica proprie a portării
  se potrivește cu C (ordinea `RADIANS` fixată; 776 din 1664 de coordonate de vârfuri eșantionate
  sunt identice bit cu bit, restul diferă doar prin libm). Efect:
  verdictele `polyOverlap` la atingere exactă pot fi inversate; cu vârfurile native, fiecare
  verdict se potrivește.
- **sfdp poate diferi de nativ pe macOS (ireductibil: `pow` din libm-ul gazdei).**
  Diagnosticat cu un sfdp nativ instrumentat: pozițiile rămân identice bit cu bit
  până când un termen al forței de respingere, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, deci `pow(x, 2)`), returnează cu 1 ulp mai puțin decât `x*x` din libm macOS
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, corect rotunjit
  `…396`; în macOS `pow(v, 2) != v*v` pentru 20 din 16201 de `v` eșantionate). Aceasta schimbă
  `Fnorm` al iterației la ultimul bit; răcirea adaptivă a sfdp o amplifică
  într-o aranjare diferită (adesea în oglindă). `armPow` al portării este `pow`-ul
  optimized-routines al ARM (glibc ≥ 2.28), adică ceea ce calculează Graphviz pe Linux;
  oracolul macOS este excepția. Excluse: însămânțarea (valorile explicite `start=`
  se potrivesc), `pcp_rotate` (aceeași intrare dă aceeași ieșire), pozițiile și
  termenul atractiv (identice bit cu bit). Exemplu: un triunghi singur `a--b; a--c; b--c`
  cu seed-ul implicit.
- **fdp poate diferi de nativ prin `cos`/`sin` din libm-ul gazdei.** fdp urmează
  Graphviz după 15.0.0 (respingere pe distanță hypot, `Mlimit`), cu `hypot` din libm-ul gazdei
  reprodus bit cu bit (`src/common/libm-hypot.ts`, 0
  nepotriviri pe 400k de eșantioane). 251 din cele 252 de intrări golden randabile cu fdp
  se potrivesc exact cu build-ul nativ; cea rămasă
  (`parallel-cluster-ldbxtried`) plasează nodurile-port ale clusterelor cu
  `T_Wd * cos(alpha)`, iar `cos(-2.3840764867756761)` din libm macOS se află la 1 ulp de
  `Math.cos` din V8; bucla de forțe a fdp amplifică aceasta la aproximativ 3 in. `cos`-ul Apple
  nu poate fi reprodus dintr-un model scurt așa cum poate fi `hypot`.
- **Prăbușiri native pe care portarea le definește.** Graphviz nativ iese cu 139 pe neato
  `mode=KK` cu `model=mds` și o muchie cu `len` (`mds_model` indexează `GD_dist`
  după un număr de secvență începând de la 1: depășire de heap), precum și pe `model=circuit` cu un graf
  neconex. Portarea elimină celulele din afara intervalului în primul caz
  și revine la drumuri minime în al doilea; nu există ieșire nativă
  cu care să se compare.

---

## Nu sunt portate în mod intenționat (non-obiective) {#intentionally-not-ported-non-goals}

Acestea sunt limite deliberate ale domeniului, nu defecte. Biblioteca vizează **SVG**
(plus formatele text intermediare `json` / `xdot` / `dot` / imagemap).

- **Alte formate de ieșire.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  și backend-urile GUI/interactive sunt în afara domeniului. Folosiți ieșirea SVG și convertiți
  în aval dacă aveți nevoie de raster.
- **Paginarea `page=` pentru SVG.** `dot` nativ nu paginează nici el SVG (dispozitivul
  SVG nu setează niciun indicator de paginare), deci `page=` nu are niciun efect pe această cale în ambele
  implementări — documentat aici doar pentru că este un punct frecvent de
  confuzie.
- **Ieșirea text `-Tplain`.** Amânată (un format text fidel), nu exclusă.
- **`gvpr`** (limbajul de scripting pentru procesarea grafurilor) — în afara domeniului.
- **Wrappere C++ de conveniență** (`cgraph++`, `gvc++`) — API-ul C este portat
  primul; un strat de conveniență idiomatic TypeScript, dacă este dorit, ar fi un
  pachet separat.
- **`fontnames=svg|ps` la măsurarea textului în browser.** Într-un browser,
  măsurătorul pe canvas își construiește fontul din lista de familii `fontnames=native` a aliasului PostScript
  (`Times-Roman` → `Times, serif`), același
  fel de literă pe care emițătorul SVG îl randează implicit. `TextMeasurer` nu poartă niciun context
  de graf, deci grafurile care setează `fontnames=svg` sau `fontnames=ps` sunt măsurate
  după lista nativă, în timp ce SVG-ul indică familia svg/ps. Greutățile de alias pe care
  CSS nu le definește (`book`, `demi`, `light`, `medium`, `roman`)
  sunt emise ad litteram, ca în C; browserele le ignoră și randează greutatea
  normală, iar măsurătorul măsoară greutatea normală pentru a se potrivi. Ieșirea Node
  nu este afectată (nu folosește niciodată măsurătorul pe canvas).
- **Mecanisme exclusiv native** înlocuite cu echivalente sigure pentru browser: încărcarea dinamică
  a pluginurilor (`dlopen`) este înlocuită de înregistrarea statică a motoarelor/randatoarelor;
  citirile din sistemul de fișiere (fonturi, imagini, configurare) sunt înlocuite de
  callback-uri furnizate de apelant (de ex. `setImageSizer`). Comportamentul este păstrat; mecanismul diferă.

---

## Raportarea unei divergențe {#reporting-a-divergence}

Dacă găsiți o ieșire care diferă de C și **nu** este o diferență acceptată de mai sus,
nu se află în `PARITY-dot.md` și nu este un non-obiectiv, este un defect care merită raportat — sursa C
este specificația, iar divergențele nelistate sunt tratate ca defecte, nu ca
un comportament acceptat.
