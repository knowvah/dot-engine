---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrare da altre librerie JS per Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) e
`d3-graphviz` danno tutti accesso a Graphviz da JavaScript compilando il vero
Graphviz in C in **WebAssembly** e richiamandolo. @knowvah/dot-engine è un
**porting in TypeScript** scritto da zero: i motori di layout, il parser e
l'emettitore SVG sono codice sorgente TypeScript, non un binario compilato.

Questa differenza è il punto centrale, non una nota a margine:

| | Wrapper WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementazione | Vero Graphviz in C, compilato in un binario `.wasm` | Porting in TypeScript puro, nessun artefatto compilato |
| Inizializzazione del modulo | Asincrona: istanzia/attendi il modulo WASM prima del primo uso | Nessuna: `import` e chiama in modo sincrono |
| Bundle | Distribuisci un asset `.wasm` (da centinaia di KB a pochi MB) insieme al JS | Solo JS, con tree shaking |
| Debug | Esegui passo-passo un blob WASM (o il sorgente C, se ce l'hai) | Esegui passo-passo il vero TypeScript con le source map |
| Modello di threading | Alcune build eseguono il layout in un Web Worker | Gira sul thread chiamante, come qualsiasi funzione TS |
| Formati di output | Quelli con cui è stata compilata la build C sottostante, di solito l'intero insieme di Graphviz, compresi raster/PDF | SVG + i formati testuali DOT/json/xdot/plain/imagemap, vedi sotto |

Se il tuo caso d'uso è "chiamo una funzione, ottengo un SVG, senza cerimonie
asincrone né asset WASM da ospitare", è esattamente a questo che serve
@knowvah/dot-engine. Se il tuo caso d'uso dipende da output raster o PDF, vedi
[Quando restare su WASM](#when-to-stay-on-wasm) più sotto.

## Differenze nelle API

Le tre librerie hanno forme diverse; la tabella seguente riporta il caso di
migrazione più comune (approssimativo: verifica sulla documentazione di
ciascuna libreria; vedi le citazioni sotto ogni riga).

| Libreria | Chiamata tipica | Equivalente in @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (successore di viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))`: asincrono, `Viz.instance()` risolve una Promise | `renderSvg(dot, 'dot')`: sincrono, nessun passaggio di istanza/inizializzazione |
| viz.js 2.x (legacy, `new Viz()`) | `new Viz().renderString(dot)`: restituisce una `Promise<string>` | `renderSvg(dot, 'dot')`: sincrono |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` una volta, poi `graphviz.dot(dot)` (sincrono dopo il caricamento) | `renderSvg(dot, engine)`: nessun passaggio di caricamento/riscaldamento |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)`: lega l'output al DOM, anima le transizioni | `renderSvg(dot, engine)` restituisce una **stringa** SVG; la inserisci tu nel DOM (per esempio `el.innerHTML = svg`) |

Ogni chiamata a @knowvah/dot-engine nella colonna di destra è **sincrona**: non
c'è alcun modulo da attendere, perché non c'è alcun binario WASM da
istanziare. Elimina qualsiasi `await`/`.then()` che avvolga una chiamata a
@knowvah/dot-engine; non è mai stato necessario.

- `Viz.instance()` → Promise e il metodo `renderSVGElement()` di `@viz-js/viz`
  sono documentati su viz-js.com; confermati tramite l'esempio d'uso
  pubblicato dal progetto al momento della stesura.
- `new Viz().renderString(dot)` di viz.js 2.x è l'API documentata per quella
  linea di rilascio (ormai superata); se hai un'installazione recente,
  verifica di non essere in realtà su `@viz-js/viz`.
- La coppia `Graphviz.load()` / `graphviz.dot()` di `@hpcc-js/wasm-graphviz` è
  confermata dall'esempio d'uso pubblicato dal pacchetto al momento della
  stesura. Il pacchetto separato e più vecchio `@hpcc-js/wasm` esponeva in
  passato anche una chiamata `graphviz.layout(dot, format, engine)`: controlla
  la documentazione della versione installata prima di fare affidamento sulla
  firma esatta.
- La catena `.graphviz().renderDot(dot)` di `d3-graphviz`, e il fatto che
  internamente sia costruita su `@hpcc-js/wasm`, sono confermati dal README
  pubblicato dal progetto al momento della stesura.

### Il legame di `renderDot` con il DOM è fuori ambito qui

`d3-graphviz` fa più che renderizzare SVG: lega il risultato a una selezione
D3, calcola le differenze tra i rendering successivi e anima le transizioni tra
layout. @knowvah/dot-engine non ha alcuna posizione sul DOM:
`renderSvg`/`render` restituiscono una semplice stringa. Se vuoi transizioni
animate in stile d3-graphviz tra due layout, è una logica da costruire sopra
due chiamate a `renderSvg` e un tuo confronto del DOM (oppure continua a usare
d3-graphviz per quella specifica funzione, vedi sotto).

## Ottenere i dati di layout senza analizzare un formato stringa

A tutte e tre le librerie WASM si possono chiedere i formati JSON o testo
semplice propri di Graphviz, dopodiché analizzi tu quella stringa per ottenere
le coordinate di nodi e archi. @knowvah/dot-engine salta il passaggio
intermedio testuale: chiama `getLayout(g)` (dopo `render`) per ottenere
direttamente un'istantanea tipizzata e serializzabile in JSON, senza stringhe
`-Tjson`/`-Tplain` da analizzare.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Vedi [Leggere la geometria calcolata](/it/guide/geometry) per la forma
completa dell'istantanea, le unità e l'opzione `yAxis`.

## Quando restare su WASM {#when-to-stay-on-wasm}

Sii onesto con te stesso sull'ambito: @knowvah/dot-engine punta a SVG più i
formati testuali `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. **Non**
emette formati raster (PNG/JPEG/GIF/...) né PostScript/PDF/EPS: sono un
confine di ambito voluto, non una lacuna semplicemente non ancora colmata.
Vedi [Divergenze note](/it/divergences) per l'elenco esatto di ciò che non
rientra negli obiettivi.

Se la tua applicazione ha bisogno di output `-Tpng` o `-Tpdf` direttamente dal
motore di layout, le librerie basate su WASM qui sopra coprono ancora quel
caso: poiché eseguono il vero Graphviz in C, supportano i formati di output
con cui quella build è stata compilata. In quello scenario, o continui a usare
la libreria WASM per quel solo percorso di codice, oppure renderizzi in
`'svg'` con @knowvah/dot-engine e converti l'SVG in raster/PDF a valle con uno
strumento separato.

## Vedi anche

- [Motori di layout](/it/guide/engines)
- [Rendering in altri formati](/it/guide/render-formats)
- [Leggere la geometria calcolata](/it/guide/geometry)
- [Divergenze note](/it/divergences)
- [Primi passi](/it/guide/getting-started)
