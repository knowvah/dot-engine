---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Divergenze note da Graphviz in C {#known-divergences-from-c-graphviz}

@knowvah/dot-engine punta alla massima fedeltà possibile rispetto
all'implementazione canonica in C. Il sorgente C è la specifica; una differenza
non elencata è trattata come un difetto, non come un comportamento accettato.

> **Che cosa significa «corrispondere» qui.** Il verdetto di parità del corpus
> chiamato `conformant` è una **tolleranza deterministica stretta**, *non*
> un'uguaglianza SVG byte per byte: le coordinate numeriche e i percorsi devono
> coincidere entro **±0.01** e tutto il contenuto non numerico (tag, colori,
> testo) deve essere esattamente uguale
> (`compareSvg(…, 'deterministic')`). In questo documento «corrispondere» e
> «conforme» si riferiscono a quel verdetto di tolleranza. Definizione completa:
> [Conformità](./conformance.md).

Dove l'output *differisce*, la differenza rientra in una e una sola di tre classi:

1. **Scarti accettati** — differenze che abbiamo indagato, di cui comprendiamo la
   causa radice e che abbiamo **scelto deliberatamente di non rendere conformi**.
   Ciascuna è circoscritta, caratterizzata e motivata qui sotto. Non sono bug e
   non verranno «corrette» senza un motivo specifico e a sé stante.
2. **Coda lunga monitorata** — lacune note che *verranno* colmate, ciascuna con
   una correzione ancorata all'oracolo. Si trovano, con i conteggi aggiornati, in
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Non-obiettivi** — confini di ambito intenzionali (formati e meccanismi che
   non ci siamo mai proposti di riprodurre).

I registri autorevoli e continuamente aggiornati sono
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(dashboard di parità per singolo input rispetto a `dot` nativo) e
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventario dello stato del porting a livello di algoritmo).

La fonte di verità **leggibile da macchina** su quali grafi sono *accettati*
(classe 1 qui sotto) è
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Gli strumenti lo uniscono ai dati al momento della generazione dei report:
`PARITY-dot.md` separa gli **scarti accettati** dal backlog **monitorato**, e il
controllo delle regole ne ricava la propria lista di eccezioni. Le sezioni in
prosa qui sotto spiegano ogni voce (A1 e A3 sono attive; A2 è chiusa e
conservata come storico); un test di CI (`accepted-divergences.test.ts`) verifica
che ogni grafo accettato diverga ancora, così questo elenco non può marcire in
silenzio.

---

## Scarti accettati (non li rendiamo conformi di proposito) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Accettiamo uno scarto — invece di inseguire la parità byte per byte — solo quando
si verificano **tutte** le condizioni seguenti:

- La causa radice è un **vincolo di portabilità** (qualcosa che il runtime
  JavaScript/browser non può riprodurre esattamente), non un errore di logica del
  porting.
- La differenza è **impercettibile** e dimostrabilmente **limitata**.
- Una correzione avrebbe un **costo e un raggio d'azione sproporzionati**
  rispetto al beneficio (tipicamente: toccherebbe una primitiva condivisa usata da
  centinaia di grafi già conformi, rischiando regressioni per un guadagno di una
  frazione di pixel).

Quando accettiamo uno scarto lo caratterizziamo qui, così chi usa la libreria non
rimane mai sorpreso. I grafi interessati da uno scarto accettato vengono validati
con una soglia **strutturale / di tolleranza** invece che con una soglia
sui byte.

### A1. Determinismo in virgola mobile (motori force-directed) {#a1-floating-point-determinism-force-directed-engines}

**Interessati:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (i motori
iterativi a modello di molle). Il *layout* del motore `dot` **non** è interessato
da questo determinismo del modello iterativo; un diverso scarto in virgola mobile,
strettamente circoscritto, nell'instradamento delle spline di `dot` è trattato in
**A3** più sotto.

> **Ambito, storicamente un'avvertenza non misurata — ora misurata in parte.**
> Il **rilevamento SVG principale del motore dot** (`test/corpus/survey.ts`) è
> ancora **solo dot**: l'oracolo nativo viene eseguito con
> `GVBINDIR=/tmp/ghl`, che crea collegamenti simbolici **solo** ai plugin `core`
> + `dot_layout` (`test/corpus/gen-headless-gvbindir.sh` scorre esattamente
> `core dot_layout` — non è presente alcun plugin di layout `neato`/`fdp`/`circo`/
> `twopi`/`osage`/`sfdp`), e sia l'oracolo sia il porting vengono invocati con il
> motore `dot`. Quindi gli id del corpus come `*_neato` / `*_circo` /
> `root_twopi` sono *nomi di file* disposti con `dot` in quel rilevamento, non con
> il loro motore nativo, e A1 non corrisponde a **nessun** grafo lì — non perché i
> motori siano dimostrati conformi, ma perché quel particolare rilevamento non li
> esercita mai.
>
> **Ma tutti e sei i motori di A1 hanno ora un proprio rilevamento sul motore
> nativo**, tramite `test/corpus/engine-walk.ts` + `parity-report.ts`
> (indipendente da `GVBINDIR` — ciascuno avvia direttamente
> `dot -K <engine> -Txdot`), con due livelli di rigore diversi documentati
> separatamente più sotto: `circo`/`twopi`/`osage` girano con la stessa
> tolleranza **deterministica ±0.01** del rilevamento dot, con triage della causa
> radice per singolo id («Accettazione per traccia del motore» più sotto);
> `neato`/`fdp`/`sfdp` girano con una tolleranza di **caratterizzazione ±0.5**
> più larga e senza ancora un triage per singolo id («Caratterizzazione dei motori
> iterativi» più sotto). Numeri attuali tra i motori:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Caratterizzazione.** Questi motori eseguono layout numerici iterativi i cui
risultati dipendono dall'arrotondamento in virgola mobile — in particolare dal
fused multiply-add (FMA) e da `Math.pow`, che possono differire tra motori
JavaScript e architetture di CPU. Il porting ricalca l'ordine delle operazioni di
C dove può (`src/common/fma.ts`, `src/common/arm-pow.ts`) — ad esempio `sfdp`
coincide con l'oracolo nativo a circa 6 cifre significative, con un PRNG
corrispondente e `fma` — ma la riproduzione esatta, con coordinate identiche,
**non è garantita tra piattaforme diverse**. La topologia è preservata; la
possibile divergenza riguarda le coordinate fini dei nodi.

**Perché è accettato.** È un vincolo rigido dell'esecuzione in JS, non una scelta
di progetto — della stessa famiglia della sensibilità ad `hypot` di Apple in A3.
Non c'è modo di garantire risultati trascendenti/FMA identici bit per bit su tutti
i runtime di destinazione, quindi una soglia sui byte sarebbe non verificabile
invece che semplicemente costosa. **Valutare A1** (invece di limitarsi a darne
avviso) ha richiesto una traccia di parità separata sul motore nativo — costruita
il 2026-07-11 come `test/corpus/engine-walk.ts` + `parity-report.ts`, che
rileva ogni input con il proprio motore invece che con `dot`. Il tetto onesto di
quel lavoro è **restringere** A1 a «nessuna divergenza attiva sulla piattaforma di
riferimento», mai eliminare l'avvertenza tra piattaforme; i risultati finora
(sotto) rispettano quel tetto: `circo`/`twopi`/`osage` hanno ciascuno fatto
emergere e ricondotto alla causa radice una manciata di vere istanze A1/A9, e
`neato`/`fdp`/`sfdp` si attestano ora al 90.8/77.5/68.0% entro 0.5pt dal nativo
sull'universo di 910 elementi, il che significa che l'aritmetica portata
(`fma.ts`, `arm-pow.ts`, PRNG corrispondente) regge per la maggior parte dei
grafi — e ogni id divergente rimasto è attribuito singolarmente tramite iniezione
(deriva del solver vs. difetto del porting) invece di essere lasciato come deriva
non analizzata; vedi la caratterizzazione dei motori iterativi più sotto.

