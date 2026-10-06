---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Riferimento dei tipi

Una mappa concettuale dei tipi pubblici, raggruppati in base a da dove li
ottieni: `createGraph`/`parse` (costruire + ispezionare), `getLayout`
(istantanea della geometria), `render`/`getDrawOps` (output) e il pacchetto
radice (motori, immagini, misurazione del testo, errori). Ogni voce mostra un
blocco di forma copiato dal sorgente e uno scopo in una riga. Per la
documentazione completa campo per campo (compresi i membri ereditati e il
JSDoc di ogni proprietà), vedi il [riferimento TypeDoc](/reference/) generato.

Questa pagina non ripete la trattazione dei sistemi di coordinate: per quella
vedi [Leggere la geometria calcolata](/it/guide/geometry). Richiama invece
brevemente la nota sull'asse y ovunque i campi di un tipo dipendano dal
sistema di riferimento.

## Costruire + ispezionare (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Un handle opaco del modello di grafo interno. Restituito da `parse()` e da
`createGraph().graph`. Passalo a `render`, `getLayout` e `getDrawOps`; non
costruirlo né ispezionarlo direttamente: il builder e il parser sono gli unici
modi supportati per produrne uno.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opzioni per `createGraph`. `directed`/`strict` selezionano uno dei quattro
`GraphKind` (orientato, non orientato, strict orientato, strict non
orientato); `name` imposta il nome del grafo (predefinito `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaco di un nodo del grafo restituito da `builder.addNode(...)`.
`setHtmlAttr` marca il valore come etichetta in stile HTML (equivalente a
`label=<...>` nel testo DOT), in modo che il motore di layout lo misuri come
markup.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaco di un arco del grafo restituito da `builder.addEdge(...)`.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

Restituito da `createGraph(...)`. `addSubgraph` restituisce un builder annidato
con ambito limitato a quel sottografo; i nodi aggiunti tramite esso sono anche
membri del grafo radice. `.graph` è il punto di passaggio verso
`render`/`getLayout`/`getDrawOps`. Vedi
[Costruire un grafo nel codice](/it/guide/build-a-graph).

## Istantanea della geometria (`getLayout`)

::: tip Sistema di coordinate
Le coordinate native di Graphviz hanno y verso l'alto (origine in basso a
sinistra). `getLayout` usa per impostazione predefinita `yAxis: 'down'`
(origine in alto a sinistra, convenzione dello schermo) e inverte ogni
coordinata y; passa `{ yAxis: 'up' }` per le coordinate native di Graphviz.
Trattazione completa: [Leggere la geometria calcolata](/it/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opzioni per `getLayout`. Predefinito `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Istantanea semplice e serializzabile in JSON della geometria calcolata di un
grafo, restituita da `getLayout(g, opts?)`. `clusters` elenca ricorsivamente
ogni sottografo cluster (i cluster annidati hanno ciascuno una propria voce);
è vuoto per i grafi senza cluster.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Riquadro di delimitazione complessivo, in punti. Con `yAxis: 'down'`, `x`/`y`
sono normalizzati a `(0, 0)`. Con `yAxis: 'up'`, `x`/`y` sono l'angolo
inferiore sinistro grezzo del riquadro di delimitazione del grafo.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Geometria per nodo. `x`/`y` sono il centro del nodo. `width`/`height` sono in
**punti**: il modello li memorizza in pollici (`ND_width`/`ND_height`);
`getLayout` moltiplica per 72 prima di restituirli.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Geometria per arco. `points` concatena in ordine ogni punto di controllo di
Bézier della spline instradata (vuoto se l'arco non ha una spline instradata).
`label` è presente solo quando l'arco porta un'etichetta centrale.

`tailLabel` e `headLabel` sono le posizioni delle etichette di porta
`taillabel`/`headlabel`. Ciascuna è presente solo se il layout l'ha collocata,
la stessa condizione in cui `render()` emette il suo `<text>`: un'etichetta di
porta che non ha potuto essere collocata (per esempio un arco senza spline
instradata) risulta quindi assente anziché come etichetta all'origine.

`xlabel` è la posizione dell'etichetta esterna `xlabel`. A differenza di
`label`, viene scelta dalla ricerca di collocamento a forze di Graphviz tra le
posizioni candidate attorno all'arco, quindi non è derivabile da `label` né dal
punto medio della spline. Ha lo stesso criterio di presenza solo se collocata:
una xlabel dichiarata che la ricerca non ha potuto sistemare risulta assente,
esattamente come `render()` rinuncia a disegnarla.

`sp` ed `ep` sono i punti di attacco della freccia alle estremità tail e head.
Quando un'estremità porta una freccia, la spline viene accorciata per lasciarle
spazio e la freccia si estende dall'ultimo punto di controllo fino a questo
punto: chi disegna le proprie punte di freccia legge qui la punta anziché
estrapolarla. Ciascuno è presente solo quando quell'estremità ha davvero una
freccia, quindi un normale arco `digraph { a -> b }` riporta `ep` e nessun
`sp`, mentre `arrowhead=none` non ne riporta nessuno dei due.

Questi sono i punti di attacco sul bordo del nodo. Il renderer di Graphviz
arretra da essi il poligono della freccia che disegna di una quantità che
dipende dallo spessore del tratto (penwidth), quindi `ep` è il punto *verso
cui* disegnare una freccia, non una copia della punta renderizzata.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Riquadro di delimitazione per cluster. `name` è il nome del sottografo cluster
(per esempio `cluster6`); i cluster annidati codificano la loro gerarchia nel
nome, quindi non viene esposto alcun collegamento esplicito al genitore. Segue
la stessa convenzione di sistema di riferimento di `BoundsGeometry`.

`label` è la collocazione del titolo del cluster, presente solo quando il
cluster ne dichiara uno. I suoi `x`/`y` sono il **centro** dello spazio
dell'etichetta, in linea con `EdgeGeometry.label` e non con l'angolo del
riquadro `x`/`y` qui sopra, e `width`/`height` sono la dimensione misurata del
testo, quindi il riquadro dell'etichetta è
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` e si trova sempre
all'interno del riquadro del cluster. Nota che questo è il *centro* dell'etichetta,
mentre il `<text>` emesso da `render()` porta la linea di base, che si trova
più in basso.

## Rendering (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

Unione chiusa dei formati accettati da `render(g, format, opts?)`. Vedi
[Rendering in altri formati](/it/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opzioni per `render`. `engine` vale `'dot'` per impostazione predefinita.
`inlineImages` (nuova) vale `false` per impostazione predefinita; quando è
`true`, l'emettitore SVG incorpora le immagini esterne
(`image=`/`<IMG>` HTML) come URI `data:` consultando il resolver registrato
tramite `setImageResolver`; un mancato risultato del resolver o l'assenza di
registrazione ripiega sul passthrough grezzo di `src`. Non ha effetto sui
formati diversi da SVG. Vedi [Lavorare con le immagini](/it/guide/images).

::: warning `yAxis` non è un campo di `RenderOptions`
L'orientamento delle coordinate riguarda solo `getLayout`. Le stringhe di
formato grezze prodotte da `render` portano coordinate native con y verso
l'alto; inverti in post-elaborazione se ti serve y verso il basso e non passi
da `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opzioni per `getDrawOps`. `engine` vale `'dot'` per impostazione predefinita.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Risultato analizzato di un flusso di attributo xdot: l'array decodificato delle
operazioni di disegno più una maschera di bit di flag sullo stato dell'analisi.
`getDrawOps` restituisce solo l'`XdotOp[]` appiattito attraverso ogni attributo
di disegno del grafo, nell'ordine di disegno (grafo → nodo → arco); vedi
[Rendering personalizzato con le operazioni di disegno xdot](/it/guide/xdot-drawops)
per la tabella completa dei tipi di operazione e l'esempio con canvas.

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Una singola operazione di disegno xdot decodificata, discriminata da `kind`.
Ogni variante porta una proprietà di payload che prende il nome dalla sua
forma: restringi su `kind` in uno `switch` per accedervi in sicurezza. Le
coordinate sono in punti, nel sistema nativo con y verso l'alto (inverti per un
canvas con y verso il basso; vedi la guida collegata sopra).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Un colore xdot di riempimento/tratto risolto: un colore pieno, oppure un
gradiente lineare/radiale (`XdotLinearGrad`/`XdotRadialGrad` portano ciascuno
`x0,y0,x1,y1[,r0,r1]` più un array
`stops: { frac: number; color: string }[]`).

## Pacchetto radice (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Il nome di un motore di layout. Il registro è aperto (si possono registrare
motori personalizzati su un `GvcContext`), quindi viene accettata qualsiasi
stringa; `(string & {})` mantiene il completamento automatico dell'editor per
gli integrati senza chiudere l'insieme. Vedi
[Motori di layout](/it/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registra una callback che restituisce le dimensioni intrinseche di
un'immagine esterna referenziata da `image=` o da una cella HTML `<IMG>`, per
il dimensionamento del layout. Restituisci `null` quando la dimensione è
sconosciuta (corrisponde al comportamento del C per le immagini mancanti: una
cella a dimensione zero più un avviso). Passa `null` a `setImageSizer` per
azzerare un sizer impostato in precedenza. Vedi
[Uso nel browser](/it/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registra una callback che restituisce i byte grezzi di un'immagine esterna,
consultata quando `RenderOptions.inlineImages` è `true`. Un `Uint8Array` nudo
restituito deduce il suo tipo MIME dall'estensione del file di `src`. `null`
(dal resolver, o nessun resolver registrato) ripiega sul passthrough grezzo di
`src`. Vedi [Lavorare con le immagini](/it/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Misurazione del testo collegabile, installata tramite `setTextMeasurer` (ne
sono forniti tre integrati: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` sono metriche
verticali facoltative (linea di base→linea centrale, linea di base→ascendente);
omettile per ripiegare sui valori predefiniti calibrati su pango. Vedi
[Misurazione del testo](/it/guide/text-measurement).

### `RenderResult` ed errori

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` è la controparte in stile risultato di
`renderSvg`: restituisce `{ svg }` in caso di successo oppure
`{ errors: [one] }` al primo fallimento invece di lanciare. Restituisce per
qualsiasi input DOT e lancia solo per argomenti non validi. Le voci di `errors`
sono dati semplici, senza `cause` né stack.

Ogni errore di dot-engine lanciato estende la classe astratta `DotEngineError`
e implementa `GvError`:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` lancia `ParseError` per un sorgente DOT non valido, `RenderError`
per i fallimenti nella fase di layout/rendering e `InternalError` per un bug di
dot-engine. Gli errori di chi chiama lanciano un normale `TypeError` /
`RangeError` / `Error` il cui `code` è un `UsageErrorCode`
(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' |
'ERR_INVALID_STATE'`); questi non sono `GvError`. Chi vuole errori strutturati
senza un `try`/`catch` dovrebbe usare invece `tryRenderSvg`. Vedi
[Errori ed eccezioni](/it/guide/errors) per ogni codice.

## Relazioni

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Quale tipo proviene da quale chiamata

| Chiamata | Restituisce |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (annidato) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (lancia `DotEngineError`, oppure un `TypeError` d'uso) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Per ogni campo di ogni tipo qui sopra, compresi quelli che questa pagina
riassume, vedi il [riferimento TypeDoc](/reference/) generato. Per
l'approfondimento sul sistema di coordinate (con esempi svolti), vedi
[Leggere la geometria calcolata](/it/guide/geometry).
