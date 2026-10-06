---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Errori ed eccezioni

dot-engine lancia due tipi di errore. Il tipo che intercetti ti dice chi deve
cambiare qualcosa.

## Due famiglie, una regola

| Famiglia | Come riconoscerla | Significato | Chi interviene |
|--------|---------------------|---------|----------|
| Errore di dot-engine | `err instanceof DotEngineError` | dot-engine è fallito su questo input: DOT non valido, un errore fatale che segnalerebbe anche Graphviz stesso, una funzionalità di Graphviz non supportata, oppure un bug di dot-engine | L'autore del DOT, o una segnalazione di bug |
| Errore d'uso | `TypeError` / `RangeError` / `Error` standard con `err.code` che inizia con `ERR_` | La chiamata era sbagliata: tipo di argomento errato, nome di motore o formato sconosciuto, ordine delle chiamate errato | Il codice chiamante |

Ramifica su `.code`, non sul testo del messaggio. I messaggi possono cambiare
tra una versione e l'altra; i codici sono stabili.

Gli errori d'uso non sono `DotEngineError` e non implementano `GvError`. Il
loro `name` resta `TypeError`, `RangeError` o `Error`, come in Node.js.

## Riferimento delle classi

Tutte e quattro le classi seguenti estendono `DotEngineError` e implementano la
forma `GvError` (`type`, `code`, `message`, `friendlyMessage`, più `location` e
`expected` facoltativi).

### `DotEngineError` (astratta)

La base comune. `instanceof DotEngineError` è vero per ogni errore che
dot-engine solleva riguardo al proprio input. Non può essere costruita
direttamente. `type`, `code` e `friendlyMessage` sono definiti dalle
sottoclassi.

### `ParseError`

| Voce | Valore |
|------|-------|
| Lanciato quando | Il sorgente DOT non è valido, oppure usa l'operatore di arco sbagliato per il tipo di grafo |
| `type` | `syntax` |
| Codici | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Campi | `location` (`{ line, column, offset? }`), `expected` (attese del parser; solo `SYNTAX_*`), getter `line` e `column` |
| Azione di chi chiama | Correggi il sorgente DOT. Mostra `location` e `friendlyMessage` all'autore |

`GENERIC_ERROR` su un `ParseError` significa che il sorgente annida in modo
così profondo che il parser ha esaurito lo stack.

### `HtmlParseError`

| Voce | Valore |
|------|-------|
| Lanciato quando | Oggi non raggiunge mai chi chiama (vedi sotto) |
| `type` | `semantic` |
| Codici | `HTML_PARSE_ERROR` |
| Campi | `tag` (il token incriminato). Nessun `location` né `expected` |
| Azione di chi chiama | Nessuna. Per individuare un'etichetta errata, confronta l'output renderizzato con quello che ti aspettavi |

Il parser delle etichette in stile HTML solleva `HtmlParseError` per un
elemento sconosciuto, un attributo malformato o un `<TABLE>`, `<HR>` o `<VR>`
fuori posto. La fase di layout lo intercetta e lascia l'etichetta senza
contenuto, come fa Graphviz: il grafo viene comunque renderizzato, con
un'etichetta vuota. Nessuna funzione pubblica lo propaga.

`HtmlParseError` non è esportato dalla radice del pacchetto. Se mai uno dovesse
raggiungerti, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
lo identifica.

### `RenderError`

| Voce | Valore |
|------|-------|
| Lanciato quando | Il layout o il rendering falliscono in un modo che segnalerebbe anche Graphviz stesso, il grafo nomina un motore di layout non disponibile, oppure il grafo usa una funzionalità di Graphviz che dot-engine non ha portato |
| `type` | `render` per `RENDER_ERROR`; `semantic` per `UNKNOWN_LAYOUT` e `UNSUPPORTED_FEATURE` |
| Codici | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Campi | `cause` quando il fallimento ha incapsulato un altro errore. Nessun `location` |
| Azione di chi chiama | `RENDER_ERROR`: cambia il grafo. `UNKNOWN_LAYOUT`: correggi l'attributo `layout=`. `UNSUPPORTED_FEATURE`: evita la funzionalità (per esempio sfdp con `rotation=45`; vedi la [tabella](#unsupported-feature-reference)) |

### `InternalError`