**Accettazione per traccia del motore: famiglia delle frecce di twopi.** <a id="a1-twopi-arrows-family"></a>
Il blockquote qui sopra descrive il rilevamento SVG del motore dot, dove A1 non
corrisponde ad alcun grafo; la separata **traccia xdot del motore** `twopi`
(`parity-twopi.json`, oracolo nativo `dot -K twopi -Txdot`,
`test/corpus/engine-walk.ts`) *gira* invece con il proprio motore nativo e fa
emergere un'istanza A1 concreta e verificata su 9 id del corpus:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
e (aggiunto il 2026-07-28, nuovo nell'universo di 905 elementi) il gemello della
directory directed/ `tree-graphs-directed-oldarrows` — ciascuno diverge su un
singolo arco dominante (`Z->I` oppure `i->Z`; 12–64 differenze di draw-op).
L'A/B per iniezione (voce «injection A/B verdicts: twopi arrows family
EXONERATED...» del diario delle decisioni, 2026-07-10) ha dimostrato direttamente
il meccanismo: estrarre l'`ND_pos` in ingresso di `spline_edges` nativo e
iniettarlo nello `splineEdgesShifted` del porting produce un output **pienamente
conforme** su `graphs-arrows` (`Z->I` diventa identico byte per byte all'oracolo,
stessa spline a 7/14 punti) — quindi la divergenza è al 100% una deriva delle
posizioni dei nodi precedente all'instradamento, originata dal solver di
rimozione delle sovrapposizioni PRISM di `twopi`, e l'instradamento e l'emissione
delle spline del porting sono scagionati. Il sintomo visibile su 6 degli 8 id è
un'inversione del numero di punti della bezier (`unfilled_bezier[ptCount]: 8 vs
14`): il numero di pezzi adattati da `Proutespline` è sensibile a da quale lato
del confine di un ostacolo cade la posizione del nodo alterata, quindi una
differenza di posizione sub-ULP a valle della soluzione iterativa di PRISM
inverte il numero di segmenti della spline adattata (gli altri 2 id,
`graphs-arrowsize`/`nshare-arrows_dot`, mostrano la stessa deriva come uno scarto
di sola posizione più piccolo, senza inversione del numero di pezzi). Accettata a
livello di traccia del motore tramite
`test/corpus/accepted-divergences-engines.json`, unito in `PARITY-twopi.md` da
`parity-report.ts` — la stessa unione che `accepted.ts` esegue per il
`PARITY-dot.md` della traccia dot.

L'analisi della causa radice di `oldarrows` (2026-07-28) ha individuato il punto
esatto dell'inversione del sintomo sul numero di punti della famiglia. Il suo
ventaglio `i`–`Z`–`I` è collineare su un diametro dell'anello, e l'`intersect()`
di `directVis` di pathplan blocca una linea di vista quando un vertice di un
ostacolo si trova «sul» segmento — dove la tolleranza di collinearità di 1e-4 di
`wind()` fa sì che persino un nodo a 270pt dal segmento conti come collineare, e
`inBetween()` (che presuppone la collinearità) degenera allora nel testare solo
la **proiezione x**: il vertice blocca se e solo se la sua x cade strettamente
dentro l'intervallo largo un ULP tra le x dei due estremi. Quale dei due archi
radiali speculari si piega dipende quindi dall'ordinamento dell'ultimo ULP di tre
valori x nominalmente uguali usciti dalla soluzione di PRISM — C piega `Z->I` (il
vertice sull'asse del nodo `i` cade dentro il suo intervallo), il porting piega
`i->Z` (il vertice del nodo `I` cade dentro il proprio). Replicare `directVis` a
parte sull'insieme di ostacoli estratto da ciascun lato riproduce esattamente la
decisione di ciascuno, e iniettare nel porting l'`ND_pos` pre-instradamento
dell'oracolo dà 0 differenze (`attribution-twopi.json`) — instradamento ed
emissione sono fedeli al byte.

`1855` è la variante **speculare** radiale/a stella dello stesso meccanismo FP di
PRISM precedente all'instradamento (accettata il 2026-07-11): le sue 31 foglie
sono esattamente cocircolari, quindi il layout a stella è simmetrico per
riflessione e la rimozione delle sovrapposizioni di PRISM si trova su un
equilibrio instabile per simmetria; una differenza di 1 ULP tra `cos`/`sin` di
V8 e di libm su 5 angoli di foglia nel `setAbsolutePos` di `circleLayout` seleziona
il bacino speculare opposto, e l'intero layout radiale risulta l'esatto
specchio sull'asse x di quello dell'oracolo (spostamento massimo dei nodi 6.04pt,
bb preservato). L'A/B per iniezione ha dimostrato entrambe le direzioni: fornire
al PRISM del porting le posizioni esatte di `circleLayout` di C riproduce
l'oracolo nodo per nodo (3e-14), e ripristinare solo le 5 posizioni di foglia
divergenti di un ULP riporta l'intero layout allo specchio del porting. Analisi
completa della causa radice: `.agent-notes/twopi-radial-drift-rca.md` (diario
delle decisioni 2026-07-11).

**Caratterizzazione dei motori iterativi: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
A differenza delle tracce dei motori `circo`/`twopi`/`osage` qui sopra,
`neato`/`fdp`/`sfdp` **non** sono ancora analizzati per singolo id —
`engine-walk.ts` registra un campo `tolerance: 0.5` per questi tre e
`parity-report.ts` li rende in una sezione separata «Iterative engines (±0.5
characterization)» di
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
esplicitamente **non** confrontabile con le percentuali di superamento
deterministiche ±0.01 altrove in questo documento. Conteggi attuali (universo di
910 elementi; la percentuale di superamento esclude gli input che l'oracolo C non
riesce a renderizzare, secondo la [Conformità](./conformance.md)):

| motore | rilevati | entro ±0.5pt | non conformi (tutti attribuiti, accettati) | errore del porting / timeout | errore dell'oracolo |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Il primo rilevamento, il 2026-07-11 su 762 elementi, misurò 263/311/260 entro
±0.5pt — il salto alle percentuali attuali è dovuto alle correzioni per singolo id
arrivate da allora, soprattutto la gestione di `user_pos`/`P_SET` di neato non
ancora portata, il consolidamento dell'inizializzazione dei motori e la
correzione macro-vs-funzione di `setEdgeType`.)

A differenza del primo rilevamento, ogni riga divergente è ora attribuita
singolarmente: il banco di iniezione (`test/corpus/attribute-divergence.ts`)
fornisce al porting l'`ND_pos` pre-instradamento dell'oracolo nativo e ripete il
confronto, e ogni id divergente attuale è o `drift-exonerated` (instradamento ed
emissione del porting riproducono esattamente l'oracolo una volta rimossa la
deriva del solver) oppure uno dei pochi residui per singolo id accettati a parte
(il pareggio di incircle CDT di `241_0` su tutti e tre i motori, neato `2239`,
sfdp `42`/`2556`). L'accettazione di classe qui sotto formalizza l'insieme degli id scagionati; conteggi aggiornati nei dashboard per motore
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Accettazione di classe A1-drift (motori iterativi, appartenenza calcolata).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
contiene una voce di **classe** `"A1-drift"` per ogni motore iterativo (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — distinta dalle voci per
singolo id usate dalle tracce `circo`/`twopi`/`osage` qui sopra (D2,
`plans/iterative-parity-campaign/decisions.md`). A differenza di una voce per id,
l'appartenenza alla classe non viene mai elencata a mano nel registro:
`parity-report.ts` la calcola al momento del report dal corrispondente
`attribution-<engine>.json` (il banco di attribuzione per iniezione di T1,
`test/corpus/attribute-divergence.ts`) — ogni id divergente il cui `ND_pos`
nativo pre-instradamento è stato iniettato nel porting e che al nuovo confronto è
conforme a ±0.5 riceve in quel file `verdict: 'drift-exonerated'`, a indicare che
i solver iterativi dei due motori sono convergiti a layout numericamente diversi
ma ciascuno internamente coerente (una differenza di accumulo in virgola mobile
secondo la caratterizzazione A1 qui sopra, non un bug di instradamento o di
emissione del porting). Le prove per singolo id — forma del bucket, numero di
differenze di base vs. dopo l'iniezione, rilevamento di traslazione
uniforme/specchio — stanno nell'artefatto di attribuzione stesso, non duplicate
in questo documento né nel registro (D2). Un id che in seguito supera
completamente il confronto, o la cui nuova attribuzione cambia verdetto, esce
automaticamente dalla classe alla successiva rigenerazione del report — nessuna
modifica di accettazione obsoleta richiesta, e nessun fallimento del test di
guardia. I motori il cui `attribution-<engine>.json` non è ancora stato generato
rendono la classe come «attribution pending» con zero membri, identica a non
avere alcuna accettazione — la voce di classe può precedere i propri dati (vedi
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Misurazione del testo (metriche dei font) → layout guidato dalle etichette — CHIUSA <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Stato (2026-07-01): chiusa.** Nessun id del corpus è più accettato sotto questa
classe; la sezione è conservata come documentazione storica del meccanismo e del
punto di estensione `TextMeasurer` iniettabile che lo ha neutralizzato. Le
successive correzioni alla misurazione del testo (il passaggio a
`EstimateTextMeasurer`, le metriche verticali sensibili al font, la correzione dei
byte UTF-8 non ASCII) hanno risolto quasi ogni divergenza di layout guidata dalle
etichette che un tempo viveva qui. **`proc3d`** — l'ex esempio canonico di A2 — è
pienamente **`conformant`** su tutte e tre le directory del corpus
(`graphs-`/`share-`/`windows-proc3d`): bbox coincidente, zero differenze nei dati
dei percorsi, zero differenze negli ancoraggi delle etichette.

**Gli ultimi membri ritirati (2026-07-01).** La **famiglia `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) è rimasta qui molto a lungo pur
avendo già la geometria dei nodi esattamente uguale a C (76/76 punti di
riferimento). Il suo vero residuo — 8 estremi di archi rettilinei su quattro
coppie di cicli di lunghezza 2 con direzioni opposte (`Target↔TThread`,
`Interp↔InterpF`, `Event↔Target`, `AtomProperties↔NRAtom`) spostati di 6–14 pt —
è stato rianalizzato e si è rivelato **non essere affatto un effetto delle
metriche dei font**, ma due difetti del porting nell'instradamento multi-arco di
dot (missione `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Ordine delle corsie delle coppie opposte.** Il porting riordinava ogni gruppo
   di archi paralleli per seq di creazione originale prima di assegnare gli
   scostamenti delle corsie Multisep; C assegna le corsie nell'ordine raccolto da
   edgecmp (prima il rappresentante MAINGRAPH in avanti, poi il membro AUXGRAPH
   invertito — `dotsplines.c:419`, `make_regular_edge:1885-1907`). Un ciclo di
   lunghezza 2 il cui membro invertito era dichiarato per primo disegnava ogni
   arco sul corridoio da 18 pt dell'altro.
2. **Falsa adiacenza piatta sugli archi uniti tra ranghi diversi.** `markAdjacent`
   marcava le voci di `ND_other` senza la guardia dello stesso rango di C
   (`flat.c:272-276`), lasciando che il cortocircuito per adiacenza piatta di
   `groupSize` inghiottisse le interruzioni di gruppo di portcmp.

Con entrambe le correzioni portate fedelmente, la famiglia è **`conformant`** su
tutte e tre le directory (per elemento: 0 nodi, 0 archi differenti), e lo stesso
meccanismo ha chiuso `42`, `clust2`, `ngk10_4` (structural-match → conformant) e
ha spostato `b124` da diverged a structural-match — tutti su coppie di cicli di
lunghezza 2/parallele.

**Entrambi i lati del rilevamento eseguono lo stesso estimatore — la misurazione è
neutralizzata.** L'oracolo `dot` nativo gira con un `GVBINDIR` headless
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) che crea collegamenti
simbolici solo ai plugin `core` e `dot_layout` — nessun plugin di impaginazione
del testo `gd`/`pango`/`quartz`. Con quello slot vuoto, graphviz ripiega sul suo
`estimate_textspan_size` integrato. L'`EstimateTextMeasurer` del porting in
TypeScript (`src/common/textmeasure.ts`) è un porting fedele della stessa routine
ed è l'impostazione predefinita in Node, risolto da `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Entrambi i lati di ogni confronto di
parità misurano quindi il testo con lo stesso identico estimatore** — gli
avanzamenti reali dei glifi di FreeType/pango non entrano mai nel confronto. Per
questo una regressione di verdetto qui indica il codice di layout, non un font, ed
è per questo che correggere i bug dell'estimatore stesso (conteggio dei byte
UTF-8, sensibilità al font delle metriche verticali) ha chiuso la maggior parte
di questa classe invece di restringere soltanto un divario di metriche dei font.

