---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Riferimento API

La superficie pubblica è volutamente ridotta. La maggior parte di chi chiama ha
bisogno solo di `renderSvg`. Vedi la [Panoramica](/it/guide/overview) per sapere
quale punto di ingresso usare, i [Tipi](/it/guide/types) per le forme che ogni
funzione consuma e restituisce, e il [Riferimento](/reference/) generato per le
firme complete, ogni campo e ogni overload.

> Le dichiarazioni dei tipi (`.d.ts`) vengono emesse da `npm run build` (il
> passaggio `build:types` esegue `tsc -p tsconfig.build.json`). La mappa
> `exports` di `package.json` collega le condizioni `types` per ogni punto di
> ingresso, quindi `@knowvah/dot-engine`, `@knowvah/dot-engine/api` e
> `@knowvah/dot-engine/render` risolvono tutti i tipi negli editor e nelle
> build a valle.
>
> La build emette anche le declaration map (`.d.ts.map`) e le source map JS, e
> il pacchetto distribuisce i propri sorgenti `src/`: così «vai alla
> definizione» porta direttamente al vero TypeScript, rendendo facile leggere
> il codice e aprire una PR.

Questa pagina è organizzata secondo i tre punti di ingresso (la
[Panoramica](/it/guide/overview) spiega quando scegliere ciascuno): il pacchetto
radice `@knowvah/dot-engine` (parse + render in una sola chiamata, più la
configurazione globale al processo), `@knowvah/dot-engine/api` (costruire un
grafo nel codice, rileggere la geometria calcolata) e
`@knowvah/dot-engine/render` (output in più formati e operazioni di disegno
grezze). Ogni funzione qui sotto viene riesportata anche dal pacchetto radice
(`export * from './api/index.js'` / `export * from './render/index.js'` in
`src/index.ts`): importare tutto da `@knowvah/dot-engine` funziona, ma gli
import dai sottopercorsi rendono più esplicito quale livello stai toccando.

## `@knowvah/dot-engine` (radice)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Analizza il sorgente DOT, esegue il [motore di layout](/it/guide/engines)
indicato, renderizza in SVG e restituisce la stringa SVG. È il wrapper di
comodo in una sola chiamata: costruisce un `GvcContext`, registra gli otto
motori integrati e il renderer SVG, esegue il layout, renderizza e libera il
layout; vedi [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)
più sotto se ti servono questi passaggi separati.

- **`dotSource`**: sorgente di un grafo in linguaggio DOT.
- **`engine`**: `EngineName`, uno degli integrati (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) o qualsiasi nome registrato
  in modo personalizzato.
- **Lancia** un `DotEngineError` per qualsiasi problema con l'input:
  `ParseError` se `dotSource` non è valido, `RenderError` se il layout o il
  rendering falliscono, `InternalError` (con `cause`) per un bug di dot-engine.
  Un `TypeError` con `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`
  se `dotSource` o `engine` non sono validi (compreso un nome di motore non
  registrato). Vedi [Errori ed eccezioni](/it/guide/errors).

