---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformità: che cosa significa «corrispondere» {#conformance-what-match-means}

@knowvah/dot-engine viene validato rispetto al binario canonico di Graphviz in C, usato come oracolo.
Quando questo progetto dice che un grafo **corrisponde** a C — il verdetto di parità
chiamato `conformant` — intende una proprietà specifica, verificata meccanicamente,
**non** una letterale uguaglianza byte per byte del testo SVG.

> **Definizione.** Un rendering del porting è **conforme** al rendering dell'oracolo quando,
> dopo aver analizzato entrambi gli SVG in un albero di elementi normalizzato:
>
> 1. ogni valore **numerico** (coordinate, dati dei percorsi, `points`, `viewBox`,
>    parametri di `transform`) coincide con l'oracolo entro una **tolleranza**
>    fissa, e
> 2. ogni valore **non numerico** (nomi dei tag, colori, contenuto testuale, chiavi
>    degli attributi, valori enumerati degli attributi) è **esattamente uguale**.
>
> Se un qualunque valore numerico supera la tolleranza, o un qualunque valore non
> numerico differisce, il rendering **non** è conforme.

## Perché non i byte letterali? {#why-not-literal-bytes}

SVG serializza le coordinate in virgola mobile come testo decimale. Due rendering
matematicamente equivalenti possono comunque differire nell'ultima cifra stampata a causa
dell'arrotondamento IEEE-754, dell'ordine delle operazioni in virgola mobile e del
comportamento di `libm`/FMA dipendente dalla piattaforma, che varia con la CPU e con il motore JS.
Una soglia sui byte letterali sarebbe quindi **non verificabile** sui runtime a cui questa
libreria si rivolge (browser, Node, CPU diverse) invece che semplicemente rigorosa. La
conformità fissa la proprietà che conta davvero — la geometria e il contenuto che vede
chi guarda — a un limite abbastanza piccolo da essere impercettibile.

## La tolleranza esatta {#the-exact-tolerance}

La tolleranza è **per classe di motore**, definita in
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Classe | Tolleranza (pt) | Motori |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

I motori deterministici riproducono essenzialmente in modo esatto le coordinate intere/stampate di C,
quindi ±0.01 assorbe solo il rumore di formattazione decimale. I motori iterativi
(force-directed) dipendono da funzioni trascendenti i cui risultati nell'ultimo bit
non sono riproducibili tra piattaforme, quindi hanno un limite più largo e vengono
inoltre verificati per uguaglianza **strutturale** (stesso albero di elementi).

Un'avvertenza per la superficie **plain/plain-ext**: plain stampa le coordinate in
pollici con 5 cifre significative (`%.5g`), quindi a grandezze ≥ 100 il passo di stampa
(0.01) è pari alla tolleranza ±0.01. Su grafi molto grandi una differenza di layout
sotto l'ULP che si trovi a cavallo di un confine di arrotondamento della 5ª cifra
viene stampata come un intero passo di 0.01 e segnalata, anche se la geometria
sottostante è identica a ~1e-11 pt (vedi l'accettazione di circo `2108`,
diario 2026-07-28). Le superfici xdot/json, che stampano in punti, sono il confronto
geometrico autorevole in quel regime.

La **rilevazione di parità del corpus** valuta ogni grafo nella modalità `deterministic`
(±0.01) a prescindere dal motore — vedi
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Leggi il codice {#read-the-code}

La definizione qui sopra non è un'aspirazione a parole — è esattamente ciò che fa il
codice di confronto. Per verificarlo di persona:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (la tabella ±0.01 / ±0.5) e `compareSvg`, che percorre i due alberi
  normalizzati e applica la regola (1) numerico-entro-la-tolleranza e la regola (2)
  non-numerico-esatto attributo per attributo.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — come l'SVG grezzo viene analizzato nell'albero di elementi confrontabile.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, che assegna uno dei verdetti qui sotto. `survey.ts` copre solo
  la traccia SVG di `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — la rilevazione **xdot** per motore (`npx tsx test/corpus/engine-walk.ts <engine>`),
  che applica la stessa suddivisione in classi della tabella qui sopra
  (`TOLERANCE = 0.5` per `neato`/`fdp`/`sfdp`, `0.01` per ogni altro motore)
  e confronta flussi semantici di draw-op (`compareXdot`) invece dell'SVG. È così che
  vengono misurate le tracce `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`;
  la traccia xdot di `dot` usa il gemello
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## I verdetti {#the-verdicts}

La rilevazione assegna a ogni grafo esattamente un verdetto. Conteggi aggiornati per traccia:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
riassume ogni traccia motore × superficie (deterministiche e iterative insieme);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
è il dashboard SVG di `dot`, e ogni altro motore ha il proprio dashboard
`PARITY-<engine>.md` accanto a esso in `test/corpus/`:

| Verdetto | Significato |
|---|---|
| **`conformant`** | Corrisponde all'oracolo secondo la definizione qui sopra (numerico entro la tolleranza, non numerico esatto). |
| **`structural-match`** | Stesso albero di elementi, ma uno o più valori numerici superano la tolleranza. |
| **`diverged`** | Gli alberi di elementi differiscono (un elemento mancante/in più o una discordanza non numerica). |
| **`errored` / `timeout`** | Il porting non è riuscito a renderizzare l'input (`errored`; `port-error` sulle tracce per motore) o ha superato il proprio budget di tempo (`timeout`). Conteggiato come fallimento: rientra nel denominatore della percentuale di superamento, mai come superamento. |
| **`oracle-error`** | L'oracolo C non è riuscito a renderizzare l'input, quindi non c'è alcun riferimento con cui confrontare. Fuori ambito: escluso dal denominatore della percentuale di superamento. |

La **percentuale di superamento** su ogni dashboard è `conformant / (surveyed − oracle-error)`.

«Conformant» è la soglia; «structural-match» è un progresso significativo (forma giusta,
coordinate ancora in deriva); «diverged», «errored» e «timeout» sono lacune reali.
Nessuno di questi è un'affermazione di output identico byte per byte.

Alcuni grafi non portano **alcun verdetto** su un dato motore: vedi *esclusioni per
motore* qui sotto.

### Esclusioni per motore {#engine-exclusions}

Una coppia `(graph, engine)` esclusa non viene percorsa, quindi non è né conforme né
divergente — semplicemente non viene misurata lì. È cosa distinta da una divergenza
accettata, dove il confronto *è* avvenuto e la differenza è perdonata con una causa
documentata.

La soglia è deliberatamente alta, perché un grafo non esaminato è un buco di copertura
e non un costo noto. Una voce richiede tutte e tre le condizioni: l'algoritmo del motore
non può dimostrabilmente entrare in azione con l'input, saltarlo fa risparmiare tempo
reale, e lo stesso comportamento è verificato su una traccia più economica. Essere
*lento* non basta, esplicitamente — un cattivo rapporto porting/oracolo è proprio ciò che
sembra un vero difetto di prestazioni, ed escludere per questo motivo nasconderebbe
esattamente ciò per cui esiste il corpus.

Ogni esclusione è elencata con il suo meccanismo in
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
il registro è `test/corpus/engine-exclusions.json`. Il caso che l'ha motivata è
`2222`, che dichiara 28.303 nodi e nessun arco: non avendo nulla da mettere in
relazione, ogni motore force-directed e radiale delega al packer condiviso dei componenti
e nessuno dei loro algoritmi viene eseguito — confermato dal fatto che i loro output
dell'oracolo sono identici byte per byte. `dot` percorre una strada diversa e lo copre in
modo conforme in sei secondi.