**Il punto di estensione `TextMeasurer` iniettabile.** Questa neutralizzazione è
possibile solo perché la misurazione del testo è un punto di estensione
deliberato, non cablato in nessuno dei due motori. `TextMeasurer` è
un'interfaccia a un solo metodo (`measure(text, font, size, flags) → {w, h, …}`)
iniettata come dipendenza in ogni punto di chiamata che dimensiona le etichette —
`polyInit`, `recordInit`, `initEdgeLabels` e `buildNodeLabel` ricevono ciascuno il
misuratore come parametro; nulla misura il testo tramite uno stato globale. Viene
fissato per test/CI con `setTextMeasurer(...)` oppure `GV_TEXT_MEASURER=estimate`.
Il punto di estensione permette anche di *dimostrare* che un residuo è dovuto solo
alla misurazione: si fornisce al porting le larghezze esatte misurate da C
(catturate dall'oracolo) e si verifica se il layout riproduce allora esattamente
C. Quell'esperimento è ciò che in origine ha giustificato il verdetto A2 per
`proc3d` (vedi l'appendice storica più sotto) — la tecnica resta valida. Il suo
inverso ha ritirato la classe: poiché la misurazione era dimostrabilmente
neutralizzata su entrambi i lati del rilevamento, il residuo sugli archi di `NaN`
non poteva essere un effetto delle metriche dei font, il che ha forzato la nuova
diagnosi che ha trovato i due difetti di instradamento descritti sopra.

::: details Analisi storica (superata il 2026-06-30) — conservata a titolo documentale
Il materiale che segue descrive uno stato precedente di questa classe, prima che il
passaggio a `EstimateTextMeasurer`, le metriche verticali sensibili al font e la
correzione dei byte UTF-8 non ASCII la chiudessero in gran parte. Non descrive più
il comportamento attuale — è conservato solo perché non vada perso il ragionamento
che ha portato fin qui. In particolare: (1) i numeri di larghezza «C nativo» nella
tabella di misurazione qui sotto sono valori **FreeType** di un percorso di
rendering con font reali; il rilevamento di parità non esercita mai quel percorso
— entrambi i lati eseguono `estimate_textspan_size` (vedi sopra) — quindi la
tabella non riflette il modo in cui la parità viene misurata oggi; (2) le figure
di sovrapposizione e i rendering golden/ours qui sotto raffigurano un `proc3d`
**non appartenente al corpus** (`graphs/directed/proc3d.gv`, ~2620 pt) che non fa
parte del rilevamento di parità; le varianti `proc3d` del corpus sono ora
conformi con zero differenze, quindi non c'è alcuna sovrapposizione da mostrare
per esse; (3) la narrazione sulla x dei nodi di `NaN`/`ratio=compress` qui sotto è
superata — la misurazione attuale mostra che tutti i 76 punti dei nodi coincidono
esattamente, quindi la catena errore di larghezza → spostamento dei nodi che
descrive non vale più per `NaN`.

**`NaN` con `ratio=compress` (storico).** La famiglia `NaN.gv`
(`orientation=landscape; ratio=compress; size="16,10"`) era un caso A2 il cui
verdetto all'epoca si fermava a *diverged* invece che a *structural-match*. Il
percorso network simplex della x con compress era fedele — ogni input dei vincoli
coincideva con C (valore del vincolo di larghezza, minlen di `containNodes`,
numero di archi ausiliari 471/peso 1612, `lrBalance` e ordini dei ranghi, tutti
identici) *tranne* le semilarghezze di 9 nodi, che il misuratore riportava più
larghe di 0.5–1.03 pt rispetto a C. L'impaccamento a peso 1000 di
`ratio=compress` rendeva **vincolanti** i vincoli di separazione sinistra-destra
normalmente lassi, così quell'errore di larghezza sotto il pixel — invisibile
senza compress — emergeva come uno spostamento interno della x di −3..−5 pt. Quello
spostamento faceva superare di 0.55 pt la parete del riquadro di un nodo alla
spline rettilinea `Target<->TThread`, così il router la piegava in un pezzo di
bezier in più (7 punti contro i 4 di C) — uno scarto *strutturale*, da qui
*diverged*. Forzando le 9 larghezze ai valori di C si riproduceva esattamente C
(x dei nodi 53/76→0/76 fuori; spline 7→4 punti), a conferma che il residuo era al
100% dovuto alle metriche dei font a monte, non al codice di compress o delle
spline, **per quella ex divergenza**. Prove complete (con un confronto visivo
affiancato golden-vs-ours + la sovrapposizione dello scarto spline da 4 contro 7
punti): `plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (testo
descrittivo: `…/nan-compress-xcoord.md`).

**Esempio di misurazione delle metriche dei font (storico — FreeType vs estimate).**
Graphviz nativo, eseguito con un vero plugin di impaginazione del testo (non
l'oracolo headless usato dal rilevamento di parità), misura il testo con gli
avanzamenti dei glifi di FreeType/libgd. L'`EstimateTextMeasurer` del porting non
replica un rasterizzatore di glifi. Per la maggior parte delle stringhe i due
coincidono esattamente; per alcune differiscono di una frazione di punto. Esempio
misurato — Times-Roman 14 pt, la stringa `"/home/ek/work/src/lefty/lefty.c"` (31
caratteri):

| | larghezza |
|---|---|
| C nativo (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| differenza | **+0.75 pt (+0.43%)** |

L'altra riga di etichetta dello stesso nodo, `"93736-32246"`, è stata misurata in
modo **identico** (96.00 pt in entrambi) — l'errore dipende dalla stringa e si
accumula per glifo, non è un fattore di scala uniforme. Questo divario
FreeType-vs-estimate è reale ma **non** è ciò che il rilevamento di parità misura
(entrambi i lati eseguono `estimate`); conterebbe solo se l'output di
@knowvah/dot-engine fosse confrontato con un rendering C con font reali al di
fuori di questo rilevamento.

**Effetto a valle sull'ex divergenza di `proc3d` (storico).** La larghezza
dell'etichetta determina la dimensione del nodo, che determina il layout:

1. Un'etichetta più larga → un riquadro del nodo leggermente più largo (per un
   nodo *ellisse*, la larghezza è ulteriormente scalata di √2, quindi +0.75 pt di
   testo → +0.53 pt di semilarghezza).
2. Le semilarghezze dei nodi fissano i vincoli di separazione sinistra-destra del
   network simplex delle coordinate x; quei vincoli sono arrotondati con
   `ROUND()` a interi, quindi una variazione di larghezza sotto il pixel può far
   passare un vincolo da *N* a *N+1*.
3. Il network simplex sceglie allora un'assegnazione x intera diversa — ma
   ugualmente ottimale — spostando alcune posizioni x dei nodi di 1–2 unità.

Per il `proc3d.gv` non appartenente al corpus (`graphs/directed/proc3d.gv`, ~2620
pt, non membro del rilevamento di parità), ciò ha prodotto una differenza di
**≤ 3.55 pt** nell'estensione x (**0.13%**), sovrapposta qui sotto — **verde = `dot`
C nativo (golden), rosso = @knowvah/dot-engine (nostro)**:

![Sovrapposizione proc3d golden vs. nostro: verde = C, rosso = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ingrandita, la frangia compariva quasi interamente sulle lunghe etichette ovali
dei percorsi di file:

![Sovrapposizione proc3d, ingrandita sulle ampie etichette ovali dei percorsi: verde = C, rosso = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — `dot` nativo | Nostro — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizzato da Graphviz in C](/img/proc3d-golden.svg) | ![proc3d renderizzato da @knowvah/dot-engine](/img/proc3d-ours.svg) |

La trattazione autonoma (causa radice, numeri per singola metrica, comando per
riprodurre) è in una pagina a parte:
[**proc3d — la divergenza canonica A2 nelle metriche dei font (storica)**](/it/divergences-proc3d-a2).
Quella pagina descrive una divergenza risolta su un input non appartenente al
corpus; le attuali varianti `proc3d` del corpus sono conformi.

**Perché fu accettata all'epoca.** Far coincidere al byte gli avanzamenti per
glifo di FreeType su ogni font e stringa avrebbe richiesto di replicarne le
tabelle delle metriche, l'hinting e l'arrotondamento — grande, fragile e comunque
non garantito esatto. Il misuratore del testo è una primitiva condivisa: ogni
etichetta del corpus passa da lì, quindi una correzione mirata a una stringa
rischiava di far regredire altre per un beneficio impercettibile.
:::

### A3. Pareggio di `hypot` nell'instradamento delle spline (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Interessati:** grafi `dot` con un canale di instradamento degli archi
**geometricamente simmetrico** — tipicamente un arco piatto corto e simmetrico.
Esempio osservato: `2368`, che resta a *structural-match* (maxΔ ≈ 10.2 pt su
**un** arco, `376->76`). Lo stesso pareggio emerge anche su un arco **lungo**
(a più ranghi) verso un hub con molti archi entranti quando il corridoio è
esattamente speculare: `graphs-b100` / `graphs-b104` (sorgente identico)
divergono di maxΔ 20 (esattamente una riga di rango) sull'unico nodo di giunzione
di `Node23730->Node23729` — ogni posizione dei nodi e tutta la struttura a monte
dei riquadri/poligoni/percorso teso è identica byte per byte a C; differisce solo
la scelta, a ~1 ULP, di `findMaxDev` su quale punto interno speculare diventi il
nodo di giunzione della bezier. La forma ad arco piatto corto emerge anche come
`241_1` (structural-match, maxΔ ≈ 2.4 pt) — il gemello divergente di `241_0`,
ancorato all'oracolo, che il rumore di C invece mantiene col primo. Lo stesso
pareggio produce la divisione di un corridoio a fessura per un arco di ritorno di
un ciclo di lunghezza 2 con etichetta in `2413_1` (structural-match, maxΔ 67.65) e
`2413_2` (maxΔ ≤99.55 una volta che arriva la correzione T11 swapBezier-reverse —
fino ad allora il maxΔ 1922.26 riportato per il file è dominato da un difetto non
correlato, monitorato a parte), e un singolo arco con etichetta interno a un
cluster in `graphs-decorate` (maxΔ 43.54); in ogni caso i due angoli candidati
alla divisione coincidono entro 5.7e-13 (famiglia 2413) / 3e-14 (decorate) l'uno
dall'altro prima che il rumore di `hypot` di Apple, dipendente dalla posizione,
scelga un vincitore. `2371` (structural-match, maxΔ 16.8) mostra la stessa
impronta su due archi non correlati (`g[9263]` `r6837mid--r9687mid`, `g[23859]`
`r38mid--r8699mid`): il porting emette l'esatto speculare della sequenza dei punti
di controllo dell'oracolo su entrambi, con la y del nodo di giunzione ribaltata di
un identico Δ16.8 (frazioni di divisione alta/bassa scambiate). La sua origine è
qualificata con confidenza **MEDIUM** piuttosto che con la confidenza CONFIRMED
degli altri membri: `2371` impacchetta ~199 componenti, il che disaccoppia le
coordinate locali di pathplan da quelle di pagina, quindi il pareggio non ha
potuto essere correlato dal vivo a `route.ts:209` in tre tentativi di
strumentazione; un'origine nella segmentazione in modalità retta o in
`recover_slack` dopo il ritaglio non è completamente esclusa. Diagnosi completa:
`plans/residual-cleanup/analysis/2371-mirror.md`. La maggior parte degli archi
instradati non è interessata.

::: details Definizione del grafo (`2368.dot`)
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

**Caratterizzazione.** L'adattatore delle spline (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) divide una bezier adattata nel punto interno del
percorso di massima deviazione. Quando il canale è simmetrico, i due punti di
divisione candidati sono un **pareggio matematico esatto**, e il vincitore viene
deciso dal rumore di cancellazione in virgola mobile di ~1e-14 in una valutazione
della bezier in coordinate assolute il cui **segno dipende dalla posizione
assoluta**.

La distanza di deviazione di C è `hypot` di libm, e l'`hypot` di Apple su macOS che
ha generato l'oracolo è un'implementazione proprietaria che non coincide bit per
bit con **alcun** `hypot` portabile (misurato contro di essa nel regime di
coordinate di graphviz, tassi di coincidenza bit per bit: `Math.hypot` di V8 ≈ 63%,
un `hypot` correttamente arrotondato / in stile Arm ≈ 84%, `hypot` di fdlibm ≈
90%, `sqrt(dx²+dy²)` ≈ 94%). A causa di quel rumore di ULP **C stesso non è
coerente**: divide due archi *congruenti per traslazione* verso angoli
**opposti**. All'interno di `2368` l'arco `376->76` è l'immagine speculare
dell'arco geometricamente identico `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

L'intero scarto, sovrapposto (ingrandimento 12× sull'arco `376->76` / `to1`) —
**verde = Graphviz in C, rosso = @knowvah/dot-engine**. Entrambi sono lo stesso
arco discendente poco profondo tra gli stessi bordi dei nodi; differiscono di
~1–2 pt nella pancia (il punto di controllo centrale della bezier), dove il
pareggio di C si è risolto verso l'angolo opposto:

![Arco 2368 376->76: verde = C, rosso = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Tutto il resto coincide entro la tolleranza — stesso riquadro di delimitazione
(608×148), posizioni dei nodi, etichette, punte delle frecce e tutti gli altri
archi. I rendering completi sono visivamente indistinguibili:

| Graphviz in C | @knowvah/dot-engine |
|---|---|
| ![2368 renderizzato da Graphviz in C](/img/2368-c.png) | ![2368 renderizzato da @knowvah/dot-engine](/img/2368-port.png) |

Il porting usa un pareggio **equivariante per traslazione** (un vero pareggio si
risolve sempre sul primo indice), quindi disegna *ogni* arco di questo tipo allo
stesso modo indipendentemente dalla posizione — è autoconsistente, e coincide con
C sugli archi dove anche il rumore di C mantiene il primo (es. `256->436`, e
`241_0 5:ne->8:nw`), divergendo solo dove il rumore di C si ribalta dall'altra
parte (`376->76`). Estremi, bersaglio della punta della freccia, gli altri archi,
tutti i nodi, le etichette e il riquadro di delimitazione coincidono entro la
tolleranza; si muovono solo i punti di controllo interni di quell'unico arco
(~1–2 pt nella pancia).

**Perché è accettato.** L'`hypot` di Apple non è più riproducibile tra motori JS e
CPU di quanto lo siano FMA/`pow` di **A1** — è lo stesso vincolo di portabilità,
solo nel router di spline di `dot`. Far coincidere la scelta di C, *dipendente
dalla posizione*, significherebbe adottare il suo pareggio rigoroso, che vive in
una **primitiva condivisa** attraversata da ogni arco instradato: farlo scambia la
coincidenza di `376->76` con *nuove* discordanze sugli archi dove C cade dall'altra
parte (fa regredire `241_0` e un caso di oracolo ad arco piatto con `cnt=3`), un
bilancio nullo che sacrifica anche l'equivarianza per traslazione del porting.
Manteniamo quindi il router coerente (equivariante). È uno scarto `dot` limitato e
impercettibile — non un bug aperto. Indagine completa:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oracolo in uno stato riconosciuto come difettoso (la famiglia init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Interessati:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). I
membri della famiglia `1939` e `2825` sono **conformant** e non hanno voce, e
`2470` e `graphs-structs` si sono aggiunti a loro il 2026-07-11 (entrambi sono
diventati conformi dopo le correzioni all'adiacenza-spill/chancmpid di ortho, a
`polylineMidpoint` con fmadd e all'arrotondamento half-even dei pareggi — il
porting ora riproduce esattamente l'output di recupero dell'oracolo, compresi gli
identici archi persi); le loro voci di accettazione sono ritirate.

`1581` e `2825` erano casi di recupero dopo crash (missione
fix-element-count-bucket): input da fuzzer/degeneri per cui i test upstream
verificano **solo** che dot non vada in crash (`test_1581`: nessuna violazione
ASan; `test_2825`: nessun crash quando `rebuild_vlists` restituisce -1). C incappa
in un `Error:` interno (`install_in_rank` / `rebuild_vlists: lead is null`) e il
suo recupero scarta il contenuto del layout; il porting arriva alle **identiche
decisioni di eliminazione dei rankset** (parità degli avvisi verificata: gli
stessi nomi di nodo/grafo negli avvisi «already in a rankset» di `mark_clusters`,
cluster.c:317-320).

`2825` è ora pienamente chiuso. La missione fix-2825-rebuild-vlists (successiva a
1581) ha prima chiuso il divario di un livello: il porting raggiunge l'*esatto*
stato di errore interno di C — stderr identico byte per byte, compreso l'ordine
dei messaggi (`Error: rebuild_vlists: lead is null for rank 1` poi la
continuazione `agerr(AGPREV, ...)` senza prefisso `concentrate=true may not work
correctly.`) — con `dotLayoutPipeline` che propaga correttamente il fallimento di
`dot_position` saltando `dot_splines`/`dotneato_postprocess`, come il `dotLayout`
di C (`if (r != 0) return r;` dopo `dot_position`, dotinit.c:322-325). Un seguito
(parte 2) ha poi chiuso il divario rimanente nel livello di rendering:
l'`emit_node` di C condiziona ogni nodo a `node_in_box(n, job->clip)`
(emit.c:1806-1809), e su questo percorso di interruzione `job->clip` è degenere
perché `GD_bb` non è mai stato impostato da `set_aspect` (dentro la coda saltata
di `dot_position`) — quindi C emette *zero* nodi, solo le cornici dei cluster
(anch'esse degeneri). Il porting ha portato quello stesso controllo
`node_in_box` (`src/gvc/device.ts:renderNode`, usando `job.bb`/`job.pad` come
equivalente a pagina singola di `job->clip`) e ha smesso di ricalcolare un bbox
plausibile dalle posizioni dei nodi quando `g.info.bb` non è impostato
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` alla lettera, riflettendo
`gvc->bb = GD_bb(g)` di `init_gvc`, emit.c:3272) — ogni motore di layout imposta
già da sé `g.info.bb` prima che `render()` giri su ogni percorso senza
interruzione, quindi questo è identico byte per byte sui grafi sani e cambia
l'output solo su questo percorso di interruzione. `2825` è ora `conformant`
(output di 4 elementi, identico byte per byte all'oracolo). Vedi
`.agent-notes/2825-rebuild-vlists-abort.md` per la traccia completa del
meccanismo di entrambe le parti. `1581` non raggiunge mai lo stato incoerente (un
*diverso* bug upstream della finestra dei cluster, non `rebuild_vlists`), quindi
dispone per intero il proprio grafo sopravvissuto — quel divario resta aperto.
L'output dell'oracolo su `1581` sono detriti di recupero senza semantica definita
upstream. Prove:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
Su ognuno di questi input è l'**oracolo C** a essere difettoso, per ammissione
dello stesso graphviz: `2471`, `1939` e `1435` sono
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issue
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cfr.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); l'unico tentativo
di correzione, la [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
resta una bozza non integrata (ultima modifica 2026-03-20). `graphs-structs` è
l'antica classe di perdita nell'instradamento dei record (#102/#242/#274/#1323)
che graphviz 15.0.0 stabile renderizza correttamente — una regressione
dell'oracolo in build di sviluppo.

**Che cosa fa C.** Sui membri `init_rank` (`2796`, `2471`, `1939`), il grafo
ausiliario delle coordinate x di dot nativo chiude un ciclo orientato attraverso
gli archi di vincolo delle pareti dei cluster; il suo
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
non riesce a scandire ogni nodo, stampa `Error: trouble in init_rank`, e il
layout prosegue da quello stato di recupero — su `2471`/`2796` finendo in detriti
di triangolazione di `Pshortestpath` e archi persi. Su `1435` e `graphs-structs`
la fase difettosa è pathplan stesso (vicoli ciechi della triangolazione per
ear-clipping; un arco di porta di record perso).

**Input verificati, poi resi fedeli (questa è la parte portante).** La missione
`verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
ha estratto, riga per riga, il grafo dei vincoli che entrambi i lati forniscono
al network simplex, per ogni membro della famiglia — e ha scoperto che il
comportamento «pulito» precedente del porting su questa famiglia derivava da
**quattro veri difetti del porting**, tutti corretti:

1. `flatEdges` saltava la chiamata a
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   di C, lasciando obsolete le finestre di rango dei cluster dopo l'inserimento
   dei vnode delle etichette piatte (questo da solo faceva perdere al porting **9**
   archi su `2471` dove C ne perde 6).
2. La penalità per archi dello stesso `group` scattava sui self-loop invece che
   sugli estremi dello stesso gruppo non vuoto
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` usava il valore `_WIN32` di C, 100; la piattaforma dell'oracolo usa
   1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Un vicolo cieco della triangolazione interrompeva `Pshortestpath` invece del
   warn-and-continue + ripiego a linea retta di C
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Dopo la correzione, i dump dei vincoli NS della famiglia sono **identici riga per
riga** a C (253 chiamate rank2 su `2471`; tutte le chiamate su
`1939`/`1435`/`graphs-structs`), e il porting segue C attraverso il recupero
riconosciuto come difettoso: stessi archi persi (`3->16` su 2796; gli identici 6
su 2471), stessi alberi di elementi. `1939` è diventato pienamente conforme. I
residui scarti numerici (e i detriti di pathplan differenti di 1435) sono
comportamento *interno* allo stato di recupero, che la politica del progetto
deliberatamente non insegue.

**`2723` (segfault; fissato, non inseguito).** `dot` nativo va in segfault
(uscita 139) su `tests/2723.dot` (non orientato, gruppi `rank=same`, archi con
etichetta), quindi C non ha alcun output con cui confrontarsi. L'[issue
upstream #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) è aperta e
`tests/test_regression.py:test_2723` è `xfail`. Il porting lancia
`InternalError` (`INTERNAL_ERROR`, con una causa `TypeError` da
`src/layout/dot/flat.ts:flatLabelYpos`, dove `rank[r-1]` è undefined). Senza un
oracolo corretto il fallimento onesto resta e il porting non viene modificato;
`src/layout/dot/flat-2723.test.ts` lo fissa. Aggiorna quel test se upstream
risolve il problema.

**Nota di politica.** La precedente posizione su A4 («il porting soddisfa le
aspettative dell'issue; non replicare») si basava sulla convinzione che il grafo
ausiliario aciclico del porting derivasse da una variante locale benigna. Non era
così — derivava dal difetto (1), che ha dimostrabilmente smarrito `2471`. Ha
vinto la fedeltà al sorgente C: il porting ora riproduce gli esiti di C
riconosciuti come difettosi a partire da input verificati identici, e ogni voce
qui dovrebbe essere **rimisurata quando upstream risolve l'issue corrispondente**
(l'output dell'oracolo cambierà; aspettati che questi id si accendano come
regressioni a quell'aggiornamento — è voluto, non è marciume).

**Prove.** Pagine di confronto per singolo id (rendering affiancati + registri
delle prove):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(riferimento pre-correzione conservato in
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Artefatti di diagnosi: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Byte di input non validi (rappresentazione della codifica) {#a5-invalid-input-bytes-encoding-representation}

**Interessato:** `1367` (diverged, maxΔ 0 — esattamente una differenza
strutturale).

**Che cosa differisce.** Il file di input contiene un byte di coda UTF-8 isolato
(`0x80`) dentro il nome di un nodo. C tratta i byte di coda isolati 0x80–0xBF come
«caratteri validi che rappresentano sé stessi» (`lib/common/utils.c:1200-1207`,
nessun avviso), e il testo `<title>` del nome del nodo aggira del tutto la
conversione del set di caratteri (i byte di `agnameof` fluiscono direttamente in
`gvputs_xml`). L'SVG dell'oracolo contiene quindi il byte grezzo e **non è UTF-8
valido** nonostante la codifica dichiarata. Il porting decodifica l'input UTF-8
non valido col ripiego latin1 (`0x80 → U+0080`) ed emette UTF-8 ben formato
(`\xc2\x80`).

**Perché è accettato.** Il confine di I/O del porting sono le stringhe JS
(libreria per browser). Un byte grezzo non valido non può fare il giro completo
attraverso il valore di ritorno stringa di `renderSvg`; far coincidere i byte con
C significherebbe corrompere la codifica dell'output per ogni consumatore. Il
ripiego latin1 rispecchia la semantica di recupero «trattato come Latin-1» dello
stesso C (`utils.c:1249`). È un vincolo sotto il codice — lo strato di
rappresentazione — non un comportamento portabile che abbiamo rifiutato di
portare. Tutto il resto in 1367 è conforme: i conteggi degli elementi (23
polyline / 103 text / 44 polygon / 24 path) e tutte le coordinate coincidono dopo
la correzione di decorate (T6).

**Prove.** Pagina di confronto di
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(rendering affiancato + registro delle prove).

---

### A6. Overflow della tela con `unsigned int` su input degenere {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Interessato:** `1314` — un input derivato da un fuzzer (`fontsize="991836031967s8"`)
la cui dimensione di font assurda gonfia il disegno a ~2.75e11 pt.

**Che cosa succede.** C memorizza `job->width` / `job->height` come **`unsigned
int`** (`gvcjob.h:327-328`). Il `ROUND(...)` della enorme dimensione in punti
(`emit.c:1249-1250`) fa overflow a 32 bit e va a capo modulo 2³², e il backend SVG
lo emette attraverso un `%d` **con segno** (`gvrender_core_svg.c:258-259`) — così C
stampa `height="-425618343"`. Il porting mantiene il valore matematicamente
coerente (senza wrap). Ogni altro valore — `cx/cy/rx/ry` dell'ellisse del nodo, il
`translate` della radice, il poligono, il `font-size` del testo — è identico byte
per byte; differiscono solo larghezza/altezza del `<svg>` di primo livello.

**Perché non lo inseguiamo.** Replicare l'overflow intero a 32 bit di C non è un
comportamento di layout che valga la pena portare, e l'input è degenere. Da
rivedere se upstream corregge l'overflow (ad es. allarga il campo o limita la
dimensione).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Layout NaN degenere (`sfdp`, `repulsiveforce` patologico) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Interessato:** `2556` — `repulsiveforce=100` (⇒ la forza repulsiva usa
`pow(dist, 101)`), che porta il solver spring-electrical a **NaN in entrambi i
motori**. L'oracolo nativo stesso emette posizioni di nodi/archi tutte `nan` e un
riquadro di delimitazione degenere.

**Che cosa succede.** Con ogni coordinata NaN, le due implementazioni serializzano
la spazzatura in modo diverso: (1) il bb del grafo / il poligono di sfondo — C
arrotonda `NaN` a `int`, il che su arm64 dà spazzatura in scala `INT_MIN`
(`bb="0,0,-4.295e+09,
-4.295e+09"`); il porting mantiene `0`. (2) Le draw op degli archi — l'emissione
nativa sopprime `_draw_`/`_hdraw_` di una spline NaN (emettendo solo `pos`),
mentre il porting le emette con punti di controllo NaN. I disegni dei nodi
coincidono (entrambi li sopprimono). Su nessuno dei due lati esiste un layout
reale.

**Perché non lo inseguiamo.** Il porting riproduce già lo *stesso* collasso a NaN
del nativo — la correzione che ci ha portato lì è genuina (vedi sotto); resta solo
il modo in cui ciascuno serializza la spazzatura NaN. Replicare il comportamento
indefinito di `(int)NaN` di C e la sua soppressione del disegno delle spline NaN
non è fedeltà di layout significativa su un input il cui layout è degenere in
entrambi i motori. Da rivedere se upstream limita `repulsiveforce` o sanifica le
posizioni NaN.

**Correzioni al porting che hanno reso raggiungibile questo caso (non liquidate —
bug reali).** Prima di esse, il porting non riusciva nemmeno a raggiungere lo
stato degenere: (1) `armPow` (`src/common/arm-pow.ts`) lanciava un'eccezione su
qualunque argomento fuori dal percorso veloce; ora porta l'intero ramo dei casi
speciali di `pow.c` di ARM così `pow(NaN, y) = NaN` come in libm. (2) `bezierClip`
(`src/common/splines-geom.ts`) girava all'infinito su punti di controllo NaN
perché il suo test di convergenza era la semplice negazione di `while (ABS > .5)`
di C (equivalente per valori finiti, non per NaN); ora rispecchia esattamente C e
termina su NaN. Entrambe sono fedeli a C e riguardano solo input NaN.

---

### A7. Confine di arrotondamento della parete del riquadro con `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Interessati:** `graphs-honda-tokoro` e (aggiunto il 2026-07-28, nuovo
nell'universo di 905 elementi) il suo gemello della directory `graphs/directed/`
`tree-graphs-directed-honda-tokoro` (entrambi structural-match, maxΔ ≈ 1 pt
sull'unico arco `n012->n011`). Il gemello differisce solo per gli attributi
`samearrowhead`, che non toccano l'instradamento di questa coppia — la sua
geometria `n012->n011` è identica byte per byte all'id accettato sia sul lato del
porting sia su quello dell'oracolo, quindi il meccanismo seguente si trasferisce
alla lettera.

**Che cosa differisce.** La parete del riquadro del corridoio di testa di
`maximal_bbox` cade a x=90 interna in C contro x=89 nel porting per la porta
condivisa `samehead` dei due paralleli `n012->n011`. La costruzione della porta
condivisa (`buildSharedPort`) e il raggruppamento dei paralleli sono entrambi
conformi al byte a C; il divario di 1 px è puramente un artefatto del confine di
arrotondamento di `round()` — ~1e-14 di rumore in virgola mobile a monte fanno
passare all'intero vicino un valore che si trova esattamente su un confine `.5`.
La formula di `maximal_bbox` del porting rispecchia già esattamente quella di C.

**Perché non lo inseguiamo.** `round()` è una primitiva da cui passa ogni arco
instradato del corpus; ritoccarne il comportamento al confine per far coincidere
questo solo caso è un rischio di regressione su tutto il corpus per 1 px su 2
archi — lo stesso vincolo di primitiva condivisa dell'arrotondamento dello scafo
di controllo annotato in `bbox-class-control-hull-vs-curve`. Diagnosi completa:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Arrotondamento `fp-contract`/FMA vs. IEEE rigoroso (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Classe.** clang arm64 compila il binario dell'oracolo con
`-ffp-contract=on`, fondendo sequenze selezionate di moltiplicazione-addizione in
singole istruzioni FMA; il porting gira su V8, che esegue un arrotondamento
IEEE-754 rigoroso e non può emettere `fma`. Su input identici bit per bit i due
discordano di 1-2 ULP in qualunque espressione il compilatore abbia scelto di
contrarre. Il lato del porting è sempre il risultato IEEE-754 rigoroso; il lato
dell'oracolo è sempre il risultato contratto con FMA. È un vincolo di portabilità
di compilatore/runtime al di sotto della semantica del codice sorgente C, non un
difetto logico del porting — irriducibile senza emulare in software le specifiche
scelte di contrazione di clang. Sono note due istanze, in due punti diversi, con
due diversi meccanismi di amplificazione:

- **2646** — l'ULP nasce dentro la soluzione cubica `points2coeff`/`solve3` di
  `Proutespline` e inverte direttamente il numero di radici dell'adattatore di
  spline.
- **2620** — l'ULP nasce nel ciclo dell'estensione dei vertici del poligono di
  `poly_init` (dimensionamento dei nodi) ed è amplificato a valle dal troncamento
  intero fedele per rilassamento di `ortho` in un'inversione di pareggio tra
  corridoi del labirinto di pari costo.

**Interessato:** `2646` (structural-match, maxΔ 42.09 su 3 di 21.216 archi:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — tutti
instradamenti lunghi in smode di porta di record `:c->:nb_part`). Gemello di
**A3**: entrambe le classi sono pareggi irriducibili di portabilità in virgola
mobile dentro `Proutespline`, ma il meccanismo è distinto — un artefatto
`fp-contract` del compilatore, non l'`hypot` di libm.

**Che cosa differisce.** Su tutti e tre gli archi diverge solo l'ultima chiamata a
`routesplines` (un tratto rettilineo verso la porta di testa). Il suo estremo
giace con esattezza al bit sulla parete inferiore del poligono barriera, con la
tangente parallela a quella parete (`evs[1]=(1,-1.22e-16)`), quindi ogni
candidato di `splinefits` è tangente alla barriera in `t=1` — una radice quasi
doppia della cubica di intersezione. `points2coeff` calcola quella cubica
attraverso una cancellazione catastrofica (termini attorno a ~7446 che collassano
a ~0.099). L'oracolo (clang/arm64, `-ffp-contract=on`) contrae
`v3 + 3*v1 - (v0 + 3*v2)` in multiply-add fusi, mentre V8 esegue un arrotondamento
IEEE rigoroso — i due discordano di ~9.1e-13 su **input identici bit per bit**, e
quel rumore inverte il segno del discriminante di `solve3`: C trova 1 radice
(866.7, dentro il segmento); il porting ne trova 3, con una radice gemella
spuria a `t=0.9999975 < 1-EPSILON2`. La radice spuria innesca un'iterazione in più
di dimezzamento di `a`, che inverte di un fattore 2 il modulo della tangente
dell'ultimo pezzo (in entrambe le direzioni sui 3 archi), producendo il maxΔ 42.09
dopo il ritaglio (26 differenze SVG).

**Perché è accettato (irriducibilità dimostrata da un esperimento controllato).**
Tutte e sei le chiamate a `routesplines` sono state estratte su entrambi i lati —
riquadro, poligono, `PL`, inizio, fine ed `evs` sono identici byte per byte, come
anche la spline in uscita della chiamata precedente (non finale); l'unica
divergenza è dentro il `solve3` della chiamata finale. Un banco di prova autonomo
in C puro ha isolato l'unica variabile: compilando con `-ffp-contract=off` si
riproduce al bit il **porting** su tutti e 3 gli archi; con la contrazione
predefinita (`on`) si riproduce al bit l'**oracolo** su tutti e 3 gli archi. Il
porting concorda quindi già con il C a IEEE-754 rigoroso; la divergenza è
interamente la scelta di contrazione FMA del compilatore dell'oracolo, al di sotto
della semantica del sorgente C — non c'è alcuna infedeltà a livello di sorgente da
correggere. Una correzione mirata (emulare a mano la contrazione in
`points2coeff`) è stata tentata e confutata: corregge 2 dei 3 archi ma non il
terzo, la cui inversione nasce dentro la contrazione interna di `solve3`. Una
correzione completa richiederebbe l'emulazione software di FMA in tutto
l'adattatore di spline — un costo nel ciclo caldo, con un raggio d'azione di
arrotondamento su tutto il corpus, per un beneficio sotto il pixel su 3 archi.
Diagnosi completa: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Interessato (storico):** `2620` (era structural-match, maxΔ 585; 423 differenze
su 24 percorsi di arco + 22 punte di freccia). **Collassato a conformant il
2026-07-11**: il porting fedele dello spill del buffer di adiacenza di `sgraph` +
la contenzione bidirezionale di `chancmpid` (vedi
`.agent-notes/ortho-maze-circo-rca.md`) ha rimosso la divergenza; la voce di
accettazione è ritirata e questa sezione è conservata come documentazione della
classe A8.

**Che cosa differisce.** La pipeline `ortho` (`splines=ortho`) è conforme al byte a
C a parità di input — dimostrato iniettando l'esatto input del labirinto di C
(coordinate, `xsize`/`ysize`) nello stadio ortho del porting: 378/378 segmenti
instradati escono identici byte per byte, quindi nulla in `src/ortho` è in difetto.
La vera divergenza è di 1-2 ULP nell'*input* del labirinto: `ysize` del nodo (e,
per accumulo entro il rango, `ND_coord.y`) calcolato nel ciclo dell'estensione dei
vertici del poligono di `poly_init` di C (`shapes.c`), che con
`-ffp-contract=on` fonde `R.x += sidelength*cosx` in un FMA più grande di ~1 ULP
rispetto all'aritmetica IEEE rigorosa del porting (entrambi i lati implementano
l'espressione aritmeticamente identica). `2620` ha 173 nodi poligonali a larghezza
frazionaria; tutti mostrano C ≥ porting di 1-2 ULP. Quell'ULP è amplificato — non
introdotto — dal rilassamento di Dijkstra di `ortho`, che tronca fedelmente la
distanza corrente a ogni passo (`sgraph.c:165`, rispecchiato dal porting come
`Math.trunc`) su pesi derivati dalle estensioni grezze delle celle (`maze.c:257`).
La geometria spostata di un ULP inverte un pareggio tra corridoi di pari costo per
4 archi instradati (percorsi + le loro punte di freccia); le differenze restanti
sono una rinumerazione a cascata di ±1 traccia causata da quelle 4 inversioni.

**Perché è accettato (irriducibilità dimostrata da un esperimento controllato).**
Un banco di prova autonomo in C che varia solo `-ffp-contract` ha riprodotto
entrambi i lati sul vertice esagonale divergente: `-ffp-contract=on` →
`310.29250168188713` (coincide con l'oracolo), `-ffp-contract=off` →
`310.29250168188707` (coincide con il porting), con l'operazione divergente isolata
al vertice `i=3` (`R.x=-0.50000000000000011` fuso vs. `-0.5` non fuso). Un secondo
esperimento di iniezione dell'input (unica variabile: i valori di input di ortho)
ha confermato l'amplificatore: fornire all'`orthoEdges` del porting le esatte
`coord`/`xsize`/`ysize` di C porta a 0 tutte e 4 le divergenze dei corridoi — il
codice di ortho non ha difetti, è solo sensibile (come lo è l'instradamento a costo
del labirinto di C stesso) a uno spostamento di 1-2 ULP nel suo input. Farlo
coincidere significherebbe emulare la specifica contrazione FMA di clang di un
albero di espressioni compilato in `poly_init` — inseguire un artefatto compilato,
non portare semantica del sorgente. Diagnosi completa:
`plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Eccezione emulata (non accettata): `triang.c:ccw`.** Un sito di contrazione È
riprodotto bit per bit invece di essere accettato: il `ccw` di pathplan si compila
in `fnmul`+`fmadd` (primo prodotto esatto − secondo arrotondato), così un punto di
interrogazione uguale al bit a un estremo di segmento risulta ISCW/ISCCW invece di
ISON. `shortest.c:pointintri` rifiuta allora gli estremi coincidenti con vertici del
poligono («destination point not in any triangle») e `makeMultiSpline` ripiega
sull'instradamento semplice per ogni ciclo di lunghezza 2 coalescente — un
comportamento ampio, discreto e valido su tutto il corpus che il porting deve
riprodurre. A differenza dei siti `solve3`/`poly_init` qui sopra (nel profondo di
alberi di espressioni compilati, correzione confutata), `ccw` è una singola
funzione compilata autonoma con semantica pulita, quindi `src/pathplan/triang.ts`
la emula: percorso veloce in double semplice con un limite d'errore prudenziale
dove i segni semplice e fuso concordano dimostrabilmente, e un percorso esatto con
prodotto di Dekker + BigInt diadico per i casi vicini allo zero.

---

### A9. Trigonometria di libm a 1 ULP → inversione del pareggio cocircolare di CDT (multispline di `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Classe.** `Math.sin`/`Math.cos` di V8 non coincidono bit per bit con `sin`/`cos`
di libm di Apple (dimostrato: discordanza di 1 ULP a `2π·4.5/8`, uno degli otto
angoli degli spigoli dell'ostacolo ellittico). Gli spigoli dell'ottagono
circoscritto di `makeObstacle` ereditano quell'ULP, quindi le coordinate di input
del router a triangoli differiscono da quelle dell'oracolo di ≤6e-14. I layout
simmetrici (nodi di pari dimensione su un rango/anello) rendono i quadrilateri del
router **esattamente cocircolari** in aritmetica reale, così il predicato esatto
dell'incircle si trova su un filo di rasoio: l'ULP di input ne inverte il segno,
la diagonale di Delaunay vincolata si inverte, e il poligono del corridoio che
fallisce in `Pshortestpath` nell'oracolo («destination point not in any triangle»
→ ripiego sulla spline semplice) riesce nel porting (o viceversa). Le spline
risultanti differiscono di ~0.2–0.5pt. Gemello di **A3**/**A8**: un vincolo
irriducibile di portabilità in virgola mobile al di sotto della semantica del
sorgente C — farlo coincidere richiederebbe di riprodurre in JS l'esatto
arrotondamento di `sin`/`cos` di libm di Apple.

**Interessati:** `241_0` (circo Δ≈0.2 / canvas di twopi Δ≈9 tramite l'inversione
del corridoio sull'arco `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29`
(twopi, 1–2 differenze di posizione di etichette d'arco ciascuno — l'ULP di libm
nasce nella trigonometria dei vertici unitari di `poly_init`
(`hypot`/`atan2`/`sin`), porta l'altezza calcolata di un nodo un ULP oltre il
limite della dimensione minima su cui l'oracolo cade esattamente, e a cascata
attraverso `floor()` nel caricamento dell'R-tree delle xlabel provoca
l'inversione di un singolo candidato di etichetta. Una correzione con `hypot`
correttamente arrotondato è stata tentata e CONFUTATA: sistemava `2343` ma faceva
regredire `2168_3`, il cui dimensionamento dell'ottagono passa per la stessa
chiamata dove il valore dell'oracolo NON è quello correttamente arrotondato —
nessuna politica deterministica di hypot coincide con l'oracolo su entrambi).
`2168_1` stava originariamente in questa classe ma è diventato conformant una volta
che il porting ha emulato il `ccw` dell'oracolo con fp-contract (`triang.ts` di
pathplan): il suo fallimento del corridoio è governato dal rifiuto FMA
dell'estremo-vertice in `pointintri`, che il porting ora riproduce bit per bit,
quindi il pareggio di ULP sulla diagonale di CDT non emerge più lì.

**Perché è accettato (irriducibilità dimostrata da un esperimento controllato).**
Lo stesso CDT è scagionato: il `mkSurface` del porting è un porting fedele
dell'inserimento incrementale di GTS 0.7.6 (`cdt.c`: divisione 1→3 + 
`swap_if_in_circle` ricorsivo, archi di vincolo pre-creati e non scambiabili,
imposizione dei vincoli con `remove_intersected_*` + `triangulate_polygon`), e un
banco di prova autonomo in C che collega la **vera libreria GTS** e riceve gli
input del router del porting, esatti al bit, riproduce la triangolazione del
porting faccia per faccia (2168_1: 22/22; 241_0: 185/185). La valutazione in
razionali esatti del determinante dell'incircle sui due insiemi di input conferma
l'inversione del segno (+1 con gli input del porting, −1 con quelli dell'oracolo).
La variabile residua — la differenza di 1 ULP nella trigonometria — è stata isolata
confrontando direttamente i pattern di bit di `Math.sin`/`sin`.

**Accettazione per traccia del motore (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Le **tracce xdot dei motori** twopi/circo
(`parity-twopi.json` / `parity-circo.json`, oracolo nativo `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, confronto semantico delle draw-op a ±0.01 —
vedi `test/golden/compare-xdot.ts`) fanno emergere questo stesso meccanismo in
modo indipendente dal rilevamento SVG del motore dot citato sopra: twopi `2239`
(1 differenza di draw-op — l'inversione della posizione del testo dell'etichetta
d'arco `_ldraw_`, lo stesso ULP della trigonometria dei vertici unitari di
`poly_init` a cascata nella catena dell'R-tree delle xlabel con `floor()`; `2343`,
`share-b29` e `windows-b29`, originariamente accettati sotto questa voce, sono
stati *corretti* il 2026-07-11 dalla fedele contrazione fmadd in
`polylineMidpoint` — vedi il paragrafo sulla famiglia b29 più sotto) e circo
`241_0` (41 differenze di draw-op, Δ≈0.2pt sulla bezier instradata dell'arco
`1->2` — la stessa inversione del corridoio per diagonale di CDT; diario delle
decisioni, voce 2026-07-10 «CDT rewritten as faithful GTS port; 2168_3
outline-ring obstacle; 56/osage bb clobber; A9 filed»). Accettata a livello di
traccia del motore tramite `test/corpus/accepted-divergences-engines.json`, unito
in `PARITY-twopi.md`/`PARITY-circo.md` da `parity-report.ts` — la stessa unione che
`accepted.ts` esegue per il `PARITY-dot.md` della traccia dot.

**circo `2475_2` — pareggio di hypot per closestNode cocircolare.** In una
componente di 28 nodi di questo grafo da 10762 nodi, il `getRotation` di circo
(`circpos.c:73-92`) sceglie il nodo del blocco più vicino all'origine del layout
tramite `hypot` per decidere la rotazione del sotto-blocco. Due nodi cocircolari
sono di fatto equidistanti; l'`Math.hypot` di V8, correttamente arrotondato, e
l'`hypot` di libm di Apple arrotondano quella distanza a 2 ULP di distanza, il che
inverte il `<` stretto, seleziona un nodo diverso e ruota/riflette il sotto-blocco
di ~20° (18 nodi si spostano, max 296.7pt; gli altri 10744 nodi sono identici al
bit, come l'albero dei blocchi, l'ordine sul cerchio e ogni `centerAngle`). La
politica dell'hypot correttamente arrotondato era già stata confutata per questa
classe (2026-07-10). Riproduzione autonoma: `.agent-notes/circo-2475-590-repro.dot`;
analisi completa della causa radice: `.agent-notes/circo-b81-2475-rca.md`
(accettato il 2026-07-11).

**twopi `2470` — ULP nella coordinata radiale amplificato dall'R-tree delle xlabel.**
2470 è un grafo di 140 archi le cui etichette d'arco HTML `<table>` si
raggruppano su ancoraggi radiali quasi coincidenti. Nella famiglia neato, le
etichette d'arco sono collocate come etichette esterne dal collocatore xlabel
goloso (`label/xlabels.c`), che sceglie l'angolo candidato con meno sovrapposizioni
tramite un R-tree ordinato per Hilbert. Le spline e le coordinate dei nodi del
porting coincidono con l'oracolo alla precisione di emissione (zero differenze di
spline/nodi/bbox anche a 1e-7), ma la `ND_coord.y` radiale di un nodo differisce di
~2 ULP (`sin`/`cos` di libm di Apple vs `Math` di V8) — ben al di sotto della
soglia di conformità, eppure a cavallo del confine `floor(pos.y − sz.y/2)` esattamente
a 0 in `objplpmks`, invertendo di una unità il rettangolo R-tree di quell'oggetto. Il
cambio di ordine di Hilbert/raggruppamento dell'albero fa sì che `RTreeSearch`
pota un ramo diverso, quindi ~140 etichette si agganciano ciascuna all'angolo
candidato adiacente (ogni differenza è un passo fisso (+larghezza, −altezza di
riga)). Il collocatore, l'ordine degli oggetti, l'arrotondamento dei rettangoli,
`CombineRect` (che rispecchia fedelmente la stranezza min-min di C) e la chiave di
Hilbert int32 sono stati verificati uno per uno come fedeli; la divergenza è l'ULP
della trigonometria radiale a monte, irriducibile per lo stesso motivo di twopi
`1855`. Accettato il 2026-07-11; analisi completa della causa radice:
`.agent-notes/twopi-2470-rca.md` (che documenta anche come il «superamento» mattutino
dell'id fosse un artefatto di un binario oracolo obsoleto, non una regressione del
porting).

**osage `1855` — sbavatura fp-contract nei vertici degli ostacoli.** Distinta dalla
voce dello specchio radiale di twopi `1855` qui sopra: con osage i centri dei nodi
sono esatti al bit rispetto all'oracolo, e le 110 differenze di draw-op sono tre
archi instradati attorno a ostacoli collocati sul lato speculare di una riga di
nodi (X esatta al bit, Y speculare). I vertici dell'ostacolo ottagonale da
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) differiscono da
C di 3–4 ULP perché `-ffp-contract=on` di clang fonde le catene `a·b±c` in
`ellipse_tangent_slope`/`line_intersection` in FMA a singolo arrotondamento mentre
V8 arrotonda ogni operazione: l'arrotondamento fuso di C fa collassare una colonna
di corridoio di valori x degli spigoli in un unico double identico al bit
(esattamente collineare), mentre quello del porting la divide in due valori distanti
1 ULP. Ciò inverte il test di tangenza `clear()` della visibilità — il corridoio
non è più bloccato — aggiungendo ~20 archi di visibilità, e Dijkstra risolve il
pareggio di omotopia su/giù verso il lato speculare. Esperimento controllato:
iniettare le esatte coordinate degli ostacoli di C nel porting altrimenti intatto dà
**zero** archi divergenti, scagionando per intero la catena di disposizione
legale, visibilità, Dijkstra e spline; iniettare da sole le `cos`/`sin` di libm di C
non cambia nulla. Accettato il 2026-07-11; analisi completa della causa radice:
`.agent-notes/osage-spline-family-rca.md`.

**Famiglia b29 (twopi).** Le quattro varianti b29 condividono un unico filo di
rasoio: l'etichetta d'arco `EqmtTyp` (`Node14732->Node14731`) si trova su un
pareggio esatto nella selezione del lato di placeLabels il cui esito dipende dalla
deriva di 1 ULP del layout twopi negli oggetti circostanti. Con la fedele
contrazione fmadd in `polylineMidpoint` (correzione della famiglia states,
2026-07-11) l'ancoraggio dell'etichetta del porting è identico al bit a quello
dell'oracolo, eppure il pareggio si risolve ancora in modo opposto su due delle
quattro varianti (`graphs-b29`, `linux.i386-b29`) mentre le altre due
(`share-b29`, `windows-b29`) ora sono conformi — e la differenza di etichetta
accettata di `2343` in A9 è scomparsa del tutto. Limite: 1 draw-op, Δ12pt sulla y
dell'etichetta. Irriducibile senza eliminare la deriva a monte. Analisi completa
della causa radice: `.agent-notes/twopi-states-rca.md`.

Lo stesso filo di rasoio di placeLabels emerge sulla traccia **osage** (accettato
il 2026-07-11, analisi completa della causa radice:
`.agent-notes/osage-small-tail-rca.md`): `linux.i386-b29` e `share-b29` (2
differenze di draw-op ciascuno — l'ancoraggio x di un'etichetta d'arco cade a 878.28
contro 841.06, collocato simmetricamente rispetto al punto medio della spline
identico al bit 859.67, cioè ±metà larghezza dell'etichetta; le due varianti sono
speculari tra loro) e `1652` (2 differenze di draw-op — due archi invertono ciascuno
un ancoraggio di etichetta attorno a un punto medio identico, uno in x e uno in y,
con spline e punte di freccia identiche al bit; l'oracolo renderizza completamente,
quindi non è il noto timeout instabile del nativo). In ogni caso la geometria degli
archi è esatta al bit e solo il pareggio nella selezione del lato dell'etichetta si
risolve in modo opposto su un contorno con deriva di 1 ULP.

La traccia osage ospita la tripletta `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; accettata il 2026-07-11, analisi completa
della causa radice in `.agent-notes/patchwork-tail-rca.md`): l'unica operazione
divergente è la trascendente nuda `cos(π+θ)` in un vertice di quadrilatero distorto
a orientamento 180 — il `Math.cos` di V8 è correttamente arrotondato mentre il
`cos` di libm di Apple porta un errore di ±1 ULP dipendente dall'argomento (quindi
solo con libm `|cos(π+θ)| ≠ |cos(θ)|`); la differenza di 1 ULP nella dimensione del
nodo alimenta `GRID`/`ceil` di pack, rompe un pareggio di perimetro, e il qsort
colloca due componenti nelle celle di impaccamento l'una dell'altra — uno scambio
rigido di interi nodi senza errori di forma o di instradamento. Nessuna riscrittura
deterministica può riprodurre una funzione trascendente di libm non correttamente
arrotondata, la forma A9 da manuale.

Lo stesso meccanismo è stato confermato il 2026-07-28 sul gemello più grande
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nuovo nell'universo
di 905 elementi; 112 differenze di draw-op, solo osage). L'operazione divergente è
la stessa identica `cos(π+θ)` a 1 ULP del nodo `9004` — i valori `bb.x` di C e del
porting coincidono byte per byte con la RCA originale — ma su questo input di 76
nodi la propagazione passa invece per l'`arrayRects` di osage: `acmpf` ordina le
celle di impaccamento per la somma grezza `width+height`, e la larghezza di 1 ULP
più alta di libm fa ordinare `9004` strettamente prima dei suoi fratelli ruotati
`9000/9002/9006` mentre il valore correttamente arrotondato di V8 lascia un
pareggio esatto a 4 che il qsort instabile ordina diversamente — celle diverse in
ordine per righe, uno scambio `9002`/`9006` e una cascata di `fmax` sulla larghezza
delle colonne che sposta 8 vicini in x. Fornendo al proprio `arrayRects` del porting
le dimensioni dei nodi di C contro quelle del porting si riproducono i 10 nodi
spostati del rilevamento con delta x coincidenti al byte, chiudendo la catena
causale.

Altre due istanze sulle tracce dei motori sono state ricondotte alla causa radice e
accettate il 2026-07-11 (analisi completa della causa radice:
`.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 differenze di draw-op — il
gemello della voce circo qui sopra: lo stesso pareggio cocircolare dell'incircle di
CDT, invertito da `sin`/`cos` di libm a 1 ULP, fa riuscire il corridoio multispline
del porting con una spline a 14 punti dove la build nativa ripiega
sull'instradamento semplice a 8 punti; delta dei punti < 0.07pt) e circo
`windows-tree` (10 differenze di draw-op su un arco del ventaglio — la
trigonometria di posizionamento di circo porta `node2.y` un singolo ULP sopra
`node8.y` attorno al valore esattamente simmetrico 18.0, e la selezione della porta
di testa dyna di `closestSide` inverte TOP/BOTTOM a quel pareggio esatto; per il
resto posizioni e riquadri dei nodi sono identici al bit all'oracolo).

**Traccia xdot di sfdp — pareggi FP sugli archi (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> La traccia xdot del motore sfdp (`parity-sfdp.json`,
`dot -Ksfdp -Txdot` nativo, ±0.5) fa emergere il pareggio cocircolare dell'incircle
di CDT una volta iniettate le esatte posizioni native pre-instradamento (quindi la
divergenza NON è deriva iterativa — vedi la classe A1-drift — ma un pareggio
discreto di predicato):

- `42` e `241_0` — pareggio cocircolare dell'incircle di CDT (il corridoio
  multispline). Con le posizioni iniettate il residuo è un'**inversione del numero
  di segmenti**: `42` `opCount 5 vs 9` (arco 0->3) / `ptCount 32 vs 26` (3->7);
  `241_0` `ptCount 14 vs 8` (arco 3->2) — la diagonale di Delaunay vincolata del
  porting si inverte rispetto all'oracolo, così il corridoio multispline riesce
  con una spline a N punti dove la build nativa ripiega su un instradamento semplice
  più corto (o viceversa), esattamente come la voce `241_0` di twopi/circo qui
  sopra. Il porting emula già la contrazione `fmadd` di arm64 nel predicato
  incircle/`ccw` (`src/pathplan/triang.ts`, `src/common/fma.ts`) e usa un Delaunay
  con incircle robusto; il residuo è l'ULP di `sin`/`hypot` tra V8 e libm di Apple
  nell'input del predicato, che nessun codice portabile riproduce.

> **`2095` riclassificato da A9 ad A1-drift (2026-07-22).** In precedenza era
> elencato qui come «il gemello hypot» (deriva sotto 0.7pt sugli archi di un nodo
> dal nome vuoto `""->"4"`). Quel residuo era un **artefatto del banco di prova**:
> la regex `GVTS_POS` dell'iniettore di attribuzione richiedeva ≥1 carattere nel
> nome, quindi il nodo con nome `""` non veniva mai iniettato e trascinava i suoi
> due archi incidenti. Con l'iniettore corretto per accettare nomi vuoti
> (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), `2095` di sfdp si inietta a **0
> residuo** — pura deriva delle forze, coperta dalla classe A1-drift calcolata, non
> un pareggio FP di instradamento. La sua accettazione per id è stata rimossa da
> `accepted-divergences-engines.json`. (Stesso riscontro di `2095` di fdp più
> sotto.)

**Nuovo esperimento controllato (2026-07-21).** Una sonda di `hypot` nativo vs V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): compilare l'`hypot`
C di sistema e confrontarlo con `Math.hypot` di Node su input rappresentativi di
deviazione di archi piatti mostra una discordanza di 1 ULP su 2 casi su 6 (Δ 7.1e-15
e 5.7e-14) — il filo di rasoio della soglia di divisione che inverte il numero di
suddivisioni. Irriducibile: nessun hypot portabile riproduce libm di Apple (il
precedente di `arm-pow.ts` per lo stesso confine). Accettato a livello di traccia
del motore tramite `accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

La traccia xdot del motore **fdp** (`parity-fdp.json`, `dot -Kfdp -Txdot` nativo,
±0.5) fa emergere lo STESSO pareggio cocircolare di CDT sullo stesso grafo,
`241_0`: con le esatte posizioni pre-instradamento dell'oracolo iniettate, il
residuo è di 11 differenze numeriche di `unfilled_bezier` confinate a un solo arco
(`0->1#0`, maxΔ 3.39pt). Poiché le posizioni dei nodi sono identiche per
iniezione, la divergenza è a valle nel corridoio multispline di pathplan — lo stesso
pareggio dell'incircle dovuto a 1 ULP di libm di twopi/circo/sfdp `241_0`
(incircle in razionali esatti 185/185 qui sopra). Le leve sono già applicate
(`fmadd` di `src/pathplan/triang.ts`, `Math.hypot` di `src/pathplan/route.ts:198`);
il pareggio è irriducibile. Accettato tramite `accepted-divergences-engines.json`
`fdp.241_0`. `2095` di fdp, al contrario, è **A1-drift, non A9**: iniettare il
singolo nodo dal nome vuoto (dopo che l'iniettore di attribuzione è stato corretto
per accettare i nodi con nome `""`) porta a zero il suo residuo — la precedente «coda
A9» era il nodo vuoto non iniettato che trascinava i suoi archi incidenti. Anche
l'accettazione di `2095` di sfdp era lo stesso punto cieco — una nuova
rigenerazione dell'attribuzione sfdp (2026-07-22) con l'iniettore corretto ha
confermato che si inietta anch'essa a 0, e la sua accettazione è stata rimossa (vedi
la nota `2095 riclassificato` qui sopra).

---

## Coda lunga monitorata (attributi di `dot` e casi limite) {#tracked-long-tail-dot-attribute-edge-case}

Con le impostazioni **predefinite**, il motore `dot` coincide con il binario C entro
una tolleranza deterministica stretta sul corpus golden (il verdetto `conformant`;
vedi la nota in cima). Le differenze rimanenti sono la **coda lunga di attributi e
casi limite** — la parte storicamente difficile di qualunque porting di Graphviz. A
differenza degli scarti accettati qui sopra, queste *verranno* colmate; sono
monitorate dal vivo, con i conteggi, in
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Categoria | Che cosa differisce |
|---|---|
| **path-structure** | Instradamento delle spline degli archi in configurazioni specifiche (ad es. alcuni casi di archi piatti e di corridoi densi). |
| **element-count** | Una funzionalità che in certi grafi emette più/meno elementi SVG di C. |
| **color-stroke** | Differenze nell'emissione di tratto/riempimento per specifici attributi di stile. |
| **parser-gap** | Un piccolo numero di input DOT che il parser non accetta ancora per intero. |

Se il tuo grafo usa solo attributi comuni e il motore `dot`, quasi certamente sei
sul percorso di corrispondenza a tolleranza deterministica. Se un layout sembra
sbagliato, controlla `PARITY-dot.md` per quella classe di input — è probabilmente
una voce monitorata con una missione di correzione ancorata all'oracolo, non
un'incognita.

> **Nota sui casi guidati dalle etichette.** La classe di misurazione del testo
> (A2) è chiusa — nessun grafo `dot` è più accettato sotto di essa. Un grafo che
> oggi sta a structural-match è una lacuna monitorata, non uno scarto di metriche
> dei font.

### Punte di freccia degli archi opposti con `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Quando `concentrate=true` fonde una coppia antiparallela (`A->B; B->A`) in un unico
arco superstite, quell'arco deve disegnare una punta di freccia a **entrambe** le
estremità. Ora questo è portato (il ramo `conc_opp_flag` di `arrow_flags`; vedi
`src/common/splines-clip.ts:arrowFlags`), quindi `graphs-b135`, `167` e `2087`
coincidono (la divergenza `element-count` della punta di freccia mancante e il suo
effetto collaterale sul `@d` della spline non ritagliata sono entrambi spariti).

Alcuni grafi con concentrate **conservano un residuo separato e preesistente** che
la correzione della punta di freccia **non** risolve — è uno scarto di posizione
della **coordinata x** dei nodi (network simplex della x / porte di bussola), non un
difetto della punta di freccia:

- **`graphs-b15`, `graphs-b69`** — i grandi grafi «ascensore» di record/cluster.
  Concentrate si attiva e fonde correttamente; il residuo è uno scarto di ~1pt nella
  x dei nodi che si amplifica in una differenza di `element-count`/`@d` della
  spline. L'emissione della punta di freccia in sé è ora corretta (b69 guadagna i
  suoi poligoni di punta di freccia mancanti). Vedi la nota di agente
  `b69-concentrate-undermerge` per la causa radice nella coordinata x.
- **`1453`** — diverge ancora per una causa `element-count` di primo livello non
  correlata alla punta di freccia `conc_opp_flag`.
- **`2825`** — al momento di questa correzione delle punte di freccia, divergeva per
  una causa `element-count` di primo livello non correlata a conc_opp_flag (lì non
  scatta alcuna fusione di coppie opposte); da allora chiuso dalla missione
  fix-2825-rebuild-vlists, vedi A4 qui sopra.

Si tratta di voci monitorate sulla coordinata x / strutturali, **non** di bug delle
punte di freccia.

### Lacune di fedeltà del layout dalla missione di fedeltà 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

La missione di fedeltà 2.0 ha fatto fallire rumorosamente i valori di attributo non
portati (vedi la tabella `UNSUPPORTED_FEATURE` in
[Errori ed eccezioni](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Ha lasciato quanto segue, registrato in `plans/v2-fidelity/decision-journal.md`.

**Rumorose, non portate.** `overlap=voronoi` con nodi sovrapposti lancia ancora
`UNSUPPORTED_FEATURE` in neato, twopi, circo e sfdp: l'adattatore di Voronoi in sé
(l'algoritmo di `vAdjust`) non è portato. Il test di sovrapposizione che decide se
lanciare l'eccezione è quello di C (`countOverlap` sui poligoni dei nodi di
`poly.c`).

**Lacune note, ancora silenziose.** Il porting renderizza questi casi senza errore e
differisce da Graphviz nativo. Individuate dalla missione `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); non sono scarti accettati.

- **L'avviso «Unrecognized overlap value» di `getAdjustMode` non viene emesso.**
- **I vertici dei poligoni ruotati possono differire dal nativo negli ultimi bit
  (irriducibile: libreria matematica dell'host).** `poly_init` orienta ogni vertice
  con `atan2`, `hypot`, `sin` e `cos`. Con input identici bit per bit, libm di macOS
  e V8 restituiscono ultimi bit diversi (ad es. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` al vertice successivo:
  libm `…fffd`, V8 `…fffe`), così un riquadro con `orientation=20` ottiene la y del
  vertice `-18` nel porting e `-17.999999999999996` nel nativo. Lo stesso Graphviz
  nativo varia con la libm della piattaforma, e un browser non può chiamarla. L'aritmetica
  propria del porting coincide con C (ordine di `RADIANS` fissato; 776 delle 1664
  coordinate di vertice campionate sono identiche al bit, le altre differiscono solo
  per libm). Effetto: i verdetti di `polyOverlap` a contatto esatto possono
  invertirsi; con i vertici nativi ogni verdetto coincide.
- **sfdp può differire dal nativo su macOS (irriducibile: `pow` di libm dell'host).**
  Diagnosticato con un sfdp nativo strumentato: le posizioni restano identiche al
  bit finché un termine della forza repulsiva, `pow(dist, 1 - p)`
  (`spring_electrical.c`, `p = -1` quindi `pow(x, 2)`), restituisce 1 ulp in meno di
  `x*x` dalla libm di macOS (`pow(1.4116727416983157, 2)`: libm
  `1.9928199296540394`, correttamente arrotondato `…396`; su macOS `pow(v, 2) != v*v`
  per 20 su 16201 `v` campionati). Ciò cambia `Fnorm` dell'iterazione nell'ultimo
  bit; il raffreddamento adattivo di sfdp lo amplifica in un layout diverso (spesso
  speculare). L'`armPow` del porting è il `pow` delle optimized-routines di ARM
  (glibc ≥ 2.28), cioè ciò che calcola Graphviz su Linux; l'oracolo macOS è il caso
  anomalo. Esclusi: il seeding (i valori espliciti di `start=` coincidono),
  `pcp_rotate` (lo stesso input dà lo stesso output), le posizioni e il termine
  attrattivo (identici al bit). Esempio: un triangolo isolato `a--b; a--c; b--c` con
  il seed predefinito.
- **fdp può differire dal nativo per via di `cos`/`sin` di libm dell'host.** fdp
  segue Graphviz dopo la 15.0.0 (repulsione con distanza hypot, `Mlimit`), con
  l'`hypot` di libm dell'host riprodotto bit per bit (`src/common/libm-hypot.ts`, 0
  discordanze su 400k campioni). 251 dei 252 input golden renderizzabili con fdp
  coincidono esattamente con la build nativa; quello restante
  (`parallel-cluster-ldbxtried`) colloca i nodi-porta dei cluster con
  `T_Wd * cos(alpha)`, e `cos(-2.3840764867756761)` di libm di macOS dista 1 ulp dal
  `Math.cos` di V8; il ciclo delle forze di fdp lo amplifica a circa 3 pollici. Il
  `cos` di Apple non è riproducibile da un breve modello come lo è `hypot`.
- **Crash nativi che il porting definisce.** Graphviz nativo esce con 139 su neato
  con `mode=KK` e `model=mds` e un `len` d'arco (`mds_model` indicizza `GD_dist` con
  un numero di sequenza a base 1: overflow dell'heap), e con `model=circuit` su un
  grafo non connesso. Il porting scarta le celle fuori intervallo nel primo caso e
  ripiega sui cammini minimi nel secondo; non c'è alcun output nativo con cui
  confrontarsi.

---

## Intenzionalmente non portato (non-obiettivi) {#intentionally-not-ported-non-goals}

Sono confini di ambito deliberati, non bug. La libreria ha come bersaglio **SVG**
(più i formati di testo intermedi `json` / `xdot` / `dot` / imagemap).

- **Altri formati di output.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS e i
  backend GUI/interattivi sono fuori ambito. Usa l'output SVG e converti a valle se
  ti serve un raster.
- **Paginazione `page=` per SVG.** Nemmeno `dot` nativo pagina l'SVG (il dispositivo
  SVG non imposta alcun flag di paginazione), quindi `page=` è un'operazione nulla
  su questo percorso in entrambe le implementazioni — documentato qui solo perché è
  un punto comune di confusione.
- **Output di testo `-Tplain`.** Rimandato (un formato di testo fedele), non
  escluso.
- **`gvpr`** (il linguaggio di scripting per l'elaborazione dei grafi) — fuori
  ambito.
- **Wrapper di comodo in C++** (`cgraph++`, `gvc++`) — l'API C è portata per prima;
  uno strato di comodo in TypeScript idiomatico, se desiderato, sarebbe un pacchetto
  separato.
- **`fontnames=svg|ps` nella misurazione del testo nel browser.** In un browser il
  misuratore su canvas costruisce il proprio font dall'elenco di famiglie
  `fontnames=native` dell'alias PostScript (`Times-Roman` → `Times, serif`), la
  stessa faccia che l'emettitore SVG renderizza per impostazione predefinita.
  `TextMeasurer` non porta alcun contesto del grafo, quindi i grafi che impostano
  `fontnames=svg` o `fontnames=ps` vengono misurati contro l'elenco nativo mentre
  l'SVG nomina la famiglia svg/ps. I pesi degli alias che CSS non definisce (`book`,
  `demi`, `light`, `medium`, `roman`) vengono emessi alla lettera, come in C; i
  browser li ignorano e renderizzano il peso normale, e il misuratore misura il peso
  normale per coincidere. L'output di Node non è interessato (non usa mai il
  misuratore su canvas).
- **Meccaniche solo native** sostituite da equivalenti sicuri per il browser: il
  caricamento dinamico dei plugin (`dlopen`) è sostituito dalla registrazione statica
  di motori/renderer; le letture dal filesystem (font, immagini, configurazione) sono
  sostituite da callback fornite da chi chiama (ad es. `setImageSizer`). Il
  comportamento è preservato; cambia il meccanismo.

---

## Segnalare una divergenza {#reporting-a-divergence}

Se trovi un output che differisce da C e **non** è uno scarto accettato qui sopra,
non è in `PARITY-dot.md` e non è un non-obiettivo, è un bug che vale la pena
segnalare — il sorgente C è la specifica, e le divergenze non elencate sono trattate
come difetti, non come comportamento accettato.
