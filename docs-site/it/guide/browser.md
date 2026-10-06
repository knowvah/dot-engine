---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Uso nel browser

@knowvah/dot-engine non usa API esclusive di Node ed è sicuro da includere nel bundle per il browser. Questa
pagina tratta le due cose da sapere quando lo si esegue lato client.

## Bundling

La libreria è composta da semplici moduli ES. Qualsiasi bundler moderno (Vite, esbuild, Rollup,
webpack) può includerla. Non ci sono dipendenze a runtime da escludere dal bundle e nessun
artefatto WASM da ospitare.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Proprio l'[area di prova](/it/playground) di questo sito fa esattamente questo — importa il
motore e chiama `renderSvg` nel browser, senza alcuna andata e ritorno col server.

## Misurazione del testo

Graphviz ha bisogno delle dimensioni del testo per dimensionare le etichette. @knowvah/dot-engine se ne occupa
automaticamente:

- **Nel browser** (quando esiste `document`), misura il testo con il
  contesto 2D nativo di `<canvas>` — fedele all'host, perché è lo stesso font con cui il
  browser renderizza l'SVG.
- **In Node**, per impostazione predefinita usa il misuratore **Estimate** integrato — un
  modello deterministico, sicuro in ambiente headless, che rispecchia la funzione
  `estimate_textspan_size` di Graphviz. Per ottenere un layout corretto in Node non servono né
  l'installazione di `canvas` né file di font; è disponibile anche, su richiesta, un
  misuratore a tabella di ricerca (LUT) con hinting, per un dimensionamento più fedele all'host
  senza una dipendenza da canvas nativo. Vedi [Misurazione del testo](/it/guide/text-measurement) per sapere come
  selezionare esplicitamente un misuratore.

In ogni caso, per il layout non servono file di font.

## Web font: perché il prefetch conta

Le dimensioni delle etichette derivano dalla misurazione del testo con un font. Se una famiglia è dichiarata con
`@font-face` ma non ha finito di caricarsi, il browser misura con il font di
**ripiego**, e il layout risulta sbagliato quando arriva il font reale.
Misurato in Chromium con JetBrains Mono: il riquadro di un'etichetta era largo **70,68 pt** se
misurato prima del caricamento della famiglia (ripiego) e **124,8 pt** dopo il suo
caricamento.

I punti di ingresso asincroni (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) evitano
questo problema: raccolgono i font che il grafo richiederà, li caricano tramite
`document.fonts` e solo dopo eseguono il layout. `renderSvgAsync` ha prodotto gli
stessi 124,8 pt della misurazione dopo il caricamento.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (predefinito `3000`) è un'unica scadenza condivisa da tutte le famiglie, non
  una per famiglia.
- **`fontIssues`** è un elenco di `{ face, reason }`. `reason: 'failed'` indica che la
  famiglia ha dato errore (ad esempio un 404) o che il suo caricamento è stato rifiutato; `reason: 'timeout'`
  indica che non si era caricata entro `fontTimeoutMs`. In entrambi i casi il layout procede
  con un font di ripiego. Ogni problema viene anche segnalato con `console.warn`. I problemi con i font non
  rifiutano mai la promise.
- **Limitazione:** possono essere segnalate solo le famiglie dichiarate con `@font-face`.
  Un font di sistema o un nome di famiglia sconosciuto risulta «caricato» (non c'è nulla
  da attendere), quindi un `fontname` scritto male non compare mai in `fontIssues`.
- **Node e i Worker** non hanno `document.fonts`, quindi il prefetch dei font viene saltato e
  `fontIssues` è `[]`. Gli hook per le immagini funzionano comunque. Puoi passare un `fontSet`
  (qualsiasi oggetto con `load(font)`) per fornirne uno tuo.