| Voce | Valore |
|------|-------|
| Lanciato quando | Fallisce un'asserzione o un invariante all'interno di dot-engine, oppure un errore non di dot-engine sfugge dalla pipeline di layout o rendering |
| `type` | `render` |
| Codici | `INTERNAL_ERROR` |
| Campi | `cause` (l'errore originale, quando ne è stato incapsulato uno) |
| Azione di chi chiama | Segnala un bug con il sorgente DOT che lo ha provocato |

Nulla di ciò che l'autore del DOT può cambiare eviterà in modo affidabile un
`InternalError`.

## Riferimento dei codici

### `GvErrorCode`

| Codice | Classe | `type` | Significato | Causa tipica | Azione di chi chiama | Sollevato da |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Token inatteso | Refuso, `;` o `}` mancante | Correggi il DOT in `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Il sorgente è terminato a metà istruzione | `{`, `[` o stringa non chiusi | Correggi il DOT in `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` in un grafo non orientato | `graph { a -> b }` | Usa `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` in un digraph | `digraph { a -- b }` | Usa `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Sorgente troppo annidato per essere analizzato | Sottografi annidati in modo patologico | Appiattisci il DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Etichetta in stile HTML malformata | Elemento sconosciuto, attributo errato | Nessuna: l'etichetta viene renderizzata vuota | Nessuno (intercettato internamente) |
| `RENDER_ERROR` | `RenderError` | `render` | Un errore fatale di layout o rendering che segnalerebbe anche Graphviz | Input malformato per una fase di layout | Cambia il grafo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | L'attributo `layout=` del grafo nomina un motore non registrato | `layout="foo"` | Correggi l'attributo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Il grafo richiede una funzionalità di Graphviz che dot-engine non ha portato | sfdp con `rotation=45` | Evita la funzionalità | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Bug di dot-engine | Asserzione fallita, throw estraneo | Segnala un bug | `renderSvg`, `render`, `getDrawOps`, metodi del builder, `GvcContext.layout` (non incapsulato) |

### `UsageErrorCode`

| Codice | Classe | Significato | Causa tipica | Azione di chi chiama | Sollevato da |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Tipo errato, `null`, o un argomento obbligatorio mancante | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Correggi la chiamata | Ogni funzione pubblica che accetta argomenti |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Tipo corretto, valore sconosciuto | Nome di motore o di formato non registrato; `getLayout(g, { yAxis: 'other' })` | Usa un nome registrato o un valore consentito | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argomento numerico fuori dal suo intervallo | Riservato | Correggi la chiamata | Oggi nessuna funzione pubblica lo solleva |
| `ERR_INVALID_STATE` | `Error` | Chiamata effettuata nello stato sbagliato | `getLayout` prima del layout | Esegui prima il layout (`render(g, ...)` o `ctx.layout`) | `getLayout` |

Un argomento di motore non registrato viene rifiutato anche quando il sorgente
DOT imposta un attributo `layout=` valido. L'argomento viene controllato per
primo.

## Riferimento a `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Ognuno dei valori di attributo qui sotto fa sì che il layout lanci un
`RenderError` con codice `UNSUPPORTED_FEATURE` dove Graphviz nativo eseguirebbe
un algoritmo che dot-engine non ha portato. L'alternativa era renderizzare un
layout diverso da quello di Graphviz senza dirlo. Il controllo scatta solo
quando vale la condizione nella colonna «Scatta quando»; lo stesso attributo
altrove viene renderizzato normalmente. Per evitare l'errore, rimuovi
l'attributo o cambialo con un valore supportato.

| Motore | Attributo e valore | Scatta quando | Funzionalità di Graphviz necessaria |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Sempre (dopo che il grafo ha 2+ nodi e `maxiter` non è negativo) | Stress majorization gerarchica (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Solo quando Graphviz costruirebbe vincoli: `diredgeconstraints` è vero oppure `hier*`, `overlap=ipsep`, oppure il grafo ha un cluster di primo livello. Senza vincoli viene eseguito come stress majorization, come in Graphviz | Majorization vincolata (`stress_majorization_cola`) |
| neato | `start=self` | `mode` è `major` (il valore predefinito) o `ipsep` | Inizializzazione intelligente (`smart_ini`). Con `mode=KK` o `mode=sgd` registra una sola volta per rendering `start=0 not supported with mode=self - ignored`, come fa Graphviz |
| neato | `model=subset` | `mode` è `major` o `KK` | Il modello di distanza subset |
| neato | `model=circuit` | `mode` è `major`, oppure `KK` su un grafo connesso. `KK` su un grafo non connesso senza `pack` né `packmode` registra un avviso e usa i cammini minimi, come fa Graphviz | Il modello di distanza circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (senza distinzione tra maiuscole e minuscole) | Il grafo (per twopi, una componente; per sfdp, l'intero grafo o una componente) ha 2+ nodi e il conteggio delle sovrapposizioni di Graphviz stesso (`countOverlap`, che verifica i poligoni dei nodi) è superiore a 0. I nodi che si toccano solo per il riquadro di delimitazione non lo attivano. circo ci arriva solo per un grafo a singola componente (su più componenti Graphviz ignora anch'esso `overlap`). sfdp ci arriva solo quando `overlap` non è una modalità prism | Rimozione delle sovrapposizioni di Voronoi (`vAdjust`) |
| fdp | `overlap=` uno tra `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | La modalità viene raggiunta dopo i tentativi di iterazione delle forze `N:`, cioè quando quei tentativi non eliminano tutte le sovrapposizioni (oppure `N` è 0 o assente). Il prefisso `N:` è consentito, per esempio `3:voronoi` | L'algoritmo di adjust `removeOverlapWith` corrispondente |
| fdp | `splines=compound` | Sempre, con o senza cluster | Instradamento degli archi che evita i cluster (`compoundEdges`) |
| sfdp | `smoothing=` qualsiasi valore tranne `none` o `0` | Sempre | `post_process_smoothing` |
| sfdp | `rotation=` qualsiasi numero diverso da zero | Sempre | `rotate()` prima della rimozione delle sovrapposizioni |
| sfdp | `label_scheme=1` a `4` | Esiste un nodo chiamato `|edgelabel|...`, `overlap` si risolve in modalità `prism`, e lo schema è 3 o 4, oppure lo schema è 1 o 2 e i tentativi prism sono superiori a 0 (`overlap=prism` con un conteggio, non il predefinito `prism0`). I valori superiori a 4 contano come 0. Le normali etichette degli archi non lo attivano mai | Gestione dei nodi delle etichette degli archi (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (anche `0`, `false`) | Qualsiasi grafo con almeno un nodo. Il messaggio nomina lo schema risolto | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (anche `2`) | Qualsiasi grafo con almeno un nodo. Il messaggio nomina lo schema risolto | `spring_electrical_embedding_fast` |
| tutti i motori | Una forma di nodo disegnata da un caso speciale di `round_corners` non portato | Il nodo usa quella forma. Messaggio: `special shape N not yet ported` | Il ramo di disegno `round_corners` della forma. È una protezione interna contro un numero di forma privo di caso di disegno; non si conosce alcuna forma con nome che vi arrivi |

La maggior parte dei messaggi ha la forma
`<attribute>=<value>: <what> is not supported yet`. Le eccezioni sono
`smoothing` e `rotation` (che nominano la routine mancante), le righe di fdp e
la riga delle forme, che usano le formulazioni indicate sopra. Ramifica su
`err.code === 'UNSUPPORTED_FEATURE'`, non sul testo.

I valori che selezionano il predefinito (per esempio `quadtree=normal`, `true`,
`yes`, `1`) e i valori accettati da Graphviz che sono stati portati (per
esempio `start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, la famiglia `scale` e, su neato, twopi, circo e sfdp,
`overlap=oscale`, `vpsc` e le modalità `ortho*` / `portho*`) vengono
renderizzati normalmente.

## Riferimento per funzione

«Uso» indica `TypeError` con `ERR_INVALID_ARG_TYPE`, a meno che una riga non
nomini un altro codice.

| Funzione | Può lanciare |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Uso (`dotSource` o `engine` non è una stringa); `TypeError` `ERR_INVALID_ARG_VALUE` (motore non registrato); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Uso (`dotSource` o `engine` non è una stringa); `TypeError` `ERR_INVALID_ARG_VALUE` (motore non registrato). Nient'altro: ogni fallimento legato all'input DOT viene restituito in `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` non è una stringa); `ParseError` |
| `render(g, format, opts?)` | Uso (`g`, `format` o `opts` di tipo errato); `TypeError` `ERR_INVALID_ARG_VALUE` (motore o formato non registrato); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Uso (`g` o `opts` di tipo errato); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` non registrato); `RenderError`; `ParseError` (l'xdot intermedio non ha potuto essere rianalizzato: un bug di dot-engine); `InternalError` |
| `createGraph(opts?)` e i metodi del builder (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Uso (tipi di argomento errati, compresi valori di attributo che non sono stringhe); `InternalError` (il modello del grafo non è riuscito a creare un nodo o un sottografo) |
| `addEdge(g, tail, head, name?)` (da `/api`) | Uso (`g`, `tail` o `head` non oggetto; `name` non stringa) |
| `getLayout(g, opts?)` | Uso (`g` o `opts` non oggetto); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` diverso da `'up'` o `'down'`); `Error` `ERR_INVALID_STATE` (grafo senza layout) |
| `new GvcContext(measurer, options?)` | Uso (`measurer` non ha una funzione `measure`; `options` non oggetto) |
| `ctx.register(plugin)` | Uso (non è un plugin di renderer né un motore di layout) |
| `ctx.layout(g, engine)` | Uso (`g` non oggetto, `engine` non stringa); `TypeError` `ERR_INVALID_ARG_VALUE` (motore non registrato); `RenderError` `UNKNOWN_LAYOUT`. I fallimenti del motore si propagano non incapsulati |
| `ctx.freeLayout(g, engine)` | Uso; `TypeError` `ERR_INVALID_ARG_VALUE` (motore non registrato). I fallimenti del motore si propagano non incapsulati |
| `ctx.bestRenderer(format)` | Uso (`format` non stringa); `TypeError` `ERR_INVALID_ARG_VALUE` (nessun renderer per `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Uso (`ctx` non è un `GvcContext`, `g` non oggetto, `format` non stringa); `TypeError` `ERR_INVALID_ARG_VALUE` (nessun renderer per `format`). I fallimenti di rendering si propagano non incapsulati |
| `setImageSizer(sizer)` | Uso (non è una funzione né `null`) |
| `setImageResolver(fn)` | Uso (non è una funzione né `null`) |
| `setTextMeasurer(measurer)` | Uso (non è un `TextMeasurer` né `undefined`) |

### Quali funzioni incapsulano i throw estranei

| Funzioni | Comportamento davanti a un throw inatteso (non di dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Incapsulato come `InternalError`; `cause` è l'errore originale |
| `renderWithContext` e ogni metodo di `GvcContext` | **Non incapsulato.** Un bug del motore raggiunge chi chiama così com'è stato lanciato dal motore, per esempio un semplice `TypeError` senza `code` |

Se usi direttamente `GvcContext`, tratta un errore che non è né un
`DotEngineError` né un errore d'uso come un bug di dot-engine.

## `tryRenderSvg` o `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT errato o fallimento del layout | Lancia un `DotEngineError` | Restituisce `{ errors: [one] }` |
| Argomenti errati | Lancia un errore d'uso | Lancia un errore d'uso |
| Valore dell'errore | Un `Error` con stack e `cause` | Dati semplici: `type`, `code`, `message`, `friendlyMessage`, più `location` / `expected` quando presenti |
| Usalo quando | Il fallimento deve interrompere il chiamante | Ramifichi su `code`, oppure invii l'errore attraverso `postMessage` o in un log |

`tryRenderSvg` non lancia mai per alcun input DOT. Lancia solo quando gli
argomenti stessi non sono validi, il che è un bug nel codice chiamante. Gli
oggetti errore che restituisce non portano né `cause` né stack trace.

## Fallimenti incapsulati e `cause`

Quando `renderSvg`, `render` o `getDrawOps` intercetta un errore che dot-engine
non ha sollevato, lancia un `InternalError` il cui `cause` è l'errore
originale. Il `message` è il messaggio originale.

`cause` non è enumerabile, quindi `JSON.stringify(err)` lo omette. Percorri
esplicitamente la catena quando scrivi nei log (vedi l'ultimo esempio qui
sotto).

## Controlli tra bundle diversi

`instanceof DotEngineError` funziona all'interno di una sola copia della
libreria. Se possono essere caricate due copie (bundle duplicati, un host di
plugin), usa `isGvError(e)`. Verifica la presenza di `type` e `code` di tipo
stringa e funziona tra copie diverse. Accetta anche gli oggetti semplici
restituiti da `tryRenderSvg`.

## Esempi

Separare le due famiglie:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Gestire un risultato di `tryRenderSvg`:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Registrare nei log un `InternalError` con la sua causa:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Vedi anche

- [Riferimento API (selezione)](/it/guide/api) per la firma di ogni funzione.
- [Tipi](/it/guide/types) per le forme di `GvError` e `RenderResult`.
- [API generata (TypeDoc)](/reference/) per le unioni complete `GvErrorCode` e `UsageErrorCode`.
