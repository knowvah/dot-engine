---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Typreferens

En begreppskarta över de publika typerna, grupperade efter var du får dem
ifrån: `createGraph`/`parse` (bygg + inspektera), `getLayout`
(geometriögonblicksbild), `render`/`getDrawOps` (utdata) och rotpaketet
(motorer, bilder, textmätning, fel). Varje post visar ett formblock kopierat
från källkoden och ett enradigt syfte. För fullständig dokumentation fält för
fält (inklusive ärvda medlemmar och JSDoc på varje egenskap), se den genererade
[TypeDoc-referensen](/reference/).

Den här sidan upprepar inte genomgången av koordinatramen — se
[Läs beräknad geometri](/sv/guide/geometry) för den. Den påminner kort om
y-axeln överallt där en typs fält beror på ramen.

## Bygg + inspektera (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Ett ogenomskinligt handtag till den interna grafmodellen. Returneras av
`parse()` och av `createGraph().graph`. Lämna det till `render`, `getLayout`
och `getDrawOps`; skapa eller inspektera det inte direkt — byggaren och
tolken är de enda sätt som stöds för att få fram ett.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Alternativ för `createGraph`. `directed`/`strict` väljer en av de fyra
`GraphKind` (riktad, oriktad, strikt riktad, strikt oriktad); `name` anger
grafens namn (standardvärde `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Ogenomskinligt handtag för en grafnod som returneras av
`builder.addNode(...)`. `setHtmlAttr` märker värdet som en HTML-liknande
etikett (motsvarar `label=<...>` i DOT-text) så att layoutmotorn mäter det som
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

Ogenomskinligt handtag för en grafkant som returneras av
`builder.addEdge(...)`.

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

Returneras av `createGraph(...)`. `addSubgraph` returnerar en nästlad byggare
avgränsad till den delgrafen; noder som läggs till genom den är också
medlemmar i rotgrafen. `.graph` är överlämningspunkten till
`render`/`getLayout`/`getDrawOps`. Se
[Bygg en graf i kod](/sv/guide/build-a-graph).

## Geometriögonblicksbild (`getLayout`)

::: tip Koordinatram
Graphviz egna koordinater har y uppåt (origo nere till vänster). `getLayout`
har som standard `yAxis: 'down'` (origo uppe till vänster, skärmkonvention) och
vänder varje y-koordinat; ange `{ yAxis: 'up' }` för Graphviz egna koordinater.
Fullständig genomgång: [Läs beräknad geometri](/sv/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Alternativ för `getLayout`. Standardvärde `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Vanlig, JSON-serialiserbar ögonblicksbild av en grafs beräknade geometri, som
returneras av `getLayout(g, opts?)`. `clusters` listar varje klustergraf
rekursivt (nästlade kluster får var sin post); den är tom för grafer utan
kluster.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Övergripande begränsningsruta, i punkter. Med `yAxis: 'down'` normaliseras
`x`/`y` till `(0, 0)`. Med `yAxis: 'up'` är `x`/`y` det råa nedre vänstra
hörnet av grafens begränsningsruta.

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

Geometri per nod. `x`/`y` är nodens mittpunkt. `width`/`height` är i
**punkter** — modellen lagrar dem i tum (`ND_width`/`ND_height`); `getLayout`
multiplicerar med 72 innan den returnerar.

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

Geometri per kant. `points` sammanfogar varje bézierkontrollpunkt från den
dragna splinen, i ordning (tom om kanten inte har någon dragen spline). `label`
finns bara när kanten har en mittetikett.

`tailLabel` och `headLabel` är positionerna för portetiketterna
`taillabel`/`headlabel`. Var och en finns bara när layouten har placerat den —
samma villkor under vilket `render()` skriver sin `<text>` — så en portetikett
som inte kunde placeras (till exempel en kant utan dragen spline) rapporteras
som saknad i stället för som en etikett i origo.

`xlabel` är positionen för den externa etiketten `xlabel`. Till skillnad från
`label` väljs den av graphviz kraftbaserade placeringssökning bland
kandidatpositioner runt kanten, så den kan inte härledas från `label` eller
från splinens mittpunkt. Den har samma villkor att den bara finns när den
placerats: en deklarerad xlabel som sökningen inte fick plats med rapporteras
som saknad, precis som `render()` avstår från att rita den.

`sp` och `ep` är pilens fästpunkter vid tail- och head-änden. När en ände har
en pil förkortas splinen för att ge plats åt den och pilen spänner från den
sista kontrollpunkten ut till den här punkten — så en konsument som ritar egna
pilspetsar läser spetsen här i stället för att extrapolera en. Var och en
finns bara när den änden faktiskt har en pil, så en vanlig
`digraph { a -> b }`-kant rapporterar `ep` men inget `sp`, och
`arrowhead=none` rapporterar ingen av dem.

Det här är fästpunkterna på nodens kant. Graphviz egen renderare drar in
pilpolygonen den ritar från dem med ett belopp som beror på penwidth, så `ep`
är den punkt du ska rita en pil *till*, inte en kopia av den renderade spetsen.

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

Begränsningsruta per kluster. `name` är klustergrafens namn (till exempel
`cluster6`); nästlade kluster kodar sin hierarki i namnet, så ingen uttrycklig
föräldralänk exponeras. Följer samma ramkonvention som `BoundsGeometry`.

`label` är placeringen av klustertiteln och finns bara när klustret deklarerar
en. Dess `x`/`y` är **mitten** av etikettutrymmet — i likhet med
`EdgeGeometry.label`, inte rutans hörn `x`/`y` ovan — och `width`/`height` är
den uppmätta textstorleken, så etikettrutan är
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` och ligger alltid
inom klusterrutan. Observera att detta är etikettens *mitt*, medan `<text>`
som `render()` skriver bär baslinjen, som ligger lägre.

## Rendera (`@knowvah/dot-engine/render`)

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

Sluten union av format som `render(g, format, opts?)` accepterar. Se
[Rendera till andra format](/sv/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Alternativ för `render`. `engine` är som standard `'dot'`. `inlineImages` (ny)
är som standard `false`; när det är `true` bäddar SVG-utmataren in externa
bilder (`image=`/HTML `<IMG>`) som `data:`-URI:er genom att anlita den resolver
som registrerats via `setImageResolver` — en miss i resolvern eller utebliven
registrering faller tillbaka på rå vidareförmedling av `src`. Har ingen effekt
på format som inte är SVG. Se [Arbeta med bilder](/sv/guide/images).

::: warning `yAxis` är inte ett fält i `RenderOptions`
Koordinatorientering rör bara `getLayout`. De råa formatsträngarna som
`render` producerar har Graphviz egna koordinater med y uppåt; vänd i
efterbearbetning om du behöver y nedåt och inte går via `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Alternativ för `getDrawOps`. `engine` är som standard `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Tolkat resultat av en xdot-attributström: den avkodade arrayen av
ritoperationer plus en bitmask med tolkningsstatus. `getDrawOps` returnerar
bara den tillplattade `XdotOp[]` över alla ritattribut på grafen, i
målarordning (graf → nod → kant) — se
[Egen rendering med xdot-ritoperationer](/sv/guide/xdot-drawops) för hela
tabellen över operationstyper och canvas-exemplet.

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

En enskild avkodad xdot-ritoperation, särskild på `kind`. Varje variant bär en
nyttolastegenskap uppkallad efter sin form — avgränsa på `kind` i en `switch`
för att komma åt den på ett säkert sätt. Koordinater är i punkter, i
ursprungsramen med y uppåt (vänd för en canvas med y nedåt — se den länkade
guiden ovan).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

En upplöst xdot-fyllnings-/linjefärg: en enfärgad färg, eller en linjär/radiell
gradient (`XdotLinearGrad`/`XdotRadialGrad` bär var och en `x0,y0,x1,y1[,r0,r1]`
plus en array `stops: { frac: number; color: string }[]`).

## Rotpaketet (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Ett layoutmotornamn. Registret är öppet (egna motorer kan registreras på en
`GvcContext`), så vilken sträng som helst accepteras; `(string & {})` behåller
editorns autokomplettering för de inbyggda utan att stänga mängden. Se
[Layoutmotorer](/sv/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registrerar en callback som returnerar de inneboende måtten för en extern bild
som refereras av `image=` eller en HTML-cell `<IMG>`, för layoutens
storleksbestämning. Returnera `null` när storleken är okänd (motsvarar C:s
beteende vid saknad bild — en cell med storlek noll plus en varning). Ange
`null` till `setImageSizer` för att rensa en tidigare angiven storleksgivare. Se
[Använd i webbläsaren](/sv/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registrerar en callback som returnerar de råa byten för en extern bild, som
anlitas när `RenderOptions.inlineImages` är `true`. Ett returvärde som är en
bar `Uint8Array` härleder sin MIME-typ från filändelsen i `src`. `null` (från
resolvern, eller ingen registrerad resolver) faller tillbaka på rå
vidareförmedling av `src`. Se [Arbeta med bilder](/sv/guide/images).

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

Utbytbar textmätning, installerad via `setTextMeasurer` (tre inbyggda följer
med: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` är valfria vertikala mått (baslinje→
mittlinje, baslinje→ascender); utelämna dem för att falla tillbaka på de
pango-kalibrerade standardvärdena. Se [Textmätning](/sv/guide/text-measurement).

### `RenderResult` och fel

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

`tryRenderSvg(dotSource, engine)` är motsvarigheten i resultatstil till
`renderSvg`: den returnerar `{ svg }` vid lyckad körning eller
`{ errors: [one] }` vid första felet i stället för att kasta. Den returnerar
för vilken DOT-indata som helst och kastar bara vid ogiltiga argument. Posterna
i `errors` är vanlig data utan `cause` och utan stack.

Varje kastat dot-engine-fel utökar den abstrakta `DotEngineError` och
implementerar `GvError`:

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

`renderSvg` kastar `ParseError` för ogiltig DOT-källkod, `RenderError` för fel
i layout-/renderingssteget och `InternalError` för ett fel i dot-engine.
Anroparens misstag kastar ett vanligt `TypeError` / `RangeError` / `Error` vars
`code` är en `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); de är inte `GvError`. Anropare som
vill ha strukturerade fel utan `try`/`catch` bör i stället använda
`tryRenderSvg`. Se [Fel och undantag](/sv/guide/errors) för varje kod.

## Samband

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

## Vilken typ som kommer från vilket anrop

| Anrop | Returnerar |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (nästlad) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (kastar `DotEngineError`, eller ett `TypeError` för användningsfel) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

För varje fält på varje typ ovan — även de som den här sidan sammanfattar — se
den genererade [TypeDoc-referensen](/reference/). För den fördjupade genomgången
av koordinatramen (med genomarbetade exempel), se
[Läs beräknad geometri](/sv/guide/geometry).