Firma completa, JSDoc e l'elenco dei campi di `GvError`:
[Riferimento](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Gemella di `renderSvg` in stile risultato. Restituisce (non lancia mai) per
qualsiasi input DOT: `{ svg }` in caso di successo oppure `{ errors: [one] }`
al primo fallimento; `svg` ed `errors` si escludono a vicenda. Lancia solo per
argomenti non validi (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Ogni voce di `errors` è un dato semplice e
serializzabile in JSON (`type`, `code`, `message`, `friendlyMessage`, più
`location` / `expected` quando presenti; niente `cause`, niente stack trace),
quindi si può inviare in sicurezza attraverso il confine di un worker/
postMessage o serializzare in un log. Preferiscila a `renderSvg` + `try`/`catch`
quando chi chiama vuole ramificare su `code` / `type` anziché intercettare
un'eccezione. Vedi [Errori ed eccezioni](/it/guide/errors).
[Riferimento](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Analizza il DOT nel modello di grafo in memoria **senza** calcolarne il layout.
Utile per ispezionare o trasformare il grafo, oppure per passarlo a `getLayout`
di `@knowvah/dot-engine/api` o a `render` di `@knowvah/dot-engine/render`,
prima del rendering.

- **Lancia** `ParseError` per errori di sintassi o violazioni della direzione
  degli archi (per esempio `->` in un grafo non orientato). `ParseError`
  estende `DotEngineError` e implementa `GvError` con `type: 'syntax'`; porta
  una `location: { line, column, offset? }`. `TypeError`
  `ERR_INVALID_ARG_TYPE` se `dotSource` non è una stringa.
  [Errori ed eccezioni](/it/guide/errors), [Riferimento](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` significa che dot-engine è fallito su questo
input. `RenderError` copre i fallimenti noti di layout/rendering (`type` è
`semantic` per `UNKNOWN_LAYOUT` e `UNSUPPORTED_FEATURE`). `InternalError` è un
bug di dot-engine; `cause` contiene l'errore originale quando ne è stato
incapsulato uno. Gli errori di chi chiama lanciano invece un normale
`TypeError` / `RangeError` / `Error` con un `code`. `isGvError` verifica la
presenza di `type` e `code` di tipo stringa, quindi funziona anche tra bundle
duplicati. Vedi [Errori ed eccezioni](/it/guide/errors) per ogni codice e per
ciò che ogni funzione può lanciare, i [Tipi](/it/guide/types) per la forma di
`GvError` e il [Riferimento](/reference/) per l'elenco dei membri di
`GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registra (o azzera, con `null`) il misuratore del testo globale al processo
consultato durante il layout per dimensionare le etichette. L'azzeramento
ripiega sul valore predefinito della libreria (browser: `CanvasTextMeasurer`;
headless/Node: `EstimateTextMeasurer`, a meno che non sia collegato un
misuratore LUT; vedi [Misurazione del testo](/it/guide/text-measurement) per
l'ordine di risoluzione completo e per le implementazioni
`CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` esportate
insieme a queste funzioni). [Riferimento](/reference/).

### `setImageSizer` / `setImageResolver`

Due punti di estensione per la configurazione delle immagini, correlati ma
distinti: entrambi sono registri globali al processo che seguono lo stesso
schema (registra una callback, passa `null` per azzerarla), ed entrambi non
fanno nulla finché chi chiama non ne registra uno:

- **`setImageSizer`**: comunica le *dimensioni intrinseche* di un'immagine
  esterna, in modo che il motore di layout possa riservare spazio per una
  cella HTML `<IMG>` o per un attributo `image=` di un nodo prima del
  rendering. Restituire `null` (o non avere alcun sizer registrato) riproduce
  il comportamento di Graphviz nativo per le immagini mancanti: un avviso e
  dimensione zero.
- **`setImageResolver`** (nuovo; vedi [`inlineImages`](#inlineimages) più
  sotto): fornisce i *byte* effettivi dell'immagine, così il renderer SVG può
  incorporarli come URI `data:` anziché emettere `xlink:href="src"` come
  passthrough grezzo.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` può restituire un semplice `Uint8Array` (il MIME viene dedotto
dall'estensione del file di `src`: `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`,
`.webp`; qualsiasi altra ripiega su `application/octet-stream`) oppure
`{ bytes, mime }` per impostare esplicitamente il tipo MIME. Restituisci `null`
quando `src` non può essere risolto: il renderer ripiega sul passthrough grezzo
di `src`, come se non fosse registrato alcun resolver. Registrare un resolver
non ha effetto di per sé; viene consultato solo quando l'opzione `inlineImages`
di `render` è `true` (sotto). Vedi [Lavorare con le immagini](/it/guide/images)
per un esempio completo e il [Riferimento](/reference/) per entrambi i tipi di
callback.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` è la controparte asincrona di `renderSvg`: precarica i web
font e i dati delle immagini di cui il grafo ha bisogno, poi esegue layout e
rendering. `renderSvgInto` renderizza e sostituisce i figli dell'elemento con
id `id`, sanificando l'SVG per impostazione predefinita (`trusted: true` salta
la sanificazione; `sanitize` sostituisce il depuratore integrato). I
fallimenti, compresi gli argomenti errati, sono rifiuti di promise con le
stesse classi di errore di `renderSvg`; un id di elemento mancante viene
rifiutato con `ERR_INVALID_ARG_VALUE`. I problemi con i font non rifiutano mai;
vengono restituiti in `fontIssues`. Vedi [Uso nel browser](/it/guide/browser) e
[Lavorare con le immagini](/it/guide/images), e il
[Riferimento](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Orchestrazione di livello più basso per chi deve pilotare layout e rendering
come passaggi separati. `renderSvg` è un wrapper di comodo proprio su questo:
costruisce un contesto, registra motori/renderer, `layout`,
`renderWithContext`, `freeLayout`. Usali direttamente solo quando ti serve
questo controllo: per esempio per registrare un sottoinsieme di motori,
aggiungere un `LayoutEngine` o un `RendererPlugin` personalizzato, oppure
renderizzare lo stesso grafo con layout calcolato in più formati senza rieseguire
il layout (chiama `layout` una volta, poi `renderWithContext` per ciascun
formato, poi `freeLayout`). [Riferimento](/reference/).

## `@knowvah/dot-engine/api`

Costruzione programmatica, inserimento sicuro degli archi e lettura della
geometria calcolata: il livello per costruire un grafo senza scrivere a mano
testo DOT e rileggerne il layout come dati semplici. Vedi i [Tipi](/it/guide/types)
per `LayoutSnapshot` e le sue forme annidate.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Crea un grafo nuovo, pronto per essere passato a `render` / `getLayout` /
`getDrawOps`. Valori predefiniti: `directed: true`, `strict: false`,
`name: ''`. Restituisce un `GvGraphBuilder` con `addNode`, `addEdge`,
`addSubgraph`, `setAttr`/`getAttr`, `setHtmlAttr` (per le etichette a tabella
HTML) e una proprietà `.graph` che espone l'handle opaco `Graph`. Vedi
[Costruire un grafo nel codice](/it/guide/build-a-graph) e il
[Riferimento](/reference/) per le interfacce complete
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Funzione di supporto di livello più basso per l'inserimento di archi, alla base
di `GvGraphBuilder.addEdge`: esportata direttamente per chi lavora con i
riferimenti interni `Node`/`Edge` (per esempio archi aggiunti a un grafo
restituito da `parse()`) anziché con gli handle opachi `GvNode`/`GvEdge` del
builder. La maggior parte di chi chiama dovrebbe usare invece
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`**: chiave dell'arco; il valore predefinito è `''` (anonimo). Ignorata
  per la deduplicazione nei grafi strict, che confronta solo `(tail, head)`
  (simmetrica per i grafi non orientati).
- **Restituisce** il nuovo arco, oppure quello esistente se `g` è strict ed
  esiste già un arco `(tail, head)` (rispecchia `agedge` con `cflag=1`).

Vedi [Costruire un grafo nel codice](/it/guide/build-a-graph) e il
[Riferimento](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Restituisce un'istantanea semplice e serializzabile in JSON della geometria
calcolata del grafo (posizioni dei nodi, punti di controllo delle spline degli
archi, etichette degli archi, riquadri di delimitazione dei cluster e limiti
complessivi del grafo), tutto in punti.

- **`g`**: deve avere già il layout calcolato (tramite `render(g, ...)`,
  `getDrawOps(g)` o `ctx.layout(g, engine)`); chiamare `getLayout` su un grafo
  senza layout lancia un errore anziché restituire silenziosamente una
  geometria tutta a zero.
- **`opts.yAxis`**: il valore predefinito è `'down'`: coordinate dello schermo,
  origine in alto a sinistra, y cresce verso il basso, e `bounds` è
  normalizzato a `(0, 0)`. `'up'` restituisce le coordinate native di Graphviz
  (origine in basso a sinistra, y cresce verso l'alto) con `bounds.x`/`bounds.y`
  nell'angolo inferiore sinistro grezzo.
- **Lancia** `Error` con `code` `ERR_INVALID_STATE` se per `g` non è stato
  eseguito il layout; `TypeError` `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE` per un `g` o un `opts` errati. Vedi
  [Errori ed eccezioni](/it/guide/errors).

`width`/`height` dei nodi sono convertiti in punti (il modello interno memorizza
i pollici); ogni altra coordinata è già in punti. Vedi
[Leggere la geometria calcolata](/it/guide/geometry) per la trattazione dei
sistemi di coordinate e i [Tipi](/it/guide/types) / il
[Riferimento](/reference/) per gli elenchi completi dei campi di
`LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` e
`BoundsGeometry`.

### `Graph`

Tipo handle opaco riesportato dal modello interno. Viene esposto solo il
*tipo* (non la classe mutabile): usalo per annotare una variabile che contiene
il `.graph` di un builder o il risultato di `parse()`, ma non costruire né
ispezionare direttamente i suoi campi; usa il builder, `getLayout` o
`getDrawOps` per rileggere lo stato. [Riferimento](/reference/).

## `@knowvah/dot-engine/render`

Output in più formati e accesso alle operazioni di disegno grezze: il livello
per renderizzare un grafo già analizzato con `parse` o costruito con il builder.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Calcola il layout di un grafo e lo renderizza nella stringa del formato
richiesto.

- **`format`**: `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`**: motore di layout (predefinito `'dot'`).
- **`opts.inlineImages`**: vedi [sotto](#inlineimages).
- **Lancia** `RenderError` in caso di fallimento di layout o rendering;
  `InternalError` in caso di bug di dot-engine; `TypeError` con un `code` per
  argomenti non validi (compresi un motore o un formato non registrati). Vedi
  [Errori ed eccezioni](/it/guide/errors).

`opts.engine` rispecchia il parametro `engine` di `renderSvg`; `format` è
l'asse che `renderSvg` non espone (`renderSvg` è fisso su `'svg'`). Vedi
[Rendering in altri formati](/it/guide/render-formats) e il
[Riferimento](/reference/) per l'unione completa `OutputFormat` e la forma di
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (predefinito `false`) incorpora le immagini
esterne come URI `data:` anziché con il passthrough grezzo
`xlink:href="src"`. Non ha effetto a meno che non sia registrato un resolver
tramite `setImageResolver` (sopra), né sui formati diversi da SVG. Se non
impostata, l'output è identico byte per byte a quello precedente all'esistenza
di questa opzione.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Vedi [Lavorare con le immagini](/it/guide/images) per la guida completa,
compresa la risoluzione da `fetch` nel browser e dal filesystem in Node.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Controparte asincrona di `render`: stessi formati e stesse opzioni
`engine`/`inlineImages`, più hook asincroni per le immagini per singola
chiamata e il precaricamento dei font. Ogni hook per le immagini viene eseguito
al più una volta per ogni `src` distinto; un throw o un reject conta come un
mancato risultato. L'output è markup non sanificato per i formati di markup;
vedi la sezione «Security» del README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Calcola il layout di `g`, renderizza in xdot e restituisce un array piatto e
tipizzato di operazioni di disegno (forme dei nodi, intervalli di testo,
colori e font come valori di un'unione discriminata, da restringere su
`op.kind` in uno `switch`) per alimentare un renderer personalizzato
canvas/WebGL/PDF senza toccare l'SVG né la codifica a stringa di xdot.
`opts.engine` vale per impostazione predefinita `DEFAULT_DRAW_ENGINE`
(`'dot'`).

- **Lancia** `ParseError` se l'output xdot intermedio non può essere
  rianalizzato (un bug di dot-engine; non previsto nella pratica);
  `RenderError` in caso di fallimento di layout/rendering; `InternalError` per
  qualsiasi altro bug di dot-engine; `TypeError` con un `code` per argomenti
  non validi. Vedi [Errori ed eccezioni](/it/guide/errors).

Vedi [Rendering personalizzato con le operazioni di disegno xdot](/it/guide/xdot-drawops)
per l'elenco dei tipi di operazione e un esempio completo con canvas, e i
[Tipi](/it/guide/types) / il [Riferimento](/reference/) per l'unione completa
`XdotOp` e le forme `Xdot`/`XdotColor`.