## Renderizzare in una pagina: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Sostituisce i figli dell'elemento con l'id indicato con l'`<svg>`
renderizzato (restituito come `element`), usando `DOMParser` e `importNode`, mai
`innerHTML`. Un id mancante fa rifiutare la promise con `ERR_INVALID_ARG_VALUE`. L'SVG viene
ripulito per impostazione predefinita; passa `sanitize` per usare il tuo sanitizzatore oppure `trusted: true`
per saltare la sanitizzazione. Vedi la sezione «Security» del README per cosa il
ripulitore rimuove e cosa conserva, e mantieni attiva una Content-Security-Policy.

## Immagini esterne: `setImageSizer`

Quando un'etichetta in stile HTML contiene un'immagine esterna
(`<IMG SRC="logo.png"/>`), Graphviz ha bisogno delle dimensioni intrinseche di quell'immagine per
dimensionare la cella. (L'attributo `image=` di un nodo non viene dimensionato: il nodo mantiene il
suo riquadro normale, come in Graphviz nativo headless.) Poiché la libreria non può
leggere il filesystem, devi fornire un sizer:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Se i tuoi grafi non fanno mai riferimento a immagini esterne, non serve chiamarlo.
Per dimensionare le immagini in modo asincrono (ad esempio caricandole), passa invece un
`imageSizer` asincrono a `renderSvgAsync`; vedi [Immagini](/it/guide/images).

## Web Worker

Il layout viene eseguito in modo sincrono, quindi un grafo grande blocca il thread su cui gira. Eseguilo
in un Worker per mantenere reattiva la pagina. All'interno di un Worker non c'è
`document`, quindi la libreria misura il testo con un `OffscreenCanvas` e l'API
asincrona carica i font tramite il set di font proprio del Worker (`self.fonts`).

I font in un Worker sono separati da quelli della pagina: registrali nel Worker
con l'API `FontFace` (le regole CSS `@font-face` non raggiungono i Worker).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

In un Worker renderizza con `renderSvgAsync` (o `renderAsync`), non con `renderSvg`,
almeno finché ogni web font non si è caricato. Chromium continua a misurare una stringa di font
con la famiglia di ripiego se quella stessa stringa è stata misurata nel Worker prima
del caricamento della famiglia, anche dopo che si è caricata; l'API asincrona carica i font prima di
misurare, quindi non incappa mai in questo problema.

## Cosa non aspettarsi

La libreria ha come obiettivo l'**SVG** (più i formati di testo `json` / `xdot` / `dot` / image map).
L'output raster (PNG/JPG), PostScript/PDF e i backend interattivi/GUI
sono fuori ambito — converti l'SVG a valle se ti serve un altro formato. Vedi
[Divergenze note](/it/divergences) per i confini completi dell'ambito.

## Grafi grandi: pre-renderizzare in SVG

I grafi molto grandi — all'incirca **oltre 10.000 nodi o alcuni MB di sorgente DOT** — sono
impraticabili da disporre a runtime nel browser. Il layout (mincross, ranking,
instradamento delle spline) è superlineare, quindi questo è un **limite di scala condiviso con
Graphviz originale, non una limitazione specifica di questo motore**: con input di tale dimensione il
`dot` nativo, le build WASM (`@hpcc-js/wasm-graphviz`) e questo motore vanno tutti in
timeout o esauriscono la memoria allo stesso modo. (Questo motore **non** perde memoria — l'heap
per rendering resta piatto; il limite è esclusivamente la dimensione del grafo. Vedi la
[dashboard delle prestazioni](/perf) per il confronto misurato.)

Per grafi di quella scala, **renderizza una volta in fase di build e servi il file
`.svg` risultante** anziché fare il layout nel browser a ogni visualizzazione — lo stesso pattern
che useresti anche con il `dot` nativo, dato che è troppo lento da eseguire a ogni richiesta.

Gli adattatori per siti in fase di build di
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (pubblicati su NPM)
fanno esattamente questo:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), in fase di build
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), in fase di build
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), in fase di build
- `@knowvah/dot-markdown-it` — integrazione markdown-it indipendente dal framework

Per grafi dinamici forniti dall'utente, dove il rendering in fase di build non è un'opzione,
limita il rendering interattivo a grafi di dimensioni ragionevoli e metti in cache l'SVG emesso.
