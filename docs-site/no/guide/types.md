---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Typereferanse

Et konseptuelt kart over de offentlige typene, gruppert etter hvor du får dem
fra: `createGraph`/`parse` (bygg + inspiser), `getLayout` (geometri-
øyeblikksbilde), `render`/`getDrawOps` (utdata) og rotpakken (motorer, bilder,
tekstmåling, feil). Hver oppføring viser en formblokk kopiert fra kildekoden og
et enlinjes formål. For uttømmende felt-for-felt-dokumentasjon (inkludert arvede
medlemmer og JSDoc på hver egenskap), se den genererte
[TypeDoc-referansen](/reference/).

Denne siden gjentar ikke gjennomgangen av koordinatrammer — se
[Les beregnet geometri](/no/guide/geometry) for det. Den gjentar derimot kort
merknaden om y-aksen overalt der feltene i en type avhenger av rammen.

## Bygg + inspiser (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Et ugjennomsiktig håndtak til den interne grafmodellen. Returneres av `parse()`
og av `createGraph().graph`. Send det til `render`, `getLayout` og `getDrawOps`;
ikke konstruer eller inspiser det direkte — byggeren og parseren er de eneste
støttede måtene å lage ett på.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Valg for `createGraph`. `directed`/`strict` velger en av de fire `GraphKind`-
verdiene (rettet, urettet, streng-rettet, streng-urettet); `name` setter grafens
navn (standard `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Ugjennomsiktig håndtak for en grafnode returnert av `builder.addNode(...)`.
`setHtmlAttr` merker verdien som en HTML-lignende etikett (tilsvarer
`label=<...>` i DOT-tekst) slik at layoutmotoren måler den som markup.

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

Ugjennomsiktig håndtak for en grafkant returnert av `builder.addEdge(...)`.

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

Returneres av `createGraph(...)`. `addSubgraph` returnerer en nøstet bygger
avgrenset til den delgrafen; noder lagt til gjennom den er også medlemmer av
rotgrafen. `.graph` er overleveringspunktet til
`render`/`getLayout`/`getDrawOps`. Se [Bygg en graf i kode](/no/guide/build-a-graph).

## Geometri-øyeblikksbilde (`getLayout`)

::: tip Koordinatramme
Innebygde graphviz-koordinater har y oppover (origo nede til venstre).
`getLayout` har `yAxis: 'down'` som standard (origo oppe til venstre,
skjermkonvensjon) og snur hver y-koordinat; send `{ yAxis: 'up' }` for innebygde
graphviz-koordinater. Fullstendig gjennomgang:
[Les beregnet geometri](/no/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Valg for `getLayout`. Standard `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Vanlig, JSON-serialiserbart øyeblikksbilde av en grafs beregnede geometri,
returnert av `getLayout(g, opts?)`. `clusters` lister rekursivt hver
klyngedelgraf (nøstede klynger får hver sin oppføring); den er tom for grafer
uten klynger.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Samlet avgrensningsboks, i punkter. Med `yAxis: 'down'` er `x`/`y` normalisert
til `(0, 0)`. Med `yAxis: 'up'` er `x`/`y` det rå nedre venstre hjørnet av
grafens avgrensningsboks.

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

Geometri per node. `x`/`y` er nodens sentrum. `width`/`height` er i **punkter**
— modellen lagrer dem i tommer (`ND_width`/`ND_height`); `getLayout` ganger med
72 før den returnerer.

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

Geometri per kant. `points` setter sammen hvert bézier-kontrollpunkt fra den
rutede splinen, i rekkefølge (tom hvis kanten ikke har noen rutet spline).
`label` finnes bare når kanten har en sentrert etikett.

`tailLabel` og `headLabel` er posisjonene til portetikettene
`taillabel`/`headlabel`. Hver finnes bare når layouten har plassert den — den
samme betingelsen som gjør at `render()` emitterer dens `<text>` — så en
portetikett som ikke kunne plasseres (for eksempel en kant uten rutet spline)
rapporteres som fraværende i stedet for som en etikett i origo.

`xlabel` er posisjonen til den eksterne etiketten `xlabel`. I motsetning til
`label` velges den av graphvizs kraftplasseringssøk over kandidatposisjoner
rundt kanten, så den kan ikke utledes fra `label` eller fra splinens midtpunkt.
Den har den samme «bare hvis plassert»-betingelsen: en deklarert xlabel som
søket ikke fikk plass til, rapporteres som fraværende, nøyaktig slik `render()`
lar være å tegne den.

`sp` og `ep` er pilfestepunktene i hale- og hode-enden. Når en ende har en pil,
forkortes splinen for å gi plass til den, og pilen spenner fra det siste
kontrollpunktet og ut til dette punktet — så en forbruker som tegner sine egne
pilspisser leser spissen her i stedet for å ekstrapolere en. Hver finnes bare
når den enden faktisk har en pil, så en vanlig `digraph { a -> b }`-kant
rapporterer `ep` og ingen `sp`, og `arrowhead=none` rapporterer ingen av dem.

Dette er festepunktene på nodegrensen. Graphvizs egen renderer rykker
pilpolygonet den tegner inn fra dem med en mengde som avhenger av penwidth, så
`ep` er punktet du skal tegne en pil *til*, ikke en kopi av den rendrede spissen.

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

Avgrensningsboks per klynge. `name` er klyngedelgrafens navn (f.eks.
`cluster6`); nøstede klynger koder hierarkiet i navnet, så ingen eksplisitt
foreldrekobling eksponeres. Følger samme rammekonvensjon som `BoundsGeometry`.

`label` er plasseringen av klyngetittelen, og finnes bare når klyngen deklarerer
en. Dens `x`/`y` er **sentrum** av etikettområdet — i samsvar med
`EdgeGeometry.label`, ikke boksens hjørne `x`/`y` ovenfor — og
`width`/`height` er den målte tekststørrelsen, så etikettboksen er
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` og ligger alltid
innenfor klyngeboksen. Merk at dette er etikettens *sentrum*, mens `<text>`-
elementet `render()` emitterer bærer grunnlinjen, som ligger lavere.

## Render (`@knowvah/dot-engine/render`)

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

Lukket union av formater som godtas av `render(g, format, opts?)`. Se
[Render til andre formater](/no/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Valg for `render`. `engine` er som standard `'dot'`. `inlineImages` (ny) er som
standard `false`; når den er `true`, innliner SVG-emitteren eksterne bilder
(`image=`/HTML-`<IMG>`) som `data:`-URI-er ved å konsultere resolveren
registrert via `setImageResolver` — bom hos resolveren eller manglende
registrering faller tilbake til den rå `src`-gjennomgangen. Har ingen effekt på
andre formater enn SVG. Se [Arbeid med bilder](/no/guide/images).

::: warning `yAxis` er ikke et felt i `RenderOptions`
Koordinatretning er kun en sak for `getLayout`. De rå formatstrengene fra
`render` bærer innebygde koordinater med y oppover; snu i etterbehandling hvis du
trenger y nedover og ikke går via `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Valg for `getDrawOps`. `engine` er som standard `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Parset resultat av én xdot-attributtstrøm: den dekodede tabellen med
tegneoperasjoner pluss en bitmaske med parse-statusflagg. `getDrawOps` returnerer
bare den flatede `XdotOp[]` på tvers av hver tegneattributt i grafen, i
tegnerekkefølge (graf → node → kant) — se
[Egen rendering med xdot](/no/guide/xdot-drawops) for den fullstendige tabellen
over operasjonstyper og et canvas-eksempel.

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

En enkelt dekodet xdot-tegneoperasjon, diskriminert på `kind`. Hver variant bærer
én nyttelastegenskap oppkalt etter formen sin — innsnevre på `kind` i en `switch`
for å få trygg tilgang til den. Koordinatene er i punkter, i det opprinnelige
rammeverket med y oppover (snu for et canvas med y nedover — se veiledningen det
er lenket til ovenfor).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

En oppløst xdot-fyll-/strekfarge: en ensfarget farge, eller en lineær/radial
gradient (`XdotLinearGrad`/`XdotRadialGrad` bærer hver `x0,y0,x1,y1[,r0,r1]`
pluss en tabell `stops: { frac: number; color: string }[]`).

## Rotpakken (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Et layoutmotornavn. Registeret er åpent (egne motorer kan registreres på en
`GvcContext`), så enhver streng godtas; `(string & {})` beholder
editorens autofullføring for de innebygde uten å lukke mengden. Se
[Layoutmotorer](/no/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registrerer en callback som returnerer de iboende dimensjonene til et eksternt
bilde det refereres til med `image=` eller en HTML-`<IMG>`-celle, for
layoutstørrelse. Returner `null` når størrelsen er ukjent (tilsvarer C-ens
atferd ved manglende bilde — en celle med null størrelse pluss en advarsel).
Send `null` til `setImageSizer` for å fjerne en tidligere satt sizer. Se
[Bruk i nettleseren](/no/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registrerer en callback som returnerer rå bytes for et eksternt bilde, konsultert
når `RenderOptions.inlineImages` er `true`. Et bart `Uint8Array`-svar utleder
MIME-typen fra filendelsen i `src`. `null` (fra resolveren, eller ingen
registrert resolver) faller tilbake til den rå `src`-gjennomgangen. Se
[Arbeid med bilder](/no/guide/images).

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

Pluggbar tekstmåling, installert via `setTextMeasurer` (tre innebygde følger med:
`EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` er valgfrie vertikale metrikker
(grunnlinje→midtlinje, grunnlinje→stigehøyde); utelat dem for å falle tilbake på
de pango-kalibrerte standardene. Se [Tekstmåling](/no/guide/text-measurement).

### `RenderResult` og feil

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

`tryRenderSvg(dotSource, engine)` er resultatstil-motparten til `renderSvg`: den
returnerer `{ svg }` ved suksess eller `{ errors: [one] }` ved første feil i
stedet for å kaste. Den returnerer for enhver DOT-inndata og kaster bare for
ugyldige argumenter. Oppføringene i `errors` er vanlige data uten `cause` og uten
stakk.

Hver kastet dot-engine-feil utvider den abstrakte `DotEngineError` og
implementerer `GvError`:

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

`renderSvg` kaster `ParseError` for ugyldig DOT-kildekode, `RenderError` for
feil i layout-/renderingsstadiet og `InternalError` for en feil i dot-engine.
Kallerfeil kaster en standard `TypeError` / `RangeError` / `Error` der `code` er
en `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); disse er ikke `GvError`-er. Kallere
som vil ha strukturerte feil uten `try`/`catch`, bør bruke `tryRenderSvg` i
stedet. Se [Feil og unntak](/no/guide/errors) for hver kode.

## Sammenhenger

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

## Hvilken type kommer fra hvilket kall

| Kall | Returnerer |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (nøstet) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (kaster `DotEngineError`, eller en `TypeError` for bruksfeil) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

For hvert felt på hver type ovenfor — også de denne siden oppsummerer — se den
genererte [TypeDoc-referansen](/reference/). For den dype gjennomgangen av
koordinatrammer (med gjennomarbeidede eksempler), se
[Les beregnet geometri](/no/guide/geometry).
